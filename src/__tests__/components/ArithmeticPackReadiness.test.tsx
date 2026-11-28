import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminArithmeticPreview from "@/components/admin/AdminArithmeticPreview";
import ArithmeticGeneratedWorkflow from "@/components/arithmetic/ArithmeticGeneratedWorkflow";
import { GradeArithmeticExpression } from "@/components/arithmetic/GradeArithmeticPrompt";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  buildArithmeticV2Sheet,
  getArithmeticV2Definition,
} from "@/lib/arithmetic-v2";
import {
  installArithmeticPackReader,
  isPackName,
} from "@/lib/arithmetic-v2/presentation/packAssets";
import { readNodeArithmeticPack } from "@/lib/arithmetic-v2/presentation/packAssets.node";

const makeSheet = (typeId: string) =>
  buildArithmeticV2Sheet({
    engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
    seed: "pack-boundary",
    rounds: [{ allocations: [{ typeId, count: 1 }] }],
  });

function packResponse(url: string) {
  const { searchParams } = new URL(url, "http://localhost");
  const pack = searchParams.get("pack") ?? "";
  const family = searchParams.get("family") ?? "";
  if (!isPackName(pack)) throw new Error("Unexpected pack request");
  return Response.json({
    pack,
    family,
    data: readNodeArithmeticPack(pack, family),
  });
}

beforeEach(() => installArithmeticPackReader(undefined));
afterEach(() => {
  installArithmeticPackReader(readNodeArithmeticPack);
  vi.unstubAllGlobals();
});

it("holds an admin preview while pending, refuses a mismatched response and retries", async () => {
  const release = Promise.withResolvers<void>();
  const fetch = vi.fn(async (url: string) => {
    await release.promise;
    const body = await packResponse(url).json();
    return Response.json({ ...body, family: "wrong-family" });
  });
  vi.stubGlobal("fetch", fetch);
  const sheet = makeSheet("m2-right-triangle-height");
  render(
    <AdminArithmeticPreview
      document={{
        id: "fixture",
        kind: "arithmeticSheet",
        title: "관리자 시험지",
        revision: 1,
        createdAt: "2026-11-28T00:00:00Z",
        updatedAt: "2026-11-28T00:00:00Z",
        payload: sheet,
      }}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  expect(screen.queryByRole("heading", { name: "관리자 시험지" })).toBeNull();
  release.resolve();
  expect(
    await screen.findByRole("alert", {}, { timeout: 2_000 }),
  ).toHaveTextContent("불러오지 못했습니다");
  fetch.mockImplementation(async (url) => packResponse(url));
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(
    (await screen.findAllByRole("heading", { name: "관리자 시험지" }))[0],
  ).toBeVisible();
  expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
});

it("holds the worksheet and its save and print actions until a failed pack load is retried", async () => {
  const release = Promise.withResolvers<void>();
  const fetch = vi.fn<(url: string) => Promise<Response>>(async () => {
    await release.promise;
    return new Response(null, { status: 503 });
  });
  vi.stubGlobal("fetch", fetch);
  const sheet = makeSheet("e5-rectangle-perimeter");
  const save = vi.fn();
  render(
    <ArithmeticGeneratedWorkflow
      sheet={sheet}
      step="output"
      title="복원한 시험지"
      setTitle={vi.fn()}
      setStep={vi.fn()}
      canOutput
      canSave
      canRegenerate
      dirty
      busy={false}
      onSave={save}
      onRegenerate={vi.fn()}
      onPresentationChange={vi.fn()}
      showAnswers={false}
      onToggleAnswers={vi.fn()}
    >
      범위 설정
    </ArithmeticGeneratedWorkflow>,
  );
  const saveButton = () =>
    screen.queryByRole("button", { name: "내 시험지에 저장" });
  expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  expect(saveButton()).toBeNull();
  expect(
    screen.queryByRole("button", { name: /인쇄|HWPX 내보내기/ }),
  ).toBeNull();
  release.resolve();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "불러오지 못했습니다",
  );
  expect(save).not.toHaveBeenCalled();
  fetch.mockImplementation(async (url) => packResponse(url));
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  const ready = await screen.findByRole("button", { name: "내 시험지에 저장" });
  expect(ready).toBeEnabled();
  fireEvent.click(ready);
  expect(save).toHaveBeenCalledOnce();
});

it("ignores a late failure from a previous catalog example", async () => {
  const first = getArithmeticV2Definition("m2-circum-central-angle");
  const second = getArithmeticV2Definition("m3-trig-area-given-sine");
  const delayed = Promise.withResolvers<Response>();
  const fetch = vi.fn(async (url: string) =>
    url.includes("m2-circum-central-angle")
      ? delayed.promise
      : packResponse(url),
  );
  vi.stubGlobal("fetch", fetch);
  const { rerender } = render(
    <GradeArithmeticExpression
      prompt={first.problemAt(0).prompt}
      typeId={first.id}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  rerender(
    <GradeArithmeticExpression
      prompt={second.problemAt(0).prompt}
      typeId={second.id}
    />,
  );
  const image = await screen.findByRole("img");
  await act(async () => delayed.resolve(new Response(null, { status: 503 })));
  expect(screen.getByRole("img")).toBe(image);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    fetch.mock.calls.filter(([url]) => url.includes("m3-trig-area-given-sine")),
  ).toHaveLength(1);
});
