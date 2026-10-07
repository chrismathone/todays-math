import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { fadingCatalog } from "@/lib/fading/catalog";
import { listConceptCatalog } from "@/lib/textbook/concepts";
import { conceptScriptFor } from "@/lib/textbook/conceptScripts";
import changes from "../../../docs/planning/tracks/reports/concept-cloze-fix-all-20261006/applied-changes.json";
import finalChanges from "../../../docs/planning/tracks/reports/concept-student-clear-20261006/applied-definition-changes.json";

type Revision = { id: string; before: string; after: string };
const originalRevisions = changes.changes as Revision[];
const finalRevisions = finalChanges.changes as Revision[];
const revised = [...new Map([...originalRevisions, ...finalRevisions]
  .map((row) => [row.id, row])).values()];
const entries = new Map(
  CONCEPT_BLANK_BANK.concepts.map((entry) => [entry.id, entry]),
);
const propositions = new Map(
  fadingCatalog().flatMap((concept) =>
    concept.propositions.map(
      (proposition) => [proposition.id, proposition] as const,
    ),
  ),
);
const plain = (text: string) =>
  splitBlankSentence(text)
    .map((p) => p.text)
    .join("");

describe("reviewed concept wording is shared by worksheets, recall and new textbooks", () => {
  it("preserves the earlier review and joins later revisions at the exact previous wording", () => {
    expect(finalRevisions).toHaveLength(607);
    const prior = new Map(originalRevisions.map((row) => [row.id, row]));
    for (const row of finalRevisions) {
      if (prior.has(row.id)) expect(row.before, row.id).toBe(prior.get(row.id)!.after);
    }
  });
  it("has applied revisions in every supported grade", () => {
    expect(revised.length).toBeGreaterThan(0);
    expect(
      [...new Set(revised.map((row) => row.id.split("-")[0]))].sort(),
    ).toEqual(["e3", "e4", "e5", "e6", "m1", "m2", "m3"]);
  });
  it("serves every revised definition in the textbook catalog and recall propositions", () => {
    // Read each affected section once through the real paginated catalog. Querying
    // the whole bank separately for every ID repeats the same search hundreds of times.
    const sections = new Map<
      string,
      ReturnType<typeof listConceptCatalog>["entries"]
    >();
    for (const revision of revised) {
      const entry = entries.get(revision.id)!;
      expect(entry.definition, revision.id).toBe(revision.after);
      if (!sections.has(entry.section)) {
        const sectionEntries: ReturnType<typeof listConceptCatalog>["entries"] =
          [];
        let cursor: string | undefined;
        do {
          const result = listConceptCatalog({
            blankSectionKey: entry.section,
            cursor,
            limit: 200,
          });
          sectionEntries.push(...result.entries);
          cursor = result.nextCursor ?? undefined;
        } while (cursor !== undefined);
        sections.set(entry.section, sectionEntries);
      }
      const catalogEntry = sections
        .get(entry.section)!
        .find(
          (row) =>
            row.entryKind === "concept" && row.payload.id === revision.id,
        );
      expect(catalogEntry?.entryKind, revision.id).toBe("concept");
      if (catalogEntry?.entryKind !== "concept") throw new Error(revision.id);
      expect(catalogEntry.payload.definition, revision.id).toBe(revision.after);
      const proposition = propositions.get(revision.id);
      expect(proposition, revision.id).toBeDefined();
      const complete = proposition!.pieces
        .map((piece) =>
          piece.kind === "target" ? piece.target.text : piece.text,
        )
        .join("");
      expect(complete, revision.id).toBe(plain(revision.after));
    }
  });
  it("updates every affected base-bank teaching explanation while plus entries stay catalog sources", () => {
    for (const revision of revised.filter((row) => /-c\d+$/.test(row.id))) {
      const entry = entries.get(revision.id)!;
      const explanation = conceptScriptFor(entry.section)!.dialogue.find(
        (turn) =>
          turn.role === "teacher" &&
          turn.purpose === "explanation" &&
          turn.source.kind === "bank-concept" &&
          turn.source.entryId === revision.id,
      );
      expect(explanation, revision.id).toBeDefined();
      const body = splitBlankSentence(revision.after)
        .map((piece) =>
          piece.kind === "key" ? `**${piece.text}**` : piece.text,
        )
        .join("");
      expect(explanation!.markdown, revision.id).toBe(
        `**${entry.term}**\n\n${body}`,
      );
    }
  });
});
