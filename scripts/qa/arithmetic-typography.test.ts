/** Run: tsx --test scripts/qa/arithmetic-typography.test.ts */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import angleAssets from "../../src/lib/arithmetic-v2/families/geometry-angle-assets-v1.json";
import { EXTRA_GEOMETRY_FIGURE_MAPS } from "../../src/lib/arithmetic-v2/extraGeometry";
import {
  placeLabel,
  typesetLabel,
} from "../../src/components/unified/figure-editor/mathjaxLabel";
import { arithmeticTypographyManifest } from "../../src/lib/arithmetic-v2/presentation/typographyData";
import { typesetArithmeticGeometrySvg as typeset } from "../../src/lib/arithmetic-v2/presentation/typography";
import {
  arithmeticLabelParts,
  arithmeticLabelTex,
  escapeTypographyXml,
  unescapeTypographyXml,
} from "../../src/lib/arithmetic-v2/presentation/typographyLabel";

const fixture = (text: string, attrs = "", ancestor = "") =>
  `<svg viewBox="-5 -10 240 250" width="240" height="250"><g ${ancestor}><text id="label" x="120" y="60" font-size="20" fill="#123456" stroke="none" ${attrs}>${escapeTypographyXml(text)}</text></g></svg>`;

test("exact editor glyph paths, metrics, anchors and baseline for representative math", () => {
  for (const text of [
    "2 m",
    "20000 cm²",
    "8π/3 cm³",
    "60°",
    "ABC",
    "r",
    "m",
    "ℓ ∥ m",
    "1/2",
  ]) {
    const tex = arithmeticLabelTex(text)!;
    const laid = typesetLabel(tex)!;
    assert.ok(laid, text);
    for (const anchor of ["start", "middle", "end"] as const) {
      for (const centerY of [false, true]) {
        const actual = typeset(
          fixture(
            text,
            `text-anchor="${anchor}" dominant-baseline="${centerY ? "middle" : "alphabetic"}"`,
          ),
        );
        const expected = placeLabel(
          laid,
          text,
          120,
          60,
          20,
          "currentColor",
          undefined,
          { anchor, centerY },
        )!;
        for (const attribute of [
          "data-anchor",
          "data-x",
          "data-y",
          "data-base",
          "data-fs",
          "data-w",
          "data-a",
          "data-d",
          "transform",
        ]) {
          const pattern = new RegExp(`${attribute}="([^"]+)"`);
          assert.equal(
            pattern.exec(actual)?.[1],
            pattern.exec(expected)?.[1],
            `${text} ${attribute}`,
          );
        }
        assert.deepEqual(
          [...actual.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]),
          [...expected.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]),
          text,
        );
      }
    }
  }
});

test("physical units are roman, uppercase points roman, lowercase variables italic", () => {
  assert.equal(arithmeticLabelTex("2m"), "$2\\mathrm{m}$");
  assert.equal(arithmeticLabelTex("m"), "$m$");
  assert.equal(arithmeticLabelTex("r"), "$r$");
  assert.equal(arithmeticLabelTex("ABC"), "$\\mathrm{ABC}$");
  assert.equal(arithmeticLabelParts("m로 나타내기")[0].tex, "$\\mathrm{m}$");
  const m = typeset(fixture("2m"));
  assert.match(m, /data-c="6D"/);
  assert.doesNotMatch(m, /data-c="1D45A"/);
  assert.match(typeset(fixture("m")), /data-c="1D45A"/);
  assert.match(typeset(fixture("r")), /data-c="1D45F"/);
});

test("mixed CJK stays visible; roman quantities, fractions and powers use editor paths", () => {
  for (const text of [
    "cm²로 나타내기",
    "높이 2 cm",
    "부피 8π/3 cm³",
    "중심각 60°",
    "반지름 r",
  ]) {
    const out = typeset(fixture(text, 'text-anchor="middle"'));
    assert.match(out, /data-arithmetic-typeset="1"/);
    assert.match(out, /<path\b/);
    const retained = [...out.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)]
      .map((m) => unescapeTypographyXml(m[1]))
      .join("");
    assert.equal(retained, (text.match(/[가-힯]+/g) ?? []).join(""));
    assert.match(out, /aria-label=/);
    assert.equal(typeset(out), out, `idempotent mixed ${text}`);
  }
});

test("retains rotations, inherited/style layout, original accessibility and dimensions", () => {
  const source = fixture(
    "높이 2 cm",
    'transform="rotate(-90 120 60)" data-owner="side"',
    'font-family="Arial" text-anchor="middle" dominant-baseline="central"',
  );
  const out = typeset(source);
  assert.match(out, /transform="rotate\(-90 120 60\)"/);
  assert.match(out, /data-owner="side"/);
  assert.match(out, /data-anchor="middle"/);
  assert.match(out, /data-original-label="높이 2 cm"/);
  assert.equal(out.match(/<svg[^>]*>/)?.[0], source.match(/<svg[^>]*>/)?.[0]);
  const styled =
    '<svg><style>text{font:20px Arial;text-anchor:middle;dominant-baseline:middle;fill:#000;stroke:none}</style><g stroke="black"><text x="120" y="65">2 m</text></g></svg>';
  assert.match(typeset(styled), /data-fs="20.000"/);
  assert.match(typeset(styled), /data-base="71.660"/);
  assert.doesNotMatch(typeset(styled), /stroke-linejoin="round"/);
});

test("normalizer is display-only and preserves source wording metadata", () => {
  const source = fixture("3각형");
  const result = typeset(source, {
    normalizeLabel: (text) => text.replace("3각형", "삼각형"),
  });
  assert.match(result, />삼각형<\/text>/);
  assert.match(result, /data-original-label="3각형"/);
  assert.equal(source, fixture("3각형"));
  assert.equal(typeset(result, { normalizeLabel: () => "unexpected" }), result);
});

test("unknown, unsupported positioned spans and already typed engine content remain unchanged", () => {
  for (const source of [
    fixture("not-in-dictionary"),
    fixture("🙂 2 cm"),
    fixture("알 수 없음 999999 m"),
    fixture("겨냥도"),
    fixture("2 cm", 'x="10 20"'),
    fixture("2 cm", 'rotate="15"'),
    fixture("2 cm", 'font-weight="700"'),
    '<svg><text x="10"><tspan dy="3">2 cm</tspan></text></svg>',
    '<svg><defs><text>2 cm</text></defs><g data-label="engine"><text>2 cm</text><path d="M0 0"/></g></svg>',
    '<svg><style>.label{font-size:30px}</style><text class="label">2 cm</text></svg>',
  ])
    assert.equal(typeset(source), source);
  const engine = `<svg>${placeLabel(typesetLabel("60°")!, "60°", 10, 20, 18, "#000")}</svg>`;
  assert.equal(typeset(engine), engine);
  const frozenAngles = JSON.parse(
    inflateRawSync(Buffer.from(angleAssets.svgPack, "base64")).toString(),
  ) as Record<string, string>;
  assert.equal(
    Object.keys(frozenAngles).length,
    arithmeticTypographyManifest.alreadyTypedAngleFigures,
  );
  for (const [id, svg] of Object.entries(frozenAngles))
    assert.equal(typeset(svg), svg, id);
});

test("XML entities, halos and markup in callback cannot produce active SVG", () => {
  const source =
    '<svg><text x="5" y="6" font-size="20" stroke="white" stroke-width="3">60&#176;</text></svg>';
  const out = typeset(source);
  assert.match(out, /data-original-label="60°"/);
  assert.match(out, /stroke="white" stroke-width="150.0"/);
  assert.ok(
    out.indexOf('fill="none"') < out.lastIndexOf('fill="currentColor"'),
  );
  assert.equal(unescapeTypographyXml("&amp;lt;"), "&lt;");
  const changed = typeset(fixture("3각형"), {
    normalizeLabel: () => '<script>alert("bad")</script>',
  });
  assert.doesNotMatch(changed, /<script>/);
});

test("all 17k current figures retain canonical bytes; every mathematical span is covered", () => {
  const before = createHash("sha256"),
    after = createHash("sha256");
  let figures = 0,
    converted = 0;
  for (const map of EXTRA_GEOMETRY_FIGURE_MAPS) {
    for (const [id, source] of Object.entries(map)) {
      before.update(id).update("\0").update(source).update("\0");
      const out = typeset(source);
      figures++;
      converted += [...out.matchAll(/data-arithmetic-typeset="1"/g)].length;
      assert.equal(
        out.match(/<svg[^>]*>/)?.[0],
        source.match(/<svg[^>]*>/)?.[0],
        id,
      );
      for (const text of out.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g))
        assert.equal(
          arithmeticLabelParts(unescapeTypographyXml(text[1])).some(
            (part) => part.tex,
          ),
          false,
          `${id}: ${text[1]}`,
        );
      assert.equal(typeset(out), out, `idempotent ${id}`);
      after.update(id).update("\0").update(map[id]).update("\0");
    }
  }
  assert.equal(figures, arithmeticTypographyManifest.figures);
  assert.equal(converted, 50173);
  assert.equal(before.digest("hex"), arithmeticTypographyManifest.sourceSha256);
  assert.equal(after.digest("hex"), arithmeticTypographyManifest.sourceSha256);
});
