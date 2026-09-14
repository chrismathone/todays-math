import { expect, test } from "@playwright/test";
import type { HwpxPage } from "../../src/lib/export/hwpxLayout";

for (const style of ["blank", "ruled", "chalkboard"])
  test(`HWPX keeps ${style} solving artwork beside one editable text column`, async ({
    page,
  }, testInfo) => {
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.hostname === "127.0.0.1" || url.protocol === "data:"
        ? route.continue()
        : route.abort();
    });
    await page.goto("/?native");
    await page.getByRole("button", { name: "1단", exact: true }).click();
    await page
      .getByRole("combobox", { name: "오른쪽 풀이 공간", exact: true })
      .selectOption(style);
    await expect(
      page.getByRole("button", { name: "HWPX 내보내기", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("combobox", { name: "미리보기 확대" })
      .selectOption("1");
    const result = await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>(
        "[data-mathgen-document]",
      )!;
      const expected = [...root.querySelectorAll("[data-unified-paper]")].map(
        (paper) => {
          if (paper.getAttribute("data-page-kind") !== "questions") return null;
          const bounds = paper.getBoundingClientRect();
          const question = paper
            .querySelector("[data-question-column]")!
            .getBoundingClientRect();
          const workspace = paper
            .querySelector("[data-solving-area]")!
            .getBoundingClientRect();
          return {
            x: question.x - bounds.x,
            width: question.width,
            workspaceX: workspace.x - bounds.x,
          };
        },
      );
      const collect = (
        window as unknown as {
          collectHwpxLayout: (
            root: HTMLElement,
          ) => Promise<{ pages: HwpxPage[]; assets: Record<string, Blob> }>;
        }
      ).collectHwpxLayout;
      const layout = await collect(root);
      return {
        expected,
        pages: layout.pages,
        assets: Object.keys(layout.assets),
      };
    });
    expect(result.pages).toHaveLength(result.expected.length);
    expect(result.assets.length).toBeGreaterThanOrEqual(
      result.expected.filter(Boolean).length,
    );
    for (const [index, output] of result.pages.entries()) {
      expect(output.body?.columns).toBe(1);
      expect(output.body?.gap).toBe(0);
      const expected = result.expected[index];
      if (!expected) continue;
      expect(output.body!.w).toBeCloseTo(expected.width, 1);
      expect(output.body!.x).toBeCloseTo(expected.x, 1);
      expect(
        output.objects.some(
          (object) =>
            object.type === "image" && object.x >= expected.workspaceX,
        ),
      ).toBe(true);
    }
    await testInfo.attach("hwpx-layout", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });
