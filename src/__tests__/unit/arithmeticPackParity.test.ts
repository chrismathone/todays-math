import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";

it("preserves the complete seeded print projection for every catalog type", () => {
  const catalog = listArithmeticV2Types();
  const problems = Array.from(
    { length: Math.ceil(catalog.length / 200) },
    (_, batch) =>
      arithmeticToStudioProblems(
        buildArithmeticV2Sheet({
          engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
          catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
          seed: "grade-arithmetic-paper-20261014",
          rounds: [
            {
              allocations: catalog
                .slice(batch * 200, (batch + 1) * 200)
                .map(({ id }) => ({
                  typeId: id,
                  count: 1,
                })),
            },
          ],
        }),
      ),
  ).flat();
  const projection = problems.map(
    ({
      id,
      content,
      answer,
      figureSvg,
      figureDims,
      figureSourceMm,
      arithmetic,
      source,
    }) => [
      id,
      content,
      answer,
      figureSvg,
      figureDims,
      figureSourceMm,
      arithmetic,
      source,
    ],
  );
  const digest = createHash("sha256")
    .update(JSON.stringify(projection))
    .digest("hex");
  expect(digest).toBe(
    "0f476b4a116324c070e44b1363233aca6a4c73c92df69d00c1e9ab933d9fc1e9",
  );
});
