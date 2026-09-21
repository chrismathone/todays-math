import type { JSONContent } from "@tiptap/core";

/** Convert the shared reader's DOM into an editable schema without parsing rendered math. */
export function prepareVisualDocument(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const element of doc.querySelectorAll<HTMLElement>("[data-math-tex]")) {
    element.replaceChildren();
  }
  for (const element of doc.querySelectorAll<HTMLElement>(
    "[data-figure-index], [data-editor-svg], img",
  )) {
    if (
      element.parentElement?.closest("[data-figure-index], [data-editor-svg]")
    )
      continue;
    const inline =
      !!element.closest(".choice, td, th") ||
      (element.tagName === "IMG" && !!element.closest("p"));
    const figure = doc.createElement(inline ? "span" : "div");
    figure.dataset.visualFigure = inline ? "inline" : "true";
    const layout = element.parentElement?.hasAttribute(
      "data-source-figure-layout",
    )
      ? element.parentElement
      : element;
    if (layout.style.flexGrow)
      figure.dataset.figureGrow = layout.style.flexGrow;
    figure.dataset.figureAlign = layout.classList.contains("diagram-align-left")
      ? "left"
      : layout.classList.contains("diagram-align-right")
        ? "right"
        : "center";
    if (layout.style.maxWidth)
      figure.dataset.figureMaxWidth = layout.style.maxWidth;
    for (const name of ["data-figure-index", "data-editor-svg"]) {
      if (element.hasAttribute(name))
        figure.setAttribute(name, element.getAttribute(name)!);
    }
    figure.dataset.src = element.getAttribute("src") ?? "";
    figure.dataset.label = element.getAttribute("alt") ?? "그림";
    layout.replaceWith(figure);
  }
  for (const box of doc.querySelectorAll<HTMLElement>("[data-condition-box]")) {
    const children = [...box.children];
    const rows = children.flatMap((child) =>
      child.classList.contains("grid") ? [...child.children] : [child],
    );
    box.replaceChildren(
      ...rows.flatMap((row) => {
        if (
          !row.textContent?.trim() &&
          !row.querySelector("[data-math-tex], [data-visual-figure]")
        )
          return [];
        const p = doc.createElement("p");
        p.innerHTML =
          row.childElementCount === 1 && row.firstElementChild?.tagName === "P"
            ? row.firstElementChild.innerHTML
            : row.innerHTML;
        return [p];
      }),
    );
  }
  for (const choice of doc.querySelectorAll(".choice")) {
    const marker = choice.querySelector(".choice-marker");
    choice.setAttribute("data-choice-marker", marker?.textContent ?? "");
    marker?.remove();
  }
  return doc.body.innerHTML;
}

const tableMarkdown = (node: JSONContent): string => {
  const rows = node.content ?? [];
  return rows
    .map((row, i) => {
      const cells = row.content ?? [];
      const line = `| ${cells.map((cell) => documentMarkdown(cell).trim().replace(/\n/g, "<br>").replace(/\|/g, "\\|")).join(" | ")} |`;
      return i === 0
        ? `${line}\n| ${cells.map(() => "---").join(" | ")} |`
        : line;
    })
    .join("\n");
};

const NBSP = " ";
const TYPED_SPACES = /[  ]{2,}/g;

/**
 * 편집기에서 친 여러 칸 띄어쓰기는 **고정 공백**(U+00A0)으로 싣는다 — 원장님 2026-09-21
 * «띄워쓰기를 해놓고 저장해보면 다시 띄워쓰기가 사라지네».
 *
 * 저장 원문은 멀쩡했다. 보통 공백 여럿은 검수 카드·지면의 HTML 이 한 칸으로 접고, 지면 파서
 * (`collapseWhitespace`)가 옛 변환본을 정리하려고 일부러 녹이고, 편집기를 다시 열면 ProseMirror
 * 파서도 접는다(그 뒤 아무 글자나 고치면 원문에서도 지워진다). 고정 공백은 셋 다 안 접는다 —
 * 지면의 공백 정리 규칙과 기존 문항은 그대로 두고, **친 칸만** 지킨다.
 *
 * 마지막 한 칸은 보통 공백으로 둔다 — 줄이 거기서 꺾일 수 있게. 줄 끝 공백은 보통 공백으로
 * 되돌린다 — 지면의 줄바꿈 규칙(`applyHardBreaks`)이 줄 끝의 보통 공백을 본다.
 */
const keepTypedSpaces = (text: string, lineEnds: boolean) =>
  text.replace(TYPED_SPACES, (run: string, offset: number) =>
    lineEnds && offset + run.length === text.length
      ? " ".repeat(run.length)
      : `${NBSP.repeat(run.length - 1)} `,
  );

/** The stored/exported format stays Markdown + LaTeX; the user edits its visual form. */
export function documentMarkdown(node: JSONContent): string {
  const attrs = node.attrs ?? {};
  const children = () => {
    const content = node.content ?? [];
    return content
      .map((child, index) => {
        if (child.type !== "text") return documentMarkdown(child);
        const next = content[index + 1];
        const lineEnds = !next || next.type === "hardBreak";
        return documentMarkdown({
          ...child,
          text: keepTypedSpaces(child.text ?? "", lineEnds),
        });
      })
      .join("");
  };
  const blocks = () => (node.content ?? []).map(documentMarkdown).join("\n\n");
  switch (node.type) {
    case "doc":
      return blocks().trim();
    case "text": {
      let text = (node.text ?? "").replace(/([\\`*_[\]$<>])/g, "\\$1");
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "link") text = `[${text}](${mark.attrs?.href ?? ""})`;
      }
      return text;
    }
    case "visualMath":
      return attrs.display ? `$$${attrs.tex}$$` : `$${attrs.tex}$`;
    case "visualFigure":
    case "visualInlineFigure":
      return attrs.index !== null
        ? `[그림${Number(attrs.index) + 1}]`
        : attrs.svg || `![${attrs.label ?? ""}](${attrs.src ?? ""})`;
    case "visualFigureRow":
      return blocks();
    case "hardBreak":
      return "\n";
    case "horizontalRule":
      return "---";
    case "heading":
      return `${"#".repeat(attrs.level ?? 2)} ${children()}`;
    // 코드는 글자 그대로 — 친 칸을 고정 공백으로 바꾸지 않는다.
    case "codeBlock":
      return `\`\`\`${attrs.language ?? ""}\n${(node.content ?? []).map(documentMarkdown).join("")}\n\`\`\``;
    case "conditionBox": {
      let text = (node.content ?? []).map(documentMarkdown).join("\n");
      text = text.replace(/\\([<>])/g, "$1");
      text = text.replace(
        /\*{0,2}<보기>\*{0,2}/,
        attrs.cols > 1 ? `<보기:cols=${attrs.cols}>` : "<보기>",
      );
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "blockquote":
      return blocks()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "choiceGroup":
      return (node.content ?? []).map(documentMarkdown).join("\n");
    case "choiceItem":
      return `${attrs.marker} ${children()}`;
    case "bulletList":
    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => {
          const text = documentMarkdown(item);
          return `${node.type === "bulletList" ? "-" : `${i + (attrs.start ?? 1)}.`} ${text.replace(/\n/g, "\n  ")}`;
        })
        .join("\n");
    case "table":
      return tableMarkdown(node);
    case "listItem":
    case "tableCell":
    case "tableHeader":
      return blocks();
    default:
      return children();
  }
}
