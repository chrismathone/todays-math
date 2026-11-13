/** Renders genuine catalog and GradeArithmeticPaper/NativeProblem components.
 * The local in-memory sheet is reopened normally; no saved sheet/DB is touched. */
import { writeFileSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildArithmeticV2Sheet,
  getArithmeticV2Definition,
} from "@/lib/arithmetic-v2";
import { arithmeticGeometrySnapshotForPrompts } from "@/lib/arithmetic-v2/geometry";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { gradeArithmeticPaperPages } from "@/components/arithmetic/GradeArithmeticPaper";
import { GradeArithmeticExpression } from "@/components/arithmetic/GradeArithmeticPrompt";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
} from "@/contracts/arithmeticV2.contract";
const narrowType = getArithmeticV2Definition("m2-trapezoid-diagonal-midpoints");
const narrowIndex = Array.from(
  { length: narrowType.domainSize },
  (_, i) => i,
).find((i) => {
  const p = narrowType.problemAt(i).prompt;
  return (
    p.layout === "math" &&
    p.figureId === "gt1-m2-trapezoid-diagonal-midpoints-10-2"
  );
});
if (narrowIndex === undefined)
  throw Error("Narrow-PQ regression candidate missing");
const thinAreaType = getArithmeticV2Definition("m3-trig-triangle-area");
const thinAreaIndex = Array.from(
  { length: thinAreaType.domainSize },
  (_, i) => i,
).find((i) => {
  const p = thinAreaType.problemAt(i).prompt;
  return (
    p.layout === "math" && p.figureId === "gm-m3-trig-triangle-area-2-10-90"
  );
});
if (thinAreaIndex === undefined)
  throw Error("Narrow native-label case missing");
const samples = [
  { typeId: "m2-trapezoid-diagonal-midpoints", index: 6 },
  { typeId: "m2-trapezoid-diagonal-midpoints", index: narrowIndex },
  { typeId: "m2-trapezoid-parallel-section", index: 0 },
  { typeId: "m3-pythagoras-leg-surd", index: 3 },
  { typeId: "m3-trig-length-given-ratio", index: 308 },
  { typeId: "m3-trig-side-from-area-sine", index: 960 },
  { typeId: "m3-trig-sine-from-area", index: 1515 },
  { typeId: "m3-trig-length-given-ratio", index: 197 },
  { typeId: "m3-trig-side-from-area-sine", index: 12237 },
  { typeId: "m2-rectangle-diagonal-half", index: 0 },
  { typeId: "m2-external-bisector-base", index: 0 },
  { typeId: "m3-trig-triangle-area", index: thinAreaIndex },
];
const counts = new Map<string, number>();
for (const sample of samples)
  counts.set(sample.typeId, (counts.get(sample.typeId) ?? 0) + 1);
const sheet = buildArithmeticV2Sheet({
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
  seed: "quality-production-20261112",
  rounds: [
    { allocations: [...counts].map(([typeId, count]) => ({ typeId, count })) },
  ],
});
const used = new Map<string, number>();
sheet.rounds[0].items = sheet.rounds[0].items.map((item) => {
  const candidates = samples.filter((s) => s.typeId === item.typeId),
    position = used.get(item.typeId) ?? 0;
  used.set(item.typeId, position + 1);
  return {
    ...item,
    ...getArithmeticV2Definition(item.typeId).problemAt(
      candidates[position].index,
    ),
  };
});
const snapshot = arithmeticGeometrySnapshotForPrompts(
  sheet.rounds[0].items.map((i) => i.prompt),
);
if (snapshot) sheet.figures = snapshot;
const problems = arithmeticToStudioProblems(sheet);
let number = 0;
const rounds = sheet.rounds.map((round) => ({
  round: round.round,
  items: round.items.map((item) => ({
    number: ++number,
    prompt: item.prompt,
    answer: item.answer,
  })),
}));
const pages = gradeArithmeticPaperPages({
  rounds,
  title: "도형 실제 출력 검수",
  academyName: "오늘 수학",
  mode: "both",
  density: 12,
  problems,
});
const catalog = sheet.rounds[0].items.map((item) => (
  <article key={`${item.typeId}:${item.order}`} data-catalog={item.typeId}>
    <h2>{item.typeId}</h2>
    <GradeArithmeticExpression prompt={item.prompt} typeId={item.typeId} />
  </article>
));
const html = renderToStaticMarkup(
  <>
    <div id="catalog">{catalog}</div>
    <main id="paper">{pages.map((p) => p.node)}</main>
  </>,
);
const out = "docs/planning/tracks/reports/arithmetic-figure-quality-20261112";
writeFileSync(
  `${out}/production.css`,
  readFileSync(
    "scripts/qa/arithmetic-figure-quality/production-runtime.css",
    "utf8",
  ),
);
writeFileSync(
  `${out}/production.html`,
  `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/node_modules/katex/dist/katex.min.css"><link rel="stylesheet" href="production-global.css"><link rel="stylesheet" href="production.css"><style>@font-face{font-family:NotoSerif;src:url('/public/fonts/NotoSerifKR-subset.woff2')}@font-face{font-family:Pretendard;src:url('/public/fonts/PretendardVariable.woff2')}*{box-sizing:border-box}:root{--font-noto-serif-kr:NotoSerif;--font-pretendard:Pretendard}body{margin:20px;background:#eef1f5}#catalog{display:grid;grid-template-columns:repeat(2,400px);gap:20px;margin-bottom:30px}article{padding:12px;background:white}h2{font:14px Pretendard}#paper>div{margin-bottom:24px}@media print{@page{size:A4;margin:0}body{margin:0;background:white}#catalog{display:none}#paper>div{margin:0;break-after:page}}</style>${html}`,
);
writeFileSync(
  `${out}/production-data.json`,
  JSON.stringify(
    {
      sheet,
      problems: problems.map((p) => ({
        id: p.id,
        content: p.content,
        figureDims: p.figureDims,
        figureSourceMm: p.figureSourceMm,
        answer: p.answer,
      })),
    },
    null,
    2,
  ),
);
console.log({ pages: pages.length, problems: problems.length });
