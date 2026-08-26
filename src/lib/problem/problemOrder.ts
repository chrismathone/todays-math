/**
 * 문제은행 목록의 **정렬 규칙 — 한 곳** (원장님 지시 2026-08-26).
 *
 * > 「문항 정렬 순서를 명확히 할 것. 1. 학년 / 2. 학기 / 3. 단원순서 / 4. 분류 / 5. 번호」
 *
 * ## 다섯 열쇠가 실제 컬럼으로는 **둘**이다
 *
 * | 원장님 열쇠 | 실제 컬럼 | 근거 |
 * |---|---|---|
 * | 1 학년 · 2 학기 · 3 단원순서 | `Unit.orderIndex` **하나** | 아래 §1 |
 * | 4 분류 | 문항 코드의 `A01` 자리 (문항류, D-105) | 아래 §2 |
 * | 5 번호 | 문항 코드의 `-001` 자리 (아류 번호) | 아래 §2 |
 *
 * ### §1 — `Unit.orderIndex` 가 앞의 셋을 이미 담고 있다 (D-27)
 *
 * 실측 2026-08-26 (`npx tsx scripts/qa/probe-problem-order.ts units | chapters`):
 * - 단원 735개 · `orderIndex` 1..735 · **중복 0건**
 * - 학년 16종이 `orderIndex` 위에서 **연속 구간 정확히 16개** — 학년이 안 끊긴다
 * - 학년 안에서 대단원도 안 끊긴다(끊긴 학년 0)
 * - **학기**는 별도 컬럼이 없다. 초등 대단원 이름이 `1-1 9까지의 수` … `2-6 규칙 찾기`
 *   라 학기가 그 이름에 들어 있고, `orderIndex` 가 `1-*` 를 전부 `2-*` 앞에 세운다.
 *   중·고 교육과정 트리에는 학기 축 자체가 없다(대단원이 `1. 소인수분해` …).
 *
 * 그래서 앞의 셋에 열쇠를 셋 만들 필요가 없다 — **`orderIndex` 하나로 정확히 풀린다.**
 *
 * ### §2 — 「분류」와 「번호」는 문항 코드 안에 있다
 *
 * 코드는 `J10101-A01-001` 꼴이다(D-53 · D-105). 원장님 스크린샷이 뒤죽박죽이라고
 * 짚은 그 `A02`·`A05` 자리가 **문항류**이고, 끝의 `-001` 이 그 안의 아류 번호다.
 *
 * 그래서 **`problemCode` 문자열 오름차순 하나**가 「분류 → 번호」를 그대로 낸다:
 * - 한 단원 안에서는 코드 앞부분(`J10101-`)이 **모두 같다** — 단원 접두사는
 *   `Unit.problemCodePrefix` 하나에서 나온다.
 * - 문항류 `[A-Z][0-9]{2}` 와 번호 `[0-9]{3}` 이 **둘 다 고정 폭**이다(계약이 강제).
 *   제로패딩이라 문자열 순서 == 수 순서다 — `-002` < `-010` 이 성립한다.
 *   실측: 일련번호 길이 분포는 `[3]` 하나뿐, 문항류도 `[3]` 하나뿐.
 *
 * ⚠️ 오늘 DB 에는 번호가 10 이상인 아류가 **0건**이다. 「0건」은 «괜찮다»와 «못 센다»를
 *    안 가르므로, 제로패딩 성질은 실데이터가 아니라 **합성 코드**로 시험한다
 *    (`src/__tests__/unit/problemOrder.test.ts`).
 *
 * ### §3 — 옛 형식 코드(`J10101-K7M2`)는 어디로 가나
 *
 * 2026-08-25 이전에 부여된 코드는 무작위 4자라 **분류·번호 자리가 없다**. 실측 45,374건.
 * 그런데 그 45,374건은 **전부 격리 벽 밖**이다(`pool != shared`) — 은행이 보는
 * 2,423건은 **전량 새 형식**이고, 옛·새가 섞인 단원은 **0개**다
 * (`probe-problem-order.ts visible`).
 *
 * 그래도 규칙은 정해 둔다: **두 번째 규칙을 만들지 않고** 「코드 오름차순」에 그대로
 * 맡긴다. 「옛것은 무조건 뒤로」 같은 갈래를 넣으면 서버 `orderBy` 로는 표현할 수 없어
 * (Prisma 는 부분 문자열로 정렬하지 못한다) **화면과 서버가 두 벌**이 된다 —
 * 서버가 페이지를 나누므로 그 순간 페이지 경계에서 순서가 깨진다.
 * 벽이 열려 옛 코드가 은행에 들어오면 `probe-problem-order.ts visible` 이 알려 준다.
 *
 * ### §4 — 페이지가 겹치지 않는다
 *
 * `(Unit.orderIndex, problemCode)` 는 **전순서**다. `orderIndex` 는 실측 중복 0건이고
 * `problemCode` 는 `@unique` 라, 두 행이 두 열쇠에서 모두 같을 수 없다. 그래서 옛
 * 정렬이 쓰던 `id` 보조 키가 필요 없다 — 그쪽은 `createdAt` 이 유일하지 않아서
 * (이관 배치에 같은 초가 수천 건) 필요했던 것이다.
 */

/** 이 규칙이 보는 값 — 이것만 있으면 순서가 전부 정해진다. */
export interface ProblemOrderFields {
  /** `Unit.orderIndex` — 학년·학기·단원순서를 한 값에 담는다(§1). 모르면 `Infinity`. */
  unitOrderIndex: number;
  /** 문항 코드 — 분류·번호를 담는다(§2). */
  problemCode: string;
}

/** Prisma `orderBy` 항목의 **구조적** 타입. */
type BankOrderByEntry =
  { unit: { orderIndex: "asc" } } | { problemCode: "asc" };

interface BankOrderKey {
  /** 서버가 Prisma 에 그대로 넘기는 조각. */
  readonly prisma: BankOrderByEntry;
  /** 화면 비교기가 읽는 같은 값. */
  readonly read: (fields: ProblemOrderFields) => number | string;
}

/**
 * 🔴 **정렬 규칙의 유일한 출처.** 서버 `orderBy` 와 화면 비교기가 **둘 다 여기서** 나온다.
 *
 * 한쪽만 고칠 수 있는 자리를 남기지 않으려고 목록을 하나로 두었다 — 이 저장소가
 * 되풀이해 데인 자리다(「세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 */
export const BANK_ORDER_KEYS: readonly BankOrderKey[] = [
  { prisma: { unit: { orderIndex: "asc" } }, read: (f) => f.unitOrderIndex },
  { prisma: { problemCode: "asc" }, read: (f) => f.problemCode },
];

/** `GET /api/problems` 가 Prisma 에 넘기는 정렬. **서버 순서가 참이다.** */
export const PROBLEM_BANK_ORDER_BY: BankOrderByEntry[] = BANK_ORDER_KEYS.map(
  (key) => key.prisma,
);

/**
 * 화면이 목록에 새 문항을 끼워 넣을 때 쓰는 비교기 — 서버와 **같은 열쇠 목록**을 읽는다.
 *
 * ⚠️ 문자열은 `localeCompare` 가 아니라 코드 단위로 견준다. 코드는 대문자·숫자·`-`
 *    뿐이라 이게 Postgres 의 순서와 같다(`probe-problem-order.ts parity` 가 실데이터
 *    전량으로 대조한다). `localeCompare` 는 로캘에 따라 `-` 를 무시해 갈라진다.
 */
export function compareProblemsForBank(
  a: ProblemOrderFields,
  b: ProblemOrderFields,
): number {
  for (const key of BANK_ORDER_KEYS) {
    const left = key.read(a);
    const right = key.read(b);
    if (left < right) return -1;
    if (left > right) return 1;
  }
  return 0;
}

/** 위 비교기로 정렬한 새 배열. 원본은 안 건드린다. */
export function sortProblemsForBank<T extends ProblemOrderFields>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(compareProblemsForBank);
}

/**
 * 화면이 가진 값에서 정렬 열쇠를 뽑는다.
 *
 * ⚠️ 단원을 못 찾으면 **버리지 않고** 맨 뒤로 보낸다(`Infinity`). 걸러 내면 목록에서
 *    조용히 사라진다 — 「무엇을 잃는지 세라」(D-20)와 같은 결이다.
 */
export function problemOrderFields(
  problem: { problemCode: string },
  unit: { orderIndex: number } | undefined,
): ProblemOrderFields {
  return {
    unitOrderIndex: unit?.orderIndex ?? Number.POSITIVE_INFINITY,
    problemCode: problem.problemCode,
  };
}
