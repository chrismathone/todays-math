/** Public-prompt constraint compiler for the four inline trig families.
 * It computes geometry only; FigureScene remains the sole SVG producer. */
import { writeFileSync } from "node:fs";
import { arithmeticV2Definitions } from "../../../src/lib/arithmetic-v2/registry";
import type { Model } from "../../../src/lib/arithmetic-v2/families/geometryTriangles/core";
const fraction = (s: string) => {
  const f = /\\frac\{(\d+)\}\{(\d+)\}/.exec(s);
  return f ? Number(f[1]) / Number(f[2]) : Number(s);
};
const keys = new Set([
  "m3-trig-length-given-ratio",
  "m3-trig-area-given-sine",
  "m3-trig-sine-from-area",
  "m3-trig-side-from-area-sine",
]);
const out = [];
for (const d of arithmeticV2Definitions().filter((d) => keys.has(d.id)))
  for (let i = 0; i < d.domainSize; i++) {
    const c = d.problemAt(i),
      p = c.prompt;
    if (p.layout !== "math") throw Error();
    const model: Model = { points: {}, edges: ["AB", "BC", "CA"] };
    const lengths = [
      ...p.latex.matchAll(/\\mathrm\{(AB|BC|AC)\}=(\d+)\\,\\mathrm\{cm\}/g),
    ].map((m) => ({ key: m[1], value: Number(m[2]) }));
    const ratio = /\\(sin|cos|tan) A=(\\frac\{\d+\}\{\d+\}|\d+)/.exec(p.latex);
    let target: { key: string; text: string; kind: "segment" } | undefined;
    if (d.id === "m3-trig-length-given-ratio") {
      if (!ratio || lengths.length !== 1) throw Error(p.latex);
      const r = fraction(ratio[2]),
        opp = ratio[1] === "cos" ? Math.sqrt(1 - r * r) : r,
        adj = ratio[1] === "sin" ? Math.sqrt(1 - r * r) : 1;
      // cos uses adjacent=r; tan uses opposite=r, adjacent=1.
      const x = ratio[1] === "cos" ? r : adj;
      model.points = { A: [0, 0], C: [x, 0], B: [x, opp] };
      model.right = ["ACB"];
      const key = /\\mathrm\{(AB|BC|AC)\}$/.exec(p.latex)?.[1];
      if (!key) throw Error(p.latex);
      target = { key, text: "x", kind: "segment" };
    } else {
      const area = /S=(\d+)/.exec(p.latex);
      const a = lengths.find((l) => l.key === "AB")?.value;
      if (!a) throw Error(p.latex);
      const sine = ratio
        ? fraction(ratio[2])
        : (2 * Number(area?.[1])) /
          (a * lengths.find((l) => l.key === "AC")!.value);
      const b =
        lengths.find((l) => l.key === "AC")?.value ??
        (2 * Number(area?.[1])) / (a * sine);
      if (!(sine > 0 && sine < 1 && b > 0)) throw Error(p.latex);
      model.points = {
        A: [0, 0],
        B: [a, 0],
        C: [b * Math.sqrt(1 - sine * sine), b * sine],
      };
      model.arcs = ["BAC"];
      if (d.id === "m3-trig-side-from-area-sine")
        target = { key: "AC", text: "x", kind: "segment" };
    }
    const givens = lengths.map((l) => ({
      key: l.key,
      text: String(l.value),
      kind: "segment" as const,
    }));
    out.push({
      id: `inline:${d.id}:${i}`,
      family: d.id,
      key: d.id,
      parameters: c.parameters,
      prompt: p,
      canonical: JSON.stringify(p),
      plan: { model, givens, target, text: p.text },
    });
  }
writeFileSync(
  "/tmp/arithmetic-figure-quality/trig-models.json",
  JSON.stringify(out),
);
console.log({ inlineModels: out.length });
