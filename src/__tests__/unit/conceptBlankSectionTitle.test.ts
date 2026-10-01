/**
 * 소단원 이름의 수식 — 원장님 2026-10-01 «일부 카텍스 적용 안되어있네»(완전 백지 칸 머리 «② 이차함수 y=ax^2+bx+c의 그래프»).
 * 은행 글은 2차에서 모두 KaTeX 로 바꿨지만 소단원 이름은 교육과정 시드(`prisma/seed-data/units.ts`)의 글 그대로 지면에 찍혔다.
 * 시드는 다른 화면도 쓰므로 고치지 않고, 개념 백지가 이름을 지면 · 화면에 넘길 때 수식 꼴로 바꾼다(`sectionTitleTex`).
 */
import katex from "katex";
import { describe, expect, it } from "vitest";

import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { composeSheets } from "@/lib/concept-blank/compose";
import {
  BLANK_SECTIONS,
  CONCEPT_BLANK_GRADES,
  sectionTitleTex,
} from "@/lib/concept-blank/sections";

const READY = BLANK_SECTIONS.filter((s) =>
  (CONCEPT_BLANK_GRADES as readonly string[]).includes(s.grade),
);
const mathOf = (text: string) =>
  [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);

describe("sectionTitleTex — 소단원 이름을 지면 · 화면에 넘길 꼴", () => {
  it.each([
    ["이차함수 y=ax^2+bx+c의 그래프", "이차함수 $y=ax^2+bx+c$의 그래프"],
    ["정비례 관계 y=ax의 그래프", "정비례 관계 $y=ax$의 그래프"],
    ["반비례 관계 y=a/x의 그래프", "반비례 관계 $y=\\dfrac{a}{x}$의 그래프"],
    ["1-5-1 1cm보다 작은 단위", "1-5-1 $1\\,\\mathrm{cm}$보다 작은 단위"],
    ["1-5-2 1m보다 큰 단위", "1-5-2 $1\\,\\mathrm{m}$보다 큰 단위"],
    [
      "1-6-2 1cm², 직사각형과 정사각형의 넓이",
      "1-6-2 $1\\,\\mathrm{cm}^2$, 직사각형과 정사각형의 넓이",
    ],
    [
      "1-6-3 1cm²보다 더 큰 넓이의 단위",
      "1-6-3 $1\\,\\mathrm{cm}^2$보다 더 큰 넓이의 단위",
    ],
    ["1-6-3 ㎥ 알아보기", "1-6-3 $\\mathrm{m}^3$ 알아보기"],
  ])("%s", (seed, tex) => {
    expect(sectionTitleTex(seed)).toBe(tex);
  });

  it("수식이 없는 이름은 그대로 — ×(곱하기) · ÷ · 괄호 낱말은 글자로 둔다", () => {
    expect(sectionTitleTex("1-4-1 (몇십)×(몇)")).toBe("1-4-1 (몇십)×(몇)");
    expect(sectionTitleTex("2-3-1 도형의 합동 알아보기")).toBe(
      "2-3-1 도형의 합동 알아보기",
    );
  });

  it("개념 백지 학년(초3~중3)의 이름 전부 — 수식 밖에 날 수식(라틴 글자 · ^ · 단위 글자)이 남지 않고, 수식은 KaTeX 가 그린다", () => {
    for (const s of READY) {
      const tex = sectionTitleTex(s.title);
      expect(tex.replace(/\$[^$]*\$/g, ""), s.key).not.toMatch(
        /[A-Za-z^㎠㎡㎤㎥㎦㎖㎗㎘㎞㎝㎜㎎㎏]/,
      );
      for (const m of mathOf(tex))
        expect(
          () => katex.renderToString(m, { throwOnError: true }),
          s.key,
        ).not.toThrow();
    }
  });

  it("완전 백지의 칸 머리(채점표의 자리 글도 이것)는 수식 꼴 이름이다", () => {
    const key = READY.find((s) => s.title.includes("y=ax^2+bx+c"))!.key;
    const [sheet] = composeSheets(
      {
        sections: [key],
        forms: [
          {
            form: "recall",
            counts: { 하: 1, 중: 1, 상: 1 },
            extras: { 하: 0, 중: 0, 상: 0 },
          },
        ],
      },
      CONCEPT_BLANK_BANK,
    );
    expect(sheet!.form).toBe("recall");
    if (sheet!.form !== "recall") return;
    expect(sheet!.zones[0]!.title).toBe("이차함수 $y=ax^2+bx+c$의 그래프");
  });
});
