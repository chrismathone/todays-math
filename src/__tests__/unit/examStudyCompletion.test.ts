import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExamStudyGenerateRequest,
  ExamStudyGeneration,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";

const fixture = vi.hoisted(() => ({ session: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => fixture.session }));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("Exam study must not access the database");
      },
    },
  ),
}));

import {
  EXAM_STUDY_PROFILES,
  examStudyFamilies,
  familyCoverage,
} from "@/lib/examStudy";
import {
  createExamStudy,
  examStudyCatalog,
  resolveExamStudy,
} from "@/lib/examStudyRoutes";

const approved = (menus = ["bank"]) => ({
  user: {
    id: "completion-teacher",
    name: "통합 검수",
    role: "director",
    approvalStatus: "approved",
    branchRole: "teacher",
    branchId: "local-test",
    menus,
  },
});
beforeEach(() => {
  fixture.session = approved();
});

function request(body: unknown, resolve = false) {
  return new Request(
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
}
async function generate(recipe: ExamStudyGenerateRequest) {
  const response = await createExamStudy(request(recipe));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  return (await response.json()).data as ExamStudyGeneration;
}

const gaps: readonly [string, StudyRequirementId][] = [
  ["daeryun-m1", "model.doubling-time-offset"],
  ["daeryun-m1", "model.circle-revolution-percentage"],
  ["daeryun-m1", "number.coprime-symbolic-sum"],
  ["daeryun-m2", "coord.intercept-integer-area"],
  ["daeryun-m2", "graph.translated-coefficient-reuse"],
  ["kyungmyung-m1", "algebra.candidate-verification"],
  ["kyungmyung-m1", "algebra.equality-truth"],
  ["kyungmyung-m1", "algebra.equation-classification"],
  ["kyungmyung-m1", "algebra.linear-model"],
  ["kyungmyung-m1", "algebra.linear-simplify"],
  ["kyungmyung-m3", "graph.translated-coefficient-reuse"],
  ["kyungmyung-m3", "written.rectangle-domain"],
  ["kyungshin-common2", "function.radical-inverse-circle"],
];

describe("completed selected school-study demands through the actual API", () => {
  it.each(EXAM_STUDY_PROFILES)(
    "provides the selected demands within the grade eligibility gate for $id",
    async (profile) => {
      const data = await generate({
        course: profile.course,
        profileId: profile.id,
        count: 12,
        maxPerFamily: 3,
        seed: 20261019,
        format: "혼합",
      });
      const gradeHeld = profile.id === "daeryun-m1";
      expect(data.status).toBe(gradeHeld ? "partial" : "complete");
      expect(data.deliveredCount).toBe(12);
      expect(data.requirements).toHaveLength(profile.requirements.length);
      expect(
        data.requirements.every((r) =>
          r.id === "number.coprime-symbolic-sum"
            ? r.status === "unavailable" && r.delivered === 0
            : r.status === "full" && r.delivered >= r.requested,
        ),
      ).toBe(true);
      expect(
        data.questions.some(
          (q) => q.familyId === "study-middle-coprime-symbolic-sum",
        ),
      ).toBe(false);
      expect(new Set(data.questions.map((q) => q.logicalKey)).size).toBe(12);
      expect(new Set(data.questions.map((q) => q.contentDigest)).size).toBe(12);
      expect(
        data.questions.every(
          (q) => !q.figureSpec || /<svg[\s>]/.test(q.figureSvg ?? ""),
        ),
      ).toBe(true);
      expect(data.schoolEvidence).toEqual(profile.scope);
      expect(data.schoolEvidence?.difficultyCalibration).toBe("unmeasured");
      expect(data.warnings.some((w) => w.includes("학교 시험 전체"))).toBe(
        true,
      );
    },
  );

  it.each(gaps)(
    "honors eligibility for %s / %s without component substitution",
    async (profileId, id) => {
      const profile = EXAM_STUDY_PROFILES.find((p) => p.id === profileId)!;
      const format = ["written.rectangle-domain", "model.doubling-time-offset", "model.circle-revolution-percentage", "coord.intercept-integer-area"].includes(id)
        ? "서술형" : "단답형";
      const data = await generate({
        course: profile.course,
        profileId,
        requirementIds: [id],
        count: 1,
        maxPerFamily: 1,
        seed: 20261019,
        format,
      });
      if (id === "number.coprime-symbolic-sum") {
        expect(data.status).toBe("unavailable");
        expect(data.questions).toHaveLength(0);
        expect(data.requirements[0]).toMatchObject({
          id,
          status: "unavailable",
          delivered: 0,
        });
        expect(data.requirements[0].reason).toContain("중1 범위");
        expect(
          (
            await resolveExamStudy(
              request(
                { recipe: data.recipe, expectedDigest: data.digest },
                true,
              ),
            )
          ).status,
        ).toBe(409);
        return;
      }
      expect(data.status).toBe("complete");
      expect(data.questions).toHaveLength(1);
      expect(data.requirements[0]).toMatchObject({
        id,
        status: "full",
        requested: 1,
        delivered: 1,
      });
      const item = data.questions[0]!;
      expect(item.questionType).toBe(format);
      expect(item.requirements).toContain(id);
      const family = examStudyFamilies().find((f) => f.id === item.familyId)!;
      expect(familyCoverage(family, id)).toBe("full");
      expect(family.verify(item).valid).toBe(true);
      expect(
        family.verify({ ...item, answer: "의도적으로 잘못된 답" }).valid,
      ).toBe(false);
      if (format === "서술형")
        expect(item.rubric?.criteria.length).toBeGreaterThan(1);
      const resolved = await resolveExamStudy(
        request({ recipe: data.recipe, expectedDigest: data.digest }, true),
      );
      expect(resolved.status).toBe(200);
      expect((await resolved.json()).data.digest).toBe(data.digest);
    },
  );

  it.each(["bank", "arithmetic", "studio", "library", "conceptBlank"])(
    "keeps the approved per-menu output rule for %s",
    async (menu) => {
      fixture.session = approved([menu]);
      expect(
        (
          await examStudyCatalog(
            new Request("http://localhost/api/exam/practice?course=중1"),
          )
        ).status,
      ).toBe(200);
      const data = await generate({
        course: "중1",
        profileId: "kyungmyung-m1",
        requirementIds: ["algebra.equation-classification"],
        count: 1,
        seed: 71,
        format: "단답형",
        maxPerFamily: 1,
      });
      expect(data.status).toBe("complete");
    },
  );

  it.each([{ menus: ["export"] }, { menus: ["textbook"] }, { menus: [] }])(
    "denies an account with no output menu: $menus",
    async ({ menus }) => {
      fixture.session = approved(menus);
      const recipe = {
        course: "중1",
        count: 1,
        seed: 71,
        format: "혼합",
        maxPerFamily: 1,
      };
      expect((await createExamStudy(request(recipe))).status).toBe(403);
      expect(
        (
          await examStudyCatalog(
            new Request("http://localhost/api/exam/practice"),
          )
        ).status,
      ).toBe(403);
    },
  );

  it.each([71, 20261019])(
    "bounds actual count-question choices for reproduced seed %i",
    async (seed) => {
      for (const id of [
        "algebra.equality-truth",
        "algebra.equation-classification",
      ] as const) {
        const data = await generate({
          course: "중1",
          profileId: "kyungmyung-m1",
          requirementIds: [id],
          count: 1,
          maxPerFamily: 1,
          seed,
          format: "객관식",
        });
        expect(data.status).toBe("complete");
        const item = data.questions[0]!;
        expect(item.questionType).toBe("객관식");
        const choices = parseProblemContent(item.content).choices;
        expect(choices).toHaveLength(5);
        const counts = choices.map((c) => {
          const match = /^\$?(\d+)\$?\s*개$/.exec(c.trim());
          expect(match).not.toBeNull();
          return Number(match![1]);
        });
        expect(new Set(counts).size).toBe(5);
        expect(counts.every((n) => n >= 0 && n <= 5)).toBe(true);
      }
    },
  );

  it("keeps native writing unavailable as short answer without silently changing the requested format", async () => {
    const data = await generate({
      course: "중3",
      profileId: "kyungmyung-m3",
      requirementIds: ["written.rectangle-domain"],
      count: 1,
      maxPerFamily: 1,
      seed: 20261019,
      format: "단답형",
    });
    expect(data.status).toBe("unavailable");
    expect(data.questions).toHaveLength(0);
  });
});
