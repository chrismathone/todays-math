import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import GradeWorkbench from "@/components/arithmetic/GradeArithmeticWorkbench";
import LegacyWorkbench from "@/components/arithmetic/LegacyArithmeticWorkbench";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";
import type { ArithmeticWorkflow } from "@/components/arithmetic/ArithmeticWorkflow";
import type { ArithmeticRegenerationTarget } from "@/lib/arithmeticRegeneration";
import {
  regenerateArithmeticItems,
  regenerateArithmeticV2Items,
} from "@/lib/arithmeticRegeneration";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2/catalog";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import type { ArithmeticOutputSheet } from "@/lib/arithmeticOutput";

// The root owns review controls. Test the callback boundary independently of
// button labels, pagination and the concurrently changing review component.
type WorkflowProps = Omit<
  ComponentProps<typeof ArithmeticWorkflow>,
  "onRegenerate"
> & {
  onRegenerate: (target?: ArithmeticRegenerationTarget) => void;
};
let latest: WorkflowProps;
vi.mock("@/components/arithmetic/ArithmeticWorkflow", () => ({
  ArithmeticWorkflow: (props: WorkflowProps) => {
    latest = props;
    return (
      <div>
        <div data-testid="sheet">{JSON.stringify(props.sheet)}</div>
        <div data-testid="dirty">{String(props.dirty)}</div>
        <button
          disabled={props.busy}
          onClick={() => props.onRegenerate({ round: 2, orders: [1, 3] })}
        >
          Target
        </button>
        <button disabled={props.busy} onClick={() => props.onRegenerate()}>
          All
        </button>
        {props.children}
      </div>
    );
  },
}));

const versions = [
  {
    name: "geometry",
    Component: GradeWorkbench,
    build: () =>
      buildArithmeticV2Sheet({
        engineVersion: "arithmetic-engine-v2",
        catalogVersion: "arithmetic-catalog-v2",
        seed: "saved-geometry",
        rounds: [1, 2].map(() => ({
          allocations: [
            { typeId: "e6-circle-area-radius", count: 2 },
            { typeId: "m2-incenter-central-angle", count: 1 },
          ],
        })),
      }),
  },
  {
    name: "legacy",
    Component: LegacyWorkbench,
    build: () =>
      buildArithmeticSheet({
        engineVersion: "arithmetic-engine-v1",
        catalogVersion: "arithmetic-catalog-v1",
        seed: "saved-v1",
        rounds: [1, 2].map(() => ({
          skills: [
            {
              skillId: "times-table",
              count: 3,
              constraints: { dans: [3], multiplier: { min: 1, max: 9 } },
            },
          ],
        })),
      }),
  },
  {
    name: "grade",
    Component: GradeWorkbench,
    build: () =>
      buildArithmeticV2Sheet({
        engineVersion: "arithmetic-engine-v2",
        catalogVersion: "arithmetic-catalog-v2",
        seed: "saved-v2",
        rounds: [1, 2].map(() => ({
          allocations: [{ typeId: listArithmeticV2Types()[0].id, count: 3 }],
        })),
      }),
  },
];
const documentFor = (sheet: ArithmeticOutputSheet): PrivateDocument => ({
  id: "saved-document",
  kind: "arithmeticSheet",
  title: "보존할 제목",
  payload: sheet,
  revision: 4,
  problemCount: 6,
  createdAt: "2026-10-15",
  updatedAt: "2026-10-15",
});
let fail = false;
let noChange = false;
let release: (() => void) | undefined;
let delay = false;
beforeEach(() => {
  // 숫자 변경 분기를 검증한다. 무작위 seed는 자리만 교환하는 정상 분기를 고르기도 한다.
  vi.spyOn(crypto, "randomUUID").mockReturnValue(
    "00000000-0000-4000-8000-000000000019",
  );
  fail = false;
  noChange = false;
  delay = false;
  release = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (url, init) => {
      const grade = String(url).includes("/v2/");
      if (String(url).endsWith("/catalog"))
        return Response.json({
          data: {
            engineVersion: grade
              ? "arithmetic-engine-v2"
              : "arithmetic-engine-v1",
            catalogVersion: grade
              ? "arithmetic-catalog-v2"
              : "arithmetic-catalog-v1",
            writerEnabled: true,
            ...(grade ? { types: listArithmeticV2Types() } : {}),
          },
        });
      if (String(url).endsWith("/regenerate")) {
        if (delay)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        if (fail)
          return Response.json(
            { error: { message: "선택 변경 거절" } },
            { status: 403 },
          );
        const { sheet, target, seed } = JSON.parse(String(init?.body));
        const result = noChange
          ? {
              sheet,
              round: target.round,
              changedOrders: [],
              unchangedOrders: target.orders,
            }
          : grade
            ? regenerateArithmeticV2Items(sheet, target, seed)
            : regenerateArithmeticItems(sheet, target, seed);
        return Response.json({ data: result });
      }
      if (String(url).endsWith("/generate"))
        return Response.json({
          data: grade
            ? buildArithmeticV2Sheet(JSON.parse(String(init?.body)))
            : buildArithmeticSheet(JSON.parse(String(init?.body))),
        });
      return Response.json({ data: [] });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(versions)(
  "$name regeneration callbacks",
  ({ Component, build }) => {
    async function open(preview = false) {
      const sheet = build();
      sheet.presentation = defaultArithmeticPresentation("보존할 학원");
      vi.spyOn(PrivateCloudClient.prototype, "get").mockResolvedValue(
        documentFor(sheet),
      );
      const save = vi.spyOn(PrivateCloudClient.prototype, "save");
      render(
        <Component
          canOutput
          storageScope="teacher"
          initialDocumentId="saved-document"
          preview={preview}
        />,
      );
      await waitFor(() =>
        expect(screen.getByTestId("dirty").textContent).toBe("false"),
      );
      await waitFor(() => expect(latest.sheet).toBeDefined());
      return { save, sheet: latest.sheet! };
    }
    it("routes target orders to the authorized API and preserves all other state without autosave", async () => {
      const { save, sheet } = await open();
      const presentation = latest.presentation;
      await act(async () => {
        fireEvent.click(screen.getByText("Target"));
      });
      await waitFor(() =>
        expect(screen.getByRole("status").textContent).toContain(
          "2문항의 숫자를 바꿨습니다",
        ),
      );
      const calls = vi
        .mocked(fetch)
        .mock.calls.filter(([url]) => String(url).endsWith("/regenerate"));
      expect(calls).toHaveLength(1);
      expect(JSON.parse(String(calls[0][1]?.body))).toMatchObject({
        target: { round: 2, orders: [1, 3] },
        sheet,
      });
      expect(latest.sheet!.rounds[0]).toBe(sheet.rounds[0]);
      expect(latest.sheet!.rounds[1].items[1]).toBe(sheet.rounds[1].items[1]);
      if (latest.sheet!.payloadVersion === 2) {
        expect(reopenArithmeticV2Sheet(latest.sheet)).toEqual(latest.sheet);
        if (sheet.payloadVersion === 2 && sheet.figures?.version === 2)
          expect(latest.sheet!.figures).not.toEqual(sheet.figures);
      }
      expect(latest.title).toBe("보존할 제목");
      expect(latest.presentation).toBe(presentation);
      expect(latest.dirty).toBe(true);
      expect(save).not.toHaveBeenCalled();
    });
    it("keeps unchanged results clean and shows continuous display numbers", async () => {
      const { save, sheet } = await open();
      noChange = true;
      await act(async () => {
        fireEvent.click(screen.getByText("Target"));
      });
      await waitFor(() =>
        expect(screen.getByRole("status").textContent).toContain(
          "2회차 4, 6번",
        ),
      );
      expect(latest.sheet).toBe(sheet);
      expect(latest.dirty).toBe(false);
      expect(save).not.toHaveBeenCalled();
    });
    it("preserves state after authorization errors and prevents concurrent requests", async () => {
      const { save, sheet } = await open();
      fail = true;
      delay = true;
      await act(async () => {
        latest.onRegenerate({ round: 2, orders: [1] });
        latest.onRegenerate({ round: 2, orders: [3] });
      });
      await waitFor(() => expect(release).toBeDefined());
      expect(
        vi
          .mocked(fetch)
          .mock.calls.filter(([url]) => String(url).endsWith("/regenerate")),
      ).toHaveLength(1);
      await act(async () => {
        release!();
      });
      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "선택 변경 거절",
        ),
      );
      expect(latest.sheet).toBe(sheet);
      expect(latest.dirty).toBe(false);
      expect(latest.busy).toBe(false);
      expect(save).not.toHaveBeenCalled();
    });
    it("keeps undefined on the existing all-regenerate route", async () => {
      const { save } = await open();
      await act(async () => {
        fireEvent.click(screen.getByText("All"));
      });
      await waitFor(() =>
        expect(
          vi
            .mocked(fetch)
            .mock.calls.filter(([url]) => String(url).endsWith("/generate")),
        ).toHaveLength(1),
      );
      expect(
        vi
          .mocked(fetch)
          .mock.calls.filter(([url]) => String(url).endsWith("/regenerate")),
      ).toHaveLength(0);
      expect(save).not.toHaveBeenCalled();
    });
    it("regenerates previews locally without requesting the API or saving", async () => {
      const { save, sheet } = await open(true);
      await act(async () => {
        fireEvent.click(screen.getByText("Target"));
      });
      await waitFor(() =>
        expect(screen.getByRole("status").textContent).toContain(
          "2문항의 숫자를 바꿨습니다",
        ),
      );
      expect(latest.sheet!.rounds[0]).toBe(sheet.rounds[0]);
      expect(fetch).not.toHaveBeenCalled();
      if (latest.sheet!.payloadVersion === 2)
        expect(reopenArithmeticV2Sheet(latest.sheet)).toEqual(latest.sheet);
      expect(save).not.toHaveBeenCalled();
    });
  },
);
