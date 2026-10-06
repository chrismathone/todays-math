// @vitest-environment node
/** Synthetic in-memory PostgreSQL fixtures only: no credentials, network, or existing database. */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { LISTENING_SOURCE_TRANSCRIPT_LABEL } from "@/contracts/englishListeningTranscript.contract";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import {
  sourceTranscripts,
  sourceTranscriptSegments,
} from "@/lib/english/listening/runtime/transcripts";
import { searchListeningBank } from "@/lib/english/listening/runtime/bank";
import type {
  ListeningDatabase,
  ListeningTx,
} from "@/lib/english/listening/runtime/database";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
const memory = new PGlite();
const sourceHash = "b".repeat(64);
const document = englishListeningFixture();
document.groups = [document.groups[0]];
document.level = "중1";
document.source = {
  kind: "other",
  provider: "직접 제작",
  year: 2024,
  round: 1,
  month: null,
  originalFilename: "original.mp3",
};
const setId = document.id,
  ownerId = document.ownerId,
  branchId = document.branchId;
const audio = document.groups[0].audio;
let account = {
  id: ownerId,
  name: "교사",
  email: "teacher@example.test",
  role: "director",
  approvalStatus: "approved",
  isAdmin: false,
  branchId,
  disabledMenus: [],
  branch: { disabledMenus: [], menuRevision: 1 },
};
const tx = {
  user: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
      where.id === account.id ? account : null,
    ),
  },
  $queryRaw: async (sql: Prisma.Sql) =>
    (await memory.query(sql.text, sql.values)).rows,
  $executeRawUnsafe: async () => 0,
} as unknown as ListeningTx;
const database = {
  $transaction: async <T>(callback: (client: ListeningTx) => Promise<T>) =>
    callback(tx),
} as unknown as ListeningDatabase;
const runtime = createListeningRuntime(database);
const teacher = { kind: "teacher" as const, userId: ownerId };
const access = () => ({ ...account, menus: ["english-bank"] }) as AccountAccess;
let record: Record<string, unknown>;
const words = [
  { text: "Original", start: 2000, end: 2400, confidence: 0.9 },
  { text: "speech.", start: 2500, end: 3000, confidence: 0.8 },
  { text: "Continue", start: 5000, end: 5500, confidence: 0.9 },
  { text: "listening.", start: 5600, end: 6000, confidence: 0.9 },
];
async function insertTranscript(overrides: Record<string, unknown> = {}) {
  const row = {
    id: randomUUID(),
    set_id: setId,
    asset_id: audio.assetId,
    owner_id: ownerId,
    source_audio_sha256: sourceHash,
    playback_sha256: audio.sha256,
    duration_ms: audio.durationMs,
    provider: "assemblyai",
    profile: "english",
    text: "Original speech. Continue listening. Hidden-only token 50%_off.",
    display_text:
      overrides.text ??
      "Original speech. Continue listening. Hidden-only token 50%_off.",
    words,
    timing_quality: {
      outOfBoundsWordCount: 0,
      nonPositiveWordCount: 0,
      durationDeltaMs: 0,
      durationMatched: true,
    },
    review_status: "ai_unreviewed",
    generated_at: new Date("2026-10-05T14:00:00Z"),
    ...overrides,
  };
  const columns = Object.keys(row),
    values = Object.values(row).map((value) =>
      value && typeof value === "object" && !(value instanceof Date)
        ? JSON.stringify(value)
        : value,
    );
  await memory.query(
    `INSERT INTO english_listening_source_transcript (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")})`,
    values,
  );
  return row;
}
async function updateRecord() {
  await memory.query(
    'UPDATE english_listening_media_asset SET record=$1::jsonb WHERE "assetId"=$2::uuid',
    [JSON.stringify(record), audio.assetId],
  );
}
beforeAll(async () => {
  // This minimal synthetic schema exercises real SQL, without applying any project migration.
  await memory.exec(`
    CREATE TABLE english_listening_set (
      id uuid PRIMARY KEY, owner_id uuid, branch_id uuid, revision int,
      document jsonb, deleted_at timestamptz, updated_at timestamptz
    );
    CREATE TABLE english_listening_media_asset (
      "assetId" uuid PRIMARY KEY, "setId" uuid, "ownerId" uuid, "branchId" uuid,
      state text, record jsonb
    );
    CREATE TABLE english_listening_source_transcript (
      id uuid PRIMARY KEY, set_id uuid, asset_id uuid, owner_id uuid,
      source_audio_sha256 text, playback_sha256 text, duration_ms int,
      provider text, profile text, text text, display_text text, words jsonb, timing_quality jsonb,
      review_status text, generated_at timestamptz
    );
    CREATE TABLE english_listening_publication (id uuid, set_id uuid);
  `);
});
afterAll(async () => memory.close());
beforeEach(async () => {
  await memory.exec(
    "TRUNCATE english_listening_source_transcript,english_listening_media_asset,english_listening_set",
  );
  account = {
    ...account,
    id: ownerId,
    approvalStatus: "approved",
    isAdmin: false,
    branchId,
    disabledMenus: [],
    branch: { disabledMenus: [], menuRevision: 1 },
  };
  await memory.query(
    "INSERT INTO english_listening_set VALUES ($1,$2,$3,1,$4::jsonb,NULL,$5)",
    [
      setId,
      ownerId,
      branchId,
      JSON.stringify(document),
      new Date("2026-10-05T13:00:00Z"),
    ],
  );
  record = {
    assetId: audio.assetId,
    setId,
    ownerId,
    branchId,
    state: "ready",
    expectedSha256: sourceHash,
    playback: { sha256: audio.sha256 },
    completion: {
      assetId: audio.assetId,
      setId,
      ownerId,
      branchId,
      state: "ready",
      publishable: true,
      verifiedAt: 1000,
      sha256: audio.sha256,
      originalSha256: sourceHash,
      durationMs: audio.durationMs,
    },
    storage: { key: "private-not-returned", bucket: "private", ownerId },
  };
  await memory.query(
    "INSERT INTO english_listening_media_asset VALUES ($1,$2,$3,$4,'ready',$5::jsonb)",
    [audio.assetId, setId, ownerId, branchId, JSON.stringify(record)],
  );
  await insertTranscript();
});

describe("private current whole-source transcript reads", () => {
  it("returns only the teacher DTO and preserves the document, official script and audio", async () => {
    const before = await memory.query(
      "SELECT document FROM english_listening_set",
    );
    const result = await runtime.sourceTranscripts(teacher, setId);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        assetId: audio.assetId,
        origin: "ai_transcription",
        reviewStatus: "ai_unreviewed",
        durationMs: audio.durationMs,
        text: expect.stringContaining("Original speech"),
        segments: [
          { startMs: 2000, endMs: 3000, text: "Original speech." },
          { startMs: 5000, endMs: 6000, text: "Continue listening." },
        ],
      }),
    );
    expect(Object.keys(result.items[0]).sort()).toEqual(
      [
        "assetId",
        "durationMs",
        "excludedWordCount",
        "generatedAt",
        "id",
        "origin",
        "profile",
        "reviewStatus",
        "segments",
        "text",
        "timingReviewNeeded",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /private-not-returned|sha256|storage|provider|words|model|request_config/,
    );
    expect(
      (await memory.query("SELECT document FROM english_listening_set")).rows,
    ).toEqual(before.rows);
    expect(LISTENING_SOURCE_TRANSCRIPT_LABEL).toBe("AI 음성 전사 · 미검수");
  });
  it("returns the latest profile versions once even when groups share an asset", async () => {
    await insertTranscript({ profile: "bilingual", text: "한국어 English" });
    await insertTranscript({
      text: "Newer English",
      generated_at: new Date("2026-10-05T15:00:00Z"),
    });
    const duplicate = {
      ...document,
      groups: [document.groups[0], document.groups[0]],
    };
    await memory.query("UPDATE english_listening_set SET document=$1::jsonb", [
      JSON.stringify(duplicate),
    ]);
    const result = await sourceTranscripts(tx, access(), setId);
    expect(result.items.map((item) => item.text).sort()).toEqual(
      ["Newer English", "한국어 English"].sort(),
    );
  });
  it("excludes impossible trailing words from display, seeks and search while preserving raw storage", async () => {
    const rawWords = [
      ...words,
      {
        text: "Fabricated-news-signoff",
        start: audio.durationMs + 1000,
        end: audio.durationMs + 2000,
        confidence: 0.8,
      },
      {
        text: "Zero-length-tail",
        start: audio.durationMs + 3000,
        end: audio.durationMs + 3000,
        confidence: 0.8,
      },
    ];
    await memory.query(
      "UPDATE english_listening_source_transcript SET text=$1,display_text=$2,words=$3::jsonb,timing_quality=$4::jsonb",
      [
        "Original speech. Continue listening. Fabricated-news-signoff Zero-length-tail",
        "Original speech. Continue listening.",
        JSON.stringify(rawWords),
        JSON.stringify({
          outOfBoundsWordCount: 2,
          nonPositiveWordCount: 1,
          durationDeltaMs: 0,
          durationMatched: true,
        }),
      ],
    );
    const before = await memory.query(
      "SELECT text,words,timing_quality FROM english_listening_source_transcript",
    );
    const result = await runtime.sourceTranscripts(teacher, setId);
    expect(result.items[0]).toMatchObject({
      text: "Original speech. Continue listening.",
      excludedWordCount: 2,
      timingReviewNeeded: true,
    });
    expect(
      result.items[0].segments.map((segment) => segment.text).join(" "),
    ).toBe("Original speech. Continue listening.");
    expect(JSON.stringify(result)).not.toMatch(
      /Fabricated-news-signoff|Zero-length-tail/,
    );
    expect(
      (
        await searchListeningBank(tx, access(), {
          q: "Fabricated-news-signoff",
        })
      ).data,
    ).toEqual([]);
    expect(
      (await searchListeningBank(tx, access(), { q: "Continue listening" }))
        .data,
    ).toHaveLength(0);
    expect(
      (
        await memory.query(
          "SELECT text,words,timing_quality FROM english_listening_source_transcript",
        )
      ).rows,
    ).toEqual(before.rows);
  });
  it("keeps current display text but suppresses all seek paragraphs for a provider duration mismatch", async () => {
    await memory.query(
      "UPDATE english_listening_source_transcript SET timing_quality=$1::jsonb",
      [
        JSON.stringify({
          outOfBoundsWordCount: 0,
          nonPositiveWordCount: 0,
          durationDeltaMs: -3029,
          durationMatched: false,
        }),
      ],
    );
    expect(
      (await runtime.sourceTranscripts(teacher, setId)).items[0],
    ).toMatchObject({
      text: expect.stringContaining("Original speech"),
      segments: [],
      excludedWordCount: 0,
      timingReviewNeeded: true,
    });
    expect(
      (await searchListeningBank(tx, access(), { q: "Hidden-only" })).data,
    ).toHaveLength(0);
  });
  it("rejects a student actor and a missing approved teacher account", async () => {
    await expect(
      runtime.sourceTranscripts(
        { kind: "student", session: {} } as never,
        setId,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      runtime.sourceTranscripts(
        { kind: "teacher", userId: randomUUID() },
        setId,
      ),
    ).rejects.toMatchObject({ status: 404 });
    account.approvalStatus = "pending";
    await expect(
      runtime.sourceTranscripts(teacher, setId),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("requires the teacher materials bank menu even with the listening menu", async () => {
    account.disabledMenus = ["english-bank"] as never;
    await expect(
      runtime.sourceTranscripts(teacher, setId),
    ).rejects.toMatchObject({ status: 404 });
    account.disabledMenus = [];
    account.branch.disabledMenus = ["english-bank"] as never;
    await expect(
      runtime.sourceTranscripts(teacher, setId),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("rejects another owner and the same owner in a different branch", async () => {
    await expect(
      sourceTranscripts(tx, { ...access(), id: randomUUID() }, setId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      sourceTranscripts(tx, { ...access(), branchId: randomUUID() }, setId),
    ).rejects.toMatchObject({ status: 404 });
    account.branchId = randomUUID();
    account.isAdmin = true;
    await expect(
      runtime.sourceTranscripts(teacher, setId),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("keeps compose-source admin branch scope and fails closed on deleted sets", async () => {
    expect(
      (
        await sourceTranscripts(
          tx,
          { ...access(), id: randomUUID(), isAdmin: true },
          setId,
        )
      ).items,
    ).toHaveLength(1);
    await memory.query("UPDATE english_listening_set SET deleted_at=now()");
    await expect(
      runtime.sourceTranscripts(teacher, setId),
    ).rejects.toMatchObject({ status: 404 });
  });
  it.each([
    ["source_audio_sha256", "c".repeat(64)],
    ["playback_sha256", "c".repeat(64)],
    ["duration_ms", audio.durationMs + 1],
    ["asset_id", randomUUID()],
    ["set_id", randomUUID()],
    ["owner_id", randomUUID()],
  ])(
    "hides stale transcript %s in both reads and searches",
    async (column, value) => {
      await memory.query(
        `UPDATE english_listening_source_transcript SET ${column}=$1`,
        [value],
      );
      expect((await runtime.sourceTranscripts(teacher, setId)).items).toEqual(
        [],
      );
      expect(
        (await searchListeningBank(tx, access(), { q: "Hidden-only" })).data,
      ).toEqual([]);
    },
  );
  it.each([
    "playback",
    "completion",
    "expectedSha256",
    "sourceClip",
    "branchId",
  ])(
    "hides an invalid current %s binding in both reads and searches",
    async (binding) => {
      if (binding === "playback") record.playback = { sha256: "d".repeat(64) };
      if (binding === "completion")
        record.completion = {
          ...(record.completion as object),
          publishable: false,
        };
      if (binding === "expectedSha256") record.expectedSha256 = "d".repeat(64);
      if (binding === "sourceClip")
        record.sourceClip = { startFrame: 1, endFrame: 20 };
      if (binding === "branchId") record.branchId = randomUUID();
      await updateRecord();
      expect((await runtime.sourceTranscripts(teacher, setId)).items).toEqual(
        [],
      );
      expect(
        (await searchListeningBank(tx, access(), { q: "Hidden-only" })).data,
      ).toEqual([]);
    },
  );
  it("hides a changed document asset, duration or playback hash", async () => {
    for (const changed of [
      { ...audio, assetId: randomUUID() },
      { ...audio, durationMs: 1 },
      { ...audio, sha256: "e".repeat(64) },
    ]) {
      const value = {
        ...document,
        groups: [{ ...document.groups[0], audio: changed }],
      };
      await memory.query(
        "UPDATE english_listening_set SET document=$1::jsonb",
        [JSON.stringify(value)],
      );
      expect((await runtime.sourceTranscripts(teacher, setId)).items).toEqual(
        [],
      );
    }
  });
});

describe("transcript search with the existing bank filters", () => {
  it("keeps internal ASR text out of normal bank search", async () => {
    await insertTranscript({ profile: "bilingual" });
    await insertTranscript({ generated_at: new Date("2026-10-05T15:00:00Z") });
    const result = await searchListeningBank(tx, access(), {
      q: "hidden-ONLY",
      level: "중1",
      year: 2024,
      round: 1,
    });
    expect(result.data).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(
      /Original speech|Hidden-only|segments|words/,
    );
    expect(result.meta.nextCursor).toBeNull();
  });
  it("keeps owner, branch, year, round, level and origin filters", async () => {
    for (const extra of [
      { year: 2025 },
      { round: 2 },
      { level: "고1" },
      { origin: "audio_reconstructed" },
    ])
      expect(
        (
          await searchListeningBank(tx, access(), {
            q: "Hidden-only",
            ...extra,
          })
        ).data,
      ).toEqual([]);
    expect(
      (
        await searchListeningBank(
          tx,
          { ...access(), id: randomUUID() },
          { q: "Hidden-only" },
        )
      ).data,
    ).toEqual([]);
    expect(
      (
        await searchListeningBank(
          tx,
          { ...access(), branchId: randomUUID() },
          { q: "Hidden-only" },
        )
      ).data,
    ).toEqual([]);
    expect(
      (await searchListeningBank(tx, access(), { q: "50%_off" })).data,
    ).toHaveLength(0);
    expect(
      (await searchListeningBank(tx, access(), { q: "50%Xoff" })).data,
    ).toEqual([]);
    expect(
      (await searchListeningBank(tx, access(), { q: "library open" })).data,
    ).toHaveLength(1);
  });
});

describe("estimated paragraphs and private migration", () => {
  it("keeps zero-duration word text while excluding words outside the recording", () => {
    const rawWords = [
      { text: "First.", start: 1000, end: 2000 },
      { text: "Point-estimate", start: 3000, end: 3000 },
      { text: "Second.", start: 4000, end: 5000 },
      { text: "Out of bounds.", start: 15000, end: 16000 },
    ];
    const before = structuredClone(rawWords);
    expect(sourceTranscriptSegments(rawWords, 15000)).toEqual([
      { startMs: 1000, endMs: 5000, text: "First. Point-estimate Second." },
    ]);
    expect(rawWords).toEqual(before);
  });
  it("preserves a zero-duration short word internally with a timing notice", async () => {
    const rawWords = [
      ...words.slice(0, 1),
      { text: "a", start: 2450, end: 2450, confidence: 0.9 },
      ...words.slice(1),
    ];
    const text = "Original a speech. Continue listening.";
    await memory.query(
      "UPDATE english_listening_source_transcript SET text=$1,display_text=$1,words=$2::jsonb,timing_quality=$3::jsonb",
      [
        text,
        JSON.stringify(rawWords),
        JSON.stringify({
          outOfBoundsWordCount: 0,
          nonPositiveWordCount: 1,
          durationDeltaMs: 0,
          durationMatched: true,
        }),
      ],
    );
    const result = await runtime.sourceTranscripts(teacher, setId);
    expect(result.items[0]).toMatchObject({
      text,
      excludedWordCount: 0,
      timingReviewNeeded: true,
    });
    expect(
      result.items[0].segments.map((segment) => segment.text).join(" "),
    ).toBe(text);
    expect(
      (await searchListeningBank(tx, access(), { q: "Original a speech" }))
        .data,
    ).toHaveLength(0);
    expect(
      (
        await memory.query<{ words: unknown }>(
          "SELECT words FROM english_listening_source_transcript",
        )
      ).rows[0].words,
    ).toEqual(rawWords);
  });
  it("preserves every contiguous provider word, including punctuation and mixed language", () => {
    const value = Array.from({ length: 151 }, (_, index) => ({
      text: index % 2 ? `English-${index}` : `한국어-${index}`,
      start: index * 100,
      end: index * 100 + 90,
      confidence: 0.2,
    }));
    const paragraphs = sourceTranscriptSegments(value, 20000);
    expect(paragraphs.map((paragraph) => paragraph.text).join(" ")).toBe(
      value.map((word) => word.text).join(" "),
    );
    expect(
      paragraphs.map((paragraph) => paragraph.text.split(" ").length),
    ).toEqual([70, 70, 11]);
    expect(paragraphs[0].startMs).toBe(0);
    expect(paragraphs.at(-1)?.endMs).toBe(15090);
  });
  it.each([
    null,
    [],
    [{ text: "bad", start: -1, end: 10 }],
    [{ text: "late", start: 1, end: 20000 }],
    [{ text: "end", start: 2, end: 2 }],
    [
      { text: "out", start: 20, end: 30 },
      { text: "of order", start: 10, end: 15 },
    ],
  ])(
    "falls back to unchanged raw text instead of manufacturing timing for %j",
    (value) => {
      expect(sourceTranscriptSegments(value, 15000)).toEqual([]);
    },
  );
  it("declares UUID ownership, private RLS, job uniqueness and append-only version storage", () => {
    const migration = readFileSync(
      new URL(
        "../../../prisma/migrations/20261005142000_listening_source_transcripts/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toMatch(
      /owner_id UUID NOT NULL REFERENCES public\."user"\(id\)/,
    );
    expect(migration).toMatch(/provider_transcript_id TEXT NOT NULL UNIQUE/);
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("display_text TEXT NOT NULL");
    expect(migration).toContain(
      "timing_quality JSONB NOT NULL CHECK (jsonb_typeof(timing_quality) = 'object')",
    );
    expect(migration).toContain("FROM PUBLIC");
    expect(migration).toContain("ARRAY['anon', 'authenticated']");
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE/);
    expect(migration).not.toMatch(/CREATE POLICY|GRANT /i);
  });
});
