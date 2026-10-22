"use client";

/**
 * 내용만큼 늘어나는 글 칸 — 지문 · 발문이 칸 안에서 굴러가지 않게(원장님 2026-10-01 «지문은 항상 스크롤 없이 한 화면에서»).
 * 글이 바뀔 때와 칸 폭이 바뀔 때(줄이 다시 접힌다) 높이를 `scrollHeight` 에 맞춘다. 손으로 늘이는 손잡이는 없다(CSS `resize: none`).
 * 칸의 테두리 두께는 `offsetHeight - clientHeight` 로 더한다(`box-sizing: border-box` 에서 높이가 테두리를 품는다).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function AutoGrowTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = `${element.scrollHeight + border}px`;
  }, []);

  useIsomorphicLayoutEffect(fit, [props.value, fit]);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let width = element.clientWidth;
    let frame = 0;
    let live = true;
    const observer = new ResizeObserver(() => {
      if (!live || element.clientWidth === width) return;
      width = element.clientWidth;
      // A height write in the observer's delivery cycle can resize this same
      // target again. Keep value fitting immediate; defer width-only fitting.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (live) fit();
      });
    });
    observer.observe(element);
    return () => {
      live = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [fit]);

  return <textarea rows={1} {...props} ref={ref} data-autogrow="" />;
}
