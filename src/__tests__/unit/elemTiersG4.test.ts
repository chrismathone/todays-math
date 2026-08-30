/**
 * 초4 1-5-3 「막대그래프의 활용」 난이도 4단 — **셋째 파일럿**(D-72).
 *
 * 230 확대의 **자료형 소단원 전부가 이 파일을 모범으로 삼는다.** 그래서 축 성질을
 * 「그럴듯한가」가 아니라 **셀 수 있는 형태**로 적는다.
 *
 * 핸들러를 **직접 부른다** — 갈래 함수 자체의 성질(씨앗 재현·축 성질)을 재는 시험이라서다.
 * 등록·병합은 끝났다: `G4_TIERS` 를 `generate.ts` 가 병합하고, 4단의 「지워진 막대」
 * (`unknown: true`)도 elem-figures 확장(6a19b9b8)으로 렌더러가 그린다.
 */
import { describe, expect, it } from "vitest";

import {
  G4_TIER_APPLY,
  G4_TIER_BASIC,
  G4_TIER_CALC,
  G4_TIERS,
} from "@/lib/elementary/g4";
import { elementaryUnits } from "@/lib/elementary/generate";
import { createRng } from "@/lib/elementary/rng";
import { bareNumbers } from "@/lib/elementary/rules";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { svgLabels } from "@/lib/figure/svgLabels";

const UNIT = elementaryUnits().find(
  (u) => u.grade === "초4" && u.section.startsWith("1-5-3"),
)!;
const SEEDS = Array.from({ length: 16 }, (_, i) => 20260000 + i * 7);
const G4_TIER_DEEP = G4_TIERS["초4|1-5-3"]!.심화하;

// ⚠️ **넷을 다 넣는다.** 처음엔 셋만 넣었는데, 그러면 R1·씨앗 재현·다양성·갈래 겹침이
// **심화만 구조적으로 안 본다** — 「없는 축은 변이시킬 수 없다」가 시험 자신에게 걸린다.
const TIERS = [
  ["연산", G4_TIER_CALC],
  ["기본", G4_TIER_BASIC],
  ["응용", G4_TIER_APPLY],
  ["심화하", G4_TIER_DEEP],
] as const;

/** 정답에서 수 하나를 꺼낸다 — 「$15$명」·「$2$배」·「$300$원」이 다 같은 꼴이다. */
function answerNum(answer: string): number {
  const m = answer.match(/\$(-?\d+(?:\.\d+)?)\$/);
  expect(m, `정답에서 수를 못 읽었다: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

describe("[초등 엔진] 초4 1-5-3 난이도 4단 (셋째 파일럿)", () => {
  it("세 갈래 모두 문항을 내고, 같은 씨앗이면 같은 문항이다", () => {
    for (const [name, fn] of TIERS) {
      for (const seed of SEEDS) {
        const a = fn(UNIT, createRng(seed));
        const b = fn(UNIT, createRng(seed));
        expect(a.content, `${name}: 발문이 비었다`).toBeTruthy();
        expect(a.answer, `${name}: 정답이 비었다`).toBeTruthy();
        expect(a.solution, `${name}: 해설이 비었다`).toBeTruthy();
        expect(b.content, `${name}: 같은 씨앗인데 발문이 다르다`).toBe(
          a.content,
        );
        expect(b.answer, `${name}: 같은 씨앗인데 정답이 다르다`).toBe(a.answer);
      }
    }
  });

  // R9 — 씨앗이 바뀌면 문항이 바뀐다. 한 씨앗만 보면 이 결함은 구조적으로 안 보인다.
  it("씨앗을 바꾸면 갈래마다 문항이 갈린다", () => {
    for (const [name, fn] of TIERS) {
      const seen = new Set(SEEDS.map((s) => fn(UNIT, createRng(s)).content));
      expect(
        seen.size,
        `${name}: 씨앗 16개에서 발문이 ${seen.size}가지뿐이다`,
      ).toBeGreaterThan(6);
    }
  });

  // R1 — 모든 수는 KaTeX. 판정기(`probe-elem-*`)가 갈래를 순회하기 전까지는 **여기가
  // 유일한 눈**이다(등록 전이라 생성기 경로로는 이 문항들이 안 나온다).
  it("갈래 문항의 수는 전부 KaTeX 안에 있다", () => {
    const bad: string[] = [];
    for (const [name, fn] of TIERS) {
      for (const seed of SEEDS) {
        const p = fn(UNIT, createRng(seed));
        for (const [where, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          const bare = bareNumbers(text);
          if (bare.length > 0)
            bad.push(
              `${name} ${where}: ${bare.join(",")} — ${text.slice(0, 40)}`,
            );
        }
      }
    }
    expect([...new Set(bad)], [...new Set(bad)].join("\n")).toEqual([]);
  });

  // ── 축 성질 — D-72 의 잣대를 **셀 수 있는 형태**로

  // ⚠️ 1단은 「계산이 없다」가 성질이다. 자료형이라 **값 읽기**이고(D-72 ⑶), 원장님이
  //    2026-08-23 에 **「결합 그래프에서」**로 확정하셨다 — 1-5-1 의 값 읽기와 갈리는 근거다.
  //    그래서 그림이 `chartPair` 인 것이 이 단의 **정체성**이지 우연이 아니다.
  it("1단은 계산이 없고, 결합 그래프에서 읽는다 (1-5-1 과 가르는 근거)", () => {
    for (const seed of SEEDS) {
      const p = G4_TIER_CALC(UNIT, createRng(seed));
      expect(
        (p.figureSpec as { kind?: string } | null)?.kind,
        `1단 그림이 결합 그래프가 아니다 — 그러면 1-5-1 과 같은 문항이 된다`,
      ).toBe("chartPair");
      // 해설에 연산 기호가 없어야 한다 — 읽으면 끝나는 단이다.
      expect(
        /[+\-×÷]|\\times|\\div|\\frac/.test(p.solution),
        `1단 해설에 계산이 있다: ${p.solution}`,
      ).toBe(false);
      // 답은 그래프에 **그려진 값**이다(읽어서 나온다).
      const spec = p.figureSpec as {
        charts: { values: { value: number }[] }[];
      };
      const drawn = spec.charts.flatMap((ch) => ch.values.map((v) => v.value));
      expect(drawn, `1단 답이 그래프에 없는 값이다`).toContain(
        answerNum(p.answer),
      );
    }
  });

  // 2단은 «고르는 일»이 한 겹 붙는다 — 최대·최소를 스스로 고르고 **한 번** 뺀다.
  it("2단 답은 그래프의 최대와 최소의 차다 (엔진을 되부르지 않고 직접 센다)", () => {
    for (const seed of SEEDS) {
      const p = G4_TIER_BASIC(UNIT, createRng(seed));
      const spec = p.figureSpec as { values: { value: number }[] };
      const vals = spec.values.map((v) => v.value);
      // **독립 검산** — 생성기 함수를 다시 부르지 않고 그림 값에서 직접 만든다.
      expect(answerNum(p.answer)).toBe(Math.max(...vals) - Math.min(...vals));
    }
  });

  // 3단은 두 단계다 — 나눗셈(몇 배)이나 눈금 한 칸(D-70)이 읽기 위에 한 겹 더 붙는다.
  it("3단 답은 두 단계로 나온다 — 몇 배(나눗셈)이거나 몇 칸(눈금)이다", () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const p = G4_TIER_APPLY(UNIT, createRng(seed));
      const spec = p.figureSpec as {
        values: { value: number }[];
        yStep: number;
      };
      const vals = spec.values.map((v) => v.value);
      const got = answerNum(p.answer);
      if (/몇 배/.test(p.content)) {
        kinds.add("배");
        expect(got, `몇 배 답이 최대÷최소가 아니다`).toBe(
          Math.max(...vals) / Math.min(...vals),
        );
        expect(
          Number.isInteger(got),
          `몇 배 답이 자연수가 아니다: ${got}`,
        ).toBe(true);
      } else {
        kinds.add("칸");
        // 「몇 칸」 — 답 × 걸음이 그래프에 그려진 값이어야 한다.
        expect(vals, `몇 칸 답이 그래프 값과 안 맞는다`).toContain(
          got * spec.yStep,
        );
        expect(
          Number.isInteger(got),
          `몇 칸 답이 자연수가 아니다: ${got}`,
        ).toBe(true);
      }
    }
    // 한 쪽으로 굳으면 「두 개념 결합」이 반쪽이 된다.
    expect(kinds.size, `3단이 ${[...kinds]} 한 가지로만 나온다`).toBe(2);
  });

  // ── 4단 심화 — 역산. 「그림이 답을 말하지 않는다」가 이 단의 **성립 조건**이다.

  it("4단 답은 전체에서 보이는 값을 뺀 것이다 (그림 값으로 직접 센다)", () => {
    for (const seed of SEEDS) {
      const p = G4_TIER_DEEP(UNIT, createRng(seed));
      const spec = p.figureSpec as {
        values: { label: string; value?: number; unknown?: boolean }[];
      };
      const shown = spec.values.filter((v) => !v.unknown);
      const hidden = spec.values.filter((v) => v.unknown);
      expect(hidden.length, `숨긴 항목이 하나가 아니다`).toBe(1);
      // 전체는 발문에만 있다 — 거기서 읽어 **독립으로** 답을 만든다.
      const m = p.content.match(/모두 \$(\d+)\$명일 때/);
      expect(m, `발문에 전체가 없다: ${p.content}`).toBeTruthy();
      const rest = shown.reduce((a, v) => a + (v.value ?? 0), 0);
      expect(answerNum(p.answer)).toBe(Number(m![1]) - rest);
    }
  });

  // ⚠️ 이 단의 알맹이. 참값이 스펙에 실리면 렌더러가 아무리 조심해도 새어 나간다 —
  //    계약이 「unknown 항목에는 `value` 필드가 **아예 없다**」인 까닭이다(D-66 ⑺).
  it("4단 참값은 스펙 어디에도 없다 — 그림이 답을 말할 수 없다", () => {
    for (const seed of SEEDS) {
      const p = G4_TIER_DEEP(UNIT, createRng(seed));
      const spec = p.figureSpec as {
        values: { label: string; value?: number; unknown?: boolean }[];
        yMax: number;
      };
      const truth = answerNum(p.answer);
      const unknown = spec.values.find((v) => v.unknown)!;
      expect(
        Object.prototype.hasOwnProperty.call(unknown, "value"),
        `unknown 항목에 value 가 있다 — 계약 위반`,
      ).toBe(false);
      expect(
        spec.values.some((v) => v.value === truth),
        `참값 ${truth} 이 다른 항목 값으로 스펙에 있다`,
      ).toBe(false);
      // 축도 참값에서 나오면 안 된다 — 보이는 막대들만 보고 세워야 한다.
      const shownMax = Math.max(
        ...spec.values.filter((v) => !v.unknown).map((v) => v.value!),
      );
      expect(spec.yMax, `yMax 가 보이는 최댓값에서 안 나왔다`).toBe(
        shownMax + 1,
      );
      expect(
        truth,
        `숨긴 값이 최댓값이라 축이 그 크기를 귀띔한다`,
      ).toBeLessThan(shownMax);
    }
  });

  // ⚠️ **elem-figures 착륙 전까지 빨갛다** — 결함이 아니라 순서다(팀장 승인 2026-08-23).
  //    렌더러가 `unknown` 키를 아직 모른다. 착륙하면 저절로 초록이 되고, 그때
  //    「점선 자리와 ? 가 실제로 그려지는가」까지 여기서 본다.
  it("4단 그림이 실제로 그려지고, 점선 자리와 ? 가 나온다 [figures 착륙 대기]", async () => {
    const bad: string[] = [];
    for (const seed of SEEDS.slice(0, 6)) {
      const p = G4_TIER_DEEP(UNIT, createRng(seed));
      const r = await renderFigureSpec(p.figureSpec);
      if (!r.ok) {
        bad.push(`씨앗 ${seed}: ${r.error}`);
        continue;
      }
      if (!/stroke-dasharray/.test(r.svg))
        bad.push(`씨앗 ${seed}: 점선 자리가 없다`);
      if (!/\?/.test(r.svg)) bad.push(`씨앗 ${seed}: ? 표시가 없다`);
      // 그려진 것에 참값이 없어야 한다 — 눈금 숫자로도 새면 안 된다.
      //
      // ⚠️ 2026-08-23: 이 정규식의 `\b` 가 **백스페이스 한 글자(0x08)** 로 파일에 박혀
      // 있었다(파일을 쓰는 스크립트에서 역슬래시가 한 겹 벗겨진 자국). 그러면 `<text`
      // 뒤에 백스페이스를 요구하므로 **아무것도 안 잡히고**, `drawn` 이 늘 비어
      // `includes` 가 늘 거짓이라 **이 검사는 죽은 채 초록**이었다. 컴파일·린트·시험이
      // 전부 통과하므로 아무 가드도 안 운다.
      //
      // 그래서 **분모를 함께 센다** — 이름표를 하나도 못 읽었으면 그것부터 실패다.
      // 「0건이 «깨끗»인지 «못 셈»인지」를 가르는 자리다.
      const truth = answerNum(p.answer);
      // 2026-08-28: 라벨이 조판되면 `<text>` 가 아니라 `<g data-label>` 로 나간다.
      // 정규식으로 `<text>` 만 보면 그 순간 이 검사는 **또** 죽은 채 초록이 된다 —
      // 위에 적은 그 결함의 다른 얼굴이다. 읽는 규칙을 한 곳(`svgLabels`)에 둔다.
      const drawn = svgLabels(r.svg)
        .filter((l) => l.fontSize === 16 && /^\d+$/.test(l.text))
        .map((l) => Number(l.text));
      if (drawn.length === 0)
        bad.push(
          `씨앗 ${seed}: 막대 이름표를 하나도 못 읽었다 — 이 검사가 죽었다`,
        );
      if (drawn.includes(truth))
        bad.push(`씨앗 ${seed}: 참값 ${truth} 이 막대 이름표로 그려졌다`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  // 단이 올라갈수록 실제로 어려워지는가 — **단끼리 겹치지 않는다**를 셀 수 있게.
  it("갈래끼리 발문이 겹치지 않는다", () => {
    const byTier = TIERS.map(
      ([name, fn]) =>
        [
          name,
          new Set(SEEDS.map((s) => fn(UNIT, createRng(s)).content)),
        ] as const,
    );
    for (const [an, a] of byTier) {
      for (const [bn, b] of byTier) {
        if (an === bn) continue;
        const both = [...a].filter((x) => b.has(x));
        expect(
          both,
          `${an}과 ${bn}이 같은 발문을 낸다: ${both[0] ?? ""}`,
        ).toEqual([]);
      }
    }
  });
});
