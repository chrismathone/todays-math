import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const project = process.cwd();
// Read the exact local-font metadata; Next's generated CSS is unavailable in Vite.
// Font bytes, weights and CSS variable names stay owned by src/app/fonts.ts.
function canonicalFonts() {
  const source = ts.createSourceFile(
    "fonts.ts",
    readFileSync(resolve(project, "src/app/fonts.ts"), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const blocks: string[] = [];
  const variables: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const call = declaration.initializer;
      if (
        !call ||
        !ts.isCallExpression(call) ||
        call.expression.getText(source) !== "localFont"
      )
        continue;
      const object = call.arguments[0];
      if (!object || !ts.isObjectLiteralExpression(object))
        throw new Error("Unknown canonical font declaration");
      const fields = new Map<string, string>();
      for (const property of object.properties) {
        if (
          ts.isPropertyAssignment(property) &&
          ts.isStringLiteral(property.initializer)
        )
          fields.set(property.name.getText(source), property.initializer.text);
      }
      const src = fields.get("src"),
        variable = fields.get("variable");
      if (!src || !variable || !src.startsWith("../../public/fonts/"))
        throw new Error("Canonical local-font shape changed");
      const family = `bank-qa-${variable.slice(2)}`;
      blocks.push(
        `@font-face{font-family:"${family}";src:url("${src.slice("../../public".length)}") format("woff2");font-weight:${fields.get("weight")};font-style:${fields.get("style")};font-display:${fields.get("display")};}`,
      );
      variables.push(`${variable}:"${family}"`);
    }
  }
  if (blocks.length !== 2) throw new Error("Canonical font inventory changed");
  return `${blocks.join("\n")}\n:root{${variables.join(";")}}`;
}
export default defineConfig({
  root: resolve(project, ".qa-artifacts/math-question-formats-20261018/paper"),
  publicDir: resolve(
    project,
    ".qa-artifacts/math-question-formats-20261018/paper/public",
  ),
  envDir: false,
  plugins: [
    react(),
    {
      name: "canonical-local-fonts",
      transformIndexHtml: () => [
        { tag: "style", children: canonicalFonts(), injectTo: "head" },
      ],
    },
  ],
  resolve: {
    alias: [
      {
        find: "next/link",
        replacement: resolve(project, "scripts/qa/judge-paper/next-link.tsx"),
      },
      { find: "@", replacement: resolve(project, "src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4268,
    strictPort: true,
    fs: { allow: [project, realpathSync(resolve(project, "node_modules"))] },
  },
});
