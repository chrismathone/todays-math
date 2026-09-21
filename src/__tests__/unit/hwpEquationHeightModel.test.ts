import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `scripts/hwpx/eqheight.py` ↔ **한글(COM) 실측** — 수식 상자의 높이·기준선 (원장님 2026-09-21 «줄간격이 타이트»).
 *
 * 픽스처(`hwpEquationHeights.json`)는 mathg-gen 세션이 한글 2022 로 잰 기록(11,000건)에서 **갈래마다 하나씩** 뽑은 214건이다 —
 * 시험 수식의 (크기 · 높이 · 기준선) 갈래 56 · 22개 글꼴 크기 훑기 110 · 구조 탐침(액센트·적분·극한·겹분수·지수 속 분수) 48.
 * 실측 원본은 저장소 밖(`D:\mathg-gen\.checks.local\eqfit`)이라, 없어져도 이 시험은 돈다.
 *
 * 🔴 무서운 쪽은 «모자란» 쪽이다 — 상자가 한글이 그릴 높이보다 작으면 수식이 아래 줄을 덮는다(줄 높이가 고정값이라).
 *    그래서 «1px 넘게 모자란 식이 없다»를 따로 단정한다. 큰 쪽은 줄이 조금 벌어질 뿐이다.
 */
interface Measured {
  set: string;
  pt: number;
  script: string;
  h: number;
  baseLine: number;
}

const { records } = JSON.parse(
  readFileSync(
    join(process.cwd(), "src/__tests__/fixtures/hwpEquationHeights.json"),
    "utf8",
  ),
) as { records: Measured[] };

/** 우리 변환기(`latex_to_hwpeq`)가 내지 않는 낱말 — 실측은 있지만 모형이 일부러 안 다룬다(큰 쪽으로만 틀린다). */
const NOT_EMITTED = /\batop\b|\bsub\b|\bboxed\b|^\^\{/;

function model(items: Measured[]) {
  const program = [
    "import json,sys",
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "scripts/hwpx"))})`,
    "from eqheight import hwpeq_extent",
    "items=json.load(sys.stdin)",
    "print(json.dumps([hwpeq_extent(i['script'], round(i['pt']*100)) for i in items]))",
  ].join("\n");
  const run = spawnSync(process.env.PYTHON_BIN ?? "python", ["-c", program], {
    input: JSON.stringify(items),
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(run.stderr || "python 이 안 돌았다");
  return JSON.parse(run.stdout) as Array<[number, number]>;
}

describe("eqheight — 한글이 잰 수식 상자 높이·기준선", () => {
  const measured = records.filter((r) => !NOT_EMITTED.test(r.script));
  const modelled = model(measured);
  const px = (hwpunit: number) => hwpunit / 75;

  it("픽스처가 비어 있지 않다 — 갈래가 다 들어 있다", () => {
    expect(measured.length).toBeGreaterThan(190);
    for (const needle of [
      "over",
      "sqrt",
      "^{",
      "_{",
      "PMATRIX",
      "CASES",
      "INT",
      "lim",
      "bar",
      "underline",
    ])
      expect(
        measured.some((r) => r.script.includes(needle)),
        `«${needle}» 가 든 실측이 없다`,
      ).toBe(true);
  });

  it("🔴 1px 넘게 **모자란** 상자가 없다 — 수식이 아래 줄을 덮는 쪽", () => {
    const short = measured
      .map((r, i) => ({ ...r, model: modelled[i]![0] }))
      .filter((r) => px(r.model - r.h) < -1);
    expect(short).toEqual([]);
  });

  it("높이는 실측의 ±1px 안쪽이다", () => {
    const off = measured
      .map((r, i) => ({ ...r, model: modelled[i]![0] }))
      .filter((r) => Math.abs(px(r.model - r.h)) > 1);
    expect(off).toEqual([]);
  });

  it("기준선(윗쪽 높이)도 ±2px 안쪽이다 — 모형 1.5px + 실측 기준선이 정수 % 라 생기는 흔들림 0.5px", () => {
    const off = measured
      .map((r, i) => {
        const [height, baseLine] = modelled[i]!;
        return {
          script: r.script,
          pt: r.pt,
          delta: px((height * baseLine) / 100 - (r.h * r.baseLine) / 100),
        };
      })
      .filter((r) => Math.abs(r.delta) > 2);
    expect(off).toEqual([]);
  });

  it("전제 — 분수는 글 한 줄보다 **두 배 넘게** 높다(이게 거짓이면 위 단정이 헛돈다)", () => {
    const at = (script: string) =>
      measured.find((r) => r.script === script && r.pt === 10.5)!;
    expect(at("{1} over {2}").h).toBe(2415);
    expect(at("a").h).toBe(1050);
  });
});
