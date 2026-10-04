import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  conceptScriptFor,
  conceptScriptSectionKeys,
} from "@/lib/textbook/conceptScripts";
import {
  REST_STORIES,
  chooseRestStory,
  getRestStory,
  planRestStories,
  restAgeBand,
  restStoryMarkdown,
  type RestAgeBand,
} from "@/lib/textbook/restStories";
import { checkNumericStatements } from "@/lib/textbook/scripts/mathCheck";

const GRADES = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"] as const;
const BANDS: RestAgeBand[] = ["elementary3-4", "elementary5-6", "middle1-3"];
const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");
const unitsOf = (grade: string, semester: 1 | 2) =>
  conceptScriptSectionKeys(grade, semester).map((key) => {
    const script = conceptScriptFor(key)!;
    return { grade, chapter: script.chapter, section: script.title };
  });
const chaptersOf = (grade: string, semester: 1 | 2) => [
  ...new Map(
    unitsOf(grade, semester).map((unit) => [unit.chapter, unit]),
  ).values(),
];
const books = GRADES.flatMap((grade) =>
  ([1, 2] as const).map((semester) => ({ grade, semester })),
);

describe("rest stories for a whole book", () => {
  it("keeps the six stories' text and the one-chapter chooser exactly as they were", () => {
    expect(
      REST_STORIES.map((story) => [
        story.id,
        sha(
          [story.title, story.markdown, ...story.reflectionQuestions].join(
            "\n",
          ),
        ),
      ]),
    ).toEqual([
      [
        "sharing",
        "35979bd45a4c6b7b1731f58fd0290479bb3a6ea7ac93ca3a5b51cac50739ff0c",
      ],
      [
        "patterns",
        "58d03ec5a8171b8eca9bddd0d8423b518615dd3c1794cd1463609db31a1bcca4",
      ],
      [
        "garden",
        "403971d23489eb772e427095c31c95752cd870aa3309e954fa7e8ef3606781da",
      ],
      [
        "map",
        "a2cb48558370e7b5abb1dbbf654bfec9e0f5134294b4d321a50a53815ff11046",
      ],
      [
        "balance",
        "cc7539941e2a6c85f31f525d6800a2a7c428bb7d72e767c7631b826f142d2a99",
      ],
      [
        "weather",
        "beff0019020ddb06682156f97a4c81186835ac3ef31f392b26b35690edd6b79d",
      ],
    ]);
    // The 72 chapters through the old chooser: the same hash as before age bands existed.
    const legacy = books.flatMap(({ grade, semester }) =>
      chaptersOf(grade, semester).map((unit) => chooseRestStory(unit).id),
    );
    expect(legacy).toHaveLength(72);
    expect(sha(legacy.join(","))).toBe(
      "9b9dbb4269f5a48e8c06bf9e87cde3b2a255252398149f9cda5a3b81254c9d05",
    );
    expect(getRestStory("garden")?.imageSrc).toBe(
      "/textbook/illustrations/garden.png",
    );
    expect(restStoryMarkdown(REST_STORIES[0]!)).toContain("### 생각 나누기");
  });

  it("gives each story a verdict and a curriculum reason for every age band", () => {
    expect(GRADES.map(restAgeBand)).toEqual([
      "elementary3-4",
      "elementary3-4",
      "elementary5-6",
      "elementary5-6",
      "middle1-3",
      "middle1-3",
      "middle1-3",
    ]);
    expect(["초1", "초2", "고1", ""].map(restAgeBand)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    for (const story of REST_STORIES) {
      expect(Object.keys(story.ageBands)).toEqual(BANDS);
      for (const band of BANDS)
        expect(story.ageBands[band].basis.length).toBeGreaterThan(10);
      // The chapter the verdict rests on exists in that grade and semester.
      const chapters = chaptersOf(
        story.firstTaught.grade,
        story.firstTaught.semester,
      ).map((unit) => unit.chapter);
      expect(chapters, story.id).toContain(story.firstTaught.chapter);
    }
    expect(
      Object.fromEntries(
        BANDS.map((band) => [
          band,
          REST_STORIES.filter((story) => story.ageBands[band].suitable).map(
            (story) => story.id,
          ),
        ]),
      ),
    ).toEqual({
      "elementary3-4": ["sharing", "patterns", "balance"],
      "elementary5-6": [
        "sharing",
        "patterns",
        "garden",
        "map",
        "balance",
        "weather",
      ],
      "middle1-3": ["patterns", "garden", "map", "balance", "weather"],
    });
    // A band never gets a story whose mathematics is first taught after that band.
    for (const story of REST_STORIES)
      for (const band of BANDS)
        if (story.ageBands[band].suitable)
          expect(
            BANDS.indexOf(restAgeBand(story.firstTaught.grade)!),
          ).toBeLessThanOrEqual(BANDS.indexOf(band));
  });

  it("never repeats a story inside a book and never uses one the reader has not been taught", () => {
    const order = (grade: string, semester: number) =>
      GRADES.indexOf(grade as (typeof GRADES)[number]) * 2 + semester - 1;
    const shortage: Record<string, number> = {};
    for (const { grade, semester } of books) {
      const units = unitsOf(grade, semester);
      const plan = planRestStories({ grade, semester, units });
      expect(plan).toEqual(planRestStories({ grade, semester, units }));
      expect(plan.band).toBe(restAgeBand(grade));
      expect(plan.assignments.map((entry) => entry.chapter)).toEqual(
        chaptersOf(grade, semester).map((unit) => unit.chapter),
      );
      const used = plan.assignments.flatMap((entry) =>
        entry.story ? [entry.story.id] : [],
      );
      expect(new Set(used).size, `${grade}-${semester}`).toBe(used.length);
      for (const entry of plan.assignments) {
        if (!entry.story) {
          expect(entry.shortage).toBe("all-suitable-stories-used");
          continue;
        }
        expect(entry.shortage).toBeUndefined();
        expect(entry.story.ageBands[plan.band!].suitable).toBe(true);
        expect(
          order(
            entry.story.firstTaught.grade,
            entry.story.firstTaught.semester,
          ),
        ).toBeLessThanOrEqual(order(grade, semester));
      }
      // Every suitable story is used before any chapter goes without.
      expect(used.length).toBe(
        Math.min(plan.suitableStoryIds.length, plan.assignments.length),
      );
      expect(plan.shortageCount).toBe(plan.assignments.length - used.length);
      expect(plan.shortages.map((item) => item.chapter)).toEqual(
        plan.assignments
          .filter((entry) => !entry.story)
          .map((entry) => entry.chapter),
      );
      shortage[`${grade}-${semester}`] = plan.shortageCount;
    }
    // 72 chapters, 15 rest pages that six stories cannot fill without repeating.
    expect(shortage).toEqual({
      "초3-1": 3,
      "초3-2": 3,
      "초4-1": 3,
      "초4-2": 3,
      "초5-1": 2,
      "초5-2": 1,
      "초6-1": 0,
      "초6-2": 0,
      "중1-1": 0,
      "중1-2": 0,
      "중2-1": 0,
      "중2-2": 0,
      "중3-1": 0,
      "중3-2": 0,
    });
  });

  it("puts a matching story with its chapter and says why a page is missing", () => {
    const sixth = planRestStories({
      grade: "초6",
      semester: 1,
      units: unitsOf("초6", 1),
    });
    expect(
      sixth.assignments.find((entry) => entry.chapter === "1-4 비와 비율")
        ?.story?.id,
    ).toBe("map");
    const fourth = planRestStories({
      grade: "초4",
      semester: 1,
      units: unitsOf("초4", 1),
    });
    expect(
      Object.fromEntries(
        fourth.assignments.map((entry) => [
          entry.chapter,
          entry.story?.id ?? entry.shortage,
        ]),
      ),
    ).toMatchObject({
      "1-3 곱셈과 나눗셈": "sharing",
      "1-6 규칙 찾기": "patterns",
    });
    expect(fourth.suitableStoryIds).toEqual(["sharing", "patterns", "balance"]);
    expect(fourth.shortageCount).toBe(3);
    // 평균 is taught in the second semester of 초5: not before.
    const fifth = (semester: 1 | 2) =>
      planRestStories({
        grade: "초5",
        semester,
        units: unitsOf("초5", semester),
      }).suitableStoryIds;
    expect(fifth(1)).not.toContain("weather");
    expect(fifth(2)).toContain("weather");
    expect(fifth(2)).not.toContain("map");
    // Several units of one chapter are one rest page; an unsupported grade is said so.
    const repeated = planRestStories({
      grade: "중1",
      semester: 1,
      units: [
        { chapter: "3. 방정식", section: "방정식과 그 해" },
        { chapter: "3. 방정식", section: "일차방정식의 풀이" },
      ],
    });
    expect(repeated.assignments).toHaveLength(1);
    expect(repeated.assignments[0]!.story?.id).toBe("balance");
    const unsupported = planRestStories({
      grade: "초2",
      units: [{ chapter: "1 세 자리 수" }, { chapter: "2 여러 가지 도형" }],
    });
    expect(unsupported).toMatchObject({
      band: undefined,
      shortageCount: 2,
      suitableStoryIds: [],
      shortages: [
        { chapter: "1 세 자리 수", reason: "unsupported-grade" },
        { chapter: "2 여러 가지 도형", reason: "unsupported-grade" },
      ],
    });
    expect(planRestStories({ grade: "중2", units: [] })).toMatchObject({
      assignments: [],
      shortageCount: 0,
    });
  });

  it("recalculates the numbers the stories state", () => {
    const calculated = REST_STORIES.map((story) => {
      const report = checkNumericStatements(
        `${story.markdown}\n${story.reflectionQuestions.join("\n")}`,
      );
      expect(report.faults, story.id).toEqual([]);
      return report.checked.length;
    });
    expect(
      calculated.reduce((sum, count) => sum + count, 0),
    ).toBeGreaterThanOrEqual(7);
    // Stated in words or with a unit the checker leaves alone.
    const text = (id: string) => getRestStory(id)!.markdown;
    expect(text("sharing")).toContain("네 개씩 세 묶음");
    expect(12 / (2 + 2)).toBe(3);
    expect(text("patterns")).toContain("열두 번째 잎은 파랑이고");
    expect(["초록", "노랑", "파랑"][(12 - 1) % 3]).toBe("파랑");
    expect(["초록", "노랑", "파랑"][(13 - 1) % 3]).toBe("초록");
    expect([1, 4, 7].map((n) => (n - 1) % 3)).toEqual([0, 0, 0]);
    expect([3, 6, 9].map((n) => (n - 1) % 3)).toEqual([2, 2, 2]);
    expect(text("garden")).toContain("넓이는 $21\\,\\text{m}^2$였다");
    expect([2 * (7 + 3), 7 * 3]).toEqual([20, 21]);
    expect(text("map")).toContain("$1\\,\\text{cm}$가 $50\\,\\text{m}$");
    expect([3 * 100, 2 * 100, 100 / 2]).toEqual([300, 200, 50]);
    expect(text("balance")).toContain("한 주머니에는 네 개씩");
    expect((11 - 3) / 2).toBe(4);
    expect(text("weather")).toContain("평균은 $20\\,{}^\\circ\\text{C}$였다");
    expect([(18 + 20 + 22 + 20) / 4, (14 + 20 + 26 + 20) / 4]).toEqual([
      20, 20,
    ]);
    expect([26 - 14, 22 - 18]).toEqual([12, 4]);
  });
});
