/**
 * 앱이 볼 수 있는 문항의 **유일한 경계**.
 *
 * ## 왜 별도 파일인가
 * `src/lib/db.ts` 는 import 만 해도 `PrismaClient` 를 만든다. 「앱이 무엇을 보나」만
 * 알면 되는 쪽(배포본 그림 검사처럼 **자기 클라이언트를 따로 쓰는** 스크립트)이
 * 그것 때문에 연결을 하나 더 열 이유가 없다. 그리고 시험에서 `@/lib/db` 는
 * 모킹되므로, 경계를 그쪽에 두면 **시험이 진짜 값을 못 본다.**
 *
 * ## 손으로 베끼지 마라
 * 이 값을 문자열로 다시 적는 순간 두 벌이 된다. 한쪽만 옮겨도 아무도 모르고,
 * 그때 그 검사는 **앱이 못 보는 것을 세면서 초록**을 낸다 — 이 저장소가 반복해서
 * 낸 결함이다. 쓰는 곳은 반드시 여기를 import 한다.
 */
export const APP_VISIBLE_PROBLEM_POOL = "shared" as const;

/**
 * 🔴 **`findUnique` 계열은 `AND` 를 안 받는다.**
 *
 * `ProblemWhereUniqueInput` 은 스칼라 필터와 `OR`·`NOT` 은 받지만 `AND` 는 **없다**.
 * 그래서 다른 읽기와 똑같이 `AND` 로 감싸면 질의가 아예 안 나가고
 * `PrismaClientValidationError` 로 **500** 이 난다 — 화면에는 「검수 상태를 바꾸지
 * 못했습니다」로만 보인다(원장님 2026-08-26 승인 버튼).
 *
 * 실제로 그렇게 나가 있었고, `requireAccessibleProblem`(승인·반려·수정·삭제·변형)과
 * 문항 교체가 **전부** 죽어 있었다. 단위 시험이 못 잡은 이유는 그 시험들이 `@/lib/db`
 * 를 **통째로 모킹**하기 때문이다 — 확장이 실제로 무엇을 만들어 보내는지는 축 자체가
 * 없었다(CLAUDE.md 2026-08-19 「없는 축은 변이시킬 수 없다」). 그래서 규칙이
 * **여기** 있다: 이 파일은 모킹되지 않으므로 시험이 진짜 값을 본다.
 *
 * 이 순수 함수만으로는 「Prisma 가 정말 `AND` 를 거부하는가」를 증명하지 못한다 —
 * 그건 진짜 DB 를 두드리는 `scripts/qa/probe-problem-wall.ts` 몫이다.
 */
const UNIQUE_READ_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow"]);

/** 벽을 씌워야 하는 읽기 연산. 여기 없으면 벽 밖이다. */
export const PROBLEM_READ_OPERATIONS = new Set([
  "aggregate",
  "count",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "groupBy",
]);

/**
 * 격리 벽을 `where` 에 씌운다. 연산에 따라 **씌우는 방법이 다르다**(위 주석).
 *
 * ⚠️ 호출부가 `pool` 을 직접 적어 온 경우에도 **벽이 이긴다.** 지금 보이는 풀은
 *    `shared` 하나뿐이고(`problemPool.ts`) 접근 판정도 그 값 하나만 통과시키므로,
 *    덮어써도 뜻이 바뀌지 않고 **닫히는 쪽**으로만 샌다.
 */
export function scopeProblemWhere<W extends object>(
  operation: string,
  where: W | undefined,
): Record<string, unknown> {
  if (UNIQUE_READ_OPERATIONS.has(operation)) {
    return { ...where, pool: APP_VISIBLE_PROBLEM_POOL };
  }
  return {
    AND: [...(where ? [where] : []), { pool: APP_VISIBLE_PROBLEM_POOL }],
  };
}
