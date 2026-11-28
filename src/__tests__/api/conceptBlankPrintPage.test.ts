/**
 * 개념 백지 인쇄 페이지 `/concept-blank/print?s=…&view=…` (D-150 · 26 §6 · 브리프 cb-paper).
 *
 * 서버 컴포넌트를 함수로 부른다(`englishPrintPage.test.ts` 결). 보는 것 — 세션 없음 → `/login` ·
 * `?s=` 가 틀리면 «주소를 확인해 주세요» 한 줄 · 맞으면 `ConceptBlankPaper` 에 고정 합치기 결과와 `view`(기본 both).
 * 은행은 실제 학년 파일이 비어 있는 동안 FIXTURE 로 바꿔 끼운다(같은 주소 = 같은 지면인지 본다).
 *
 * ⚠️ 페이지는 `<ConceptBlankPaper …/>` **요소**를 돌려줄 뿐 컴포넌트를 부르지 않는다 — 돌려받은 요소의 `props` 를 본다.
 */
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { zlibSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), artifact: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/concept-blank/scan/issuance", () => ({
  readIssuedScanArtifact: mocks.artifact,
}));
vi.mock("@/lib/concept-blank/scan/database.server", () => ({
  scanDatabase: { fakeLocal: true },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock("@/lib/concept-blank/bank/runtime", async () => {
  const { FIXTURE_BANK } = await import("@/lib/concept-blank/fixture");
  return { getConceptBlankBankForSections: () => FIXTURE_BANK };
});

import ConceptBlankPrintPage from "@/app/(main)/concept-blank/print/page";
import ConceptBlankPaper, {
  type ConceptBlankPaperProps,
} from "@/components/concept-blank/ConceptBlankPaper";
import PrintNow from "@/components/concept-blank/paper/PrintNow";
import IssuePrint from "@/components/concept-blank/IssuePrint";
import type {
  ConceptBlankPick,
  ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { composeSheets } from "@/lib/concept-blank/compose";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { encodeSelection } from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";

const OWNER = {
  id: "10000000-0000-4000-8000-0000000000a1",
  email: "owner@example.com",
  name: "김원장",
  isAdmin: false,
  menus: ["conceptBlank"],
};

const SELECTION: ConceptBlankSelection = {
  sections: FIXTURE_BANK.concepts.map((c) => c.section),
  forms: [
    {
      form: "term",
      counts: { 하: 5, 중: 5, 상: 5 },
      extras: { 하: 1, 중: 1, 상: 0 },
    },
    {
      form: "figure",
      counts: { 하: 1, 중: 1, 상: 0 },
      extras: { 하: 0, 중: 0, 상: 0 },
    },
  ],
  title: "합동과 대칭",
  date: "2026-10-01",
};

function call(query: Record<string, string | string[] | undefined>) {
  return ConceptBlankPrintPage({ searchParams: Promise.resolve(query) });
}

const line = FIXTURE_BANK.concepts.find((entry) => entry.id === "fx-line")!;
const property = FIXTURE_BANK.concepts.find(
  (entry) => entry.id === "fx-line-prop",
)!;
const ox = FIXTURE_BANK.ox[0];
const EXACT_PICKS: ConceptBlankPick[] = [
  {
    blankSectionKey: property.section,
    entryKind: "concept",
    entryId: property.id,
    form: "term",
    level: property.level,
  },
  {
    blankSectionKey: ox.section,
    entryKind: "ox",
    entryId: ox.id,
    form: "term",
    level: ox.level,
  },
  {
    blankSectionKey: line.section,
    entryKind: "concept",
    entryId: line.id,
    form: "term",
    level: line.level,
  },
  {
    blankSectionKey: line.section,
    entryKind: "concept",
    entryId: line.id,
    form: "cloze",
    level: line.level,
  },
];

/** 돌려받은 트리에서 `ConceptBlankPaper` 요소를 찾는다. */
function findPaper(node: unknown): ReactElement<ConceptBlankPaperProps> | null {
  if (!isValidElement(node)) return null;
  if (node.type === ConceptBlankPaper)
    return node as ReactElement<ConceptBlankPaperProps>;
  const children = (node.props as { children?: unknown }).children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const hit = findPaper(child);
    if (hit) return hit;
  }
  return null;
}

beforeEach(() => {
  mocks.session.mockReset();
  mocks.artifact.mockReset();
});

describe("/concept-blank/print", () => {
  it("reprints the authorized frozen artifact by p, ignoring a different or invalid s selection", async () => {
    mocks.session.mockResolvedValue(OWNER);
    mocks.artifact.mockResolvedValue({
      version: 1,
      css: ".frozen{}" + " ".repeat(5_600_000),
      pages: [
        { part: "student", number: 1, html: "<div>인쇄 때 저장한 내용</div>" },
      ],
    });
    const id = "00000000-0000-4000-8000-000000000001";
    const page = await call({
      p: id,
      s: "invalid-current-selection",
      view: "student",
      print: "1",
    });
    expect(JSON.stringify(page)).not.toContain(".frozen{}");
    // Upper-bound both SSR markup and the serialized element payload; neither carries CSS.
    expect(
      Buffer.byteLength(renderToStaticMarkup(page)) +
        Buffer.byteLength(JSON.stringify(page)),
    ).toBeLessThan(1_000_000);
    expect(JSON.stringify(page)).toContain("format=css");
    expect(findPaper(page)).toBeNull();
    expect(JSON.stringify(page)).toContain("인쇄 때 저장한 내용");
    expect(mocks.artifact).toHaveBeenCalledWith(
      { kind: "teacher", id: OWNER.id },
      id,
      "student",
      expect.anything(),
    );
  });
  it("does not replace an unavailable saved issue with today's bank", async () => {
    mocks.session.mockResolvedValue(OWNER);
    mocks.artifact.mockRejectedValue(
      Object.assign(new Error("저장된 지면을 읽지 못했습니다."), {
        status: 503,
      }),
    );
    const page = await call({
      p: "00000000-0000-4000-8000-000000000001",
      s: encodeSelection(SELECTION),
    });
    expect(findPaper(page)).toBeNull();
    expect(JSON.stringify(page)).toContain("저장된 지면을 읽지 못했습니다.");
  });
  it.each([false, true])(
    "denies direct print access with no effective menu, admin=%s",
    async (isAdmin) => {
      mocks.session.mockResolvedValue({
        ...OWNER,
        isAdmin,
        isSuperAdmin: isAdmin,
        menus: [],
      });
      await expect(call({ s: encodeSelection(SELECTION) })).rejects.toThrow(
        "NOT_FOUND",
      );
    },
  );
  it("세션이 없으면 /login 으로", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(call({ s: encodeSelection(SELECTION) })).rejects.toThrow(
      "REDIRECT /login",
    );
  });

  it.each([
    ["없음", undefined],
    ["깨진 글", "%%%"],
    ["계약 밖", btoa(JSON.stringify({ sections: [], forms: [] }))],
  ])("?s= 가 틀리면(%s) «주소를 확인해 주세요» 한 줄", async (_, s) => {
    mocks.session.mockResolvedValue(OWNER);
    const page = (await call({ s })) as ReactElement<{ children: string }>;
    expect(findPaper(page)).toBeNull();
    expect(page.props.children).toBe("주소를 확인해 주세요.");
  });

  it("맞는 주소면 고정 합치기 결과를 지면에 — 같은 주소 = 같은 지면", async () => {
    mocks.session.mockResolvedValue(OWNER);
    const paper = findPaper(await call({ s: encodeSelection(SELECTION) }));
    expect(paper).not.toBeNull();
    expect(paper!.props.view).toBe("both");
    expect(paper!.props.sheets).toEqual(composeSheets(SELECTION, FIXTURE_BANK));
    expect(paper!.props.sheets.map((s) => s.form)).toEqual(["term", "figure"]);
    const again = findPaper(await call({ s: encodeSelection(SELECTION) }));
    expect(JSON.stringify(again!.props.sheets)).toBe(
      JSON.stringify(paper!.props.sheets),
    );
  });

  it("지면 코드(cb-code)를 같이 넘긴다 — 같은 은행으로 묶은 코드 · 제목 · 날짜와 상관없이 같다", async () => {
    mocks.session.mockResolvedValue(OWNER);
    const paper = findPaper(await call({ s: encodeSelection(SELECTION) }));
    expect(paper!.props.code).toBe(encodeSheetCode(SELECTION, FIXTURE_BANK));
    const renamed = findPaper(
      await call({
        s: encodeSelection({
          ...SELECTION,
          title: "다른 제목",
          date: undefined,
        }),
      }),
    );
    expect(renamed!.props.code).toBe(paper!.props.code);
  });

  it.each([false, true])(
    "prints exact picks in their original order, with title/date and no sheet code (compressed=%s)",
    async (compressed) => {
      mocks.session.mockResolvedValue(OWNER);
      const selection = {
        ...selectionFromPicks(EXACT_PICKS, "직접 고른 개념"),
        date: "2026-11-12",
      };
      const encoded = encodeSelection(selection);
      const code = compressed
        ? `z1.${Buffer.from(zlibSync(Buffer.from(encoded, "base64url"))).toString("base64url")}`
        : encoded;
      const paper = findPaper(await call({ s: code, view: "student" }));
      expect(paper).not.toBeNull();
      expect(paper!.props.code).toBeUndefined();
      expect(paper!.props.view).toBe("student");
      expect(paper!.props.sheets).toEqual(
        composeSheets(selection, FIXTURE_BANK),
      );
      const [term] = paper!.props.sheets;
      expect(term.form === "term" && term.entryOrder).toEqual([
        { entryKind: "concept", entryId: property.id },
        { entryKind: "ox", entryId: ox.id },
        { entryKind: "concept", entryId: line.id },
      ]);
      expect(paper!.props.sheets.map((sheet) => sheet.header)).toEqual([
        expect.objectContaining({
          title: selection.title,
          date: selection.date,
        }),
        expect.objectContaining({
          title: selection.title,
          date: selection.date,
        }),
      ]);
      const again = findPaper(await call({ s: code }));
      expect(again!.props.sheets).toEqual(paper!.props.sheets);
    },
  );

  it.each([
    ["missing bank ID", { entryId: "no-longer-in-bank" }],
    ["changed bank level", { level: "하" as const }],
    [
      "changed bank section",
      { blankSectionKey: FIXTURE_BANK.concepts[0].section },
    ],
    [
      "missing curriculum section",
      { blankSectionKey: "초5::없는 단원::없는 소단원" },
    ],
  ])(
    "shows a clear notice for %s instead of rendering or throwing",
    async (_, change) => {
      mocks.session.mockResolvedValue(OWNER);
      const selection = selectionFromPicks([{ ...EXACT_PICKS[0], ...change }]);
      const page = (await call({
        s: encodeSelection(selection),
        print: "1",
      })) as ReactElement<{ role: string; children: string }>;
      expect(findPaper(page)).toBeNull();
      expect(page.props.role).toBe("alert");
      expect(page.props.children).toMatch(/선택한 문항.*확인할 수 없습니다/);
      expect(page.props.children).toMatch(/다시 골라/);
    },
  );

  it("나무에 없는 소단원뿐이라 지면이 없으면 코드도 없다(던지지 않는다)", async () => {
    mocks.session.mockResolvedValue(OWNER);
    const paper = findPaper(
      await call({
        s: encodeSelection({
          ...SELECTION,
          sections: ["초5::없는 단원::없는 소단원"],
        }),
      }),
    );
    expect(paper!.props.sheets).toEqual([]);
    expect(paper!.props.code).toBeUndefined();
  });

  it.each([
    ["student", "student"],
    ["key", "key"],
    ["both", "both"],
    ["teacher", "both"],
    [undefined, "both"],
  ] as const)("?view=%s → %s", async (view, expected) => {
    mocks.session.mockResolvedValue(OWNER);
    const paper = findPaper(
      await call({ s: encodeSelection(SELECTION), view }),
    );
    expect(paper!.props.view).toBe(expected);
  });

  it("print=1 defers automatic printing until issuance or the unchanged-paper fallback finishes", async () => {
    mocks.session.mockResolvedValue(OWNER);
    const has = (node: unknown): boolean => {
      if (!isValidElement(node)) return false;
      if (node.type === PrintNow)
        throw new Error("Must not print before issuance finishes");
      if (node.type === IssuePrint)
        return (node.props as { autoPrint: boolean }).autoPrint;
      const children = (node.props as { children?: unknown }).children;
      return (Array.isArray(children) ? children : [children]).some(has);
    };
    expect(has(await call({ s: encodeSelection(SELECTION), print: "1" }))).toBe(
      true,
    );
    expect(has(await call({ s: encodeSelection(SELECTION) }))).toBe(false);
  });
});
