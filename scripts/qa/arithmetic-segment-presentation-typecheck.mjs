// Focused ES2017 project-target check using the existing dependency checkout.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(process.argv[2] ?? "C:/Creative/testautocreator");
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(path.join(root, "package.json"))("typescript");
const files = [
  "src/lib/arithmetic-v2/presentation/segments.ts",
  "src/__tests__/unit/arithmeticSegmentPresentation.test.ts",
  ...["build", "check", "layout", "model", "runtime", "report"].map(
    (s) => `scripts/qa/arithmetic-segment-presentation-${s}.ts`,
  ),
];
const program = ts.createProgram(
  files.map((f) => path.join(workspace, f)),
  {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: ["node"],
    typeRoots: [path.join(root, "node_modules/@types")],
    paths: {
      "@/*": [path.join(workspace, "src/*")],
      chai: [path.join(root, "node_modules/@types/chai/index.d.ts")],
      vite: [path.join(root, "node_modules/vite/dist/node/index.d.ts")],
      "*": [path.join(root, "node_modules/*")],
    },
  },
);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => workspace,
      getNewLine: () => "\n",
      getCanonicalFileName: (f) => f,
    }),
  );
  process.exitCode = 1;
} else
  console.log(`Focused ES2017 TypeScript: ${files.length} entry files passed`);
