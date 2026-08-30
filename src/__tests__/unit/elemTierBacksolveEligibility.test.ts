/**
 * **④ 를 낼 자격 — 「연산 갈래가 양성 대조군이다」를 잠근다** (2026-08-31).
 *
 * 반증 ④ 는 「같은 소단원의 연산·기본·응용이 이미 순방향으로 **안 닿으면** 그 소단원을
 * **비워라**」다. 파괴적인 판정이다 — 잘못 걸리면 멀쩡한 소단원이 통째로 빈다.
 *
 * 그런데 `forwardReachable` 은 셋으로 눈이 멀어 있다(순수 덧뺄셈 · `\frac` · 대분수 답).
 * 눈먼 소단원에서는 **연산 문항조차** «안 닿는다»가 되어 ④ 가 자동으로 걸린다.
 * 실측: ④ 가 걸던 **140소단원 중 113개(81%)가 근거 없는 것**이었다.
 *
 * 가르는 열쇠는 **연산 갈래**다 — D-113 이 정한 연산은 「그 소단원의 연산을 그대로 한 번」
 * 이라 **정의상 순방향**이다. 그것이 «안 닿는다»면 안 닿는 쪽은 문항이 아니라 자다.
 *
 * ## 이 시험이 지키는 것
 *
 * ```
 * ㉠ 눈먼 소단원이 «진짜 후보»로 새어 나가지 않는다   ← 되돌리면 113개가 도로 샌다
 * ㉡ 「못 잼」을 조용히 버리지 않는다                  ← 버리면 0 이 «깨끗»으로 읽힌다
 * ㉢ 살아 있는 엔진에서도 실제로 갈린다               ← 픽스처만 보면 도장이 된다
 * ```
 *
 * ⚠️ ㉢ 은 **지금 실데이터가 양쪽을 다 낸다**는 사실에 기댄다(후보 27 · 못 잼 113).
 *    한쪽이 0 이 되면 이 시험이 그것을 **먼저 말하게** 해 두었다 — 0 이 되는 것은
 *    「고쳐졌다」일 수도 「자가 또 눈이 멀었다」일 수도 있고, 둘은 다음 수가 다르다.
 */
import { describe, expect, it } from "vitest";

import {
  splitFlatUnits,
  sweep,
  unmeasurableReason,
  type FlatVerdict,
} from "../../../scripts/qa/probe-elem-tier-backsolve";

type Row = Parameters<typeof splitFlatUnits>[0][number];

const row = (code: string, tier: string, reachable: boolean): Row =>
  ({ grade: "초X", code, tier, seed: 0, reachable }) as Row;

describe("[D-115] ④ 의 자격 — 연산 갈래가 양성 대조군", () => {
  it("㉠ 연산이 **0%** 인 소단원은 «진짜 후보»가 아니라 «못 잼»이다", () => {
    const s = splitFlatUnits([
      row("1-1-1", "연산", false),
      row("1-1-1", "기본", false),
      row("1-1-1", "응용", false),
    ]);
    expect(s.candidates, "눈먼 소단원이 후보로 샜다").toEqual([]);
    expect(s.unmeasurable.map((v) => v.key)).toEqual(["초X 1-1-1"]);
    expect(unmeasurableReason(s.unmeasurable[0]!)).toBe("연산 0/1");
  });

  it("㉠ 연산 갈래를 **못 훑은** 소단원도 «못 잼»이다 (대조군이 아예 없다)", () => {
    const s = splitFlatUnits([row("1-2-1", "응용", false)]);
    expect(s.candidates).toEqual([]);
    expect(unmeasurableReason(s.unmeasurable[0]!)).toBe(
      "연산 갈래를 못 훑었다",
    );
  });

  it("㉡ 연산이 **한 건이라도 닿으면** 후보로 남는다 — 자가 살아 있다", () => {
    const s = splitFlatUnits([
      row("1-3-1", "연산", true),
      row("1-3-1", "연산", false),
      row("1-3-1", "응용", false),
    ]);
    expect(s.candidates.map((v) => v.key)).toEqual(["초X 1-3-1"]);
    expect(s.candidates[0]!.flatN, "안 닿는 하위 갈래를 센다").toBe(2);
    expect(s.unmeasurable).toEqual([]);
  });

  it("㉡ 안 닿는 하위 갈래가 없으면 어느 쪽에도 안 올린다 (④ 가 애초에 안 건다)", () => {
    const s = splitFlatUnits([
      row("1-4-1", "연산", true),
      row("1-4-1", "응용", true),
      row("1-4-1", "심화상", false),
    ]);
    expect(s.candidates).toEqual([]);
    expect(s.unmeasurable).toEqual([]);
  });

  it("심화 갈래는 대조군으로 안 센다 — 연산만이 «정의상 순방향»이다", () => {
    const s = splitFlatUnits([
      row("1-5-1", "심화하", true),
      row("1-5-1", "응용", false),
    ]);
    expect(s.candidates, "심화하가 닿는다고 자격을 주면 안 된다").toEqual([]);
    expect(s.unmeasurable.map((v) => v.key)).toEqual(["초X 1-5-1"]);
  });

  it("㉢ 🔴 **살아 있는 엔진**에서 두 쪽이 다 나온다 — 픽스처만 보면 도장이다", () => {
    const { candidates, unmeasurable } = splitFlatUnits(sweep());
    expect(
      candidates.length,
      "④ 의 «진짜 후보»가 0 이다 — 자가 또 눈이 멀었는지 먼저 보라",
    ).toBeGreaterThan(0);
    expect(
      unmeasurable.length,
      "«못 잼»이 0 이다 — 눈먼 자리가 정말 사라졌는지, 세는 열쇠가 죽었는지 갈라라",
    ).toBeGreaterThan(0);

    // 실측 표본 — 순수 덧뺄셈 소단원은 **반드시** «못 잼» 쪽이어야 한다.
    // (초3 1-1-1 연산 「$764+135$」 답 $899$ 를 이 자는 «안 닿는다»고 한다.)
    const key = (v: FlatVerdict) => v.key;
    expect(unmeasurable.map(key)).toContain("초3 1-1-1");
    expect(candidates.map(key)).not.toContain("초3 1-1-1");
  });
});
