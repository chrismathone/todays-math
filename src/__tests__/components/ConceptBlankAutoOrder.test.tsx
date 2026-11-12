import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import {
  CONCEPT_BLANK_FORM_LABELS,
  type ConceptBlankForm,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import {
  saveDocumentSchema,
  type PrivateDocument,
} from "@/contracts/privateWorkspace.contract";
import { composeSheets } from "@/lib/concept-blank/compose";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { pickPool } from "@/lib/concept-blank/manualPick";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";

// Capture the complete sheets and code passed to preview, without PaperStrip layout.
vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: ({ sheets, code }: ConceptBlankPaperProps) => (
    <pre data-testid="preview" data-code={code}>
      {JSON.stringify(sheets)}
    </pre>
  ),
}));

const sections = [
  ...new Set(FIXTURE_BANK.concepts.map((entry) => entry.section)),
];
const orders: { label: string; forms: ConceptBlankForm[] }[] = [
  { label: "C→B", forms: ["cloze", "term"] },
  { label: "E→D→C→B→A", forms: ["figure", "map", "cloze", "term", "recall"] },
];
const restores = [
  "주소 새로고침",
  "저장 후 주소 새로고침",
  "저장 후 내 시험지에서 재열기",
] as const;

function printSelection(): ConceptBlankSelection {
  const url = new URL(
    screen.getByRole("link", { name: "인쇄하기" }).getAttribute("href")!,
    "http://localhost",
  );
  expect(url.pathname).toBe("/concept-blank/print");
  expect(url.searchParams.get("view")).toBe("both");
  const selection = decodeSelection(url.searchParams.get("s"));
  expect(selection).not.toBeNull();
  return selection!;
}

const previewSheets = () =>
  JSON.parse(screen.getByTestId("preview").textContent!);

function cloud() {
  const documents = new Map<string, PrivateDocument>();
  const writes: ConceptBlankSelection[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const id = decodeURIComponent(String(input).split("/").pop()!);
      if (init?.method === "PUT") {
        const body = saveDocumentSchema.parse(JSON.parse(String(init.body)));
        const selection = body.payload.selection as ConceptBlankSelection;
        writes.push(selection);
        documents.set(id, {
          id,
          kind: body.kind,
          title: body.title,
          payload: body.payload,
          visibility: "private",
          sharedBranchId: null,
          revision: (body.expectedRevision ?? 0) + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          problemCount: selection.forms.reduce(
            (total, { counts, extras }) =>
              total +
              Object.values(counts).reduce((a, b) => a + b, 0) +
              Object.values(extras).reduce((a, b) => a + b, 0),
            0,
          ),
        });
      }
      const document = documents.get(id);
      return document
        ? Response.json({ data: document })
        : Response.json({ error: { message: "자료 없음" } }, { status: 404 });
    }),
  );
  return writes;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T03:00:00Z"));
  window.history.replaceState(null, "", "/#conceptBlank");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

describe.each(orders)("$label exact 선택을 모두 자동으로 전환", ({ forms }) => {
  it.each(restores)(
    "%s: 형식 순서·지면·코드와 저장 상태를 보존한다",
    async (restore) => {
      const writes = cloud();
      const exact = selectionFromPicks(
        forms.flatMap((form) => {
          const picks = [
            ...pickPool(FIXTURE_BANK, sections, form, "main"),
            ...pickPool(FIXTURE_BANK, sections, form, "extra"),
          ];
          return sections.flatMap((section) =>
            picks.filter((pick) => pick.blankSectionKey === section),
          );
        }),
        "자동 순서 보존",
      );
      window.history.replaceState(
        null,
        "",
        `/?blank=${encodeSelection(exact)}#conceptBlank`,
      );
      const view = render(
        <ConceptBlankView bank={FIXTURE_BANK} storageScope="auto-order-test" />,
      );
      expect(printSelection().forms.map(({ form }) => form)).toEqual(forms);
      expect(printSelection().pick).toEqual(exact.pick);

      for (const form of forms) {
        const mode = within(
          screen.getByRole("group", {
            name: `${CONCEPT_BLANK_FORM_LABELS[form]} 싣는 방법`,
          }),
        );
        expect(mode.getByRole("button", { name: "직접" })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        fireEvent.click(mode.getByRole("button", { name: "자동" }));
      }
      const before = printSelection();
      const sheets = composeSheets(before, FIXTURE_BANK);
      const code = encodeSheetCode(before, FIXTURE_BANK);
      expect(before.forms.map(({ form }) => form)).toEqual(forms);
      expect(before).not.toHaveProperty("pick");
      expect(previewSheets()).toEqual(sheets);
      expect(screen.getByTestId("preview")).toHaveAttribute("data-code", code);

      if (restore !== "주소 새로고침") {
        await act(async () => {
          fireEvent.click(
            screen.getByRole("button", { name: "내 시험지에 저장" }),
          );
        });
        expect(screen.getByRole("button", { name: "저장됨" })).toBeDisabled();
        expect(writes).toHaveLength(1);
        expect(writes[0].forms).toEqual(before.forms);
        expect(writes[0]).not.toHaveProperty("pick");
      }
      const savedUrl = new URL(window.location.href);
      const blank = savedUrl.searchParams.get("blank");
      const documentId = savedUrl.searchParams.get("blankDoc");
      expect(decodeSelection(blank)).toEqual(before);
      view.unmount();

      // A refresh restores from the URL; a library open restores only the document payload.
      if (restore === "저장 후 내 시험지에서 재열기")
        window.history.replaceState(null, "", "/#conceptBlank");
      else window.history.replaceState(null, "", savedUrl);
      await act(async () => {
        render(
          <ConceptBlankView
            bank={FIXTURE_BANK}
            storageScope="auto-order-test"
            openDocument={
              restore === "저장 후 내 시험지에서 재열기"
                ? { id: documentId!, version: 1 }
                : undefined
            }
          />,
        );
      });

      const restored = printSelection();
      expect.soft(restored.forms).toEqual(before.forms);
      expect.soft(restored).not.toHaveProperty("pick");
      expect.soft(composeSheets(restored, FIXTURE_BANK)).toEqual(sheets);
      expect.soft(previewSheets()).toEqual(sheets);
      expect.soft(encodeSheetCode(restored, FIXTURE_BANK)).toBe(code);
      expect
        .soft(screen.getByTestId("preview"))
        .toHaveAttribute("data-code", code);
      expect
        .soft(new URL(window.location.href).searchParams.get("blank"))
        .toBe(blank);
      if (restore !== "주소 새로고침") {
        expect
          .soft(screen.queryByRole("button", { name: "저장됨" }))
          .toBeDisabled();
        expect.soft(writes).toHaveLength(1);
      }
    },
  );
});
