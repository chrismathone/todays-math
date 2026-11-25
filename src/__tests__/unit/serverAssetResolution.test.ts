// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import ts from "typescript";
import { selfHostedMathCss } from "@/lib/examReport/paperHtml";
const paths = [
  "src/lib/examReport/paperHtml.ts",
  "src/lib/textbook/render/qr.server.ts",
  "src/app/api/studio/pdf-worker/route.ts",
  "src/app/api/studio/pdf-assets/[kind]/[filename]/route.ts",
  "src/app/api/dev/unified/pdf-worker/route.ts",
  "src/app/api/dev/unified/pdf-assets/[kind]/[filename]/route.ts",
];
it.each(paths)(
  "avoids runtime require resolution in Turbopack server graph: %s",
  (path) => {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const unsafe: string[] = [];
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        /(?:createRequire|require(?:Asset)?\.resolve)/.test(
          node.expression.getText(source),
        )
      )
        unsafe.push(node.expression.getText(source));
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(unsafe).toEqual([]);
  },
);
it("embeds every KaTeX face even when its last declaration has no semicolon", () => {
  const css = selfHostedMathCss();
  expect(css).not.toContain("url(fonts/");
  expect(css.match(/data:font\/woff2;base64,/g)?.length).toBe(20);
});
