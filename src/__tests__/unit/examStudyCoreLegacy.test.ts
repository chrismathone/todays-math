import { describe, expect, it } from "vitest";
import { registeredTypes, generateMiddleProblem } from "@/lib/middle/generate";
import { registeredHighTypes } from "@/lib/high/generate";
import { nativeDescriptiveDefinitions } from "@/lib/engine/nativeDescriptive20261018";
import { listedForms } from "@/lib/elementary/forms";
import { elementaryUnits } from "@/lib/elementary/generate";
import {
  legacyStudyFamilies,
  nativeQuestionFormat,
} from "@/lib/examStudy/adapters";
import { getExamStudyCatalog } from "@/lib/examStudy/registry";
import { generateExamStudy } from "@/lib/examStudy/generate";
import { familyCoverage } from "@/lib/examStudy/evidence";
import {
  CURATED_LEGACY_CHECKS,
  curatedLegacyCheck,
  verifyFunctionUniqueness,
  verifyLineProperties,
  verifyNaturalSolutionCount,
  verifyNaturalParameter,
  verifyRationalRootParameter,
  verifySignQuadrant,
} from "@/lib/examStudy/legacyVerification";
import type { ExamStudyDraft } from "@/contracts/examStudy.contract";

function draft(content: string, answer: string): ExamStudyDraft {
  return {
    content,
    answer,
    solution: "발문의 조건을 독립 검산한다.",
    difficulty: "기본",
    difficultyBasis: ["독립 검산"],
    parameters: { test: true },
    figureSpec: null,
    questionType: "단답형",
  };
}
const negativeAnswer = (p: ExamStudyDraft) => ({ ...p, answer: "$999999$" });

describe("curated legacy evidence reads printed mathematics", () => {
  it("forces natural and negative-integer branches and excludes zero/domain endpoints", () => {
    const natural = draft(
      "$x$에 대한 일차방정식 $3x+a=x+9$의 해가 자연수가 되도록 하는 자연수 $a$의 값을 모두 구하시오.",
      "$1$, $3$, $5$, $7$",
    );
    const negative = draft(
      "$x$에 대한 일차방정식 $x+a=3x+9$의 해가 음의 정수가 되도록 하는 자연수 $a$의 개수를 구하시오.",
      "$4$개",
    );
    expect(verifyNaturalParameter(natural).valid).toBe(true);
    expect(verifyNaturalParameter(negative).valid).toBe(true);
    expect(
      verifyNaturalParameter({ ...natural, answer: "$1$, $3$, $5$, $7$, $9$" })
        .valid,
    ).toBe(false);
    expect(verifyNaturalParameter({ ...negative, answer: "$5$개" }).valid).toBe(
      false,
    );
  });
  it.each(Object.keys(CURATED_LEGACY_CHECKS))(
    "independently solves 64 actual outputs of %s and rejects wrong answers",
    (normalizedKey) => {
      const entry = registeredTypes().find(
        (e) => e.key.replace(/\s+/g, " ") === normalizedKey,
      );
      expect(entry, normalizedKey).toBeDefined();
      const check = curatedLegacyCheck(entry!.key)!;
      for (let seed = 1; seed <= 64; seed++) {
        const p = generateMiddleProblem(entry!.key, seed * 7919, seed % 5);
        const item = {
          ...draft(p.content, p.answer),
          difficulty: p.difficulty,
          questionType: nativeQuestionFormat(p),
          figureSpec: p.figureSpec ?? null,
        };
        expect(
          check.verify(item),
          `${entry!.key} seed ${seed}\n${p.content}`,
        ).toMatchObject({
          valid: true,
          checks: ["independent-solution", "essential-conditions"],
        });
        expect(check.verify(negativeAnswer(item)).valid).toBe(false);
      }
    },
  );
  it("covers every sign-condition/coordinate-transform branch and essential-condition removal", () => {
    const conditions = [
      "$ab>0$, $a+b>0$",
      "$ab>0$, $a+b<0$",
      "$ab<0$, $a>b$",
      "$ab<0$, $a<b$",
    ];
    const transforms = [
      "(a, b)",
      "(b, a)",
      "(-a, b)",
      "(a, -b)",
      "(-a, -b)",
      "(ab, a-b)",
      "(ab, b-a)",
    ];
    // Expected quadrants are a separate sign table, not generator transformation callbacks.
    const quadrants = [
      [1, 1, 2, 4, 3],
      [3, 3, 4, 2, 1],
      [4, 2, 3, 1, 2, 2, 3],
      [2, 4, 1, 3, 4, 3, 2],
    ];
    for (let c = 0; c < 4; c++)
      for (let t = 0; t < quadrants[c]!.length; t++) {
        const item = draft(
          `${conditions[c]}일 때, 점 $${transforms[t]}$는 제 몇 사분면 위의 점인지 구하시오.`,
          `제$${quadrants[c]![t]}$사분면`,
        );
        expect(verifySignQuadrant(item).valid, item.content).toBe(true);
        expect(
          verifySignQuadrant({
            ...item,
            content: item.content.replace(/, \$[^$]+\$일 때/, "일 때"),
          }).valid,
        ).toBe(false);
      }
    // If a-b is used under same-sign conditions its sign is not determined.
    expect(
      verifySignQuadrant(
        draft(
          "$ab>0$, $a+b>0$일 때, 점 $(ab, a-b)$는 제 몇 사분면 위의 점인지 구하시오.",
          "제$1$사분면",
        ),
      ).valid,
    ).toBe(false);
  });
  it("checks all 56 unordered selections of printed function relations, including nonuniqueness witnesses", () => {
    const relations = [
      ["자연수 $x$의 약수의 개수 $y$", true],
      ["자연수 $x$의 약수 $y$", false],
      ["자연수 $x$를 $3$으로 나눈 나머지 $y$", true],
      ["절댓값이 $x$인 정수 $y$", false],
      ["$x$보다 $2$만큼 큰 수 $y$", true],
      ["자연수 $x$보다 작은 홀수 $y$", false],
      ["한 개에 $500$원인 물건 $x$개의 값 $y$원", true],
      ["둘레의 길이가 $x$인 직사각형의 넓이 $y$", false],
    ] as const;
    const marks = "①②③④⑤";
    let tested = 0;
    for (let mask = 0; mask < 256; mask++) {
      const selected = relations.filter((_, i) => mask & (1 << i));
      if (selected.length !== 5) continue;
      const content =
        "다음 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.\n" +
        selected.map(([s], i) => `${marks[i]} ${s}`).join("\n");
      expect(
        verifyFunctionUniqueness(
          draft(content, `$${selected.filter(([, v]) => v).length}$개`),
        ).valid,
      ).toBe(true);
      tested++;
    }
    expect(tested).toBe(56);
  });
  it("tests all slope/intercept sign combinations, every quadrant, and independent truth/false flips", () => {
    const marks = "①②③④⑤";
    for (const a of [-3, -1, 1, 4])
      for (const b of [-6, -1, 2, 5])
        for (let q = 1; q <= 4; q++)
          for (const wrong of [false, true]) {
            const coefficient = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
            const line = `${coefficient}${b > 0 ? "+" : ""}${b}`;
            const intercept = wrong ? b + 1 : b;
            const dy = wrong ? -a : a;
            const py = wrong ? a * 2 + b + 1 : a * 2 + b;
            const properties = [
              `오른쪽 ${a > 0 ? "위" : "아래"}로 향하는 직선이다.`,
              `$y$절편은 $${intercept}$이다.`,
              `$x$의 값이 $1$만큼 증가할 때 $y$의 값은 $${Math.abs(dy)}$만큼 ${dy > 0 ? "증가" : "감소"}한다.`,
              `점 $(2, ${py})$를 지난다.`,
              `제$${q}$사분면을 지난다.`,
            ];
            // Geometric witness samples include intercept neighbours and each infinity.
            const xs = [
              -1000,
              -Math.abs(b / a) - 1,
              -0.001,
              0.001,
              Math.abs(b / a) + 1,
              1000,
            ];
            const observed = new Set<number>(
              xs.map((x) =>
                x > 0 ? (a * x + b > 0 ? 1 : 4) : a * x + b > 0 ? 2 : 3,
              ),
            );
            const count = 1 + (wrong ? 0 : 3) + (observed.has(q) ? 1 : 0);
            const item = draft(
              `일차함수 $y=${line}$의 그래프에 대한 다음 설명 중 옳은 것은 모두 몇 개인지 구하시오.\n${properties.map((p, i) => `${marks[i]} ${p}`).join("\n")}`,
              `$${count}$개`,
            );
            expect(verifyLineProperties(item).valid, item.content).toBe(true);
          }
  });
  it("enumerates original inequality truth rows at closed boundaries and rejects nonpositive infinite cases", () => {
    for (const bound of [20, 21, 24, 25, 35, 36, 63, 64, 140])
      for (let n = 2; n <= 9; n++) {
        const p = 3,
          q = 2,
          r = 2 * bound + p * q;
        const accepted: number[] = [];
        for (let a = -3; a <= bound + 2; a++) {
          let count = 0;
          for (let x = 1; x <= bound + 2; x++)
            if (p * (a * x + q) <= a * x + r) count++;
          if (a > 0 && count === n) accepted.push(a);
        }
        if (!accepted.length) continue;
        const item = draft(
          `$x$에 대한 일차부등식 $${p}(ax+${q})\\le ax+${r}$을 만족시키는 자연수 $x$가 $${n}$개가 되도록 하는 정수 $a$의 값을 모두 구하여 그 합을 구하시오.`,
          `$${accepted.reduce((s, a) => s + a, 0)}$`,
        );
        expect(verifyNaturalSolutionCount(item).valid, item.content).toBe(true);
        expect(verifyNaturalSolutionCount(negativeAnswer(item)).valid).toBe(
          false,
        );
      }
  });
  it("keeps repeated roots and rejects irrational/negative-discriminant/nonnatural candidates", () => {
    // x²-6x+k: k=5,8,9 give (1,5),(2,4),(3,3). k=9 is a repeated root.
    const item = draft(
      "이차방정식 $1x^{2}-6x+k=0$의 두 근이 모두 유리수가 되도록 하는 자연수 $k$의 값을 모두 구하고, 그 합을 구하시오.",
      "$22$",
    );
    expect(verifyRationalRootParameter(item).valid).toBe(true);
    expect(verifyRationalRootParameter({ ...item, answer: "$13$" }).valid).toBe(
      false,
    ); // omitted repeated root
    expect(verifyRationalRootParameter({ ...item, answer: "$23$" }).valid).toBe(
      false,
    ); // irrational k=1 added
    expect(
      verifyRationalRootParameter({
        ...item,
        content: item.content.replace("자연수", "정수"),
      }).valid,
    ).toBe(false);
  });
});

describe("readonly adapters and conservative catalogs", () => {
  it("preserves original registry identities/counts and exposes actual supported courses only", () => {
    const middle = registeredTypes().map((e) => [e.key, e.handler]);
    const high = registeredHighTypes().map((e) => [e.key, e.handler]);
    const native = nativeDescriptiveDefinitions();
    const formCounts = elementaryUnits().map((u) => listedForms(u).length);
    const all = getExamStudyCatalog();
    expect(all.families.length).toBeGreaterThan(1000);
    expect(registeredTypes().map((e) => [e.key, e.handler])).toEqual(middle);
    expect(registeredHighTypes().map((e) => [e.key, e.handler])).toEqual(high);
    expect(nativeDescriptiveDefinitions()).toBe(native);
    expect(elementaryUnits().map((u) => listedForms(u).length)).toEqual(
      formCounts,
    );
    expect(
      getExamStudyCatalog("공통수학2").families.filter(
        (f) => f.source === "high",
      ),
    ).toEqual([]);
    for (const course of [
      "초3",
      "초4",
      "초5",
      "초6",
      "중1",
      "중2",
      "중3",
      "공통수학1",
    ] as const)
      expect(
        getExamStudyCatalog(course).families.some((f) => f.course === course),
      ).toBe(true);
  });
  it("respects author short-only policies and never advertises written derivation", () => {
    const all = legacyStudyFamilies();
    const shortOnly = elementaryUnits().flatMap((unit) =>
      listedForms(unit)
        .filter((f) => f.allowMultipleChoice === false)
        .map(
          (form) =>
            `legacy:elem:${unit.grade}|${unit.section.split(" ")[0]}|${form.id}`,
        ),
    );
    expect(shortOnly.length).toBeGreaterThan(0);
    for (const id of shortOnly)
      expect(all.find((f) => f.id === id)?.formats).toEqual(["단답형"]);
    expect(
      all
        .filter((f) => f.source !== "native")
        .every((f) => !f.formats.includes("서술형")),
    ).toBe(true);
    expect(all.filter((f) => f.source === "native")).toHaveLength(6);
    expect(
      all
        .filter((f) => f.source === "native")
        .every((f) => f.formats.join() === "서술형"),
    ).toBe(true);
  });
  it("does not infer school full from a legacy title, and honors unsupported bare formats/difficulties", async () => {
    const all = legacyStudyFamilies();
    // Six original curated checks plus the six independently verified overlays.
    expect(all.filter((f) => f.evidence).length).toBe(12);
    const count = all.find((f) => f.id === "legacy:mid:1-1|좌표와 그래프|84X")!;
    expect(familyCoverage(count, "graph.piecewise-multi-claim")).toBe(
      "unverified",
    );
    const elementary = all.find(
      (f) =>
        f.source === "elementary" &&
        f.difficulties.includes("기본") &&
        f.formats.includes("단답형"),
    )!;
    const refused = await generateExamStudy(
      {
        course: elementary.course,
        familyIds: [elementary.id],
        seed: 10,
        count: 1,
        difficulty: "심화상",
      },
      { families: [elementary], profiles: [] },
    );
    expect(refused.status).toBe("unavailable");
    const native = all.find((f) => f.source === "native")!;
    const generated = await generateExamStudy(
      {
        course: native.course,
        familyIds: [native.id],
        seed: 10,
        count: 1,
        format: "서술형",
      },
      { families: [native], profiles: [] },
    );
    expect(generated.questions[0]!.rubric!.totalPoints).toBe(6);
    expect(generated.warnings.join(" ")).toMatch(/일반 연습/);
  });
});
