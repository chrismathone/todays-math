import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import SourceEditorRenderer from "@/components/math/editor/SourceEditorRenderer";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { renderKatexSafe } from "@/components/math/editor/katexRender";
import {
  documentMarkdown,
  prepareVisualDocument,
} from "@/components/math/editor/visualDocument";

const R = String.raw;
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");

const VisualMath = Node.create({
  name: "visualMath",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ tex: { default: "" }, display: { default: false } }),
  parseHTML: () => [
    {
      tag: "[data-math-tex]",
      getAttrs: (element) => ({
        tex: decodeURIComponent((element as HTMLElement).dataset.mathTex ?? ""),
        display: (element as HTMLElement).dataset.mathDisplay === "true",
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "span",
    {
      "data-math-tex": encodeURIComponent(node.attrs.tex),
      "data-math-display": String(node.attrs.display),
    },
  ],
});

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.replaceChildren();
});

describe("source math accessibility and serialization", () => {
  it("the actual OCR reader keeps fraction and exponent semantics even with editor metadata", () => {
    const doc = parse(
      renderToStaticMarkup(
        <SourceEditorDisplay
          value={R`분수 $\frac{1}{2}$ 와 지수 $x^{2}$.

$$\frac{x^{2}}{3}$$`}
        />,
      ),
    );
    expect(doc.querySelectorAll("math")).toHaveLength(3);
    expect(doc.querySelectorAll("mfrac")).toHaveLength(2);
    expect(doc.querySelectorAll("msup")).toHaveLength(2);
    for (const math of doc.querySelectorAll("math")) {
      expect(math.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
      expect(math.closest('[aria-hidden="true"]')).toBeNull();
    }
    expect(
      doc.querySelectorAll('.katex-html[aria-hidden="true"]'),
    ).toHaveLength(3);
    expect(doc.querySelectorAll('[role="math"], [aria-live]')).toHaveLength(0);
  });

  it.each([false, true])(
    "semantic output preserves the entire visible tree and export metadata (display=%s)",
    (display) => {
      const tex = R`\frac{x^{2}+1}{3}+\sqrt{2}`;
      const visual = parse(renderKatexSafe(tex, display));
      const semantic = parse(renderKatexSafe(tex, display, "htmlAndMathml"));
      expect(semantic.querySelector(".katex-html")?.outerHTML).toBe(
        visual.querySelector(".katex-html")?.outerHTML,
      );
      expect(
        semantic.querySelector(".katex")?.getAttribute("data-export-tex"),
      ).toBe(visual.querySelector(".katex")?.getAttribute("data-export-tex"));
      expect(visual.querySelector("math")).toBeNull();
      expect(semantic.querySelector("mfrac")).not.toBeNull();
      expect(semantic.querySelector("msup")).not.toBeNull();
    },
  );

  it("reader metadata imports and saves raw source without semantic text or control names", () => {
    const raw = R`분수 $\frac{1}{2}$ 와 지수 $x^{2}$ 이다.

$$\frac{x^{2}}{3}$$`;
    const rendered = renderToStaticMarkup(
      <SourceEditorRenderer content={raw} editorTokens />,
    );
    expect(rendered).toContain("katex-mathml");
    const html = prepareVisualDocument(rendered);
    expect(html).not.toMatch(
      /katex-mathml|<math\b|<annotation\b|수식 편집|수식 입력/,
    );
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({
      element,
      extensions: [StarterKit, VisualMath],
      content: html,
    });
    expect(documentMarkdown(editor.getJSON())).toBe(raw);
    editor.commands.insertContentAt(1, "새 ");
    expect(documentMarkdown(editor.getJSON())).toBe(`새 ${raw}`);
    // The schema's HTML clipboard/export serialization stays metadata-only.
    expect(editor.getHTML()).not.toMatch(
      /katex-mathml|<math\b|수식 편집|수식 입력/,
    );
    expect(
      [
        ...parse(editor.getHTML()).querySelectorAll<HTMLElement>(
          "[data-math-tex]",
        ),
      ].map((node) => decodeURIComponent(node.dataset.mathTex!)),
    ).toEqual([R`\frac{1}{2}`, "x^{2}", R`\frac{x^{2}}{3}`]);
  });

  it.each([
    R`\unknowncmd x`,
    R`\href{javascript:alert(1)}{x}`,
    R`\htmlStyle{color:red}{x}`,
  ])("semantic rendering retains the existing safe fallback: %s", (tex) => {
    const html = renderKatexSafe(tex, false, "htmlAndMathml");
    const doc = parse(html);
    expect(html).not.toMatch(/katex-error|#cc0000|<script\b/i);
    expect(
      doc.querySelectorAll("a, script, [onclick], [onerror]"),
    ).toHaveLength(0);
    expect(doc.querySelector(".math-raw")).not.toBeNull();
  });
});
