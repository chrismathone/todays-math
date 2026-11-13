// Run from the repository root with the existing TypeScript installation.
// This is a resolved runtime project-module graph, NOT a production chunk measurement.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const baseline = "a5ccd4e9f90644fcaa2389ab8839af8dab79e879";
const root = process.cwd();
const entries = [
  "src/components/admin/AdminDocumentPreview.tsx",
  "src/components/arithmetic/ArithmeticTypePreview.tsx",
];
const targets = [
  "src/lib/arithmetic-v2/geometry.ts",
  "src/lib/arithmetic-v2/presentation/figureFirst.ts",
  "src/lib/arithmetic-v2/render.ts",
];
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
assert.equal(config.error, undefined);
const options = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  root,
).options;
const baselineEntries = new Map(
  entries.map((file) => [
    file,
    execFileSync("git", ["show", `${baseline}:${file}`], { encoding: "utf8" }),
  ]),
);
// The only production edits are these entries and the new lazy admin child.
// Other project modules must still equal the baseline, so both graphs resolve
// the same real dependency files without a second checkout or dependency install.
const changed = execFileSync(
  "git",
  ["diff", baseline, "--name-only", "--", "src"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
assert(
  changed.every(
    (file) =>
      entries.includes(file) ||
      file === "src/components/admin/AdminArithmeticPreview.tsx" ||
      file.startsWith("src/__tests__/"),
  ),
  "Unrelated production changes invalidate the baseline overlay",
);

function graph(version) {
  const cache = new Map();
  function moduleEdges(file) {
    if (cache.has(file)) return cache.get(file);
    const edges = [];
    cache.set(file, edges);
    if (!/\.[cm]?[jt]sx?$/.test(file)) return edges;
    const source =
      version === "baseline" && baselineEntries.has(file)
        ? baselineEntries.get(file)
        : readFileSync(file, "utf8");
    // Erase types before parsing dependencies: type-only imports do not load code.
    const js = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        ...options,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        verbatimModuleSyntax: false,
        isolatedModules: true,
      },
    }).outputText;
    const ast = ts.createSourceFile(
      file + ".js",
      js,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    function add(specifier, dynamic) {
      if (!(specifier.startsWith(".") || specifier.startsWith("@/"))) return;
      let resolved = ts.resolveModuleName(
        specifier,
        path.resolve(file),
        options,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      // TypeScript does not resolve CSS modules, but they are real static leaves.
      if (
        !resolved &&
        specifier.startsWith(".") &&
        existsSync(path.resolve(path.dirname(file), specifier))
      )
        resolved = path.resolve(path.dirname(file), specifier);
      assert(resolved, `Unresolved ${specifier} from ${file}`);
      const target = path.relative(root, resolved);
      assert(
        !target.startsWith(".."),
        `Unexpected external project module: ${target}`,
      );
      edges.push({ target, dynamic });
    }
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        add(node.moduleSpecifier.text, false);
      if (
        ts.isCallExpression(node) &&
        node.arguments.length &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword)
          add(node.arguments[0].text, true);
        else if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"
        )
          add(node.arguments[0].text, false);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    return edges;
  }
  function reachable(entry, dynamic) {
    const paths = new Map([[entry, [entry]]]);
    for (const [file, route] of paths)
      for (const edge of moduleEdges(file)) {
        if (!dynamic && edge.dynamic) continue;
        if (!paths.has(edge.target))
          paths.set(edge.target, [...route, edge.target]);
      }
    return paths;
  }
  return entries.map((entry) => {
    const initial = reachable(entry, false);
    const total = reachable(entry, true);
    return {
      entry,
      staticProjectModules: initial.size,
      staticArithmeticV2Modules: [...initial.keys()].filter((file) =>
        file.startsWith("src/lib/arithmetic-v2/"),
      ),
      targetPaths: Object.fromEntries(
        targets.map((target) => [target, initial.get(target) ?? null]),
      ),
      deferredTargetPaths: Object.fromEntries(
        targets.map((target) => [target, total.get(target) ?? null]),
      ),
      dynamicEdgesFromInitial: [...initial.keys()].flatMap((file) =>
        moduleEdges(file)
          .filter((edge) => edge.dynamic)
          .map((edge) => ({ from: file, to: edge.target })),
      ),
      initialModules: [...initial.keys()].sort(),
    };
  });
}
const result = {
  baseline,
  method:
    "TypeScript 5.9 runtime-import erasure, AST edges, TypeScript module resolution; project modules only; no tree shaking, execution, package internals, network, or Next build",
  baselineGraphs: graph("baseline"),
  candidateGraphs: graph("candidate"),
};
for (let i = 0; i < entries.length; i++) {
  assert(
    result.baselineGraphs[i].targetPaths[targets[0]],
    "Baseline must reach figure geometry statically",
  );
  for (const target of targets)
    assert.equal(
      result.candidateGraphs[i].targetPaths[target],
      null,
      `${target} is still static from ${entries[i]}`,
    );
  assert(
    result.candidateGraphs[i].deferredTargetPaths[targets[0]],
    "Geometry must remain available after dynamic import",
  );
}
writeFileSync(
  new URL("./dependency-comparison.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    result.candidateGraphs.map((candidate, i) => ({
      entry: candidate.entry,
      baselineStaticModules: result.baselineGraphs[i].staticProjectModules,
      candidateStaticModules: candidate.staticProjectModules,
      baselineArithmeticModules:
        result.baselineGraphs[i].staticArithmeticV2Modules.length,
      candidateArithmeticModules: candidate.staticArithmeticV2Modules.length,
      figureGeometryInitiallyStatic: Boolean(candidate.targetPaths[targets[0]]),
    })),
    null,
    2,
  ),
);
