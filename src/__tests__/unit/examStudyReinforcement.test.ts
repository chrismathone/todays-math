import { describe, expect, it } from "vitest";
import type { ExamStudyDraft } from "@/contracts/examStudy.contract";
import { serializeNativeSolution } from "@/contracts/nativeDescriptive.contract";
import {
  legacyStudyFamilies,
  deriveStudyMultipleChoice,
} from "@/lib/examStudy/adapters";
import { REINFORCEMENT_IDS } from "@/lib/examStudy/legacyReinforcement";
import { familyCoverage, verifyDraft } from "@/lib/examStudy/evidence";
import {
  contentDigest,
  logicalKey,
  stableStringify,
} from "@/lib/examStudy/identity";
import { generateExamStudy } from "@/lib/examStudy/generate";
import {
  verifyReinforcedClassification,
  verifyReinforcedModel,
} from "@/lib/examStudy/reinforcementVerification";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { generateNativeDescriptive } from "@/lib/engine/nativeDescriptive20261018";

const families = legacyStudyFamilies();
const get = (id: string) => families.find((f) => f.id === id)!;
const ids = Object.entries(REINFORCEMENT_IDS);
const numeric = (s: string): number => {
  const raw = s.replace(/\$/g, "").replace(/個|개/g, "").trim();
  const m = /^(-?)\\(?:dfrac|frac)\{(\d+)\}\{(\d+)\}$/.exec(raw);
  return m ? ((m[1] ? -1 : 1) * Number(m[2])) / Number(m[3]) : Number(raw);
};
const solutionHead = (item: ExamStudyDraft) =>
  item.solution.split("\n\n채점 기준")[0]!;
const bare = (
  content: string,
  answer: string,
  solution: string,
): ExamStudyDraft => ({
  content,
  answer,
  solution,
  questionType: "단답형",
  difficulty: "응용",
  difficultyBasis: ["수동 경계"],
  figureSpec: null,
  parameters: { ignored: true },
});

/** Test-side arithmetic reads the printed fields; never use family parameters/facts as an answer oracle. */
function independentPrintedAnswer(kind: string, item: ExamStudyDraft): void {
  if (kind === "candidate") {
    const rows = [
      ...item.content.matchAll(
        /\$(-?\d+)x([+-]\d+)=(-?\d+)\$, 후보 \$x=(-?\d+)\$/g,
      ),
    ];
    expect(rows).toHaveLength(5);
    const truths = rows.map(
      (m) => Number(m[1]) * Number(m[4]) + Number(m[2]) === Number(m[3]),
    );
    expect(numeric(item.answer)).toBe(truths.filter(Boolean).length);
  } else if (kind === "equality") {
    const k = Number(/\$a=(-?\d+)b\$/.exec(item.content)![1]);
    const eqs = item.content
      .split("\n")
      .slice(1)
      .map((s) => s.slice(4, -1));
    const truths = eqs.map((s) => {
      let m: RegExpExecArray | null;
      if ((m = /^a\+(\d+)=(-?\d+)b\+(\d+)$/.exec(s)))
        return k === Number(m[2]) && m[1] === m[3];
      if ((m = /^\\frac\{a\}\{(-?\d+)\}=b$/.exec(s))) return k === Number(m[1]);
      if (/^a=-?\d+b\+\d+$/.test(s)) return false; // fails at b=0
      if (/^\\frac\{a\}\{b\}=-?\d+$/.test(s)) return false; // undefined at b=0
      if ((m = /^a\^\{2\}=(-?\d+)b\^\{2\}$/.exec(s)))
        return k * k === Number(m[1]);
      throw new Error(`Unrecognized test statement ${s}`);
    });
    expect(numeric(item.answer)).toBe(truths.filter(Boolean).length);
  } else if (kind === "simplify") {
    const m = /\$\((-?\d+)x([+-]\d+)\)([+-]\d+)\((-?\d+)x([+-]\d+)\)\$/.exec(
      item.content,
    )!;
    const [a, b, k, c, d] = m.slice(1).map(Number);
    expect(numeric(item.answer)).toBe(a! + k! * c! + b! + k! * d!);
  } else if (kind === "model") {
    const nums = [...item.content.matchAll(/\$(\d+)\$/g)].map((m) =>
      Number(m[1]),
    );
    const [a, b, c, d] = nums,
      delta = item.content.includes("크다고") ? d! : -d!;
    const x = (delta - b!) / (a! - c!);
    expect(numeric(item.answer)).toBe(x);
    expect(a! * x + b! - c! * x).toBe(delta);
    expect(item.solution).toContain(
      `첫 계산 $${a}\\times${x}+${b}=${a! * x + b!}$`,
    );
    expect(item.solution).toContain(`비교 계산 $${c}\\times${x}=${c! * x}$`);
  } else if (kind === "rectangle") {
    const [l, w, p, q] = [
      ...item.content.split("\n")[0]!.matchAll(/\$(\d+)\$/g),
    ].map((m) => Number(m[1]));
    const t = w! / q! - l! / p!;
    const roots = /모든 실근: ([^\n]+)/.exec(item.solution)![1]!;
    const numbers = [...roots.matchAll(/\$([^$]+)\$/g)].map((m) =>
      numeric(m[1]!),
    );
    expect(numbers).toEqual(t === 0 ? [0] : [0, t]);
    if (t <= 0) expect(item.answer).toBe("양의 회복 시각 없음");
    else {
      const values = [...item.answer.matchAll(/\$([^$]+)\$/g)].map((m) =>
        numeric(m[1]!),
      );
      expect(values).toEqual([t, l! + p! * t, w! - q! * t]);
      expect(t).toBeLessThan(w! / q!);
      expect((l! + p! * t) * (w! - q! * t)).toBe(l! * w!);
    }
  } else {
    // Independent exact coefficient extraction for the existing generator's closed grammar.
    function coefficients(text: string): number[] {
      const s = text.replace(/\\left|\\right/g, "");
      const bracket = /^(-?\d+)\(x([+-]\d+)\)$/.exec(s);
      if (bracket)
        return [Number(bracket[1]) * Number(bracket[2]), Number(bracket[1]), 0];
      const quad = /^x\^\{2\}([+-]\d+)$/.exec(s);
      if (quad) return [Number(quad[1]), 0, 1];
      const lin = /^(-?\d*)x([+-]\d+)?$/.exec(s);
      if (lin)
        return [
          Number(lin[2] ?? 0),
          lin[1] === "-" ? -1 : lin[1] === "" ? 1 : Number(lin[1]),
          0,
        ];
      if (/^-?\d+$/.test(s)) return [Number(s), 0, 0];
      throw new Error(`Outside existing printed classification grammar: ${s}`);
    }
    const eqs = [...item.content.split("\n")[1]!.matchAll(/\$([^$]+)\$/g)];
    let count = 0;
    for (const m of eqs) {
      const [a, b] = m[1]!.split("=").map(coefficients);
      if (a![2] === b![2] && a![1] !== b![1]) count++;
    }
    expect(numeric(item.answer)).toBe(count);
  }
}

const removedCondition: Record<string, (s: string) => string> = {
  candidate: (s) => s.replace("자기 행의 후보를 대입할 때", ""),
  equality: (s) => s.replace("$b=0$인 경우도 포함하여", ""),
  classification: (s) => s.replace("일차방정식인", "방정식인"),
  model: (s) => s.replace("배보다", "배와"),
  simplify: (s) => s.replace("상수항 $B$", "$B$"),
  rectangle: (s) =>
    s.replace("두 변의 길이가 모두 양수인 동안만 생각한다.", ""),
};

describe("six examStudy-only reinforcements", () => {
  it("preserves IDs, source engines, unrelated versions, and only changes the intended evidence", () => {
    expect(ids).toHaveLength(6);
    expect(new Set(families.map((f) => f.id)).size).toBe(families.length);
    const set = new Set<string>(Object.values(REINFORCEMENT_IDS));
    expect(
      families
        .filter((f) => f.version !== "9cfbb8683-r1")
        .map((f) => f.id)
        .sort(),
    ).toEqual([...set].sort());
    const unrelated = get("legacy:mid:1-1|좌표와 그래프|84X");
    expect(familyCoverage(unrelated, "graph.piecewise-multi-claim")).toBe(
      "unverified",
    );
    expect(
      familyCoverage(
        get(REINFORCEMENT_IDS.model),
        "written.dependent-formula-min-time",
      ),
    ).toBe("unverified");
    const original = generateMiddleProblem(
      REINFORCEMENT_IDS.candidate.replace("legacy:mid:", ""),
      71,
      0,
    );
    expect(original.content).not.toContain("각각의 후보");
    expect(
      generateNativeDescriptive("m3-quadratic-domain-r1", 71, 0).content,
    ).not.toContain("매분");
    expect(
      registeredTypes().find(
        (t) => `legacy:mid:${t.key}` === REINFORCEMENT_IDS.classification,
      ),
    ).toBeDefined();
  });
  it.each(ids)(
    "checks the complete declared finite domain or 512 honest existing-scope samples: %s",
    (kind, id) => {
      const f = get(id);
      expect(f).toBeDefined();
      const count = f.paramDomain.kind === "finite" ? f.paramDomain.size : 512;
      expect(f.evidence!.sampleCount).toBe(count);
      expect(f.evidence!.testFile).toBe(
        "src/__tests__/unit/examStudyReinforcement.test.ts",
      );
      const domains =
        f.paramDomain.kind === "finite"
          ? new Set(f.paramDomain.enumerate().map(stableStringify))
          : undefined;
      const seen = new Set<string>(),
        mcSeen = new Set<string>();
      for (let i = 0; i < count; i++) {
        const item =
          f.paramDomain.kind === "finite"
            ? f.generate(0, i)
            : f.generate((Math.floor(i / 2) + 1) * 7919, i % 2);
        independentPrintedAnswer(kind, item);
        expect(
          verifyDraft(f, item),
          `${kind} case ${i}\n${item.content}`,
        ).toMatchObject({ valid: true, checks: f.evidence!.checks });
        expect(
          familyCoverage(
            f,
            f.fulfills.find((r) => r.level === "full")!.requirement,
            f.verify(item),
            item,
          ),
        ).toBe("full");
        const key = stableStringify(f.canonicalParams(item));
        seen.add(key);
        if (domains) expect(domains.has(key)).toBe(true);
        // Adversarial generator metadata must not affect a mathematical verdict.
        expect(
          f.verify({ ...item, parameters: { answer: "999999", truths: [] } })
            .valid,
        ).toBe(true);
        expect(f.verify({ ...item, answer: "$999999$" }).valid).toBe(false);
        const plausibleWrong =
          item.questionType === "서술형"
            ? item.answer.includes("없음")
              ? "$0$분 후; 가로 $4$ cm, 세로 $4$ cm"
              : item.answer.replace(/^\$[^$]+\$/, "$0$")
            : `$${numeric(item.answer) === 12 && kind === "model" ? 11 : numeric(item.answer) + 1}$${item.answer.endsWith("개") ? "개" : ""}`;
        expect(f.verify({ ...item, answer: plausibleWrong }).valid).toBe(false);
        const missing = {
          ...item,
          content: removedCondition[kind]!(item.content),
        };
        expect(missing.content).not.toBe(item.content);
        expect(f.verify(missing).valid).toBe(false);
        expect(
          f.verify({
            ...item,
            solution: item.solution.replace(/\$[^$]+\$/, "$999999$"),
          }).valid,
        ).toBe(false);
        expect(
          f.verify({ ...item, solution: "삼각형의 세 각의 합을 이용한다." })
            .valid,
        ).toBe(false);
        if (f.formats.includes("객관식")) {
          const mc = deriveStudyMultipleChoice(item, f.id, i + 71);
          expect(f.verify(mc), `${kind} MC ${i}`).toMatchObject({
            valid: true,
          });
          expect(logicalKey(f, f.canonicalParams(mc))).toBe(
            logicalKey(f, f.canonicalParams(item)),
          );
          expect(contentDigest(mc)).toBe(contentDigest(item));
          mcSeen.add(key);
          const wrongMark = mc.answer === "①" ? "②" : "①";
          expect(f.verify({ ...mc, answer: wrongMark }).valid).toBe(false);
        }
        if (item.rubric) {
          for (const criterion of item.rubric.criteria) {
            for (const part of [
              "expected",
              "alternatives",
              "errors",
            ] as const) {
              const mutation = structuredClone(item);
              const c = mutation.rubric!.criteria.find(
                (c) => c.criterionId === criterion.criterionId,
              )!;
              if (part === "expected")
                c.expected = "세 각의 합이 180도인지 확인";
              else c[part] = ["삼각형의 각을 이용함"];
              mutation.solution = serializeNativeSolution(
                solutionHead(item),
                mutation.rubric!,
              );
              expect(
                f.verify(mutation).valid,
                `${criterion.criterionId}.${part}`,
              ).toBe(false);
            }
          }
        }
      }
      if (domains) expect(seen.size).toBe(count);
      if (f.formats.includes("객관식")) expect(mcSeen).toEqual(seen);
    },
  );

  it("forces exact degree, zero polynomial, nonzero constant, and quadratic-cancellation branches", () => {
    const content =
      "다음 중 일차방정식인 것의 개수를 구하시오.\n$x^{2}+2x=x^{2}+3$, $2(x+3)=2x+6$, $2x+3=2x+4$, $x^{2}+1=x$, $-3x+4=0$";
    const solution =
      "ㄱ: 양변을 정리하면 $2x-3=0$이므로 일차방정식이다.\nㄴ: 양변을 정리하면 $0=0$이므로 항등식이다.\nㄷ: 양변을 정리하면 $-1=0$이므로 불가능한 등식이다.\nㄹ: 양변을 정리하면 $x^{2}-x+1=0$이므로 이차방정식이다.\nㅁ: 양변을 정리하면 $-3x+4=0$이므로 일차방정식이다.\n일차방정식인 항목: ㄱ, ㅁ. 따라서 $2$개이다.";
    const item = bare(content, "$2$개", solution);
    expect(verifyReinforcedClassification(item).valid).toBe(true);
    expect(
      verifyReinforcedClassification({
        ...item,
        solution: solution.replace("항등식이다", "일차방정식이다"),
      }).valid,
    ).toBe(false);
    expect(
      verifyReinforcedClassification({
        ...item,
        solution: solution.replace("$0=0$", "$1=0$"),
      }).valid,
    ).toBe(false);
    expect(
      verifyReinforcedClassification({
        ...item,
        solution: solution.replace("ㄱ, ㅁ", "ㄱ, ㄴ"),
      }).valid,
    ).toBe(false);
    expect(
      verifyReinforcedClassification({
        ...item,
        content: content.replace("x^{2}+1=x", "x^{2}+1=x^{2}+1"),
      }).valid,
    ).toBe(false);
  });

  it("exercises every rectangle time branch and rejects root/domain/solution/rubric math mutations", () => {
    const f = get(REINFORCEMENT_IDS.rectangle),
      seen = new Set<string>();
    for (let v = 0; v < 60; v++) {
      const p = f.generate(0, v),
        head = solutionHead(p);
      seen.add(
        p.answer.includes("없음")
          ? head.includes("중근")
            ? "zero"
            : "negative"
          : "positive",
      );
      const mutations = [
        {
          ...p,
          content: p.content.replace(
            "처음 시각 $t=0$을 제외하고 양의 회복 시각",
            "회복 시각",
          ),
        },
        {
          ...p,
          solution: p.solution.replace(
            "$t=0$은 처음 시각이므로 제외한다.",
            "$t=0$을 회복 시각으로 인정한다.",
          ),
        },
        {
          ...p,
          solution: p.solution.replace(/\$0<t<([^$]+)\$/, "$0<t\\le$1$"),
        },
        {
          ...p,
          solution: p.solution.replace(/모든 실근: \$0\$/, "모든 실근: $999$"),
        },
        {
          ...p,
          solution: p.solution.replace(/\$W\(t\)=([^$]+)\$/, "$W(t)=999$"),
        },
      ];
      if (!p.answer.includes("없음"))
        mutations.push({
          ...p,
          solution: p.solution.replace(
            /대입 확인: \$L\([^$]+\)=([^$]+)\$/,
            "대입 확인: $L(0)=$1$",
          ),
        });
      for (const bad of mutations) expect(f.verify(bad).valid).toBe(false);
      const rubric = structuredClone(p);
      rubric.rubric!.criteria[0]!.expected =
        rubric.rubric!.criteria[0]!.expected.replace(/0<t<[^$]+/, "0<t<999");
      expect(f.verify(rubric).valid).toBe(false);
    }
    expect([...seen].sort()).toEqual(["negative", "positive", "zero"]);
  });

  it("observes signed model differences and equality/simplification boundary values", () => {
    const branches = new Set<string>(),
      m = get(REINFORCEMENT_IDS.model);
    for (let seed = 1; seed <= 256; seed++) {
      const p = m.generate(seed * 7919, seed % 2),
        nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
      branches.add(
        `${p.content.includes("크다고") ? "greater" : "smaller"}:${nums[0]! > nums[2]! ? "positive" : "negative"}`,
      );
    }
    expect(branches.size).toBe(3); // a<c allows both; a>c with b>0 is always greater.
    // Three independently authored fixtures force every feasible sign/relation branch.
    for (const [a, b, c, x] of [
      [2, 1, 3, 2],
      [2, 5, 3, 2],
      [3, 1, 2, 2],
    ]) {
      const delta = a! * x! + b! - c! * x!,
        first = a! * x! + b!,
        second = c! * x!,
        relation = delta > 0 ? "크다" : "작다";
      const item = bare(
        `어떤 수에 $${a}$${a === 2 ? "를" : "을"} 곱한 후 $${b}$${b === 1 ? "을" : "를"} 더한 수는 어떤 수의 $${c}$배보다 $${Math.abs(delta)}$만큼 ${relation}고 한다. 어떤 수를 구하시오.`,
        `$${x}$`,
        `어떤 수를 $x$라 하면 $${a}x+${b}=${c}x${delta < 0 ? "" : "+"}${delta}$이다.\n정리하여 풀면 $x=${x}$이다.\n원상황 확인: 첫 계산 $${a}\\times${x}+${b}=${first}$, 비교 계산 $${c}\\times${x}=${second}$이다.\n$${first}-${second}=${delta}$이므로 첫 계산은 비교 계산보다 $${Math.abs(delta)}$만큼 ${relation}.`,
      );
      expect(verifyReinforcedModel(item).valid).toBe(true);
      expect(
        verifyReinforcedModel({
          ...item,
          content: item.content.replace(
            `${relation}고`,
            `${relation === "크다" ? "작다" : "크다"}고`,
          ),
        }).valid,
      ).toBe(false);
    }
    const s = get(REINFORCEMENT_IDS.simplify);
    let zeroA = false,
      zeroB = false;
    for (let v = 0; v < 144; v++) {
      const p = s.generate(0, v);
      zeroA ||= p.solution.includes("$A=0$");
      zeroB ||= p.solution.includes("$B=0$");
    }
    expect(zeroA && zeroB).toBe(true);
    const e = get(REINFORCEMENT_IDS.equality),
      p = e.generate(0, 0);
    expect(
      e.verify({
        ...p,
        solution: p.solution.replace(
          "$b=0$, $a=0$에서 분모가",
          "$b=1$, $a=-3$에서 분모가",
        ),
      }).valid,
    ).toBe(false);
  });

  it.each(ids)(
    "allocates full only in supported formats, preserving logical identity: %s",
    async (kind, id) => {
      const f = get(id),
        requirement = f.fulfills.find((r) => r.level === "full")!.requirement;
      for (const format of ["혼합", "객관식", "단답형", "서술형"] as const) {
        const out = await generateExamStudy(
          {
            course: f.course,
            familyIds: [id],
            requirementIds: [requirement],
            count: 1,
            seed: 20261019,
            format,
          },
          { families: [f], profiles: [] },
        );
        const supported = format === "혼합" || f.formats.includes(format);
        expect(out.questions).toHaveLength(supported ? 1 : 0);
        expect(out.requirements[0]!.status).toBe(
          supported ? "full" : "unavailable",
        );
        if (supported)
          expect(out.questions[0]!.requirements).toContain(requirement);
      }
      if (kind !== "rectangle") {
        const short = await generateExamStudy(
          {
            course: f.course,
            familyIds: [id],
            count: 3,
            maxPerFamily: 3,
            seed: 71,
            format: "단답형",
          },
          { families: [f], profiles: [] },
        );
        const mc = await generateExamStudy(
          {
            course: f.course,
            familyIds: [id],
            count: 3,
            maxPerFamily: 3,
            seed: 71,
            format: "객관식",
          },
          { families: [f], profiles: [] },
        );
        expect(new Set(short.questions.map((p) => p.logicalKey)).size).toBe(3);
        expect(new Set(mc.questions.map((p) => p.logicalKey)).size).toBe(3);
        for (const q of [...short.questions, ...mc.questions]) {
          const base = f.generate(q.seed, q.variant);
          expect(q.logicalKey).toBe(logicalKey(f, f.canonicalParams(base)));
          expect(contentDigest(q)).toBe(contentDigest(base));
        }
      }
    },
  );
});
