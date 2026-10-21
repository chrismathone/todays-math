/**
 * 식 뒤 조사 · 서술격 판정 (D-164 ⑴) — 렌더러의 잇기와 초등 생성기의 붙임 가드가 같이 쓰는 한 곳.
 *
 * 음성 대조는 공유 DB 에서 «식 바로 뒤에 붙어 나온» 낱말 가운데 첫 글자가 조사와 같은 것들이다
 * (2026-10-21 읽기 전용 집계 — `mathParticles.ts` 머리말). 첫 글자로 가르면 이것들이 다 «조사»가 된다.
 */
import { describe, expect, it } from "vitest";

import {
  MATH_PARTICLE_PIECES,
  startsWithMathParticle,
} from "@/lib/math/mathParticles";

describe("startsWithMathParticle", () => {
  it("목록의 조각 하나로 끝나는 낱말은 조사다 — 뒤가 빈칸 · 문장부호 · 끝이어도", () => {
    for (const piece of MATH_PARTICLE_PIECES) {
      expect(startsWithMathParticle(piece), piece).toBe(true);
      expect(startsWithMathParticle(`${piece} 값`), piece).toBe(true);
      expect(startsWithMathParticle(`${piece}.`), piece).toBe(true);
    }
  });

  it("겹침 규칙대로 이어진 낱말도 조사다 — 부사격 + 보조사 · 범위 보조사 + 격조사 · 서술격", () => {
    for (const word of [
      "에서는",
      "에서의",
      "에서와",
      "에서부터",
      "에만",
      "에게는",
      "와의",
      "과도",
      "로만",
      "로부터의",
      "보다는",
      "까지의",
      "까지는",
      "까지로",
      "까지에는",
      "까지이므로",
      "만을",
      "만으로는",
      "만큼을",
      "부터는",
      "뿐이므로",
      "인지는",
      "임을",
    ])
      expect(startsWithMathParticle(`${word} 다음`), word).toBe(true);
  });

  it("음성 대조 — 겹칠 수 없는 조합(2026-10-21 Codex 검토: «$a-b=-1$이를 연립하여») · 서술격 «일» 뒤의 날 수", () => {
    for (const word of [
      "이를",
      "를이",
      "의는",
      "는의",
      "도를",
      "일의",
      "일이",
      "일마다",
      "이다를",
    ])
      expect(startsWithMathParticle(`${word} 다음`), word).toBe(false);
  });

  it("음성 대조 — 첫 글자는 같지만 조사가 아닌 낱말(집계에서 실제로 나온 것)", () => {
    for (const word of [
      "가지이다",
      "가지",
      "도막으로",
      "이때",
      "과목의",
      "인당",
      "만원이고",
      "이상이다",
      "이내에",
      "이익",
      "은행의",
      "나머지",
      "라디",
      "이고피타고라스",
    ])
      expect(startsWithMathParticle(word), word).toBe(false);
  });

  it("음성 대조 — 단위 · 의존명사 · 복합 명사 · 접미사", () => {
    for (const word of [
      "개",
      "개입니다",
      "명의",
      "분에",
      "칸입니다",
      "좌표가",
      "절편이",
      "축의",
      "씩",
      "번째",
      "원짜리",
    ])
      expect(startsWithMathParticle(word), word).toBe(false);
  });

  it("앞에 빈칸이 있으면 조사로 보지 않는다 — 띄어 쓴 자리는 줄을 바꿔도 되는 자리다", () => {
    expect(startsWithMathParticle(" 의 값")).toBe(false);
    expect(startsWithMathParticle("\u00a0입니다")).toBe(false);
  });

  it("여러 갈래로 쪼개지는 긴 덩어리에서도 바로 끝난다 — 렌더러를 멈추지 않는다", () => {
    // «이나» = «이» + «나» — 묶지 않은 정규식은 이 덩어리에서 2^20 갈래를 되짚는다
    const started = performance.now();
    expect(startsWithMathParticle(`${"이나".repeat(20)}상`)).toBe(false);
    expect(startsWithMathParticle(`${"이나".repeat(20)} 값`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(50);
  });
});
