/**
 * **점 이름은 정자체다** — 조판 경로와 폴백이 **같은 답**을 낸다 (원장님 확정 2026-08-28).
 *
 * 원장님이 지면에서 찾으셨다(2026-08-29): `2-2|도형의 닮음|15` 에서 `A`·`B`·`C`·`D`·`E`
 * 는 로만인데 **`B'` 만 이탤릭**이었다.
 *
 * 🔴 뿌리는 **규칙이 두 벌**이었다는 것이다.
 *    · 조판 경로 `mathjaxLabel.toTex` — 홑 대문자를 `\mathrm` 으로 돌린다(RPM 실측 근거).
 *    · 엔진 폴백 `label_markup._ROMAN_CHARS` — 대문자가 목록에 없어 **이탤릭**이었다.
 *    두 벌이면 한쪽만 고쳐진다(CLAUDE.md 2026-08-18).
 *
 * 그 불일치가 **프라임 붙은 이름에서만** 드러났다. `data-mj`(조판 원문을 나르는 속성)는
 * 어포스트로피를 못 싣기 때문에(`figure_quality._MJ_UNSAFE`) `A'`·`B'`·`G'`·`T'` 만
 * 조판을 못 타고 폴백으로 떨어진다. 나머지 폴백 라벨은 전부 한글이라 애초에 정자체다.
 *
 * ⚠️ **엔진 상수만 읽으면 「배선이 한쪽만」을 못 본다.** 그래서 실제로 한 장 그려서
 *    나온 `font-style` 을 본다(`figureWeightRatio.test.ts` 무늬).
 * ⚠️ `vendor/figure-engine` 은 `F:\시험지변환기` 의 **사본**이라 상류를 갱신하면
 *    되돌아온다 — 그때 이 시험이 빨개진다. 그게 이 시험의 존재 이유다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

/** 프라임 붙은 점 이름을 **일부러** 넣은 최소 도형 — 조판을 못 타는 그 자리다. */
const PRIMED = {
  version: 2,
  points: { A: [0, 0], B: [120, 0], C: [120, 90] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  labels: { A: "A", B: "B'", C: "C" },
};

/** `<text>` 안의 `font-style` 을 라벨 글자별로 읽는다. */
function styleOf(svg: string, text: string): string[] {
  const out: string[] = [];
  for (const m of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) {
    const inner = m[1]!;
    if (inner.replace(/<[^>]*>/g, "").trim() !== text) continue;
    const styles = [...inner.matchAll(/font-style="([a-z]+)"/g)].map(
      (s) => s[1]!,
    );
    out.push(styles.length > 0 ? styles.join(",") : "(없음)");
  }
  return out;
}

describe.runIf(hasEngine)("그림 라벨 — 점 이름은 기울지 않는다", () => {
  it("양성 대조 — 프라임 이름이 정말 **폴백**으로 떨어진다 (조판을 타면 이 검사는 헛돈다)", async () => {
    const r = await renderFigureSpec(PRIMED as never);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
    // 조판된 라벨은 `<g data-label>` 이 되고 `<text>` 가 안 남는다. `B'` 는 남아야 한다 —
    // 안 남으면 `data-mj` 규칙이 바뀐 것이고, 그러면 이 검사가 아무것도 안 지킨다.
    expect(
      styleOf(r.ok ? r.svg : "", "B'").length,
      "`B'` 가 조판을 타 버렸다 — 이 검사가 보던 자리가 사라졌다",
    ).toBe(1);
  }, 60_000);

  it("`B'` 가 이탤릭으로 나가지 않는다", async () => {
    const r = await renderFigureSpec(PRIMED as never);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
    expect(styleOf(r.ok ? r.svg : "", "B'")).toEqual(["normal"]);
  }, 60_000);

  it("음성 대조 — 홑 **소문자**(변수)는 그대로 이탤릭이다", async () => {
    // 여기가 새면 「전부 정자체로 만들었다」가 되어 변수와 점 이름이 안 갈린다.
    // RPM 실측: 소문자 `a`·`b`·`x`·`y` 는 `EHsang-Italic` 100%.
    const spec = {
      ...PRIMED,
      labels: { A: "A", B: "B'", C: "x'" },
    };
    const r = await renderFigureSpec(spec as never);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
    // 조각이 **둘**로 나뉜다 — 글자 `x` 는 이탤릭, 프라임 `'` 는 정자체(기호는 안 기운다).
    // 그래서 「첫 조각이 이탤릭인가」를 묻는다. `["italic"]` 로 못 박으면 프라임을
    // 정자체로 두는 옳은 동작에서 거짓 빨강이 난다(처음에 실제로 그랬다).
    expect(styleOf(r.ok ? r.svg : "", "x'")[0]?.split(",")[0]).toBe("italic");
    // 그리고 `B'` 는 같은 그림 안에서 여전히 정자체여야 한다 — 둘이 같은 규칙을 탄다.
    expect(styleOf(r.ok ? r.svg : "", "B'")).toEqual(["normal"]);
  }, 60_000);
});
