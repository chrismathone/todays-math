// @vitest-environment node
/** Synthetic documents in an in-memory PostgreSQL engine; no retired corpus or live services. */
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import type { EnglishListeningDocument } from "@/contracts/englishListening.contract";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { isKnownExternalListeningDocument } from "@/lib/english/listening/externalSourcePolicy";
import {
  availableListeningDocument,
  ownedSet,
  type ListeningTx,
  type ListeningDatabase,
} from "@/lib/english/listening/runtime/database";
import { searchListeningBank } from "@/lib/english/listening/runtime/bank";
import {
  createSet,
  listSets,
  setDetail,
  updateSet,
} from "@/lib/english/listening/runtime/sets";
import {
  composeListeningSet,
  composeSource,
} from "@/lib/english/listening/runtime/compose";
import { publicationRow } from "@/lib/english/listening/runtime/assignments";
import { createListeningMediaAccess } from "@/lib/english/listening/runtime/mediaAccess";
import { listeningValueHash } from "@/lib/english/listening/publication";
vi.mock("server-only", () => ({}));

const source = (kind = "other", provider = "직접 제작") => ({
  kind,
  provider,
  year: 2026,
  round: 1,
  month: null,
  originalFilename: "ebs-middle-1-2026-1.mp3",
});
const cases: [string, unknown, boolean][] = [
  ["national source", { source: source("national_listening") }, true],
  ["mock source", { source: source("mock_exam") }, true],
  ["EBS provider", { source: source("other", " EBS 중학 ") }, true],
  ["EBSi provider", { source: source("other", "EBSi") }, true],
  [
    "education authority provider",
    { source: source("other", "시·도교육청") },
    true,
  ],
  ...[
    "ebs-middle-1-2026-1",
    "ebsi-high-3-2022-2",
    "ebsi-high-1-2026-09-mock",
  ].map((sourceRecordId): [string, unknown, boolean] => [
    sourceRecordId,
    { groups: [{ questions: [{ metadata: { sourceRecordId } }] }] },
    true,
  ]),
  [
    "assembled national question",
    {
      provenance: { kind: "assembled" },
      groups: [
        { questions: [{}] },
        {
          questions: [
            {
              metadata: {
                origin: "teacher_authored",
                assessmentKind: "national_listening",
              },
            },
          ],
        },
      ],
    },
    true,
  ],
  [
    "assembled reconstructed EBS",
    {
      groups: [
        {
          questions: [
            { metadata: { origin: "audio_reconstructed", provider: "EBSi" } },
          ],
        },
      ],
    },
    true,
  ],
  [
    "own upload with misleading filename",
    { source: source(), provenance: { kind: "uploaded_assessment" } },
    false,
  ],
  [
    "own authored",
    { provenance: { kind: "teacher_authored" }, groups: [{ questions: [{}] }] },
    false,
  ],
  [
    "own reconstructed recording",
    {
      groups: [
        {
          questions: [
            {
              metadata: {
                origin: "audio_reconstructed",
                assessmentKind: "other",
                provider: "직접 제작",
              },
            },
          ],
        },
      ],
    },
    false,
  ],
  [
    "own imported question image",
    {
      groups: [
        {
          questions: [
            {
              metadata: {
                origin: "official_original",
                assessmentKind: "other",
                provider: "직접 제작",
              },
            },
          ],
        },
      ],
    },
    false,
  ],
  [
    "text and similar provider labels",
    {
      title: "EBS 연습",
      source: source("other", "My EBS recordings"),
      groups: [
        {
          questions: [
            {
              prompt: "ebsi-high-1-2026-1",
              metadata: { sourceRecordId: "my-ebs-middle-1-2026-1" },
            },
          ],
        },
      ],
    },
    false,
  ],
  [
    "unrelated source ID",
    {
      groups: [
        {
          questions: [
            { metadata: { sourceRecordId: "ebs-middle-lesson-notes" } },
          ],
        },
      ],
    },
    false,
  ],
  ["no provenance", {}, false],
];
const memory = new PGlite();
const own = englishListeningFixture();
own.title = "자체 녹음 TTS 자료";
const retired = englishListeningFixture();
retired.id = randomUUID();
retired.source = source(
  "national_listening",
) as EnglishListeningDocument["source"];
const assembled = englishListeningFixture();
assembled.id = randomUUID();
assembled.provenance.kind = "assembled";
assembled.groups[0].questions[0].metadata = {
  schemaVersion: 1,
  origin: "official_original",
  sourceRecordId: "ebsi-high-1-2026-09-mock",
  assessmentKind: "other",
  provider: null,
  year: null,
  round: null,
  month: null,
  level: null,
  sourceNumber: null,
  sourceAudioSha256: null,
  sourceQuestionSha256: null,
  questionType: "unknown",
  topics: [],
  keywords: [],
  classification: { method: "unclassified", model: null, confidence: null },
  reconstruction: null,
};
const account: AccountAccess = {
  id: own.ownerId,
  branchId: own.branchId,
  name: "교사",
  email: "teacher@example.test",
  role: "director",
  approvalStatus: "approved",
  isAdmin: false,
  menus: ["english-bank"],
};
const teacherAccount = {
  ...account,
  deletedAt: null,
  suspendedAt: null as Date | null,
  disabledMenus: [],
  branch: { disabledMenus: [], menuRevision: 1 },
};
const query = async (sql: Prisma.Sql) =>
  (await memory.query(sql.text, sql.values)).rows;
const execute = vi.fn(
  async (sql: Prisma.Sql) =>
    (await memory.query(sql.text, sql.values)).affectedRows ?? 0,
);
const tx = {
  $queryRaw: query,
  $executeRaw: execute,
  $executeRawUnsafe: async () => 0,
  user: { findUnique: async () => teacherAccount },
  class: { findMany: async () => [] },
} as unknown as ListeningTx;
const database = {
  $transaction: async (callback: (client: ListeningTx) => unknown) =>
    callback(tx),
} as ListeningDatabase;
const media = createListeningMediaAccess(database);
beforeAll(async () => {
  await memory.exec(`CREATE TABLE english_listening_set (id uuid PRIMARY KEY, owner_id uuid, branch_id uuid, revision int, document jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE english_listening_publication (id uuid PRIMARY KEY, set_id uuid, source_revision int, snapshot jsonb, created_at timestamptz DEFAULT now(), withdrawn_at timestamptz);
    CREATE TABLE english_listening_audit (id uuid, resource_id uuid, actor_id uuid, kind text, payload jsonb, created_at timestamptz);`);
  for (const [index, document] of [own, retired, assembled].entries()) {
    await memory.query(
      "INSERT INTO english_listening_set(id,owner_id,branch_id,revision,document,updated_at) VALUES($1,$2,$3,1,$4,$5)",
      [
        document.id,
        document.ownerId,
        document.branchId,
        JSON.stringify(document),
        new Date(Date.UTC(2026, 9, 6, 0, index)),
      ],
    );
  }
});
afterAll(() => memory.close());
describe("known external listening policy", () => {
  it.each(cases)(
    "%s has matching deterministic and PostgreSQL policy",
    async (_label, document, external) => {
      expect(isKnownExternalListeningDocument(document)).toBe(external);
      const rows = await query(
        Prisma.sql`SELECT ${availableListeningDocument(Prisma.sql`${JSON.stringify(document)}::jsonb`)} AS available`,
      );
      expect(rows).toEqual([{ available: !external }]);
    },
  );
  it("filters whole and assembled external sets before bank and list limits", async () => {
    const page = await searchListeningBank(tx, account, { limit: 1 });
    expect(page.data.map((row) => row.id)).toEqual([own.id]);
    expect(page.meta.nextCursor).toBeNull();
    expect(
      (
        await searchListeningBank(tx, account, {
          q: own.groups[0].transcript.text,
        })
      ).data.map((row) => row.id),
    ).toEqual([own.id]);
    expect((await listSets(tx, account)).map((row) => row.id)).toEqual([
      own.id,
    ]);
    expect(
      (await searchListeningBank(tx, { ...account, id: randomUUID() }, {}))
        .data,
    ).toEqual([]);
  });
  it.each([retired, assembled])(
    "denies external detail, compose and teacher media for $id",
    async (document) => {
      await expect(setDetail(tx, account, document.id)).rejects.toMatchObject({
        status: 404,
        code: "NOT_FOUND",
      });
      await expect(
        composeSource(tx, account, document.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        composeListeningSet(
          tx,
          account,
          {
            title: "자체 시험",
            selections: [
              {
                setId: document.id,
                expectedRevision: 1,
                documentHash: listeningValueHash(document),
                groupId: document.groups[0].id,
                questionIds: [document.groups[0].questions[0].id],
              },
            ],
          },
          new Date().toISOString(),
        ),
      ).rejects.toMatchObject({ status: 404 });
      for (const action of ["playback", "store_original"] as const)
        expect(
          await media.authorize(
            { actor: { kind: "teacher", userId: account.id } },
            {
              action,
              setId: document.id,
              assetId: document.groups[0].audio.assetId,
            },
          ),
        ).toBe(false);
    },
  );
  it("keeps own media scope, playback, rights and account gates", async () => {
    const detail = await composeSource(tx, account, own.id);
    expect(detail.detail.document).toEqual(own);
    expect(
      detail.detail.mediaUrlsByAssetId[own.groups[0].audio.assetId],
    ).toContain(`/sets/${own.id}/media/`);
    const context = { actor: { kind: "teacher" as const, userId: account.id } };
    const target = {
      action: "playback" as const,
      setId: own.id,
      assetId: own.groups[0].audio.assetId,
    };
    expect(await media.authorize(context, target)).toBe(true);
    await expect(
      ownedSet(tx, { ...account, id: randomUUID() }, own.id),
    ).rejects.toMatchObject({ status: 404 });
    teacherAccount.suspendedAt = new Date();
    expect(await media.authorize(context, target)).toBe(false);
    teacherAccount.suspendedAt = null;
    const unapproved = { ...own, rightsReview: null };
    await memory.query(
      "UPDATE english_listening_set SET document=$2 WHERE id=$1",
      [own.id, JSON.stringify(unapproved)],
    );
    expect(await media.authorize(context, target)).toBe(false);
    await memory.query(
      "UPDATE english_listening_set SET document=$2 WHERE id=$1",
      [own.id, JSON.stringify(own)],
    );
  });
  it("denies retired publication snapshots at the gate used by student reads and playback", async () => {
    const publicationId = randomUUID();
    await memory.query(
      "INSERT INTO english_listening_publication(id,set_id,snapshot) VALUES($1,$2,$3)",
      [publicationId, own.id, JSON.stringify({ document: assembled })],
    );
    await expect(publicationRow(tx, publicationId)).rejects.toMatchObject({
      status: 404,
    });
    const detail = await setDetail(tx, account, own.id);
    expect(detail.publications).toEqual([]);
  });
  it("rejects external creation and tainted edits but allows own uploads", async () => {
    execute.mockClear();
    await expect(
      createSet(
        tx,
        account,
        {
          title: "외부",
          source: retired.source,
          rights: own.rights,
          basis: "synthetic metadata",
        },
        new Date().toISOString(),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(execute).not.toHaveBeenCalled();
    const created = await createSet(
      tx,
      account,
      {
        title: "직접 제작 음원",
        source: source(),
        rights: own.rights,
        basis: "직접 작성·녹음",
      },
      new Date().toISOString(),
    );
    expect(created.document.provenance.kind).toBe("uploaded_assessment");
    await expect(
      updateSet(
        tx,
        account,
        own.id,
        {
          expectedRevision: 1,
          title: own.title,
          level: own.level,
          examId: null,
          rights: own.rights,
          basis: own.provenance.basis,
          groups: assembled.groups.map(
            ({ id, audio, transcript, questions }) => ({
              id,
              audio,
              transcript,
              questions,
            }),
          ),
        },
        new Date().toISOString(),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect((await setDetail(tx, account, own.id)).document).toEqual(own);
  });
});
