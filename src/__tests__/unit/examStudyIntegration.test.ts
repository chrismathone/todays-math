import { describe, expect, it, vi } from "vitest";
import type {
  ExamStudyGenerateRequest,
  ExamStudyGeneration,
} from "@/contracts/examStudy.contract";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({
    user: {
      id: "integration-teacher",
      name: "통합 검사",
      role: "director",
      approvalStatus: "approved",
      menus: ["bank"],
      branchRole: "teacher",
      branchId: "local-test",
    },
  }),
}));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("Exam study must not access a database");
      },
    },
  ),
}));

import {
  EXAM_STUDY_PROFILES,
  examStudyFamilies,
  generateExamStudy,
  getExamStudyCatalog,
} from "@/lib/examStudy";
import { createExamStudy, resolveExamStudy } from "@/lib/examStudyRoutes";

const request = (body: unknown, resolve = false) =>
  new Request(
    `http://localhost/api/exam/practice${resolve ? "/resolve" : ""}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify(body),
    },
  );

describe("integrated registered exam-study generation", () => {
  it("keeps all nine courses available without multiplying authored families by response format", () => {
    const catalog = getExamStudyCatalog();
    expect(catalog.courses).toHaveLength(9);
    expect(catalog.profiles).toHaveLength(5);
    expect(new Set(catalog.families.map((f) => f.id)).size).toBe(
      catalog.families.length,
    );
    expect(
      catalog.families.filter((f) => f.source === "authored").length,
    ).toBeGreaterThanOrEqual(22);
  });

  it.each(EXAM_STUDY_PROFILES)(
    "plans the actual authored and legacy registry for $id",
    async (profile) => {
      const result = await generateExamStudy(
        {
          course: profile.course,
          profileId: profile.id,
          count: 12,
          seed: 20261018,
          format: "혼합",
          maxPerFamily: 3,
        },
        {
          // Family renderer tests and the real API test below verify the SVG transport.
          prepare: async (item) => ({
            ok: true,
            figureSvg: item.figureSpec
              ? '<svg xmlns="http://www.w3.org/2000/svg"/>'
              : null,
          }),
        },
      );
      expect(result.profileId).toBe(profile.id);
      expect(result.schoolEvidence).toEqual(profile.scope);
      expect(result.deliveredCount).toBeGreaterThan(0);
      expect(result.questions.length).toBe(result.deliveredCount);
      expect(new Set(result.questions.map((q) => q.logicalKey)).size).toBe(
        result.deliveredCount,
      );
      expect(new Set(result.questions.map((q) => q.contentDigest)).size).toBe(
        result.deliveredCount,
      );
      expect(
        result.questions.every(
          (q) =>
            q.course === profile.course &&
            q.content &&
            q.answer &&
            q.solution &&
            (!q.figureSpec || q.figureSvg),
        ),
      ).toBe(true);
      if (
        result.requirements.some((r) => r.status !== "full") ||
        result.deliveredCount < 12
      )
        expect(result.status).toBe("partial");
      for (const q of result.questions.filter(
        (q) => q.questionType === "서술형",
      ))
        expect(q.rubric?.criteria.length).toBeGreaterThan(1);
    },
  );

  it("runs authenticated API → actual math → strict Python SVG → reproducible output confirmation", async () => {
    const recipe: ExamStudyGenerateRequest = {
      course: "중1",
      profileId: "daeryun-m1",
      requirementIds: ["graph.piecewise-multi-claim"],
      count: 1,
      seed: 20261018,
      format: "단답형",
      maxPerFamily: 1,
    };
    const response = await createExamStudy(request(recipe));
    expect(response.status).toBe(200);
    const result = (await response.json()).data as ExamStudyGeneration;
    expect(result.status).toBe("complete");
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]!.figureSvg).toMatch(/<svg[\s>]/);
    expect(result.questions[0]!.figureSvg!.length).toBeGreaterThan(500);
    const family = examStudyFamilies().find(
      (f) => f.id === result.questions[0]!.familyId,
    )!;
    expect(family.verify(result.questions[0]!).valid).toBe(true);
    const resolved = await resolveExamStudy(
      request({ recipe: result.recipe, expectedDigest: result.digest }, true),
    );
    expect(resolved.status).toBe(200);
    expect((await resolved.json()).data.digest).toBe(result.digest);
    const changed = await resolveExamStudy(
      request(
        {
          recipe: { ...result.recipe, seed: 20261019 },
          expectedDigest: result.digest,
        },
        true,
      ),
    );
    expect(changed.status).toBe(409);
  }, 60_000);
});
