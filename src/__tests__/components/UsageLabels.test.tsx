import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useUsageLabels } from "@/components/usage-labels/useUsageLabels";
import UsageLabel from "@/components/usage-labels/UsageLabel";
import { assembleUsageLabels } from "@/lib/usageLabels/assemble";

const id = (index: number) =>
  `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`;
function response(ids: string[]) {
  return assembleUsageLabels({
    viewer: { id: "teacher" },
    period: "30d",
    now: new Date("2026-10-14T00:00:00Z"),
    problemIds: ids,
    arithmeticTypes: [],
    arithmetic: null,
    problems: {
      complete: true,
      records: ids.map((problemId) => ({
        id: problemId,
        visible: true,
        eligible: true,
        ineligibleCode: null,
        unit: {
          id: id(999),
          grade: "초3",
          chapter: "덧셈",
          section: "받아올림",
        },
      })),
      uses: ids.map((problemId, index) => ({
        problemId,
        testCount: 8 - index,
      })),
    },
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
});

it("batches visible IDs and ignores an obsolete response after selection changes", async () => {
  const resolvers: ((value: Response) => void)[] = [];
  const fetcher = vi.fn<typeof fetch>(
    () => new Promise((resolve) => resolvers.push(resolve)),
  );
  vi.stubGlobal("fetch", fetcher);
  const hook = renderHook(({ ids }) => useUsageLabels({ problemIds: ids }), {
    initialProps: { ids: [id(1), id(1), "local-crop", id(2)] },
  });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).problemIds).toEqual(
    [id(1), id(2)],
  );
  hook.rerender({ ids: [id(3), id(4)] });
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await act(async () => {
    resolvers[1](Response.json(response([id(3), id(4)])));
  });
  await waitFor(() =>
    expect(hook.result.current.problems.has(id(3))).toBe(true),
  );
  await act(async () => {
    resolvers[0](Response.json(response([id(1), id(2)])));
  });
  expect(hook.result.current.problems.has(id(1))).toBe(false);
  const current = hook.result.current.problems.get(id(3));
  render(
    <UsageLabel
      item={current}
      kind="problem"
      note={hook.result.current.period?.note}
    />,
  );
  expect(screen.getByText("내 출제 1위")).toHaveAttribute(
    "title",
    expect.stringContaining("차시 받아올림"),
  );
  expect(screen.getByText("내 출제 1위").getAttribute("title")).toContain(
    "지운 기록은 포함하지 않는다",
  );
});

it("splits more than 100 IDs and never turns failed data into zero usage or a rank", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ error: "unavailable" }, { status: 503 }),
  );
  vi.stubGlobal("fetch", fetcher);
  const hook = renderHook(() =>
    useUsageLabels({
      problemIds: Array.from({ length: 120 }, (_, i) => id(i + 1)),
    }),
  );
  await waitFor(() => expect(hook.result.current.unavailable).toBe(true));
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    fetcher.mock.calls.map(
      (call) => JSON.parse(String(call[1]?.body)).problemIds.length,
    ),
  ).toEqual([100, 20]);
  expect(hook.result.current.problems.size).toBe(0);
  const view = render(<UsageLabel item={undefined} kind="problem" />);
  expect(view.container.textContent).toBe("");
});
