/**
 * 엔진 객관식의 **정답 자리**와 **0 보기** (월말평가 품질 검토 §11 · 2026-10-17).
 *
 * 공유 DB 실측: 엔진 객관식 48,025건의 정답 자리가 ① 33% · ② 9% · ③ 25% · ④ 24% · ⑤ 9% 였다 —
 * 섞는 씨앗이 `0x9e37 + 변형번호 × 17` 뿐이라 **모든 갈래의 n 번째 변형이 같은 씨앗**을 썼다.
 * «모르면 ①»이 세 문제 중 한 문제를 맞힌다. 그리고 정답이 양수인데 «0» 보기가 9.8%(«③ 0 cm»).
 */
import { describe, expect, it } from "vitest";

import { expandFamily } from "@/lib/engine/expandEngine";

const MARKS = ["①", "②", "③", "④", "⑤"];

function choicesOf(content: string): string[] {
  return content
    .split("\n")
    .filter((line) => MARKS.some((m) => line.startsWith(m)))
    .map((line) => line.slice(2).trim());
}

describe("엔진 객관식 — 정답 자리", () => {
  it("갈래가 달라도 같은 변형번호가 같은 자리에 몰리지 않는다", () => {
    const count = new Map<string, number>();
    let total = 0;
    for (let f = 0; f < 300; f += 1) {
      const got = expandFamily((v) => ({
        content: `$${20 + f}$에 $${v + 3}$을 더하시오.`,
        answer: `$${23 + f + v}$`,
        solution: "더한다",
        familyKey: `elem:fixture|갈래 ${f}|기본`,
        problemType: "계산",
      }));
      for (const item of got.items) {
        if (item.questionType !== "객관식") continue;
        count.set(item.answer, (count.get(item.answer) ?? 0) + 1);
        total += 1;
      }
    }
    expect(total).toBe(900);
    // 고르면 자리마다 20% — 900번이면 14% ~ 26% 안에 든다(넉넉한 띠).
    for (const mark of MARKS) {
      const share = (count.get(mark) ?? 0) / total;
      expect(share, `${mark} ${Math.round(share * 100)}%`).toBeGreaterThan(
        0.14,
      );
      expect(share, `${mark} ${Math.round(share * 100)}%`).toBeLessThan(0.26);
    }
  });

  it("같은 갈래 · 같은 변형은 몇 번을 펼쳐도 같은 보기다(적재 · 갱신이 같은 행을 만든다)", () => {
    const run = () =>
      expandFamily((v) => ({
        content: `$${40 + v}$에 $5$를 더하시오.`,
        answer: `$${45 + v}$`,
        solution: "더한다",
        familyKey: "elem:fixture|같은 갈래|기본",
        problemType: "계산",
      })).items.map((i) => `${i.content}|${i.answer}`);
    expect(run()).toEqual(run());
  });
});

describe("엔진 객관식 — 0 보기", () => {
  it("정답이 양수면 0 을 보기로 내지 않는다", () => {
    for (let f = 0; f < 60; f += 1) {
      const got = expandFamily((v) => ({
        content: `길이를 구하시오. (${f}-${v})`,
        answer: `$${1 + v}\\,\\mathrm{cm}$`,
        solution: "잰다",
        familyKey: `mid:fixture-${f}`,
        problemType: "계산",
      }));
      for (const item of got.items) {
        if (item.questionType !== "객관식") continue;
        for (const choice of choicesOf(item.content))
          expect(choice, item.content).not.toMatch(/^\$0(\\,|\$)/);
      }
    }
  });
});
