/** Real final production projection, compared with the captured original display. */
import "../init-arithmetic-packs";
import { writeFileSync, readFileSync } from "node:fs";
import { getArithmeticV2Definition } from "../../../src/lib/arithmetic-v2/registry";
import { arithmeticGeometryCatalogSvg } from "../../../src/lib/arithmetic-v2/geometry";
import {
  figureFirstSvg,
  figureFirstLines,
} from "../../../src/lib/arithmetic-v2/presentation/figureFirst";
import { arithmeticGeometryDisplaySize } from "../../../src/lib/arithmetic-v2/presentation";
import {
  figureSvgUrlPrintMm,
  figureWidthStyle,
} from "../../../src/lib/figurePrintSize";
import sharp from "sharp";
const d = getArithmeticV2Definition("m2-trapezoid-diagonal-midpoints");
const c = d.problemAt(6);
if (c.prompt.layout !== "math") throw Error();
const source = arithmeticGeometryCatalogSvg(c.prompt.figureId!);
const out = "docs/planning/tracks/reports/arithmetic-figure-quality-20261112";
const before = readFileSync(`${out}/reported-before.svg`, "utf8");
const after = figureFirstSvg(d.id, c.prompt, source)!;
writeFileSync(
  `${out}/reported-case.json`,
  JSON.stringify(
    { typeId: d.id, ...c, lines: figureFirstLines(d.id, c.prompt) },
    null,
    2,
  ),
);
writeFileSync(`${out}/reported-after.svg`, after);
async function main() {
  const sizes = [];
  for (const [name, svg] of [
    ["before", before],
    ["after", after],
  ]) {
    const screen = arithmeticGeometryDisplaySize(svg),
      print = figureSvgUrlPrintMm(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
      )!;
    const mm = parseFloat(
      figureWidthStyle(print.widthMm, print.maxWidthMm)!.width,
    );
    const printSize = {
      width: (mm * 96) / 25.4,
      height: (((mm * 96) / 25.4) * print.height) / print.width,
    };
    sizes.push({
      name,
      screen,
      print: { widthMm: mm, heightMm: (mm * print.height) / print.width },
    });
    for (const [size, dim] of [
      ["screen", screen],
      ["paper", printSize],
    ] as const)
      await sharp(Buffer.from(svg))
        .resize({
          width: Math.round(dim.width),
          height: Math.round(dim.height),
        })
        .png()
        .toFile(`${out}/reported-${name}-${size}.png`);
  }
  writeFileSync(`${out}/reported-sizes.json`, JSON.stringify(sizes, null, 2));
}
main();
