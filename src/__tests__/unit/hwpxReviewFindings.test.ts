/**
 * 그록 적대적 리뷰(2026-09-21 · 시험지 → HWPX 변환)에서 **돌려서 확인된** 결함들 — 🔴 RED → 🟢.
 *
 * 리뷰 원문은 저장소 밖(`D:/tmp/grok-hwpx-review.md`)이라 여기 요지를 적는다. 한글에서 그 XML 을 실제로 여는 확인은
 * 이 시험도 못 한다(규칙 9) — 재는 것은 변환기의 출력과 XML 안의 수치다.
 *
 * ⑴ `\right.` 가 `RIGHT` 를 통째로 빼먹는다 — 한글 수식은 `LEFT` 와 `RIGHT` 가 짝이어야 울타리가 닫힌다. 닫힘이 없으면
 *    폭 계산기(`eqsize`)도 식의 나머지를 전부 울타리 안으로 읽는다. 빈 쪽은 `.` 으로 적는다 — 한글 실측에
 *    `LEFT . a RIGHT |` 가 정상 폭으로 잡혀 있다(mathg-gen probe3).
 * ⑵ `\cfrac{1}{2}` 가 분수가 아닌 `{1}{2}` 로 나간다 — 모르는 명령을 조용히 지우는 마지막 줄에 걸린다.
 * ⑶ n제곱근의 지수를 폭·높이 계산이 읽고 버린다 — `root {3} of {8}` 의 상자가 `sqrt {8}` 과 같았다.
 * ⑷ 오늘(수식 상자를 한글 높이로) 생긴 것: 구역 위 여백·줄 정보(lineseg)가 **올라간** 수식 위쪽을 따라가 본문 원점 위로
 *    음수가 되고, 격자 칸 안의 줄 묶기(세로 겹침 50%)가 커진 상자 때문에 미리보기의 두 줄을 한 줄로 합쳤다.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";

function python<T>(lines: string[], input: unknown): T {
  const program = [
    "import json,sys,io",
    "sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')",
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "vendor/hwpx"))})`,
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "scripts/hwpx"))})`,
    "items=json.load(io.TextIOWrapper(sys.stdin.buffer,encoding='utf-8'))",
    ...lines,
  ].join("\n");
  const run = spawnSync(process.env.PYTHON_BIN ?? "python", ["-c", program], {
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(run.stderr || "python 이 안 돌았다");
  return JSON.parse(run.stdout) as T;
}
const convert = (latex: string[]) =>
  python<string[]>(
    [
      "from latex_to_hwpeq import latex_to_hwpeq",
      "print(json.dumps([latex_to_hwpeq(i).strip() for i in items], ensure_ascii=False))",
    ],
    latex,
  );
const extents = (scripts: string[]) =>
  python<Array<[number, number]>>(
    [
      "from eqheight import hwpeq_extent",
      "print(json.dumps([hwpeq_extent(i, 1050) for i in items]))",
    ],
    scripts,
  );

describe("⑴ 한쪽만 있는 울타리 — 빈 쪽은 `.` 으로 닫는다", () => {
  it("🔴 `\\right.` — LEFT 가 RIGHT 없이 열려 있지 않다", () => {
    const [set, fraction, array] = convert([
      "\\left\\{ x \\mid x>0 \\right.",
      "\\left\\{ \\frac{x}{2} \\right.",
      "\\left\\{ \\begin{array}{ll} a & b \\\\ c & d \\end{array} \\right.",
    ]);
    for (const script of [set, fraction, array]) {
      expect(script).toMatch(/^LEFT \{ /);
      expect(script).toMatch(/ RIGHT \.$/);
    }
    expect(fraction).toBe("LEFT { {x} over {2} RIGHT .");
  });

  it("🔴 `\\left.` — RIGHT 가 LEFT 없이 닫히지 않는다", () => {
    expect(convert(["\\left. \\frac{x}{2} \\right\\}"])[0]).toBe(
      "LEFT . {x} over {2} RIGHT }",
    );
  });

  it("양쪽이 다 있는 울타리는 그대로다 · 양쪽 다 `.` 이면 울타리가 없다", () => {
    expect(
      convert([
        "\\left( \\frac{x}{2} \\right)",
        "\\left. \\frac{x}{2} \\right.",
      ]),
    ).toEqual(["LEFT ( {x} over {2} RIGHT )", "{x} over {2}"]);
  });
});

describe("⑵ `\\cfrac` 도 분수다", () => {
  it("🔴 `{1}{2}` 가 아니라 `{1} over {2}`", () => {
    expect(convert(["\\cfrac{1}{2}", "\\dfrac{1}{2}"])).toEqual([
      "{1} over {2}",
      "{1} over {2}",
    ]);
  });
});

describe("⑶ n제곱근 — 지수를 높이에 센다", () => {
  it("🔴 지수가 붙은 근호는 맨 근호보다 낮지 않고, 지수가 분수면 더 높다", () => {
    const [plain, cube, fractional] = extents([
      "sqrt {8}",
      "root {3} of {8}",
      "root {{1} over {2}} of {8}",
    ]);
    expect(cube![0]).toBeGreaterThan(plain![0]);
    expect(fractional![0]).toBeGreaterThan(cube![0]);
  });
});

const BODY = { x: 50, y: 150, w: 694, h: 900, columns: 1 as const, gap: 0 };
const text = (x: number, y: number, w: number, value: string, more = {}) => ({
  type: "text" as const,
  x,
  y,
  w,
  h: 20,
  text: value,
  fontSize: 14,
  ...more,
});
const equation = (
  x: number,
  y: number,
  h: number,
  baseline: number,
  latex: string,
  more = {},
) => ({
  type: "equation" as const,
  x,
  y,
  w: 12,
  h,
  baseline,
  latex,
  fontSize: 14,
  ...more,
});
async function section(objects: unknown[]) {
  const parts = await buildHwpxParts(
    HwpxPayloadSchema.parse({
      title: "리뷰",
      pages: [{ body: BODY, objects }],
    }),
  );
  return new DOMParser().parseFromString(
    parts["Contents/section0.xml"]!,
    "application/xml",
  );
}

describe("⑷ 수식 상자가 위로 커져도 — 구역 위 여백·줄 정보는 본문 원점 아래다", () => {
  it("🔴 본문 첫 줄의 겹분수: 구역 위 여백이 본문 위 끝보다 올라가지 않고, 줄 정보의 세로 자리가 음수가 아니다", async () => {
    const doc = await section([
      text(60, BODY.y + 14, 60, "값은"),
      equation(124, BODY.y, 46, BODY.y + 32, "\\frac{\\frac{1}{2}}{3}"),
    ]);
    const top = Number(
      doc.getElementsByTagName("hp:margin")[0]!.getAttribute("top"),
    );
    expect(top).toBe(Math.round(BODY.y * 75));
    for (const seg of doc.getElementsByTagName("hp:lineseg")) {
      expect(Number(seg.getAttribute("vertpos"))).toBeGreaterThanOrEqual(0);
      const height = Number(seg.getAttribute("vertsize"));
      const baseline = Number(seg.getAttribute("baseline"));
      expect(baseline).toBeGreaterThanOrEqual(0);
      expect(baseline).toBeLessThanOrEqual(height);
    }
  });

  it("🔴 격자 칸 안의 두 줄 — 커진 분수 상자 때문에 한 줄로 합쳐지지 않는다", async () => {
    // 한 칸에 분수 줄(y·h=28) 바로 아래 작은 글 줄(y+20.5 · h=16). 미리보기에서는 겹침 7.5px 이 절반(8)에 못 미쳐
    // 두 줄이다. 한글 상자(h=32.2, 바닥이 0.95px 더 내려간다)로 재면 8.45px — 절반을 넘겨 한 줄이 됐다.
    // (그록이 든 y+20 은 미리보기에서도 8 ≥ 8 로 이미 한 줄이라 재현이 안 됐다 — 경계를 넘는 값으로 바꿨다.)
    const grid = { gridId: 1, gridRow: 0, gridCol: 0 };
    const y = BODY.y + 100;
    const doc = await section([
      equation(60, y, 28, y + 18, "\\frac{1}{7}", grid),
      { ...text(60, y + 20.5, 120, "이어 쓰는 줄", grid), h: 16 },
    ]);
    const paragraphs = [...doc.documentElement.children]
      .filter((node) => node.tagName === "hp:p")
      .slice(1);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]!.getElementsByTagName("hp:equation")).toHaveLength(1);
    expect(paragraphs[0]!.textContent).not.toContain("이어 쓰는 줄");
  });
});
