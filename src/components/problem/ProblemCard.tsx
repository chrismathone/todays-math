"use client";

import { memo, useState, type CSSProperties } from "react";

import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import paper from "@/components/print/TestPrint.module.css";
import { PAPER_CSS_VARIABLES } from "@/components/print/tokens";
import type { ReviewStatus } from "@/contracts/common.contract";
import type { ProblemEntity } from "@/contracts/problem.contract";

import { provenanceBadges } from "@/lib/problem/provenance";

import { REVIEW_STATUS_LABEL } from "./labels";
import { ProblemTransformPanel } from "./ProblemTransformPanelLazy";

/** 지면 서체·잉크색 변수. `.problemText` 가 이 변수를 읽는다 —
    정답·해설은 `.paperParity` 틀 밖이라 여기서 직접 얹어야 발문과 서체가 같아진다. */
const paperVariables = PAPER_CSS_VARIABLES as CSSProperties;

/** 마이크로 라벨 — 검수 카드(`ReviewProblemCard`)와 같은 규격을 쓴다. */
const MICRO = "text-[10px] font-extrabold tracking-[1.2px]";

/** 카드 바닥 액션 — 「정답 및 해설」과 「변형」이 같은 규격을 쓴다(둘 다 카드를 펼친다). */
const CARD_ACTION_CLASS =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 border border-control bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-side";

/**
 * 검수 상태에 기능색을 쓴다 (원장님 확정 2026-08-18 "검수 상태에도 색을 써서 더 명확하게").
 * G2 네 의미에 그대로 대응한다 — 승인=끝난 단계, 대기=입력 대기, 반려=경고.
 * 면색이 아니라 **글자색**이라 색 쓰는 자리가 늘지 않는다.
 */
const REVIEW_STATUS_TONE: Record<string, string> = {
  approved: "text-g-green",
  pending: "text-g-yellow-text",
  rejected: "text-g-red-text",
};

type ProblemCardProps = {
  problem: ProblemEntity;
  /**
   * 변형 채택분이 저장되면 알린다. **넘기지 않으면 「변형」 버튼이 아예 없다** —
   * 문제은행(S-08)에서만 변형하고, dev 미리보기 같은 자리에서는 나오지 않는다.
   *
   * ⚠️ 카드는 `memo` 다. 호출부에서 인라인 화살표로 넘기면 20장이 매번 다시 그려진다
   * (`TestReview` 와 같은 이유) — `useCallback` 으로 고정해서 넘길 것.
   */
  onTransformAdopted?: (created: ProblemEntity[]) => void;
  /**
   * 검수 승격/반려. **넘기지 않으면 그 버튼이 아예 없다** — 문제은행(S-08)에서만 검수한다.
   *
   * D-22: 승격은 사람이 누른다. 2026-08-19 까지 화면에 이 수단이 **아예 없어서**,
   * `pending` 으로 들어온 문항(실측 271건 — 기출 144 · 변형 107 · AI 20)은 출제 풀에
   * 영영 못 들어갔다. API(`PATCH /api/problems/{id}/review-status`)는 처음부터 있었다.
   *
   * ⚠️ `ProblemCard` 는 `memo` 다 — `useCallback` 으로 고정해서 넘길 것.
   */
  onReviewStatusChange?: (id: string, next: ReviewStatus) => Promise<void>;
};

/**
 * 문제 카드 — mathgen `ProblemDisplay` 레이아웃 이식.
 * Q 배지 + 문제 카드 + 보기 그리드 + 정답·해설 토글.
 *
 * D-30: 카드 자체는 클릭 대상이 아니다. 펼침은 실제 <button> 컨트롤만 담당한다.
 *
 * `memo` 인 이유: 문제은행은 한 페이지에 20카드이고 카드마다 본문·보기의 KaTeX
 * 조판이 붙는다. 그런데 패널 열기/닫기·안내 문구·오류 문구·단원 목록 도착처럼
 * **카드와 무관한 상태** 하나만 바뀌어도 20카드가 전부 다시 렌더됐다.
 * `problem` 은 API 응답 객체 그대로라 이런 렌더에서 참조가 바뀌지 않는다.
 */
export const ProblemCard = memo(function ProblemCard({
  problem,
  onTransformAdopted,
  onReviewStatusChange,
}: ProblemCardProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [showTransform, setShowTransform] = useState(false);
  // 승격은 왕복이 있다. 누른 뒤 응답이 오기 전에 또 누르면 같은 요청이 두 번 나간다.
  const [reviewBusy, setReviewBusy] = useState(false);

  const changeReview = async (next: ReviewStatus) => {
    if (!onReviewStatusChange || reviewBusy) return;
    setReviewBusy(true);
    try {
      await onReviewStatusChange(problem.id, next);
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    // 카드 사이 간격은 목록 그리드의 gap 이 준다(`ProblemBank`). 화면에서 `mb-6` 을
    // 같이 걸면 세로 간격만 두 배가 된다. 인쇄는 그리드를 쓰지 않으므로 `print:mb-4` 유지.
    // 배경이 원색 화이트로 바뀌어(2026-08-18) 흰 카드가 바탕에 묻힌다. 카드 경계는
    // 이제 그림자가 아니라 **테두리**가 만든다 — 원장님 지시 "문제마다 테두리 주면 구분될듯".
    // 색은 앱의 다른 경계선과 같은 토큰(--divider)을 쓴다. slate-200(#e2e8f0)은
    // 흰 바탕에서 거의 안 보였다.
    // 폭은 **목록 그리드의 트랙**이 박는다 (`PROBLEM_GRID_STYLE` =
    // `repeat(auto-fill, min(100%, PROBLEM_CARD_WIDTH))`, 원장님 지시 2026-08-19
    // "문제를 보여주는 공간은 문제크기와 함께 고정해 박아버려"). 본문(`.paperParity`)이
    // 지면 폭으로 고정이라 카드가 늘어나면 그만큼 오른쪽이 빈다.
    //
    // ⚠️ 여기에 인라인 `style={{ width }}` 로 박지 않는다 — **인라인은 `print:w-auto` 를
    //    이겨서**(Tailwind 유틸리티는 `!important` 가 아니다) 이 화면을 그대로 인쇄할 때
    //    카드가 고정폭으로 나간다. 폭을 두 곳에서 정하지도 않는다.
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-divider bg-surface print:mb-4 print:block print:h-auto print:rounded-none print:border-none print:shadow-none">
      {/* 머리 띠는 면색이 아니라 1px 룰로 가른다 — 흰 바탕에서 옅은 회색 띠는
          구조가 아니라 얼룩으로 읽힌다. Q 배지는 잉크라 화면과 인쇄가 같아진다. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-divider px-6 py-4 print:px-0">
        <span className="flex h-8 w-8 items-center justify-center bg-ink text-lg font-bold text-bg print:bg-black">
          Q
        </span>
        {/* 「문제」라는 말 대신 **문항 코드**를 놓는다 (원장님 지시 2026-08-19
            "문항 코드가 안보이는것도 맞고"). Q 배지가 이미 「문제」라고 말하고 있고,
            이 자리가 필요한 것은 **지목할 이름**이다(D-53). 검색칸에 그대로 붙여
            넣으면 이 한 건이 나온다. 숫자 폭을 고정해 코드끼리 세로로 맞춘다. */}
        <span className="font-semibold tabular-nums text-text-2">
          {problem.problemCode}
        </span>
        {/* 출처 라벨 — 원장님 지시 2026-08-25 「이게 어떤걸로 인해 생성되었고 가져왔고
            이런걸 다 분류해야겠어」. **코드 바로 오른쪽**에 두는 것은 D-53 이 이미 적어 둔
            요구다 — 「화면은 코드 옆에 현재 단원·**출처**를 항상 같이 보여야 한다」.
            검수 상태(색 있는 글자)는 `ml-auto` 오른쪽 무리라 자리가 갈린다.

            판정·라벨·색은 `src/lib/problem/provenance.ts` 하나가 정한다. 여기서 조건을
            다시 쓰지 마라 — 두 벌이 되는 순간 한쪽만 고쳐도 아무도 모른다.

            `abbr` 인 이유: `[초]` 는 줄임말이고 풀어 쓴 말이 `title` 에 있어야 색이 안
            보이는 사람도 읽는다(05 §5 — 색만으로 뜻을 전달하지 않는다). 밑줄은 10px
            굵은 글씨에서 얼룩이라 끈다. **누르는 것이 아니다** — 손가락 커서·hover 배경
            금지(D-30).

            `print:hidden` 인 이유: 지면을 바꾸면 실물 인쇄 검수까지가 완료 조건이다
            (절대 규칙 6). 이 라벨은 화면에서 분류를 보려는 것이라 지면은 그대로 둔다.
            종이에도 필요하다고 정해지면 `/dev/print-check` 에 항목을 세우고 넣는다. */}
        {provenanceBadges(problem).map((badge) => (
          <abbr
            key={badge.kind}
            data-provenance={badge.kind}
            title={badge.name}
            className={`${MICRO} no-underline ${badge.className} print:hidden`}
          >
            {badge.text}
          </abbr>
        ))}
        {/* 난이도·유형·상태는 **마이크로 라벨**이다 (05 §8.6 확정, 원장님 재확인 2026-08-18).
            알약 칩은 면색을 세 개 더 만들어 팔레트를 흐린다. 위계는 글자 명도로 낸다.
            ⚠️ 위 출처 라벨이 «색을 쓰면서도» 이 결정을 안 어기는 근거는 provenance.ts
               「색을 어떻게 정했나」에 있다 — 한 줄로 줄이면 **면색이 아니라 글자색**이다. */}
        <span className={`ml-auto flex flex-wrap items-center gap-3 ${MICRO}`}>
          <span className="text-ink">{problem.difficulty}</span>
          <span className="text-text-2">{problem.problemType}</span>
          <span
            data-review-status={problem.reviewStatus}
            className={REVIEW_STATUS_TONE[problem.reviewStatus]}
          >
            {REVIEW_STATUS_LABEL[problem.reviewStatus]}
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-x-auto p-6 print:block print:px-0">
        <PaperProblemView
          content={problem.content}
          figureUrls={problem.figureUrls}
          figureSvg={problem.figureSvg}
        />

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-6 print:hidden">
          {/* 검수 — 왼쪽(판단), 보기·변형 — 오른쪽(작업). 지금 상태가 될 버튼은 안 낸다
              (승인된 것에 「승인」을 다시 누를 일이 없다). */}
          {onReviewStatusChange && problem.reviewStatus !== "approved" ? (
            <button
              type="button"
              disabled={reviewBusy}
              onClick={() => void changeReview("approved")}
              className={CARD_ACTION_CLASS}
            >
              승인
            </button>
          ) : null}
          {onReviewStatusChange && problem.reviewStatus !== "rejected" ? (
            <button
              type="button"
              disabled={reviewBusy}
              onClick={() => void changeReview("rejected")}
              className={CARD_ACTION_CLASS}
            >
              반려
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={showSolution}
            onClick={() => setShowSolution((current) => !current)}
            className={`ml-auto ${CARD_ACTION_CLASS}`}
          >
            {showSolution ? "정답 및 해설 숨기기" : "정답 및 해설 확인"}
          </button>
          {/* 변형은 **여기서** 고른다 (원장님 확정 2026-08-19). 위쪽 드롭다운으로 고르던
              종전 방식은 네이티브 select 가 수식을 못 그려 무엇을 고르는지 알 수 없었다. */}
          {onTransformAdopted ? (
            <button
              type="button"
              aria-expanded={showTransform}
              onClick={() => setShowTransform((current) => !current)}
              className={CARD_ACTION_CLASS}
            >
              {showTransform ? "변형 닫기" : "변형"}
            </button>
          ) : null}
        </div>

        {showTransform && onTransformAdopted ? (
          <ProblemTransformPanel
            origin={problem}
            onAdopted={(created) => {
              setShowTransform(false);
              onTransformAdopted(created);
            }}
            onClose={() => setShowTransform(false)}
          />
        ) : null}

        {showSolution ? (
          <div
            className="mt-4 space-y-4"
            /* 지면 변수(`--paper-ink`·`--paper-font-serif`)를 여기서 얹는다 —
               `.problemText` 가 그 변수를 읽는데, 정답·해설은 `.paperParity` 틀
               밖이라 조상 중 누구도 안 주고 있었다. */
            style={paperVariables}
          >
            {/* 「정답」은 G2 네 의미가 아니다 — 초록을 쓰면 게이지의 「끝난 단계」와 뜻이 충돌한다.
                지면의 핵심 개념 박스처럼 **왼쪽 굵은 바**로 표시한다. */}
            <div className="border-l-[3px] border-ink bg-side p-6">
              <h4 className={`mb-2 ${MICRO}`}>정답</h4>
              {/* 🔴 **문제·정답·해설이 한 크기다** (원장님 지시 2026-08-25:
                  「문제은행에서 문제/정답/해설의 폰트가 전부 똑같이 일치하게」).
                  종전에는 정답 `text-lg` · 해설 `text-base` · 발문은 지면 12.5px 이라
                  셋이 다 달랐다. 이제 셋 다 **발문과 같은 클래스**(`paper.problemText`)를
                  쓴다 — 지면 크기를 고치면 셋이 **같이** 따라간다. 크기를 각자 적으면
                  한쪽만 고쳐도 아무도 모른다. */}
              <MathText
                as="div"
                className={`${paper.problemText} font-medium`}
                text={problem.answer}
              />
            </div>
            {problem.solution ? (
              <div className="border border-divider p-6">
                <h4 className={`mb-2 ${MICRO}`}>상세 풀이</h4>
                <MathText
                  as="div"
                  className={paper.problemText}
                  text={problem.solution}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
});
