import { describe, expect, it } from "vitest";
import { fairOntologyBudget, ontologySeedFrontier, rankOntologySeeds } from "@/lib/math-ontology/retrieval/budget";
describe("bounded retrieval allocation", () => {
  it("keeps a long exact phrase ahead of lexical/namespace broad collisions without collapsing distinct identities", () => {
    const wanted = { entity: "z-target", label: "색칠한 두 부분의 넓이", namespace: "course-section" };
    const rows = [...Array.from({ length: 12 }, (_, i) => ({ entity: `a-${i}`, label: "넓이", namespace: "bank-definition" })), wanted, { ...wanted, entity: "z-other-edition" }];
    const selected = rankOntologySeeds(rows, ["넓이", wanted.label], ["bank-definition", "course-section"], 8);
    expect(selected.slice(0, 2).map(row => row.entity).sort()).toEqual(["z-other-edition", "z-target"]);
    expect(selected).toHaveLength(8);
    expect(rankOntologySeeds([...rows].reverse(), [wanted.label, "넓이"], ["bank-definition", "course-section"], 8)).toEqual(selected);
  });
  it("preserves a target seed and question witness when more than eight incoming questions compete", () => {
    const incoming = new Map([["target", Array.from({ length: 20 }, (_, i) => `question-${i}`)], ["other", ["other-question"]]]);
    const frontier = ontologySeedFrontier(["target", "other"], incoming, 8);
    expect(frontier.slice(0, 4)).toEqual(["target", "question-0", "other", "other-question"]);
    expect(frontier).toHaveLength(8); expect(new Set(frontier).size).toBe(8);
  });
  it("retains the checked question-definition bridge and each producer within thirty facts", () => {
    const groups = Array.from({ length: 8 }, (_, producer) => Array.from({ length: 12 }, (_, fact) => `${producer}:${fact}`));
    const bridge = "7:11", selected = fairOntologyBudget(groups, 30, [bridge]);
    expect(selected[0]).toBe(bridge); expect(selected).toHaveLength(30);
    for (let producer = 0; producer < 8; producer++) expect(selected).toContain(`${producer}:0`);
    expect(new Set(selected).size).toBe(30);
    expect(fairOntologyBudget([["A", "A"], ["B", "C"]], 3)).toEqual(["A", "B", "C"]);
  });
});
