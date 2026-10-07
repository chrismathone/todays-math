// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  englishBankQuestionSchema,
  englishQuestionBankQuerySchema,
  englishQuestionBankResolveRequestSchema,
} from "@/contracts/englishQuestionBank.contract";
import {
  accountRouteAllowed,
  englishRouteAllowed,
} from "@/lib/accountRouteAccess";
import type {
  AccountAccess,
  WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import {
  listEnglishBankQuestions,
  readQuestionBankQuery,
  resolveEnglishBankQuestions,
} from "@/lib/english/questionBank";
import { withinOwnerScope, type ScopeViewer } from "@/lib/ownerScope";
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

const viewer = { id: BANK_TEACHER, branchId: BANK_BRANCH, isAdmin: false };
const query = (value = {}) => englishQuestionBankQuerySchema.parse(value);
let fixture: QuestionBankFixture;
beforeAll(async () => {
  fixture = await createQuestionBankFixture();
});
beforeEach(async () => {
  await fixture.reset();
});
afterAll(async () => {
  await fixture.pg.close();
});

describe("English question bank strict contract and route permissions", () => {
  it("defaults pagination and rejects ambiguous/unbounded query values", () => {
    expect(query()).toEqual({ page: 1, pageSize: 20 });
    expect(query({ pageSize: "50", page: "10000" })).toEqual({
      pageSize: 50,
      page: 10000,
    });
    for (const value of [
      { page: "0" },
      { page: "10001" },
      { pageSize: "51" },
      { pageSize: "0" },
      { page: "1.5" },
      { page: "1e2" },
      { page: "" },
      { page: " 1" },
      { q: "x".repeat(201) },
      { grade: "초1" },
      { type: "unknown" },
      { status: "published" },
      { examId: "invalid" },
      { ownerId: BANK_TEACHER },
    ])
      expect(englishQuestionBankQuerySchema.safeParse(value).success).toBe(
        false,
      );
    expect(() =>
      readQuestionBankQuery(
        new Request("http://localhost/api/english/questions?page=1&page=2"),
      ),
    ).toThrow();
    expect(() =>
      readQuestionBankQuery(
        new Request(
          `http://localhost/api/english/questions?q=${"%20".repeat(1400)}`,
        ),
      ),
    ).toThrow();
  });

  it("requires 1–80 unique strict references, normalizing UUID case only", () => {
    const ref = { setId: bankId(0xabc), revision: 1, questionIndex: 0 };
    expect(
      englishQuestionBankResolveRequestSchema.parse({ items: [ref] }).items,
    ).toEqual([ref]);
    for (const items of [
      [],
      [ref, ref],
      [ref, { ...ref, setId: ref.setId.toUpperCase() }],
      [{ ...ref, revision: 0 }],
      [{ ...ref, questionIndex: -1 }],
      [{ ...ref, questionIndex: 0.5 }],
      [{ ...ref, revision: "1" }],
      [{ ...ref, key: "extra" }],
      Array.from({ length: 81 }, (_, questionIndex) => ({
        ...ref,
        questionIndex,
      })),
    ])
      expect(
        englishQuestionBankResolveRequestSchema.safeParse({ items }).success,
      ).toBe(false);
    expect(
      englishQuestionBankResolveRequestSchema.safeParse({
        items: [ref],
        extra: true,
      }).success,
    ).toBe(false);
    expect(
      englishQuestionBankResolveRequestSchema.safeParse({
        items: Array.from({ length: 80 }, (_, questionIndex) => ({
          ...ref,
          questionIndex,
        })),
      }).success,
    ).toBe(true);
  });

  it("grants only established library access with exact methods/paths", () => {
    for (const menu of [
      "english-school",
      "english-maker",
      "english-bank",
      "english-listening",
    ] satisfies WorkspaceMenu[]) {
      expect(englishRouteAllowed([menu], "GET", "/api/english/questions")).toBe(
        false,
      );
      expect(
        englishRouteAllowed([menu], "POST", "/api/english/questions/resolve"),
      ).toBe(false);
    }
    expect(
      englishRouteAllowed(["english-library"], "GET", "/api/english/questions"),
    ).toBe(true);
    expect(
      englishRouteAllowed(
        ["english-library"],
        "HEAD",
        "/api/english/questions",
      ),
    ).toBe(true);
    expect(
      englishRouteAllowed(
        ["english-library"],
        "POST",
        "/api/english/questions/resolve",
      ),
    ).toBe(true);
    for (const [method, path] of [
      ["POST", "/api/english/questions"],
      ["GET", "/api/english/questions/resolve"],
      ["PUT", "/api/english/questions/resolve"],
      ["GET", "/api/english/questions/other"],
    ])
      expect(englishRouteAllowed(["english-library"], method, path)).toBe(
        false,
      );
    const account = {
      approvalStatus: "approved",
      menus: ["english-library"],
      isAdmin: false,
    } as AccountAccess;
    expect(accountRouteAllowed(account, "GET", "/api/english/questions")).toBe(
      true,
    );
    expect(
      accountRouteAllowed(
        { ...account, approvalStatus: "pending" },
        "GET",
        "/api/english/questions",
      ),
    ).toBe(false);
    expect(
      accountRouteAllowed(
        { ...account, menus: [], isSuperAdmin: true },
        "GET",
        "/api/english/questions",
      ),
    ).toBe(false);
  });
});

describe("parameterized question projection on local PostgreSQL", () => {
  it("matches the owner policy for teachers, branch admins, independent accounts and super admins", async () => {
    const owners = [
      [BANK_TEACHER, BANK_BRANCH],
      [BANK_OTHER_TEACHER, BANK_BRANCH],
      [BANK_TEACHER, BANK_OTHER_BRANCH],
      [BANK_OTHER_TEACHER, BANK_OTHER_BRANCH],
      [BANK_TEACHER, null],
      [BANK_OTHER_TEACHER, null],
    ] as const;
    for (const [i, [userId, branchId]] of owners.entries()) {
      await fixture.exam(bankId(100 + i), { userId, branchId });
      await fixture.set(bankId(200 + i), bankId(100 + i));
    }
    const viewers: ScopeViewer[] = [
      viewer,
      { ...viewer, isAdmin: true },
      { id: BANK_TEACHER },
      { id: BANK_TEACHER, isAdmin: true },
      { ...viewer, isSuperAdmin: true },
      { ...viewer, id: BANK_OTHER_TEACHER },
    ];
    for (const actor of viewers) {
      const result = await listEnglishBankQuestions(fixture.db, actor, query());
      const expected = owners.flatMap(([id, branchId], i) =>
        withinOwnerScope(actor, id, branchId) ? [bankId(200 + i)] : [],
      );
      // An admin scope deliberately excludes own branchless records, exactly as ownedRowsWhere does.
      const scoped =
        actor.isAdmin && actor.branchId && !actor.isSuperAdmin
          ? owners.flatMap(([, branchId], i) =>
              branchId === actor.branchId ? [bankId(200 + i)] : [],
            )
          : expected;
      expect(result.items.map((row) => row.setId)).toEqual(scoped);
      expect(result.total).toBe(scoped.length);
    }
  });

  it("paginates question identities, preserving deterministic ties and totals on empty pages", async () => {
    await fixture.exam(bankId(100));
    for (const i of [203, 201, 202])
      await fixture.set(bankId(i), bankId(100), {
        questions: [bankQuestion("first"), bankQuestion("second")],
        updatedAt: i === 203 ? "2026-10-07T02:00:00Z" : undefined,
      });
    const a = await listEnglishBankQuestions(
      fixture.db,
      viewer,
      query({ pageSize: "3" }),
    );
    const b = await listEnglishBankQuestions(
      fixture.db,
      viewer,
      query({ pageSize: "3", page: "2" }),
    );
    expect(
      [...a.items, ...b.items].map((row) => [row.setId, row.questionIndex]),
    ).toEqual([
      [bankId(203), 0],
      [bankId(203), 1],
      [bankId(201), 0],
      [bankId(201), 1],
      [bankId(202), 0],
      [bankId(202), 1],
    ]);
    expect(a.total).toBe(6);
    expect(b.total).toBe(6);
    expect(
      await listEnglishBankQuestions(fixture.db, viewer, query({ page: "9" })),
    ).toEqual({ items: [], total: 6, page: 9, pageSize: 20 });
    expect(
      await listEnglishBankQuestions(
        fixture.db,
        viewer,
        query({ q: "absent" }),
      ),
    ).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(fixture.calls).toHaveLength(4);
  });

  it("filters each question, searches saved original/text/title and treats SQL metacharacters literally", async () => {
    await fixture.exam(bankId(100));
    await fixture.exam(bankId(101), { grade: "고1" });
    await fixture.set(bankId(200), bankId(100), {
      title: "HARBOR",
      status: "검토 완료",
      passage: "A boat waits.",
      meta: {
        path: "api",
        sourcePassage: "Original lighthouse",
        difficulty: "심화",
      },
      questions: [
        bankQuestion("FIRST prompt", "해석"),
        bankQuestion("100%_ match"),
      ],
    });
    await fixture.set(bankId(201), bankId(101), {
      title: "HARBOR",
      questions: [bankQuestion("FIRST prompt", "해석")],
    });
    const result = await listEnglishBankQuestions(
      fixture.db,
      viewer,
      query({
        grade: "중2",
        type: "해석",
        status: "검토 완료",
        examId: bankId(100),
        q: "first",
      }),
    );
    expect(result.items.map((row) => row.questionIndex)).toEqual([0]);
    expect(result.items[0].difficulty).toBe("심화");
    for (const q of ["boat", "lighthouse"])
      expect(
        (await listEnglishBankQuestions(fixture.db, viewer, query({ q })))
          .total,
      ).toBe(2);
    expect(
      (
        await listEnglishBankQuestions(
          fixture.db,
          viewer,
          query({ q: "harbor" }),
        )
      ).total,
    ).toBe(3);
    expect(
      (
        await listEnglishBankQuestions(fixture.db, viewer, query({ q: "%_" }))
      ).items.map((row) => row.questionIndex),
    ).toEqual([1]);
    const injection = "' OR TRUE --";
    expect(
      (
        await listEnglishBankQuestions(
          fixture.db,
          viewer,
          query({ q: injection }),
        )
      ).total,
    ).toBe(0);
    expect(fixture.calls.at(-1)!.text).not.toContain(injection);
    expect(fixture.calls.at(-1)!.values).toContain(injection);
  });

  it("preserves different passages, every selected question and exact stored whitespace", async () => {
    await fixture.exam(bankId(100));
    const original = {
      ...bankQuestion("  Saved prompt\n"),
      answer: "  Saved answer  ",
      evidence: "\n original evidence \n",
    };
    await fixture.set(bankId(200), bankId(100), {
      passage: "  First passage\n",
      questions: [original, bankQuestion("Second prompt")],
      revision: 3,
    });
    await fixture.set(bankId(201), bankId(100), {
      passage: "Other source passage",
      meta: { difficulty: "unknown" },
    });
    const refs = [
      { setId: bankId(200), revision: 3, questionIndex: 1 },
      { setId: bankId(201), revision: 1, questionIndex: 0 },
      { setId: bankId(200), revision: 3, questionIndex: 0 },
    ];
    const result = await resolveEnglishBankQuestions(fixture.db, viewer, {
      items: refs,
    });
    expect(
      result.map(({ setId, revision, questionIndex }) => ({
        setId,
        revision,
        questionIndex,
      })),
    ).toEqual(refs);
    expect(result.map((row) => row.passage)).toEqual([
      "  First passage\n",
      "Other source passage",
      "  First passage\n",
    ]);
    expect(result[2].question).toEqual(original);
    expect(result.map((row) => row.difficulty)).toEqual([null, null, null]);
    expect(
      englishBankQuestionSchema.safeParse({ ...result[0], key: "wrong" })
        .success,
    ).toBe(false);
    expect(
      englishBankQuestionSchema.safeParse({
        ...result[0],
        question: { ...original, targets: [] },
      }).success,
    ).toBe(false);
    expect(
      englishBankQuestionSchema.safeParse({ ...result[0], extra: true })
        .success,
    ).toBe(false);
  });
});
