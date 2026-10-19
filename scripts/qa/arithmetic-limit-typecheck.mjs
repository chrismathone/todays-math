import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(process.argv[2] ?? "C:/Creative/testautocreator"),
  workspace = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(path.join(root, "package.json"))("typescript");
const files = [
  "src/lib/arithmetic/generate.ts",
  "src/lib/arithmetic-v2/sheet.ts",
  "src/lib/arithmeticRegeneration.ts",
  "src/lib/arithmetic/byteBudget.ts",
  "src/__tests__/unit/arithmeticRoundSelection.test.ts",
  "scripts/qa/arithmetic-limit-sizing.ts",
  "scripts/qa/arithmetic-limit-performance.ts",
  "src/lib/workspaceArithmeticRoutes.ts",
  "src/lib/workspaceArithmeticV2Routes.ts",
  "src/lib/workspaceArithmeticRegenerationRoutes.ts",
  "src/lib/privateDocumentActions.ts",
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
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: ["node"],
    typeRoots: [path.join(root, "node_modules/@types")],
    paths: {
      react: [path.join(root, "node_modules/@types/react/index.d.ts")],
      "@/*": [path.join(workspace, "src/*")],
      katex: [path.join(root, "node_modules/@types/katex/index.d.ts")],
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
