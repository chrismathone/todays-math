// Distinct frames per grade-5 section and tier over many seeds (exact: digits stripped; loose: nouns too).
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateElementaryProblem } from "@/lib/elementary/generate";

const exact = (c: string) =>
  c
    .replace(/\$[^$]*\$/g, "#")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
// Loose frame: keep only the final question clause after the last period.
const loose = (c: string) => {
  const e = exact(c);
  const parts = e.split(/(?<=[.?])\s/);
  return parts[parts.length - 1].replace(
    /[가-힣]+(?=에 |을 |를 |이 |가 )/g,
    "N",
  );
};
const rows: { id: string; tier: string; exact: number; loose: number }[] = [];
for (const s of COURSE_SECTIONS.filter((x) => x.grade === 5))
  for (const tier of ["기본", "응용"] as const) {
    const e = new Set<string>(),
      l = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      const c = generateElementaryProblem(s.unit, seed * 7919, tier).content;
      e.add(exact(c));
      l.add(loose(c));
    }
    rows.push({ id: s.id, tier, exact: e.size, loose: l.size });
  }
const hist = (key: "exact" | "loose") => {
  const h: Record<string, number> = {};
  for (const r of rows) {
    const b = r[key] >= 6 ? "6+" : String(r[key]);
    h[b] = (h[b] ?? 0) + 1;
  }
  return h;
};
console.log("slots(section×tier):", rows.length);
console.log("exact frames histogram:", hist("exact"));
console.log("loose frames histogram:", hist("loose"));
console.log(
  rows
    .filter((r) => r.loose <= 1)
    .map((r) => `${r.id}:${r.tier}`)
    .join(" "),
);
