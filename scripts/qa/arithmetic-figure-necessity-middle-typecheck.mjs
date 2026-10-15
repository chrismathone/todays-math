import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = "C:/Creative/testautocreator";
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(path.join(root, "package.json"))("typescript");
const program = ts.createProgram(
  [
    path.join(
      workspace,
      "src/lib/arithmetic-v2/presentation/figurePolicyMiddle.ts",
    ),
  ],
  {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
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
} else console.log("Middle figure policy: strict ES2017 TypeScript passed.");
