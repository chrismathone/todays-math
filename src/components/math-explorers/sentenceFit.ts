"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * 문장 조립 — 넘칠 때만 글씨 줄이기(원장님 2026-09-29, D-143 · 05 §8.19).
 *
 * 좁은 폰(320×568 등)에서 조립 문장 끝(빈칸 ① ② 포함)이 문제 칸 아래 끝 밖으로 내려가 학생이 칸을 내려야 끝이 보였다.
 * 문장이 칸 안에 다 안 들어갈 때만 **그 문장** 글씨를 한두 단계 줄인다 — 들어가는 문장은 지금 크기 그대로,
 * 바닥에서도 넘치면 지금처럼 칸 스크롤. 자르기(«…») · 마우스 올리기 펼침은 하지 않는다(빈칸이 가려지고 폰엔 hover 가 없다).
 *
 * 배율은 CSS 기준 크기(넓은 폭 22px · 좁은 폭 19px)에 곱한다(`--sentence-fit`) — 1 → 0.9 → 0.8 → 0.7, 단 **글자 15px 밑으로는
 * 안 간다**: 넓은 폭은 22 → 19.8 → 17.6 → 15.4px, 좁은 폭은 19 → 17.1 → 15.2px 에서 멈춘다(0.7 은 13.3px — 보기 글 14px 밑).
 * 1차 3자 합의는 바닥 0.8(3:0)이었고, 실측(230장 × 네 폭)에서 360 · 390 에 남은 넘침이 전부 «글은 보이고 빈칸 단추 아래
 * 테두리만 3~7px» 라 0.7 이면 다 들어가 2차에서 «글자 바닥 15px»로 정했다(2026-09-29).
 */
export const SENTENCE_FIT_STEPS = [1, 0.9, 0.8, 0.7] as const;
/** 줄여서 내려가는 글자 크기의 바닥(px). */
export const SENTENCE_MIN_PX = 15;
/** 기준 글자 크기를 모를 때의 바닥 — 1차 합의 0.8. */
const UNKNOWN_BASE_FLOOR = 0.8;

/** 그 기준 글자 크기(px)에서 쓸 수 있는 단계 — 1배는 늘 든다. */
export function sentenceSteps(basePx: number): number[] {
  return SENTENCE_FIT_STEPS.filter((step) =>
    step === 1
      ? true
      : Number.isFinite(basePx)
        ? basePx * step >= SENTENCE_MIN_PX - 0.01
        : step >= UNKNOWN_BASE_FLOOR,
  );
}

/**
 * 들어가는 가장 큰 단계. `bottomAt(step)` 은 그 단계로 그렸을 때 문장 끝(칸 스크롤을 맨 위로 둔 자리),
 * `limit` 는 칸의 보이는 아래 끝. 0.5px 는 반올림 여유. `from` 보다 큰 단계는 대 보지 않는다. 다 넘치면 바닥(`steps` 끝).
 */
export function pickSentenceStep(
  bottomAt: (step: number) => number,
  limit: number,
  from = 1,
  steps: readonly number[] = SENTENCE_FIT_STEPS,
): number {
  const tries = steps.filter((step) => step <= from);
  for (const step of tries) if (bottomAt(step) <= limit + 0.5) return step;
  // `from` 이 이 폭의 바닥보다 작으면(좁은 폭으로 바뀐 직후) 이 폭의 바닥으로 — 15px 밑에 머물지 않는다.
  return tries.at(-1) ?? steps.at(-1) ?? 1;
}

/** 문장 끝 — 그려진 상자(글줄 · 빈칸 단추) 가운데 가장 아래. 빈 상자(조각 사이 접힌 공백)는 뺀다. */
export function sentenceEnd(
  boxes: Iterable<Pick<DOMRect, "width" | "height" | "bottom">>,
): number {
  let end = Number.NEGATIVE_INFINITY;
  for (const box of boxes)
    if (box.width > 0 && box.height > 0) end = Math.max(end, box.bottom);
  return end;
}

/**
 * 조립 문장 맞춤 — 지금 그릴 배율을 돌려준다(1 이면 그대로). 부르는 쪽이 문장에 `--sentence-fit` 로 싣는다.
 *
 * - 재는 것: 문장 글줄(Range 의 글자 상자)과 빈칸 단추 상자의 가장 아래가 문제 칸의 보이는 아래 끝 안인가.
 *   빈칸 단추(최소 높이 42px · 가운데 맞춤)는 글보다 아래로 내려오므로 따로 센다 — 글만 보면 단추 아래 테두리를 놓친다.
 *   KaTeX 는 글자(text 노드) 상자만 들어간다 — 받침 상자 · 근호 SVG 는 잉크가 아니다(2026-09-27 교훈).
 * - 깜빡임 없이: 그리기 전(`useLayoutEffect`)에 단계를 차례로 대 보고 되돌린 뒤 한 번에 정한다.
 * - 책장 넘김: 문제 칸은 활동마다 처음 520ms 동안 `rotateY` 로 기울어 있어 상자가 비틀린다. 재는 동안만 칸의
 *   `transform` 을 `none !important` 로 누르고 같은 작업 안에서 되돌린다 — 화면에 안 나오고 애니메이션 시계는 그대로.
 * - 다시 재는 때: 채운 말이 바뀔 때(`contentKey` — 그리기 전), 문제 칸 크기(화면 돌림 · 창 크기)나 칸 안 것(문장 · 이름 줄
 *   — 수식 청크가 늦게 붙음)의 크기가 바뀔 때(ResizeObserver), 글꼴이 다 왔을 때(`loadingdone`) — 뒤의 둘은 다음 프레임.
 * - 한 활동 안에서는 **줄이기만** — 빈칸을 채웠다 비울 때마다 글씨가 오르내리지 않게(3자 2:1). 칸 크기가 바뀌거나 글꼴이
 *   오면 1배부터 다시 고른다. 활동이 바뀌면 부르는 쪽이 새로 그린다(`Activity` 의 key).
 * - 칸 높이가 0(아직 안 그려짐 · 숨김)이면 정하지 않는다.
 */
export function useSentenceFit(
  pane: RefObject<HTMLElement | null>,
  sentence: RefObject<HTMLElement | null>,
  contentKey: string,
): number {
  const [scale, setScale] = useState(1);
  // 지금 그린 배율 — 한 활동 안에서 «줄이기만» 할 때 여기서부터 대 본다.
  const drawnScale = useRef(1);

  useLayoutEffect(() => {
    const next = measureSentenceStep(
      pane.current,
      sentence.current,
      drawnScale.current,
    );
    if (next === null) return;
    drawnScale.current = next;
    setScale(next);
  }, [pane, sentence, contentKey]);

  useLayoutEffect(() => {
    const box = pane.current;
    const words = sentence.current;
    if (!box || !words) return;
    let frame = 0;
    let from = 0;
    let live = true;
    // 한 프레임에 여러 번 불려도 한 번만 잰다 — 그중 가장 넓게 다시 고르는 쪽(1배부터)을 따른다.
    const later = (start: number) => {
      from = Math.max(from, start);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = live ? measureSentenceStep(box, words, from) : null;
        from = 0;
        if (next === null) return;
        drawnScale.current = next;
        setScale(next);
      });
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver((entries) =>
            later(
              entries.some((entry) => entry.target === box)
                ? 1
                : drawnScale.current,
            ),
          );
    // 칸은 테두리 상자로 본다 — 스크롤 막대가 생기고 사라지는 것(내용 상자만 바뀜)에는 다시 재지 않는다.
    // 칸 안 것(이름 줄 · 문장)은 내용이 커지는지만 본다 — 이름 줄이 커져도 문장이 밀려 내려간다.
    observer?.observe(box, { box: "border-box" });
    for (const child of box.children) observer?.observe(child);
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    const refit = () => later(1);
    fonts?.addEventListener?.("loadingdone", refit);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", refit);
    };
  }, [pane, sentence]);

  return scale;
}

/**
 * 그 칸에서 들어가는 가장 큰 단계(`from` 이하)를 잰다 — 문장에 단계를 차례로 실어 보고 되돌린다.
 * 칸이나 문장이 없거나 칸 높이가 0 이면 `null`(정하지 않음).
 */
function measureSentenceStep(
  box: HTMLElement | null,
  words: HTMLElement | null,
  from: number,
): number | null {
  if (!box || !words || !words.isConnected || box.clientHeight <= 0)
    return null;
  const tilt = box.style.getPropertyValue("transform");
  const tiltPriority = box.style.getPropertyPriority("transform");
  const drawn = words.style.getPropertyValue("--sentence-fit");
  box.style.setProperty("transform", "none", "important");
  try {
    const outer = box.getBoundingClientRect();
    const limit = outer.top + box.clientTop + box.clientHeight;
    // 이 폭의 기준 글자 크기(22px · 좁은 폭 19px) — 1배로 두고 읽는다. 15px 밑으로 가는 단계는 안 쓴다.
    words.style.setProperty("--sentence-fit", "1");
    const basePx = parseFloat(getComputedStyle(words).fontSize);
    return pickSentenceStep(
      (step) => {
        words.style.setProperty("--sentence-fit", String(step));
        const range = document.createRange();
        range.selectNodeContents(words);
        const boxes = [
          ...(range.getClientRects?.() ?? []),
          ...[...words.querySelectorAll("button")].map((slot) =>
            slot.getBoundingClientRect(),
          ),
        ];
        return sentenceEnd(boxes) + box.scrollTop;
      },
      limit,
      from,
      sentenceSteps(basePx),
    );
  } finally {
    if (drawn) words.style.setProperty("--sentence-fit", drawn);
    else words.style.removeProperty("--sentence-fit");
    if (tilt) box.style.setProperty("transform", tilt, tiltPriority);
    else box.style.removeProperty("transform");
  }
}
