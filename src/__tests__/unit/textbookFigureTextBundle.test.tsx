// @vitest-environment node
/**
 * 교과서 그림 글 고침 묶음의 **렌더 대조** (D-164 ③④ · 2단계) — 묶음의 행마다 제품 렌더러로 그려 본다. 묶음이 있을 때만 돈다:
 *
 *   TEXTBOOK_FIGURE_TEXT=<…/textbook-figure-text.render.json> npx vitest run src/__tests__/unit/textbookFigureTextBundle.test.tsx
 *
 * 묶음은 `scripts/qa/textbook-figure-text.ts` 가 낸다(공유 DB 읽기 전용). 행마다:
 *   화면 · 인쇄(`ProblemContent` · `staticLayout`) — 고친 뒤의 보이는 글 = 고치기 전의 보이는 글 + 위치 표현 바꿈(자리 줄은 번호를
 *     캡션으로 옮길 뿐) · KaTeX 실패 0 · 식 수 · 식 줄 표지 · 굵게 · 상자가 같다 · 그림마다 정확히 한 번 · 자리 결정대로 그림과 캡션
 *   교재(`renderProblemHtml`) — 자리 결정대로 서고(자리 표기가 글로 남지 않는다) 그림마다 정확히 한 번
 *   HWPX(자리 행 — 실제 Chromium 배치에 수집기 `collectHwpxLayout`) — 그림 개체가 그림마다 한 번 · 캡션 글이 제 그림과 같은 칸
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser } from "@playwright/test";
import { parseFragment } from "parse5";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import { isFailedKatexHtml } from "@/lib/math/katexRender";
import { renderProblemHtml } from "@/lib/textbook/render/blocks/problem";
import type { RenderBlock } from "@/lib/textbook/render/model";

import type { SlotDecision } from "../../../scripts/qa/textbookFigureTextCore";
import { paperDocument } from "../helpers/paperChrome";

type Item = {
  code: string;
  figureUrls: string[];
  choiceFigureIndex: (number | null)[] | null;
  before: string;
  positioned: string;
  after: string;
  edits: { from: string; to: string }[];
  decision: SlotDecision | null;
};

const FILE = process.env.TEXTBOOK_FIGURE_TEXT;
const ITEMS: Item[] = FILE
  ? (JSON.parse(readFileSync(FILE, "utf8")) as Item[])
  : [];
const ROOT = path.resolve(__dirname, "../../..");
const squash = (text: string) => text.replace(/\s+/g, "");

function paper(
  content: string,
  item: Item,
  staticLayout: boolean,
  urls = item.figureUrls,
) {
  return renderToStaticMarkup(
    <ProblemContent
      content={content}
      figureUrls={urls}
      choiceFigureIndex={item.choiceFigureIndex ?? undefined}
      deferFigures={false}
      staticLayout={staticLayout}
    />,
  );
}

type Node5 = {
  nodeName: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Node5[];
};
const attr = (node: Node5, name: string) =>
  node.attrs?.find((a) => a.name === name)?.value;
const classes = (node: Node5) => (attr(node, "class") ?? "").split(/\s+/);
function walk(node: Node5, visit: (node: Node5) => void) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}
function textOf(node: Node5): string {
  if (node.nodeName === "#text") return node.value ?? "";
  if (node.nodeName === "img") return "";
  return (node.childNodes ?? []).map(textOf).join("");
}

/** 지면 HTML 의 요약 — jsdom 없이(parse5) 읽는다(행 수천 개를 그려 힙이 넘쳤다). */
function summary(html: string) {
  const root = parseFragment(html) as unknown as Node5;
  const structure = { katex: 0, formulaLine: 0, strong: 0, em: 0, box: 0 };
  const images: (string | undefined)[] = [];
  const slots: { figure: number; src: string | null; caption: string }[] = [];
  walk(root, (node) => {
    if (classes(node).includes("katex")) structure.katex += 1;
    if (attr(node, "data-formula-line") !== undefined)
      structure.formulaLine += 1;
    if (node.nodeName === "strong") structure.strong += 1;
    if (node.nodeName === "em") structure.em += 1;
    if (
      node.nodeName === "blockquote" ||
      attr(node, "data-box-card") !== undefined
    )
      structure.box += 1;
    if (node.nodeName === "img") images.push(attr(node, "src"));
    const slot = attr(node, "data-figure-slot");
    if (slot !== undefined) {
      let src: string | null = null;
      let caption = "";
      walk(node, (inner) => {
        if (inner.nodeName === "img" && src === null)
          src = attr(inner, "src") ?? null;
        if (attr(inner, "data-figure-caption") !== undefined)
          caption = squash(textOf(inner));
      });
      slots.push({ figure: Number(slot), src, caption });
    }
  });
  return { text: squash(textOf(root)), structure, images, slots };
}

/** 고치기 전 보이는 글에 위치 표현 바꿈을 차례대로 — 고친 뒤 보이는 글이 이것과 같아야 한다. */
function expectedText(beforeText: string, edits: Item["edits"]): string {
  let text = beforeText;
  let from = 0;
  for (const edit of edits) {
    const at = text.indexOf(squash(edit.from), from);
    if (at < 0) return `!바꿀 곳을 못 찾음: ${edit.from}`;
    text =
      text.slice(0, at) +
      squash(edit.to) +
      text.slice(at + squash(edit.from).length);
    from = at + squash(edit.to).length;
  }
  return text;
}

describe.skipIf(!FILE)(
  "교과서 그림 글 고침 묶음 — 화면 · 인쇄 · 교재 · HWPX",
  () => {
    it.each([false, true])(
      "화면 · 인쇄(staticLayout=%s) — 글 · 구조 · 그림 한 번 · 자리 결정",
      (staticLayout) => {
        const failures: string[] = [];
        for (const item of ITEMS) {
          const before = summary(paper(item.before, item, staticLayout));
          const afterHtml = paper(item.after, item, staticLayout);
          const after = summary(afterHtml);
          const fail = (why: string) => failures.push(`${item.code}: ${why}`);
          if (isFailedKatexHtml(afterHtml)) fail("KaTeX 실패");
          if (after.text !== expectedText(before.text, item.edits))
            fail("보이는 글이 위치 표현 바꿈 말고도 다르다");
          if (
            JSON.stringify(after.structure) !== JSON.stringify(before.structure)
          )
            fail(
              `구조가 다르다 ${JSON.stringify(before.structure)} → ${JSON.stringify(after.structure)}`,
            );
          for (const url of item.figureUrls)
            if (after.images.filter((src) => src === url).length !== 1)
              fail(`그림이 한 번이 아니다: ${url}`);
          const want = item.decision?.mapping ?? [];
          if (after.slots.length !== want.length)
            fail(`자리 ${after.slots.length} ≠ 결정 ${want.length}`);
          for (const m of want) {
            const slot = after.slots.find((s) => s.figure === m.figure);
            if (!slot || slot.src !== item.figureUrls[m.figure - 1])
              fail(`그림 ${m.figure} 의 자리가 없다`);
            else if (
              item.decision!.kind === "label" &&
              slot.caption !== squash(m.number)
            )
              fail(
                `그림 ${m.figure} 의 캡션 «${slot.caption}» ≠ «${m.number}»`,
              );
          }
        }
        expect(failures, failures.slice(0, 10).join("\n")).toEqual([]);
      },
    );

    it("교재(renderProblemHtml) — 자리 결정대로 서고 그림마다 정확히 한 번 · 고치기 전에 그려지던 행은 고친 뒤에도 그려진다", () => {
      const failures: string[] = [];
      const brokenBefore: string[] = [];
      const draw = (item: Item, content: string) => {
        const block = {
          id: item.code,
          sourceBlockId: item.code,
          unitKey: "U",
          sectionKey: "s",
          kind: "problem",
          itemId: item.code,
          displayNumber: "1",
          content,
          figures: item.figureUrls.map((url, i) => ({
            assetId: url,
            sha256: url,
            choiceIndex: item.choiceFigureIndex?.[i] ?? 0,
            sourceWidthMm: null,
            altText: null,
          })),
          questionType: "단답형",
          sourcePageLabel: null,
          qr: null,
          layout: {
            columnSpan: 1,
            minWorkLines: 2,
            preferredWorkLines: 3,
            maxWorkLines: 10,
            keepTogether: true,
          },
          semantic: { activity: "basicCheck" },
        } as unknown as Extract<RenderBlock, { kind: "problem" }>;
        return renderProblemHtml(block, {
          assetUrl: (id: string) => id,
          qrDataUrl: () => "data:image/png;base64,AA==",
        });
      };
      for (const item of ITEMS) {
        const fail = (why: string) => failures.push(`${item.code}: ${why}`);
        // 교재 렌더러는 깨진 식에서 던진다 — 고치기 전에도 던지던 행은 이 고침의 결함이 아니다(따로 센다)
        try {
          draw(item, item.before);
        } catch {
          brokenBefore.push(item.code);
          continue;
        }
        let html: string;
        try {
          html = draw(item, item.after);
        } catch (error) {
          fail(`고친 뒤에만 교재 렌더가 던진다: ${String(error).slice(0, 80)}`);
          continue;
        }
        const page = summary(html);
        const want = item.decision?.mapping ?? [];
        if (page.slots.length !== want.length)
          fail("교재 자리 수가 결정과 다르다");
        if (/\[그림:\d+\]/.test(page.text))
          fail("교재에 자리 표기가 글로 남았다");
        for (const url of item.figureUrls)
          if (page.images.filter((src) => src === url).length !== 1)
            fail(`교재 그림이 한 번이 아니다: ${url}`);
      }
      if (brokenBefore.length)
        console.log(
          `교재 렌더가 고치기 전부터 던지는 행 ${brokenBefore.length}: ${brokenBefore.join(" · ")}`,
        );
      expect(failures, failures.slice(0, 10).join("\n")).toEqual([]);
    });

    describe("HWPX — 실제 Chromium 배치에 수집기", () => {
      let browser: Browser;
      beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
      }, 60_000);
      afterAll(async () => {
        await browser?.close();
      });

      it("자리 행마다 그림 개체는 그림마다 한 번 · 캡션 글은 제 그림과 같은 칸", async () => {
        // 수집기는 import 가 없는 한 파일이다 — `export` 를 떼어 일반 스크립트로 옮겨 페이지에 싣는다
        const collector = ts.transpileModule(
          readFileSync(
            path.join(ROOT, "src/lib/export/hwpxLayout.ts"),
            "utf8",
          ).replace(/^export\s+/gm, ""),
          { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
        ).outputText;
        const frame = await paperDocument("<!--BODY-->");
        const dir = mkdtempSync(path.join(tmpdir(), "tb-hwpx-"));
        const page = await browser.newPage();
        await page.emulateMedia({ media: "print" });
        const failures: string[] = [];
        const slotted = ITEMS.filter((item) => item.decision);
        const checked = { rows: 0, images: 0, captions: 0 };
        for (const item of slotted) {
          // 그림마다 다른 자리표로 그려 문서 속 그림의 차례를 안다(같은 바이트의 그림이 둘이어도) — 그다음 data URL 로 바꾼다.
          // 수집기는 `.katex, img, svg` 를 문서 차례대로 돌아 그림 개체를 내므로 그림 개체 j 번째 = 문서의 j 번째 그림이다.
          const marks = item.figureUrls.map((_, k) => `about:figure-${k}`);
          const marked = paper(item.after, item, true, marks);
          const order = summary(marked).images.map((src) =>
            marks.indexOf(src ?? ""),
          );
          let html = marked;
          item.figureUrls.forEach((url, k) => {
            html = html
              .split(`"${marks[k]}"`)
              .join(
                `"data:image/png;base64,${readFileSync(path.join(ROOT, "public", url)).toString("base64")}"`,
              );
          });
          const body = `<div id="root"><section data-unified-paper style="width:210mm">${html}</section></div>`;
          const file = path.join(dir, `${item.code}.html`);
          writeFileSync(file, frame.replace("<!--BODY-->", body));
          await page.goto(pathToFileURL(file).href);
          await page.addScriptTag({
            content: `${collector}\nwindow.__collect = collectHwpxLayout;`,
          });
          const objects = (await page.evaluate(`(async () => {
          const out = await window.__collect(document.getElementById("root"));
          return out.pages.flatMap((p) => p.objects).map((o) => ({ type: o.type, text: o.text ?? null, gridId: o.gridId ?? null, gridRow: o.gridRow ?? null, gridCol: o.gridCol ?? null }));
        })()`)) as {
            type: string;
            text: string | null;
            gridId: number | null;
            gridRow: number | null;
            gridCol: number | null;
          }[];
          const fail = (why: string) => failures.push(`${item.code}: ${why}`);
          const images = objects.filter((o) => o.type === "image");
          checked.rows += 1;
          checked.images += images.length;
          if (images.length !== item.figureUrls.length)
            fail(`그림 개체 ${images.length} ≠ 그림 ${item.figureUrls.length}`);
          if (order.length !== images.length || order.includes(-1))
            fail("문서의 그림 차례를 그림 개체에 못 맞춘다");
          if (item.decision!.kind === "label")
            for (const m of item.decision!.mapping) {
              const caption = objects.find(
                (o) =>
                  o.type === "text" &&
                  o.gridId !== null &&
                  squash(o.text ?? "") === squash(m.number),
              );
              const at = caption
                ? images.findIndex(
                    (o) =>
                      o.gridId === caption.gridId &&
                      o.gridRow === caption.gridRow &&
                      o.gridCol === caption.gridCol,
                  )
                : -1;
              // 캡션과 같은 칸의 그림이 **제 그림**(결정의 그림 번호)인가
              if (!caption || at < 0 || order[at] !== m.figure - 1)
                fail(`캡션 «${m.number}» 이 그림 ${m.figure} 의 칸에 없다`);
              else checked.captions += 1;
            }
        }
        await page.close();
        console.log(
          `HWPX 대조: 자리 행 ${checked.rows} · 그림 개체 ${checked.images} · 제 그림(결정의 번호) 칸의 캡션 ${checked.captions}`,
        );
        expect(checked.rows).toBe(slotted.length);
        expect(failures, failures.slice(0, 10).join("\n")).toEqual([]);
      }, 900_000);
    });
  },
);
