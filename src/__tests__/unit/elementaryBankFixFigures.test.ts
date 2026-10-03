/** EL-01·02: 선택 이름이 아니라 실제 SVG의 접점과 치수 글자를 검사한다. */
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";
import type { ElemProblem } from "@/lib/elementary/types";
import { substituteLabels } from "@/lib/figure/mathjaxSubstitute";
import { labelTexts } from "@/lib/figure/svgLabels";

function generated(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(`${code} `),
  );
  if (!u) throw new Error(`${grade}|${code}: 소단원 없음`);
  const ps: ElemProblem[] = [];
  for (let seed = 0; seed < 100; seed += 1) {
    ps.push(generateElementaryProblem(u, seed));
    for (const t of supportedTiers(u))
      ps.push(generateElementaryProblem(u, seed, t));
    for (const f of listedForms(u))
      ps.push(generateElementaryForm(u, seed, f.id));
  }
  expect(ps.length).toBe(
    (1 + supportedTiers(u).length + listedForms(u).length) * 100,
  );
  return ps;
}

function renderAll(specs: Record<string, unknown>[]) {
  const keys = [...new Set(specs.map((s) => JSON.stringify(s)))];
  // 제품의 렌더·정제 함수. 한 프로세스로 묶어 100씨앗을 실제로 전부 그린다.
  const script = [
    "import sys,json",
    "sys.path.insert(0,'scripts/figure')",
    "from engine_path import engine_root",
    "sys.path.insert(0,engine_root())",
    "from elementary import render_elementary",
    "from core.figure_quality import sanitize_svg",
    "specs=json.load(sys.stdin)",
    "json.dump([sanitize_svg(render_elementary(s)) for s in specs],sys.stdout)",
  ].join("\n");
  const r = spawnSync(process.env.PYTHON_BIN ?? "python", ["-c", script], {
    input: `[${keys.join(",")}]`,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 60_000,
  });
  expect(r.error, r.stderr).toBeUndefined();
  expect(r.status, r.stderr).toBe(0);
  const svgs = JSON.parse(r.stdout) as string[];
  expect(svgs).toHaveLength(keys.length);
  return new Map(keys.map((s, i) => [s, svgs[i]!]));
}

describe("bank-fix 초등 그림", () => {
  it("EL-01: 전개도라고 부르는 모든 문형·갈래의 두 원은 서로 반대쪽 긴 변에 접한다", () => {
    const ps = generated("초6", "2-6-2");
    const drawn = ps.filter((p) => p.figureSpec?.kind === "netCylinder");
    expect(drawn.length).toBeGreaterThanOrEqual(1000);
    const svgs = renderAll(drawn.map((p) => p.figureSpec!));
    for (const p of drawn) {
      const svg = svgs.get(JSON.stringify(p.figureSpec))!;
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      const circles = [...doc.querySelectorAll("circle")];
      const rect = [...doc.querySelectorAll("rect")].find(
        (r) => r.getAttribute("stroke") === "#111111",
      )!;
      expect(rect, svg).toBeTruthy();
      expect(circles).toHaveLength(2);
      const y = Number(rect.getAttribute("y"));
      const h = Number(rect.getAttribute("height"));
      const sides = circles.map((c) => {
        const cy = Number(c.getAttribute("cy"));
        const r = Number(c.getAttribute("r"));
        if (Math.abs(cy + r - y) < 0.03) return "top";
        if (Math.abs(cy - r - y - h) < 0.03) return "bottom";
        return "detached";
      });
      expect(
        sides.sort(),
        `${p.content} ${JSON.stringify(p.figureSpec)}`,
      ).toEqual(["bottom", "top"]);
    }
  }, 60_000);

  it("EL-02: 한 모서리·높이를 거꾸로 묻는 형제 문형의 그림은 답 치수를 적지 않는다", () => {
    const ps = [
      ...generated("초5", "2-5-1"),
      ...generated("초5", "2-5-2"),
      ...generated("초5", "2-5-3"),
      ...generated("초5", "2-5-4"),
      ...generated("초5", "2-5-5"),
      ...generated("초5", "2-5-6"),
      ...generated("초6", "1-6-1"),
      ...generated("초6", "1-6-2"),
    ].filter((p) => /(?:한 모서리의 길이|높이)는 몇 cm/.test(p.content));
    expect(ps.length).toBeGreaterThanOrEqual(500);
    const drawn = ps.filter((p) => p.figureSpec !== null);
    expect(drawn).toHaveLength(300); // 두 대상: 초5 문형01·연산, 초6 문형10
    const svgs = renderAll(drawn.map((p) => p.figureSpec!));
    for (const p of drawn) {
      const svg = svgs.get(JSON.stringify(p.figureSpec))!;
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      for (const rendered of [svg, substituteLabels(svg).svg]) {
        const values = labelTexts(rendered).flatMap((label) =>
          [...label.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0])),
        );
        expect(values, p.content).not.toContain(
          Number(p.answer.replace(/\$/g, "")),
        );
      }
      expect(doc.querySelectorAll("polygon").length).toBeGreaterThan(0);
    }
  }, 60_000);

  it("EL-02: cuboid 치수 숨김은 도형·숨은 모서리를 보존하고 기본 그림은 바이트까지 같다", () => {
    const base = { version: "elem-1", kind: "cuboid", w: 7, d: 4, h: 6 };
    const shown = { ...base, showDimensions: true };
    const hidden = { ...base, showDimensions: false };
    const svgs = renderAll([base, shown, hidden]);
    const original = svgs.get(JSON.stringify(base))!;
    const visible = svgs.get(JSON.stringify(shown))!;
    const blank = svgs.get(JSON.stringify(hidden))!;
    expect(visible).toBe(original);
    expect(labelTexts(substituteLabels(original).svg)).toEqual([
      "7 cm",
      "6 cm",
      "4 cm",
    ]);
    expect(labelTexts(blank)).toHaveLength(0);
    const shape = (svg: string) => {
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      const faces = [...doc.querySelectorAll("polygon")].map(
        (p) => p.outerHTML,
      );
      const hiddenEdges = [...doc.querySelectorAll("line")]
        .filter((l) => l.getAttribute("stroke-dasharray") === "5 4")
        .map((l) => l.outerHTML);
      expect(faces).toHaveLength(3);
      expect(hiddenEdges).toHaveLength(3);
      return { faces, hiddenEdges };
    };
    expect(shape(blank)).toEqual(shape(original));
  });
});
