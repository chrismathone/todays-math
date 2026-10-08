/**
 * 🔴 **판정형이 지면에 나가는 길** — 적재기 target · 미적재 검사 · 제자리 갱신 (2026-10-08 엔진 보강 0단계).
 *
 * 결합형이 엔진에만 살고 지면에 한 건도 안 나간 적이 있다 — 부르는 곳이 **시험뿐**이었고, 미적재 검사는
 * 그것을 «구조적으로 0»으로 셌다(`loadComboRows.test.ts` 머리말). 판정형은 처음부터 세 자리에 묶는다.
 *
 * ```
 * ㉠ 적재기 — `engine: "judge"` 가 행을 내고, 열쇠가 계약 그대로다
 * ㉡ 모르는 target — 조용히 중등 유형으로 흘러가지 않고 던진다(지금까지는 «elem · combo 가 아니면 middle»)
 * ㉢ 미적재 검사 — 판정형 등록부를 **정확한 키**로 센다. 비슷한 키의 «거짓 적재»를 안 받는다
 * ㉣ 제자리 갱신 — 적재기와 **같은 분기 함수**로 행을 되만든다
 * ```
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildJudgeRows,
  buildTargetRows,
} from "../../../scripts/import/load-engine-problems";
import {
  loadedFragments,
  loadedJudgeKeys,
  unloaded,
  type JudgeRow,
} from "../../../scripts/qa/checkUnloadedTypes";
import { rebuild } from "../../../scripts/qa/refresh-engine-content";
import { middleComboDefinitions } from "@/lib/middle/combo";
import { registeredTypes } from "@/lib/middle/generate";
import {
  judgeExternalId,
  parseJudgeExternalId,
} from "@/lib/middle/judge/contract";
import { createJudgeRegistry } from "@/lib/middle/judge/registry";

import { fixtureDefinition } from "../helpers/judgeFixture";

const SEED = 20261008;
const registry = createJudgeRegistry([
  fixtureDefinition(),
  fixtureDefinition({ familyId: "fixture-add-two", ruleVersion: 2 }),
]);
const entries: JudgeRow[] = registry.definitions().map((d) => ({
  key: d.key,
  grade: d.grade,
  unitSection: d.unitSection,
}));

describe('㉠ 적재기 — `engine: "judge"`', () => {
  const rows = buildJudgeRows({ engine: "judge", variants: 3 }, SEED, registry);

  it("등록된 판정형 전부가 변형 수만큼 객관식 행을 낸다 — 분모부터", () => {
    expect(entries.length).toBe(2);
    expect(rows).toHaveLength(2 * 3);
    for (const r of rows) {
      expect(r.questionType).toBe("객관식");
      expect(r.answer).toMatch(/^[①②③④⑤]$/);
      expect(r.figureSpec).toBeNull();
      expect(r.grade).toBe("중1");
      expect(r.section).toBe("유리수의 덧셈과 뺄셈");
      expect(r.difficulty).toBe("기본");
    }
  });

  it("열쇠가 계약 그대로다 — externalId 를 되읽으면 판정키 · 규칙판 · 씨앗 · 변형이 나온다", () => {
    for (const r of rows) {
      const parts = parseJudgeExternalId(r.externalId);
      expect(parts, r.externalId).not.toBeNull();
      const def = registry
        .definitions()
        .find((d) => d.key === parts!.judgeKey)!;
      expect(r.familyKey).toBe(`mid:judge:${def.key}`);
      expect(parts!.ruleVersion).toBe(def.ruleVersion);
      expect(parts!.seed).toBe(SEED);
      expect(parts!.questionType).toBe("객관식");
      expect(r.externalId).toBe(judgeExternalId(parts!));
      expect(r.variantKey).toBe(
        `mid-judge:${def.key}|r${def.ruleVersion}|s${SEED}|v${parts!.variant}`,
      );
    }
  });

  it("행의 본문 · 정답 · 해설이 등록부가 낸 그대로다", () => {
    for (const r of rows) {
      const parts = parseJudgeExternalId(r.externalId)!;
      const p = registry.generate(parts.judgeKey, SEED, parts.variant);
      expect(r.content).toBe(p.content);
      expect(r.answer).toBe(p.answer);
      expect(r.solution).toBe(p.solution);
    }
  });

  it("모르는 키 · 일부만 맞는 키 · 빈 등록부는 던진다", () => {
    expect(() =>
      buildJudgeRows({ engine: "judge", keys: ["없는|키|x"] }, SEED, registry),
    ).toThrow(/판정형을 못 찾았다/);
    expect(() =>
      buildJudgeRows(
        { engine: "judge", keys: [entries[0]!.key, "없는|키|x"] },
        SEED,
        registry,
      ),
    ).toThrow(/멈춘다/);
    expect(() =>
      buildJudgeRows({ engine: "judge" }, SEED, createJudgeRegistry([])),
    ).toThrow(/판정형을 못 찾았다/);
  });
});

describe("㉡ 분기 함수 — 적재기와 제자리 갱신이 같은 것을 부른다", () => {
  it("판정형 target 은 판정형 행 생성으로 간다", () => {
    expect(
      buildTargetRows({ engine: "judge", variants: 2 }, SEED, {
        judges: registry,
      }),
    ).toEqual(buildJudgeRows({ engine: "judge", variants: 2 }, SEED, registry));
  });

  it("🔴 모르는 engine · 빠진 engine 은 던진다 — 중등 유형으로 흘려보내지 않는다", () => {
    expect(() => buildTargetRows({ engine: "high" } as never, SEED)).toThrow(
      /모르는 적재 대상/,
    );
    expect(() =>
      buildTargetRows({ unitSection: "유리수의 덧셈과 뺄셈" } as never, SEED),
    ).toThrow(/모르는 적재 대상/);
  });
});

describe("㉢ 미적재 검사 — 판정형 등록부를 정확한 키로 센다", () => {
  const rows = buildJudgeRows({ engine: "judge", variants: 1 }, SEED, registry);

  it("적재기가 낸 열쇠를 검사기가 «나갔다»로 읽는다 — 규칙을 옮겨 적지 않고 그 함수로 묻는다", () => {
    const frags = loadedFragments(rows.map((r) => r.externalId));
    expect(unloaded(frags, [], [], entries)).toEqual([]);
  });

  it("음성 대조 — 빈 적재본이면 판정형이 전부 «안 나갔다»이고 «판정형» 표지가 붙는다", () => {
    const left = unloaded(loadedFragments([]), [], [], entries);
    expect(left.map((e) => e.key).sort()).toEqual(
      entries.map((e) => e.key).sort(),
    );
    for (const e of left) expect(e.where).toContain("판정형");
  });

  it("🔴 비슷한 키의 «거짓 적재»를 안 받는다 — 포함으로 대면 «나갔다»가 되는 반례", () => {
    const only = [entries[0]!]; // …|fixture-add
    // ⑴ 다른 문항류(…|fixture-add-two)만 실렸다 — `includes` 라면 «…|fixture-add» 도 나간 것으로 읽힌다.
    const otherIds = rows
      .filter((r) => r.familyKey.endsWith("fixture-add-two"))
      .map((r) => r.externalId);
    expect(otherIds.length).toBeGreaterThan(0);
    expect(
      otherIds.some((id) => id.includes(only[0]!.key)),
      "반례가 반례가 아니다 — 포함 관계가 성립해야 이 시험이 뜻이 있다",
    ).toBe(true);
    expect(
      unloaded(loadedFragments(otherIds), [], [], only).map((e) => e.key),
    ).toEqual([only[0]!.key]);
    // ⑵ 판정키를 품은 **다른 접두사**의 열쇠 — 판정형 적재가 아니다.
    const foreign = [
      `engine-mid:${only[0]!.key}|s1|v0|객관식`,
      `engine-mid-combo:${only[0]!.key}|s1|v0|객관식`,
      `${only[0]!.key}`,
    ];
    expect(
      unloaded(loadedFragments(foreign), [], [], only).map((e) => e.key),
    ).toEqual([only[0]!.key]);
  });

  it("판정형 열쇠는 RPM 유형 · 결합형을 «나갔다»로 만들지 않는다", () => {
    const types = registeredTypes();
    const combos = middleComboDefinitions();
    const left = unloaded(
      loadedFragments(rows.map((r) => r.externalId)),
      types as never,
      combos as never,
      [],
    );
    expect(left).toHaveLength(types.length + combos.length);
  });

  it("loadedJudgeKeys — 판정형 열쇠만 정확히 뽑는다", () => {
    const keys = loadedJudgeKeys(
      loadedFragments([
        ...rows.map((r) => r.externalId),
        "engine-mid:1-1|x|01|s1|v0|단답형",
      ]),
    );
    expect([...keys].sort()).toEqual(entries.map((e) => e.key).sort());
  });
});

describe("㉣ 제자리 갱신 — 적재기와 같은 분기 함수로 되만든다", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "judge-refresh-"));
  const plan = (name: string, targets: unknown[]) => {
    const file = path.join(dir, name);
    writeFileSync(
      file,
      JSON.stringify({ label: name, seedBase: SEED, targets }),
    );
    return file;
  };

  it("판정형 target 의 행이 되만든 행에 externalId 그대로 들어간다", () => {
    const file = plan("judge.json", [{ engine: "judge", variants: 2 }]);
    const { made, failures, conflicts } = rebuild([file], { judges: registry });
    expect(failures).toEqual([]);
    expect(conflicts).toEqual([]);
    const want = buildJudgeRows(
      { engine: "judge", variants: 2 },
      SEED,
      registry,
    );
    expect([...made.keys()].sort()).toEqual(
      want.map((r) => r.externalId).sort(),
    );
  });

  it("🔴 모르는 target 은 «던진 대상»으로 센다 — 중등 유형으로 잘못 되만들지 않는다", () => {
    const file = plan("unknown.json", [{ engine: "high", keys: [] }]);
    const { made, failures } = rebuild([file], { judges: registry });
    expect(made.size).toBe(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/모르는 적재 대상/);
  });
});
