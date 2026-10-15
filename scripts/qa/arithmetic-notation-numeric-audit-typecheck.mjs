import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const toolsRoot = "C:/Creative/testautocreator";
const sourceRoot = path.resolve(process.argv[2] ?? toolsRoot);
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(path.join(toolsRoot, "package.json"))("typescript");
const files = ["inventory.ts", "render.tsx", "fixtures.tsx", "titles.tsx"].map(
  (name) =>
    path.join(
      workspace,
      `scripts/qa/arithmetic-notation-numeric-audit-${name}`,
    ),
);
const program = ts.createProgram(
  [...files, path.join(toolsRoot, "node_modules/next/types/global.d.ts")],
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
    types: ["node", "react"],
    typeRoots: [path.join(toolsRoot, "node_modules/@types")],
    paths: {
      "@/*": [path.join(sourceRoot, "src/*")],
      react: [path.join(toolsRoot, "node_modules/@types/react")],
      "react/*": [path.join(toolsRoot, "node_modules/@types/react/*")],
      "react-dom/*": [path.join(toolsRoot, "node_modules/@types/react-dom/*")],
      "*": [path.join(toolsRoot, "node_modules/*")],
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
} else console.log(`Focused TypeScript: ${files.length} audit entries passed`);
