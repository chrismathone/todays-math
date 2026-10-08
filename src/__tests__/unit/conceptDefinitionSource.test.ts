import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import {
  definitionLiterals,
  replaceDefinitions,
} from "../../../scripts/qa/concept-blank/student-clear/definition-source";

describe("general-definition source edits", () => {
  it("locates every real base and plus entry with its existing ID and runtime string", () => {
    for (const [part, bank] of Object.entries(BANK_PARTS)) {
      const name = part.replace(/plus$/, "-plus");
      const grade = part.replace(/plus$/, "");
      const text = readFileSync(
        resolve("src/lib/concept-blank/bank", `${name}.ts`),
        "utf8",
      );
      const found = definitionLiterals(text, grade);
      expect(found.size, part).toBe(bank.concepts.length);
      for (const entry of bank.concepts)
        expect(found.get(entry.id)?.value, entry.id).toBe(entry.definition);
    }
  });

  it("preserves retired tuple positions and edits only the selected definition", () => {
    const before =
      String.raw`const r = String.raw;
section("01-01", "교과", [
 ["이름", "방법", "하", r` +
      "`" +
      String.raw`식은 {$\frac{1}{2}$}이다.` +
      "`" +
      String.raw`],
 RETIRED,
 ["다음 이름", "성질", "중", "다음 값은 {$3$}이다."],
], [], []);`;
    const first = definitionLiterals(before, "m1").get("m1-01-01-c1")!;
    const after = replaceDefinitions(before, "m1", [
      {
        id: first.id,
        before: first.value,
        after: String.raw`식의 값은 {$\frac{2}{3}$}이다.`,
      },
    ]);
    const found = definitionLiterals(after, "m1");
    expect([...found.keys()]).toEqual(["m1-01-01-c1", "m1-01-01-c3"]);
    expect(found.get("m1-01-01-c3")!.value).toBe("다음 값은 {$3$}이다.");
    expect(after).toContain("RETIRED");
    expect(after).toContain("다음 이름");
    expect(after).toContain(String.raw`\frac{2}{3}`);
  });

  it("refuses stale before values and unrelated or duplicated IDs", () => {
    const before =
      'const bank = {concepts:[{id:"e3-1-1-1-c1",definition:"값은 {$1$}이다."}]};';
    const change = {
      id: "e3-1-1-1-c1",
      before: "옛 값",
      after: "값은 {$2$}이다.",
    };
    expect(() => replaceDefinitions(before, "e3", [change])).toThrow();
    expect(() =>
      replaceDefinitions(before, "e3", [{ ...change, id: "e3-1-1-1-c2" }]),
    ).toThrow();
    expect(() => replaceDefinitions(before, "e3", [change, change])).toThrow();
  });
});
