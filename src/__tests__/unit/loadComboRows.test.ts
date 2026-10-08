/**
 * 🔴 **결합형이 지면에 나가는 길** — 적재기가 `generateMiddleComboProblem` 을
 * 부르는 유일한 자리를 지킨다 (D-109/D-110, 2026-09-01).
 *
 * ## 왜 이 시험이 있나
 *
 * 원장님이 승인하신 결합형 여섯이 **엔진에만 살고 지면에 한 건도 안 나가고**
 * 있었다 — 부르는 곳이 **시험뿐**이었다. `checkUnloadedTypes` 가 「결합형은
 * `registeredTypes()` 밖이라 안 세면 구조적으로 0이다」라고 적어 두고 6자리를
 * 빚으로 들고 있었고, 그 빚이 2026-09-01 에야 갚였다.
 *
 * ## 🔴 지키는 것 — «넣었는데 빚이 안 줄어드는» 자리
 *
 * `checkUnloadedTypes` 는 「나갔나」를 **`externalId.includes(comboId)`** 로 묻는다.
 * 적재기가 `externalId` 를 다른 모양으로 적으면 **넣고도 빚이 안 줄어드는데
 * 에러도 경고도 안 난다** — 이 저장소가 여러 번 데인 「결함이 스스로 신고하지
 * 않는다」 그 자리다.
 *
 * 그래서 여기서는 규칙을 **옮겨 적지 않고** 검사기의 `unloaded()` 를 **그대로
 * 불러** 대조한다. 한쪽만 고치면 빨개진다.
 */
import { describe, expect, it } from "vitest";

import { buildComboRows } from "../../../scripts/import/load-engine-problems";
import {
  loadedFragments,
  unloaded,
} from "../../../scripts/qa/checkUnloadedTypes";
import { middleComboDefinitions } from "@/lib/middle/combo";

const SEED = 20260827;

describe("[결합형 적재] 엔진에만 살던 여섯이 지면으로 나간다", () => {
  const defs = middleComboDefinitions();
  const rows = buildComboRows({ engine: "combo", variants: 3 }, SEED);

  it("등록된 결합형 전부가 행을 낸다 — 분모부터 센다", () => {
    // 분모가 0이면 아래 검사가 전부 «공허하게 참»이 된다.
    expect(defs.length, "결합형 등록이 비었다").toBeGreaterThan(0);
    const ids = new Set(rows.map((r) => r.familyKey));
    expect(ids.size, "행을 못 낸 결합형이 있다").toBe(defs.length);
    for (const d of defs)
      expect(ids.has(`mid:${d.id}`), `${d.id} 가 행을 안 냈다`).toBe(true);
  });

  it("🔴 `externalId` 가 **검사기가 찾는 모양**이다 — 규칙을 옮겨 적지 않고 그 함수로 묻는다", () => {
    const frags = loadedFragments(rows.map((r) => r.externalId));
    // 유형 목록은 비운다 — 이 시험이 묻는 것은 **결합형** 쪽뿐이다.
    const left = unloaded(frags, [], defs as never, []);
    expect(
      left.map((e) => e.key),
      "적재기가 넣었는데 검사기는 «안 나갔다»고 한다 — externalId 모양이 갈렸다",
    ).toEqual([]);
  });

  it("음성 대조 — 빈 적재본이면 여섯이 **전부** «안 나갔다» 로 잡힌다", () => {
    // 이것이 없으면 위 검사가 「늘 통과」인지 알 수 없다.
    const left = unloaded(loadedFragments([]), [], defs as never, []);
    expect(left.map((e) => e.key).sort()).toEqual(defs.map((d) => d.id).sort());
  });

  it("행의 알맹이 — 갈래·형식·단원이 채워진다", () => {
    for (const r of rows) {
      expect(r.content.length, r.externalId).toBeGreaterThan(0);
      expect(r.answer.length, r.externalId).toBeGreaterThan(0);
      expect(r.solution.length, r.externalId).toBeGreaterThan(0);
      expect(r.difficulty, r.externalId).toBeTruthy();
      expect(r.grade, r.externalId).toMatch(/^중[123]$/);
      expect(r.section.length, r.externalId).toBeGreaterThan(0);
      expect(["객관식", "단답형", "서술형"], r.externalId).toContain(
        r.questionType,
      );
    }
  });

  it("모르는 id 는 **던진다** — 조용히 빈 배열을 내지 않는다", () => {
    expect(() =>
      buildComboRows({ engine: "combo", ids: ["없는::결합형"] }, SEED),
    ).toThrow(/결합형을 못 찾았다/);
    // 일부만 맞아도 던진다 — 「여섯을 물었는데 다섯만 넣었다」가 조용하면 안 된다.
    expect(() =>
      buildComboRows(
        { engine: "combo", ids: [defs[0]!.id, "없는::결합형"] },
        SEED,
      ),
    ).toThrow(/멈춘다/);
  });
});
