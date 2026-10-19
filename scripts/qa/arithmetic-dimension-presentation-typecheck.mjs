// Focused, no-install typecheck using the root checkout's existing TypeScript.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(process.argv[2] ?? "C:/Creative/testautocreator");
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(path.join(root, "package.json"))("typescript");
const files = [
  "src/lib/arithmetic-v2/presentation/dimensions.ts",
  "src/__tests__/unit/arithmeticDimensionPresentation.test.ts",
  ...["build", "model", "check"].map(
    (s) => `scripts/qa/arithmetic-dimension-presentation-${s}.ts`,
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
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    types: ["node"],
    typeRoots: [path.join(root, "node_modules/@types")],
    paths: {
      vite: [path.join(root, "node_modules/vite/dist/node/index.d.ts")],
      chai: [path.join(root, "node_modules/@types/chai/index.d.ts")],
      "@/*": [path.join(workspace, "src/*")],
      react: [path.join(root, "node_modules/@types/react/index.d.ts")],
      "react/*": [path.join(root, "node_modules/@types/react/*")],
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
} else console.log(`Focused TypeScript: ${files.length} entry files passed`);
