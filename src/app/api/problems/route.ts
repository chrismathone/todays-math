/**
 * POST/GET /api/problems — 문제 등록(수동 자작/기출 직접 입력) · 공용 풀+본인 문제 목록
 * (필터: unitId/grade/chapter/chapterPrefix/difficulty/problemType/source/reviewStatus/pool,
 *  페이지네이션 — grade/chapter/chapterPrefix는 Unit relation 필터, S-08 계단식 단원 필터).
 * 대응 계약: src/contracts/problem.contract.ts
 *
 * ⚠️ reviewStatus는 등록 요청에 포함되지 않는다(계약이 strictObject로 거부) — 신규 문제는
 * 항상 review_status='pending'으로 시작하며, 승격은 PATCH /api/problems/{id}/review-status
 * 전용 엔드포인트를 통해서만 가능하다(D-22).
 */
import type { NextRequest } from "next/server";

import {
  problemCreateRequestSchema,
  problemFilterQuerySchema,
  problemListResponseSchema,
  problemResponseSchema,
  type ProblemFormatFilter,
} from "@/contracts/problem.contract";
import {
  classifyFormat,
  FORMAT_SUPERSET_WHERE,
  formatWithoutContent,
} from "@/lib/problem/provenance";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { PROBLEM_CODE_PATTERN } from "@/contracts/problemCode.contract";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { DEFAULT_PROBLEM_POOL, problemVisibleWhere } from "@/lib/problemPool";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { serializeProblem } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";

// POST /api/problems — 문제 등록(source: manual/past_exam만 허용 — 계약이 강제)
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = problemCreateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const unit = await db.unit.findUnique({ where: { id: parsed.data.unitId } });
  if (!unit) return notFoundError("소단원");

  let created;
  try {
    // exam-wiring: 기출·원본없음 — 계약이 source=past_exam 도 받지만, 이 경로의 입력에는
    //   examId·sourceFile·questionNumber 가 **아예 없다**(problemCreateSchema). 원본 시험지를
    //   가리킬 값이 없으므로 Exam 을 만들 수 없다. 지어내지 않고 비워 둔다.
    created = await db.problem.create({
      data: {
        userId: session.id,
        unitId: parsed.data.unitId,
        source: parsed.data.source,
        difficulty: parsed.data.difficulty,
        problemType: parsed.data.problemType,
        content: parsed.data.content,
        answer: parsed.data.answer,
        solution: parsed.data.solution ?? null,
        pool: parsed.data.pool ?? DEFAULT_PROBLEM_POOL,
      },
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2003")) {
      const currentUnit = await db.unit.findUnique({
        where: { id: parsed.data.unitId },
      });
      if (!currentUnit) return notFoundError("소단원");
    }
    throw error;
  }

  return jsonOk(
    problemResponseSchema,
    { data: serializeProblem(created) },
    { status: 201 },
  );
}

/**
 * **형식 필터(`[단]`·`[서]`)를 화면 라벨과 «똑같이» 푼다** — 원장님 지시 2026-08-26.
 *
 * 라벨은 파생값이라(`classifyFormat` 이 본문을 파싱해 보기 칸 수를 센다) Prisma `where` 로
 * 바로 못 거른다. 후보 SQL 조건을 공유 DB 전량에 대고 재 보니 가장 가까운 것도 **278건**이
 * 갈렸다(`scripts/qa/probe-format-filter.ts`). 필터와 라벨이 갈리는 것은 원장님의 최우선
 * 규칙(「모든 화면에서 모든 문제가 똑같은 규칙으로 똑같이 보여야 한다」)을 깨는 것이다.
 *
 * 그래서 **정확히** 푼다. 전량을 메모리로 끌어오지 않고 세 걸음으로 좁힌다:
 *
 *   ⑴ SQL 이 **후보 집합**만 긁는다(`FORMAT_SUPERSET_WHERE` — 실측 단답형 3,146행 ·
 *      서술형 7,819행). 본문은 **안 읽는다**.
 *   ⑵ 후보 대부분은 본문 없이 판정이 끝난다(`formatWithoutContent`).
 *   ⑶ 남은 것만 본문을 읽어 `classifyFormat` 을 부른다 — 실측 20행 · 45행.
 *
 * 그리고 최종 `where` 는 「후보 집합 **빼기** 어긋난 행」이다. 어긋난 행 목록이 작으므로
 * (실측 20·16) `id NOT IN (...)` 이 짧게 유지된다 — 맞는 행 수천 개를 `IN` 으로 나열하는
 * 반대 방향은 SQL 문이 수백 KB 가 된다.
 *
 * ⚠️ 후보 집합·본문 없는 판정이 `classifyFormat` 과 갈리면 이 전부가 무너진다.
 *    그 둘은 `src/__tests__/unit/problemFormatFilter.test.ts` 가 입력 공간 전수로 잠근다.
 */
async function formatWhere(
  format: ProblemFormatFilter | undefined,
  base: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  if (!format) return [];
  const superset = FORMAT_SUPERSET_WHERE[format];
  const candidates = await db.problem.findMany({
    where: { AND: [base, superset] },
    select: {
      id: true,
      answer: true,
      questionType: true,
      problemType: true,
      familyKey: true,
    },
  });

  // 본문을 읽어야만 갈리는 행만 골라 **그 행들의 본문만** 가져온다.
  const undecided = candidates.filter(
    (row) => formatWithoutContent(row) === null,
  );
  const contentById = new Map<string, string>(
    undecided.length === 0
      ? []
      : (
          await db.problem.findMany({
            where: { id: { in: undecided.map((row) => row.id) } },
            select: { id: true, content: true },
          })
        ).map((row) => [row.id, row.content]),
  );

  const rejected = candidates
    .filter((row) => {
      const quick = formatWithoutContent(row);
      if (quick !== null) return quick !== format;
      const content = contentById.get(row.id);
      // 본문을 못 읽었다 = 두 조회 사이에 지워진 행이다. **남기지 않는다** —
      // 라벨을 확인하지 못한 것을 보여 주면 필터와 화면이 갈린다.
      if (content === undefined) return true;
      return classifyFormat({ ...row, content }) !== format;
    })
    .map((row) => row.id);

  return rejected.length === 0
    ? [superset]
    : [superset, { NOT: { id: { in: rejected } } }];
}

// GET /api/problems — 공용 풀 + 본인 private (필터 + 페이지네이션, D-31)
export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const url = new URL(request.url);
  const parsed = problemFilterQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const {
    page,
    pageSize,
    grade,
    chapter,
    chapterPrefix,
    unitFrom,
    unitTo,
    q,
    hasFigure,
    hasSolution,
    hasAnswer,
    // 🔴 `format` 은 **컬럼이 아니다** — 아래에서 따로 푼다. 남은 `filters` 는 그대로
    //    Prisma 에 펼쳐지므로, 여기서 안 빼면 Prisma 가 모르는 필드로 던진다.
    format,
    ...filters
  } = parsed.data;
  // 단원 범위(2026-08-19 원장님 지시) — 화면은 **id 만** 보내고 순서는 여기서 읽는다.
  // `Unit.orderIndex` 는 전역 연속값이라(D-27) 학년 경계를 넘는 범위도 그대로 풀린다.
  //
  // ⚠️ 없는 단원 id 가 오면 **막는다.** 그냥 건너뛰면 필터가 조용히 사라져 전량이
  //    통과한다 — 「범위를 걸었는데 전부 나온다」가 되고, 화면은 그것을 못 알아챈다.
  const rangeIds = [unitFrom, unitTo].filter((v): v is string => Boolean(v));
  const rangeWhere: { unit: { orderIndex: { gte?: number; lte?: number } } }[] =
    [];
  if (rangeIds.length > 0) {
    const found = await db.unit.findMany({
      where: { id: { in: rangeIds } },
      select: { id: true, orderIndex: true },
    });
    if (found.length !== new Set(rangeIds).size) return notFoundError("소단원");
    const order = new Map(found.map((u) => [u.id, u.orderIndex]));
    const from = unitFrom === undefined ? undefined : order.get(unitFrom)!;
    const to = unitTo === undefined ? undefined : order.get(unitTo)!;
    // 거꾸로 온 범위는 **정렬한다** — 안 그러면 gte>lte 라 조용히 0건이 된다.
    const bounds =
      from !== undefined && to !== undefined
        ? { gte: Math.min(from, to), lte: Math.max(from, to) }
        : from !== undefined
          ? { gte: from }
          : { lte: to! };
    rangeWhere.push({ unit: { orderIndex: bounds } });
  }
  // 계단식 단원 필터(S-08) — problem 컬럼이 아니라 Unit relation으로 거른다.
  // chapter(정확 일치)가 있으면 chapterPrefix(접두 일치)는 무시한다.
  const unitWhere: {
    grade?: string;
    chapter?: string | { startsWith: string };
  } = {};
  if (grade) unitWhere.grade = grade;
  if (chapter) unitWhere.chapter = chapter;
  else if (chapterPrefix) unitWhere.chapter = { startsWith: chapterPrefix };
  // 「그림 있는 문제만」(S-08) — 그림은 두 갈래다. 원본 시험지에서 오려 온 이미지 경로
  // (`figureUrls`, 실측 8,442건)와 엔진이 그린 SVG(`figureSvg`, 현재 0건). 지금 0건이라고
  // 한쪽만 보면 SVG 가 채워지는 날 조용히 빠지므로 처음부터 둘 다 본다.
  const figureWhere = hasFigure
    ? [
        {
          OR: [
            { NOT: { figureUrls: { isEmpty: true } } },
            { figureSvg: { not: null } },
          ],
        },
      ]
    : [];
  // 「해설 있는 문제만」(2026-08-19) — `solution` 은 nullable 이고 **빈 문자열도
  // 들어 있다.** null 만 걸러도 빈 해설이 통과하므로 둘 다 본다.
  const solutionWhere = hasSolution
    ? [{ AND: [{ solution: { not: null } }, { solution: { not: "" } }] }]
    : [];
  // 「정답 있는 문제만」(2026-08-19) — 실측 45,041건(95.5%).
  //
  // ⚠️ `answer` 는 **빈 값이 0건**이다. 「비어 있지 않은가」로 만들면 100% 를
  // 통과시켜 아무것도 안 거른다. 실제 자리표시자는 `MISSING_ANSWER`("(정답 없음)")
  // 문자열 2,111건이다 — 빈 값이 빈 문자열이 아니라 **글자로 적혀 있다.**
  //
  // 이 상수는 **출제 자격(`findEligibleProblems`)이 쓰는 바로 그 값**이다. 화면
  // 필터가 따로 판정하면 「은행에는 보이는데 출제에는 안 뽑히는」 문항이 생긴다.
  const answerWhere = hasAnswer
    ? [{ AND: [{ answer: { not: MISSING_ANSWER } }, { answer: { not: "" } }] }]
    : [];
  // 검색(2026-08-19) — `contains` + `insensitive`.
  // ⚠️ 검색어가 비면 **아예 안 붙인다.** 빈 문자열로 붙이면 전량이 통과해 뜻이 없다.
  //
  // 원장님 지시 2026-08-19: 「문항번호도 같이 검색. 검색가능한건 모두 검색」.
  // 그 전에는 `content` 한 칸만 봤다 — 그래서 보고서에 적힌 문항 코드
  // (`HAL0309-Z7E2`)를 그대로 붙여 넣어도 **아무것도 안 나왔다.**
  //
  // 무엇을 넣고 무엇을 뺐나 (실측 47,172행 기준 채워진 정도):
  //   넣음  content 47,172 · problemCode 47,172 · answer 47,172
  //         solution 13,946 · school 40,237 · questionNumber 45,080
  //   뺌    sourceFile·examId·externalId — 사람이 읽는 값이 아니라 **내부 경로·식별자**다.
  //         figureSvg — SVG 소스라 검색어가 우연히 좌표에 걸린다.
  //
  // ⚠️ `questionNumber` 는 Int 라 `contains` 가 없다. 검색어가 **숫자일 때만** 같은
  //    값을 찾는다. 「12」로 찾으면 원본 시험지 12번들이 같이 나오는데, 그게 이
  //    칸을 넣은 이유다 — 학교·단원 필터와 겹쳐 쓰라고 있는 물건이다.
  //
  // 실측: 본문만 355ms → 넓혀서 581ms(같은 Seq Scan 한 번, 행마다 비교가 늘 뿐).
  // 화면은 `useDebounced` 로 타자 중 조회를 막는다.
  //
  // 🟢 빠른 길 — 검색어가 **문항 코드 그 자체**면 그 칸만 본다(유니크 인덱스).
  //    원장님이 보고서의 코드를 붙여 넣는 것이 실제 쓰임이다. 실측 700ms → 1ms.
  //    형식은 계약(`PROBLEM_CODE_PATTERN`)에서 가져온다 — 여기에 옮겨 적으면
  //    코드 규칙이 바뀔 때 한쪽만 고쳐도 아무도 모른다(D-53).
  const qCode = q?.trim().toUpperCase();
  const isWholeCode = !!qCode && new RegExp(PROBLEM_CODE_PATTERN).test(qCode);
  const qNumber = q && /^\d{1,7}$/.test(q) ? Number(q) : null;
  const searchWhere = isWholeCode
    ? [{ problemCode: qCode }]
    : q
      ? [
          {
            OR: [
              { content: { contains: q, mode: "insensitive" as const } },
              { problemCode: { contains: q, mode: "insensitive" as const } },
              { answer: { contains: q, mode: "insensitive" as const } },
              { solution: { contains: q, mode: "insensitive" as const } },
              { school: { contains: q, mode: "insensitive" as const } },
              ...(qNumber === null ? [] : [{ questionNumber: qNumber }]),
            ],
          },
        ]
      : [];
  // ⚠️ **평평하게 둔다.** 형식 조건을 넣으려고 이 배열을 한 겹 더 감쌌더니 `where.AND` 의
  //    모양을 재던 기존 시험 둘이 빨개졌다(관문 2026-08-26 — 「grade/chapterPrefix 는
  //    unit relation 으로 보낸다」·「chapter 가 있으면 chapterPrefix 를 무시한다」).
  //    조건을 **덧붙이기만** 하면 종전 모양이 그대로 유지된다.
  const baseAnd = [
    problemVisibleWhere(),
    filters,
    ...(Object.keys(unitWhere).length > 0 ? [{ unit: unitWhere }] : []),
    ...rangeWhere,
    ...figureWhere,
    ...solutionWhere,
    ...answerWhere,
    ...searchWhere,
  ];

  const where = {
    AND: [...baseAnd, ...(await formatWhere(format, { AND: baseAnd }))],
  };

  const [rows, total] = await Promise.all([
    db.problem.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      // 이관 배치는 createdAt이 같은 행이 수천 건이라 id 보조 키 없이는 페이지가 겹친다.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    db.problem.count({ where }),
  ]);

  return jsonOk(problemListResponseSchema, {
    data: rows.map(serializeProblem),
    meta: { page, pageSize, total },
  });
}
