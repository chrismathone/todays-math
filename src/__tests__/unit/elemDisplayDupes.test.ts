/**
 * 초등 지면의 «같은 것 두 번» · «그림이 정답을 보여 줌» · «TeX 가 글자로» — 원장님 2026-10-20
 * («시험지 만들기로 출제해 보니 중복으로 적혀 있거나, 문제 속에 있는데 세로셈이 있는 등»).
 *
 * 참은 발문 · 그림 사양에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 * 전수 집계와 근거: `display-survey/report.md`(저장소 밖) · 판정기 `display-survey/scripts/classify.ts`.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 30 }, (_, s) => 20260825 + s * 1009);

function unitOf(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(code),
  );
  expect(u).toBeTruthy();
  return u!;
}

/** 답 `$7.6$` · `$12$` 의 수. */
function answerNumber(answer: string): string {
  const m = /^\$(\d+(?:\.\d+)?)\$$/.exec(answer.trim());
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return m![1]!;
}

function labelsOf(spec: Record<string, unknown> | null): string[] {
  if (!spec) return [];
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(spec);
  return out;
}

describe("그림이 정답을 라벨로 달지 않는다", () => {
  it("초4 2-3-6 문형05 리본 이어 붙이기 — 테이프 라벨이 합이 아니다", () => {
    const unit = unitOf("초4", "2-3-6");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const ans = answerNumber(p.answer);
      for (const label of labelsOf(p.figureSpec))
        expect(label, p.content).not.toContain(ans);
    }
  });

  it("초5 2-3-2 문형04 이등변삼각형 — 같은 두 변의 길이를 그림에 적지 않는다", () => {
    const unit = unitOf("초5", "2-3-2");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      if (p.figureSpec?.kind !== "markedShape") continue;
      const ans = answerNumber(p.answer);
      // 첫 변은 발문에 적힌 밑변이다 — 같은 두 변(둘째 · 셋째)만 본다.
      const legs = ((p.figureSpec.sides as (string | null)[]) ?? []).slice(1);
      expect(legs.filter((s) => s?.startsWith(`${ans} `)), p.content).toEqual([]);
    }
  });

  it("초4 1-3-6 문형05·06 몫의 자리 숫자 — 세로셈이 몫을 그리지 않는다", () => {
    const unit = unitOf("초4", "1-3-6");
    for (const id of ["05", "06"])
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, id);
        const m = /\$(\d+)\\div(\d+)\$/.exec(p.content);
        expect(m, p.content).toBeTruthy();
        const q = String(Number(m![1]) / Number(m![2]));
        expect(labelsOf(p.figureSpec), p.content).not.toContain(q);
      }
  });
});

describe("발문에 이미 있는 식을 식 줄로 또 찍지 않는다", () => {
  it("초4 1-3-3 문형06 «…어림하여 곱하면 얼마인가?» 뒤에 같은 곱셈 줄이 없다", () => {
    const unit = unitOf("초4", "1-3-3");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.content, p.content).not.toMatch(/\n\n\$\d+\\times\d+\$\s*$/);
      expect(p.content).toMatch(/어림하여 곱하면 얼마인가\?$/);
    }
  });
});

describe("TeX · 낱말이 지면에서 어긋나지 않는다", () => {
  it("모든 초등 문형에 `$$` 가 없다 — 짝이 엇갈린 달러가 글자를 수식 밖으로 밀어낸다", () => {
    for (const unit of elementaryUnits())
      for (const form of listedForms(unit))
        for (const seed of SEEDS.slice(0, 5)) {
          const p = generateElementaryForm(unit, seed, form.id);
          expect(p.content, `${unit.grade} ${unit.section} ${form.id}`).not.toContain("$$");
        }
  });

  it("초3 1-5-4 문형05 «□분 s초 = t초» 의 t 가 수식이다", () => {
    const unit = unitOf("초3", "1-5-4");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(p.content).toMatch(/\$=\$ \$\d+\$초$/);
    }
  });

  it("초3 1-5-5 시간의 덧셈 — «두 시간 $3$시간» 처럼 «두 시간»이 수 앞에 붙지 않는다", () => {
    const unit = unitOf("초3", "1-5-5");
    for (const form of listedForms(unit))
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, form.id);
        expect(p.content).not.toMatch(/두 시간 \$/);
      }
  });
});
