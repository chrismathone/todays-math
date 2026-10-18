/**
 * POST /api/tests/generate — 진도 해석 + 출제 엔진 + draft TEST/TEST_PROBLEM 원자 생성.
 * 엔진(selectProblems)은 순수 함수이므로 여기서 DB 조회 결과만 조립해 넘긴다.
 */
import type { TestGenerateRequest } from "@/contracts/test.contract";
import { noProgressReason } from "@/lib/progress/noProgressReason";
import {
  insufficientProblemsErrorResponseSchema,
  testGenerateResponseSchema,
} from "@/contracts/test.contract";
import { jsonError, jsonOk } from "@/lib/apiResponse";
import { normalizeStoredDifficultyRatio } from "@/lib/class/normalizeDifficultyRatio";
import { db } from "@/lib/db";
import { findEligibleProblems } from "@/lib/findEligibleProblems";
import { countFamilies } from "@/lib/generator/familyKey";
import { resolveRange } from "@/lib/generator/resolveRange";
import { selectProblems } from "@/lib/generator/selectProblems";
import { selectWithFormats } from "@/lib/generator/selectWithFormats";
import { formatIntentFits } from "@/contracts/formatIntent.contract";
import { requireOwnedClass, requireOwnedStudentInClass } from "@/lib/ownership";
import { getCurrentProgress } from "@/lib/progressResolver";
import {
  serializeProgress,
  serializeTest,
  serializeTestProblemItem,
} from "@/lib/serializers";
import type { SessionUser } from "@/lib/session";
import { assertClassWrite, assertStudentEnrollment } from "@/lib/classAccess";
import { autoDraftBindingAllowed } from "./autoDraftScope";

import { loadRecentProblemIds } from "./recentProblemIds";
import { selectionStillCurrent } from "./selectionCurrent";

/** 서버 안에서만 넘기는 인자 — 요청 계약(`TestGenerateRequest`)에 **없다**(D-133 ⑴). */
export interface DraftTestOrigin {
  /**
   * 아침 자동 초안 회차 id — `runAutoDraft` 만 넘긴다. 시험지의 `auto_draft_run_id` 에 그대로 적히고,
   * 메인 «자동 출제» 표지가 이 칸 하나만 본다. «모두 출제»·직접 출제(`POST /api/tests/generate`)는 안 넘긴다(NULL).
   *
   * 🔴 요청 본문에서 옮겨 담지 말 것 — 밖에서 채울 수 있으면 표지가 거짓말이 된다. 계약은 strict 라 칸을 넣으면 400 이다.
   */
  autoDraftRunId?: string;
}

export async function generateDraftTest(
  session: SessionUser,
  input: TestGenerateRequest,
  origin: DraftTestOrigin = {},
) {
  const owned = await requireOwnedClass(input.classId, session, "test:write");
  if (!owned.ok) return owned.response;
  if (origin.autoDraftRunId && !(await autoDraftBindingAllowed(owned.data)))
    return jsonError("FORBIDDEN", "자동 출제 대상 반이 아닙니다.", 403);

  if (input.studentId) {
    const studentOwned = await requireOwnedStudentInClass(
      input.studentId,
      input.classId,
      session,
    );
    if (!studentOwned.ok) return studentOwned.response;
  }

  // 진도 이력은 append-only 라 전량 읽으면 학기가 갈수록 자란다. `getCurrentProgress`
  // 와 **같은 정렬**(recordedAt desc, 동률이면 createdAt desc)을 DB 로 내리고 1건만 읽는다.
  // 반/개별 구분과 개별 이력 0건 시 반 진도 폴백은 그대로다(GET /api/progress 와 동일).
  const latestFirst = [
    { recordedAt: "desc" as const },
    { createdAt: "desc" as const },
  ];
  const [classProgress, studentProgressRows, student] = await Promise.all([
    db.progress.findMany({
      where: { retiredAt: null, classId: input.classId, studentId: null },
      orderBy: latestFirst,
      take: 1,
    }),
    input.studentId
      ? db.progress.findMany({
          where: {
            retiredAt: null,
            classId: input.classId,
            studentId: input.studentId,
          },
          orderBy: latestFirst,
          take: 1,
        })
      : Promise.resolve([]),
    input.studentId
      ? db.student.findUnique({ where: { id: input.studentId } })
      : Promise.resolve(null),
  ]);

  const current = getCurrentProgress({
    classProgress: classProgress.map(serializeProgress),
    studentProgress: studentProgressRows.map(serializeProgress),
    useIndividualProgress: student?.useIndividualProgress ?? false,
  });
  // 🔴 **진도를 요구하는 것은 일일테스트뿐이다** (2026-09-07).
  //
  //    일일테스트는 진도가 곧 범위라 없으면 만들 수 없다. 확인테스트의 범위는
  //    **요청이 들고 온다** — 계약의 refine 이 시작·끝을 모두 요구하므로 여기 도달한
  //    review 요청에는 범위가 반드시 있다. 그런데 예전에는 `testType` 을 보기 **전에**
  //    진도가 없으면 400 을 냈고, 그래서 화면의 「진도를 기록하거나 **「고치기」로 직접
  //    고르세요**」와 서버 사유의 「범위를 직접 고르거나」가 **둘 다 성립할 수 없는
  //    지시**였다 — 직접 골라도 같은 400 이 났다.
  if (!current && input.testType === "daily") {
    // 「진도가 없다」가 덮는 상태가 **둘**이고 원장님이 할 일이 다르다:
    // 아무도 진도가 없는 것과, 학생마다 진도가 갈리는 것(개별진도반).
    // 뒤엣것을 앞엣것으로 말하면 **있는 진도를 다시 입력하러 간다.**
    // 실패 경로에서만 한 번 더 읽으므로 정상 출제는 그대로다.
    return jsonError(
      "VALIDATION_ERROR",
      await noProgressReason(db, input.classId),
      400,
    );
  }

  const units = await db.unit.findMany();
  let unitIds: string[];
  try {
    const range =
      input.testType === "daily"
        ? resolveRange({
            testType: "daily",
            // 바로 위 가드가 daily + 진도 없음을 이미 400 으로 돌려보냈다.
            currentProgressUnitId: current!.unitId,
            units,
          })
        : resolveRange({
            testType: "review",
            rangeStartUnitId: input.rangeStartUnitId!,
            rangeEndUnitId: input.rangeEndUnitId!,
            units,
          });
    unitIds = range.unitIds;
  } catch {
    return jsonError(
      "VALIDATION_ERROR",
      "확인테스트 범위 단원을 찾을 수 없습니다.",
      400,
    );
  }

  const count = input.problemCount ?? owned.data.defaultProblemCount;
  if (input.formats && !formatIntentFits(input.formats, count))
    return jsonError(
      "VALIDATION_ERROR",
      "형식별 문항 수의 합을 확인해 주세요.",
      400,
    );
  const difficultyRatio =
    input.difficultyRatio ??
    normalizeStoredDifficultyRatio(owned.data.difficultyRatio);

  // 두 조회는 서로를 전혀 참조하지 않는다(풀은 단원, 최근 출제는 날짜로만 좁힌다).
  // 순차로 await 하면 그냥 두 왕복이 더해진다.
  // 🔴 최근 출제(D-20)의 열쇠는 **반의 소유자**다 — 관리자가 남의 반에 낼 때(D-130) 관리자 자신의
  //    출제로 거르면 그 반이 어제 낸 문항이 오늘 또 나간다. 관리자가 아니면 반 소유자가 곧 나다.
  const [eligible, recentProblemIds] = await Promise.all([
    findEligibleProblems({ unitIds }),
    loadRecentProblemIds(owned.data.userId, input.testDate),
  ]);

  const selectionArgs = {
    pool: eligible,
    difficultyRatio,
    count,
    recentProblemIds,
    seed: `${input.classId}:${input.testDate}:${input.testType}`,
  };
  const formatted = input.formats
    ? selectWithFormats({ ...selectionArgs, formats: input.formats })
    : null;
  if (formatted && formatted.status !== "complete")
    return jsonError(
      formatted.status === "search_limit" ? "CONFLICT" : "VALIDATION_ERROR",
      formatted.status === "search_limit"
        ? "형식과 범위 조건을 모두 확인하는 데 시간이 걸립니다. 조건을 줄여 다시 시도해 주세요. 문항 부족으로 판정한 것은 아닙니다."
        : "최근 사용 제외와 유형 제한을 적용하면 요청한 형식으로 구성할 수 없습니다. 형식별 수나 범위를 조정해 주세요.",
      formatted.status === "search_limit" ? 409 : 422,
    );
  const selected = formatted?.result ?? selectProblems(selectionArgs);

  if (selected.problems.length < count) {
    const recentSet = new Set(recentProblemIds);
    const usable = eligible.filter((p) => !recentSet.has(p.id));
    /**
     * **한 시험지에 담을 수 있는 진짜 상한** — 행이 아니라 **갈래**다
     * (원장님 확정 2026-08-26, 같은 문항류는 1개).
     *
     * 🔴 여기를 행 수로 두면 화면의 「문항 수 줄이기」가 **덫이 된다.** 그 단추는
     *    `available` 을 그대로 문항 수로 넣어 다시 출제하는데, 16행·4갈래인 단원에서
     *    「가용 16」을 보여 주면 16으로 재시도해 **또 실패**한다. 원장님은 누를수록
     *    안 되는 단추를 보게 된다.
     *
     * 갈래가 안 접히는 풀(기출처럼 키가 없는 행뿐인 경우)에서는 이 값이 `usable.length`
     * 와 **같다** — 그래서 예전 동작과 한 글자도 다르지 않다.
     */
    const capacity = countFamilies(usable);
    /** 행은 넉넉한데 갈래가 모자라서 막힌 것인가. 사유를 정확히 말해야 고칠 수 있다. */
    const limitedByFamilies = capacity < usable.length && capacity < count;
    return jsonOk(
      insufficientProblemsErrorResponseSchema,
      {
        error: {
          code: "INSUFFICIENT_PROBLEMS",
          message: limitedByFamilies
            ? input.testType === "daily"
              ? "이 단원은 문항류가 부족합니다. 같은 문항류는 시험지에 하나만 들어갑니다."
              : "이 범위는 문항류가 부족합니다. 같은 문항류는 시험지에 하나만 들어갑니다."
            : input.testType === "daily"
              ? "이 단원에 등록된 문제가 부족합니다."
              : "이 범위에 등록된 문제가 부족합니다.",
          details: {
            // 화면의 「AI 생성」이 이 단원에 문제를 만든다. 일일테스트는 단원이
            // 하나뿐이라 그것이고, 확인테스트는 **범위에서 가장 얇은 단원**이다 —
            // 예전에는 `rangeEndUnitId`(그냥 범위의 끝)를 가리켰는데, 그 단원이
            // 이미 700건을 갖고 있어도 그리로 보냈다. 부족한 곳을 가리켜야
            // 한 번 눌러서 실제로 채워진다.
            unitId:
              input.testType === "daily"
                ? current!.unitId
                : // 진도가 없는 반이면 되돌아갈 곳이 범위의 끝뿐이다(요청이 준 값).
                  thinnestUnitId(
                    unitIds,
                    usable,
                    current?.unitId ?? input.rangeEndUnitId!,
                  ),
            available: capacity,
            required: count,
          },
        },
      },
      { status: 422 },
    );
  }

  const rangeEndUnitId =
    input.testType === "daily"
      ? current!.unitId
      : (input.rangeEndUnitId ?? current?.unitId)!;
  const rangeStartUnitId =
    input.testType === "daily" ? null : (input.rangeStartUnitId ?? null);

  const created = await db.$transaction(async (tx) => {
    await assertClassWrite(tx, session, input.classId, "test:write");
    if (input.studentId)
      await assertStudentEnrollment(tx, input.studentId, input.classId);
    if (!(await selectionStillCurrent(tx, selected.problems))) return null;
    if (
      origin.autoDraftRunId &&
      !(await autoDraftBindingAllowed(owned.data, tx))
    )
      throw new Error("auto_draft_binding_disabled");
    const test = await tx.test.create({
      data: {
        // 시험지는 **소유자가 있다** — 없앤 것은 문항 소유자뿐이다(D-101). 섞지 말 것.
        // 🔴 소유자는 **반의 소유자**다(D-130) — 관리자가 남의 반에 내도 그 반 계정의 시험지로 남아
        //    역할 계정 화면·기본 범위·중복 제외가 그대로 이어진다. 관리자가 아니면 반 소유자가 곧 나다.
        userId: owned.data.userId,
        classId: input.classId,
        studentId: input.studentId ?? null,
        testType: input.testType,
        rangeStartUnitId,
        rangeEndUnitId,
        status: "draft",
        modified: false,
        testDate: new Date(`${input.testDate}T00:00:00.000Z`),
        // 아침 회차가 세운 것만 값이 있다 — 손으로 낸 시험지는 NULL(D-133 ⑴)
        autoDraftRunId: origin.autoDraftRunId ?? null,
      },
    });

    // 🔴 문항 수만큼 INSERT 를 순차로 await 하던 자리다(25문항이면 25왕복).
    //    한 INSERT 로 넣는다 — 같은 트랜잭션 안이라 원자성은 그대로다.
    await tx.testProblem.createMany({
      data: selected.problems.map((problem, index) => ({
        testId: test.id,
        problemId: problem.id,
        orderIndex: index + 1,
        replaced: false,
      })),
    });

    const items = await tx.testProblem.findMany({
      where: { testId: test.id },
      include: { problem: true, snapshot: true },
      orderBy: { orderIndex: "asc" },
    });
    return { test, items };
  });

  if (!created)
    return jsonError(
      "CONFLICT",
      "선택한 문항이 바뀌었습니다. 범위와 형식을 다시 확인해 주세요.",
      409,
    );

  return jsonOk(
    testGenerateResponseSchema,
    {
      data: {
        test: serializeTest(created.test),
        problems: created.items.map(serializeTestProblemItem),
        shortfall: selected.shortfall,
      },
    },
    { status: 201 },
  );
}

/**
 * 범위 안에서 **출제 가능 문항이 가장 적은 단원**. 동률이면 `unitIds` 순서(=orderIndex
 * 오름차순, `resolveRange` 가 그렇게 정렬해 준다)로 앞선 것 — 진도가 이른 쪽을 먼저
 * 메우는 편이 확인테스트의 앞부분을 채운다.
 *
 * ⚠️ 세는 것은 **최근 출제(D-20)를 뺀 나머지**다. 그래야 화면이 보는 「가용」과 같은
 *    기준이 된다 — 다른 기준으로 세면 「가용 3인데 왜 이 단원?」이 된다.
 */
function thinnestUnitId(
  unitIds: string[],
  usable: { unitId: string }[],
  fallbackUnitId: string,
): string {
  if (unitIds.length === 0) return fallbackUnitId;
  const counts = new Map(unitIds.map((id) => [id, 0]));
  for (const problem of usable) {
    const prev = counts.get(problem.unitId);
    if (prev !== undefined) counts.set(problem.unitId, prev + 1);
  }
  let best = unitIds[0]!;
  let bestCount = counts.get(best) ?? 0;
  for (const id of unitIds) {
    const count = counts.get(id) ?? 0;
    if (count < bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}
