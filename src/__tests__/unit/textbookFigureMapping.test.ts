// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalJson } from "@/lib/textbook/canonical";
import { contentHash, sha256, snapshotHash } from "@/lib/textbook/hash.server";
import { validateTextbookIntegrity } from "@/lib/textbook/integrity.server";
import { validateTextbookReferences } from "@/lib/textbook/references";
import {
  measurementHtml,
  renderBlockHtml,
  renderPageHtml,
} from "@/lib/textbook/render/html";
import { renderTextbookMarkdown } from "@/lib/textbook/render/markdown";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import type { TextbookPage } from "@/lib/textbook/layout/paginate";
import { UNLINKED_FIGURE_CHOICES_NOTICE as notice } from "@/lib/problem/choiceFigureIndex";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

function figures() {
  const exchange = textbookFixture(1, 1);
  const bytes = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><path d="M0 0 L20 10"/></svg>',
  );
  const snapshot = exchange.snapshots[0];
  exchange.assets = ["first", "second"].map((assetId) => ({
    assetId,
    sha256: sha256(bytes),
    mimeType: "image/svg+xml",
    packagePath: `assets/${assetId}.svg`,
    widthPx: 20,
    heightPx: 10,
  }));
  snapshot.payload.figures = exchange.assets.map((asset) => ({
    assetId: asset.assetId,
    sha256: asset.sha256,
    choiceIndex: null,
    sourceWidthMm: null,
    altText: asset.assetId,
  }));
  snapshot.rawSource!.figureUrls = [
    "/figures-svg/first.svg",
    "/figures-svg/second.svg",
  ];
  snapshot.rawSource!.figureDims = [20, 10, 20, 10];
  const rehash = () => {
    snapshot.contentHash = contentHash(snapshot.payload);
    snapshot.snapshotHash = snapshotHash(snapshot);
  };
  rehash();
  return { exchange, snapshot, bytes, rehash };
}
const options = {
  mode: "publish" as const,
  officialOrigin: SYNTHETIC_ORIGIN,
  requirePageMap: false,
};
const resources = {
  assetUrl: (id: string) => `/assets/${id}.svg`,
  qrDataUrl: () => "/qr.svg",
};
const figureChoices =
  "곡선으로 알맞은 것은?\n\n① [그림]\n② [그림]\n③ [그림]\n④ [그림]\n⑤ [그림]";

function problemModel(
  exchange: ReturnType<typeof textbookFixture>,
  variant: "student" | "answers" = "student",
) {
  const model = createTextbookRenderModel(exchange, variant);
  const block = model.sections[0].blocks.find((b) => b.kind === "problem")!;
  return { model, block };
}

function expectNoFigureNotice(html: string) {
  expect(html).not.toContain(notice);
  expect(html).not.toContain("보기 대응 정보 없음");
  expect(html).not.toContain("그림 대응 확인 필요");
}

describe("unknown figure links preserve source without hiding invalid mappings", () => {
  it("keeps integrity warnings for unknown links without a public text-choice notice, changing bytes or hashes", async () => {
    const { exchange, snapshot, bytes } = figures();
    const before = canonicalJson(exchange);
    const issues = await validateTextbookIntegrity(exchange, {
      ...options,
      readAsset: async () => bytes,
    });
    expect(issues).toHaveLength(2);
    expect(
      issues.every(
        (issue) =>
          issue.code === "FIGURE_CHOICE_UNKNOWN" &&
          issue.severity === "warning",
      ),
    ).toBe(true);
    const block = createTextbookRenderModel(
      exchange,
      "student",
    ).sections[0].blocks.find((b) => b.kind === "problem")!;
    const html = renderBlockHtml(block, {
      assetUrl: (id) => `/assets/${id}.svg`,
      qrDataUrl: () => "/qr.svg",
    });
    expect(html.indexOf('alt="first"')).toBeLessThan(
      html.indexOf('alt="second"'),
    );
    expect(html.match(/data-choice-index="unknown"/g)).toHaveLength(2);
    expectNoFigureNotice(html);
    expect(html).not.toMatch(/data-choice-index="0"|번 보기/);
    expect(snapshot.rawSource!.choiceFigureIndex).toEqual([]);
    expect(snapshot.payload.figures.map((f) => f.choiceIndex)).toEqual([
      null,
      null,
    ]);
    expect(canonicalJson(exchange)).toBe(before);
  });

  it.each([
    {
      name: "all unknown text choices",
      content: "알맞은 것은?\n① 하나\n② 둘\n③ 셋\n④ 넷\n⑤ 다섯",
      links: [null, null],
    },
    {
      name: "mixed known and unknown text-choice links",
      content: "알맞은 것은?\n① 하나\n② 둘\n③ 셋\n④ 넷\n⑤ 다섯",
      links: [2, null],
    },
    {
      name: "figure markers accompanied by text",
      content:
        "알맞은 것은?\n① [그림] 위로 볼록\n② [그림] 아래로 볼록\n③ 직선\n④ 원\n⑤ 타원",
      links: [null, null],
    },
    {
      name: "a stem figure marker with text choices",
      content: "[그림]을 보고 고르시오.\n① 하나\n② 둘\n③ 셋\n④ 넷\n⑤ 다섯",
      links: [0, null],
    },
  ])("adds no public notice for $name", ({ content, links }) => {
    const { exchange, snapshot, rehash } = figures();
    snapshot.payload.content = content;
    snapshot.payload.figures.forEach((f, i) => {
      f.choiceIndex = links[i];
    });
    rehash();
    const before = canonicalJson(exchange);
    const { block } = problemModel(exchange);
    const html = renderBlockHtml(block, resources);
    expectNoFigureNotice(html);
    expect(html).toContain(
      `<div class="tb-prose">${renderTextbookMarkdown(content)}</div>`,
    );
    expect(html.indexOf('alt="first"')).toBeLessThan(
      html.indexOf('alt="second"'),
    );
    expect(canonicalJson(exchange)).toBe(before);
  });

  it.each([
    { name: "pure figure choices with unknown links", content: figureChoices },
    {
      name: "mixed text and pure figure choices with unknown links",
      content:
        "곡선으로 알맞은 것은?\n① [그림]\n② 직선\n③ [그림]\n④ 원\n⑤ 타원",
    },
    {
      name: "inline figure choices classified by the shared parser",
      content: "곡선으로 알맞은 것은?\n① [그림] ② 직선 ③ [그림] ④ 원 ⑤ 타원",
    },
  ])("adds exactly one notice before choices for $name", ({ content }) => {
    const { exchange, snapshot, rehash } = figures();
    snapshot.payload.content = content;
    rehash();
    const before = canonicalJson(exchange);
    for (const variant of ["student", "answers"] as const) {
      const { block } = problemModel(exchange, variant);
      const html = renderBlockHtml(block, resources);
      expect(html.split(notice)).toHaveLength(2);
      expect(html.indexOf(notice)).toBeLessThan(
        html.indexOf('class="tb-prose"'),
      );
      expect(html.indexOf(notice)).toBeLessThan(html.indexOf("①"));
      expect(html).not.toContain("보기 대응 정보 없음");
      expect(html).not.toContain("그림 대응 확인 필요");
      expect(html.match(/data-choice-index="unknown"/g)).toHaveLength(2);
      expect(html.indexOf('alt="first"')).toBeLessThan(
        html.indexOf('alt="second"'),
      );
      expect(html).toContain(
        `<div class="tb-prose">${renderTextbookMarkdown(content)}</div>`,
      );
      if (variant === "student") {
        expect(html).not.toContain(snapshot.payload.answer);
        expect(html).not.toContain(snapshot.payload.solution);
        expect(block).not.toHaveProperty("answer");
        expect(block).not.toHaveProperty("solution");
      } else {
        expect(html).toContain(snapshot.payload.answer);
        expect(html).toContain(snapshot.payload.solution);
      }
    }
    expect(snapshot.rawSource!.choiceFigureIndex).toEqual([]);
    expect(snapshot.payload.figures.map((f) => f.choiceIndex)).toEqual([
      null,
      null,
    ]);
    expect(canonicalJson(exchange)).toBe(before);
    expect(contentHash(snapshot.payload)).toBe(snapshot.contentHash);
    expect(snapshotHash(snapshot)).toBe(snapshot.snapshotHash);
  });

  it.each([
    { name: "a missing choice despite known links", links: [1, 3] },
    { name: "a partially unknown mapping", links: [1, null] },
    { name: "a link to a nonexistent choice", links: [1, 10] },
    { name: "duplicate positive links", links: [1, 1] },
  ])(
    "notices $name without inferring links or changing figure order",
    ({ links }) => {
      const { exchange, snapshot, rehash } = figures();
      snapshot.payload.content = figureChoices;
      snapshot.payload.figures.forEach((f, i) => {
        f.choiceIndex = links[i];
      });
      rehash();
      const before = canonicalJson(exchange);
      const html = renderBlockHtml(problemModel(exchange).block, resources);
      expect(html.split(notice)).toHaveLength(2);
      expect(html.indexOf(notice)).toBeLessThan(html.indexOf("①"));
      expect(html.indexOf('alt="first"')).toBeLessThan(
        html.indexOf('alt="second"'),
      );
      expect(canonicalJson(exchange)).toBe(before);
    },
  );

  it("notices pure figure choices even when the figure assets are absent", () => {
    const exchange = textbookFixture(1, 1);
    const snapshot = exchange.snapshots[0];
    snapshot.payload.content = figureChoices;
    const html = renderBlockHtml(problemModel(exchange).block, resources);
    expect(html.split(notice)).toHaveLength(2);
    expect(html.indexOf(notice)).toBeLessThan(html.indexOf("①"));
  });

  it("keeps complete mappings and their original asset order without a notice", () => {
    const { exchange, snapshot, rehash } = figures();
    snapshot.payload.content =
      "알맞은 것은?\n① [그림]\n② 직선\n③ [그림]\n④ 원\n⑤ 타원";
    snapshot.rawSource!.choiceFigureIndex = [3, 1];
    snapshot.payload.figures[0].choiceIndex = 3;
    snapshot.payload.figures[1].choiceIndex = 1;
    rehash();
    const before = canonicalJson(exchange);
    expect(validateTextbookReferences(exchange, options)).toEqual([]);
    const html = renderBlockHtml(problemModel(exchange).block, resources);
    expectNoFigureNotice(html);
    expect(html).toContain("3번 보기");
    expect(html).toContain("1번 보기");
    expect(html.indexOf('alt="first"')).toBeLessThan(
      html.indexOf('alt="second"'),
    );
    expect(canonicalJson(exchange)).toBe(before);
  });

  it("preserves original Markdown and measures the same notice shown on the page", () => {
    const { exchange, snapshot, rehash } = figures();
    const content =
      "## **곡선**을 고르시오.\r\n\r\n> *조건* $x > 0$\r\n\r\n| 값 | 설명 |\r\n| --- | --- |\r\n| $2$ | `원문` |\r\n\r\n① [그림]\r\n② 직선\r\n③ [그림]\r\n④ 원\r\n⑤ 타원";
    snapshot.payload.content = content;
    snapshot.payload.figures[0].sourceWidthMm = 30;
    rehash();
    const before = canonicalJson(exchange);
    const { model, block } = problemModel(exchange);
    Object.freeze(block.figures);
    block.figures.forEach(Object.freeze);
    Object.freeze(block);
    const html = renderBlockHtml(block, resources);
    expect(block.content).toBe(content);
    expect(html).toContain(
      `<div class="tb-prose">${renderTextbookMarkdown(content)}</div>`,
    );
    expect(html).toContain("<h2><strong>곡선</strong>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
    expect(html).toContain("<code>원문</code>");
    expect(html).toContain("data-textbook-math");
    expect(html).toContain('style="width:30mm;max-width:100%"');
    const section = model.sections[0];
    const page: TextbookPage = {
      physicalPageIndex: 2,
      printedPageLabel: "2",
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      unitTitle: section.unitTitle,
      sectionTitle: section.title,
      kind: "content",
      blocks: [
        {
          blockId: block.id,
          column: 1,
          xMm: 18,
          yMm: 40,
          widthMm: 80,
          heightMm: 200,
        },
      ],
    };
    for (const output of [
      measurementHtml(model, resources),
      renderPageHtml(page, model, resources),
    ]) {
      expect(output).toContain(html);
      expect(output.split(notice)).toHaveLength(2);
      expect(output.indexOf(notice)).toBeLessThan(output.indexOf("①"));
      expect(output).not.toContain(snapshot.payload.answer);
      expect(output).not.toContain(snapshot.payload.solution);
    }
    expect(canonicalJson(exchange)).toBe(before);
    expect(contentHash(snapshot.payload)).toBe(snapshot.contentHash);
    expect(snapshotHash(snapshot)).toBe(snapshot.snapshotHash);
  });

  it.each(
    [[1], [1, 1], [0, 11], [-1, 2], [1.5, 2]].map((mapping) => ({ mapping })),
  )(
    "blocks malformed explicit mapping $mapping even when capture projected unknown links",
    ({ mapping }) => {
      const { exchange, snapshot, rehash } = figures();
      snapshot.rawSource!.choiceFigureIndex = mapping;
      rehash();
      const before = canonicalJson(exchange);
      expect(validateTextbookReferences(exchange, options)).toContainEqual(
        expect.objectContaining({
          code: "RAW_FIGURE_ALIGNMENT",
          severity: "error",
        }),
      );
      expect(canonicalJson(exchange)).toBe(before);
    },
  );

  it("keeps explicit body and choice labels, and blocks duplicate positive payload links", () => {
    const { exchange, snapshot } = figures();
    snapshot.rawSource!.choiceFigureIndex = [0, 2];
    snapshot.payload.figures[0].choiceIndex = 0;
    snapshot.payload.figures[1].choiceIndex = 2;
    expect(validateTextbookReferences(exchange, options)).toEqual([]);
    const block = createTextbookRenderModel(
      exchange,
      "student",
    ).sections[0].blocks.find((b) => b.kind === "problem")!;
    const html = renderBlockHtml(block, {
      assetUrl: (id) => `/assets/${id}.svg`,
      qrDataUrl: () => "/qr.svg",
    });
    expect(html).toContain('data-choice-index="0"');
    expect(html).toContain("2번 보기");
    expect(html).not.toContain("대응 정보 없음");
    snapshot.payload.figures[0].choiceIndex = 2;
    expect(validateTextbookReferences(exchange, options)).toContainEqual(
      expect.objectContaining({
        code: "FIGURE_CHOICE_DUPLICATE",
        severity: "error",
      }),
    );
  });

  it("still rejects missing assets and corrupt bytes when links are unknown", async () => {
    const { exchange } = figures();
    expect(
      await validateTextbookIntegrity(exchange, {
        ...options,
        readAsset: async () => new Uint8Array([1, 2]),
      }),
    ).toContainEqual(
      expect.objectContaining({ code: "ASSET_BYTES", severity: "error" }),
    );
    exchange.assets.pop();
    expect(
      validateTextbookReferences(exchange, options).some(
        (issue) => issue.severity === "error",
      ),
    ).toBe(true);
  });
});
