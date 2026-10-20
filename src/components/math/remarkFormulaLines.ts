import type { Paragraph, Root, RootContent } from "mdast";

import {
  formulaLinePlan,
  isFormulaOnlyParagraph,
  type ParagraphKind,
} from "@/lib/math/formulaLine";

/**
 * 발문의 «글 뒤 식만 있는 문단»에 표지(`data-formula-line`)를 단다 — 규칙은 `formulaLine.ts`(높이 자와 한 벌).
 * 루트 바로 아래 문단만 본다. 상자(blockquote) · 표 · 목록 · 여러 줄 수식 블록은 그대로다.
 */
function serialize(node: Paragraph, source: string): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "inlineMath") {
      // 원래 구분자(`$` · `$$`)를 그대로 — 자는 원문을 본다(Codex 검토: 다시 쓰면 `$$x$$` 에서 둘이 갈린다).
      const start = child.position?.start.offset;
      const end = child.position?.end.offset;
      out +=
        start !== undefined && end !== undefined
          ? source.slice(start, end)
          : `$${child.value}$`;
    } else if (child.type === "text") out += child.value;
    // 굵게 · 링크 · 줄바꿈 같은 것이 섞이면 식만 있는 문단이 아니다.
    else return "\u0001";
  }
  return out;
}

export function remarkFormulaLines() {
  return (tree: Root, file: { value?: unknown }) => {
    const source = typeof file.value === "string" ? file.value : String(file.value ?? "");
    const kindOf = (node: RootContent): ParagraphKind =>
      node.type !== "paragraph"
        ? "other"
        : isFormulaOnlyParagraph(serialize(node, source))
          ? "formula"
          : "text";
    const plan = formulaLinePlan(tree.children.map(kindOf));
    tree.children.forEach((node, i) => {
      if (!plan[i]) return;
      node.data = {
        ...node.data,
        hProperties: {
          ...((node.data as { hProperties?: Record<string, unknown> })
            ?.hProperties ?? {}),
          dataFormulaLine: "",
        },
      };
    });
  };
}
