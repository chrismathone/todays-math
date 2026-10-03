// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { definitionRepairCards } from "@/lib/math-explorers/definition-cards";
import {
  emptySrsState,
  startSrsMission,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { generateProblem } from "@/lib/math-srs/generator";
import {
  readSrsState,
  type SrsStateRow,
  type SrsStateTable,
} from "@/lib/math-srs/serverStore";
import {
  freezeTextbookConcept,
  resolveReviewedConcept,
} from "@/lib/textbook/concepts";
import {
  startTextbookReview,
  textbookReviewAccess,
  textbookReviewTarget,
  transitionTextbookReview,
} from "@/lib/textbook/studentReview";

const studentId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-10-03T00:00:00.000Z");
const cardId = "factorization";
function prepared(): StoredSrsState {
  const state = emptySrsState();
  const explorer = createExplorerState(studentId);
  const cards = definitionRepairCards(explorer.profile, cardId);
  explorer.profile.definitions = {
    runs: 0,
    history: [],
    cards: Object.fromEntries(
      cards.map((card) => [
        card.id,
        {
          level: 1,
          due: "2026-10-03",
          lastDate: "2026-09-30",
          attemptedAt: "2026-09-30",
          missed: 0,
        },
      ]),
    ),
  };
  state.explorers = explorer;
  return state;
}
const context = (requestId = randomUUID()) => ({
  studentId,
  cardId,
  requestId,
  now,
});
function concept() {
  const entry = CONCEPT_BLANK_BANK.concepts[0]!;
  const review = {
    status: "candidate" as const,
    candidateRule: "manual" as const,
    reviewedBy: null,
    reviewedAt: null,
    targetHash: null,
  };
  return freezeTextbookConcept(
    resolveReviewedConcept(
      {
        conceptKey: "review",
        unitKey: "unit",
        sectionKey: null,
        title: "복습 연결",
        kind: "방법",
        unitId: null,
        body: {
          goal: "설명",
          prerequisites: [],
          definition: entry.definition,
          conditions: null,
          examples: [],
          counterexamples: [],
          misconceptions: [],
          explainPrompt: null,
        },
        blankItems: [
          {
            blankSectionKey: entry.section,
            entryKind: "concept",
            entryId: entry.id,
            review,
          },
        ],
        links: [
          {
            linkId: "review",
            target: { namespace: "explorer-card", cardId },
            relation: "related",
            review,
          },
        ],
        mappingVersion: "1",
        derivedFromConceptKey: null,
        frozen: null,
      },
      {
        reviewerId: studentId,
        now: now.toISOString(),
        confirmBlankEntryIds: [entry.id],
        confirmLinkIds: ["review"],
      },
    ),
  );
}

describe("textbook review reuses existing learning without replacing it", () => {
  it("requires existing records and leaves missing or partially seen profiles unchanged", () => {
    const empty = emptySrsState();
    expect(transitionTextbookReview(empty, context()).state).toBe(empty);
    const partial = prepared();
    delete partial.explorers!.profile.definitions!.cards[
      definitionRepairCards(partial.explorers!.profile, cardId)[0]!.id
    ];
    const result = transitionTextbookReview(partial, context());
    expect(result.response.status).toBe("unavailable");
    expect(result.state).toBe(partial);
  });
  it("starts one actual repair and replays without an extra run or write", () => {
    const original = prepared();
    const request = context();
    const first = transitionTextbookReview(original, request);
    expect(first.response.status).toBe("started");
    expect(
      first.state.explorers!.profile.definitions!.session?.cardIds,
    ).toHaveLength(5);
    expect(original.explorers!.profile.definitions!.session).toBeUndefined();
    const replay = transitionTextbookReview(first.state, request);
    expect(replay.state).toBe(first.state);
    expect(replay.response).toMatchObject({
      status: "resumed",
      replayed: true,
    });
    expect(replay.state.explorers!.profile.definitions!.runs).toBe(1);
  });
  it("records resume without initializing courseGrade, changing goals, stars or workshop", () => {
    const started = transitionTextbookReview(prepared(), context()).state;
    delete started.explorers!.profile.definitions!.courseGrade;
    started.explorers!.profile.definitions!.goalUnitId = "g9-factorization";
    const before = structuredClone(started.explorers!.profile);
    const next = transitionTextbookReview(started, context());
    expect(next.response.status).toBe("resumed");
    expect(next.state.explorers!.profile).toEqual(before);
  });
  it("defers a legacy bank mission and never starts on replay after it disappears", () => {
    const original = startSrsMission(
      prepared(),
      studentId,
      now,
      71,
      randomUUID,
      generateProblem,
    );
    const request = context();
    const result = transitionTextbookReview(original, request);
    expect(result.response.status).toBe("deferred");
    expect(result.state.missions).toEqual(original.missions);
    expect(result.state.explorers!.profile).toEqual(
      original.explorers!.profile,
    );
    const finished = { ...result.state, missions: [] };
    expect(transitionTextbookReview(finished, request)).toEqual({
      state: finished,
      response: {
        status: "unavailable",
        reasonCode: "already-processed",
        replayed: true,
        href: null,
      },
    });
  });
  it("rejects wrong owners and conflicting request fingerprints", () => {
    expect(() =>
      transitionTextbookReview(prepared(), {
        ...context(),
        studentId: "other",
      }),
    ).toThrow("소유자");
    const request = context();
    const started = transitionTextbookReview(prepared(), request);
    expect(() =>
      transitionTextbookReview(started.state, {
        ...request,
        cardId: "g5-common-denominator",
      }),
    ).toThrow("요청 번호");
  });
  it("keeps unseen targets unavailable even while a different concept session exists", () => {
    const started = transitionTextbookReview(prepared(), context()).state;
    delete started.explorers!.profile.definitions!.cards[cardId];
    const result = transitionTextbookReview(started, context());
    expect(result.response.status).toBe("unavailable");
    expect(result.state).toBe(started);
  });
  it("prioritizes a current bank expedition over an older explorer session and closes mismatched sources", () => {
    const started = transitionTextbookReview(prepared(), context()).state;
    started.expedition = {
      version: 1,
      initializedAt: now.toISOString(),
      legacyDays: [],
      awards: [],
      receipts: [],
      mission: {
        id: randomUUID(),
        kind: "middle",
        route: "bank",
        unitId: "g7-equation",
        title: "일차방정식",
        subtitle: "중1",
        goal: 12,
        date: "2026-10-03",
        answered: 0,
        retryRemaining: 0,
        status: "active",
        sourceSessionId: "bank-session",
        sourceSessionIds: ["bank-session"],
        startedAt: now.toISOString(),
        completedAt: null,
        awardEligible: true,
        references: [],
      },
    };
    const bank = transitionTextbookReview(started, context());
    expect(bank.response.status).toBe("deferred");
    expect(bank.state.expedition).toEqual(started.expedition);
    started.expedition.mission!.kind = "explorers";
    const mismatch = transitionTextbookReview(started, context());
    expect(mismatch.response).toMatchObject({
      status: "unavailable",
      reasonCode: "current-mission-source-mismatch",
    });
    expect(mismatch.state).toBe(started);
  });
  it("reads access without mutation and requires a current reviewed frozen link", () => {
    const state = prepared();
    const frozen = concept();
    const before = structuredClone(state);
    expect(textbookReviewTarget(frozen)).toBe(cardId);
    expect(textbookReviewAccess(state, studentId, frozen, now).available).toBe(
      true,
    );
    expect(state).toEqual(before);
    frozen.links[0]!.review.status = "candidate";
    expect(textbookReviewTarget(frozen)).toBeNull();
  });
  it("uses actual CAS replay when two tabs start the same request", async () => {
    let row: SrsStateRow = { studentId, revision: 1, payload: prepared() };
    let writes = 0;
    const table: SrsStateTable = {
      async findUnique() {
        const value = structuredClone(row);
        await Promise.resolve();
        return value;
      },
      async findMany() {
        return [structuredClone(row)];
      },
      async create() {
        throw new Error("must not create");
      },
      async updateMany({ where, data }) {
        if (row.revision !== where.revision) return { count: 0 };
        writes++;
        row = {
          ...row,
          revision: row.revision + 1,
          payload: structuredClone(data.payload),
        };
        return { count: 1 };
      },
    };
    const input = {
      studentId,
      now,
      concept: concept(),
      requestId: randomUUID(),
    };
    const results = await Promise.all([
      startTextbookReview(input, table),
      startTextbookReview(input, table),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "resumed",
      "started",
    ]);
    expect(writes).toBe(1);
    expect(
      (await readSrsState(studentId, table)).state.explorers!.profile
        .definitions!.runs,
    ).toBe(1);
  });
});
