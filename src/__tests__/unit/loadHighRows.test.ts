/**
 * 🔴 **고등 유형이 지면에 나가는 길** — 적재기 target · 미적재 검사 · 제자리 갱신 (2026-10-08 엔진 보강 ③-0).
 *
 * 공통수학1 168유형은 등록부에만 있고 문제은행에 한 행도 없었다. 적재기에 `HighTarget` 이 없고, 미적재 검사 ·
 * 제자리 갱신에 고등 경로가 없고, 출처 판정의 엔진 접두사가 `elem:` · `mid:` 둘뿐이었다(3자 합의 §3-3).
 * 결합형 · 판정형이 밟은 «시험에서만 생성되던» 자리다 — 세 자리를 처음부터 한 target 에 묶는다.
 *
 * ```
 * ㉠ 적재기 — `engine: "high"` 가 단답 · 객관 두 벌을 내고, 열쇠가 계약(`src/lib/high/loadKey.ts`) 그대로다
 * ㉡ 분기 함수 — 고등 target 은 고등 행 생성으로 가고, 모르는 engine 은 던진다
 * ㉢ 미적재 검사 — 고등 등록부를 **정확한 키**로 센다. 비슷한 키(`…|03A` ⊃ `…|03`)의 «거짓 적재»를 안 받는다
 * ㉣ 제자리 갱신 — 적재기와 **같은 분기 함수**로 행을 되만든다
 * ㉤ 적재 계획(공통수학1 전부) — 살아 있는 등록부를 빠짐없이 한 번씩 덮는다
 * ```
 *
 * ㉠ ~ ㉣ 은 픽스처 등록부(`helpers/highFixture.ts`)로 댄다 — 살아 있는 등록부만 보면 세는 능력을 잃어도
 * 답이 같다. ㉤ 만 살아 있는 등록부와 실제 계획 파일을 본다.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  ambiguousUnitKeys,
  buildHighRows,
  buildTargetRows,
  isOwnExternalId,
  rowTable,
  type Target,
} from "../../../scripts/import/load-engine-problems";
import {
  highKeyProbe,
  loadedFragments,
  loadedHighKeys,
  unloaded,
  unloadedAll,
  unloadedHigh,
} from "../../../scripts/qa/checkUnloadedTypes";
import { rebuild } from "../../../scripts/qa/refresh-engine-content";
import { intBetween } from "@/lib/elementary/rng";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { classifyFormat, classifyOrigin } from "@/lib/problem/provenance";
import {
  createHighRegistry,
  defaultHighRegistry,
  registeredHighTypes,
} from "@/lib/high/generate";
import {
  highExternalId,
  highFamilyKey,
  highTypeKeyFault,
  highVariantKey,
  parseHighExternalId,
} from "@/lib/high/loadKey";
import { middleComboDefinitions } from "@/lib/middle/combo";
import { registeredTypes } from "@/lib/middle/generate";
import { judgementDefinitions } from "@/lib/middle/judge/registry";

import {
  FIXTURE_BOOK,
  FIXTURE_MINOR,
  FIXTURE_SECTION_A,
  FIXTURE_SECTION_B,
  fixtureHighEntries,
} from "../helpers/highFixture";

const SEED = 20261008;
const registry = createHighRegistry(fixtureHighEntries());
const K03 = `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03`;
const K03A = `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03A`;
const K04 = `${FIXTURE_BOOK}|${FIXTURE_MINOR}|04`;
const targetA = {
  engine: "high",
  grade: FIXTURE_BOOK,
  unitSection: FIXTURE_SECTION_A,
} as const;
const targetB = {
  engine: "high",
  grade: FIXTURE_BOOK,
  unitSection: FIXTURE_SECTION_B,
} as const;

describe("열쇠 계약 — 짓는 함수와 읽는 함수가 짝이다", () => {
  it("externalId · familyKey · variantKey 의 꼴이 중등 규칙 그대로다", () => {
    expect(highFamilyKey(K03)).toBe(`high:${K03}`);
    expect(highVariantKey({ typeKey: K03, seed: SEED, variant: 2 })).toBe(
      `high:${K03}|s${SEED}|v2`,
    );
    const id = highExternalId({
      typeKey: K03,
      seed: SEED,
      variant: 2,
      questionType: "단답형",
    });
    expect(id).toBe(`engine-high:${K03}|s${SEED}|v2|단답형`);
    expect(parseHighExternalId(id)).toEqual({
      typeKey: K03,
      seed: SEED,
      variant: 2,
      questionType: "단답형",
    });
  });

  it("고등 엔진의 열쇠가 아니면 안 읽는다 — 다른 접두사 · 꼬리 없음 · 모르는 형식 · 키 모양", () => {
    for (const id of [
      `engine-mid:${K03}|s1|v0|단답형`,
      `engine-mid-judge:${K03}|r1|s1|v0|객관식`,
      `engine-high:${K03}`,
      `engine-high:${K03}|s1|v0`,
      `engine-high:${K03}|s1|v0|논술형`,
      `engine-high:${K03}|sx|v0|단답형`,
      `x-engine-high:${K03}|s1|v0|단답형`,
      `engine-high:${FIXTURE_BOOK}|${FIXTURE_MINOR}|s1|v0|단답형`,
      `engine-high:${FIXTURE_BOOK}|${FIXTURE_MINOR}|3|s1|v0|단답형`,
    ]) {
      expect(parseHighExternalId(id), id).toBeNull();
    }
  });

  it("유형 키가 `과목|중단원|번호` 꼴이 아니면 열쇠를 안 짓는다 — 꼬리를 흉내 내는 키를 막는다", () => {
    expect(highTypeKeyFault(K03)).toBeNull();
    expect(highTypeKeyFault(K03A)).toBeNull();
    for (const bad of [
      `${FIXTURE_BOOK}|${FIXTURE_MINOR}`,
      `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03|s1`,
      `${FIXTURE_BOOK}||03`,
      `${FIXTURE_BOOK}|${FIXTURE_MINOR}|3`,
      `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03a`,
      `${FIXTURE_BOOK}|${FIXTURE_MINOR} |03`,
    ]) {
      expect(highTypeKeyFault(bad), bad).not.toBeNull();
      expect(() => highFamilyKey(bad), bad).toThrow(/열쇠 모양이 아니다/);
      expect(
        () =>
          highExternalId({
            typeKey: bad,
            seed: 1,
            variant: 0,
            questionType: "단답형",
          }),
        bad,
      ).toThrow(/열쇠 모양이 아니다/);
    }
    expect(() =>
      highExternalId({
        typeKey: K03,
        seed: 1,
        variant: 0,
        questionType: "논술형",
      }),
    ).toThrow(/형식을 모른다/);
  });
});

describe('㉠ 적재기 — `engine: "high"`', () => {
  const rows = buildHighRows({ ...targetA, variants: 3 }, SEED, registry);

  it("그 차시의 등록 유형 전부가 변형마다 단답 · 객관 두 벌을 낸다 — 분모부터", () => {
    expect(registry.typesForSection(FIXTURE_SECTION_A)).toHaveLength(2);
    expect(rows).toHaveLength(2 * 3 * 2);
    const byFormat = new Map<string, number>();
    for (const r of rows)
      byFormat.set(r.questionType, (byFormat.get(r.questionType) ?? 0) + 1);
    expect(Object.fromEntries(byFormat)).toEqual({ 단답형: 6, 객관식: 6 });
    for (const r of rows) {
      expect(r.grade).toBe(FIXTURE_BOOK);
      expect(r.section).toBe(FIXTURE_SECTION_A);
      expect(r.chapter).toBeUndefined();
      expect(r.unitKey).toBe(`${FIXTURE_BOOK} / ${FIXTURE_SECTION_A}`);
      expect(r.figureSpec).toBeNull();
    }
  });

  it("열쇠가 계약 그대로다 — externalId 를 되읽으면 유형 키 · 씨앗 · 변형 · 형식이 나온다", () => {
    for (const r of rows) {
      const parts = parseHighExternalId(r.externalId);
      expect(parts, r.externalId).not.toBeNull();
      expect([K03, K03A]).toContain(parts!.typeKey);
      expect(parts!.seed).toBe(SEED);
      expect(parts!.questionType).toBe(r.questionType);
      expect(r.externalId).toBe(highExternalId(parts!));
      expect(r.familyKey).toBe(highFamilyKey(parts!.typeKey));
      expect(r.variantKey).toBe(highVariantKey(parts!));
      expect(r.origin).toContain(parts!.typeKey);
    }
    // 한 변형의 두 형식은 같은 variantKey 로 묶인다(중복 제거가 둘을 같이 버리거나 같이 남긴다)
    const perVariant = new Map<string, string[]>();
    for (const r of rows)
      perVariant.set(r.variantKey, [
        ...(perVariant.get(r.variantKey) ?? []),
        r.questionType,
      ]);
    for (const [k, formats] of perVariant)
      expect(formats.sort(), k).toEqual(["객관식", "단답형"]);
  });

  it("단답형 행의 본문 · 정답 · 해설 · 칸이 등록부가 낸 그대로다", () => {
    const short = rows.filter((r) => r.questionType === "단답형");
    expect(short).toHaveLength(6);
    for (const r of short) {
      const parts = parseHighExternalId(r.externalId)!;
      const p = registry.generate(parts.typeKey, SEED, parts.variant);
      expect(r.content).toBe(p.content);
      expect(r.answer).toBe(p.answer);
      expect(r.solution).toBe(p.solution);
      expect(r.difficulty).toBe(p.difficulty);
      // 중등과 같은 어림 — 밑 두 칸은 계산, 위는 활용
      expect(r.problemType).toBe(
        p.difficulty === "연산" || p.difficulty === "기본" ? "계산" : "활용",
      );
    }
    // 꼴마다 칸이 다른 유형은 행의 칸도 변형마다 따라간다(유형 하나에 칸 하나로 접지 않는다)
    const wide = buildHighRows({ ...targetA, variants: 12 }, SEED, registry);
    expect(
      new Set(
        wide
          .filter((r) => r.familyKey.endsWith("|03"))
          .map((r) => r.difficulty),
      ).size,
    ).toBeGreaterThan(1);
  });

  it("🔴 객관식은 생성기가 낸 오답 넷을 쓴다 — 식 정답을 공용 수 오답으로 흔들지 않는다", () => {
    const mcq = rows.filter(
      (r) => r.questionType === "객관식" && r.familyKey === highFamilyKey(K03A),
    );
    expect(mcq).toHaveLength(3);
    for (const r of mcq) {
      const parts = parseHighExternalId(r.externalId)!;
      const p = registry.generate(K03A, SEED, parts.variant);
      expect(
        p.distractors,
        "픽스처가 오답을 내야 이 시험이 뜻이 있다",
      ).toHaveLength(4);
      const choices = parseProblemContent(r.content).choices.map((c) =>
        c.trim(),
      );
      expect(choices).toHaveLength(5);
      expect([...choices].sort()).toEqual(
        [p.answer, ...p.distractors!].map((s) => s.trim()).sort(),
      );
      expect(r.answer).toMatch(/^[①②③④⑤]$/);
      const picked = "①②③④⑤".indexOf(r.answer);
      expect(choices[picked]).toBe(p.answer);
    }
  });

  it("🔴 적재기가 지은 문항류 표지를 출처 판정이 엔진으로 읽는다 — `[?]` 미분류로 떨어지지 않는다", () => {
    // 표지를 짓는 쪽(`loadKey.ts`)과 읽는 쪽(`provenance.ts` 의 접두사 목록)이 다른 파일이다 — 갈리면
    // 실린 고등 문항이 전부 미분류가 되는데 에러가 안 난다. 그래서 적재 행을 그대로 판정기에 넣어 본다.
    for (const r of rows) {
      const input = {
        source: "manual",
        originProblemId: null,
        figureUrls: [],
        figureSvg: null,
        content: r.content,
        answer: r.answer,
        questionType: r.questionType,
        problemType: r.problemType,
        familyKey: r.familyKey,
      };
      expect(classifyOrigin(input), r.externalId).toBe("middle_engine");
      expect(classifyFormat(input), r.externalId).toBe(
        r.questionType === "객관식" ? "multiple_choice" : "short_answer",
      );
    }
  });

  it("`keys` 로 그 차시의 일부 유형만 고른다 — 변형 수를 유형마다 달리 줄 수 있게", () => {
    const only = buildHighRows(
      { ...targetA, keys: [K03A], variants: 2 },
      SEED,
      registry,
    );
    expect(new Set(only.map((r) => r.familyKey))).toEqual(
      new Set([highFamilyKey(K03A)]),
    );
    expect(only).toHaveLength(2 * 2);
  });

  it("모르는 과목 · 차시 · 키, 다른 차시의 키, 빈 등록부는 던진다", () => {
    expect(() =>
      buildHighRows({ ...targetA, unitSection: "없는 차시" }, SEED, registry),
    ).toThrow(/고등 유형을 못 찾았다/);
    expect(() =>
      buildHighRows({ ...targetA, grade: "공통수학9" }, SEED, registry),
    ).toThrow(/고등 유형을 못 찾았다/);
    expect(() =>
      buildHighRows({ ...targetA, keys: [K03, "없는|키|99"] }, SEED, registry),
    ).toThrow(/멈춘다/);
    // 등록은 돼 있지만 **이 차시의 유형이 아니다** — 조용히 빼지 않는다
    expect(() =>
      buildHighRows({ ...targetA, keys: [K04] }, SEED, registry),
    ).toThrow(/멈춘다/);
    expect(() =>
      buildHighRows({ ...targetA, keys: [] }, SEED, registry),
    ).toThrow(/고등 유형을 못 찾았다/);
    expect(() => buildHighRows(targetA, SEED, createHighRegistry([]))).toThrow(
      /고등 유형을 못 찾았다/,
    );
  });

  it("변형 공간이 좁아 못 채우면 던진다 — 중등과 같이 조용히 덜 내지 않는다", () => {
    // 낼 수 있는 문항이 **둘뿐인** 유형으로 다섯 벌을 묻는다. 픽스처 유형은 수천 가지를 내서, 그것으로
    // 5,000벌을 물으면 던지기까지 수십 초가 걸렸다(전체 시험의 부하 속에서 20초 상한을 넘었다 — 2026-10-08).
    const [base] = fixtureHighEntries();
    const narrow = createHighRegistry([
      {
        ...base!,
        handler: (rng) => {
          const n = intBetween(rng, 1, 2) * 10 + 1;
          return {
            ...base!.handler(rng),
            content: `두 상수항의 합이 $${n}$일 때, 그 합을 구하시오.`,
            answer: `$${n}$`,
            solution: `두 상수항의 합은 $${n}$이다.\n따라서 구하는 값은 $${n}$이다.`,
            facts: { n },
          };
        },
      },
    ]);
    expect(() =>
      buildHighRows({ ...targetA, variants: 2 }, SEED, narrow),
    ).not.toThrow();
    expect(() =>
      buildHighRows({ ...targetA, variants: 5 }, SEED, narrow),
    ).toThrow(/변형 공간/);
  });
});

describe("㉡ 분기 함수 — 적재기와 제자리 갱신이 같은 것을 부른다", () => {
  it("고등 target 은 고등 행 생성으로 간다", () => {
    expect(
      buildTargetRows({ ...targetA, variants: 2 }, SEED, { highs: registry }),
    ).toEqual(buildHighRows({ ...targetA, variants: 2 }, SEED, registry));
  });

  it("등록부를 안 주면 살아 있는 등록부로 간다 — 공통수학1 의 실제 차시가 행을 낸다", () => {
    const section = registeredHighTypes()[0]!.unitSection;
    const rows = buildTargetRows(
      { engine: "high", grade: "공통수학1", unitSection: section, variants: 1 },
      SEED,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.externalId.startsWith("engine-high:공통수학1|")).toBe(true);
      expect(r.familyKey.startsWith("high:공통수학1|")).toBe(true);
    }
  });

  it("🔴 모르는 engine · 빠진 engine 은 던진다 — 중등 유형으로 흘려보내지 않는다", () => {
    expect(() =>
      buildTargetRows({ engine: "없는엔진" } as never, SEED),
    ).toThrow(/모르는 적재 대상/);
    expect(() =>
      buildTargetRows({ unitSection: FIXTURE_SECTION_A } as never, SEED),
    ).toThrow(/모르는 적재 대상/);
  });
});

describe("㉢ 미적재 검사 — 고등 등록부를 정확한 키로 센다", () => {
  const all = [
    ...buildHighRows({ ...targetA, variants: 1 }, SEED, registry),
    ...buildHighRows({ ...targetB, variants: 1 }, SEED, registry),
  ];
  const entries = registry.types();

  it("적재기가 낸 열쇠를 검사기가 «나갔다»로 읽는다 — 규칙을 옮겨 적지 않고 그 함수로 묻는다", () => {
    const frags = loadedFragments(all.map((r) => r.externalId));
    expect(unloadedHigh(frags, entries)).toEqual([]);
    expect([...loadedHighKeys(frags)].sort()).toEqual([K03, K03A, K04].sort());
  });

  it("음성 대조 — 빈 적재본이면 고등 유형이 전부 «안 나갔다»이고 «고등» 표지가 붙는다", () => {
    const left = unloadedHigh(loadedFragments([]), entries);
    expect(left.map((e) => e.key).sort()).toEqual([K03, K03A, K04].sort());
    for (const e of left) {
      expect(e.where).toContain("고등");
      expect(e.grade).toBe(FIXTURE_BOOK);
    }
  });

  it("🔴 고등 등록부 누락은 관문이 운다 — 한 유형만 안 실리면 그 유형만 나온다", () => {
    const withoutB = all
      .filter((r) => r.familyKey !== highFamilyKey(K04))
      .map((r) => r.externalId);
    expect(
      unloadedHigh(loadedFragments(withoutB), entries).map((e) => e.key),
    ).toEqual([K04]);
  });

  it("🔴 비슷한 키의 «거짓 적재»를 안 받는다 — 포함으로 대면 «나갔다»가 되는 반례", () => {
    const only = entries.filter((e) => e.key === K03);
    // ⑴ 확장 번호(…|03A)만 실렸다 — `includes` 라면 «…|03» 도 나간 것으로 읽힌다.
    const otherIds = all
      .filter((r) => r.familyKey === highFamilyKey(K03A))
      .map((r) => r.externalId);
    expect(otherIds.length).toBeGreaterThan(0);
    expect(
      otherIds.some((id) => id.includes(K03)),
      "반례가 반례가 아니다 — 포함 관계가 성립해야 이 시험이 뜻이 있다",
    ).toBe(true);
    expect(
      unloadedHigh(loadedFragments(otherIds), only).map((e) => e.key),
    ).toEqual([K03]);
    // ⑵ 유형 키를 품은 **다른 접두사**의 열쇠 · 꼬리가 없는 열쇠 — 고등 적재가 아니다.
    const foreign = [
      `engine-mid:${K03}|s1|v0|단답형`,
      `engine-mid-combo:${K03}|s1|v0|단답형`,
      `engine-mid-judge:${K03}|r1|s1|v0|객관식`,
      `engine-high:${K03}`,
      K03,
    ];
    expect(
      unloadedHigh(loadedFragments(foreign), only).map((e) => e.key),
    ).toEqual([K03]);
  });

  it("고등 열쇠는 RPM 유형 · 결합형 · 판정형을 «나갔다»로 만들지 않는다", () => {
    const types = registeredTypes();
    const combos = middleComboDefinitions();
    const judges = judgementDefinitions();
    const left = unloaded(
      loadedFragments(all.map((r) => r.externalId)),
      types as never,
      combos as never,
      judges,
    );
    expect(left).toHaveLength(types.length + combos.length + judges.length);
  });

  it("자기 점검이 지금 초록이다 — 짓는 함수와 읽는 함수가 짝이고 비슷한 키를 안 받는다", () => {
    expect(highKeyProbe()).toBeNull();
  });

  it("🔴 `unloadedAll` — 스크립트가 부르는 한 함수가 고등 등록부까지 센다(따로 세면 구조적으로 0)", () => {
    // 픽스처: 중등 쪽은 비우고 고등만 — 고등이 빠지면 여기가 0 이 된다
    expect(
      unloadedAll(loadedFragments([]), {
        types: [],
        combos: [],
        judges: [],
        highs: entries,
      }).map((e) => e.key),
    ).toEqual([K03, K03A, K04].sort((a, b) => a.localeCompare(b)));
    // 살아 있는 등록부: 빈 적재본이면 네 등록부의 합이 그대로 나온다(분모)
    const live = unloadedAll(loadedFragments([]));
    expect(live).toHaveLength(
      registeredTypes().length +
        middleComboDefinitions().length +
        judgementDefinitions().length +
        registeredHighTypes().length,
    );
    expect(live.filter((e) => e.where.includes("고등"))).toHaveLength(
      registeredHighTypes().length,
    );
  });
});

describe("㉣ 제자리 갱신 — 적재기와 같은 분기 함수로 되만든다", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "high-refresh-"));
  const plan = (name: string, targets: unknown[]) => {
    const file = path.join(dir, name);
    writeFileSync(
      file,
      JSON.stringify({ label: name, seedBase: SEED, targets }),
    );
    return file;
  };

  it("고등 target 의 행이 되만든 행에 externalId 그대로 들어간다", () => {
    const file = plan("high.json", [
      { ...targetA, variants: 2 },
      { ...targetB, variants: 2 },
    ]);
    const { made, failures, conflicts } = rebuild([file], { highs: registry });
    expect(failures).toEqual([]);
    expect(conflicts).toEqual([]);
    const want = [
      ...buildHighRows({ ...targetA, variants: 2 }, SEED, registry),
      ...buildHighRows({ ...targetB, variants: 2 }, SEED, registry),
    ];
    expect([...made.keys()].sort()).toEqual(
      want.map((r) => r.externalId).sort(),
    );
    for (const r of want) {
      expect(made.get(r.externalId)!.content).toBe(r.content);
      expect(made.get(r.externalId)!.answer).toBe(r.answer);
    }
  });

  it("🔴 모르는 target 은 «던진 대상»으로 센다 — 고등 · 중등 유형으로 잘못 되만들지 않는다", () => {
    const file = plan("unknown.json", [{ engine: "없는엔진", keys: [] }]);
    const { made, failures } = rebuild([file], { highs: registry });
    expect(made.size).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/모르는 적재 대상/);
  });

  it("등록부에 없는 차시를 적은 고등 target 도 «던진 대상»이다 — 숫자 뒤에 숨기지 않는다", () => {
    const file = plan("gone.json", [{ ...targetA, unitSection: "없는 차시" }]);
    const { made, failures } = rebuild([file], { highs: registry });
    expect(made.size).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/고등 유형을 못 찾았다/);
  });
});

describe("적재기 곁가지 — 되돌리기의 «우리 행» · 단원 연결의 겹침", () => {
  it("되돌리기는 행 생성 함수 다섯의 접두사를 전부 «우리 것»으로 읽는다 — 고등 원장에서 멈추지 않는다", () => {
    const high = buildHighRows({ ...targetA, variants: 1 }, SEED, registry);
    for (const r of high) expect(isOwnExternalId(r.externalId)).toBe(true);
    for (const id of [
      "engine-elem:초3|가|나|f1|단답형|s1",
      "engine-mid:1-1|x|01|s1|v0|단답형",
      "engine-mid-combo:중2|가::중2|나|s1|v0|단답형",
      "engine-mid-judge:중1|가|calc-add2|r1|s1|v0|객관식",
    ])
      expect(isOwnExternalId(id), id).toBe(true);
    for (const id of [
      "textbook:abc",
      "rpm-2022:1-1|x|01",
      "engine-highx:가|나|03|s1|v0|단답형",
      "x-engine-high:가|나|03|s1|v0|단답형",
      "",
    ])
      expect(isOwnExternalId(id), id).toBe(false);
  });

  it("🔴 차시 이름이 단원 둘에 걸리면 짚는다 — 표가 뒤엣것으로 덮여 다른 대단원에 붙는 자리", () => {
    const rows = buildHighRows({ ...targetA, variants: 1 }, SEED, registry);
    const one = [
      { grade: FIXTURE_BOOK, section: FIXTURE_SECTION_A },
      { grade: FIXTURE_BOOK, section: FIXTURE_SECTION_B },
      // 다른 과목의 같은 이름은 겹침이 아니다
      { grade: "공통수학2", section: FIXTURE_SECTION_A },
    ];
    expect(ambiguousUnitKeys(rows, one)).toEqual([]);
    const two = [...one, { grade: FIXTURE_BOOK, section: FIXTURE_SECTION_A }];
    expect(ambiguousUnitKeys(rows, two)).toEqual([
      `${FIXTURE_BOOK}|${FIXTURE_SECTION_A}`,
    ]);
    // 대단원까지 적는 행(초등)은 `과목|대단원|차시` 로 찾으므로 이 물음의 대상이 아니다
    expect(
      ambiguousUnitKeys(
        [{ grade: FIXTURE_BOOK, section: FIXTURE_SECTION_A, chapter: "1" }],
        two,
      ),
    ).toEqual([]);
  });

  it("단원 시드에서 공통수학1 의 차시 이름은 과목 안에서 겹치지 않는다 — 실제 적재가 걸리지 않는다", () => {
    const live = registeredHighTypes().map((e) => ({
      grade: e.grade,
      section: e.unitSection,
    }));
    expect(ambiguousUnitKeys(live, CURRICULUM_UNITS)).toEqual([]);
  });
});

describe("표 — 드라이런이 찍는 차시별 · 난이도별 · 형식별", () => {
  it("행을 차시 · 난이도 · 형식으로 세고 합이 전체와 같다", () => {
    const rows = [
      ...buildHighRows({ ...targetA, variants: 4 }, SEED, registry),
      ...buildHighRows({ ...targetB, variants: 4 }, SEED, registry),
    ];
    const table = rowTable(rows);
    expect(table.total).toBe(rows.length);
    expect(table.bySection.map((s) => s.section)).toEqual([
      `${FIXTURE_BOOK} / ${FIXTURE_SECTION_A}`,
      `${FIXTURE_BOOK} / ${FIXTURE_SECTION_B}`,
    ]);
    expect(table.bySection[0]!.families).toBe(2);
    expect(table.bySection[1]!.families).toBe(1);
    const sum = (m: Record<string, number>) =>
      Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(table.byDifficulty)).toBe(rows.length);
    expect(sum(table.byFormat)).toBe(rows.length);
    expect(table.byFormat).toEqual({ 단답형: 12, 객관식: 12 });
    for (const s of table.bySection) {
      expect(sum(s.byDifficulty)).toBe(s.rows);
      expect(sum(s.byFormat)).toBe(s.rows);
    }
    expect(table.bySection.reduce((a, s) => a + s.rows, 0)).toBe(rows.length);
  });
});

describe("㉤ 적재 계획 — 공통수학1 전부", () => {
  const PLAN = "scripts/import/plans/2026-10-08-공통수학1-전량.json";
  const plan = JSON.parse(readFileSync(PLAN, "utf8")) as {
    label: string;
    seedBase: number;
    targets: Target[];
  };
  const rows = plan.targets.flatMap((t) => buildTargetRows(t, plan.seedBase));
  const live = defaultHighRegistry()
    .types()
    .filter((e) => e.grade === "공통수학1");

  it("target 은 전부 고등 · 공통수학1 이고, 차시 이름이 단원 시드에 글자 그대로 하나씩 있다", () => {
    expect(plan.targets.length).toBeGreaterThan(0);
    for (const t of plan.targets) {
      expect(t.engine).toBe("high");
      if (t.engine !== "high") continue;
      expect(t.grade).toBe("공통수학1");
      expect(
        CURRICULUM_UNITS.filter(
          (u) => u.grade === t.grade && u.section === t.unitSection,
        ),
        `${t.grade} / ${t.unitSection}`,
      ).toHaveLength(1);
    }
  });

  it("🔴 살아 있는 등록부를 빠짐없이 덮는다 — 계획대로 실으면 미적재 검사의 고등 몫이 0 이다", () => {
    expect(live).toHaveLength(168);
    const frags = loadedFragments(rows.map((r) => r.externalId));
    expect(unloadedHigh(frags, live)).toEqual([]);
    expect(new Set(rows.map((r) => r.familyKey)).size).toBe(live.length);
  });

  it("한 유형이 두 target 에 겹쳐 실리지 않는다 — 같은 열쇠가 두 번 나오면 어느 쪽이 적재본인지 모른다", () => {
    const ids = rows.map((r) => r.externalId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("유형마다 단답 · 객관이 같은 수로 나온다 — 객관식을 못 만든 변형이 없다", () => {
    const per = new Map<string, { 단답형: number; 객관식: number }>();
    for (const r of rows) {
      const cur = per.get(r.familyKey) ?? { 단답형: 0, 객관식: 0 };
      cur[r.questionType as "단답형" | "객관식"] += 1;
      per.set(r.familyKey, cur);
    }
    for (const [k, n] of per) {
      expect(n.단답형, k).toBeGreaterThan(0);
      expect(n.객관식, k).toBe(n.단답형);
    }
  });
});
