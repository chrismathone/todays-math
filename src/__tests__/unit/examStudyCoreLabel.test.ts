import { describe, expect, it } from "vitest";
import type { ExamStudyGenerateRequest } from "@/contracts/examStudy.contract";
import { generateExamStudy } from "@/lib/examStudy/generate";
import { MIDDLE_STUDY_FAMILIES } from "@/lib/examStudy/families/middle";
import { EXAM_STUDY_PROFILES } from "@/lib/examStudy/profiles";

const family = MIDDLE_STUDY_FAMILIES.find(
  (f) => f.id === "study-middle-inverse-equal-legs",
)!;
const profile = EXAM_STUDY_PROFILES.find((p) => p.id === "daeryun-m1")!;
const selected: ExamStudyGenerateRequest = {
  course: "중1",
  familyIds: [family.id],
  count: 1,
  format: "단답형",
  seed: 5,
  maxPerFamily: 1,
};
const options = { families: [family] };
const generalWarning =
  "학교 프로필을 적용하지 않고 일반 범위 연습으로 제공합니다.";

describe("explicit general types keep school labels display-only", () => {
  it.each(["대륜중학교", "대륜중", "미검토학교", "경신고등학교"])(
    "preserves mathematics, coverage and recipe inputs for %s",
    async (schoolName) => {
      const bare = await generateExamStudy(selected, options);
      const named = await generateExamStudy(
        { ...selected, schoolName },
        options,
      );

      expect(bare.status).toBe("complete");
      expect(bare.deliveredCount).toBe(1);
      expect(named.profileId).toBeNull();
      expect(named.profileVersion).toBeNull();
      expect(named.schoolEvidence).toBeNull();
      expect(named.requirements).toEqual([]);
      expect(named.questions).toEqual(bare.questions);
      expect(named.digest).toBe(bare.digest);
      expect(named.status).toBe(bare.status);
      expect(named.deliveredCount).toBe(bare.deliveredCount);
      expect(named.recipe.schoolName).toBe(schoolName);
      expect({ ...named.recipe, schoolName: undefined }).toEqual(bare.recipe);
      expect(named.warnings).toContain(generalWarning);
      expect(named.warnings.join(" ")).not.toMatch(/검토 근거가 없어/);
    },
  );

  it("retains the selected family when a matching school's demands are disjoint", async () => {
    const opts = {
      ...options,
      profiles: [
        {
          ...profile,
          requirements: [{ id: "algebra.linear-simplify" as const, weight: 1 }],
        },
      ],
    };
    const bare = await generateExamStudy(selected, opts);
    const named = await generateExamStudy(
      { ...selected, schoolName: profile.schoolName },
      opts,
    );
    expect(named.questions).toEqual(bare.questions);
    expect(named.questions.map((q) => q.familyId)).toEqual([family.id]);
    expect(named.requirements).toEqual([]);
    expect(named.profileId).toBeNull();
    expect(named.digest).toBe(bare.digest);
    expect(named.status).toBe("complete");
  });
});

describe("reviewed profile selection remains explicit or alias-only", () => {
  it("applies an explicit profile alongside selected families", async () => {
    const result = await generateExamStudy(
      {
        ...selected,
        profileId: profile.id,
        schoolName: "대륜중",
        requirementIds: ["coord.inverse-equal-legs"],
      },
      options,
    );
    expect(result.profileId).toBe(profile.id);
    expect(result.profileVersion).toBe(profile.version);
    expect(result.recipe.profileId).toBe(profile.id);
    expect(result.schoolEvidence).toEqual(profile.scope);
    expect(result.status).toBe("complete");
    expect(result.requirements).toEqual([
      expect.objectContaining({
        id: "coord.inverse-equal-legs",
        status: "full",
      }),
    ]);
    expect(result.questions[0]!.requirements).toEqual([
      "coord.inverse-equal-legs",
    ]);
    expect(result.warnings).not.toContain(generalWarning);
  });

  it.each([
    [{ profileId: "missing" }, "unknown-profile"],
    [{ profileId: profile.id, course: "중2" }, "profile-course-conflict"],
    [
      { profileId: profile.id, schoolName: "다른학교" },
      "profile-school-conflict",
    ],
  ])("still validates explicit profile overrides %j", async (changes, code) => {
    await expect(
      generateExamStudy({ ...selected, ...changes }, options),
    ).rejects.toMatchObject({ code });
  });

  it("resolves a recognized alias without explicit families", async () => {
    const result = await generateExamStudy(
      { course: "중1", schoolName: "대륜중", count: 1, seed: 5 },
      options,
    );
    expect(result.profileId).toBe(profile.id);
    expect(result.recipe.profileId).toBe(profile.id);
    expect(result.schoolEvidence).toEqual(profile.scope);
    expect(result.requirements.map((r) => r.id).sort()).toEqual(
      profile.requirements.map((r) => r.id).sort(),
    );
  });

  it.each([
    { course: "중3", schoolName: "대륜중" },
    { course: "중1", schoolName: "경신고등학교" },
  ])(
    "rejects unreviewed school/course pairs without explicit families %j",
    async (changes) => {
      await expect(
        generateExamStudy({ ...changes, count: 1, seed: 5 }, options),
      ).rejects.toMatchObject({ code: "school-course-unreviewed" });
    },
  );
});
