import { useEffect, useState } from "react";
import { figureLabelSummary } from "./FigureLabelInput";
import type { TypesetLabel } from "./mathjaxLabel";

/**
 * 요소 목록 칩의 글 — 수식 글자(`$\vec{a}$`·`\frac{1}{2}`)는 **조판한 모양**으로 보인다(math-figure-editor 2026-10-21,
 * «요소 목록이 카텍스 처리가 덜 됐다»). 상류(todays-math)는 TeX 원문을 그대로 적는다.
 *
 * 캔버스와 같은 조판기(`mathjaxLabel.typesetLabel`)를 쓰고, MathJax 는 처음 쓸 때만 불러온다(캔버스 조판과 같은 방식).
 * 조판을 못 하면(한글 섞임 등) 원문 글자 그대로다.
 */
export function FigureChipText({ text, raw }: { text: string; raw?: string }) {
  const summary = raw ? figureLabelSummary(raw) : "";
  const math = !!raw && /[\\^_]/.test(summary) && text.endsWith(summary);
  const [layout, setLayout] = useState<{ raw: string; label: TypesetLabel } | null>(null);
  useEffect(() => {
    if (!math || !raw) return;
    let alive = true;
    void import("./mathjaxLabel").then((m) => {
      const result = m.typesetLabel(raw);
      if (alive && result && m.isSafeFragment(result.inner)) setLayout({ raw, label: result });
    }).catch(() => undefined); // Keep the original chip text if lazy typesetting fails.
    return () => {
      alive = false;
    };
  }, [math, raw]);
  const laid = layout && layout.raw === raw ? layout.label : null;
  if (!math || !laid) return <>{text}</>;
  const height = laid.ascentEm + laid.descentEm;
  return (
    <>
      {text.slice(0, text.length - summary.length)}
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 ${-laid.ascentEm * 1000} ${laid.widthEm * 1000} ${height * 1000}`}
        style={{
          display: "inline-block",
          width: `${laid.widthEm * 1.15}em`,
          height: `${height * 1.15}em`,
          verticalAlign: `${-laid.descentEm * 1.15}em`,
          overflow: "visible",
        }}
        dangerouslySetInnerHTML={{ __html: laid.inner }}
      />
    </>
  );
}
