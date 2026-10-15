import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
const requireTools = createRequire("C:/Creative/testautocreator/package.json");
const { build } = createRequire(requireTools.resolve("tsx"))("esbuild");
const sourceRoot = resolve(process.argv[2] ?? ".");
const fixtures = process.argv.includes("--fixtures");
const titles = process.argv.includes("--titles");
await build({
  entryPoints: [
    titles
      ? "scripts/qa/arithmetic-notation-numeric-audit-titles.tsx"
      : fixtures
        ? "scripts/qa/arithmetic-notation-numeric-audit-fixtures.tsx"
        : "scripts/qa/arithmetic-notation-numeric-audit-render.tsx",
  ],
  outfile: titles
    ? "scripts/qa/arithmetic-notation-numeric-audit-runtime-titles.mjs"
    : fixtures
      ? "scripts/qa/arithmetic-notation-numeric-audit-runtime-fixtures.mjs"
      : "scripts/qa/arithmetic-notation-numeric-audit-runtime.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  alias: { "@": resolve(sourceRoot, "src") },
  define: {
    __AUDIT_BUILD__: JSON.stringify({
      sourceRoot,
      built: new Date().toISOString(),
      sha256: Object.fromEntries(
        [
          "src/lib/arithmeticOutput.ts",
          "src/components/math/MarkdownRenderer.tsx",
          "src/lib/arithmetic-v2/presentation/notation.ts",
          "src/lib/arithmetic-v2/presentation/text.ts",
          "src/components/arithmetic/GradeArithmeticPaper.tsx",
          "src/components/arithmetic/ArithmeticPaper.tsx",
          "src/components/admin/AdminDocumentPreview.tsx",
        ].map((file) => [
          file,
          existsSync(resolve(sourceRoot, file))
            ? createHash("sha256")
                .update(readFileSync(resolve(sourceRoot, file)))
                .digest("hex")
            : null,
        ]),
      ),
    }),
  },
  loader: { ".css": "empty" },
  logLevel: "warning",
});
