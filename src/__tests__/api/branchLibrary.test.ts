// Pure in-memory database boundary: never connects to the configured remote DB.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
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
    db: { ...tx, $transaction: (fn: (value: typeof tx) => unknown) => fn(tx) },
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
