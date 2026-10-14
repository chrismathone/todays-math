/**
 * **출제 자격** — 「이 문항이 학생에게 나가도 되는가」를 판정하는 **유일한 규칙**.
 *
 * 자동 출제(`findEligibleProblems`)는 처음부터 이 네 조건을 걸었다. 그런데 2026-09-04 에
 * 생긴 **손으로 짜는 길**(담기 바구니 → 시험지)은 그 관문 옆으로 났고, 자격을 하나도
 * 묻지 않았다 — `POST /api/basket` 은 「볼 수 있나」(공유 풀)만, `POST /api/basket/test`
 * 는 아무것도.
 *
 * 그래서 2026-09-07 실측으로 **출제 금지 1,751건**(전부 `approved` 인데
 * `directUseAllowed=false` — 그림이 유실돼 잠근 것들이다)이 문제은행에서 담겨
 * 「다음 그림에서…」라고 적힌 채 **그림 없이 종이로** 나갈 수 있었다.
 * 이 결함은 스스로 신고하지 않는다: 500도 안 나고 로그도 없고, 원장이 인쇄물을 보기
 * 전까지 아무도 모른다.
 *
 * ## 🔴 규칙을 두 벌 두지 않는다
 *
 * 자격을 묻는 자리가 셋이다 — DB 조회(자동 출제) · 서버 라우트(담기·시험지) ·
 * 화면(카드의 「담기」 버튼). 앞의 둘은 Prisma `where`, 뒤는 JS 술어라 **모양이 다를
 * 수밖에 없다.** 그래서 둘을 한 파일에 나란히 두고, `problemEligibility.test.ts` 가
 * 「같은 행에 대해 둘이 같은 답을 내는가」를 픽스처 행렬로 잠근다. 한쪽만 고치면 빨개진다.
 *
 * ⚠️ 이 모듈은 **`@/lib/db` 를 import 하지 않는다.** 화면(클라이언트 컴포넌트)이
 *    같은 술어를 써야 하는데, db 를 물면 Prisma 엔진이 브라우저 번들에 딸려 온다.
 */
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { DEFAULT_PROBLEM_POOL, problemVisibleWhere } from "@/lib/problemPool";

/**
 * 출제 자격 `where` — 단원·난이도 같은 **고르는 조건은 빼고** 자격만.
 * `eligibleProblemsWhere`(자동 출제)가 이것을 감싸고, 담기·시험지 라우트가 그대로 쓴다.
 */
export function problemEligibleWhere() {
  return {
    AND: [
      problemVisibleWhere(),
      {
        reviewStatus: "approved" as const,
        directUseAllowed: true,
        // 정답이 없으면 정답지가 비어 채점이 불가능하다 → 출제 대상에서 제외.
        answer: { not: MISSING_ANSWER },
      },
    ],
  };
}

/** 자격 판정에 필요한 컬럼만 — 라우트가 `select` 로 이만큼만 읽는다. */
export type ProblemEligibilityInput = {
  pool: string;
  reviewStatus: string;
  directUseAllowed: boolean;
  answer: string;
};

/**
 * 못 내는 까닭의 **열쇠** — 화면이 문구를 고를 때 쓴다(문제은행 P0 · 2026-10-14).
 *
 * `locked` 는 `directUseAllowed = false` 다. 이 칸은 법적 권리만이 아니라 그림 유실 · 재검토 · 원문 갱신 등
 * 여러 잠금이 같이 쓰고 **까닭을 저장하지 않는다** — 화면은 이 열쇠를 «출제 잠금(사유 미기록)»으로 읽는다
 * (`BANK_INELIGIBLE_LABEL`). 까닭을 지어내지 않는다.
 */
export const PROBLEM_INELIGIBLE_CODES = [
  "notShared",
  "notApproved",
  "locked",
  "noAnswer",
] as const;
export type ProblemIneligibleCode = (typeof PROBLEM_INELIGIBLE_CODES)[number];

const INELIGIBLE_REASON: Record<ProblemIneligibleCode, string> = {
  notShared: "공용 풀 문항이 아닙니다.",
  notApproved: "검수를 통과하지 않은 문항입니다.",
  locked: "출제가 잠긴 문항입니다.",
  noAnswer: "정답이 없는 문항입니다.",
};

/**
 * 못 내는 까닭의 열쇠, 낼 수 있으면 `null`. 순서가 곧 우선순위다: 여럿이 걸리면 앞의 것을 말한다.
 *
 * ⚠️ 정답 판정은 `hasRealAnswer` 가 아니라 **`where` 와 똑같이** 센티널 하나만 본다.
 *    빈 문자열까지 여기서 막으면 DB 조회와 답이 갈리고, 그 어긋남은 「화면은 담을 수
 *    있다는데 서버가 거부」로 나타난다. 자격 규칙을 넓히려면 **양쪽을 같이** 고칠 것.
 */
export function problemIneligibleCode(
  problem: ProblemEligibilityInput,
): ProblemIneligibleCode | null {
  if (problem.pool !== DEFAULT_PROBLEM_POOL) return "notShared";
  if (problem.reviewStatus !== "approved") return "notApproved";
  if (!problem.directUseAllowed) return "locked";
  if (problem.answer === MISSING_ANSWER) return "noAnswer";
  return null;
}

/**
 * 못 내는 사유 한 줄, 낼 수 있으면 `null` — `problemIneligibleCode` 의 문장판.
 *
 * 문구는 **사무적**이다(D-08) — 화면의 버튼 설명과 API 의 422 사유가 같은 문장을 쓴다.
 */
export function problemIneligibleReason(
  problem: ProblemEligibilityInput,
): string | null {
  const code = problemIneligibleCode(problem);
  return code === null ? null : INELIGIBLE_REASON[code];
}

/** 낼 수 있는가 — 사유가 필요 없는 자리를 위한 얇은 껍데기. */
export function isProblemEligible(problem: ProblemEligibilityInput): boolean {
  return problemIneligibleReason(problem) === null;
}
