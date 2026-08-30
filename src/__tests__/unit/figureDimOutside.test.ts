/**
 * **치수선은 도형 «밖» 으로 나간다** — 원장님 지적 2026-08-30.
 *
 * 지면에서 찾으셨다: 등변사다리꼴의 `9 cm` 가 도형 **안쪽**으로 크게 휘어 있었고,
 * 사다리꼴 `7 cm`·삼각비 `6 cm` 도 같았다. 실측 465자리 중 91자리가 안쪽이었고
 * 그중 **16자리는 바깥이 멀쩡히 비어 있었다.**
 *
 * 🔴 뿌리가 **둘**이다.
 *  ⑴ 「안쪽인가」를 세는 축이 **아예 없었다.** 대리로 쓰던 `side_crowding` 은 창이
 *     `along ∈ [-15%, 115%]` 라, 아랫변이 윗변보다 긴 사다리꼴에서 B·C 가 **둘 다
 *     창 밖**으로 나가 붐빔이 0이 된다. 그러면 두 쪽 점수가 **완전히 같아져**
 *     `side_rank` 가 갈랐고, 목록이 `["left","right"]` 라 **늘 left** 였다.
 *  ⑵ 「이 치수의 두 끝이 같은 선분 위」(자기 현) 판정의 문턱이 `chord_scale * 1e-7`
 *     이라 **좌표 반올림**을 못 견뎠다. 스펙 좌표는 소수 둘째 자리라 「AB 를 1:3 으로
 *     나누는 D」가 AB 에서 0.0013px 어긋나 있고 그건 문턱의 **75배**다. 그래서
 *     바깥으로 나가는 곡선이 **제 현과 교차한다**고 세어져 바깥이 통째로 막혔다.
 *
 * 전후(같은 자·812장·씨앗 2 × 변형 2):
 *   치수 곡선 465 → **477** · 떨어진 치수 33 → **21** · 바깥이 있었는데 안으로 16 → **0**
 *
 * ⚠️ 이 시험은 **한 장씩 실제로 그려서** 본다. 엔진 상수만 읽으면 「배선이 한쪽만」을
 *    못 본다. `vendor/figure-engine` 은 `F:\시험지변환기` 의 사본이라 상류를 갱신하면
 *    되돌아온다 — 그때 이 시험이 빨개진다. 그게 이 시험의 존재 이유다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import { judgeSvg } from "../../../scripts/qa/figureDimSide";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

async function draw(key: string, seed: number, variant: number) {
  const problem = generateMiddleProblem(key, seed, variant);
  expect(problem.figureSpec, `${key} 에 그림이 없다`).toBeTruthy();
  const rendered = await renderFigureSpec(problem.figureSpec as never);
  expect(rendered.ok, rendered.ok ? "" : rendered.error).toBe(true);
  if (!rendered.ok) throw new Error("unreachable");
  return rendered;
}

describe.runIf(hasEngine)("치수선 자리 — 도형 밖으로 나간다", () => {
  it("양성 대조 — 자가 «안쪽»을 실제로 셀 수 있다 (그 자리가 아예 없으면 0은 «못 셈»이다)", async () => {
    // 접힌 종이의 대각선은 **어느 쪽으로 그려도 도형 안**이다. 이 자리가 살아 있어야
    // 「고칠 수 있었던 것 0」이 「깨끗」이라는 뜻이 된다.
    const r = await draw("2-2|삼각형의 성질|12", 20260829, 0);
    const inside = judgeSvg(r.svg).dims.filter((d) => d.maxDepth > 0);
    expect(
      inside.length,
      "안쪽을 지나는 치수가 하나도 안 잡힌다 — 자가 눈이 멀었다",
    ).toBeGreaterThan(0);
    expect(
      inside.every((d) => d.otherDepth > 0),
      "이 도형의 치수는 반대 쪽도 안쪽이어야 한다 — 바깥이 없는 자리다",
    ).toBe(true);
  }, 60_000);

  it("원장님이 짚으신 사다리꼴 — `9 cm` 가 도형 밖에 있다", async () => {
    const r = await draw("2-2|여러 가지 사각형|08", 20260829, 0);
    const bad = judgeSvg(r.svg).dims.filter(
      (d) => d.maxDepth > 0 && d.otherDepth <= 0,
    );
    expect(
      bad.map((d) => d.label),
      "바깥이 비어 있는데 안으로 갔다",
    ).toEqual([]);
  }, 60_000);

  it("원장님이 짚으신 사다리꼴 ⑵ — `7 cm`(윗변)이 도형 밖에 있다", async () => {
    const r = await draw("2-2|평행선 사이의 선분의 길이의 비|09", 20260829, 0);
    const bad = judgeSvg(r.svg).dims.filter(
      (d) => d.maxDepth > 0 && d.otherDepth <= 0,
    );
    expect(
      bad.map((d) => d.label),
      "바깥이 비어 있는데 안으로 갔다",
    ).toEqual([]);
  }, 60_000);

  it("자기 현 문턱이 좌표 반올림을 견딘다 — 치수가 떨어져 나가지 않는다", async () => {
    // 🔴 이 유형은 종전에 `d_AD`·`d_AE` **두 자리를 통째로 잃었다**. 「AB 를 나누는 점
    //    D」가 반올림으로 AB 에서 0.0013px 어긋나 자기 현 판정이 실패했기 때문이다.
    //    문턱을 `1e-7` 로 되돌리면 이 시험이 빨개진다.
    const r = await draw("2-2|평행선 사이의 선분의 길이의 비|01", 20260829, 0);
    expect(
      r.droppedDimensions ?? [],
      "치수가 떨어졌다 — 자기 현 판정이 다시 눈이 멀었다",
    ).toEqual([]);
    expect(
      judgeSvg(r.svg).dims.length,
      "치수 곡선이 네 자리 다 그려져야 한다",
    ).toBeGreaterThanOrEqual(4);
  }, 60_000);
});
