"use client";

import dynamic from "next/dynamic";
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
