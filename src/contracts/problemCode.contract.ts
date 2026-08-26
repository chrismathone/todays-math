/**
 * 문항 코드 계약 — D-53 (원장님 확정 2026-08-18).
 *
 * ```
 * 초·중   J31402-K7M2     J=중 · 3=학년 · 14=대단원 · 02=소단원 · 무작위4
 * 고등    HC10305-Q4XZ    학년 자리에 과목 코드 2자
 * ```
 *
 * 구분자는 **무작위 앞 하나뿐**이다(원장님 지시).
 *
 * ⚠️ **저장이지 파생이 아니다.** 뜻 부분은 **부여 당시의 스냅샷**이고 진실은 언제나
 *    컬럼(`unitId`·`source`)이다. 코드를 `unitId` 로 다시 계산하면 단원 재배정
 *    (관측 149건)·교육과정 시드 변경 때 원장님이 지목한 코드가 다른 문항을 가리킨다.
 *    그래서 이 파일에는 **읽기 규칙(형식)만** 있고, 「단원에서 코드를 만드는」 함수는
 *    `src/lib/problemCode.ts` 에 따로 두었다 — 그쪽은 **부여 때 한 번만** 쓰인다.
 *
 * ⚠️ 이 파일이 형식의 **유일한 출처**다. 마이그레이션 SQL(`20260818210000_problem_code`)의
 *    CHECK 정규식과 무작위 집합은 여기 값을 **그대로 옮겨 적은 것**이고,
 *    `src/__tests__/unit/problemCode.test.ts` 가 둘이 글자까지 같은지 대조한다.
 *    한쪽만 고치면 빨개진다.
 *
 * 근거: docs/planning/07-coding-convention.md D-53 ·
 *       docs/planning/tracks/reports/id-scheme-review.md §4 ·
 *       docs/planning/tracks/reports/problem-code.md
 */
import { z } from "zod";

/**
 * 무작위 4자에 쓰는 글자 — 숫자·대문자에서 **헷갈리는 글자를 뺀** 32자.
 *
 * 뺀 것: `0`↔`O` · `1`↔`I`↔`l`. 원장님이 코드를 눈으로 읽고 입으로 옮기는 값이라
 * 이 넷이 섞이면 「받아 적은 코드」가 다른 문항을 가리킨다.
 *
 * 32 = 2^5 이라 무작위 바이트를 5비트씩 잘라 쓰면 **치우침이 없다**. 33자나 31자면
 * 나머지 연산에서 특정 글자가 더 자주 나온다(코드가 틀리지는 않지만, 「무작위」라고
 * 적어 두고 사실이 아닌 값이 된다).
 */
export const PROBLEM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** 무작위 부분의 길이 — D-53 확정. 32^4 = 1,048,576 가지. */
export const PROBLEM_CODE_SUFFIX_LENGTH = 4;

/**
 * 학년/과목 → 코드의 «학교급+학년» 자리.
 *
 * ⚠️ **이 표를 손으로 늘리지 마라.** 교육과정 정본(`prisma/seed-data/units.ts`)의
 *    학년 집합과 **정확히 같아야** 하고, 테스트가 그것을 대조한다. 정본에 과목이
 *    하나 늘면 이 표가 비어 빨개진다 — 그게 이 표의 존재 이유다
 *    (CLAUDE.md 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 *
 * 학교급 문자: 초 `E`(elementary) · 중 `J`(junior) · 고 `H`(high).
 * 고등 7과목은 학년이 없어(과목 선택제) 학년 자리에 **2자 과목 코드**가 온다 —
 * 그래서 고등 코드만 한 자 길다. 첫 글자가 `H` 인지로 갈리므로 읽는 데 문제 없다.
 */
export const GRADE_CODE_SEGMENT: Readonly<Record<string, string>> = {
  초1: "E1",
  초2: "E2",
  초3: "E3",
  초4: "E4",
  초5: "E5",
  초6: "E6",
  중1: "J1",
  중2: "J2",
  중3: "J3",
  공통수학1: "HC1",
  공통수학2: "HC2",
  대수: "HAL",
  미적분1: "HM1",
  미적분2: "HM2",
  "확률과 통계": "HPS",
  기하: "HGE",
};

/** 코드 앞부분(뜻 부분)의 정규식 조각 — 학교급+학년/과목 자리. */
const GRADE_SEGMENT_PATTERN = `(?:E[1-6]|J[1-3]|H(?:C1|C2|AL|M1|M2|PS|GE))`;

/**
 * 단원 코드(=문항 코드의 뜻 부분) 정규식. 예: `J31402` · `HC10305`.
 *
 * 대단원·소단원은 각각 2자리다. 실측(2026-08-18, DB 전량 조회):
 * 대단원은 학년당 최대 12개, **대단원당 소단원은 최대 32개**(공통수학1 「2. 방정식과
 * 부등식」). ⚠️ 브리프가 물려준 「소단원 최대 12개」는 틀린 수였다 — 2자리라는 결론은
 * 같지만, 물려받은 수는 다시 세야 한다(CLAUDE.md 2026-08-18 「분모를 검산하라」).
 */
export const UNIT_CODE_PATTERN = `^${GRADE_SEGMENT_PATTERN}[0-9]{4}$`;

/**
 * **문항류** 자리 — `A01`~`Z99` (원장님 확정 2026-08-25: 「J30103-A01-001 이런 식」).
 *
 * 글자는 **비슷한 문항류를 한 무리로 묶는** 자리다(원장님 의도: 「혹시나 비슷한
 * 문항류는 A01 A02 하려고」). 지금은 단원마다 `A01` 부터 차례로 붙이고, 나중에
 * 「이 셋은 한 무리」라고 정해지면 그때 글자를 나눈다.
 *
 * 한 단원에 26 × 99 = **2,574 갈래**. 실측으로 한 소단원의 RPM 유형은 최대 30 남짓이라
 * 넉넉하다.
 */
export const PROBLEM_FAMILY_PATTERN = `[A-Z][0-9]{2}`;

/** 문항류 한 자리에 들어가는 **아류 번호** — `001`~`999`. 숫자만 바꾼 변형이 여기 쌓인다. */
export const PROBLEM_SEQ_PATTERN = `[0-9]{3}`;

/** 한 문항류가 담을 수 있는 아류 수. 넘으면 부여가 **멈춘다**(조용히 겹치지 않는다). */
export const PROBLEM_SEQ_MAX = 999;

/** 한 단원이 담을 수 있는 문항류 수 — 26 × 99. */
export const PROBLEM_FAMILY_MAX = 26 * 99;

/**
 * 문항 코드 전체 정규식 — 마이그레이션의 CHECK 제약이 이 문자열을 그대로 쓴다.
 *
 * 예: `J30103-A01-001` · `HC10305-B12-007`
 */
export const PROBLEM_CODE_PATTERN = `^${GRADE_SEGMENT_PATTERN}[0-9]{4}-${PROBLEM_FAMILY_PATTERN}-${PROBLEM_SEQ_PATTERN}$`;

/**
 * 🔴 **옛 형식** — `J31402-K7M2` 처럼 무작위 4자. 2026-08-25 이전에 부여된 코드다.
 *
 * 지우지 마라. 이 형식을 단 행이 **45,374건** 남아 있고(바깥벽 격리 대상),
 * 코드는 `problem_code_freeze` 트리거가 UPDATE 를 막으므로 **영영 그대로**다.
 * DB 의 CHECK 는 그래서 «옛 것 또는 새 것»을 받는다 — 하나만 받게 하면 격리된
 * 45,374건이 통째로 제약 위반이 되어 어떤 UPDATE 도 못 한다.
 *
 * ⚠️ 새로 **부여**되는 코드는 언제나 새 형식이다. 그 성질은 정규식이 아니라
 *    `problem_code_assign` 트리거가 지키고, `verify-problem-code-wiring.ts` 가 잰다.
 */
export const LEGACY_PROBLEM_CODE_PATTERN = `^${GRADE_SEGMENT_PATTERN}[0-9]{4}-[${PROBLEM_CODE_ALPHABET}]{${PROBLEM_CODE_SUFFIX_LENGTH}}$`;

/** DB CHECK 가 쓰는 정규식 — 옛 형식과 새 형식을 **둘 다** 받는다. */
export const PROBLEM_CODE_ANY_PATTERN = `(?:${PROBLEM_CODE_PATTERN.slice(1, -1)}|${LEGACY_PROBLEM_CODE_PATTERN.slice(1, -1)})`;

export const unitCodePrefixSchema = z
  .string()
  .regex(new RegExp(UNIT_CODE_PATTERN), {
    error: "단원 코드 형식이 아닙니다.",
  });

/**
 * 화면·API 가 받는 코드 — **옛 것도 받는다.** 격리된 45,374건이 옛 형식이고,
 * 「문항 코드로 찾기」는 그것들도 찾을 수 있어야 한다(조회는 격리와 다른 축이다).
 */
export const problemCodeSchema = z
  .string()
  .regex(new RegExp(`^${PROBLEM_CODE_ANY_PATTERN}$`), {
    error: "문항 코드 형식이 아닙니다.",
  });

export type ProblemCode = z.infer<typeof problemCodeSchema>;

/** 코드 전체 길이 상한 — 고등(3+4+1+3+1+3=15). 컬럼은 VarChar(16). */
export const PROBLEM_CODE_MAX_LENGTH = 15;

/**
 * 문항 코드에서 **단원 및 문항류(예: J30103-A01)** 까지만 축약한다 (원장님 확정 2026-08-26 시안 ㉡).
 * - 2세대 새 코드(`J30103-A01-001`):
 *   - mode="unit_family" (기본): `J30103-A01` (단원코드 + 문항류)
 *   - mode="family_only": `A01` (문항류만)
 * - 1세대 옛 코드(`J30103-4NSK`): 문항류 자리가 없으므로 전체 코드 유지
 */
export function formatShortProblemCode(
  code: string,
  mode: "unit_family" | "family_only" = "unit_family",
): string {
  const match = code.match(/^([A-Z0-9]+)-([A-Z][0-9]{2})-[0-9]{3}$/);
  if (!match) return code;
  return mode === "unit_family" ? `${match[1]}-${match[2]}` : match[2]!;
}
