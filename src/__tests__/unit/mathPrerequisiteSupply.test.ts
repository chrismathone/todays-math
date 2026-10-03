import { describe, expect, it } from "vitest";
import { normalizeContent } from "@/lib/math-prerequisite/evidence";
import {
  SESSION_TIER_PATTERN,
  stableSeed,
  supplySafeSession,
  type SessionGenerator,
} from "@/lib/math-prerequisite/supply";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { publicCourseSession } from "@/lib/math-srs/courseAutomation";

const NOW = new Date("2026-10-03T01:00:00.000Z");

function counting(base: SessionGenerator = generateCourseSession) {
  const calls: { sectionId: string; seed: number }[] = [];
  const generate: SessionGenerator = (sectionId, seed, now, mode, bank) => {
    calls.push({ sectionId, seed });
    return base(sectionId, seed, now, mode, bank);
  };
  return { calls, generate };
}

describe("안전한 세션 공급 — 기존 생성기를 그대로 부르고 거르기만 한다", () => {
  it("상태에서 나온 열쇠는 늘 같은 씨앗이고, 열쇠가 다르면 씨앗도 다르다", () => {
    expect(stableSeed("check:a:5-1-5-4#0")).toBe(
      stableSeed("check:a:5-1-5-4#0"),
    );
    expect(stableSeed("check:a:5-1-5-4#0")).not.toBe(
      stableSeed("check:b:5-1-5-4#0"),
    );
    const seed = stableSeed("x");
    expect(Number.isSafeInteger(seed) && seed >= 0 && seed < 2 ** 32).toBe(
      true,
    );
  });

  it("다섯 문항 · 갈래 차례 · 서버 채점 · 그림 없음 · 본 적 없는 서로 다른 본문", () => {
    const result = supplySafeSession({
      sectionId: "5-1-5-4",
      mode: "review",
      key: "check:s1:5-1-5-4",
      avoid: new Set(),
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.problems.map((p) => p.tier)).toEqual([
      ...SESSION_TIER_PATTERN,
    ]);
    expect(result.problems.every((p) => p.sectionId === "5-1-5-4")).toBe(true);
    expect(result.problems.every((p) => p.input.mode === "number")).toBe(true);
    expect(result.problems.every((p) => p.figureSpec === null)).toBe(true);
    expect(result.problems.every((p) => p.interactive === null)).toBe(true);
    expect(result.problems.every((p) => p.answerChoices?.length === 4)).toBe(
      true,
    );
    const contents = result.problems.map((p) => normalizeContent(p.content));
    expect(new Set(contents).size).toBe(5);
    expect(result.seed).toBe(
      stableSeed(`check:s1:5-1-5-4#${result.candidateIndex}`),
    );
  });

  it("같은 열쇠와 같은 피할 본문이면 같은 문항이 나온다(사전 검사와 시작이 같다)", () => {
    const input = {
      sectionId: "5-2-2-1",
      mode: "learn" as const,
      key: "return:p:5-2-2-1",
      avoid: new Set<string>(),
      now: NOW,
    };
    expect(supplySafeSession(input)).toEqual(supplySafeSession(input));
  });

  it("본 적 있는 본문이 하나라도 든 후보는 건너뛴다", () => {
    const key = "check:s2:5-1-5-3";
    const first = supplySafeSession({
      sectionId: "5-1-5-3",
      mode: "review",
      key,
      avoid: new Set(),
      now: NOW,
    });
    if (!first.ok) throw new Error("첫 후보를 만들지 못했습니다.");
    const avoid = new Set([normalizeContent(first.problems[2].content)]);
    const next = supplySafeSession({
      sectionId: "5-1-5-3",
      mode: "review",
      key,
      avoid,
      now: NOW,
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.candidateIndex).toBeGreaterThan(first.candidateIndex);
    expect(
      next.problems.some((p) => avoid.has(normalizeContent(p.content))),
    ).toBe(false);
  });

  it("후보 20개가 모두 걸리면 반복 문항을 내지 않고 바닥났다고 말한다", () => {
    const selfCheck: SessionGenerator = (...args) => {
      const session = generateCourseSession(...args);
      session.problems[1] = {
        ...session.problems[1],
        input: { ...session.problems[1].input, mode: "self-check" },
        answerChoices: null,
      };
      return session;
    };
    const { calls, generate } = counting(selfCheck);
    const result = supplySafeSession(
      {
        sectionId: "5-1-5-4",
        mode: "review",
        key: "k",
        avoid: new Set(),
        now: NOW,
      },
      { generate },
    );
    expect(result).toEqual({ ok: false, tried: 20 });
    expect(calls).toHaveLength(20);
    expect(new Set(calls.map((c) => c.seed)).size).toBe(20);
  });

  it("세션 안에 같은 본문이 있거나 그림 · 보기 결함이 있는 후보도 버린다", () => {
    const duplicate: SessionGenerator = (...args) => {
      const session = generateCourseSession(...args);
      session.problems[4] = {
        ...session.problems[4],
        content: session.problems[3].content,
      };
      return session;
    };
    expect(
      supplySafeSession(
        {
          sectionId: "5-2-2-2",
          mode: "learn",
          key: "d",
          avoid: new Set(),
          now: NOW,
        },
        { generate: duplicate },
      ).ok,
    ).toBe(false);
    const figure: SessionGenerator = (...args) => {
      const session = generateCourseSession(...args);
      session.problems[0] = {
        ...session.problems[0],
        figureSpec: { kind: "x" },
      };
      return session;
    };
    expect(
      supplySafeSession(
        {
          sectionId: "5-2-2-2",
          mode: "learn",
          key: "f",
          avoid: new Set(),
          now: NOW,
        },
        { generate: figure },
      ).ok,
    ).toBe(false);
    const noChoices: SessionGenerator = (...args) => {
      const session = generateCourseSession(...args);
      session.problems[2] = { ...session.problems[2], answerChoices: null };
      return session;
    };
    expect(
      supplySafeSession(
        {
          sectionId: "5-2-2-2",
          mode: "learn",
          key: "c",
          avoid: new Set(),
          now: NOW,
        },
        { generate: noChoices },
      ).ok,
    ).toBe(false);
  });

  it("검증한 보기 넷이 조작형 입력에 가려지지 않으며 본문·정답·보기·씨앗은 보존한다", () => {
    const interactive: SessionGenerator = (...args) => {
      const session = generateCourseSession(...args);
      session.problems[0] = {
        ...session.problems[0],
        interactive: { kind: "fraction-parts", denominator: 5, shape: "bar" },
      };
      return session;
    };
    const { calls, generate } = counting(interactive);
    const result = supplySafeSession(
      {
        sectionId: "5-1-5-4",
        mode: "review",
        key: "interactive",
        avoid: new Set(),
        now: NOW,
      },
      { generate },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const original = interactive("5-1-5-4", result.seed, NOW, "review", []);
    expect(original.problems[0].interactive).not.toBeNull();
    expect(result.problems).toEqual(
      original.problems.map((problem) => ({ ...problem, interactive: null })),
    );
    expect(calls.at(-1)?.seed).toBe(result.seed);
    const suppliedView = publicCourseSession({
      ...original,
      problems: result.problems,
    });
    expect(
      suppliedView.problems.map((problem) => problem.answerChoices),
    ).toEqual(original.problems.map((problem) => problem.answerChoices));
    expect(
      suppliedView.problems.every((problem) => problem.interactive === null),
    ).toBe(true);
    // Existing ordinary sessions retain their original input presentation.
    expect(publicCourseSession(original).problems[0].interactive).toEqual(
      original.problems[0].interactive,
    );
  });

  it("은행 후보를 넘기지 않는다", () => {
    const seen: number[] = [];
    supplySafeSession(
      {
        sectionId: "5-2-2-1",
        mode: "learn",
        key: "b",
        avoid: new Set(),
        now: NOW,
      },
      {
        generate: (sectionId, seed, now, mode, bank) => {
          seen.push(bank?.length ?? 0);
          return generateCourseSession(sectionId, seed, now, mode, bank);
        },
      },
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => n === 0)).toBe(true);
  });
});
