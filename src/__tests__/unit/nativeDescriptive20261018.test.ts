import { describe, expect, it, vi } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// No .env, shared DB, or paid API. Any accidental DB constructor/query is a test failure.
vi.mock("@prisma/client", () => ({ PrismaClient: class {} }));
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinitions,
} from "@/lib/engine/nativeDescriptive20261018";
import {
  nativeExternalId,
  nativeFamilyKey,
  parseNativeExternalId,
  parseNativeFamilyKey,
  serializeNativeSolution,
} from "@/contracts/nativeDescriptive.contract";
import {
  buildTargetRows,
  buildElemRows,
  buildMiddleRows,
} from "../../../scripts/import/load-engine-problems";
import {
  loadedNativeDefinitionIds,
  unloadedNative,
} from "../../../scripts/qa/checkUnloadedTypes";
import { rebuild } from "../../../scripts/qa/refresh-engine-content";
import { elementaryUnits, listedForms } from "@/lib/elementary/generate";
import { typesForSection } from "@/lib/middle/generate";

const defs = nativeDescriptiveDefinitions();
const plain = (text: string) =>
  text
    .replace(/\$/g, "")
    .replace(/\\,\\mathrm\{cm\}/g, "cm")
    .replace(/\^\\circ/g, "°")
    .replace(/,\\;/g, ",");

/** Evaluate only the numerical equations actually printed in the model. No eval or source facts. */
function checkNumericEquations(model: string): void {
  const arithmetic = (text: string): number => {
    const tokens = text.match(/\d+(?:\.\d+)?|[()+*/-]/g) ?? [];
    let i = 0;
    const atom = (): number => {
      if (tokens[i] === "-") {
        i++;
        return -atom();
      }
      if (tokens[i] === "(") {
        i++;
        const x = add();
        expect(tokens[i++]).toBe(")");
        return x;
      }
      const token = tokens[i++];
      if (!token || !/^\d/.test(token)) throw new Error("Bad numeric equation");
      return Number(token);
    };
    const mul = (): number => {
      let x = atom();
      while (tokens[i] === "*" || tokens[i] === "/") {
        const op = tokens[i++];
        const y = atom();
        x = op === "*" ? x * y : x / y;
      }
      return x;
    };
    const add = (): number => {
      let x = mul();
      while (tokens[i] === "+" || tokens[i] === "-") {
        const op = tokens[i++];
        const y = mul();
        x = op === "+" ? x + y : x - y;
      }
      return x;
    };
    const value = add();
    expect(i).toBe(tokens.length);
    return value;
  };
  for (const match of model.matchAll(/\$([^$]+)\$/g)) {
    const formula = match[1]!
      .replace(/\^\\circ/g, "")
      .replace(/\\times/g, "*")
      .replace(/\\div/g, "/");
    if (formula.includes("=") && /^[0-9\s()+*/=.\-]+$/.test(formula)) {
      const values = formula.split("=").map(arithmetic);
      for (const value of values.slice(1))
        expect(value).toBeCloseTo(values[0]!, 10);
    }
  }
}

/** Independent oracle reads only student content. It never consumes generated facts or an answer as input. */
function solveFromQuestion(id: string, content: string): string[] {
  const q = plain(content);
  switch (id) {
    case "e4-equilateral-audit-r1": {
      const measure = Number(/(?:둘레가|한 변이) (\d+)cm/.exec(q)![1]);
      const side = q.startsWith("둘레가") ? measure / 3 : measure;
      const proposed = Number(/세 변은 각각 (\d+)cm/.exec(q)![1]);
      const angle = Number(/세 각은 각각 (\d+)°/.exec(q)![1]);
      expect(proposed * 3).not.toBe(side * 3);
      expect(angle * 3).not.toBe(180);
      return [
        "두 주장 모두 틀림",
        `한 변 ${side}cm`,
        "한 각 60°",
        `둘레 ${side * 3}cm`,
        "각의 합 180°",
      ];
    }
    case "e4-triangle-dual-proof-r1": {
      const a = Number(/각 A는 (\d+)°/.exec(q)![1]);
      const b = Number(/각 B와 C는 각각 (\d+)°/.exec(q)![1]);
      const angles = [a, b, b];
      expect(angles.every((n) => n > 0)).toBe(true);
      expect(angles.reduce((s, n) => s + n, 0)).toBe(180);
      expect(q).toContain("변 AB와 AC의 길이가 같고");
      expect(angles.every((n) => n === 60)).toBe(false);
      const name = angles.includes(90)
        ? "직각삼각형"
        : angles.some((n) => n > 90)
          ? "둔각삼각형"
          : "예각삼각형";
      return ["이등변삼각형", name, "정삼각형은 아님", "불가능"];
    }
    case "e4-trapezoid-sufficiency-r1": {
      // AB=AD=s is feasible without parallel opposite sides: A(0,0), B(s,0), C(2s,2s), D(0,s).
      const s = Number(/각각 (\d+)cm/.exec(q)![1]);
      const pts = [
        [0, 0],
        [s, 0],
        [2 * s, 2 * s],
        [0, s],
      ];
      const vec = (a: number, b: number) => [
        pts[b]![0]! - pts[a]![0]!,
        pts[b]![1]! - pts[a]![1]!,
      ];
      const cross = (u: number[], v: number[]) => u[0]! * v[1]! - u[1]! * v[0]!;
      expect(cross(vec(0, 1), vec(2, 3))).not.toBe(0);
      expect(cross(vec(1, 2), vec(3, 0))).not.toBe(0);
      expect(Math.hypot(...vec(0, 1))).toBe(Math.hypot(...vec(0, 3)));
      expect(q).toContain("마주 보는 변 두 쌍 모두 평행하지 않습니다");
      return [
        "가는 사다리꼴",
        "나는 사다리꼴이 아님",
        "반례",
        "마주 보는 변 한 쌍이 평행하면 충분",
      ];
    }
    case "m3-factor-error-proof-r1": {
      const m = /x\^2([+-])(\d+)x\+(\d+)/.exec(q)!;
      const linear = Number(`${m[1]}${m[2]}`),
        constant = Number(m[3]);
      const pairs: [number, number][] = [];
      for (let a = -100; a <= 100; a++)
        for (let b = a; b <= 100; b++)
          if (a + b === linear && a * b === constant) pairs.push([a, b]);
      expect(pairs).toHaveLength(1);
      const [a, b] = pairs[0]!;
      // Test polynomial equality pointwise after an independently found factor pair, not source algebra.
      for (let x = -6; x <= 6; x++)
        expect((x + a) * (x + b) === x * x + linear * x + constant).toBe(true);
      const proposed = /을 \(x([+-]\d+)\)\(x([+-]\d+)\)/.exec(q)!;
      expect(Number(proposed[1]) + Number(proposed[2])).not.toBe(linear);
      expect(Number(proposed[1]) * Number(proposed[2])).not.toBe(constant);
      const x = Number(/\(3\) x=(\d+)/.exec(q)![1]);
      const f = (v: number) => `(x${v >= 0 ? "+" : ""}${v})`;
      return [
        f(a) + f(b),
        "일차항과 상수항이 다름",
        `대입값 ${x * x + linear * x + constant}`,
        "한 값의 일치만으로 항등식 증명은 불가",
      ];
    }
    case "m3-quadratic-domain-r1": {
      const delta = Number(/세로보다 (\d+)cm/.exec(q)![1]);
      const area = Number(/넓이는 (\d+)cm\^2/.exec(q)![1]);
      const roots: number[] = [];
      for (let x = -area; x <= area; x++)
        if (x * (x + delta) === area) roots.push(x);
      expect(roots).toHaveLength(2);
      const valid = roots.filter((x) => x > 0 && x + delta > 0);
      expect(valid).toHaveLength(1);
      const x = valid[0]!;
      return [
        `세로 ${x}cm`,
        `가로 ${x + delta}cm`,
        `${roots[0]}`,
        "음수 해 제외",
      ];
    }
    case "m3-statistics-shift-spread-r1": {
      const groups = ["원래 자료는", "더한", "수정안 B는"].map((s) => {
        const rest = q.slice(q.indexOf(s) + s.length);
        return /^ ([-\d,]+)/
          .exec(rest)![1]!
          .replace(/,$/, "")
          .split(",")
          .map(Number);
      });
      // Pairwise squared differences is independent of the generator's deviation-scaling formula.
      const summary = (xs: number[]) => {
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        let pairSquares = 0;
        for (const a of xs) for (const b of xs) pairSquares += (a - b) ** 2;
        return [mean, pairSquares / (2 * xs.length ** 2)];
      };
      const [o, a, b] = groups.map(summary);
      expect(a![0]).toBeGreaterThan(o![0]!);
      expect(a![1]).toBe(o![1]);
      expect(a![1]).toBeLessThan(b![1]!);
      return [
        `원래: 평균 ${o![0]}, 분산 ${o![1]}`,
        `A: 평균 ${a![0]}, 분산 ${a![1]}`,
        `B: 평균 ${b![0]}, 분산 ${b![1]}`,
        "A 선택",
        "주장은 거짓",
      ];
    }
    default:
      throw new Error("Missing independent oracle");
  }
}

describe("native authored reasoning — 6 definitions, 100 seeds plus integer/shape boundaries", () => {
  it("registers exactly the approved six units with distinct reasoning actions", () => {
    expect(defs).toHaveLength(6);
    expect(new Set(defs.map((d) => d.unitId)).size).toBe(6);
    for (const d of defs) expect(d.differentAction.length).toBeGreaterThan(20);
  });
  for (const d of defs)
    it(`${d.definitionId}: independent content read, 100 seeds x two variants + extremes`, () => {
      const seeds = [
        ...Array.from({ length: 100 }, (_, i) => i),
        -2147483648,
        2147483647,
        20261018,
      ];
      for (const seed of seeds)
        for (let v = 0; v < 2; v++) {
          const p = generateNativeDescriptive(d.definitionId, seed, v);
          const expected = solveFromQuestion(d.definitionId, p.content);
          const answer = plain(p.answer);
          // Factor order is immaterial; the source intentionally writes the opposite order on v1.
          for (const value of expected) {
            if (value.startsWith("(x")) {
              const factors = [...value.matchAll(/\(x([+-]\d+)\)/g)]
                .map((m) => Number(m[1]))
                .sort((a, b) => a - b);
              const actual = [...answer.matchAll(/\(x([+-]\d+)\)/g)]
                .map((m) => Number(m[1]))
                .sort((a, b) => a - b);
              expect(actual).toEqual(factors);
            } else expect(answer).toContain(value);
          }
          expect(p).toEqual(generateNativeDescriptive(d.definitionId, seed, v));
          checkNumericEquations(p.modelAnswer);
          if (d.definitionId === "m3-factor-error-proof-r1") {
            const q = plain(p.content),
              model = plain(p.modelAnswer);
            const faulty = /을 \(x([+-]\d+)\)\(x([+-]\d+)\)/.exec(q)!;
            const linear = Number(faulty[1]) + Number(faulty[2]),
              constant = Number(faulty[1]) * Number(faulty[2]);
            expect(model).toContain(
              `전개하면 x^2${linear < 0 ? "" : "+"}${linear}x${constant < 0 ? "" : "+"}${constant}`,
            );
          }
          expect(p.solution).toBe(
            serializeNativeSolution(p.modelAnswer, p.rubric),
          );
          expect(p.rubric.totalPoints).toBe(6);
          expect(p.rubric.criteria.reduce((s, c) => s + c.points, 0)).toBe(6);
          expect(
            p.rubric.criteria.every(
              (c) => c.alternatives.length && c.errors.length,
            ),
          ).toBe(true);
        }
    });
  it("100 seeds include right/acute/obtuse boundaries and extreme legal length/data ranges", () => {
    const angles = new Set(
      Array.from(
        { length: 100 },
        (_, s) =>
          plain(
            generateNativeDescriptive(defs[1]!.definitionId, s, 0).answer,
          ).match(/(?:직각|둔각|예각)삼각형/)![0],
      ),
    );
    expect(angles.has("직각삼각형")).toBe(true);
    expect(angles.has("둔각삼각형")).toBe(true);
    const acute = generateNativeDescriptive(defs[1]!.definitionId, 0, 1);
    expect(acute.answer).toContain("예각삼각형");
  });
});

describe("native exact contract and three source consumers", () => {
  const target = {
    engine: "native-descriptive" as const,
    definitionIds: defs.map((d) => d.definitionId),
    variants: 2,
  };
  const rows = buildTargetRows(target, 20261018);
  it("round trips all 12 items and does not match the actual derived deletion SQL", () => {
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r.content)).size).toBe(12);
    const deletionSource = readFileSync(
      "scripts/import/delete-derived-descriptive.ts",
      "utf8",
    );
    expect(deletionSource).toContain(
      "family_key LIKE 'elem:%' OR family_key LIKE 'mid:%'",
    );
    for (const r of rows) {
      const p = parseNativeExternalId(r.externalId)!;
      expect(nativeExternalId(p)).toBe(r.externalId);
      expect(parseNativeFamilyKey(r.familyKey)).toBe(p.definitionId);
      expect(nativeFamilyKey(p.definitionId)).toBe(r.familyKey);
      expect(r.familyKey).not.toMatch(/^(elem|mid):/);
      expect(r.questionType).toBe("서술형");
      const generated = generateNativeDescriptive(
        p.definitionId,
        p.seed,
        p.variant,
      );
      expect([r.content, r.answer, r.solution]).toEqual([
        generated.content,
        generated.answer,
        generated.solution,
      ]);
    }
  });
  it("unloaded exact keys reject a similar definition/version and malformed seed", () => {
    expect(unloadedNative(rows.map((r) => r.externalId))).toHaveLength(0);
    const id = defs[0]!.definitionId;
    const similar = nativeExternalId({
      definitionId: id.replace("-r1", "x-r1"),
      seed: 1,
      variant: 0,
    });
    expect(loadedNativeDefinitionIds([similar])).not.toContain(id);
    expect(unloadedNative([similar])).toHaveLength(6);
    for (const invalid of [
      rows[0]!.externalId + "|extra",
      rows[0]!.externalId.replace("|s20261018", "|s020261018"),
      rows[0]!.externalId.replace("|v0", "|v-1"),
      `engine-native-desc:${id}|s9007199254740992|v0`,
    ])
      expect(parseNativeExternalId(invalid)).toBeNull();
    expect(() => nativeFamilyKey("unversioned")).toThrow();
    expect(() => nativeFamilyKey("한글-r1")).toThrow();
    expect(() => nativeFamilyKey("a".repeat(65) + "-r1")).toThrow();
  });
  it("refresh rebuild uses precisely the same rows including rubric serialization", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "native-refresh-"));
    try {
      const file = path.join(dir, "plan.json");
      writeFileSync(
        file,
        JSON.stringify({
          label: "native-pure",
          seedBase: 20261018,
          targets: [target],
        }),
      );
      const result = rebuild([file]);
      expect(result.failures).toEqual([]);
      expect(result.conflicts).toEqual([]);
      expect([...result.made.values()]).toEqual(rows);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("the shared planning selector and all exported 12 items/rubrics match the actual source", () => {
    const base =
      "docs/planning/tracks/reports/math-bank-reinforcement-20261018/";
    const plan = JSON.parse(readFileSync(base + "native-plan.json", "utf8"));
    expect(buildTargetRows(plan.targets[0], plan.seedBase)).toEqual(rows);
    const exported = JSON.parse(
      readFileSync(base + "native-candidates-r2.json", "utf8"),
    );
    expect(exported.candidateCount).toBe(12);
    for (const actual of exported.candidates) {
      const p = generateNativeDescriptive(
        actual.definitionId,
        actual.seed,
        actual.variant,
      );
      for (const [key, value] of Object.entries(p))
        expect(actual[key]).toEqual(value);
    }
  });
  it("never calls an ending conversion or expandFamily to author native tasks", () => {
    const source = readFileSync(
      "src/lib/engine/nativeDescriptive20261018.ts",
      "utf8",
    ).replace(/\/\*[^]*?\*\//g, "");
    expect(source).not.toMatch(
      /(?:asDescriptive|toDescriptiveStem|expandFamily)\s*\(/,
    );
    const expand = readFileSync("src/lib/engine/expandEngine.ts", "utf8");
    expect(expand).not.toMatch(/items\.push\(asDescriptive/);
  });
});

describe("loader optional exact selectors preserve historical output and fail closed", () => {
  const unit = elementaryUnits().find(
    (u) => u.grade === "초4" && u.section === "2-2-3 정삼각형의 성질",
  )!;
  const elem = {
    engine: "elem" as const,
    grade: unit.grade,
    chapter: unit.chapter,
    sections: [unit.section],
    perTier: 1,
  };
  const middle = {
    engine: "middle" as const,
    grade: "중3",
    unitSection: "인수분해",
    variants: 1,
  };
  const form = listedForms(unit)[0]!.id;
  const key = typesForSection(middle.unitSection).find(
    (t) => t.grade === middle.grade,
  )!.key;
  it("omitted selectors keep all original identities/content; selected rows are an exact subset", () => {
    const all = buildElemRows(elem, 20261018);
    expect(buildElemRows({ ...elem, formIds: [form] }, 20261018)).toEqual(
      all.filter(
        (r) => r.familyKey === `elem:${unit.grade}|${unit.section}|${form}`,
      ),
    );
    const subset = buildMiddleRows({ ...middle, typeKeys: [key] }, 20261018);
    expect(subset.every((r) => r.familyKey === `mid:${key}`)).toBe(true);
    expect(subset.length).toBeGreaterThan(0);
  });
  for (const bad of [
    undefined,
    null,
    [],
    [""],
    [form, form],
    [form, "unknown"],
  ])
    it(`rejects bad elementary selector ${JSON.stringify(bad)}`, () => {
      expect(() =>
        buildElemRows({ ...elem, formIds: bad as never }, 1),
      ).toThrow();
    });
  for (const bad of [undefined, null, [], [""], [key, key], [key, "unknown"]])
    it(`rejects bad middle selector ${JSON.stringify(bad)}`, () => {
      expect(() =>
        buildMiddleRows({ ...middle, typeKeys: bad as never }, 1),
      ).toThrow();
    });
  it("rejects absent/empty/duplicate/unknown native keys and incompatible selectors", () => {
    for (const definitionIds of [
      undefined,
      null,
      [],
      [defs[0]!.definitionId, defs[0]!.definitionId],
      ["unknown-r1"],
    ])
      expect(() =>
        buildTargetRows(
          { engine: "native-descriptive", definitionIds } as never,
          1,
        ),
      ).toThrow();
    expect(() =>
      buildMiddleRows({ ...middle, typeKeys: [key], maxTypes: 1 }, 1),
    ).toThrow();
  });
});
