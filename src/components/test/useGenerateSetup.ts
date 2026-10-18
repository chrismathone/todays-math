"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";
import type { ReviewStatus, TestType } from "@/contracts/common.contract";
import type { ProblemEntity } from "@/contracts/problem.contract";
// 검수 승격은 **은행이 쓰는 그 함수**를 그대로 부른다 — 요청을 여기서 다시 짜면
// 승격 경로가 두 벌이 된다(D-22 의 「승격은 이 엔드포인트 하나뿐」이 무너진다).
// 이 모듈은 계약을 동적으로만 물어서 zod 를 초기 번들에 얹지 않는다(성능 수리 C-1).
import { updateReviewStatus } from "@/lib/problem/problemApi";
// 값이지만 **zod 를 안 물고 오는 최소 모듈**이라 정적으로 가져와도 된다 (아래 C-1 주석 참조).
import {
  DEFAULT_DIFFICULTY_RATIO,
  DIFFICULTY_LADDER,
  fitDifficultyRatio,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import type { UnitEntity } from "@/contracts/unit.contract";
import { fetchClasses, fetchStudents } from "@/lib/class/classApi";
import {
  emptyFormats,
  formatIntent,
  formatIssue,
} from "@/components/exam-builder/conditionsPlan";
import { kstDateOf } from "@/lib/kstDate";

/**
 * 계약 스키마는 **런타임 값으로 정적 import 하지 않는다** (성능 수리 C-1).
 *
 * 이 훅은 5개 계약 모듈에서 6개 스키마를 정적으로 끌어와 출제 설정 화면 초기
 * 번들에 zod + 계약 모듈(279KB)을 얹고 있었다. 여기 검증은 전부 `fetch` 응답
 * (또는 사용자 제출) 이후라 그 시점에 불러도 늦지 않다. 검증은 그대로 남는다.
 */
const commonContract = () => import("@/contracts/common.contract");
const problemContract = () => import("@/contracts/problem.contract");
const testContract = () => import("@/contracts/test.contract");
const unitContract = () => import("@/contracts/unit.contract");

export type InsufficientState = {
  unitId: string;
  available: number;
  required: number;
  message: string;
};

type Props = {
  initialClassId?: string;
  initialStudentId?: string;
};

function todayIso() {
  return kstDateOf(new Date());
}

function applyClass(
  cls: ClassEntity | undefined,
  setProblemCount: (n: number) => void,
  setRatio: (r: DifficultyRatio) => void,
) {
  if (!cls) return;
  setProblemCount(cls.defaultProblemCount);
  setRatio(cls.difficultyRatio);
}

export function useGenerateSetup({ initialClassId, initialStudentId }: Props) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [units, setUnits] = useState<UnitEntity[]>([]);
  const [students, setStudents] = useState<StudentEntity[]>([]);
  const [studentState, setStudentState] = useState<{
    key: string;
    status: "loading" | "ready" | "error";
  }>({ key: "", status: "loading" });
  const [studentAttempt, setStudentAttempt] = useState(0);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const initialStudentApplied = useRef(false);
  const manualRangeKey = useRef<string | null>(null);
  const [manualRangeScope, setManualRangeScope] = useState<string | null>(null);
  const submitting = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [testType, setTestType] = useState<TestType>("daily");
  const [testDate, setTestDate] = useState(todayIso);
  const [problemCount, setProblemCount] = useState(8);
  const [formats, setFormats] = useState(emptyFormats);
  const [difficultyRatio, setDifficultyRatio] = useState<DifficultyRatio>(
    DEFAULT_DIFFICULTY_RATIO,
  );
  const [rangeStartUnitId, setRangeStartUnitId] = useState("");
  const [rangeEndUnitId, setRangeEndUnitId] = useState("");
  /** 「고치기」를 눌러 3열 피커를 펼쳤는가 (S-04 C안 — 평소에는 한 줄이다). */
  const [rangeEditing, setRangeEditing] = useState(false);
  /**
   * 기본 범위 조회의 **결과와 그것이 어느 반/학생의 것인지**를 같이 들고 있는다.
   *
   * 🔴 적대적 리뷰(2026-08-19): 예전에는 `rangeUnknown` 불리언 하나였다. 그래서
   *    ⑴ **아직 안 온 것**과 ⑵ **진도가 없는 것**과 ⑶ **조회가 실패한 것**이
   *    같은 문장(「진도 기록이 없어 범위를 정하지 못했습니다」)으로 나갔다.
   *    느린 회선에서는 진도가 멀쩡한데 원장이 진도를 기록하러 가고, 500 이 나도
   *    진도 탓을 한다. **손상은 「모른다」로 말해야 한다.**
   *
   * 키를 같이 두는 이유: 로딩 여부를 **파생**시키려는 것이다(`키가 다르면 아직
   * 안 온 것`). 효과 안에서 `setLoading(true)` 를 동기로 부르면 연쇄 렌더가 되고
   * ESLint 가 막는다 — 실제로 한 번 막혔다.
   */
  const [rangeState, setRangeState] = useState<{
    key: string;
    status: "ok" | "none" | "error";
  } | null>(null);
  const [insufficient, setInsufficient] = useState<InsufficientState | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * **AI 생성**이 돌고 있는가 — `busy`(무엇이든 돌고 있다)와 다른 물음이다.
   *
   * 진행 표시는 「무엇이 돌고 있나」를 가리켜야 한다. `busy` 로 그리면 「출제」를
   * 눌러도 «AI 문제 생성 중» 이 뜬다 — 원장님이 안 시킨 일을 하고 있다고 읽는다.
   * 시험의 «음성 대조»(출제에는 안 뜬다)가 이 구분을 지킨다.
   */
  const [aiBusy, setAiBusy] = useState(false);
  /**
   * AI 가 방금 만든 **pending 문항들** — 이 화면에서 그대로 검수한다
   * (원장님 지적 2026-08-26 「승인을 한 다음에 다시 배정시켜야 하는데…」).
   *
   * 여기 담긴 것은 이미 DB 에 들어간 진짜 행이다. 화면을 떠나도 문제은행에 그대로
   * 보인다 — 인라인 검수는 **지름길**이지 다른 저장소가 아니다.
   */
  const [aiDrafts, setAiDrafts] = useState<ProblemEntity[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClasses(), fetch("/api/units")])
      .then(async ([classData, unitRes]) => {
        if (!unitRes.ok) {
          throw new Error("목록을 불러오지 못했습니다");
        }
        const { unitListResponseSchema } = await unitContract();
        const unitBody = unitListResponseSchema.parse(await unitRes.json());
        if (cancelled) return;
        setClasses(classData);
        setUnits(unitBody.data);
        const nextClass = initialClassId
          ? classData.find((item) => item.id === initialClassId)
          : classData[0];
        if (nextClass) {
          setClassId(nextClass.id);
          applyClass(nextClass, setProblemCount, setDifficultyRatio);
        } else if (initialClassId) {
          setSelectionWarning(
            "요청한 반이 없거나 접근할 수 없습니다. 반을 직접 선택해 주세요.",
          );
        }
        // ⚠️ 여기서 범위 기본값을 **정하지 않는다.** 예전에는 `units[0]`(초1 첫
        //    소단원) ~ `units[마지막]`(미적분2 마지막)을 넣었다 — 그게 전 교육과정
        //    735단원짜리 확인테스트를 오류 없이 만들던 자리다. 범위는 진도가 정하고,
        //    그 판정은 서버(`/api/tests/default-range`)에 한 벌만 둔다.
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("반 목록을 불러오지 못했습니다");
      });
    return () => {
      cancelled = true;
    };
  }, [initialClassId, loadAttempt]);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setReady(false);
    setLoadAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    fetchStudents(classId)
      .then((data) => {
        if (cancelled) return;
        setStudents(data);
        setStudentState({ key: classId, status: "ready" });
        if (!initialStudentApplied.current) {
          initialStudentApplied.current = true;
          if (initialStudentId && !manualRangeKey.current) {
            if (data.some((item) => item.id === initialStudentId))
              setStudentId(initialStudentId);
            else
              setSelectionWarning(
                "요청한 학생이 현재 반 명단에 없습니다. 대상을 직접 선택해 주세요.",
              );
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          setStudentState({ key: classId, status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [classId, initialStudentId, studentAttempt]);

  /**
   * 확인테스트 기본 범위 — **진도가 정한다**(원장님 확정 2026-08-19).
   * 반·학생이 바뀌면 다시 묻는다. 원장이 「고치기」로 고른 값은 그때 함께 버려진다 —
   * 다른 반의 범위를 물려받는 것이 더 위험하다.
   */
  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    const key = `${classId}:${studentId}`;
    const query = new URLSearchParams({ classId });
    if (studentId) query.set("studentId", studentId);
    fetch(`/api/tests/default-range?${query.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const { defaultReviewRangeResponseSchema } = await testContract();
        return defaultReviewRangeResponseSchema.parse(await res.json());
      })
      .then((body) => {
        if (cancelled) return;
        if (manualRangeKey.current === key) {
          setRangeState({ key, status: "ok" });
          return;
        }
        if (!body.data) {
          setRangeState({ key, status: "none" });
          setRangeStartUnitId("");
          setRangeEndUnitId("");
          return;
        }
        setRangeState({ key, status: "ok" });
        setRangeStartUnitId(body.data.rangeStartUnitId);
        setRangeEndUnitId(body.data.rangeEndUnitId);
      })
      .catch(() => {
        if (cancelled) return;
        if (manualRangeKey.current === key) return;
        setRangeState({ key, status: "error" });
        setRangeStartUnitId("");
        setRangeEndUnitId("");
      });
    return () => {
      cancelled = true;
    };
  }, [classId, studentId]);

  /** 지금 화면이 보고 있는 반/학생의 답이 아직 안 왔는가. */
  const rangeLoading =
    manualRangeScope !== `${classId}:${studentId}` &&
    rangeState?.key !== `${classId}:${studentId}`;
  const rangeUnknown =
    manualRangeScope !== `${classId}:${studentId}` &&
    !rangeLoading &&
    rangeState?.status === "none";
  const rangeError =
    manualRangeScope !== `${classId}:${studentId}` &&
    !rangeLoading &&
    rangeState?.status === "error";

  const selectClass = useCallback(
    (nextId: string) => {
      if (nextId === classId || submitting.current) return;
      manualRangeKey.current = null;
      setManualRangeScope(null);
      initialStudentApplied.current = true;
      setClassId(nextId);
      setStudentId("");
      setStudents([]);
      setStudentState({ key: nextId, status: "loading" });
      setRangeStartUnitId("");
      setRangeEndUnitId("");
      setSelectionWarning(null);
      applyClass(
        classes.find((item) => item.id === nextId),
        setProblemCount,
        setDifficultyRatio,
      );
      setInsufficient(null);
      setSubmitError(null);
      // 반이 바뀌면 **검수 대상 단원 자체가 바뀐다** — 앞 반에서 만든 카드를 그대로
      // 두면 원장님이 다른 반의 문항을 이 반의 부족분으로 읽는다. 행은 은행에 남는다.
      setAiDrafts([]);
      // 반이 바뀌면 펼쳐 둔 범위 피커를 접는다. **효과가 아니라 여기서** 한다 —
      // 효과 안의 동기 setState 는 연쇄 렌더가 되고 ESLint 가 막는다.
      setRangeEditing(false);
    },
    [classes, classId],
  );

  /** 유형이 바뀌면 대상 단원이 바뀐다 — 반을 바꿀 때와 같은 이유로 검수 목록을 비운다. */
  const selectTestType = useCallback((next: TestType) => {
    setTestType(next);
    setInsufficient(null);
    setAiDrafts([]);
  }, []);

  /**
   * 범위를 **한 번에** 바꾼다. 시작·끝을 따로 setState 하면 그 사이 한 렌더 동안
   * 거꾸로 된 범위(시작 > 끝)가 실재해, 그때 요약 줄이 엉뚱한 것을 그린다.
   */
  const setRange = useCallback(
    (start: string, end: string) => {
      manualRangeKey.current = `${classId}:${studentId}`;
      setManualRangeScope(`${classId}:${studentId}`);
      setRangeStartUnitId(start);
      setRangeEndUnitId(end);
    },
    [classId, studentId],
  );

  /** 학생을 바꿔도 범위를 다시 묻는다 — 펼침은 같은 이유로 여기서 접는다. */
  const selectStudent = useCallback(
    (nextId: string) => {
      if (nextId === studentId || submitting.current) return;
      manualRangeKey.current = null;
      setManualRangeScope(null);
      initialStudentApplied.current = true;
      setStudentId(nextId);
      setRangeStartUnitId("");
      setRangeEndUnitId("");
      setSelectionWarning(null);
      setRangeEditing(false);
    },
    [studentId],
  );

  const studentsLoading =
    studentState.key !== classId || studentState.status === "loading";
  const studentsError =
    studentState.key === classId && studentState.status === "error";
  const retryStudents = useCallback(() => {
    setStudentState({ key: classId, status: "loading" });
    setStudentAttempt((value) => value + 1);
  }, [classId]);

  const generate = useCallback(
    async (countOverride?: number) => {
      if (!classId || submitting.current) return;
      if (studentsLoading || studentsError || selectionWarning) {
        setSubmitError("현재 반 명단과 출제 대상을 확인해 주세요.");
        return;
      }
      const count = countOverride ?? problemCount;
      const issue = formatIssue(formats, count);
      if (issue) {
        setSubmitError(issue);
        return;
      }
      const nextRatio =
        countOverride === undefined
          ? difficultyRatio
          : fitDifficultyRatio(difficultyRatio, count);
      if (countOverride !== undefined) {
        setProblemCount(countOverride);
        setDifficultyRatio(nextRatio);
      }
      // 범위가 아직 안 왔으면(반을 막 바꿨다) **이전 반의 값이 남아 있다** — 그대로
      // 보내면 다른 반의 범위로 출제된다. 단원 id 는 반과 무관하게 유효해서 서버도
      // 막지 않는다(적대적 리뷰 2026-08-19).
      if (
        testType === "review" &&
        (rangeLoading || !rangeStartUnitId || !rangeEndUnitId)
      ) {
        setInsufficient(null);
        setSubmitError(
          rangeLoading
            ? "범위를 불러오는 중입니다"
            : "진도 기록이 없어 범위를 정하지 못했습니다",
        );
        return;
      }
      if (
        DIFFICULTY_LADDER.reduce((sum, tier) => sum + nextRatio[tier], 0) !==
        count
      ) {
        setInsufficient(null);
        setSubmitError("난이도 배분의 합이 문항 수와 같아야 합니다");
        return;
      }
      submitting.current = true;
      setBusy(true);
      setSubmitError(null);
      // ⚠️ 여기서 `aiDrafts` 를 지우지 않는다. **이 함수는 「승인 뒤 부족분 다시 묻기」로도
      //    불린다** — 지우면 원장님이 검수하던 카드가 승인할 때마다 사라진다.
      //    검수 대상이 바뀌는 자리(반·유형 변경)에서만 비운다.
      // 새 시도를 시작하면 지난 부족 안내는 즉시 지운다. 안 지우면 다른 사유로
      // 재실패했을 때 옛 가용/필요 숫자와 「AI 생성」이 새 오류와 나란히 남아
      // 원장이 엉뚱한 버튼을 누른다.
      setInsufficient(null);
      try {
        const res = await fetch("/api/tests/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            classId,
            ...(studentId ? { studentId } : {}),
            testType,
            testDate,
            problemCount: count,
            ...(formatIntent(formats)
              ? { formats: formatIntent(formats) }
              : {}),
            // 🔴 **`difficultyRatio` 가 아니라 `nextRatio`** (2026-09-07).
            //    「문항 수 줄이기」는 줄인 수에 맞춰 배분을 다시 계산해 놓고(위 `nextRatio`)
            //    요청에는 클로저의 **옛 배분**을 실어 보냈다 — 계약의 refine(「배분의 합 ==
            //    문항 수」)이 서버에서 400 을 냈고, 그 버튼이 그 자리에서 죽어 있었다.
            //    바로 위의 자체 검사는 `nextRatio` 를 보므로 통과했다: 재는 것과 보내는
            //    것이 달라서 화면은 아무 말도 안 했다.
            difficultyRatio: nextRatio,
            ...(testType === "review"
              ? { rangeStartUnitId, rangeEndUnitId }
              : {}),
          }),
        });
        const json: unknown = await res.json();
        const [
          {
            insufficientProblemsErrorResponseSchema,
            testGenerateResponseSchema,
          },
          { errorResponseSchema },
        ] = await Promise.all([testContract(), commonContract()]);
        if (res.status === 422) {
          const parsed =
            insufficientProblemsErrorResponseSchema.safeParse(json);
          if (parsed.success) {
            setInsufficient({
              ...parsed.data.error.details,
              message: parsed.data.error.message,
            });
            return;
          }
        }
        if (!res.ok) {
          const parsed = errorResponseSchema.safeParse(json);
          setSubmitError(
            parsed.success ? parsed.data.error.message : "출제하지 못했습니다",
          );
          return;
        }
        const ok = testGenerateResponseSchema.parse(json);
        setInsufficient(null);
        router.push(`/tests/${ok.data.test.id}`);
      } catch {
        setSubmitError("출제하지 못했습니다");
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [
      classId,
      studentId,
      testType,
      testDate,
      problemCount,
      formats,
      difficultyRatio,
      rangeStartUnitId,
      rangeEndUnitId,
      rangeLoading,
      studentsLoading,
      studentsError,
      selectionWarning,
      router,
    ],
  );

  const generateAiDrafts = useCallback(async () => {
    if (!insufficient) return;
    setBusy(true);
    setAiBusy(true);
    setSubmitError(null);
    try {
      const count = Math.min(
        10,
        Math.max(1, insufficient.required - insufficient.available),
      );
      const res = await fetch("/api/problems/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // ⚠️ 난이도가 「응용」으로 **박혀 있다.** 어느 갈래가 모자란지는 422 가 안 알려
        //    주기 때문이다 — `insufficientProblemsDetailSchema` 는 `{unitId, available,
        //    required}` 뿐이라 난이도 칸이 없다. 계약을 넓히는 일은 이 트랙 밖이라
        //    보고에 남겼다. 넓히기 전에는 여기서 지어내면 안 된다.
        body: JSON.stringify({
          unitId: insufficient.unitId,
          difficulty: "응용",
          count,
        }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        // 🔴 예전에는 여기서 **서버가 보낸 사유를 통째로 버렸다.** 라우트는 일부러
        //    행동 가능한 말을 보낸다 — 「AI 설정이 없습니다 — DEEPSEEK_API_KEY 를…」·
        //    「길이 한도에 걸렸습니다 — 개수를 줄이거나…」. 그걸 「AI 문제 생성에
        //    실패했습니다」로 뭉개면 원장님은 무엇을 고쳐야 하는지 알 길이 없다.
        const { errorResponseSchema } = await commonContract();
        const parsed = errorResponseSchema.safeParse(json);
        setSubmitError(
          parsed.success
            ? parsed.data.error.message
            : "AI 문제 생성에 실패했습니다",
        );
        return;
      }
      const { problemGenerateResponseSchema } = await problemContract();
      const created = problemGenerateResponseSchema.parse(json);
      // 두 번 눌렀으면 **이어 붙인다.** 갈아 끼우면 앞 회차에서 검수하던 카드가
      // 사라진다. 같은 문항이 두 번 오는 일은 없다 — 생성은 늘 새 행을 만든다.
      setAiDrafts((before) => [...before, ...created.data]);
    } catch {
      setSubmitError("AI 문제 생성에 실패했습니다");
    } finally {
      setAiBusy(false);
      setBusy(false);
    }
  }, [insufficient]);

  /**
   * 인라인 검수 — **D-22 를 풀지 않는다.** 승격은 여기서도 사람이 누르고, 요청은
   * 은행과 **같은 하나**(`PATCH /api/problems/{id}/review-status`)다.
   *
   * 승인한 뒤에는 **부족분을 서버에 다시 묻는다** — 같은 출제 요청을 그대로 다시
   * 보낸다. 「가용」은 행 수가 아니라 **갈래 수**(`countFamilies`)이고 D-20(최근
   * 14일 제외)까지 걸린 값이라, 화면이 다시 셀 수 있는 종류의 수가 아니다. 화면이
   * 제 손으로 세면 「승인했는데 출제는 여전히 422」가 난다.
   *
   * 아직 모자라면 422 가 새 숫자를 주고, 채워졌으면 `generate` 가 그대로 시험지로
   * 데려간다 — 그것이 원장님이 애초에 누른 일이다.
   *
   * **반려는 다시 묻지 않는다.** 출제 풀은 `approved` 만 보므로 pending → rejected 는
   * 가용을 한 톨도 안 바꾼다. 한 번 더 묻는 것은 왕복만 늘린다.
   */
  const reviewAiDraft = useCallback(
    async (id: string, next: ReviewStatus) => {
      setSubmitError(null);
      try {
        await updateReviewStatus(id, next);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "검수 상태를 바꾸지 못했습니다",
        );
        return;
      }
      if (next === "rejected") {
        // 반려한 것은 목록에서 뺀다 — 전부 반려하면 「원래 자리」로 돌아가 다시
        // 생성할 수 있어야 한다. 행 자체는 은행에 `rejected` 로 남는다.
        setAiDrafts((before) => before.filter((draft) => draft.id !== id));
        return;
      }
      setAiDrafts((before) =>
        before.map((draft) =>
          draft.id === id ? { ...draft, reviewStatus: next } : draft,
        ),
      );
      if (next === "approved") await generate();
    },
    [generate],
  );

  const reduceCount = useCallback(() => {
    if (!insufficient || insufficient.available < 1) return;
    void generate(insufficient.available);
  }, [generate, insufficient]);

  return {
    classes,
    units,
    students,
    studentsLoading,
    studentsError,
    retryStudents,
    selectionWarning,
    confirmClassScope: () => setSelectionWarning(null),
    ready,
    loadError,
    retryLoad,
    classId,
    studentId,
    testType,
    testDate,
    problemCount,
    difficultyRatio,
    formats,
    setFormats,
    formatWarning: formatIssue(formats, problemCount),
    rangeStartUnitId,
    rangeEndUnitId,
    rangeEditing,
    rangeLoading,
    rangeUnknown,
    rangeError,
    insufficient,
    aiDrafts,
    submitError,
    busy,
    aiBusy,
    setStudentId: selectStudent,
    setTestType: selectTestType,
    setTestDate,
    setProblemCount,
    setDifficultyRatio,
    setRange,
    setRangeEditing,
    selectClass,
    generate,
    generateAiDrafts,
    reviewAiDraft,
    reduceCount,
  };
}
