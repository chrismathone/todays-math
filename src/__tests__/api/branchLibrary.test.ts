// Pure in-memory database boundary: never connects to the configured remote DB.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/arithmetic-v2/registry", async () => {
  const fixture = await import("@/__tests__/helpers/arithmeticV2Fixture");
  return {
    getArithmeticV2Definition: fixture.getFixtureDefinition,
    arithmeticV2Definitions: () => fixture.fixtureDefinitions,
  };
});
const mocks = vi.hoisted(() => ({
  workflowQuery: vi.fn(async () => []),
  authorize: vi.fn(),
  user: { findFirst: vi.fn() },
  document: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    deleteMany: vi.fn(),
  },
  asset: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
  link: { deleteMany: vi.fn(), createMany: vi.fn() },
  audit: { create: vi.fn() },
}));
vi.mock("@/lib/accountAccess", () => ({ authorizeAccount: mocks.authorize }));
vi.mock("@/lib/db", () => {
  const tx = {
    user: mocks.user,
    workspaceDocument: mocks.document,
    workspaceAsset: mocks.asset,
    workspaceDocumentAsset: mocks.link,
    accountAuditLog: mocks.audit,
  };
  return {
    db: {
      ...tx,
      $queryRaw: mocks.workflowQuery,
      $transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
    },
  };
});
import { listDocuments } from "@/lib/privateDocumentList";
import {
  readDocument,
  saveDocument,
  renameDocument,
  deleteDocument,
  copyDocument,
} from "@/lib/privateDocumentActions";
import { readPrivateAsset } from "@/lib/privateAssets";
import {
  buildArithmeticSheet,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
} from "@/lib/arithmetic";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { fixtureRequest } from "../helpers/arithmeticV2Fixture";

const viewer = "10000000-0000-4000-8000-000000000001";
const colleague = "20000000-0000-4000-8000-000000000002";
const branch = "30000000-0000-4000-8000-000000000003";
const elsewhere = "40000000-0000-4000-8000-000000000004";
const hash = "a".repeat(64);
const unrelatedHash = "b".repeat(64);
const date = new Date("2026-10-02T00:00:00Z");
type Row = Record<string, unknown>;
type Doc = {
  userId: string;
  id: string;
  kind: string;
  title: string;
  payload: Row;
  revision: number;
  visibility: string;
  sharedBranchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  problemCount: number;
};
let users: Map<string, Row>;
let docs: Doc[];
let assets: (Row & { userId: string; id: string })[];
let links: { userId: string; documentId: string; assetId: string }[];
let account: AccountAccess;

// Evaluate the actual ORM predicates, including relation filters. A missing
// branch/visibility/owner predicate changes the observable API results.
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND")
      return (Array.isArray(value) ? value : [value]).every((part) =>
        matches(row, part),
      );
    if (key === "OR")
      return (value as Row[]).some((part) => matches(row, part));
    if (value && typeof value === "object") {
      const test = value as Row;
      if ("in" in test) return (test.in as unknown[]).includes(row[key]);
      if ("some" in test)
        return (row[key] as Row[]).some((part) =>
          matches(part, test.some as Row),
        );
      return !!row[key] && matches(row[key] as Row, test);
    }
    return row[key] === value;
  });
}
const related = (doc: Doc) => ({
  ...doc,
  user: users.get(doc.userId),
  sharedBranch: {
    users: [...users.values()].filter(
      (user) => user.branchId === doc.sharedBranchId,
    ),
  },
  assets: links.filter(
    (link) => link.userId === doc.userId && link.documentId === doc.id,
  ),
});
const find = (userId: string, id: string) =>
  docs.find((doc) => doc.userId === userId && doc.id === id);
const req = (method = "GET", query = "", body?: unknown) =>
  new Request(`http://localhost/api/library/documents/same-id${query}`, {
    method,
    headers: { origin: "http://localhost", "x-workspace-owner": viewer },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const shareQuery = `?ownerId=${colleague}`;
const saveBody = (patch: Row = {}) => ({
  kind: "draft",
  title: "내 시험",
  payload: { problems: [] },
  expectedRevision: 1,
  ...patch,
});

beforeEach(() => {
  vi.resetAllMocks();
  account = {
    id: viewer,
    name: "나",
    email: "me@example.test",
    role: "director",
    isAdmin: false,
    approvalStatus: "approved",
    menus: ["library", "export", "studio", "conceptBlank"],
    branchId: branch,
  };
  users = new Map(
    [viewer, colleague].map((id) => [
      id,
      {
        id,
        name: id === viewer ? "나" : "동료",
        branchId: branch,
        deletedAt: null,
        suspendedAt: null,
        approvalStatus: "approved",
      },
    ]),
  );
  docs = [viewer, colleague].map((userId) => ({
    userId,
    id: "same-id",
    kind: "draft",
    title: userId === viewer ? "내 시험" : "동료 시험",
    payload: { problems: [] },
    revision: 1,
    visibility: userId === viewer ? "private" : "branch",
    sharedBranchId: userId === viewer ? null : branch,
    createdAt: date,
    updatedAt: date,
    problemCount: 0,
  }));
  assets = [hash, unrelatedHash].map((id) => ({
    id,
    userId: colleague,
    bytes: new Uint8Array([1, 2]),
    size: 2,
    mimeType: "image/png",
    name: "그림",
  }));
  links = [{ userId: colleague, documentId: "same-id", assetId: hash }];
  mocks.authorize.mockImplementation(async () => ({
    account: { ...account },
    response: null,
  }));
  mocks.user.findFirst.mockImplementation(
    async ({ where }: { where: Row }) =>
      [...users.values()].find((row) => matches(row, where)) ?? null,
  );
  mocks.document.findFirst.mockImplementation(
    async ({ where }: { where: Row }) =>
      docs.map(related).find((row) => matches(row, where)) ?? null,
  );
  mocks.document.findMany.mockImplementation(
    async ({ where }: { where: Row }) =>
      docs.map(related).filter((row) => matches(row, where)),
  );
  mocks.document.count.mockImplementation(
    async ({ where }: { where: Row }) =>
      docs.map(related).filter((row) => matches(row, where)).length,
  );
  mocks.document.findUnique.mockImplementation(
    async ({
      where,
    }: {
      where: { userId_id: { userId: string; id: string } };
    }) => {
      const doc = find(where.userId_id.userId, where.userId_id.id);
      return doc ? related(doc) : null;
    },
  );
  mocks.document.findUniqueOrThrow.mockImplementation(
    mocks.document.findUnique,
  );
  mocks.document.create.mockImplementation(
    async ({ data }: { data: Partial<Doc> }) => {
      const doc = {
        revision: 1,
        createdAt: date,
        updatedAt: date,
        visibility: "private",
        sharedBranchId: null,
        ...data,
      } as Doc;
      docs.push(doc);
      return doc;
    },
  );
  mocks.document.updateMany.mockImplementation(
    async ({ where, data }: { where: Row; data: Row }) => {
      const rows = docs.filter((doc) => matches(doc, where));
      for (const doc of rows)
        Object.assign(doc, data, { revision: doc.revision + 1 });
      return { count: rows.length };
    },
  );
  mocks.asset.findUnique.mockImplementation(
    async ({ where }: { where: { userId_id: Row } }) =>
      assets.find((row) => matches(row, where.userId_id)) ?? null,
  );
  mocks.asset.findFirst.mockImplementation(
    async ({ where }: { where: Row }) =>
      assets
        .map((asset) => ({
          ...asset,
          documents: links
            .filter(
              (link) =>
                link.userId === asset.userId && link.assetId === asset.id,
            )
            .map((link) => ({
              ...link,
              document: related(find(link.userId, link.documentId)!),
            })),
        }))
        .find((asset) => matches(asset, where)) ?? null,
  );
  mocks.asset.upsert.mockImplementation(
    async ({ create }: { create: (typeof assets)[number] }) => {
      assets.push(create);
      return create;
    },
  );
  mocks.link.deleteMany.mockImplementation(
    async ({ where }: { where: Row }) => {
      links = links.filter((row) => !matches(row, where));
    },
  );
  mocks.link.createMany.mockImplementation(
    async ({ data }: { data: typeof links }) => {
      links.push(...data);
    },
  );
});

describe("branch library read boundaries", () => {
  it("returns both colliding document IDs with distinct authors and filters to mine on demand", async () => {
    const response = await listDocuments(req());
    expect(response.headers.get("cache-control")).toContain("no-store");
    const result = await response.json();
    expect(result.meta.total).toBe(2);
    expect(
      result.data.map((doc: Row) => [
        doc.id,
        doc.ownerId,
        doc.ownerName,
        doc.isOwner,
      ]),
    ).toEqual([
      ["same-id", viewer, "나", true],
      ["same-id", colleague, "동료", false],
    ]);
    expect(
      (await (await listDocuments(req("GET", "?mine=true"))).json()).data.map(
        (doc: Row) => doc.ownerId,
      ),
    ).toEqual([viewer]);
    expect(
      (await (await readDocument(req("GET", shareQuery), "same-id")).json())
        .data.ownerId,
    ).toBe(colleague);
  });
  it.each([
    "private",
    "viewer-moved",
    "owner-moved",
    "independent",
    "deleted",
    "suspended",
    "unapproved",
  ])("hides shared documents and copies after %s", async (change) => {
    if (change === "private") docs[1].visibility = "private";
    if (change === "viewer-moved") users.get(viewer)!.branchId = elsewhere;
    if (change === "owner-moved") users.get(colleague)!.branchId = elsewhere;
    if (change === "independent") users.get(viewer)!.branchId = null;
    if (change === "deleted") users.get(colleague)!.deletedAt = date;
    if (change === "suspended") users.get(colleague)!.suspendedAt = date;
    if (change === "unapproved")
      users.get(colleague)!.approvalStatus = "pending";
    expect((await (await listDocuments(req())).json()).meta.total).toBe(1);
    expect((await readDocument(req("GET", shareQuery), "same-id")).status).toBe(
      404,
    );
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(404);
  });
  it("does not treat branch admin privilege as access to private colleague documents", async () => {
    account.isAdmin = true;
    docs[1].visibility = "private";
    expect((await readDocument(req("GET", shareQuery), "same-id")).status).toBe(
      404,
    );
  });
  it.each(["deletedAt", "suspendedAt", "approvalStatus"])(
    "denies the caller immediately after %s changes despite a stale session",
    async (field) => {
      users.get(viewer)![field] = field === "approvalStatus" ? "pending" : date;
      expect((await listDocuments(req())).status).toBe(403);
      expect(
        (await readDocument(req("GET", shareQuery), "same-id")).status,
      ).toBe(403);
      expect(
        (await copyDocument(req("POST", shareQuery), "same-id")).status,
      ).toBe(403);
      expect(
        (
          await readPrivateAsset(
            new Request(
              `http://localhost/api/library/assets/${hash}${shareQuery}&documentId=same-id`,
            ),
            hash,
          )
        ).status,
      ).toBe(403);
      expect(
        (await saveDocument(req("PUT", "", saveBody()), "same-id")).status,
      ).toBe(403);
    },
  );
});

describe("author mutations and explicit scope", () => {
  it("rejects colleague save, rename and delete even when an own document has the same ID", async () => {
    expect(
      (await saveDocument(req("PUT", shareQuery, saveBody()), "same-id"))
        .status,
    ).toBe(403);
    expect(
      (
        await renameDocument(
          req("PATCH", shareQuery, { title: "침범", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteDocument(
          req("DELETE", `${shareQuery}&revision=1`),
          "same-id",
        )
      ).status,
    ).toBe(403);
    expect(mocks.document.updateMany).not.toHaveBeenCalled();
    expect(mocks.document.deleteMany).not.toHaveBeenCalled();
  });
  it("keeps new and existing documents private without an explicit scope and requires the current branch", async () => {
    expect(
      (await saveDocument(req("PUT", "", saveBody()), "same-id")).status,
    ).toBe(200);
    expect(docs[0]).toMatchObject({
      visibility: "private",
      sharedBranchId: null,
    });
    expect(
      (
        await saveDocument(
          req("PUT", "", saveBody({ expectedRevision: null })),
          "new-id",
        )
      ).status,
    ).toBe(200);
    expect(find(viewer, "new-id")).toMatchObject({
      visibility: "private",
      sharedBranchId: null,
    });
    users.get(viewer)!.branchId = elsewhere;
    expect(
      (
        await saveDocument(
          req(
            "PUT",
            "",
            saveBody({
              visibility: "branch",
              sharedBranchId: branch,
              expectedRevision: 2,
            }),
          ),
          "same-id",
        )
      ).status,
    ).toBe(409);
    users.get(viewer)!.branchId = null;
    expect(
      (
        await saveDocument(
          req(
            "PUT",
            "",
            saveBody({
              visibility: "branch",
              sharedBranchId: branch,
              expectedRevision: 2,
            }),
          ),
          "same-id",
        )
      ).status,
    ).toBe(409);
  });
  it("shares, preserves scope on autosave, and revokes only at the expected revision", async () => {
    await saveDocument(
      req(
        "PUT",
        "",
        saveBody({ visibility: "branch", sharedBranchId: branch }),
      ),
      "same-id",
    );
    expect(docs[0]).toMatchObject({
      visibility: "branch",
      sharedBranchId: branch,
      revision: 2,
    });
    await saveDocument(
      req("PUT", "", saveBody({ expectedRevision: 2 })),
      "same-id",
    );
    expect(docs[0]).toMatchObject({ visibility: "branch", revision: 3 });
    expect(
      (
        await saveDocument(
          req(
            "PUT",
            "",
            saveBody({
              visibility: "private",
              sharedBranchId: null,
              expectedRevision: 2,
            }),
          ),
          "same-id",
        )
      ).status,
    ).toBe(409);
    await saveDocument(
      req(
        "PUT",
        "",
        saveBody({
          visibility: "private",
          sharedBranchId: null,
          expectedRevision: 3,
        }),
      ),
      "same-id",
    );
    expect(docs[0]).toMatchObject({
      visibility: "private",
      sharedBranchId: null,
      revision: 4,
    });
  });
  it("does not migrate a previous share into the author's new branch during autosave", async () => {
    docs[0].visibility = "branch";
    docs[0].sharedBranchId = branch;
    users.get(viewer)!.branchId = elsewhere;
    await saveDocument(req("PUT", "", saveBody()), "same-id");
    expect(docs[0]).toMatchObject({
      visibility: "private",
      sharedBranchId: null,
    });
  });
});

describe("document-bound assets and independent copies", () => {
  const assetRequest = (query = `${shareQuery}&documentId=same-id`) =>
    new Request(`http://localhost/api/library/assets/${hash}${query}`);
  it("requires the exact shared document and refuses arbitrary owner/hash requests", async () => {
    expect(
      (await readPrivateAsset(assetRequest(shareQuery), hash)).status,
    ).toBe(404);
    expect((await readPrivateAsset(assetRequest(), unrelatedHash)).status).toBe(
      404,
    );
    expect((await readPrivateAsset(assetRequest(), hash)).status).toBe(200);
    docs[1].visibility = "private";
    expect((await readPrivateAsset(assetRequest(), hash)).status).toBe(404);
    docs[1].visibility = "branch";
    users.get(viewer)!.branchId = elsewhere;
    expect((await readPrivateAsset(assetRequest(), hash)).status).toBe(404);
    users.get(viewer)!.branchId = branch;
    users.get(colleague)!.branchId = elsewhere;
    expect((await readPrivateAsset(assetRequest(), hash)).status).toBe(404);
  });
  it("indexes only complete owned assets and removes obsolete links when payload changes", async () => {
    const payload = {
      problems: [{ content: `![](/api/library/assets/${hash})` }],
    };
    expect(
      (await saveDocument(req("PUT", "", saveBody({ payload })), "same-id"))
        .status,
    ).toBe(400);
    assets.push({ ...assets[0], userId: viewer });
    await saveDocument(
      req(
        "PUT",
        "",
        saveBody({ payload, visibility: "branch", sharedBranchId: branch }),
      ),
      "same-id",
    );
    expect(links).toContainEqual({
      userId: viewer,
      documentId: "same-id",
      assetId: hash,
    });
    await saveDocument(
      req("PUT", "", saveBody({ expectedRevision: 2 })),
      "same-id",
    );
    expect(links.filter((link) => link.userId === viewer)).toEqual([]);
    expect(
      (
        await saveDocument(
          req(
            "PUT",
            "",
            saveBody({
              expectedRevision: 3,
              payload: {
                problems: [
                  {
                    image: `/api/library/assets/${hash}${shareQuery}&documentId=same-id`,
                  },
                ],
              },
            }),
          ),
          "same-id",
        )
      ).status,
    ).toBe(400);
  });
  it("opens a shared extraction as a new private copy with its own files that survive revocation", async () => {
    docs[1].kind = "extraction";
    docs[1].payload = {
      data: { crops: [{ content: `![](/api/library/assets/${hash})` }] },
      assets: { source: hash },
    };
    const original = structuredClone(docs[1]);
    const response = await copyDocument(req("POST", shareQuery), "same-id");
    expect(response.status).toBe(200);
    const copy = (await response.json()).data;
    expect(copy).toMatchObject({
      ownerId: viewer,
      visibility: "private",
      sharedBranchId: null,
      revision: 1,
    });
    expect(copy.id).not.toBe("same-id");
    expect(docs[1]).toEqual(original);
    expect(docs[0].title).toBe("내 시험");
    docs[1].visibility = "private";
    expect((await readPrivateAsset(assetRequest(), hash)).status).toBe(404);
    expect((await readPrivateAsset(assetRequest(""), hash)).status).toBe(200);
    expect(links).toContainEqual({
      userId: viewer,
      documentId: copy.id,
      assetId: hash,
    });
  });
  it("requires the source editor menu to create a copy", async () => {
    account.menus = ["library"];
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(403);
    expect(mocks.document.create).not.toHaveBeenCalled();
  });
});

describe("arithmetic document persistence", () => {
  let sheet: ArithmeticSheetPayload;
  const saveSheet = (patch: Row = {}) =>
    saveBody({
      kind: "arithmeticSheet",
      payload: sheet,
      title: "연산 연습",
      ...patch,
    });

  beforeEach(() => {
    vi.stubEnv("ARITHMETIC_SHEET_WRITE", "on");
    account.menus = ["arithmetic"];
    sheet = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "stored-snapshot",
      rounds: [3, 2].map((count) => ({
        skills: [
          {
            skillId: "one-digit-add",
            count,
            constraints: {
              carry: "none",
              left: { min: 0, max: 9 },
              right: { min: 0, max: 9 },
            },
          },
        ],
      })),
    });
    for (const doc of docs)
      Object.assign(doc, {
        kind: "arithmeticSheet",
        payload: structuredClone(sheet),
        problemCount: 5,
      });
    mocks.document.deleteMany.mockImplementation(
      async ({ where }: { where: Row }) => {
        const before = docs.length;
        docs = docs.filter((doc) => !matches(doc, where));
        return { count: before - docs.length };
      },
    );
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "off", "true", "ON", "on "])(
    "blocks all arithmetic writes with gate=%s before changing storage",
    async (gate) => {
      vi.stubEnv("ARITHMETIC_SHEET_WRITE", gate);
      const before = structuredClone(docs);
      const responses = [
        await saveDocument(req("PUT", "", saveSheet()), "same-id"),
        await saveDocument(
          req("PUT", "", saveSheet({ expectedRevision: null })),
          "new-sheet",
        ),
        await copyDocument(req("POST", shareQuery), "same-id"),
        await renameDocument(
          req("PATCH", "", { title: "새 이름", expectedRevision: 1 }),
          "same-id",
        ),
        await deleteDocument(req("DELETE", "?revision=1"), "same-id"),
      ];
      for (const response of responses) {
        expect(response.status).toBe(503);
        expect((await response.json()).error.code).toBe(
          "ARITHMETIC_WRITE_DISABLED",
        );
      }
      expect(docs).toEqual(before);
      expect(mocks.document.create).not.toHaveBeenCalled();
      expect(mocks.document.updateMany).not.toHaveBeenCalled();
      expect(mocks.document.deleteMany).not.toHaveBeenCalled();
      expect(mocks.asset.upsert).not.toHaveBeenCalled();
      expect(mocks.link.deleteMany).not.toHaveBeenCalled();
      expect(mocks.audit.create).not.toHaveBeenCalled();
    },
  );

  it("keeps list and verified snapshot reads usable with writers off and makes no usage writes", async () => {
    vi.stubEnv("ARITHMETIC_SHEET_WRITE", undefined);
    // A valid stored snapshot is authoritative; a seed is not a command to re-generate.
    sheet.seed = "different-seed-after-generation";
    for (const round of sheet.rounds)
      for (const item of round.items) item.spec.seed = sheet.seed;
    docs[0].payload = structuredClone(sheet);
    docs.push({
      ...docs[0],
      id: "old-draft",
      kind: "draft",
      payload: { problems: [] },
    });
    const result = await readDocument(req(), "same-id");
    expect(result.status).toBe(200);
    expect((await result.json()).data.payload).toEqual(sheet);
    expect(result.headers.get("cache-control")).toContain("no-store");
    const listing = await listDocuments(req());
    expect((await listing.json()).data.map((doc: Doc) => doc.kind)).toEqual([
      "arithmeticSheet",
      "arithmeticSheet",
    ]);
    expect(mocks.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: "arithmeticSheet" }),
        select: expect.not.objectContaining({ payload: true }),
      }),
    );
    expect(mocks.document.updateMany).not.toHaveBeenCalled();
    expect(mocks.document.create).not.toHaveBeenCalled();
    expect(mocks.audit.create).not.toHaveBeenCalled();
  });

  it("saves privately, computes the count, reopens unchanged, and rejects stale revisions", async () => {
    const created = await saveDocument(
      req("PUT", "", saveSheet({ expectedRevision: null })),
      "new-sheet",
    );
    expect(created.status).toBe(200);
    expect((await created.json()).data).toMatchObject({
      kind: "arithmeticSheet",
      ownerId: viewer,
      payload: sheet,
      problemCount: 5,
      revision: 1,
      visibility: "private",
      sharedBranchId: null,
    });
    const updated = await saveDocument(
      req("PUT", "", saveSheet({ title: "2회 연습" })),
      "new-sheet",
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).data.revision).toBe(2);
    expect(
      (await saveDocument(req("PUT", "", saveSheet()), "new-sheet")).status,
    ).toBe(409);
    expect(
      (await (await readDocument(req(), "new-sheet")).json()).data.payload,
    ).toEqual(sheet);
    expect(mocks.asset.upsert).not.toHaveBeenCalled();
    expect(mocks.link.createMany).not.toHaveBeenCalled();
  });

  it("copies a shared snapshot privately with a new identity and a verified count", async () => {
    docs[1].problemCount = 999; // Do not trust a stale summary when copying.
    const original = structuredClone(docs[1]);
    const response = await copyDocument(req("POST", shareQuery), "same-id");
    expect(response.status).toBe(200);
    const copy = (await response.json()).data;
    expect(copy).toMatchObject({
      ownerId: viewer,
      kind: "arithmeticSheet",
      payload: sheet,
      problemCount: 5,
      visibility: "private",
      sharedBranchId: null,
      revision: 1,
    });
    expect(copy.id).not.toBe("same-id");
    expect(docs[1]).toEqual(original);
    expect(
      (await (await readDocument(req(), copy.id)).json()).data.payload,
    ).toEqual(sheet);
    expect(mocks.asset.upsert).not.toHaveBeenCalled();
  });

  it("renames only document metadata and preserves optimistic deletion", async () => {
    const renamed = await renameDocument(
      req("PATCH", "", { title: "새 이름", expectedRevision: 1 }),
      "same-id",
    );
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).data).toMatchObject({
      title: "새 이름",
      revision: 2,
      payload: sheet,
    });
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "오래된 이름", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(409);
    expect(
      (await deleteDocument(req("DELETE", "?revision=1"), "same-id")).status,
    ).toBe(409);
    expect(
      (await deleteDocument(req("DELETE", "?revision=2"), "same-id")).status,
    ).toBe(200);
    expect(find(viewer, "same-id")).toBeUndefined();
    expect(find(colleague, "same-id")).toBeDefined();
  });

  it.each([
    [
      "answer",
      (payload: ArithmeticSheetPayload) => {
        payload.rounds[0].items[0].answer = "999";
      },
    ],
    [
      "prompt",
      (payload: ArithmeticSheetPayload) => {
        payload.rounds[0].items[0].prompt = {
          notation: "horizontal",
          operator: "+",
          operands: [9, 9],
          expression: "9+9",
        };
      },
    ],
    [
      "version",
      (payload: ArithmeticSheetPayload) => {
        Object.assign(payload, { payloadVersion: 2 });
      },
    ],
    [
      "order",
      (payload: ArithmeticSheetPayload) => {
        payload.rounds[0].items[0].order = 2;
      },
    ],
    [
      "duplicate",
      (payload: ArithmeticSheetPayload) => {
        const item = structuredClone(payload.rounds[0].items[0]);
        item.order = 2;
        item.spec.order = 2;
        payload.rounds[0].items[1] = item;
      },
    ],
    [
      "foreign field",
      (payload: ArithmeticSheetPayload) => {
        Object.assign(payload, { usageCount: 10 });
      },
    ],
  ] as const)(
    "rejects %s tampering on save, reopen, copy and rename",
    async (_name, mutate) => {
      mutate(sheet);
      docs[0].payload = structuredClone(sheet);
      docs[1].payload = structuredClone(sheet);
      const before = structuredClone(docs);
      for (const response of [
        await saveDocument(req("PUT", "", saveSheet()), "same-id"),
        await readDocument(req(), "same-id"),
        await readDocument(req("GET", shareQuery), "same-id"),
        await copyDocument(req("POST", shareQuery), "same-id"),
        await renameDocument(
          req("PATCH", "", { title: "새 이름", expectedRevision: 1 }),
          "same-id",
        ),
      ])
        expect(response.status).toBe(400);
      expect(docs).toEqual(before);
      expect(mocks.document.create).not.toHaveBeenCalled();
      expect(mocks.document.updateMany).not.toHaveBeenCalled();
      expect(mocks.audit.create).not.toHaveBeenCalled();
    },
  );

  it("enforces the saved snapshot total quota, including shared copies", async () => {
    const oversized = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "quota",
      rounds: [
        {
          skills: [
            {
              skillId: "two-digit-vertical-add",
              count: 200,
              constraints: {
                carryCount: 0,
                left: { min: 10, max: 99 },
                right: { min: 10, max: 99 },
              },
            },
          ],
        },
      ],
    });
    oversized.rounds = Array.from({ length: 11 }, (_, i) => ({
      round: i + 1,
      items: oversized.rounds[0].items.map((item) => ({
        ...structuredClone(item),
        spec: { ...structuredClone(item.spec), round: i + 1 },
      })),
    }));
    docs[1].payload = oversized;
    expect(
      (
        await saveDocument(
          req("PUT", "", saveSheet({ payload: oversized })),
          "same-id",
        )
      ).status,
    ).toBe(400);
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(400);
    expect(mocks.document.create).not.toHaveBeenCalled();
  });

  it("accepts a historical-size valid sheet and rejects ambiguous duplicate JSON keys", async () => {
    const maximum = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "x".repeat(128),
      rounds: [
        {
          skills: [
            {
              skillId: "two-digit-vertical-add",
              count: 100,
              constraints: {
                carryCount: 0,
                left: { min: 10, max: 99 },
                right: { min: 10, max: 99 },
              },
            },
          ],
        },
      ],
    });
    const saved = await saveDocument(
      req("PUT", "", saveSheet({ payload: maximum })),
      "same-id",
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).data).toMatchObject({
      problemCount: 100,
      revision: 2,
      payload: maximum,
    });
    const ambiguous = JSON.stringify(
      saveSheet({ expectedRevision: 2 }),
    ).replace(
      '"expectedRevision":2',
      '"expectedRevision":1,"expectedRevision":2',
    );
    const response = await saveDocument(
      new Request("http://localhost/api/library/documents/same-id", {
        method: "PUT",
        headers: { origin: "http://localhost" },
        body: ambiguous,
      }),
      "same-id",
    );
    expect(response.status).toBe(400);
    expect(find(viewer, "same-id")!.revision).toBe(2);
  });

  it.each(["private", "owner-moved", "viewer-moved", "owner-suspended"])(
    "rejects shared arithmetic read and copy after %s",
    async (change) => {
      if (change === "private") docs[1].visibility = "private";
      if (change === "owner-moved") users.get(colleague)!.branchId = elsewhere;
      if (change === "viewer-moved") users.get(viewer)!.branchId = elsewhere;
      if (change === "owner-suspended")
        users.get(colleague)!.suspendedAt = date;
      expect(
        (await readDocument(req("GET", shareQuery), "same-id")).status,
      ).toBe(404);
      expect(
        (await copyDocument(req("POST", shareQuery), "same-id")).status,
      ).toBe(404);
      expect(mocks.document.create).not.toHaveBeenCalled();
    },
  );

  it("never allows a colleague to mutate the original and validates current branch sharing", async () => {
    expect(
      (await saveDocument(req("PUT", shareQuery, saveSheet()), "same-id"))
        .status,
    ).toBe(403);
    expect(
      (
        await renameDocument(
          req("PATCH", shareQuery, { title: "이름", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteDocument(
          req("DELETE", `${shareQuery}&revision=1`),
          "same-id",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await saveDocument(
          req(
            "PUT",
            "",
            saveSheet({ visibility: "branch", sharedBranchId: elsewhere }),
          ),
          "same-id",
        )
      ).status,
    ).toBe(409);
    const shared = await saveDocument(
      req(
        "PUT",
        "",
        saveSheet({ visibility: "branch", sharedBranchId: branch }),
      ),
      "same-id",
    );
    expect(shared.status).toBe(200);
    expect((await shared.json()).data).toMatchObject({
      visibility: "branch",
      sharedBranchId: branch,
    });
  });

  it("keeps legacy storage inaccessible to arithmetic-only accounts", async () => {
    docs[0].kind = "draft";
    docs[0].payload = { problems: [] };
    docs[1].kind = "draft";
    docs[1].payload = { problems: [] };
    expect((await readDocument(req(), "same-id")).status).toBe(404);
    expect((await listDocuments(req("GET", "?kind=draft"))).status).toBe(403);
    expect(
      (await saveDocument(req("PUT", "", saveBody()), "same-id")).status,
    ).toBe(403);
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(403);
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "이름", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(403);
    expect(
      (await deleteDocument(req("DELETE", "?revision=1"), "same-id")).status,
    ).toBe(403);
    expect((await readPrivateAsset(req(), hash)).status).toBe(403);
    expect(mocks.document.updateMany).not.toHaveBeenCalled();
    expect(mocks.document.deleteMany).not.toHaveBeenCalled();
  });

  it("retains library management but requires the arithmetic menu to save or copy arithmetic", async () => {
    account.menus = ["library"];
    expect((await readDocument(req(), "same-id")).status).toBe(200);
    expect(
      (await listDocuments(req("GET", "?kind=arithmeticSheet"))).status,
    ).toBe(200);
    expect(
      (await saveDocument(req("PUT", "", saveSheet()), "same-id")).status,
    ).toBe(403);
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(403);
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "이름", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(200);
    expect(
      (await deleteDocument(req("DELETE", "?revision=2"), "same-id")).status,
    ).toBe(200);
  });

  it("keeps arithmetic sheets closed to a bank-only account — 연산대장 no longer rides on 시험지 만들기 (2026-10-16)", async () => {
    account.menus = ["bank"];
    expect((await readDocument(req(), "same-id")).status).toBe(403);
    expect(
      (await listDocuments(req("GET", "?kind=arithmeticSheet"))).status,
    ).toBe(403);
    expect(
      (await saveDocument(req("PUT", "", saveSheet()), "same-id")).status,
    ).toBe(403);
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(403);
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "이름", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(403);
    expect(
      (await deleteDocument(req("DELETE", "?revision=1"), "same-id")).status,
    ).toBe(403);
    expect(mocks.document.create).not.toHaveBeenCalled();
    expect(mocks.document.updateMany).not.toHaveBeenCalled();
    expect(mocks.document.deleteMany).not.toHaveBeenCalled();
  });

  it("cannot convert an existing kind to bypass revision or writer rules", async () => {
    account.menus = ["arithmetic", "export"];
    vi.stubEnv("ARITHMETIC_SHEET_WRITE", "off");
    expect(
      (await saveDocument(req("PUT", "", saveBody()), "same-id")).status,
    ).toBe(409);
    expect(mocks.document.updateMany).not.toHaveBeenCalled();
  });
});

describe("v2 arithmetic snapshot persistence alongside v1", () => {
  const sheet = () => buildArithmeticV2Sheet(fixtureRequest(3));
  const save = (
    payload: unknown = sheet(),
    expectedRevision: number | null = null,
  ) =>
    saveBody({
      kind: "arithmeticSheet",
      title: "학년 연산",
      payload,
      expectedRevision,
    });
  beforeEach(() => {
    account.menus = ["arithmetic"];
    vi.stubEnv("ARITHMETIC_SHEET_WRITE", "on");
    for (const doc of docs)
      Object.assign(doc, {
        kind: "arithmeticSheet",
        payload: sheet(),
        problemCount: 999,
      });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("saves and reads 2000 items beyond 256KiB with bounded response bytes", async () => {
    const request = fixtureRequest(200, "test-large");
    request.rounds = Array.from({ length: 10 }, () => request.rounds[0]);
    const payload = buildArithmeticV2Sheet(request);
    const body = save(payload);
    expect(
      new TextEncoder().encode(JSON.stringify(body)).length,
    ).toBeGreaterThan(256 * 1024);
    const response = await saveDocument(req("PUT", "", body), "large-v2");
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(new TextEncoder().encode(text).length).toBeLessThan(3_500_000);
    expect(JSON.parse(text).data).toMatchObject({
      payload,
      problemCount: 2000,
    });
    const read = await readDocument(req(), "large-v2");
    expect(read.status).toBe(200);
    const reopened = await read.text();
    expect(new TextEncoder().encode(reopened).length).toBeLessThan(3_500_000);
    expect(JSON.parse(reopened).data.payload).toEqual(payload);
  });

  it("saves, reopens and copies exact v2 snapshots with recomputed counts", async () => {
    const payload = sheet();
    payload.seed = "stored-seed-is-not-a-regeneration-command";
    const saved = await saveDocument(req("PUT", "", save(payload)), "new-v2");
    expect(saved.status).toBe(200);
    expect((await saved.json()).data).toMatchObject({
      payload,
      problemCount: 3,
      revision: 1,
      visibility: "private",
    });
    expect(
      (await (await readDocument(req(), "new-v2")).json()).data.payload,
    ).toEqual(payload);
    const copy = await copyDocument(req("POST", shareQuery), "same-id");
    expect(copy.status).toBe(200);
    const copied = (await copy.json()).data;
    expect(copied).toMatchObject({
      payload: sheet(),
      problemCount: 3,
      revision: 1,
      visibility: "private",
      sharedBranchId: null,
    });
    expect(copied.id).not.toBe("same-id");
    expect(
      (await (await readDocument(req(), copied.id)).json()).data.payload,
    ).toEqual(sheet());
    expect(mocks.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "material.copied",
          details: expect.objectContaining({
            documentId: copied.id,
            sourceDocumentId: "same-id",
          }),
        }),
      }),
    );
    expect(mocks.asset.upsert).not.toHaveBeenCalled();
    expect(
      (await saveDocument(req("PUT", "", save(payload, 0)), "new-v2")).status,
    ).toBe(409);
  });
  it.each([undefined, "off", "true"])(
    "blocks every v2 write with flag %s while keeping reads usable",
    async (flag) => {
      vi.stubEnv("ARITHMETIC_SHEET_WRITE", flag);
      const before = structuredClone(docs);
      for (const response of [
        await saveDocument(req("PUT", "", save()), "new-v2"),
        await copyDocument(req("POST", shareQuery), "same-id"),
        await renameDocument(
          req("PATCH", "", { title: "new", expectedRevision: 1 }),
          "same-id",
        ),
        await deleteDocument(req("DELETE", "?revision=1"), "same-id"),
      ])
        expect(response.status).toBe(503);
      expect((await readDocument(req(), "same-id")).status).toBe(200);
      expect(
        (await readDocument(req("GET", shareQuery), "same-id")).status,
      ).toBe(200);
      expect(docs).toEqual(before);
      expect(mocks.document.create).not.toHaveBeenCalled();
      expect(mocks.document.updateMany).not.toHaveBeenCalled();
      expect(mocks.audit.create).not.toHaveBeenCalled();
    },
  );
  it("preserves v1 data in the same private library and rejects mixed/unknown versions", async () => {
    const v1 = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "existing-v1",
      rounds: [
        {
          skills: [
            {
              skillId: "one-digit-add",
              count: 2,
              constraints: {
                carry: "none",
                left: { min: 0, max: 9 },
                right: { min: 0, max: 9 },
              },
            },
          ],
        },
      ],
    });
    docs[0].payload = v1;
    expect(
      (await (await readDocument(req(), "same-id")).json()).data.payload,
    ).toEqual(v1);
    expect(
      (await saveDocument(req("PUT", "", save(v1)), "v1-copy")).status,
    ).toBe(200);
    for (const payload of [
      { ...sheet(), payloadVersion: 1 },
      { ...v1, payloadVersion: 2 },
      { ...sheet(), engineVersion: "future" },
    ])
      expect(
        (await saveDocument(req("PUT", "", save(payload)), "bad-version"))
          .status,
      ).toBe(400);
  });
  it("rejects tampered stored prompts on read, rename and copy without updating storage", async () => {
    for (const doc of docs) {
      const payload = sheet();
      payload.rounds[0].items[0].answer.text = "wrong";
      doc.payload = payload;
    }
    const before = structuredClone(docs);
    expect((await readDocument(req(), "same-id")).status).toBe(400);
    expect((await readDocument(req("GET", shareQuery), "same-id")).status).toBe(
      400,
    );
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "new", expectedRevision: 1 }),
          "same-id",
        )
      ).status,
    ).toBe(400);
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(400);
    expect(docs).toEqual(before);
    expect(mocks.document.create).not.toHaveBeenCalled();
    expect(mocks.document.updateMany).not.toHaveBeenCalled();
  });
  it("applies owner/menu checks to v2 saves and reads", async () => {
    expect(
      (await saveDocument(req("PUT", shareQuery, save(sheet(), 1)), "same-id"))
        .status,
    ).toBe(403);
    account.menus = ["library"];
    expect((await saveDocument(req("PUT", "", save()), "no-bank")).status).toBe(
      403,
    );
    expect(
      (await copyDocument(req("POST", shareQuery), "same-id")).status,
    ).toBe(403);
  });
});

// 2026-10-16 W5 «이름 붙인 출제 조건» — 같은 표에 담지만 자료가 아니다. 자료 길은 어느 것도 이 행을 보이거나 바꾸지 않는다.
describe("exam conditions never surface through the library document routes", () => {
  const condition = (patch: Partial<Doc> = {}): Doc => ({
    userId: viewer,
    id: "cond-1",
    kind: "examCondition",
    title: "중2 확인 · 부등식 18",
    payload: { v: 1, name: "중2 확인 · 부등식 18" },
    revision: 1,
    visibility: "private",
    sharedBranchId: null,
    createdAt: date,
    updatedAt: date,
    problemCount: 0,
    ...patch,
  });
  beforeEach(() => {
    docs.push(condition());
    mocks.document.deleteMany.mockImplementation(
      async ({ where }: { where: Row }) => {
        const before = docs.length;
        docs = docs.filter((doc) => !matches(doc, where));
        return { count: before - docs.length };
      },
    );
  });
  const listed = async (query = "") =>
    (await (await listDocuments(req("GET", query))).json()) as {
      data: Row[];
      meta: { total: number };
    };

  it("is left out of 내 시험지 · 우리학원 시험지 lists and their counts, with or without a kind filter", async () => {
    for (const query of ["", "?mine=true"]) {
      const body = await listed(query);
      expect(body.data.map((doc) => doc.kind)).not.toContain("examCondition");
      expect(body.meta.total).toBe(query ? 1 : 2);
    }
    const asKind = await listDocuments(req("GET", "?kind=examCondition"));
    const body = await asKind.json();
    expect(body.data ?? []).toEqual([]);
    expect(body.meta?.total ?? 0).toBe(0);
  });

  it("is left out of the admin's per-user document list (owner view)", async () => {
    account = { ...account, isAdmin: true };
    const body = await (await listDocuments(req(), viewer)).json();
    expect(body.data.map((doc: Row) => doc.kind)).not.toContain(
      "examCondition",
    );
    expect(body.meta.total).toBe(1);
  });

  it("cannot be read, saved over, renamed, deleted or copied as a document", async () => {
    const before = structuredClone(docs);
    expect((await readDocument(req(), "cond-1")).status).toBe(404);
    expect(
      (
        await saveDocument(
          req("PUT", "", {
            kind: "examCondition",
            title: "x",
            payload: {},
            expectedRevision: 1,
          }),
          "cond-1",
        )
      ).status,
    ).toBe(400);
    // 같은 id 로 자료를 덮어쓰려 해도 종류가 달라 막힌다.
    expect(
      (await saveDocument(req("PUT", "", saveBody()), "cond-1")).status,
    ).toBe(409);
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "새 이름", expectedRevision: 1 }),
          "cond-1",
        )
      ).status,
    ).toBe(409);
    expect(
      (await deleteDocument(req("DELETE", "?revision=1"), "cond-1")).status,
    ).toBe(409);
    expect(docs).toEqual(before);
  });

  it("is never offered to a colleague even if a row were marked branch", async () => {
    docs.push(
      condition({
        userId: colleague,
        id: "cond-2",
        visibility: "branch",
        sharedBranchId: branch,
      }),
    );
    const body = await listed();
    expect(body.data.map((doc) => doc.kind)).not.toContain("examCondition");
    expect((await readDocument(req("GET", shareQuery), "cond-2")).status).toBe(
      404,
    );
    expect((await copyDocument(req("POST", shareQuery), "cond-2")).status).toBe(
      404,
    );
  });
});

// 2026-10-16 W6 «내 양식» — 출제 조건처럼 같은 표에 담지만 자료가 아니다. 자료 길은 어느 것도 이 행을 보이거나 바꾸지 않는다.
describe("print presets never surface through the library document routes", () => {
  const printPreset = (patch: Partial<Doc> = {}): Doc => ({
    userId: viewer,
    id: "preset-1",
    kind: "printPreset",
    title: "일일TEST 2단",
    payload: { v: 1, name: "일일TEST 2단" },
    revision: 1,
    visibility: "private",
    sharedBranchId: null,
    createdAt: date,
    updatedAt: date,
    problemCount: 0,
    ...patch,
  });
  beforeEach(() => {
    docs.push(printPreset());
    mocks.document.deleteMany.mockImplementation(
      async ({ where }: { where: Row }) => {
        const before = docs.length;
        docs = docs.filter((doc) => !matches(doc, where));
        return { count: before - docs.length };
      },
    );
  });
  const listed = async (query = "") =>
    (await (await listDocuments(req("GET", query))).json()) as {
      data: Row[];
      meta: { total: number };
    };

  it("is left out of 내 시험지 · 우리학원 시험지 lists and their counts, with or without a kind filter", async () => {
    for (const query of ["", "?mine=true"]) {
      const body = await listed(query);
      expect(body.data.map((doc) => doc.kind)).not.toContain("printPreset");
      expect(body.meta.total).toBe(query ? 1 : 2);
    }
    const asKind = await listDocuments(req("GET", "?kind=printPreset"));
    const body = await asKind.json();
    expect(body.data ?? []).toEqual([]);
    expect(body.meta?.total ?? 0).toBe(0);
  });

  it("is left out of the admin's per-user document list (owner view)", async () => {
    account = { ...account, isAdmin: true };
    const body = await (await listDocuments(req(), viewer)).json();
    expect(body.data.map((doc: Row) => doc.kind)).not.toContain("printPreset");
    expect(body.meta.total).toBe(1);
  });

  it("cannot be read, saved over, renamed, deleted or copied as a document", async () => {
    const before = structuredClone(docs);
    expect((await readDocument(req(), "preset-1")).status).toBe(404);
    expect(
      (
        await saveDocument(
          req("PUT", "", {
            kind: "printPreset",
            title: "x",
            payload: {},
            expectedRevision: 1,
          }),
          "preset-1",
        )
      ).status,
    ).toBe(400);
    // 같은 id 로 자료를 덮어쓰려 해도 종류가 달라 막힌다.
    expect(
      (await saveDocument(req("PUT", "", saveBody()), "preset-1")).status,
    ).toBe(409);
    expect(
      (
        await renameDocument(
          req("PATCH", "", { title: "새 이름", expectedRevision: 1 }),
          "preset-1",
        )
      ).status,
    ).toBe(409);
    expect(
      (await deleteDocument(req("DELETE", "?revision=1"), "preset-1")).status,
    ).toBe(409);
    expect(docs).toEqual(before);
  });

  it("is never offered to a colleague even if a row were marked branch", async () => {
    docs.push(
      printPreset({
        userId: colleague,
        id: "preset-2",
        visibility: "branch",
        sharedBranchId: branch,
      }),
    );
    const body = await listed();
    expect(body.data.map((doc) => doc.kind)).not.toContain("printPreset");
    expect(
      (await readDocument(req("GET", shareQuery), "preset-2")).status,
    ).toBe(404);
    expect(
      (await copyDocument(req("POST", shareQuery), "preset-2")).status,
    ).toBe(404);
  });
});
