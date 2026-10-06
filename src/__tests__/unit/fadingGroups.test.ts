import { beforeAll, describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { fadingConceptIdSchema } from "@/contracts/fading.contract";
import {
  FADING_MAX_PROPOSITIONS,
  buildFadingConcepts,
  fadingTargets,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { FADING_GROUP_PARTS, FADING_GROUPS } from "@/lib/fading/groups";

/**
 * 묶음 표와 은행의 짝 — 🔴 표의 열쇠는 학생 기록의 열쇠다.
 * 이 시험이 울면: 은행의 뜻 문장을 더했거나 뺐다. `npx tsx scripts/qa/fading-grouping/sync.ts` 로 무엇이 어긋났는지 보고,
 * `--write` 로 표를 맞춘다. «열쇠가 사라진다»가 나오면 그 개념을 배운 학생의 기록이 갈 곳을 잃는다 — 묶음을 지우지 말고 문장을 옮겨 살린다.
 */
describe("묶음 표 — 은행 전체", () => {
  // 은행은 이 묶음에서만 싣는다 — 이 묶음을 건너뛰는 실행(변이 실험의 첫 바퀴)이 9,119문장을 읽지 않게.
  let entries: readonly ConceptEntry[];
  let byId: Map<string, ConceptEntry>;
  let concepts: FadingConcept[];
  beforeAll(async () => {
    const { CONCEPT_BLANK_BANK } = await import("@/lib/concept-blank/bank");
    entries = CONCEPT_BLANK_BANK.concepts;
    byId = new Map(entries.map((e) => [e.id, e]));
    concepts = buildFadingConcepts(entries, FADING_GROUPS);
  });

  it("학년 파일의 열쇠가 서로 겹치지 않고, 열쇠의 꼴이 저장 계약에 맞는다", () => {
    const total = Object.values(FADING_GROUP_PARTS).reduce(
      (sum, part) => sum + Object.keys(part).length,
      0,
    );
    expect(Object.keys(FADING_GROUPS).length).toBe(total);
    expect(total).toBeGreaterThan(1500);
    const odd = Object.keys(FADING_GROUPS).filter(
      (id) => !fadingConceptIdSchema.safeParse(id).success,
    );
    expect(odd).toEqual([]);
  });

  it("은행의 뜻 문장은 빠짐없이, 한 번씩만 묶여 있다 — 표가 가리키는 문장은 전부 은행에 있다", () => {
    const seen = new Map<string, string>();
    const twice: string[] = [];
    const gone: string[] = [];
    for (const [id, members] of Object.entries(FADING_GROUPS))
      for (const member of members) {
        if (seen.has(member)) twice.push(member);
        if (!byId.has(member)) gone.push(`${member} (묶음 ${id})`);
        seen.set(member, id);
      }
    const unbound = entries.filter((e) => !seen.has(e.id)).map((e) => e.id);
    expect({ unbound, twice, gone }).toEqual({
      unbound: [],
      twice: [],
      gone: [],
    });
  });

  it("묶음마다 문장은 하나 이상 다섯 이하이고, 한 소단원 · 한 난이도다", () => {
    const odd: string[] = [];
    for (const [id, members] of Object.entries(FADING_GROUPS)) {
      const cells = new Set(
        members.map((m) => {
          const entry = byId.get(m);
          return entry ? `${entry.section}||${entry.level}` : "?";
        }),
      );
      if (
        members.length < 1 ||
        members.length > FADING_MAX_PROPOSITIONS ||
        cells.size !== 1
      )
        odd.push(id);
    }
    expect(odd).toEqual([]);
  });

  it("표대로 지은 개념은 표의 묶음 수와 같고, 개념마다 표적이 하나는 있으며 표적의 열쇠가 겹치지 않는다", () => {
    expect(concepts.length).toBe(Object.keys(FADING_GROUPS).length);
    const ids = new Set<string>();
    for (const concept of concepts) {
      const targets = fadingTargets(concept);
      expect(targets.length).toBeGreaterThanOrEqual(1);
      for (const target of targets) {
        expect(ids.has(target.id)).toBe(false);
        ids.add(target.id);
      }
    }
  });

  it("한 소단원 · 난이도의 개념은 몇째 · 모두 몇이 맞는다", () => {
    const cells = new Map<string, FadingConcept[]>();
    for (const concept of concepts) {
      const key = `${concept.section}||${concept.level}`;
      cells.set(key, [...(cells.get(key) ?? []), concept]);
    }
    for (const cell of cells.values())
      cell.forEach((concept, i) => {
        expect(concept.ordinal).toBe(i + 1);
        expect(concept.siblings).toBe(cell.length);
      });
  });
});
