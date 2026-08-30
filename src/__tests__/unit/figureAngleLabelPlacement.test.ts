/**
 * **각 라벨 자리** — 원장님 지적 2026-08-30 (세 가지가 한 자리에서 나왔다).
 *
 * ⑴ 「이런 경우 60도를 아래쪽으로 해야 4cm 의 치수가 여유로워짐.」
 *    → 밖으로 뺄 때 **먼저 되는 자리를 그냥 썼다**(first-fit). 그러면 나가는 팔이
 *      `angle.p1`·`p2` 를 **스펙이 어느 차례로 적었는가**로 정해진다. 실측
 *      `2-2|여러 가지 사각형|08`: 후보 **24개가 전부 통과**하는데 첫째(=`p1` 쪽,
 *      곧 $\overline{AB}$ 쪽)를 써서 그 변의 `4 cm` 치수가 밀려났다.
 *      → **치수가 달린 팔을 피한다.**
 *
 * ⑵ 「도형 내부에 60도를 적어도 충분한데 굳이 밖으로 뺌.」
 *    → **고르는 자와 판정하는 자가 달랐다.** `_candidate_cost` 로 고르고
 *      `_label_hits_geometry` 로 「밖으로 뺄까」를 판정했는데, 앞엣것은 먼저 놓인
 *      라벨·다른 각 표시까지 세고 뒤엣것은 오직 잉크만 본다. 그래서 잉크를 안 밟는
 *      후보가 있는데도 다른 것을 골라 밖으로 끌려 나갔다. 실측
 *      `3-2|삼각비의 활용|04`: 거리 후보 [17.5, 25.1, **32.6**] 중 32.6 은
 *      잉크를 안 밟는다(hits=0). → **「잉크를 밟나」를 첫째 항으로** 올렸다.
 *
 * ⑶ 「치수선과 각도가 매우 겹치기 때문에 문제에서 BC 를 주고 치수선을 표시 안 하는
 *    게 더 나은 방법일지도 모름.」
 *    → 치수 자리 점수가 도형 선분·호·원은 보는데 **각 표시는 목록에 없었다** —
 *      구조적으로 0이다. 각 표시를 잉크에 넣으니 자리가 옮겨지고, 못 비키면
 *      **그 치수만 떨어진다**(원장님 말씀대로). 새로 떨어진 8자리는 **전부 발문이
 *      그 값을 말한다.**
 *      ⚠️ **겹친 것은 곡선끼리가 아니라 «값 글자»와 각 호다.** 실측 `6 cm` 상자와
 *         60° 호 사이 **8.25px**(곡선끼리는 10.08px 라 그것만 보면 「안 겹친다」로
 *         읽힌다 — 아래 ⑶ 시험이 `labelGap` 을 쓰는 이유다). 고친 뒤 56.36px.
 *         한때 「0.29px」이라 적었는데 그건 **틀린 값**이다 — 그때 자가
 *         `stroke-width` 없는 **글자 글리프**까지 「표시」로 세고 있었다.
 *
 * ⚠️ 실제로 한 장씩 그려서 본다 — 엔진 상수만 읽으면 「배선이 한쪽만」을 못 본다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import {
  angleLeaders,
  dimVsAngleMarkGap,
  inkBounds,
} from "../../../scripts/qa/figureDimSide";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

async function draw(key: string, seed: number, variant: number) {
  const problem = generateMiddleProblem(key, seed, variant);
  const rendered = await renderFigureSpec(problem.figureSpec as never);
  expect(rendered.ok, rendered.ok ? "" : rendered.error).toBe(true);
  if (!rendered.ok) throw new Error("unreachable");
  return rendered;
}

describe.runIf(hasEngine)("각 라벨 자리", () => {
  it("⑵ 안에 자리가 있으면 밖으로 끌어내지 않는다", async () => {
    const r = await draw("3-2|삼각비의 활용|04", 20260829, 0);
    expect(
      angleLeaders(r.svg).length,
      "각 라벨을 밖으로 끌어냈다 — 안쪽 후보 중 잉크를 안 밟는 것이 있는데도 놓쳤다",
    ).toBe(0);
  }, 60_000);

  it("양성 대조 — 정말 좁은 각은 여전히 밖으로 나간다 (0이 «못 셈»이 아니다)", async () => {
    // 이 자리가 살아 있어야 위 시험의 「0」이 뜻을 갖는다. 사다리꼴 B 의 안쪽
    // 후보는 실측으로 **둘 다** 잉크를 밟는다(거리 17.5·25.1).
    const r = await draw("2-2|여러 가지 사각형|08", 20260829, 0);
    expect(
      angleLeaders(r.svg).length,
      "밖으로 끌어내는 길이 아예 안 쓰인다 — 판정기가 눈이 멀었다",
    ).toBeGreaterThan(0);
  }, 60_000);

  it("⑴ 밖으로 뺄 때 **치수가 달린 팔**을 피한다 — 사다리꼴은 아래(BC)로 나간다", async () => {
    const r = await draw("2-2|여러 가지 사각형|08", 20260829, 0);
    const leaders = angleLeaders(r.svg);
    expect(leaders.length).toBeGreaterThan(0);
    const { maxY } = inkBounds(r.svg);
    // 지시선의 라벨 쪽 끝이 도형의 **가장 아래**보다 더 아래면 BC 쪽으로 나간 것이다.
    // 종전에는 AB 쪽(위)으로 나가 `4 cm` 를 밀어냈다 — 그때는 이 값이 `maxY` 보다
    // 한참 위였다(실측 y≈41 vs maxY≈77).
    const deepest = Math.max(...leaders.flat().map((p) => p[1]));
    expect(
      deepest,
      "각 라벨이 치수가 달린 팔(AB) 쪽으로 나갔다 — `4 cm` 가 밀려난다",
    ).toBeGreaterThan(maxY);
  }, 60_000);

  it("⑶ 치수 **값 글자**가 각 표시에서 떨어져 있다 — 못 비키면 그 치수만 빠진다", async () => {
    const r = await draw("2-2|삼각형의 성질|12", 20260829, 0);
    const { labelGap, dims, marks } = dimVsAngleMarkGap(r.svg);
    // 🔴 「겹침 없음」과 「잴 것이 없음」을 갈라야 한다 — 표시가 0개면 이 시험은
    //    아무것도 안 지킨다.
    expect(
      marks,
      "각 표시가 하나도 없다 — 이 그림으로는 못 잰다",
    ).toBeGreaterThan(0);
    expect(dims, "치수가 하나도 없다 — 겹침을 잴 수 없다").toBeGreaterThan(0);
    // ⚠️ **곡선끼리가 아니라 «값 글자»를 재야 한다.** 곡선만 보면 옛 동작도 10.08px 라
    //    「안 겹친다」로 나온다 — 원장님이 보신 것은 `6 cm` **글자**와 각 호였고 그
    //    거리가 **8.25px** 였다. 지금은 56.36px 다. 문턱 30 은 옛 값의 3.6배이고
    //    지금 값의 절반이라 두 상태 어디에도 안 닿는다.
    expect(
      labelGap,
      "치수 값 글자가 각 표시에 붙어 있다 (옛 실측 8.25px)",
    ).toBeGreaterThan(30);
  }, 60_000);

  it("⑶ 각 표시와 못 비킨 치수는 **떨어진다** — 원장님 「치수선을 표시 안 하는 게」", async () => {
    const r = await draw("2-2|삼각형의 성질|12", 20260829, 0);
    // 각 표시를 잉크 목록에서 빼면 이 치수가 다시 그려지고 값 글자가 각 호에 붙는다.
    expect(
      r.droppedDimensions ?? [],
      "`d_BC` 가 그려졌다 — 치수가 각 표시를 다시 못 보고 있다",
    ).toContain("d_BC");
  }, 60_000);

  it("⑶ 떨어진 치수는 **발문이 그 값을 말한다** — 잃는 값이 없다", async () => {
    // `BC` 치수는 각 표시와 겹쳐 떨어진다(원장님 말씀대로). 발문이 값을 준다.
    const problem = generateMiddleProblem("2-2|삼각형의 성질|12", 20260829, 0);
    const r = await renderFigureSpec(problem.figureSpec as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const name of r.droppedDimensions ?? []) {
      const seg = name.replace(/^d_/, "");
      expect(
        problem.content.includes(`\\overline{${seg}}=`),
        `치수 ${name} 이 떨어졌는데 발문이 ${seg} 의 값을 안 말한다 — 학생이 못 푼다`,
      ).toBe(true);
    }
  }, 60_000);
});
