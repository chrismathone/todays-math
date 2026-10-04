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
  position?: { start: { offset: number }; end: { offset: number } };
}
const parser = unified().use(remarkParse).use(remarkMath).use(remarkGfm);

/** Keep paragraphs, formulas, tables and fenced code intact; long lists can cross pages. */
export function splitTextbookMarkdown(
  source: string,
  parseSource = source,
): string[] {
  const root = parser.parse(parseSource) as unknown as MarkdownNode;
  const parts: string[] = [];
  const slice = (node: MarkdownNode) =>
    source.slice(node.position!.start.offset, node.position!.end.offset);
  for (const node of root.children ?? []) {
    if (node.type !== "list" || (node.children?.length ?? 0) <= 4) {
      parts.push(slice(node));
      continue;
    }
    const items = node.children!;
    for (let at = 0; at < items.length; at += 4) {
      let part = source.slice(
        items[at].position!.start.offset,
        items[Math.min(at + 3, items.length - 1)].position!.end.offset,
      );
      // Markdown commonly uses "1." for every item; preserve its rendered numbering.
      if (node.ordered)
        part = part.replace(
          /^(\s*)\d+([.)]\s)/,
          `$1${(node.start ?? 1) + at}$2`,
        );
      parts.push(part);
    }
  }
  return parts.length ? parts : [source];
}

/** Do not split hidden answers at their internal paragraph breaks. */
export function splitRecallMarkdown(source: string): string[] {
  const masked = source.replace(
    /\[\[([\s\S]*?)\]\]|\{\{([\s\S]*?)\}\}/g,
    (marker) => "a".repeat(marker.length),
  );
  const parts: string[] = [];
  for (const part of splitTextbookMarkdown(source, masked)) {
    // The sentence prompt and its writing space belong together.
    if (part.trimStart().startsWith("{{") && parts.length)
      parts[parts.length - 1] += `\n\n${part}`;
    else parts.push(part);
  }
  return parts;
}

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
  const mathEnd = (index: number): number => {
    if (source[index] !== "$" || source[index - 1] === "\\") return index;
    const delimiter = source.startsWith("$$", index) ? "$$" : "$";
    let end = source.indexOf(delimiter, index + delimiter.length);
    while (end >= 0 && source[end - 1] === "\\")
      end = source.indexOf(delimiter, end + delimiter.length);
    return end < 0 ? index : end + delimiter.length;
  };
  for (let index = 0; index < source.length;) {
    const afterMath = mathEnd(index);
    if (afterMath > index) {
      index = afterMath;
      continue;
    }
    const opening = source.slice(index, index + 2);
    if (opening === "]]" || opening === "}}")
      throw new Error("짝이 맞지 않는 백지 표기입니다.");
    if (opening !== "[[" && opening !== "{{") {
      index++;
      continue;
    }
    const keyword = opening === "[[";
    const closing = keyword ? "]]" : "}}";
    let end = index + 2;
    for (; end < source.length;) {
      const afterInnerMath = mathEnd(end);
      if (afterInnerMath > end) {
        end = afterInnerMath;
        continue;
      }
      if (source.startsWith(closing, end)) break;
      if (/^(?:\[\[|\{\{|\]\]|\}\})/.test(source.slice(end)))
        throw new Error("짝이 맞지 않는 백지 표기입니다.");
      end++;
    }
    if (end >= source.length)
      throw new Error("짝이 맞지 않는 백지 표기입니다.");
    if (index > at)
      pieces.push({ kind: "text", markdown: source.slice(at, index) });
    const hidden = phase === "sentences" || (phase === "keywords" && keyword);
    pieces.push(
      hidden
        ? { kind: "blank", scope: keyword ? "keyword" : "sentence" }
        : { kind: "text", markdown: source.slice(index + 2, end) },
    );
    at = end + 2;
    index = at;
  }
  if (at < source.length)
    pieces.push({ kind: "text", markdown: source.slice(at) });
  if (phase !== "study" && !pieces.some((p) => p.kind === "blank"))
    throw new Error("빈칸 단계에 숨길 핵심어·문장 표기를 입력하세요.");
  return pieces;
}
