import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const toolRoot = path.resolve(process.argv[2] ?? "C:/Creative/testautocreator");
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(path.join(toolRoot, "package.json"))("typescript");
const files = [
  "scripts/qa/arithmetic-notation-geometry-audit.ts",
  "scripts/qa/arithmetic-notation-geometry-audit-semantics.ts",
  "scripts/qa/arithmetic-notation-geometry-audit-verify.ts",
];
const program = ts.createProgram(
  files.map((f) => path.join(workspace, f)),
  {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: ["node"],
    typeRoots: [path.join(toolRoot, "node_modules/@types")],
    paths: {
      "@/*": [path.join(workspace, "src/*")],
      react: [path.join(toolRoot, "node_modules/@types/react")],
      "react/*": [path.join(toolRoot, "node_modules/@types/react/*")],
      "react-dom/*": [path.join(toolRoot, "node_modules/@types/react-dom/*")],
      "*": [path.join(toolRoot, "node_modules/*")],
    },
  },
);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => workspace,
      getNewLine: () => "\n",
      getCanonicalFileName: (file) => file,
    }),
  );
  process.exitCode = 1;
} else console.log(`Focused TypeScript: ${files.length} entries passed`);
