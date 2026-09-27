"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import { plainMathToTex } from "@/lib/math-explorers/plainMath";

/**
 * 복습 화면(`StudentMathSrs`)과 같은 지연 청크 — KaTeX·마크다운 묶음을 탐험 첫 화면 번들에 싣지 않는다.
 * 렌더러는 새로 만들지 않고 제품 `MathText` 를 그대로 쓴다.
 */
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((mod) => mod.MathText),
);

/**
 * 통합 탐험 카드 글 한 조각 — 일반 글자 수식을 제품 수식 표기로 바꿔(`plainMathToTex`) `MathText` 로 그린다.
 * 원장님(2026-09-27) «카텍스 적용시키고». 카드 글이 보이는 자리는 전부 이것을 지난다(«모든 화면 일치»,
 * 배선 시험 `ExplorerMathKatex.test.tsx` ③).
 *
 *  - 수식이 없는 조각(«맞다», 한글 조각)은 KaTeX 를 부르지 않고 글 그대로 둔다.
 *  - 조각 앞뒤 공백은 `MathText` 밖에 둔다 — 마크다운이 문단 끝 공백을 지워, 정의 조립의
 *    «말 조각 + 빈칸 단추» 사이 띄어쓰기가 사라진다.
 *  - 읽기용 이름표(`aria-label`)는 부르는 쪽이 원문 그대로 쓴다 — 스크린리더가 `x²`·`√9` 를 읽는다.
 */
export function ExplorerMath({ text }: { text: string }) {
  const tex = plainMathToTex(text);
  if (!tex.includes("$")) return <>{text}</>;
  const lead = /^\s*/.exec(tex)![0];
  const trail = tex.slice(lead.length).match(/\s*$/)![0];
  return (
    <>
      {lead}
      <MathText text={tex.slice(lead.length, tex.length - trail.length)} />
      {trail}
    </>
  );
}

/** 줄여 보는 차례. 0.7배(320 폭 · 근의 공식 보기가 한 줄에 드는 크기) 밑으로는 줄이지 않는다. */
const FIT_STEPS = [1, 0.9, 0.8, 0.7] as const;

/**
 * 보기 단추 안 글 — 칸에 안 들어가면 글자를 한 단계씩 줄여 넣는다. 들어가면 그대로(폰 실측 17단원에서 줄어드는 것은
 * 근의 공식 보기 둘뿐 — 320 폭 0.9배 · 390×600 0.8배).
 *
 * 트랙 K 폰 실측(2026-09-27, 17단원 × 활동 전부): 320×568 의 보기 칸(131×62)에서 근의 공식
 * `x = (−b ± √(b²−4ac))/(2a)` 가 두 줄로 감겨 분모 «2a» 가 잘렸다(일반 글자일 때도 세 줄로 잘리던 자리).
 * 잘린 까닭은 글자 칸의 숨은 스크롤(높이 = 단추 내용 높이)이었고 그것은 CSS 에서 뺐다 — 이제 단추가 **테두리 안쪽**
 * (내용 + 안쪽 여백)에서 자른다. 이 함수는 그 경계 안에 넣고, 가로로는 글자 칸 밖(단추 안쪽 여백)을 먹지 않게 한다
 * (근의 공식이 8px 여백을 먹어 테두리에 닿았다). 높이를 글자 칸으로 재지 않는 까닭 — KaTeX 상자의 몇 px 여유(받침 상자)는
 * 잉크가 아니라서, 그것으로 재면 멀쩡한 분수까지 작아진다.
 * 재는 법은 `BoxQuoteCard` 와 같다 — 그린 뒤 재고, 크기가 바뀌거나(수식 청크·글꼴이 늦게 옴) 폭이 바뀌면 다시 잰다.
 * `data-choice-text` 는 폰 실측(`scripts/qa/mobile-explorers-qa.mjs` 의 `katex`)이 이 글을 찾는 표지.
 */
export function ExplorerChoiceText({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState<number>(1);
  useLayoutEffect(() => {
    const label = box.current;
    const button = label?.parentElement;
    if (!label || !button) return;
    let frame = 0;
    let live = true;
    // 가로는 수식 상자가 글자 칸 밖으로 나가는지로 본다. `scrollWidth` 로 재지 않는다 — KaTeX 근호는 400em 짜리 SVG 를
    // 숨겨 두는 구조라 «√9» 같은 짧은 보기도 늘 넘쳐 보여, 폰 실측에서 근호 보기 여섯이 0.7배로 줄었다(2026-09-27).
    const fits = () => {
      if (label.offsetHeight > button.clientHeight) return false;
      const inner = label.getBoundingClientRect();
      return [...label.querySelectorAll(".katex")].every((math) => {
        const drawn = math.getBoundingClientRect();
        return drawn.left >= inner.left - 1 && drawn.right <= inner.right + 1;
      });
    };
    const run = () => {
      if (!live || !label.isConnected) return;
      // 한 번에 재고 되돌린다 — 크기가 결국 같으면 ResizeObserver 가 다시 부르지 않는다(맞춤이 맴돌지 않는다).
      const drawn = label.style.fontSize;
      let next: number = FIT_STEPS[FIT_STEPS.length - 1];
      for (const step of FIT_STEPS) {
        label.style.fontSize = step === 1 ? "" : `${step}em`;
        if (fits()) {
          next = step;
          break;
        }
      }
      label.style.fontSize = drawn;
      setScale((current) => (current === next ? current : next));
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };
    run();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(later);
    observer?.observe(label);
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    fonts?.addEventListener?.("loadingdone", later);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", later);
    };
  }, [text]);
  return (
    <span
      ref={box}
      className={className}
      style={scale < 1 ? { fontSize: `${scale}em` } : undefined}
      data-choice-text="true"
      data-fit={scale < 1 ? String(scale) : undefined}
    >
      <ExplorerMath text={text} />
    </span>
  );
}
