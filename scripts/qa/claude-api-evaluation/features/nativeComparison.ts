/** Browser-free replacement for the comparison compositor, not the figure engine. */
import sharp from "sharp";
import { substituteLabels } from "@/lib/figure/mathjaxSubstitute";
import { validDevAiSvg } from "@/lib/dev-ai/svg";
import { saveImmutable, state } from "./transport";
import assert from "node:assert/strict";
export async function buildNativeComparison(
  original: string,
  svg: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  assert(validDevAiSvg(svg));
  const typeset = substituteLabels(svg);
  assert.deepEqual(typeset.unresolved, []);
  const source = Buffer.from(original.split(",")[1], "base64");
  const fitted = async (input: Buffer) =>
    sharp(input)
      .resize(900, 900, { fit: "contain", background: "white" })
      .png()
      .toBuffer();
  // Sequential raster work; never launches a browser/server or any model.
  const left = await fitted(source);
  const right = await fitted(Buffer.from(typeset.svg));
  const headings = Buffer.from(
    '<svg width="1840" height="50"><g font-family="Arial" font-size="24" text-anchor="middle"><text x="460" y="33">1. ORIGINAL</text><text x="1380" y="33">2. RECONSTRUCTION</text></g></svg>',
  );
  const comparison = await sharp({
    create: { width: 1840, height: 960, channels: 3, background: "white" },
  })
    .composite([
      { input: headings, top: 0, left: 0 },
      { input: left, left: 10, top: 50 },
      { input: right, left: 930, top: 50 },
    ])
    .png()
    .toBuffer();
  saveImmutable(`rendered/${state.current!.id}.${state.ordinal}.svg`, svg);
  saveImmutable(
    `rendered/${state.current!.id}.${state.ordinal}.typeset.svg`,
    typeset.svg,
  );
  saveImmutable(
    `rendered/${state.current!.id}.${state.ordinal}.comparison.png`,
    comparison,
  );
  return `data:image/png;base64,${comparison.toString("base64")}`;
}
