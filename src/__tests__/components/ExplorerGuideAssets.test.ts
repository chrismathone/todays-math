// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { GUIDE_IDS } from "@/contracts/mathSrsGuide.contract";
import { GUIDE_POSES, guideAssetPath } from "@/lib/math-srs/guideAssets";
import path from "node:path";

describe("guide delivery assets", () => {
  it.each(GUIDE_IDS)(
    "delivers five small transparent expressions for %s",
    async (id) => {
      for (const pose of GUIDE_POSES) {
        // The file the screen asks for — the same path the student gate opens.
        const image = sharp(
          path.join(process.cwd(), "public", guideAssetPath(id, pose)),
        );
        const metadata = await image.metadata();
        expect(metadata.format).toBe("webp");
        expect(metadata.hasAlpha).toBe(true);
        expect(metadata.width).toBe(pose === "reward" ? 252 : 200);
        expect(metadata.height).toBe(pose === "reward" ? 252 : 152);
        const { data, info } = await image
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        expect(data[3]).toBe(0);
        expect(data[(info.width * info.height - 1) * 4 + 3]).toBe(0);
        expect(
          data.some((value, index) => index % 4 === 3 && value > 240),
        ).toBe(true);
      }
    },
  );
});
