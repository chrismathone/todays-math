import "./init-arithmetic-packs";
import { readEvidenceText } from "./arithmetic-full-figure-audit";
/** Independent inventory, immutable-source, geometry and editor replay checks. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import {
  replayLabelMoves,
  type LabelMove,
} from "./arithmetic-full-figure-audit-labels";
import type { FigureEditCommand } from "../../src/lib/dev-ai/figure-edit-contract";
import { applyFigureEdits } from "../../src/components/unified/figure-editor/figureEditApply";
import {
  editFigureObject,
  figureObjects,
  readFigureSvg,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import { relocateFigureLabel } from "../../src/components/unified/figure-editor/figureLabelOps";
import { presentArithmeticRemainingSvg } from "../../src/lib/arithmetic-v2/presentation/remaining";
import { arithmeticGeometryCatalogSvg } from "../../src/lib/arithmetic-v2/geometry";
import { output, hash, census } from "./arithmetic-full-figure-audit";
import { plan, recycleAuditDom } from "./arithmetic-full-figure-audit-build";
import {
  dimension,
  editorTypeset,
  isolatedAngles,
  editorHash,
} from "./arithmetic-full-figure-audit-editor";

type Step = {
  command?: FigureEditCommand;
  commands?: FigureEditCommand[];
  moves?: LabelMove[];
  layoutFont?: number;
  operation?: string;
  text?: string;
  d?: string;
  position?: string;
  attrs?: Record<string, string>;
  offset?: number;
  t?: number;
  frameBounds?: [number, number][];
  inputSha256: string;
  outputSha256: string;
};
type Proof = {
  id: string;
  family: string;
  steps: Step[];
  outputSha256: string;
};
async function main() {
  const before = JSON.parse(
    readEvidenceText(`${output}/census.json`, "utf8"),
  ) as ReturnType<typeof census>;
  const current = census();
  assert.deepEqual(
    current.rows.map((row) => ({ ...row, displaySha256: undefined })),
    before.rows.map((row) => ({ ...row, displaySha256: undefined })),
    "All canonical IDs, sources, givens, answers and independent verifiers unchanged",
  );
  const entries = JSON.parse(
    readEvidenceText(`${output}/remaining/displays.json`, "utf8"),
  ) as Record<string, [string, string]>;
  const evidence = JSON.parse(
    readEvidenceText(`${output}/remaining/proof.json`, "utf8"),
  ) as { hashBasis?: string; proofs: Proof[]; rejected: unknown[] };
  const migrate = process.argv.includes("--migrate-session-hashes");
  const browser = migrate
    ? await chromium.launch({ headless: true })
    : undefined;
  const page = browser ? await browser.newPage() : undefined;
  if (page) {
    await page.route("**/*", (r) => r.abort());
    await page.evaluate("globalThis.__name=(v)=>v");
  }
  assert.ok(
    evidence.hashBasis || migrate,
    "Raw step hashes contain session UUIDs; run --migrate-session-hashes to replay all and prove final byte identity",
  );
  assert.equal(evidence.rejected.length, 0);
  const proofs = new Map(evidence.proofs.map((p) => [p.id, p]));
  const geometry = (svg: string) =>
    [
      ...readFigureSvg(svg).querySelectorAll(
        "line,path,polygon,polyline,circle,ellipse,rect",
      ),
    ]
      .filter((n) => !n.closest("text,[data-label],defs,mask"))
      .map((n) =>
        JSON.stringify([
          n.tagName,
          ...[
            "x",
            "y",
            "x1",
            "y1",
            "x2",
            "y2",
            "points",
            "d",
            "cx",
            "cy",
            "r",
            "rx",
            "ry",
            "width",
            "height",
            "transform",
          ].map((k) => n.getAttribute(k)),
        ]),
      );
  const measured = (a: number[], o: number[], b: number[]) =>
    (Math.atan2(
      Math.abs((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])),
      (a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]),
    ) *
      180) /
    Math.PI;
  const checked: string[] = [],
    replayed: string[] = [],
    angleChecks: { id: string; degrees: number; expected: number }[] = [];
  const associationFailures: unknown[] = [];
  let sourceGateChecks = 0,
    preservedGeometry = 0,
    dimensionCommands = 0,
    preservedLabels = 0;
  const labelText = (s: string) =>
    s
      .replace(/\\(?:mathrm|text)\{([^{}]*)\}/g, "$1")
      .replace(/\\[,;! ]/g, "")
      .replace(/[\s$]/g, "");
  const familyRows = new Map<string, string[]>();
  for (const row of current.rows)
    if (entries[row.id]) {
      const ids = familyRows.get(row.family) ?? [];
      ids.push(row.id);
      familyRows.set(row.family, ids);
    }
  const replayIds = new Set(
    [...familyRows.values()].flatMap((ids) => [ids[0], ids.at(-1)!]),
  );
  let visited = 0;
  for (const row of current.rows.filter(
    (r) => r.owner === "full-audit-worker",
  )) {
    if (visited++ % 20 === 0) await recycleAuditDom();
    const p = plan(row);
    const original = arithmeticGeometryCatalogSvg(row.id);
    if (!p) {
      assert.equal(entries[row.id], undefined);
      assert.equal(presentArithmeticRemainingSvg(row.id, original), undefined);
      continue;
    }
    assert.equal(
      row.route,
      "raw",
      "Never intercept another owner or angle route",
    );
    const entry = entries[row.id],
      proof = proofs.get(row.id)!;
    assert.ok(entry && proof, row.id);
    assert.equal(entry[0], original);
    assert.equal(entry[1], presentArithmeticRemainingSvg(row.id, original));
    assert.equal(hash(entry[1]), proof.outputSha256);
    assert.equal(
      presentArithmeticRemainingSvg(row.id, original + " "),
      undefined,
    );
    sourceGateChecks++;
    const expectedLabels = [...readFigureSvg(p.base).querySelectorAll("text")]
      .map((n) => n.getAttribute("data-mj") ?? n.textContent ?? "")
      .concat(
        p.commands.filter((c) => c.op === "addLabel").map((c) => c.text),
        p.angles.flatMap((a) => (a.text ? [a.text] : [])),
        p.dimensions.map((d) => d.text),
      )
      .map(labelText);
    const actualLabels = [
      ...readFigureSvg(entry[1]).querySelectorAll("[data-label],text"),
    ]
      .filter((n) => n.hasAttribute("data-label") || !n.closest("[data-label]"))
      .map((n) =>
        labelText(n.getAttribute("data-label") ?? n.textContent ?? ""),
      );
    for (const expected of expectedLabels) {
      const i = actualLabels.indexOf(expected);
      assert.ok(i >= 0, `Lost public label ${row.id}: ${expected}`);
      actualLabels.splice(i, 1);
      preservedLabels++;
    }
    assert.deepEqual(actualLabels, [], `Unexpected public labels ${row.id}`);
    for (const step of proof.steps) {
      const c = step.command;
      if (
        c?.op !== "addLabel" ||
        !/^[A-Z]$/.test(c.text) ||
        typeof c.at === "string"
      )
        continue;
      const label = [
        ...readFigureSvg(entry[1]).querySelectorAll("[data-label]"),
      ].find((n) => n.getAttribute("data-label") === c.text)!;
      assert.ok(label, `${row.id}: missing point ${c.text}`);
      const distance = Math.hypot(
        Number(label.getAttribute("data-x")) - c.at.x,
        Number(label.getAttribute("data-y")) -
          0.32 * Number(label.getAttribute("data-fs")) -
          c.at.y,
      );
      assert.ok(
        distance <= 32,
        `${row.id}: detached ${c.text}, ${distance} units from its point`,
      );
    }
    const actual = geometry(entry[1]);
    for (const signature of geometry(p.base)) {
      const i = actual.indexOf(signature);
      assert.ok(i >= 0, `Lost source geometry ${row.id}: ${signature}`);
      actual.splice(i, 1);
      preservedGeometry++;
    }
    for (const a of p.angles)
      if (a.right || a.text) {
        const expected = a.right ? 90 : Number(a.text!.replace("°", "")),
          degrees = measured(a.from, a.at, a.to);
        assert.ok(
          Math.abs(degrees - expected) < 0.02,
          `${row.id} ${degrees} vs ${expected}`,
        );
        angleChecks.push({ id: row.id, degrees, expected });
      }
    dimensionCommands += p.dimensions.length;
    checked.push(row.id);
    if (
      !process.argv.includes("--replay-all") &&
      !migrate &&
      !replayIds.has(row.id) &&
      !/^gm-m3-trig-special-length-30-(?:1\d|20)-(?:2|5)$/.test(row.id)
    )
      continue;
    let svg = p.base;
    for (const step of proof.steps) {
      if (migrate) step.inputSha256 = editorHash(svg);
      assert.equal(editorHash(svg), step.inputSha256, `${row.id} editor input`);
      if (step.operation === "labelMoves")
        svg = replayLabelMoves(svg, step.moves!);
      else if (step.operation === "isolatedAngles")
        svg = isolatedAngles(svg, step.commands!, step.layoutFont);
      else if (step.command?.op === "addDimension") {
        const command = step.command;
        assert.ok(
          typeof command.from !== "string" && typeof command.to !== "string",
        );
        const result = await dimension(
          page ?? (null as unknown as Page),
          svg,
          {
            from: [command.from.x, command.from.y],
            to: [command.to.x, command.to.y],
            text: command.text,
          },
          {
            offset: step.offset!,
            t: step.t ?? 50,
            frameBounds: step.frameBounds,
            // These two legacy repairs measured the real glyph boundary; the
            // first proof format omitted that frame input. Re-measure exactly.
            measureFrame:
              migrate &&
              !step.frameBounds &&
              /^gt1-m2-incenter-(area|perimeter)-0-10$/.test(row.id),
          },
        );
        assert.ok(!("reason" in result));
        svg = result.svg;
        if (migrate) step.frameBounds = result.frameBounds;
      } else if (step.command) {
        const result = applyFigureEdits(svg, [step.command]);
        assert.equal(
          result.rejected.length,
          0,
          JSON.stringify(result.rejected),
        );
        svg = result.svg;
      } else {
        const object = figureObjects(svg).find((o) =>
          step.d
            ? o.type === "path" && o.attrs.d === step.d
            : o.type === "text" && o.text === step.text,
        )!;
        assert.ok(object);
        if (step.operation === "relocateFigureLabel") {
          const result = relocateFigureLabel(svg, object.id, step.position);
          assert.ok(!("reason" in result));
          svg = result.svg;
        } else {
          assert.equal(step.operation, "editFigureObject");
          svg = editFigureObject(svg, object.id, step.attrs!);
        }
      }
      if (migrate) step.outputSha256 = editorHash(svg);
      assert.equal(
        editorHash(svg),
        step.outputSha256,
        `${row.id} editor output`,
      );
    }
    const objects = figureObjects(svg),
      used = new Set<number>();
    // Parallel-line from/to coordinates are direction samples on infinite
    // rays, not competing vertices. Only real arm endpoints constrain ownership.
    for (const a of p.angles.filter(
      (a) => a.text && p.family !== "m1-parallel-angle",
    )) {
      const index = objects.findIndex(
        (o, i) => o.type === "text" && o.text === a.text && !used.has(i),
      );
      assert.ok(index >= 0);
      used.add(index);
      const label = objects[index],
        next = objects[index + 1];
      if (
        next?.type === "path" &&
        /Q/i.test(next.attrs.d ?? "") &&
        !next.attrs["stroke-dasharray"]
      )
        continue;
      const center = [
          Number(label.attrs.x),
          Number(label.attrs.y) - 0.32 * Number(label.attrs["font-size"]),
        ],
        own = Math.hypot(center[0] - a.at[0], center[1] - a.at[1]);
      if (
        [a.from, a.to].some(
          (point) =>
            Math.hypot(center[0] - point[0], center[1] - point[1]) + 2 < own,
        )
      )
        associationFailures.push({
          id: row.id,
          text: a.text,
          at: a.at,
          from: a.from,
          to: a.to,
          center,
          reason:
            "internal value is closer to a different arm endpoint than its angle vertex",
        });
    }
    const display = (await editorTypeset(svg)).replace(
      /(<svg\b[^>]*>)/,
      "$1<desc>arithmetic-remaining-presentation-v1</desc>",
    );
    assert.equal(
      display,
      entry[1],
      `${row.id} exact actual editor typesetting`,
    );
    replayed.push(row.id);
    if (replayed.length % 250 === 0)
      console.log(`Replayed ${replayed.length} exact final SVGs`);
  }
  assert.deepEqual(
    Object.keys(entries).sort(),
    checked.sort(),
    "No candidate omitted or extra display asset",
  );
  assert.equal(proofs.size, checked.length);
  if (migrate) {
    evidence.hashBasis = "SVG excluding session-local data-object-id";
    writeFileSync(
      `${output}/remaining/proof.json`,
      JSON.stringify(evidence) + "\n",
    );
  }
  for (const row of current.rows.filter((r) => r.owner !== "full-audit-worker"))
    assert.equal(
      presentArithmeticRemainingSvg(
        row.id,
        arithmeticGeometryCatalogSvg(row.id),
      ),
      undefined,
    );
  for (const id of checked)
    assert.equal(
      presentArithmeticRemainingSvg(id + "-999999", entries[id][0]),
      undefined,
    );
  const result = {
    canonicalFigures: current.rows.length,
    sourceGateChecks,
    preservedGeometry,
    preservedLabels,
    dimensionCommands,
    checked,
    replayed,
    angleChecks,
    failures: associationFailures,
  };
  writeFileSync(
    `${output}/remaining/verification.json`,
    JSON.stringify(result) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        canonicalFigures: result.canonicalFigures,
        sourceGateChecks,
        preservedGeometry,
        preservedLabels,
        dimensionCommands,
        displayFigures: checked.length,
        replayed: replayed.length,
        angleChecks: angleChecks.length,
        failures: associationFailures,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  assert.deepEqual(associationFailures, []);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
