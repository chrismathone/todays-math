import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import GradePrint from "@/app/dev/arithmetic/grade-print/page";
import { ArithmeticPackUnavailable } from "@/lib/arithmetic-v2/presentation/packAssets";

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: vi.fn(),
}));

it("fails a cold grade print with a missing traced pack, then renders when the files are available", async () => {
  const params = () =>
    Promise.resolve({ type: "m2-right-triangle-height", count: "5" });
  const cwd = vi
    .spyOn(process, "cwd")
    .mockReturnValueOnce(resolve(".next/arithmetic-missing-trace-fixture"));
  try {
    await expect(GradePrint({ searchParams: params() })).rejects.toBeInstanceOf(
      ArithmeticPackUnavailable,
    );
  } finally {
    cwd.mockRestore();
  }
  const html = renderToStaticMarkup(
    await GradePrint({ searchParams: params() }),
  );
  expect(html).toContain("arithmetic-geometry-presentation-v1");
});
