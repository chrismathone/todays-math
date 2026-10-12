// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyFigure } from "@/lib/figure/missingFigureRule";
import { originNeedsFigure } from "@/lib/figure/transformFigureBlock";
import { loadDbRetryFigures } from "@/lib/import/schoolTextbook/dbRetryFigures";
// Actual captured DB source; the variants below deliberately inject references.
const content =
  "어느 화백이 그린 어떤 그림의 가격이 매년 $5$ %씩 상승한다면 이 그림의 가격이 처음으로 현재 가격의 $2$배 이상이 되는 것은 몇 년 후인지 구하시오. (단, $\\log \\,2=0.3010$, $\\log \\,1.05=0.0212$로 계산한다.)";
describe("painting price growth and actual diagram references", () => {
  it("loads a complete text question without inventing a printed diagram", async () => {
    expect(classifyFigure(content)).toBe("불필요");
    expect(
      originNeedsFigure({ content, figureUrls: [], figureSvg: null }),
    ).toBe(false);
    expect(
      (
        await loadDbRetryFigures({
          content,
          figure_urls: [],
          choice_figure_index: [],
        })
      ).images,
    ).toHaveLength(0);
  });
  it("still requires explicitly supplied or forced figure evidence", async () => {
    expect(
      originNeedsFigure({
        content,
        figureUrls: ["/figures/art.png"],
        figureSvg: null,
      }),
    ).toBe(true);
    await expect(
      loadDbRetryFigures(
        { content, figure_urls: [], choice_figure_index: [] },
        { requireFigures: true },
      ),
    ).rejects.toMatchObject({ code: "missing-evidence" });
  });
  it.each([
    "다음 그림과 같이 ",
    "오른쪽 그림에서 ",
    "그림에서 읽은 가격을 사용하여 ",
    "[그림] ",
    "다음 표에서 ",
  ])("preserves missing referenced evidence %s", async (prefix) => {
    await expect(
      loadDbRetryFigures({
        content: prefix + content,
        figure_urls: [],
        choice_figure_index: [],
      }),
    ).rejects.toMatchObject({ code: "missing-evidence" });
  });
  it("keeps unrelated price labels gated", () => {
    expect(classifyFigure("그림의 가격을 보고 총액을 구하시오.")).toBe("유실");
    expect(
      classifyFigure("화백이 그린 그림의 가격을 보고 총액을 구하시오."),
    ).toBe("유실");
  });
});
