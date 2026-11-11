"use client";

import { useEffect, useState } from "react";

/**
 * 「AI 생성」 진행 표시 — 원장님 지시 2026-08-26 ②.
 *
 * ## 왜 퍼센트가 없나
 *
 * 생성은 AI(Claude Sonnet 5.5 · 심화상은 Opus 5.5 — 2026-11-11 전에는 DeepSeek) **한 번** 호출이고 중간 보고가 없다. 몇 %인지 **알 방법이 없다.**
 * 모르는 값을 그리면 그건 진행 표시가 아니라 거짓말이고, 원장님은 「70%면 곧 되겠구나」
 * 로 읽는다. 그래서 ARIA 가 정한 대로 **불확정**으로 둔다 — `role="progressbar"` 에
 * `aria-valuenow` 를 **안 붙이는 것**이 곧 「진행률을 모른다」는 말이다.
 *
 * 대신 **실제로 아는 것**을 적는다: 경과 시간과, 실측한 보통 소요.
 *
 *   실측 2026-08-26 (`scripts/qa/probe-ai-generate-live.ts`, 중1 소인수분해 — DeepSeek 때 값. Claude 로는 다시 안 쟀다):
 *     · 3문항 → **40.0초**
 *     · 10문항 → **127.8초**
 *   화면 기본 개수는 「필요 − 가용」(상한 10)이라 대개 뒤쪽에 가깝다.
 *
 * ## 왜 «흐르는 막대»가 아니라 맥박인가
 *
 * 좌우로 흐르는 조각을 그리려면 `@keyframes` 를 새로 정의해야 하고 그 자리는
 * `src/app/globals.css` 다. 이 워크트리는 그 파일을 **다른 트랙이 쓰고 있어** 손대지
 * 않는다. Tailwind 가 기본으로 주는 `animate-pulse` 는 새 CSS 없이 「돌고 있다」를
 * 말하면서 **폭으로 진행률을 암시하지 않는다**(막대는 늘 꽉 차 있다). 흐르는 막대가
 * 필요하면 병합 뒤 globals.css 에 키프레임 하나를 더하면 된다 — 이 파일의 구조는
 * 그대로 둔 채 안쪽 `div` 의 클래스만 바뀐다.
 *
 * 새 색·새 치수를 만들지 않는다: 바탕은 `bg-side`, 막대는 `bg-g-blue`(§2.2 G2 —
 * 블루 = 「할 일·진행」, 계기판의 파이프라인 단계와 같은 뜻).
 */

/** 경과 시간을 사람 말로. 순수 함수라 시험이 시계 없이 잰다. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}초 경과`;
  if (seconds === 0) return `${minutes}분 경과`;
  return `${minutes}분 ${seconds}초 경과`;
}

/**
 * 이 컴포넌트는 **돌고 있는 동안만 마운트된다.** 시계를 여기서 돌리는 이유가 그것이다 —
 * 훅(`useGenerateSetup`)에 두면 1초마다 폼 전체가 다시 그려진다.
 */
export function AiGenerateProgress() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - started), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-3 border-t border-divider pt-3">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        {/*
          `role="status"` 는 이 **한 조각**에만 건다. 경과 시간까지 같이 감싸면
          보조기기가 1초마다 숫자를 읽는다 — 알림이 아니라 소음이 된다.
        */}
        <span role="status" className="font-bold text-ink">
          AI 문제 생성 중
        </span>
        <span className="tabular-nums text-text-2">
          {formatElapsed(elapsedMs)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="AI 문제 생성 진행"
        className="mt-2 h-1.5 w-full bg-side"
      >
        <div className="h-full w-full animate-pulse bg-g-blue motion-reduce:animate-none" />
      </div>
      <p className="mt-2 text-[12.5px] text-text-2">
        보통 1~2분 걸립니다. 이 화면을 닫지 마세요.
      </p>
    </div>
  );
}
