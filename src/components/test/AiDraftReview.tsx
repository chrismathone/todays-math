"use client";

import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import { ProblemCard } from "@/components/problem/ProblemCard";
import type { ReviewStatus } from "@/contracts/common.contract";
import type { ProblemEntity } from "@/contracts/problem.contract";

/**
 * AI 가 방금 만든 문항을 **출제 화면에서 그대로 검수한다** — 원장님 지적 2026-08-26
 * 「승인을 한 다음에 다시 배정시켜야 하는데, 프로세스에 좀 문제가 있어 보이네.」
 *
 * ## 정책은 그대로고 자리만 옮겼다
 *
 * D-22(검수 후 출제)는 **한 글자도 안 풀었다.** 승격은 여전히 사람이 누르고, 여전히
 * `PATCH /api/problems/{id}/review-status` 하나뿐이다(`updateReviewStatus`). 은행에서
 * 누른 것과 **같은 뜻·같은 요청**이다. 바뀐 것은 그 버튼이 있는 자리다 — 예전에는
 * 화면을 떠나 은행으로 가서 대기 필터를 걸고 방금 만든 것을 찾아 승인한 뒤, 출제
 * 화면으로 돌아와 **설정을 처음부터 다시** 해야 했다.
 *
 * ## 「같은 문제는 같은 뷰」 (원장님 최우선 규칙)
 *
 * 여기서 새로 그리는 것은 **아무것도 없다.** 문제은행이 쓰는 `ProblemCard` 를 그대로
 * 쓴다 — 본문·보기·정답·해설·출처 라벨·검수 상태가 은행·미리보기·지면과 한 경로다.
 * 카드가 승인/반려 버튼을 이미 갖고 있어서(`onReviewStatusChange`) 새 컨트롤도 없다.
 *
 * 폭도 은행과 같은 값(`PROBLEM_CARD_WIDTH`)에서 온다 — 은행의 그리드 상수는 그 파일
 * 안의 지역 상수라 가져올 수 없어서, **둘 다 읽는 정본**(`print/tokens`)에서 만든다
 * (`dev/render-a-preview` 도 같은 방식이다).
 *
 * ⚠️ `onTransformAdopted` 는 **일부러 안 넘긴다.** 넘기면 카드에 「변형」이 생기는데,
 *    이 자리는 「방금 만든 것을 볼까 말까」를 정하는 곳이다. 변형은 은행에서 한다.
 */

const GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
};

export function AiDraftReview({
  drafts,
  onReviewStatusChange,
}: {
  drafts: readonly ProblemEntity[];
  /**
   * ⚠️ `ProblemCard` 는 `memo` 다 — 호출부에서 `useCallback` 으로 고정해서 넘길 것.
   *    인라인 화살표로 넘기면 승인 한 번에 카드 전량이 KaTeX 째로 다시 그려진다.
   */
  onReviewStatusChange: (id: string, next: ReviewStatus) => Promise<void>;
}) {
  if (drafts.length === 0) return null;

  const approved = drafts.filter(
    (draft) => draft.reviewStatus === "approved",
  ).length;

  return (
    <section
      aria-label="생성한 문항 검수"
      className="mt-6 border-t border-divider pt-6"
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-[10px] font-extrabold tracking-[1.2px] text-text-2">
          생성한 문항 검수
        </h2>
        {/*
          이 두 숫자는 **원장님이 방금 한 일**이지 출제 가용량이 아니다. 가용은
          갈래 수이고 D-20(최근 14일 제외)까지 걸린 값이라 화면이 셀 수 없다 —
          그건 위쪽 「가용 N / 필요 M」이 서버에서 받아 그대로 보여 준다.
        */}
        <span className="text-[12.5px] font-bold text-ink">
          승인 {approved} · 대기 {drafts.length - approved}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-text-2">
        승인하면 부족분을 다시 확인하고, 채워지면 출제합니다.
      </p>
      <div className="mt-4 grid justify-center gap-6" style={GRID_STYLE}>
        {drafts.map((draft) => (
          <ProblemCard
            key={draft.id}
            problem={draft}
            onReviewStatusChange={onReviewStatusChange}
          />
        ))}
      </div>
    </section>
  );
}
