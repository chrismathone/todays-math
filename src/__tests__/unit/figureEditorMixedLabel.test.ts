// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  placeLabel,
  typesetLabel,
} from "@/components/unified/figure-editor/mathjaxLabel";

/**
 * 원장님 2026-09-18 — 도형 편집에서 «수식»으로 둔 `x (초)` 가 *「수식으로 해도 로만체로 되네. x가」*.
 * 한글이 한 글자라도 있으면 라벨 전체를 조판하지 않아(글꼴에 한글이 없다) x 가 본문 글꼴의 정자체로 찍혔다.
 * «수식»(`$…$`) 라벨만 한글 조각은 글자로 두고 나머지를 조판해 잇는다. «일반 글자»는 그대로.
 */
describe("도형 편집기 — 한글이 섞인 수식 라벨", () => {
  it("«수식» x (초): x 는 수학 이탤릭, 초는 곧은 글자, 순서대로 잇는다", () => {
    const laid = typesetLabel("$x (초)$");
    expect(laid).not.toBeNull();
    // MathJax 의 수학 이탤릭 x (U+1D465)
    expect(laid!.inner).toContain('data-c="1D465"');
    const text = /<text\b[^>]*>초<\/text>/.exec(laid!.inner);
    expect(text).not.toBeNull();
    // 뒤집힌(scale(1,-1)) 조각 밖에 둔다 — 안에 두면 지면에 거꾸로 찍힌다
    expect(text![0]).not.toContain("scale(1,-1)");
    expect(text![0]).not.toContain("italic");
    const at = Number(/\bx="([\d.]+)"/.exec(text![0])![1]);
    // `x (` 는 한 조각(안의 빈칸은 수식의 `\,`) — 초는 그 폭 바로 뒤
    const alone = typesetLabel("$x ($")!;
    expect(at).toBeCloseTo(alone.widthEm * 1000, 0);
    expect(laid!.widthEm).toBeGreaterThan(alone.widthEm + 1);
    // 한글과 맞닿은 빈칸은 조각 밖이라 `\,` 폭(1/6 em)을 따로 둔다
    const spaced = typesetLabel("$x 초$")!;
    const spacedAt = Number(
      /<text\b[^>]*\bx="([\d.]+)"/.exec(spaced.inner)![1],
    );
    expect(spacedAt).toBeCloseTo(
      typesetLabel("$x$")!.widthEm * 1000 + 1000 / 6,
      0,
    );
  });

  it("«일반 글자»의 한글 라벨은 지금처럼 조판하지 않는다(엔진 글자 그대로)", () => {
    expect(typesetLabel("x (초)")).toBeNull();
    expect(typesetLabel("(가)")).toBeNull();
  });

  it("색·테두리가 모든 조각에 먹는다 — 첫 조각만 칠하지 않는다", () => {
    const laid = typesetLabel("$x (초)$")!;
    const placed = placeLabel(laid, "$x (초)$", 10, 20, 18, "#123456", {
      color: "#ffffff",
      width: 3,
    })!;
    expect(placed).not.toBeNull();
    expect(placed).not.toContain("currentColor");
    expect(placed).toMatch(/<text\b[^>]*fill="#123456"[^>]*>초<\/text>/);
  });
});
