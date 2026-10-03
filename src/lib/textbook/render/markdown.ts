import katex from "katex";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import { unified } from "unified";

export const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  depth?: number;
  ordered?: boolean;
  start?: number;
  url?: string;
  alt?: string;
  lang?: string;
}
const parser = unified().use(remarkParse).use(remarkMath).use(remarkGfm);

/** A shared semantic Markdown renderer with no raw HTML, URL fetches or user-trusted KaTeX commands. */
export function renderTextbookMarkdown(markdown: string): string {
  const render = (node: MarkdownNode): string => {
    const body = () => (node.children ?? []).map(render).join("");
    switch (node.type) {
      case "root":
        return body();
      case "text":
        return escapeHtml(node.value ?? "").replace(/\n/g, "<br>");
      case "html":
        return escapeHtml(node.value ?? "");
      case "paragraph":
        return `<p>${body()}</p>`;
      case "heading": {
        const level = Math.min(6, Math.max(1, node.depth ?? 2));
        return `<h${level}>${body()}</h${level}>`;
      }
      case "strong":
        return `<strong>${body()}</strong>`;
      case "emphasis":
        return `<em>${body()}</em>`;
      case "delete":
        return `<del>${body()}</del>`;
      case "blockquote":
        return `<blockquote>${body()}</blockquote>`;
      case "list":
        return node.ordered
          ? `<ol start="${node.start ?? 1}">${body()}</ol>`
          : `<ul>${body()}</ul>`;
      case "listItem":
        return `<li>${body()}</li>`;
      case "break":
        return "<br>";
      case "thematicBreak":
        return "<hr>";
      case "inlineCode":
        return `<code>${escapeHtml(node.value ?? "")}</code>`;
      case "code":
        return `<pre><code>${escapeHtml(node.value ?? "")}</code></pre>`;
      case "link":
        return body();
      case "image":
        throw new Error(
          "Markdown 이미지는 고정 이미지 블록·자산으로 옮겨 주세요.",
        );
      case "definition":
        return "";
      case "table":
        return `<table><tbody>${body()}</tbody></table>`;
      case "tableRow":
        return `<tr>${body()}</tr>`;
      case "tableCell":
        return `<td>${body()}</td>`;
      case "math":
      case "inlineMath": {
        const tex = node.value ?? "";
        if (
          /\\(?:href|url|includegraphics|html\w*|def|gdef|newcommand|renewcommand)\b/.test(
            tex,
          )
        )
          throw new Error("지원하지 않는 수식 명령입니다.");
        const html = katex.renderToString(tex, {
          throwOnError: true,
          strict: false,
          trust: false,
          output: "html",
          displayMode: node.type === "math",
          maxExpand: 1000,
          maxSize: 20,
        });
        if (html.includes("katex-error") || /#cc0000/i.test(html))
          throw new Error("수식 렌더 실패");
        return `<span data-textbook-math>${html}</span>`;
      }
      default:
        throw new Error(`지원하지 않는 Markdown 요소: ${node.type}`);
    }
  };
  return render(parser.parse(markdown) as unknown as MarkdownNode);
}

export type RecallPiece =
  | { kind: "text"; markdown: string }
  | { kind: "blank"; scope: "keyword" | "sentence" };
/** Explicit legacy marker adapter. Hidden answer text is removed before a student render model exists. */
export function recallPieces(
  source: string,
  phase: "study" | "keywords" | "sentences",
): RecallPiece[] {
  const pieces: RecallPiece[] = [];
  let at = 0;
  const marker = /\[\[([\s\S]*?)\]\]|\{\{([\s\S]*?)\}\}/g;
  for (const match of source.matchAll(marker)) {
    if (match.index! > at)
      pieces.push({ kind: "text", markdown: source.slice(at, match.index) });
    const keyword = match[1] !== undefined;
    const hidden = phase === "sentences" || (phase === "keywords" && keyword);
    pieces.push(
      hidden
        ? { kind: "blank", scope: keyword ? "keyword" : "sentence" }
        : { kind: "text", markdown: match[1] ?? match[2] },
    );
    at = match.index! + match[0].length;
  }
  if (at < source.length)
    pieces.push({ kind: "text", markdown: source.slice(at) });
  if (
    pieces.some(
      (p) => p.kind === "text" && /\[\[|\]\]|\{\{|\}\}/.test(p.markdown),
    )
  )
    throw new Error("짝이 맞지 않는 백지 표기입니다.");
  if (phase !== "study" && !pieces.some((p) => p.kind === "blank"))
    throw new Error("빈칸 단계에 숨길 핵심어·문장 표기를 입력하세요.");
  return pieces;
}
