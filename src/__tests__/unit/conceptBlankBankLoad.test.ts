/**
 * 학년 은행 늦게 불러오기(은행 3차 · 26 §9) — 문항이 열 배라 개념 백지 화면 조각에 은행 전체를 싣지 않는다.
 * ⑴ 학년마다 불러온 은행이 전체 은행의 그 학년 몫과 같은 문항 · 같은 차례인가(보강 파일을 빠뜨리면 운다)
 * ⑵ 화면 쪽 모듈이 은행을 **정적으로** 부르지 않는가(한 줄이라도 부르면 번들러가 은행 전체를 화면 조각에 싣는다)
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { getConceptBlankGradeBank as loadGradeBank } from "@/lib/concept-blank/bank/runtime";
import {
  CONCEPT_BLANK_GRADES,
  getBlankSection,
} from "@/lib/concept-blank/sections";

const KINDS = ["concepts", "ox", "apply", "figures"] as const;

describe("loadGradeBank", () => {
  it.each(CONCEPT_BLANK_GRADES)(
    "%s — the same items in the same order as the full bank's share of that grade",
    async (grade) => {
      const loaded = await loadGradeBank(grade);
      for (const kind of KINDS) {
        const expected = CONCEPT_BLANK_BANK[kind]
          .filter((x) => getBlankSection(x.section)?.grade === grade)
          .map((x) => x.id);
        expect(
          loaded[kind].map((x) => x.id),
          `${grade} ${kind}`,
        ).toEqual(expected);
      }
    },
  );

  it("together the grades load the whole bank — no part is left out", async () => {
    const loaded = await Promise.all(CONCEPT_BLANK_GRADES.map(loadGradeBank));
    for (const kind of KINDS)
      expect(
        loaded.reduce((n, b) => n + b[kind].length, 0),
        kind,
      ).toBe(CONCEPT_BLANK_BANK[kind].length);
  });

  it("an unknown grade loads nothing", async () => {
    const empty = await loadGradeBank("고1");
    for (const kind of KINDS) expect(empty[kind]).toEqual([]);
  });
});

describe("the concept blank screen does not ship the whole bank", () => {
  const source = (file: string) =>
    readFileSync(path.join(process.cwd(), file), "utf8");
  /** 정적 import 줄만(동적 `import("…")` 은 빼고). */
  const staticImports = (text: string) =>
    [...text.matchAll(/^\s*(?:import|export)[^;]*?from\s+"([^"]+)"/gm)].map(
      (m) => m[1]!,
    );
  const bankIndex = /(^|\/)bank(\/index)?$/;
  const bankFile = /(^|\/)bank\/(e|m)\d(-plus)?$|^\.\/(e|m)\d(-plus)?$/;

  it.each([
    "src/components/concept-blank/ConceptBlankView.tsx",
    "src/lib/concept-blank/compose.ts",
    "src/lib/concept-blank/sheetCode.ts",
    "src/lib/concept-blank/bank/load.ts",
    "src/lib/concept-blank/bank/stock.ts",
  ])("%s has no static import of the bank or a grade file", (file) => {
    const found = staticImports(source(file)).filter(
      (spec) => bankIndex.test(spec) || bankFile.test(spec),
    );
    expect(found).toEqual([]);
  });

  it("the guard sees a static bank import when there is one", () => {
    expect(
      staticImports(
        'import { a } from "./bank";\nimport { bank as e3 } from "./e3";\nconst x = import("./e4");',
      ).filter((spec) => bankIndex.test(spec) || bankFile.test(spec)),
    ).toEqual(["./bank", "./e3"]);
  });
});
