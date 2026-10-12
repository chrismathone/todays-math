import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";
import { englishWorksheetProblem } from "@/components/english/englishWorksheetAdapter";
import { bankUiItem } from "../fixtures/englishBankUi";
const layout = vi.hoisted(() => ({ scale: 0.8 }));
vi.mock("@/components/unified/print/useMeasuredPages", () => ({
  useMeasuredPages: () => ({
    pages: [{ indices: [0], scales: [layout.scale] }],
    ready: true,
    layoutError: false,
    fontError: false,
    fontStyle: {},
    measureNode: null,
  }),
}));
afterEach(() => vi.unstubAllGlobals());
describe("English worksheet oversized block guard", () => {
  it("blocks English oversized output and allows a fitting layout", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollTo = vi.fn();
    const selected = [englishWorksheetProblem(bankUiItem(0), 1, true)];
    const ready = vi.fn();
    const props = {
      selected,
      title: "English",
      options: DEFAULT_PRINT_OPTIONS,
      printMeta: DEFAULT_PRINT_META,
      onReady: ready,
    };
    const { rerender } = render(<WorksheetPrint {...props} />);
    expect(
      screen.getByText(/영어 지문 또는 문항이 있어 출력을 멈췄습니다/),
    ).toBeVisible();
    expect(ready).toHaveBeenLastCalledWith(false);
    layout.scale = 1;
    rerender(<WorksheetPrint {...props} />);
    await waitFor(() => expect(ready).toHaveBeenLastCalledWith(true));
  });
});
