// Run from the worker checkout, using only an existing installation:
// node scripts/qa/arithmetic-figure-necessity-elementary-run.mjs C:/Creative/testautocreator [--report] [--typecheck]
import { createRequire, registerHooks } from "node:module";
import { resolve } from "node:path";

const installedRoot = resolve(process.argv[2] ?? ".");
const installedRequire = createRequire(resolve(installedRoot, "package.json"));
const ownRequire = createRequire(import.meta.url);
// Node 24 resolution hook, process-local: no NODE_PATH/env file changes,
// installation, junction, network or file output needed to use root tools.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        !specifier.startsWith(".") &&
        !specifier.startsWith("/") &&
        !specifier.includes(":")
      ) {
        return nextResolve(installedRequire.resolve(specifier), context);
      }
      throw error;
    }
  },
});
if (process.argv.includes("--typecheck")) {
  const ts = installedRequire("typescript");
  const root = process.cwd().replaceAll("\\", "/");
  const nodeModules = resolve(installedRoot, "node_modules").replaceAll(
    "\\",
    "/",
  );
  const program = ts.createProgram(
    [
      resolve("src/lib/arithmetic-v2/presentation/figurePolicyElementary.ts"),
      resolve("scripts/qa/arithmetic-figure-necessity-elementary.ts"),
    ],
    {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      resolveJsonModule: true,
      types: ["node"],
      typeRoots: [`${nodeModules}/@types`],
      paths: { "@/*": [`${root}/src/*`], "*": [`${nodeModules}/*`] },
    },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (file) => file,
        getNewLine: () => "\n",
      }),
    );
    process.exitCode = 1;
  } else {
    console.log("Focused strict TypeScript: PASS");
  }
} else {
  installedRequire("tsx/cjs");
  ownRequire("./arithmetic-figure-necessity-elementary.ts");
}
