/**
 * 초등 문항류 파일럿 — 키는 안 옮기고, 문형 10개가 시험지 10문항까지 서는가.
 *
 * 적재기 familyKey 조립은 이 파일이 소스 문자열로 잠근다. 바꾸면 이관이 시작된다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultRatioFor } from "@/contracts/difficulty";
import {
  elementaryUnits,
  elemProblemType,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  PILOT_FORM_KEYS,
  pilotFamilyKey,
} from "@/lib/elementary/generate";
import { sameStemFrame, stemFrame } from "@/lib/elementary/stemFrame";
import { expandFamily } from "@/lib/engine/expandEngine";
import type { SelectableProblem } from "@/lib/generator/balanceDifficulty";
import { familyIdOf } from "@/lib/generator/familyKey";
import { selectProblems } from "@/lib/generator/selectProblems";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337];
const TIER_NAMES = new Set([
  "연산",
  "기본",
  "응용",
  "심화하",
  "심화중",
  "심화상",
]);

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

describe("적재기 familyKey 는 소단원×문형", () => {
  /**
   * 🔴 이 가드는 **뒤집혔다.** 파일럿 때는 「적재기가 문형 id 를 안 실는다」를
   *    잠갔다 — 그때는 키를 옮기지 않기로 했기 때문이다. 원장님이 2026-08-26 에
   *    안 3(최고안)을 고르셨고 2026-08-27 에 실제로 옮겼으므로
   *    (`migrate-elem-family-keys.ts`, 공유 DB 1,751행), 이제 지켜야 할 것은
   *    **되돌아가지 않는 것**이다.
   *
   *    옛 4단 키로 되돌아가면 갈래가 소단원당 4로 접히고, 「한 시험지에 같은
   *    문항류 하나만」 아래서 초등은 **4문항이 상한**이 된다. 그 회귀를 여기서 막는다.
   */
  it("로드 소스가 문형 id 로 키를 만든다 — 옛 난이도 키로 안 돌아간다", () => {
    const src = readFileSync(
      path.join(process.cwd(), "scripts/import/load-engine-problems.ts"),
      "utf8",
    );
    expect(src).toMatch(
      /familyKey = `elem:\$\{unit\.grade\}\|\$\{unit\.section\}\|\$\{form\.id\}`/,
    );
    // 옛 꼬리(난이도)로 키를 만들면 빨개진다.
    expect(src).not.toMatch(/familyKey: `elem:[^`]*\$\{tier\}`/);
    // 문형을 실제로 부르는가 — 부르지 않으면 새 문형이 한 행도 안 들어간다.
    expect(src).toMatch(/listedForms/);
    expect(src).toMatch(/generateElementaryForm/);
    // 형식 3종을 한 곳에서 파생하는가.
    expect(src).toMatch(/expandFamily/);
  });
});

describe("파일럿 3소단원 · 문형 10", () => {
  it("PILOT_FORM_KEYS 가 실재 소단원이고 핵심 넷 경로는 그대로다", () => {
    expect(PILOT_FORM_KEYS).toHaveLength(3);
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      expectCoreTiers(unit, key);
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
        new Set(tiersOf(unit)),
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
      const byTier = tiersOf(unit).map(
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

/**
 * **변형을 3개까지 못 채우는 파일럿 문형** — `학년|소단원|문형 → 낼 수 있는 수`.
 *
 * `초3 2-3-1 f01` 은 「굵게 그린 선분의 이름」을 묻는데 답이 **지름·반지름 둘뿐**이다.
 * 태생이 2가지이고, 3을 채우려면 없는 답을 지어내야 한다.
 *
 * ⚠️ 이 표가 **늘면 회귀**다 — 변할 수 있던 문형이 못 변하게 된 것이다.
 *    전 학년 목록은 `elemFormVariantSpace.test.ts` 가 따로 못 박는다.
 */
const PILOT_SHORT: Record<string, number> = {
  "초3|2-3-1|01": 2,
};

describe("expandFamily 를 지나 서로 다른 문항류로 선다", () => {
  it("문형마다 변형 3 × 단답이 나오고 familyKey 는 문형 id 다", () => {
    const shortSeen: Record<string, number> = {};
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      for (const form of listedForms(unit)) {
        const familyKey = pilotFamilyKey(unit, form.id);
        // 🔴 **적재기와 같은 방식으로 부른다** (`allowShort`, 2026-08-28).
        //    다르게 부르면 제품이 안 쓰는 길을 재게 된다.
        const got = expandFamily(
          (v) => {
            const p = generateElementaryForm(
              unit,
              20260826 + v * 1009,
              form.id,
            );
            return {
              content: p.content,
              answer: p.answer,
              solution: p.solution,
              familyKey,
              problemType: elemProblemType(form.tier),
            };
          },
          3,
          { allowShort: true },
        );
        const short = got.items.filter((i) => i.questionType === "단답형");
        const want = PILOT_SHORT[`${key}|${form.id}`] ?? 3;
        if (short.length < 3) shortSeen[`${key}|${form.id}`] = short.length;
        expect(short, `${key} ${form.id}`).toHaveLength(want);
        // 낸 것은 **서로 달라야** 한다 — 몇 개를 내든 이건 흔들리면 안 된다.
        expect(
          new Set(short.map((i) => `${i.content}\n${i.answer}`)).size,
          `${key} ${form.id} — 같은 문항이 섞였다`,
        ).toBe(want);
        expect(new Set(got.items.map((i) => i.familyKey))).toEqual(
          new Set([familyKey]),
        );
      }
    }
    // 🔴 **짧은 문형의 목록이 그대로다.** 안 잠그면 새로 짧아진 문형이
    //    `want` 를 그때그때 따라가 조용히 통과한다.
    expect(shortSeen, "변형을 못 채우는 파일럿 문형이 달라졌다").toEqual(
      PILOT_SHORT,
    );
  });
});

describe("한 시험지에 10문항이 조립된다", () => {
  it("defaultRatioFor(10) + selectProblems 가 10갈래를 채운다", () => {
    for (const key of PILOT_FORM_KEYS) {
      const unit = unitOf(key);
      const pool: SelectableProblem[] = [];
      for (const form of listedForms(unit)) {
        const familyKey = pilotFamilyKey(unit, form.id);
        const got = expandFamily(
          (v) => {
            const p = generateElementaryForm(
              unit,
              20260826 + v * 1009,
              form.id,
            );
            return {
              content: p.content,
              answer: p.answer,
              solution: p.solution,
              familyKey,
              problemType: elemProblemType(form.tier),
            };
          },
          3,
          { allowShort: true }, // 적재기와 같은 방식으로 부른다
        );
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
