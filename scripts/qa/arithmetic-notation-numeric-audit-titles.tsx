/** All catalog titles, including geometry, per owner's final scope addition.
 * Counts/grades and punctuation joining Korean phrases are prose. Operators,
 * literal scale fractions, powers, Latin variables and physical units are math.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { arithmeticV2Definitions } from "@/lib/arithmetic-v2/registry";
import { arithmeticTypeTitle } from "@/lib/arithmetic-v2/presentation/text";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
declare const __AUDIT_BUILD__: {
  sourceRoot: string;
  built: string;
  sha256: Record<string, string | null>;
};
const { JSDOM } = createRequire("C:/Creative/testautocreator/package.json")(
  "jsdom",
) as { JSDOM: new () => { window: { document: Document } } };
const body = new JSDOM().window.document.body;
const baseline = process.argv.includes("--baseline");
const rows = arithmeticV2Definitions().map((definition) => {
  const formatted = arithmeticTypeTitle(definition.title);
  const html = renderToStaticMarkup(
    <MarkdownRenderer content={formatted} inline />,
  );
  body.innerHTML = html;
  const annotations = [...body.querySelectorAll("annotation")].map(
    (n) => n.textContent ?? "",
  );
  const fractionCount = body.querySelectorAll("mfrac").length;
  const errors = body.querySelectorAll(".katex-error,.math-raw").length;
  for (const math of body.querySelectorAll(".katex")) math.remove();
  const outside = body.textContent ?? "";
  const explicitOutside = formatted.replace(
    /\$\$[\s\S]*?\$\$|\$(?:\\.|[^$])*\$/g,
    " ",
  );
  const mathSignal = /[A-Za-z=+×÷√<>≤≥≠²³^]|\d+\s*\/\s*\d+|\s[-−]\s/;
  const findings: string[] = [];
  if (mathSignal.test(explicitOutside))
    findings.push("not-explicit-before-heuristics");
  if (mathSignal.test(outside)) findings.push("raw-math-after-render");
  if (errors || html.includes("#cc0000")) findings.push("renderer-error");
  // These are three/two alternative multipliers, not one product of fractions.
  const scaleFractions =
    definition.id === "ec-g4-large-scale-down-v1"
      ? 3
      : definition.id === "ec-g4-decimal-scale-down-v1"
        ? 2
        : 0;
  if (
    scaleFractions &&
    (fractionCount !== scaleFractions ||
      annotations.some((a) => /\\(?:cdot|times)/.test(a)))
  )
    findings.push("scale-fraction-list-semantics");
  return {
    family: definition.id,
    title: definition.title,
    formatted,
    outside,
    annotations,
    fractionCount,
    findings,
  };
});
const findings = rows.filter((row) => row.findings.length);
const result = { build: __AUDIT_BUILD__, titles: rows.length, findings, rows };
writeFileSync(
  `scripts/qa/arithmetic-notation-numeric-audit-titles-${baseline ? "baseline" : "verification"}.json`,
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify({ titles: rows.length, findings }, null, 2));
if (!baseline) assert.equal(findings.length, 0);
