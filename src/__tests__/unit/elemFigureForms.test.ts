/**
 * 그림 문형 21~ (초5 2-1 «수의 범위와 어림하기» · 2026-10-18) — 정답을 **그림 스펙에서 다시 구해** 견준다.
 * 생성기가 쓴 해설의 말을 믿지 않는다: 수직선의 끝 · ●/○ 로 범위를 읽고 거기서 답을 낸다.
 */
import { describe, expect, it } from "vitest";

import { expandFamily } from "@/lib/engine/expandEngine";
import { FIGURE_FORMS } from "@/lib/elementary/figureForms";
import {
  coreForms,
  expectedFormCount,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/forms";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import { CURRICULUM_UNITS as UNITS } from "../../../prisma/seed-data/units";

type RangeSpec = {
  from: number | null;
  to: number | null;
  fromIn?: boolean;
  toIn?: boolean;
};

function unitOf(key: string) {
  const [grade, code] = key.split("|");
  const unit = UNITS.find(
    (u) => u.grade === grade && u.section.startsWith(`${code} `),
  );
  if (!unit) throw new Error(`단원 없음 ${key}`);
  return unit;
}

function inRange(r: RangeSpec, v: number): boolean {
  if (r.from !== null && (r.fromIn ? v < r.from : v <= r.from)) return false;
  if (r.to !== null && (r.toIn ? v > r.to : v >= r.to)) return false;
  return true;
}

function words(r: RangeSpec): string {
  const parts: string[] = [];
  if (r.from !== null) parts.push(`$${r.from}$ ${r.fromIn ? "이상" : "초과"}`);
  if (r.to !== null) parts.push(`$${r.to}$ ${r.toIn ? "이하" : "미만"}`);
  return `${parts.join(" ")}인 수`;
}

const MARKS = ["①", "②", "③", "④", "⑤"];
const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 37);

describe("그림 문형 — 등록", () => {
  it("문형 열 개 · 확대 갈래는 그대로이고 그림 문형만 뒤에 붙는다", () => {
    for (const key of Object.keys(FIGURE_FORMS)) {
      const unit = unitOf(key);
      expect(coreForms(unit), key).toHaveLength(10);
      const ids = listedForms(unit).map((f) => f.id);
      expect(new Set(ids).size, key).toBe(ids.length);
      // 그림 문형은 기본 · 확대 뒤 · 진술 문형(31 · 32) 앞에 선다.
      const firstFigure = ids.indexOf(FIGURE_FORMS[key]![0]!.id);
      expect(ids.slice(0, firstFigure).every((id) => Number(id) < 21), key).toBe(true);
      expect(
        ids.slice(firstFigure, firstFigure + FIGURE_FORMS[key]!.length),
        key,
      ).toEqual(FIGURE_FORMS[key]!.map((f) => f.id));
      expect(expectedFormCount(unit), key).toBe(ids.length);
    }
  });
});

describe("그림 문형 — 정답은 그림이 정한다", () => {
  for (const [key, forms] of Object.entries(FIGURE_FORMS)) {
    for (const form of forms) {
      it(`${key} 문형 ${form.id}`, () => {
        const unit = unitOf(key);
        for (const seed of SEEDS) {
          const p = generateElementaryForm(unit, seed, form.id);
          const spec = p.figureSpec as {
            kind: string;
            min: number;
            max: number;
            ranges: RangeSpec[];
          };
          expect(spec.kind).toBe("numberLine");
          const r = spec.ranges[0]!;
          // 끝은 축 끝에 붙지 않는다 — 붙으면 «끝이 없는 범위»와 구별이 안 된다.
          if (r.from !== null) expect(r.from).toBeGreaterThan(spec.min);
          if (r.to !== null) expect(r.to).toBeLessThan(spec.max);
          if (/바르게 나타낸 것은/.test(p.content)) {
            const lines = p.content
              .split("\n")
              .filter((l) => MARKS.includes(l[0]!));
            expect(lines).toHaveLength(5);
            const bodies = lines.map((l) => l.slice(2));
            expect(new Set(bodies).size).toBe(5);
            const right = bodies.indexOf(words(r));
            expect(right, p.content).toBeGreaterThanOrEqual(0);
            expect(p.answer).toBe(MARKS[right]);
            // 2-1-1 은 초과 · 미만을 아직 안 배운다.
            if (key.endsWith("2-1-1"))
              expect(p.content).not.toMatch(/초과|미만/);
          } else if (/자연수는 모두 몇 개/.test(p.content)) {
            let c = 0;
            for (let v = spec.min; v <= spec.max; v += 1)
              if (inRange(r, v)) c += 1;
            expect(p.answer).toBe(`$${c}$`);
          } else if (/탈 수 있는 사람은 몇 명/.test(p.content)) {
            const list = p.content.match(/키가 \$([^$]+)\$/)![1]!;
            const heights = list.split(",\\ ").map(Number);
            expect(heights).toContain(r.from);
            expect(heights).toContain(r.to);
            expect(p.answer).toBe(
              `$${heights.filter((h) => inRange(r, h)).length}$`,
            );
          } else {
            const [, kind, where] = p.content.match(
              /자연수를 (올림|버림|반올림)하여 (십|백)의 자리/,
            )!;
            const unitPlace = where === "백" ? 100 : 10;
            const target = Number(p.answer.replace(/\$/g, ""));
            for (let v = spec.min; v <= spec.max; v += 1) {
              if (!inRange(r, v)) continue;
              const rounded =
                kind === "올림"
                  ? Math.ceil(v / unitPlace) * unitPlace
                  : kind === "버림"
                    ? Math.floor(v / unitPlace) * unitPlace
                    : Math.round(v / unitPlace) * unitPlace;
              expect(rounded, `${v}`).toBe(target);
            }
            // 범위가 «딱 그만큼»이다 — 바로 바깥 자연수는 다른 수가 된다.
            const outside = [
              r.fromIn ? r.from! - 1 : r.from!,
              r.toIn ? r.to! + 1 : r.to!,
            ];
            for (const v of outside) {
              const rounded =
                kind === "올림"
                  ? Math.ceil(v / unitPlace) * unitPlace
                  : kind === "버림"
                    ? Math.floor(v / unitPlace) * unitPlace
                    : Math.round(v / unitPlace) * unitPlace;
              expect(rounded, `${v}`).not.toBe(target);
            }
          }
        }
      });
    }
  }
});

describe("그림 문형 — 적재 경로", () => {
  it("변형 셋이 서로 다르고, 보기를 단 문형은 객관식 그대로 · 수 답 문형은 단답 + 객관식", () => {
    for (const [key, forms] of Object.entries(FIGURE_FORMS)) {
      const unit = unitOf(key);
      for (const form of forms) {
        const got = expandFamily(
          (v) => {
            const p = generateElementaryForm(unit, 9000 + v * 1009, form.id);
            return {
              content: p.content,
              answer: p.answer,
              solution: p.solution,
              familyKey: `elem:${unit.grade}|${unit.section}|${form.id}`,
              problemType: "개념",
            };
          },
          3,
          { allowShort: true },
        );
        expect(got.shortBy, `${key} ${form.id}`).toBe(0);
        const types = got.items.map((i) => i.questionType);
        if (form.id === "21" && key.match(/2-1-[12]$/))
          expect(types, `${key} ${form.id}`).toEqual([
            "객관식",
            "객관식",
            "객관식",
          ]);
        else expect(got.skippedMcq, `${key} ${form.id} ${got.reasons}`).toBe(0);
      }
    }
  });

  it("그림이 실제로 그려진다(엔진 렌더)", async () => {
    for (const [key, forms] of Object.entries(FIGURE_FORMS)) {
      const unit = unitOf(key);
      for (const form of forms) {
        const p = generateElementaryForm(unit, 4242, form.id);
        const r = await renderFigureSpec(p.figureSpec!);
        expect(r.ok, `${key} ${form.id}`).toBe(true);
      }
    }
  });
});
