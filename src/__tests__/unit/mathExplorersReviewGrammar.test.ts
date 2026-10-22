// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  EXPLORER_REVIEW_VARIANT_CARD_IDS as ids,
  type ExplorerReviewVariant,
} from "@/contracts/mathExplorers.contract";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { reviewVariantCard } from "@/lib/math-explorers/reviewVariants";

// Exact deployed baseline, never the moving branch HEAD. Only type imports are
// erased from its template; no current resolver is substituted into this oracle.
const baseline = "7f68007dd2970ad8189c3674a7f79b957dd361e4";
function loadBaseline(file: string) {
  const source = execFileSync("git", ["show", `${baseline}:${file}`], {
    encoding: "utf8",
  });
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const loaded = { exports: {} };
  const require = createRequire(path.resolve(file));
  new Function("require", "exports", "module", outputText)(
    (name: string) =>
      name.startsWith("@/")
        ? loadBaseline(`src/${name.slice(2)}.ts`)
        : name.startsWith(".")
          ? loadBaseline(path.join(path.dirname(file), `${name}.ts`))
          : require(name),
    loaded.exports,
    loaded,
  );
  return loaded.exports;
}
const old = loadBaseline("src/lib/math-explorers/reviewVariants.ts") as {
  reviewVariantCard: typeof reviewVariantCard;
};
const oldContract = loadBaseline(
  "src/contracts/mathExplorers.contract.ts",
) as typeof import("@/contracts/mathExplorers.contract");

describe("frozen version 1 and grammar-only version 2", () => {
  it.each(ids)(
    "keeps all 640 version 1 JSON outputs byte-exact to 7f: %s",
    (id) => {
      for (let seed = 0; seed < 640; seed++) {
        const identity = { version: 1 as const, seed, cardIds: [...ids] };
        const card = definitionCard(id);
        expect(JSON.stringify(reviewVariantCard(card, identity))).toBe(
          JSON.stringify(old.reviewVariantCard(card, identity)),
        );
      }
    },
  );

  it.each(ids)(
    "changes only the two range cards' explanation/note in v2: %s",
    (id) => {
      const combinations = new Map<string, number>();
      const range = id === "g5-at-least" || id === "g5-more-than";
      // Both directions: 640 seeds for each of the four terms, 320 per truth.
      for (let seed = 0; seed < (range ? 1280 : 640); seed++) {
        const identity = { version: 1 as const, seed, cardIds: [...ids] };
        const v1 = old.reviewVariantCard(definitionCard(id), identity);
        const v2 = reviewVariantCard(definitionCard(id), {
          ...identity,
          version: 2 as ExplorerReviewVariant["version"],
        });
        if (id !== "g5-at-least" && id !== "g5-more-than") {
          expect(JSON.stringify(v2)).toBe(JSON.stringify(v1));
          continue;
        }
        const term = v2.exampleTitle.match(/이상|이하|초과|미만/)![0];
        const inclusive = term === "이상" || term === "이하";
        const greater = term === "이상" || term === "초과";
        const boundary = Number(v2.exampleTitle.match(/\d+/)![0]);
        const particle = term === "이상" || term === "미만" ? "은" : "는";
        expect(v2.explanation).toBe(
          `${term}${particle} 기준 수 ${boundary}을 ${inclusive ? "포함해" : "포함하지 않아"}. ${boundary}보다 ${greater ? "큰" : "작은"} 수${inclusive ? "와 기준 수가" : "만"} 이 범위에 들어가.`,
        );
        expect(v2.note).toBe(v2.explanation);
        expect({ ...v2, explanation: v1.explanation, note: v1.note }).toEqual(
          v1,
        );
        for (const example of v2.examples) {
          const value = Number(example.text);
          const accepted =
            term === "이상"
              ? value >= boundary
              : term === "이하"
                ? value <= boundary
                : term === "초과"
                  ? value > boundary
                  : value < boundary;
          expect(example.yes).toBe(accepted);
        }
        expect(v2.truth).toBe(
          inclusive !== v2.trap.includes("포함되지 않는다"),
        );
        const combination = `${term}:${inclusive}:${greater}:${v2.truth}`;
        combinations.set(combination, (combinations.get(combination) ?? 0) + 1);
      }
      if (id === "g5-at-least" || id === "g5-more-than")
        expect([...combinations.values()]).toEqual([320, 320, 320, 320]);
    },
  );

  it("proves the exact old strict reader accepts v1 and rejects v2", () => {
    expect(
      oldContract.explorerReviewVariantSchema.safeParse({
        version: 1,
        seed: 8,
        cardIds: [...ids],
      }).success,
    ).toBe(true);
    expect(
      oldContract.explorerReviewVariantSchema.safeParse({
        version: 2,
        seed: 8,
        cardIds: [...ids],
      }).success,
    ).toBe(false);
  });
});
