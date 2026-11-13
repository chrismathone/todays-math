import ts from "typescript";
import path from "node:path";
const root = process.cwd();
const files = [
  "node_modules/next/types/global.d.ts",
  "src/lib/arithmetic-v2/presentation/engineFigures.ts",
  "src/lib/arithmetic-v2/presentation/figureFirst.ts",
  "src/lib/arithmetic-v2/presentation/figureFirstTriangles.ts",
  "scripts/qa/arithmetic-figure-quality/census.ts",
  "scripts/qa/arithmetic-figure-quality/models.ts",
  "scripts/qa/arithmetic-figure-quality/trig-models.ts",
  "scripts/qa/arithmetic-figure-quality/capture-case.ts",
  "scripts/qa/arithmetic-figure-quality/verify-compiled.ts",
  "scripts/qa/arithmetic-figure-quality/performance.ts",
  "scripts/qa/arithmetic-figure-quality/production.tsx",
  "scripts/qa/arithmetic-figure-quality/special-length-invariants.ts",
  "scripts/qa/arithmetic-figure-quality/label-metrics.ts",
  "scripts/qa/arithmetic-figure-quality/benchmark-inputs.ts",
];
const program = ts.createProgram(files, {
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  types: ["node"],
  paths: { "@/*": [path.join(root, "src/*")] },
});
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
      getCanonicalFileName: (s) => s,
    }),
  );
  process.exitCode = 1;
} else console.log(`Focused TypeScript: ${files.length} entry files passed`);
