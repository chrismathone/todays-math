"use client";
import { useLayoutEffect, useRef } from "react";
import { ExplorerMath } from "@/components/math-explorers/ExplorerMath";
import { plainMathToTex } from "@/lib/math-explorers/plainMath";

/** 제품 KaTeX 길을 쓰고, 학생 앱의 실제 작은 수식 글자도 12px 바닥을 지킨다. */
export function FadingMath({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const expectsMath = plainMathToTex(text).includes("$");
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const fit = () => {
      // MathText is a lazy chunk. Layout QA must wait for its actual glyphs,
      // including when paging to a formula after several plain-text cards.
      node.dataset.fadingMathReady =
        !expectsMath || node.querySelector(".katex") ? "true" : "false";
      for (const leaf of node.querySelectorAll<HTMLElement>(
        ".katex-html span",
      )) {
        if (
          [...leaf.childNodes].some(
            (child) =>
              child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
          ) &&
          parseFloat(getComputedStyle(leaf).fontSize) < 12
        )
          leaf.style.setProperty("font-size", "12px", "important");
      }
    };
    fit();
    const observer = new MutationObserver(fit);
    observer.observe(node, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [text, expectsMath]);
  return (
    <span ref={root} data-fading-math-ready={expectsMath ? "false" : "true"}>
      <ExplorerMath text={text} />
    </span>
  );
}
