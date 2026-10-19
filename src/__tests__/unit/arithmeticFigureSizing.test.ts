import { expect, it } from "vitest";
import {
  figurePrintWidthPx,
  figureWidthStyle,
  parseFigureDimensions,
} from "@/lib/figurePrintSize";

it("uses the same larger arithmetic frame for rendering and pagination while retaining ordinary figure caps", () => {
  const url = (marker: string, height = 240) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg viewBox="0 0 240 ${height}"><desc>${marker}</desc></svg>`)}`;
  for (const height of [240, 480]) {
    const [figure] = parseFigureDimensions(
      1,
      [],
      [],
      [url("arithmetic-geometry-presentation-v1", height)],
    );
    const width = height === 240 ? 280 : 140;
    expect(figurePrintWidthPx(figure!)).toBeCloseTo(width);
    expect(figureWidthStyle(figure!.sourceMm, figure!.maxWidthMm)).toEqual({
      width: `${((width * 25.4) / 96).toFixed(2)}mm`,
    });
  }
  expect(figureWidthStyle(120)).toEqual({ width: "70.00mm" });
  const [legacy] = parseFigureDimensions(
    1,
    [],
    [],
    [url("arithmetic-geometry-drill-v1")],
  );
  expect(figurePrintWidthPx(legacy!)).toBeCloseTo(216);
});
