/**
 * 초등 문항류 파일럿 — 키는 안 옮기고, 문형 10개가 시험지 10문항까지 서는가.
 *
 * 적재기 familyKey 조립은 이 파일이 소스 문자열로 잠근다. 바꾸면 이관이 시작된다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultRatioFor } from "@/contracts/difficulty";
import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  elemProblemType,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  PILOT_FORM_KEYS,
  pilotFamilyKey,
  supportedTiers,
} from "@/lib/elementary/generate";
import { sameStemFrame, stemFrame } from "@/lib/elementary/stemFrame";
import { expandFamily } from "@/lib/engine/expandEngine";
import type { SelectableProblem } from "@/lib/generator/balanceDifficulty";
import { familyIdOf } from "@/lib/generator/familyKey";
import { selectProblems } from "@/lib/generator/selectProblems";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337];
const TIER_NAMES = new Set(["연산", "기본", "응용", "심화"]);

function unitOf(key: string) {
  const [grade, code] = key.split("|") as [string, string];
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(code),
  );
  expect(u, `소단원 없음 ${key}`).toBeTruthy();
  return u!;
}

const THEMES: Record<string, readonly string[]> = {
  "초3|2-3-1": [],
  "초4|1-6-5": [],
  "초5|2-5-1": ["상자", "색 끈", "테이프"],
};

describe("적재기 familyKey 는 그대로 소단원×난이도", () => {
  it("로드 소스가 문형 id 를 안 실는다", () => {
    const src = readFileSync(
      path.join(process.cwd(), "scripts/import/load-engine-problems.ts"),
      "utf8",
    );
    expect(src).toMatch(
      /familyKey: `elem:\$\{unit\.grade\}\|\$\{unit\.section\}\|\$\{tier\}`/,
    );
    expect(src).not.toMatch(/pilotFamilyKey/);
    expect(src).not.toMatch(/listedForms/);
    expect(src).not.toMatch(/generateElementaryForm/);
  });
});

describe("파일럿 3소단원 · 문형 10", () => {
  it("PILOT_FORM_KEYS 가 실재 소단원이고 4단 경로는 그대로다", () => {
    expect(PILOT_FORM_KEYS).toHaveLength(3);
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      expect(supportedTiers(unit)).toEqual(ELEM_TIERS);
      const plain = generateElementaryProblem(unit, 20260826, "연산");
      expect(plain.formId).toBeUndefined();
    }
  });

  it("소단원마다 문형 10개 · id 는 난이도 이름이 아니다", () => {
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      const forms = listedForms(unit);
      expect(forms, key).toHaveLength(10);
      const ids = forms.map((f) => f.id);
      expect(new Set(ids).size, key).toBe(10);
      expect(
        ids.every((id) => !TIER_NAMES.has(id)),
        key,
      ).toBe(true);
      expect(new Set(forms.map((f) => f.tier)), key).toEqual(
        new Set(ELEM_TIERS),
      );
    }
  });

  it("문형마다 formId 가 찍히고 난이도와 직교다 — 같은 난이도에 문형이 둘 있다", () => {
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      const forms = listedForms(unit);
      for (const form of forms) {
        const p = generateElementaryForm(unit, 20260826, form.id);
        expect(p.formId).toBe(form.id);
      }
      const byTier = ELEM_TIERS.map(
        (t) => forms.filter((f) => f.tier === t).length,
      );
      expect(
        byTier.some((n) => n >= 2),
        `${key} 난이도별 ${byTier} — 문형이 난이도와 1:1 이면 직교가 아니다`,
      ).toBe(true);
    }
  });

  it("지은 문형은 판정기가 서로 다른 틀로 센다", () => {
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      const themes = THEMES[key] ?? [];
      const frames = new Map<string, Set<string>>();
      for (const form of listedForms(unit)) {
        const set = new Set<string>();
        for (const seed of SEEDS) {
          const p = generateElementaryForm(unit, seed, form.id);
          set.add(stemFrame(p.content, themes));
        }
        expect(set.size, `${key} ${form.id} 씨앗 무반응`).toBeGreaterThan(0);
        frames.set(form.id, set);
      }
      const ids = [...frames.keys()];
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const a = frames.get(ids[i]!)!;
          const b = frames.get(ids[j]!)!;
          const hit = [...a].filter((x) => b.has(x));
          expect(
            hit,
            `${key} ${ids[i]} 와 ${ids[j]} 가 같은 틀 ${JSON.stringify(hit)}`,
          ).toEqual([]);
        }
      }
    }
  });

  it("음성 — 직육면체 상자/나무상자는 같은 틀 (소재만 바꿈)", () => {
    const a =
      "가로가 $6$ cm, 세로가 $4$ cm, 높이가 $5$ cm인 직육면체 모양 상자의 면은 몇 개입니까?";
    const b =
      "가로가 $6$ cm, 세로가 $4$ cm, 높이가 $5$ cm인 직육면체 모양 나무상자의 면은 몇 개입니까?";
    expect(sameStemFrame(a, b, ["상자", "나무상자"])).toBe(true);
  });
});

describe("expandFamily 를 지나 서로 다른 문항류로 선다", () => {
  it("문형마다 변형 3 × 단답이 나오고 familyKey 는 문형 id 다", () => {
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      for (const form of listedForms(unit)) {
        const familyKey = pilotFamilyKey(unit, form.id);
        const got = expandFamily((v) => {
          const p = generateElementaryForm(unit, 20260826 + v * 1009, form.id);
          return {
            content: p.content,
            answer: p.answer,
            solution: p.solution,
            familyKey,
            problemType: elemProblemType(form.tier),
          };
        });
        const short = got.items.filter((i) => i.questionType === "단답형");
        expect(short, `${key} ${form.id}`).toHaveLength(3);
        expect(
          new Set(short.map((i) => `${i.content}\n${i.answer}`)).size,
        ).toBe(3);
        expect(new Set(got.items.map((i) => i.familyKey))).toEqual(
          new Set([familyKey]),
        );
      }
    }
  });
});

describe("한 시험지에 10문항이 조립된다", () => {
  it("defaultRatioFor(10) + selectProblems 가 10갈래를 채운다", () => {
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      const pool: SelectableProblem[] = [];
      for (const form of listedForms(unit)) {
        const familyKey = pilotFamilyKey(unit, form.id);
        const got = expandFamily((v) => {
          const p = generateElementaryForm(unit, 20260826 + v * 1009, form.id);
          return {
            content: p.content,
            answer: p.answer,
            solution: p.solution,
            familyKey,
            problemType: elemProblemType(form.tier),
          };
        });
        got.items
          .filter((i) => i.questionType === "단답형")
          .forEach((item, i) => {
            pool.push({
              id: `${form.id}-${i}`,
              unitId: `unit-${key}`,
              difficulty: form.tier,
              problemType: elemProblemType(form.tier),
              directUseAllowed: true,
              familyKey,
              content: item.content,
              figureUrls: [],
              figureDims: [],
            });
          });
      }
      const { problems, shortfall } = selectProblems({
        pool,
        difficultyRatio: defaultRatioFor(10),
        count: 10,
        recentProblemIds: [],
        seed: `pilot-${key}`,
      });
      expect(shortfall, `${key} ${JSON.stringify(shortfall)}`).toEqual([]);
      expect(problems, key).toHaveLength(10);
      expect(new Set(problems.map((p) => familyIdOf(p))).size, key).toBe(10);
    }
  });
});
