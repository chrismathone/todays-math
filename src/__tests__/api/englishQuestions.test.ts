// @vitest-environment node
/** Real handlers and parameterized SQL on local fixtures; only auth/connection are mocked. */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { SessionUser } from "@/lib/session";

const state = vi.hoisted(() => ({
  session: null as SessionUser | null,
  db: null as Pick<PrismaClient, "$queryRaw"> | null,
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => state.session),
}));
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: (...args: Parameters<PrismaClient["$queryRaw"]>) =>
      state.db!.$queryRaw(...args),
  },
}));

import { GET } from "@/app/api/english/questions/route";
import { POST } from "@/app/api/english/questions/resolve/route";
import {
  ENGLISH_BANK_BODY_MAX_BYTES,
  englishQuestionBankResponseSchema,
  englishQuestionBankResolveResponseSchema,
} from "@/contracts/englishQuestionBank.contract";
import { errorResponseSchema } from "@/contracts/common.contract";
import {
  BANK_BRANCH,
  BANK_OTHER_BRANCH,
  BANK_OTHER_TEACHER,
  BANK_TEACHER,
  bankId,
  bankQuestion,
  createQuestionBankFixture,
  type QuestionBankFixture,
} from "../fixtures/englishQuestionBank";

const ORIGIN = "http://localhost";
const teacher: SessionUser = {
  id: BANK_TEACHER,
  email: "fixture@example.test",
  name: "Fixture",
  isAdmin: false,
  branchId: BANK_BRANCH,
  menus: ["english-library"],
};
const ref = (setId = bankId(200), revision = 1, questionIndex = 0) => ({
  setId,
  revision,
  questionIndex,
});
const get = (search = "") =>
  GET(new Request(`${ORIGIN}/api/english/questions${search}`));
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/english/questions/resolve`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const post = (items = [ref()], headers: Record<string, string> = {}) =>
  POST(request({ items }, headers));
let fixture: QuestionBankFixture;
beforeAll(async () => {
  fixture = await createQuestionBankFixture();
  state.db = fixture.db;
});
beforeEach(async () => {
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  state.session = teacher;
  await fixture.reset();
  await fixture.exam(bankId(100));
  await fixture.set(bankId(200), bankId(100), {
    questions: [bankQuestion(), bankQuestion("Second question")],
  });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await fixture.pg.close();
});

describe("GET /api/english/questions and POST /resolve", () => {
  it("requires authentication and library grants before reading storage", async () => {
    state.session = null;
    expect((await get()).status).toBe(401);
    expect((await post()).status).toBe(401);
    for (const menus of [
      [],
      ["english-maker"],
      ["english-school"],
      ["english-bank"],
      ["english-listening"],
    ] as SessionUser["menus"][]) {
      state.session = { ...teacher, menus, isAdmin: true, isSuperAdmin: true };
      expect((await get()).status).toBe(403);
      expect((await post()).status).toBe(403);
    }
    expect(fixture.calls).toHaveLength(0);
  });

  it("protects the read-only POST with the existing same-origin policy", async () => {
    const rejectedHeaders: Record<string, string>[] = [
      { origin: "" },
      { origin: "https://foreign.example" },
      { "sec-fetch-site": "cross-site" },
    ];
    for (const headers of rejectedHeaders)
      expect((await post([ref()], headers)).status).toBe(403);
    vi.stubEnv("AUTH_URL", "https://app.example");
    expect((await post()).status).toBe(403);
    expect(fixture.calls).toHaveLength(0);
    expect(
      (await post([ref()], { origin: "https://app.example" })).status,
    ).toBe(200);
  });

  it("returns strict question pages and validates filters before storage", async () => {
    const response = await get(
      "?pageSize=1&type=" + encodeURIComponent("서술형"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const { data } = englishQuestionBankResponseSchema.parse(
      await response.json(),
    );
    expect(data).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      setId: bankId(200),
      questionIndex: 0,
      key: `${bankId(200)}:1:0`,
      difficulty: null,
    });
    for (const search of [
      "?pageSize=51",
      "?page=0",
      "?page=10001",
      "?page=1&page=2",
      "?type=bad",
      "?grade=bad",
      "?status=bad",
      "?examId=bad",
      "?ownerId=other",
      `?q=${"a".repeat(201)}`,
      `?q=${"%20".repeat(1400)}`,
    ]) {
      const invalid = await get(search);
      expect(invalid.status).toBe(400);
      expect(errorResponseSchema.parse(await invalid.json()).error.code).toBe(
        "VALIDATION_ERROR",
      );
    }
    expect(fixture.calls).toHaveLength(1);
  });

  it("enforces teacher/branch scope for list and resolve without exposing hidden ids", async () => {
    const owners = [
      { userId: BANK_OTHER_TEACHER, branchId: BANK_BRANCH },
      { userId: BANK_TEACHER, branchId: BANK_OTHER_BRANCH },
      { userId: BANK_OTHER_TEACHER, branchId: BANK_OTHER_BRANCH },
    ];
    for (const [i, owner] of owners.entries()) {
      await fixture.exam(bankId(101 + i), owner);
      await fixture.set(bankId(201 + i), bankId(101 + i), { revision: 9 });
    }
    expect((await (await get()).json()).data.total).toBe(2);
    const missing = await post([ref(bankId(999))]);
    const expected = await missing.json();
    expect(missing.status).toBe(404);
    for (const setId of [bankId(201), bankId(202), bankId(203)]) {
      const denied = await post([ref(setId)]);
      expect(denied.status).toBe(404);
      expect(await denied.json()).toEqual(expected);
    }
    expect(
      (await (await get(`?examId=${bankId(101)}`)).json()).data,
    ).toMatchObject({ total: 0, items: [] });
    state.session = { ...teacher, isAdmin: true, branchRole: "manager" };
    expect((await (await get()).json()).data.total).toBe(3);
    expect((await post([ref(bankId(201), 9)])).status).toBe(200);
    expect((await post([ref(bankId(203), 9)])).status).toBe(404);
  });

  it("resolves arbitrary input order across passages without copying or changing stored sets", async () => {
    await fixture.exam(bankId(101), { grade: "고1", title: "Another exam" });
    await fixture.set(bankId(201), bankId(101), {
      passage: "A completely different passage.",
      questions: [bankQuestion("Other question")],
      revision: 4,
    });
    const before = await fixture.pg.query(
      "SELECT * FROM english_question_set ORDER BY id",
    );
    const response = await post([
      ref(bankId(200), 1, 1),
      ref(bankId(201), 4),
      ref(),
    ]);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const { data } = englishQuestionBankResolveResponseSchema.parse(
      await response.json(),
    );
    expect(data.map((item) => item.question.prompt)).toEqual([
      "Second question",
      "Other question",
      "What did the students build?",
    ]);
    expect(data.map((item) => item.passage)).toEqual([
      "The students built a garden.",
      "A completely different passage.",
      "The students built a garden.",
    ]);
    expect(data.map((item) => item.examId)).toEqual([
      bankId(100),
      bankId(101),
      bankId(100),
    ]);
    expect(
      (await fixture.pg.query("SELECT * FROM english_question_set ORDER BY id"))
        .rows,
    ).toEqual(before.rows);
    expect(fixture.calls).toHaveLength(1);
  });

  it("rejects stale revisions, out-of-range indexes, deletions and mixed inaccessible batches atomically", async () => {
    await fixture.pg.query(
      "UPDATE english_question_set SET revision = 2, questions = $1::jsonb WHERE id = $2",
      [JSON.stringify([bankQuestion("Changed")]), bankId(200)],
    );
    const stale = await post([ref(bankId(200), 1, 1)]);
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("REVISION_MISMATCH");
    const invalidIndex = await post([ref(bankId(200), 2, 1)]);
    expect(invalidIndex.status).toBe(404);
    expect((await post([ref(bankId(200), 2, 0)])).status).toBe(200);
    for (const items of [
      [ref(), ref(bankId(999))],
      [ref(bankId(999)), ref()],
    ]) {
      const mixed = await post(items);
      expect(mixed.status).toBe(404);
      expect(JSON.stringify(await mixed.json())).not.toContain(
        "REVISION_MISMATCH",
      );
    }
    await fixture.pg.query("DELETE FROM english_question_set WHERE id = $1", [
      bankId(200),
    ]);
    expect((await post([ref(bankId(200), 2)])).status).toBe(404);
  });

  it("rejects duplicate/unknown input, malformed JSON and byte limits before any query", async () => {
    for (const body of [
      { items: [] },
      { items: [ref(), ref()] },
      { items: [{ ...ref(), revision: "1" }] },
      { items: [ref()], extra: true },
      { items: Array.from({ length: 81 }, (_, i) => ref(bankId(200), 1, i)) },
    ])
      expect((await POST(request(body))).status).toBe(400);
    const malformed = new Request(`${ORIGIN}/api/english/questions/resolve`, {
      method: "POST",
      headers: { origin: ORIGIN },
      body: "{",
    });
    expect((await POST(malformed)).status).toBe(400);
    expect(
      (
        await post([ref()], {
          "content-length": String(ENGLISH_BANK_BODY_MAX_BYTES + 1),
        })
      ).status,
    ).toBe(413);
    const untrustedLengths: Record<string, string>[] = [
      {},
      { "content-length": "1" },
    ];
    for (const headers of untrustedLengths) {
      const response = await POST(
        request(
          {
            items: [ref()],
            padding: "가".repeat(ENGLISH_BANK_BODY_MAX_BYTES / 2),
          },
          headers,
        ),
      );
      expect(response.status).toBe(413);
    }
    expect(fixture.calls).toHaveLength(0);
  });

  it("accepts 80 unique selections while preserving all original per-set indexes", async () => {
    const items = [];
    for (let i = 0; i < 4; i++) {
      await fixture.set(bankId(300 + i), bankId(100), {
        questions: Array.from({ length: 20 }, (_, j) =>
          bankQuestion(`Set ${i} question ${j}`),
        ),
      });
      for (let j = 0; j < 20; j++) items.push(ref(bankId(300 + i), 1, j));
    }
    const response = await post(items.reverse());
    expect(response.status).toBe(200);
    const { data } = englishQuestionBankResolveResponseSchema.parse(
      await response.json(),
    );
    expect(
      data.map(({ setId, revision, questionIndex }) => ({
        setId,
        revision,
        questionIndex,
      })),
    ).toEqual(items);
  });

  it("never strips unsupported V2 fields or coerces malformed saved questions", async () => {
    for (const questions of [
      [{ ...bankQuestion(), targets: [] }],
      [bankQuestion(), { ...bankQuestion(), itemId: "v2" }],
      [{ ...bankQuestion(), answer: 1 }],
      [{ ...bankQuestion(), unknown: true }],
    ]) {
      await fixture.pg.query(
        "UPDATE english_question_set SET questions = $1::jsonb WHERE id = $2",
        [JSON.stringify(questions), bankId(200)],
      );
      for (const response of [await get(), await post()]) {
        expect(response.status).toBe(409);
        expect(
          errorResponseSchema.parse(await response.json()).error.code,
        ).toBe("CONFLICT");
      }
      expect(
        (
          await fixture.pg.query<{ questions: unknown }>(
            "SELECT questions FROM english_question_set WHERE id = $1",
            [bankId(200)],
          )
        ).rows[0].questions,
      ).toEqual(questions);
    }
  });
});
