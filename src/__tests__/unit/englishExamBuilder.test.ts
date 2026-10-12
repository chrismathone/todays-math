// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  englishExamCandidatesSchema,
  englishExamComposeSchema,
} from "@/contracts/englishExamBuilder.contract";
import {
  composeEnglishExam,
  listEnglishExamCandidates,
  listEnglishExamScopes,
} from "@/lib/english/questionBank";
import { englishRouteAllowed } from "@/lib/accountRouteAccess";
import {
  BANK_BRANCH,
  BANK_OTHER_TEACHER,
  BANK_TEACHER,
  bankId,
  bankQuestion,
  createQuestionBankFixture,
  type QuestionBankFixture,
} from "../fixtures/englishQuestionBank";
const viewer = { id: BANK_TEACHER, branchId: BANK_BRANCH, isAdmin: false };
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

describe("English exam builder server scope and composition", () => {
  it("loads bounded metadata/counts from actual owned sets without sending question bodies", async () => {
    await fixture.exam(bankId(10));
    await fixture.exam(bankId(11), { userId: BANK_OTHER_TEACHER });
    await fixture.set(bankId(20), bankId(10), {
      title: "Actual scope",
      questions: [bankQuestion(), bankQuestion()],
    });
    await fixture.set(bankId(21), bankId(11));
    const scopes = await listEnglishExamScopes(fixture.db, viewer, 1);
    expect(scopes).toEqual({
      items: [
        {
          id: bankId(20),
          label: "Actual scope",
          group: "중2",
          detail: "Fixture school · Fixture exam",
          count: 2,
        },
      ],
      total: 1,
    });
    expect((await listEnglishExamScopes(fixture.db, viewer, 2)).items).toEqual(
      [],
    );
  });
  it("applies actual difficulty, scope and identity exclusion before bounded pagination", async () => {
    await fixture.exam(bankId(10));
    await fixture.set(bankId(20), bankId(10), {
      meta: { difficulty: "심화" },
      questions: [
        bankQuestion("first"),
        bankQuestion("second"),
        bankQuestion("third"),
      ],
    });
    await fixture.set(bankId(21), bankId(10), { meta: { difficulty: "표준" } });
    await fixture.set(bankId(22), bankId(10), {
      meta: { difficulty: "unknown" },
    });
    const input = englishExamCandidatesSchema.parse({
      scopeIds: [bankId(20), bankId(21), bankId(22)],
      difficulty: "심화",
      pageSize: 1,
      exclude: [{ setId: bankId(20), revision: 1, questionIndex: 0 }],
    });
    const first = await listEnglishExamCandidates(fixture.db, viewer, input);
    expect(first.total).toBe(2);
    expect(first.items.map((i) => i.questionIndex)).toEqual([1]);
    expect(first.items[0]!.difficulty).toBe("심화");
    expect(
      (
        await listEnglishExamCandidates(fixture.db, viewer, {
          ...input,
          page: 2,
        })
      ).items[0]!.questionIndex,
    ).toBe(2);
    expect(
      (
        await listEnglishExamCandidates(fixture.db, viewer, {
          ...input,
          difficulty: "미지정",
        })
      ).items.map((i) => i.setId),
    ).toEqual([bankId(22)]);
    expect(
      (
        await listEnglishExamCandidates(fixture.db, viewer, {
          ...input,
          scopeIds: [bankId(21)],
        })
      ).total,
    ).toBe(0);
  });
  it("composes in requested scope/source order and rejects shortages or inaccessible selections atomically", async () => {
    await fixture.exam(bankId(10));
    await fixture.exam(bankId(11), { userId: BANK_OTHER_TEACHER });
    await fixture.set(bankId(20), bankId(10), {
      revision: 7,
      questions: [bankQuestion("  first\n"), bankQuestion("second")],
    });
    await fixture.set(bankId(21), bankId(10));
    await fixture.set(bankId(22), bankId(11));
    const allocations = [
      { scopeId: bankId(21), count: 1 },
      { scopeId: bankId(20), count: 2 },
    ];
    const result = await composeEnglishExam(fixture.db, viewer, {
      allocations,
    });
    expect(result.map((i) => [i.setId, i.questionIndex])).toEqual([
      [bankId(21), 0],
      [bankId(20), 0],
      [bankId(20), 1],
    ]);
    expect(result[1]!.revision).toBe(7);
    expect(result[1]!.question.prompt).toBe("  first\n");
    for (const allocation of [
      { scopeId: bankId(20), count: 3 },
      { scopeId: bankId(22), count: 1 },
    ])
      await expect(
        composeEnglishExam(fixture.db, viewer, { allocations: [allocation] }),
      ).rejects.toThrow("unavailable");
  });
  it("locks bounded strict requests and existing library/menu permission", () => {
    expect(
      englishExamCandidatesSchema.safeParse({ scopeIds: [], pageSize: 51 })
        .success,
    ).toBe(false);
    expect(
      englishExamCandidatesSchema.safeParse({
        scopeIds: [bankId(20)],
        difficulty: "쉬움",
      }).success,
    ).toBe(false);
    expect(
      englishExamComposeSchema.safeParse({
        allocations: [
          { scopeId: bankId(20), count: 80 },
          { scopeId: bankId(21), count: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(
      englishExamComposeSchema.safeParse({
        allocations: [
          { scopeId: bankId(20), count: 1 },
          { scopeId: bankId(20), count: 1 },
        ],
      }).success,
    ).toBe(false);
    for (const [path, method] of [
      ["scopes", "GET"],
      ["candidates", "POST"],
      ["compose", "POST"],
    ]) {
      expect(
        englishRouteAllowed(
          ["english-library"],
          method!,
          `/api/english/questions/${path}`,
        ),
      ).toBe(true);
      expect(
        englishRouteAllowed(
          ["english-maker"],
          method!,
          `/api/english/questions/${path}`,
        ),
      ).toBe(false);
      expect(
        englishRouteAllowed(
          ["english-library"],
          "DELETE",
          `/api/english/questions/${path}`,
        ),
      ).toBe(false);
    }
  });
});
