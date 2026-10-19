"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { FadingMath } from "./FadingMath";
import s from "./fading.module.css";

/** 한글 설명은 두 줄에 맞추되 수식 중간을 자르지 않고 마지막 용어부터 접는다. */
export function FadingTerms({
  terms,
  student = false,
}: {
  terms: readonly string[];
  student?: boolean;
}) {
  // Terms are authored concept content; the student mode preserves them verbatim.
  void student;
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(terms.length);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const spans = [
          ...node.querySelectorAll<HTMLElement>(":scope > [data-term]"),
        ];
        for (const span of spans) span.style.display = "";
        const line = parseFloat(getComputedStyle(node).lineHeight);
        let n = spans.length;
        while (n > 1 && node.getBoundingClientRect().height > line * 2 + 1)
          spans[--n]!.style.display = "none";
        setCount((previous) => (previous === n ? previous : n));
      });
    };
    run();
    const resize =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(run);
    resize?.observe(node);
    const mutation = new MutationObserver(run);
    mutation.observe(node, { childList: true, subtree: true });
    document.fonts?.addEventListener("loadingdone", run);
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      mutation.disconnect();
      document.fonts?.removeEventListener("loadingdone", run);
    };
  }, [terms]);
  return (
    <div className={s.queueDescription} ref={root}>
      {terms.map((term, i) => (
        <span
          data-term="true"
          key={i}
          style={i >= count ? { display: "none" } : undefined}
        >
          {i > 0 ? " · " : ""}
          <FadingMath text={term} />
        </span>
      ))}
      {count < terms.length && <span>…</span>}
    </div>
  );
}
