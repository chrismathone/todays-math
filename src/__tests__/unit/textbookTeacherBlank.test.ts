// @vitest-environment node
/** Real authorization, concept SQL and exact composition; only account/session and the DB connection are replaced. */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const boundary = vi.hoisted(() => ({
  account: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/accountAccess", () => ({ authorizeAccount: boundary.account }));
vi.mock("@/lib/errorLog/record", () => ({ recordErrorLog: boundary.log }));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  textbookDb: {
    query: boundary.query,
    execute: boundary.execute,
    transaction: boundary.transaction,
  },
}));

import { GET } from "@/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/blank/route";
import {
  textbookBlankResponseSchema,
  textbookBlankResultSchema,
} from "@/contracts/textbookBlank.contract";
import {
  textbookConceptSchema,
  textbookFrozenEntrySchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import {
  EXACT_COMPOSITION_VERSION,
  EXACT_PARSER_VERSION,
} from "@/lib/concept-blank/exactPick";
import {
  ERROR_LOG_ROUTE,
  settleErrorLogWrites,
} from "@/lib/errorLog/withErrorLog";
import { resetServerLogQuota } from "@/lib/errorLog/serverQuota";
import * as concepts from "@/lib/textbook/concepts";
import { loadFrozenBlank, loadTeacherBlank } from "@/lib/textbook/frozenBlank";
import { canonicalHash, conceptContentHash } from "@/lib/textbook/hash.server";
import type { SqlParam, TextbookDb } from "@/lib/textbook/server/sql";
import {
  type Db,
  openTextbookDb,
  seedWorld,
  draftWithContent,
  reservePublish,
  runSteps,
  finalizePublish,
} from "../helpers/textbookPglite";
import { pgliteTextbookDb } from "../helpers/textbookServerWorld";

let pg: Db;
let sql: TextbookDb;
beforeAll(async () => {
  pg = await openTextbookDb();
  sql = pgliteTextbookDb(pg);
  boundary.query.mockImplementation(
    (text: string, params: readonly SqlParam[] = []) => sql.query(text, params),
  );
  boundary.execute.mockImplementation(sql.execute);
  boundary.transaction.mockImplementation(sql.transaction);
}, 120_000);
afterAll(async () => {
  await settleErrorLogWrites();
  await pg?.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  resetServerLogQuota();
  boundary.account.mockReset().mockResolvedValue({
    account: null,
    response: new Response(null, { status: 401 }),
  });
  boundary.log.mockResolvedValue(undefined);
});

const liveSection = CONCEPT_BLANK_BANK.ox.find(
  (ox) =>
    CONCEPT_BLANK_BANK.concepts.filter(
      (entry) => entry.section === ox.section && !entry.givenCase,
    ).length >= 2,
)!.section;
const liveConcepts = CONCEPT_BLANK_BANK.concepts
  .filter((entry) => entry.section === liveSection && !entry.givenCase)
  .slice(0, 2);
const liveOx = CONCEPT_BLANK_BANK.ox.find(
  (entry) => entry.section === liveSection,
)!;
const selected = [
  { entryKind: "concept" as const, payload: liveConcepts[1] },
  { entryKind: "ox" as const, payload: liveOx },
  { entryKind: "concept" as const, payload: liveConcepts[0] },
];

async function fixture(
  options: {
    published?: boolean;
    share?: boolean;
    change?: (concept: TextbookConcept) => void;
    rehash?: boolean;
  } = {},
) {
  const world = await seedWorld(pg);
  await pg.query(
    'UPDATE "user" SET "approval_status" = \'approved\', "branch_id" = $1::uuid WHERE "id" IN ($2::uuid,$3::uuid)',
    [world.branchId, world.userA, world.userB],
  );
  const draft = await draftWithContent(pg, world);
  const section = await pg.query<{ section_key: string }>(
    'SELECT "section_key" FROM "textbook_section" WHERE "id" = $1::uuid',
    [draft.sectionId],
  );
  const concept = textbookConceptSchema.parse({
    conceptKey: draft.conceptKey,
    unitKey: "u1",
    sectionKey: section.rows[0].section_key,
    title: "확인한 정의",
    kind: "정의",
    unitId: null,
    body: {
      goal: "설명하기",
      prerequisites: [],
      definition: "확인한 원문",
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankForms: ["term"],
    blankItems: selected.map((entry) => ({
      blankSectionKey: liveSection,
      entryKind: entry.entryKind,
      entryId: entry.payload.id,
      review: {
        status: "confirmed",
        candidateRule: "manual",
        reviewedBy: world.userA,
        reviewedAt: "2026-10-03T01:00:00.000Z",
        targetHash: canonicalHash(entry.payload),
      },
    })),
    links: [],
    mappingVersion: "blank-api-test-v1",
    derivedFromConceptKey: null,
    frozen: null,
  });
  if (options.published) {
    const frozenSection = "초5::발행 당시 단원::발행 당시 소단원";
    const entries = selected.map((entry, i) =>
      textbookFrozenEntrySchema.parse({
        ...entry,
        payload: {
          ...entry.payload,
          id: `frozen-blank-${i}`,
          section: frozenSection,
        },
      }),
    );
    concept.frozen = {
      contentHash: "0".repeat(64),
      parserVersion: EXACT_PARSER_VERSION,
      compositionVersion: EXACT_COMPOSITION_VERSION,
      mappingVersion: concept.mappingVersion,
      sections: [
        {
          blankSectionKey: frozenSection,
          title: "발행 당시 이름",
          unitLabel: "발행 당시 단원",
        },
      ],
      entries: [...entries].reverse(),
      selection: entries.map((entry) => ({
        blankSectionKey: frozenSection,
        entryKind: entry.entryKind,
        entryId: entry.payload.id,
        form: "term",
        level: entry.payload.level,
      })),
      assetHashes: [],
    };
    concept.frozen!.contentHash = conceptContentHash(concept);
  }
  options.change?.(concept);
  if (options.rehash && concept.frozen)
    concept.frozen.contentHash = conceptContentHash(concept);
  await pg.query(
    `UPDATE "textbook_concept" SET "title"=$3, "kind"=$4, "body"=$5::jsonb, "blank_items"=$6::jsonb,
    "blank_forms"=$7::jsonb, "links"=$8::jsonb, "mapping_version"=$9, "frozen"=$10::jsonb WHERE "edition_id"=$1::uuid AND "concept_key"=$2`,
    [
      draft.editionId,
      draft.conceptKey,
      concept.title,
      concept.kind,
      JSON.stringify(concept.body),
      JSON.stringify(concept.blankItems),
      JSON.stringify(concept.blankForms),
      JSON.stringify(concept.links),
      concept.mappingVersion,
      concept.frozen ? JSON.stringify(concept.frozen) : null,
    ],
  );
  if (options.share)
    await pg.query(
      'UPDATE "textbook" SET "visibility"=\'branch\', "shared_branch_id"=$2::uuid WHERE "id"=$1::uuid',
      [draft.bookId, world.branchId],
    );
  if (options.published) {
    const plan = await reservePublish(pg, draft);
    await runSteps(pg, draft, plan);
    await finalizePublish(pg, draft, plan, ["concept"]);
  }
  return {
    ...world,
    ...draft,
    concept,
    owner: { id: world.userA, name: "가", branchId: world.branchId },
  };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
function login(f: Fixture, id = f.userA, menus = ["textbook"]) {
  // Deliberately stale session branch: authorizeTextbook must load the current branch from the DB.
  boundary.account.mockResolvedValue({
    account: { id, menus, isAdmin: false, branchId: "stale-session-branch" },
    response: null,
  });
}
const path = "/api/textbook/editions/[editionId]/concepts/[conceptKey]/blank";
const get = (f: Pick<Fixture, "editionId" | "conceptKey">, query = "") =>
  GET(
    new Request(
      `https://today.test/api/textbook/editions/${f.editionId}/concepts/${f.conceptKey}/blank${query}`,
    ),
    {
      params: Promise.resolve({
        editionId: f.editionId,
        conceptKey: f.conceptKey,
      }),
    },
  );
async function stored(f: Fixture) {
  return (
    await pg.query(
      'SELECT "revision", "frozen", "blank_items", "blank_forms" FROM "textbook_concept" WHERE "edition_id"=$1::uuid AND "concept_key"=$2',
      [f.editionId, f.conceptKey],
    )
  ).rows;
}
function expectReadOnly() {
  expect(boundary.execute).not.toHaveBeenCalled();
  expect(boundary.transaction).not.toHaveBeenCalled();
  for (const [text] of boundary.query.mock.calls)
    expect(text.trim()).toMatch(/^SELECT\b/);
}

describe("teacher exact blank GET", () => {
  it("returns owner draft current picks with exact order/counts and never stores the temporary freeze", async () => {
    const f = await fixture();
    login(f);
    const before = await stored(f);
    const response = await get(f, "?source=frozen&sheetCode=ignored");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const { data } = textbookBlankResponseSchema.parse(await response.json());
    expect(data).toMatchObject({
      editionId: f.editionId,
      conceptKey: f.conceptKey,
      source: "current",
      sheetCode: null,
    });
    expect(data.contentHash).toBe(
      concepts.freezeTextbookConcept(f.concept).frozen!.contentHash,
    );
    expect(data.selection.pick.map((pick) => pick.entryId)).toEqual(
      selected.map((entry) => entry.payload.id),
    );
    expect(data.sheets).toHaveLength(1);
    const sheet = data.sheets[0];
    expect(sheet.form).toBe("term");
    if (sheet.form !== "term") throw new Error("expected term sheet");
    expect(sheet.entryOrder).toEqual(
      selected.map((entry) => ({
        entryKind: entry.entryKind,
        entryId: entry.payload.id,
      })),
    );
    expect(sheet.terms.map((entry) => entry.id)).toEqual([
      liveConcepts[1].id,
      liveConcepts[0].id,
    ]);
    expect(sheet.ox.map((entry) => entry.id)).toEqual([liveOx.id]);
    expect(
      Object.values(data.selection.forms[0].counts).reduce((a, b) => a + b),
    ).toBe(2);
    expect(
      Object.values(data.selection.forms[0].extras).reduce((a, b) => a + b),
    ).toBe(1);
    expect(await stored(f)).toEqual(before);
    expectReadOnly();
    await expect(
      loadFrozenBlank(sql, f.owner, f.editionId, f.conceptKey),
    ).rejects.toMatchObject({ status: 409 });
  });

  it.each(["owner", "branch"])(
    "returns %s published frozen IDs/labels/hash without invoking the live bank",
    async (scope) => {
      const f = await fixture({ published: true, share: true });
      login(f, scope === "owner" ? f.userA : f.userB);
      const before = await stored(f);
      const freeze = vi.spyOn(concepts, "freezeTextbookConcept");
      try {
        const response = await get(f);
        expect(response.status).toBe(200);
        const { data } = textbookBlankResponseSchema.parse(
          await response.json(),
        );
        expect(data).toMatchObject({
          source: "frozen",
          contentHash: f.concept.frozen!.contentHash,
          sheetCode: null,
        });
        expect(data.selection.pick.map((pick) => pick.entryId)).toEqual([
          "frozen-blank-0",
          "frozen-blank-1",
          "frozen-blank-2",
        ]);
        expect(data.sheets[0].header).toMatchObject({
          title: "발행 당시 이름",
          unitLabel: "발행 당시 단원",
        });
        expect(freeze).not.toHaveBeenCalled();
        expect(await stored(f)).toEqual(before);
        expectReadOnly();
      } finally {
        freeze.mockRestore();
      }
    },
  );

  it.each([
    ["private published", true, false],
    ["shared draft", false, true],
    ["private draft", false, false],
  ] as const)(
    "denies a colleague's %s before loading concept content",
    async (_label, published, share) => {
      const f = await fixture({ published, share });
      login(f, f.userB);
      expect((await get(f)).status).toBe(404);
      expect(
        boundary.query.mock.calls.some(([text]) =>
          text.includes('FROM "textbook_concept"'),
        ),
      ).toBe(false);
      expectReadOnly();
    },
  );

  it.each(["viewer moved", "owner suspended"])(
    "rechecks shared access when %s",
    async (change) => {
      const f = await fixture({ published: true, share: true });
      login(f, f.userB);
      await pg.query(
        change === "viewer moved"
          ? 'UPDATE "user" SET "branch_id"=NULL WHERE "id"=$1::uuid'
          : 'UPDATE "user" SET "suspended_at"=now() WHERE "id"=$1::uuid',
        [change === "viewer moved" ? f.userB : f.userA],
      );
      expect((await get(f)).status).toBe(404);
      expectReadOnly();
    },
  );

  it("checks login/menu and invalid paths without reading concept rows", async () => {
    const f = await fixture();
    expect((await get(f)).status).toBe(401);
    expect(boundary.query).not.toHaveBeenCalled();
    login(f, f.userA, []);
    expect((await get(f)).status).toBe(403);
    expect(boundary.query).not.toHaveBeenCalled();
    login(f);
    expect((await get({ ...f, editionId: "not-a-uuid" })).status).toBe(404);
    expect((await get({ ...f, conceptKey: "bad/key" })).status).toBe(404);
    expect((await get({ ...f, conceptKey: "missing-concept" })).status).toBe(
      404,
    );
    expectReadOnly();
  });
});

describe("actionable conflicts and frozen provenance", () => {
  it.each([
    [
      "unconfirmed",
      (c: TextbookConcept) => {
        c.blankItems[0].review.status = "candidate";
      },
    ],
    [
      "stale",
      (c: TextbookConcept) => {
        c.blankItems[0].review.targetHash = "f".repeat(64);
      },
    ],
    [
      "missing",
      (c: TextbookConcept) => {
        c.blankItems[0].entryId = "missing-blank-id";
      },
    ],
    [
      "unsupported form",
      (c: TextbookConcept) => {
        c.blankForms = ["recall"];
      },
    ],
    [
      "no confirmed entries",
      (c: TextbookConcept) => {
        c.blankItems.forEach((ref) => {
          ref.review.status = "rejected";
        });
      },
    ],
  ] as const)(
    "returns 409 for %s draft refs without expanding the bank or writing",
    async (_label, change) => {
      const f = await fixture({ change });
      login(f);
      const before = await stored(f);
      const response = await get(f);
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).not.toHaveProperty("data");
      expect(body.error).toMatchObject({
        code: "CONFLICT",
        message: expect.stringMatching(/다시 확인하거나 제외/),
      });
      expect(body.error.details.issues[0]).toMatchObject({
        code: "CONCEPT_BLANK_UNAVAILABLE",
        severity: "error",
        path: ["concepts", f.conceptKey],
      });
      expect(await stored(f)).toEqual(before);
      expectReadOnly();
    },
  );

  it.each([
    [
      "changed hash",
      (c: TextbookConcept) => {
        c.body.definition += "변조";
      },
      false,
    ],
    [
      "unsupported parser",
      (c: TextbookConcept) => {
        c.frozen!.parserVersion = "unsupported-v2";
      },
      true,
    ],
    [
      "unsupported composer",
      (c: TextbookConcept) => {
        c.frozen!.compositionVersion = "unsupported-v2";
      },
      true,
    ],
    [
      "missing exact ID",
      (c: TextbookConcept) => {
        c.frozen!.selection[0].entryId = "absent-frozen-entry";
      },
      true,
    ],
    [
      "wrong section",
      (c: TextbookConcept) => {
        c.frozen!.selection[0].blankSectionKey = "초5::다른 단원::다른 소단원";
      },
      true,
    ],
  ] as const)(
    "fails closed on published %s even when a current draft composition would succeed",
    async (_label, change, rehash) => {
      const f = await fixture({ published: true, change, rehash });
      login(f);
      const response = await get(f);
      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body).not.toHaveProperty("data");
      expect(body.error.message).toMatch(/새 판본/);
      expect(body.error.details.issues[0].message.length).toBeGreaterThan(0);
      expectReadOnly();
    },
  );

  it("does not publish or mutate a draft that happens to contain a stored frozen capture", async () => {
    const f = await fixture({
      change: (c) => {
        c.frozen = concepts.freezeTextbookConcept(c).frozen;
      },
    });
    login(f);
    const before = await stored(f);
    const { data } = textbookBlankResponseSchema.parse(
      await (await get(f)).json(),
    );
    expect(data.source).toBe("current");
    expect(await stored(f)).toEqual(before);
    expectReadOnly();
  });

  it("rejects a misrouted concept identity and retains the route error-log source", async () => {
    const f = await fixture();
    login(f);
    boundary.query
      .mockImplementationOnce((text: string, params: readonly SqlParam[]) =>
        sql.query(text, params),
      )
      .mockImplementationOnce((text: string, params: readonly SqlParam[]) =>
        sql.query(text, params),
      )
      .mockImplementationOnce(
        async (text: string, params: readonly SqlParam[]) =>
          (await sql.query<Record<string, unknown>>(text, params)).map(
            (row) => ({ ...row, conceptKey: "different-concept" }),
          ),
      );
    await expect(get(f)).rejects.toThrow(/출처/);
    expect((GET as unknown as Record<symbol, unknown>)[ERROR_LOG_ROUTE]).toBe(
      path,
    );
    await settleErrorLogWrites();
    expect(boundary.log).toHaveBeenCalled();
    expect(JSON.stringify(boundary.log.mock.calls)).toContain(path);
    expectReadOnly();
  });
});

describe("strict teacher blank response contract", () => {
  it("serializes all five existing paper forms with their original entry schemas", async () => {
    const f = await fixture({
      change: (concept) => {
        concept.blankForms = ["recall", "term", "cloze", "map", "figure"];
        for (const entry of [
          { entryKind: "apply" as const, payload: CONCEPT_BLANK_BANK.apply[0] },
          {
            entryKind: "figure" as const,
            payload: CONCEPT_BLANK_BANK.figures[0],
          },
        ])
          concept.blankItems.push({
            blankSectionKey: entry.payload.section,
            entryKind: entry.entryKind,
            entryId: entry.payload.id,
            review: {
              ...concept.blankItems[0].review,
              targetHash: canonicalHash(entry.payload),
            },
          });
      },
    });
    login(f);
    const response = await get(f);
    expect(response.status).toBe(200);
    const { data } = textbookBlankResponseSchema.parse(await response.json());
    expect([...new Set(data.sheets.map((sheet) => sheet.form))]).toEqual([
      "recall",
      "term",
      "cloze",
      "map",
      "figure",
    ]);
    const cloze = data.sheets.filter((sheet) => sheet.form === "cloze");
    expect(
      cloze.flatMap((sheet) => sheet.apply.map((entry) => entry.id)),
    ).toEqual([CONCEPT_BLANK_BANK.apply[0].id]);
    const figure = data.sheets.find((sheet) => sheet.form === "figure");
    expect(figure?.figures).toEqual([CONCEPT_BLANK_BANK.figures[0]]);
    expectReadOnly();
  });

  it("keeps exact-pick refinements and rejects unknown fields at every response layer", async () => {
    const f = await fixture();
    const data = await loadTeacherBlank(
      sql,
      f.owner,
      f.editionId,
      f.conceptKey,
    );
    expect(textbookBlankResultSchema.safeParse(data).success).toBe(true);
    expect(
      textbookBlankResponseSchema.safeParse({ data, extra: true }).success,
    ).toBe(false);
    const bad = [
      { ...data, extra: true },
      { ...data, source: "published" },
      { ...data, sheetCode: "1ABC" },
      { ...data, contentHash: "wrong" },
      { ...data, selection: { ...data.selection, pick: undefined } },
      {
        ...data,
        selection: {
          ...data.selection,
          forms: [
            { ...data.selection.forms[0], counts: { 하: 0, 중: 0, 상: 0 } },
          ],
        },
      },
      { ...data, sheets: [{ ...data.sheets[0], extra: true }] },
      {
        ...data,
        sheets: [
          {
            ...data.sheets[0],
            header: { ...data.sheets[0].header, form: "recall" },
          },
        ],
      },
    ];
    for (const value of bad)
      expect(textbookBlankResultSchema.safeParse(value).success).toBe(false);
    const entry = data.sheets[0];
    if (entry.form !== "term") throw new Error("expected term");
    expect(
      textbookBlankResultSchema.safeParse({
        ...data,
        sheets: [{ ...entry, terms: [{ ...entry.terms[0], extra: true }] }],
      }).success,
    ).toBe(false);
  });
});
