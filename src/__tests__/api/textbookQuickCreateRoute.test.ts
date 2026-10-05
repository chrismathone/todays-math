// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_name: string, handler: unknown) => handler,
}));
const gate = vi.hoisted(() => ({
  allowed: true,
  list: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/textbook/server/authorize", () => ({
  textbookHeaders: {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  },
  authorizeTextbook: async () =>
    gate.allowed
      ? {
          actor: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "교사",
            branchId: null,
          },
          response: null,
        }
      : {
          actor: null,
          response: Response.json(
            { error: { code: "FORBIDDEN", message: "권한이 없습니다." } },
            { status: 403 },
          ),
        },
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({ textbookDb: {} }));
vi.mock("@/lib/textbook/server/figureBytes", () => ({
  createFigureLoader: () => async () => null,
}));
vi.mock("@/lib/textbook/server/quickCreate", () => ({
  listQuickCreateUnits: gate.list,
  createQuickTextbook: gate.create,
}));
import { GET, POST } from "@/app/api/textbook/quick-create/route";
import { conflict, invalid } from "@/lib/textbook/server/errors";
const input = () => ({
  requestId: randomUUID(),
  schoolLevel: "middle",
  grade: 2,
  semester: 1,
  startUnitId: randomUUID(),
  endUnitId: randomUUID(),
  difficulty: "standard",
  problemCountPerUnit: 8,
  includeConcepts: true,
});
const post = (body: unknown, raw?: string) =>
  new Request("https://today.test/api/textbook/quick-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
beforeEach(() => {
  vi.stubEnv("TEXTBOOK_RECOVERY_WRITER_ENABLED", "true");
  gate.allowed = true;
  vi.clearAllMocks();
});
describe("automatic textbook route", () => {
  it("keeps new writes disabled until the reader release is activated", async () => {
    vi.stubEnv("TEXTBOOK_RECOVERY_WRITER_ENABLED", undefined);
    const response = await POST(post(input()));
    expect(response.status).toBe(409);
    expect(gate.create).not.toHaveBeenCalled();
    vi.stubEnv("TEXTBOOK_RECOVERY_WRITER_ENABLED", "false");
    expect((await POST(post(input()))).status).toBe(409);
    expect(gate.create).not.toHaveBeenCalled();
  });
  it("authorizes GET and POST before touching composition services", async () => {
    gate.allowed = false;
    expect(
      (
        await GET(
          new Request(
            "https://today.test/api/textbook/quick-create?schoolLevel=middle&grade=2&semester=1",
          ),
        )
      ).status,
    ).toBe(403);
    expect((await POST(post(input()))).status).toBe(403);
    expect(gate.list).not.toHaveBeenCalled();
    expect(gate.create).not.toHaveBeenCalled();
  });
  it("returns direct ordered unit catalog with private cache headers", async () => {
    const catalog = {
      units: [
        {
          id: randomUUID(),
          chapter: "1. 수와 식",
          section: "순환소수",
          label: "1. 수와 식 · 순환소수",
          problemCount: 23,
          conceptCount: 5,
        },
      ],
    };
    gate.list.mockResolvedValue(catalog);
    const response = await GET(
      new Request(
        "https://today.test/api/textbook/quick-create?schoolLevel=middle&grade=2&semester=1",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...catalog, writerReady: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(gate.list).toHaveBeenCalledWith(expect.anything(), {
      schoolLevel: "middle",
      grade: 2,
      semester: 1,
    });
  });
  it.each([
    "schoolLevel=elementary&grade=2&semester=1",
    "schoolLevel=high&grade=1&semester=1",
    "schoolLevel=middle&grade=4&semester=1",
    "schoolLevel=middle&grade=2&semester=3",
    "schoolLevel=middle&grade=2&semester=1&semester=2",
    "schoolLevel=middle&grade=2.0&semester=1",
    "schoolLevel=middle&grade=2",
  ])("rejects invalid catalog query %s", async (query) => {
    expect(
      (
        await GET(
          new Request(`https://today.test/api/textbook/quick-create?${query}`),
        )
      ).status,
    ).toBe(400);
    expect(gate.list).not.toHaveBeenCalled();
  });
  it("returns a schema-validated native book and counts at 201", async () => {
    const value = {
      book: {
        id: randomUUID(),
        ownerId: randomUUID(),
        ownerName: "교사",
        isOwner: true,
        title: "자동 교재",
        visibility: "private",
        sharedBranchId: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        draftEditionId: randomUUID(),
        latestPublishedEditionId: null,
      },
      problemCount: 16,
      conceptCount: 2,
      warnings: [],
    };
    gate.create.mockResolvedValue(value);
    const body = input();
    const response = await POST(post(body));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(value);
    expect(gate.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      body,
      expect.objectContaining({
        loadFigure: expect.any(Function),
        prepareVisuals: expect.any(Function),
      }),
    );
  });
  it("rejects extra keys, all-off, malformed JSON and duplicate keys before generation", async () => {
    const body = input();
    const off = {
      unitIntro: false,
      dialogue: false,
      concepts: false,
      termRecall: false,
      clozeRecall: false,
      sentenceRecall: false,
      practice: false,
      review: false,
      assessment: false,
      written: false,
    };
    for (const request of [
      post({ ...body, publish: true }),
      post({ ...body, components: off }),
      post(body, "{"),
      post(
        body,
        JSON.stringify(body).replace('"grade":2', '"grade":2,"grade":3'),
      ),
    ])
      expect((await POST(request)).status).toBe(400);
    expect(gate.create).not.toHaveBeenCalled();
  });
  it("exposes shortage and retry-conflict errors without a successful book response", async () => {
    gate.create
      .mockRejectedValueOnce(invalid("선택한 난이도의 문항이 부족합니다."))
      .mockRejectedValueOnce(
        conflict("같은 요청 번호가 다른 내용에 쓰였습니다."),
      );
    const shortage = await POST(post(input()));
    expect(shortage.status).toBe(400);
    expect(await shortage.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    const retry = await POST(post(input()));
    expect(retry.status).toBe(409);
    expect(await retry.json()).toMatchObject({ error: { code: "CONFLICT" } });
  });
});
