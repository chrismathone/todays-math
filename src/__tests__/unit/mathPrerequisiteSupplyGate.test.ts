/**
 * 선수 확인 시범의 첫 관문(plan-v03 §5 · §11 «문제 공급»).
 *
 * 시범 소단원 넷이 **지금의 엔진 그대로** 서버 채점 문항만 내는지 잰다:
 *   ① 날 문항 — 소단원 × 연산·기본·응용 × 씨앗 0..199 를 `generateElementaryProblem` 으로
 *   ② 실제 세션 — 소단원마다 `generateCourseSession(소단원, 씨앗, 날짜, 모드, [])`(은행 없음) 200개를
 *      학생에게 나가는 모양(`publicCourseSession`)과 저장 스키마로
 * 자기채점 · 그림 · 보기 결함이 한 건이라도 나오면 시범을 켜지 않는다(§5). 여기 씨앗 200개는
 * 엔진의 표본이지 운영 학생의 기록이 아니다.
 */
import { describe, expect, it } from "vitest";
import type { Difficulty } from "@/contracts/difficulty";
import { generateElementaryProblem } from "@/lib/elementary/generate";
import { publicCourseSession } from "@/lib/math-srs/courseAutomation";
import {
  getCourseProblemInput,
  gradeCourseAnswer,
  parseCourseAnswerQuantity,
} from "@/lib/math-srs/elementary/answers";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { courseLearnerSchema } from "@/lib/math-srs/elementary/progress";
import type {
  CourseProblem,
  CourseSession,
} from "@/lib/math-srs/elementary/types";

const PILOT = [
  { sectionId: "5-2-2-1", role: "target", mode: "learn" },
  { sectionId: "5-2-2-2", role: "target", mode: "learn" },
  { sectionId: "5-1-5-4", role: "check", mode: "review" },
  { sectionId: "5-1-5-3", role: "check", mode: "review" },
] as const;
const TIERS: readonly Difficulty[] = ["연산", "기본", "응용"];
const SEEDS = Array.from({ length: 200 }, (_, seed) => seed);
/** 보존 창 안에서 한 갈래가 차지할 수 있는 자리: 세션 31개 × 세션당 그 갈래 문항 수. */
const WINDOW: Record<string, number> = { 연산: 31, 기본: 62, 응용: 62 };
const SESSION_DATE = new Date("2026-10-03T00:00:00.000Z");
const sessionSchema = courseLearnerSchema.shape.session.unwrap();

const normalize = (content: string) => content.replace(/\r\n?/g, "\n").trim();

/** 값이 정확히 1 큰 입력 — 채점기가 받아서는 안 되는 답. */
function wrongInput(answer: string): string {
  const quantity = parseCourseAnswerQuantity(answer);
  if (!quantity) throw new Error(`답을 읽지 못했습니다: ${answer}`);
  const { numerator, denominator } = quantity.value;
  return `${numerator + denominator}/${denominator}${quantity.unit?.name ?? ""}`;
}

function withIds(session: CourseSession): CourseSession {
  return {
    ...session,
    id: `gate:${session.id}`,
    problems: session.problems.map((p, index) => ({
      ...p,
      id: `gate:${session.id}:${index}`,
    })),
  };
}

describe("선수 확인 시범 — 공급 관문 (엔진 문항만 · 씨앗 0..199)", () => {
  const counts: Record<string, Record<string, number>> = {};

  for (const { sectionId } of PILOT) {
    it(`${sectionId} 날 문항: 세 갈래 × 200 씨앗이 모두 서버 채점 · 그림 없음 · 정답 통과 · 오답 거절`, () => {
      const section = getCourseSection(sectionId);
      expect(section).toBeDefined();
      const failures: string[] = [];
      counts[sectionId] = {};
      for (const tier of TIERS) {
        const distinct = new Set<string>();
        for (const seed of SEEDS) {
          const raw = generateElementaryProblem(section!.unit, seed, tier);
          const input = getCourseProblemInput(raw);
          const problem = {
            id: "raw",
            sectionId,
            tier,
            seed,
            content: raw.content,
            answer: raw.answer,
            solution: raw.solution,
            figureSpec: raw.figureSpec,
            input,
          } satisfies CourseProblem;
          distinct.add(normalize(raw.content));
          const where = `${sectionId} ${tier} seed ${seed}`;
          if (raw.figureSpec !== null) failures.push(`${where}: 그림`);
          if (input.mode !== "number")
            failures.push(`${where}: 입력 ${input.mode}`);
          if (gradeCourseAnswer(problem, raw.answer) !== true)
            failures.push(`${where}: 정답 ${raw.answer} 채점 실패`);
          if (gradeCourseAnswer(problem, wrongInput(raw.answer)) !== false)
            failures.push(`${where}: 오답 통과`);
        }
        counts[sectionId][tier] = distinct.size;
      }
      expect(failures).toEqual([]);
    });
  }

  for (const { sectionId, mode } of PILOT) {
    it(`${sectionId} 실제 5문항 세션 200개: 저장 스키마 통과 · 학생에게 보기 넷 중 정답 하나`, () => {
      const failures: string[] = [];
      let duplicateWithinSession = 0;
      for (const seed of SEEDS) {
        const session = withIds(
          generateCourseSession(sectionId, seed, SESSION_DATE, mode, []),
        );
        const where = `${sectionId} session seed ${seed}`;
        const stored = sessionSchema.safeParse(session);
        if (!stored.success) failures.push(`${where}: 저장 스키마 거절`);
        expect(session.problems.map((p) => p.tier)).toEqual([
          "연산",
          "기본",
          "기본",
          "응용",
          "응용",
        ]);
        const view = publicCourseSession(session);
        const contents = session.problems.map((p) => normalize(p.content));
        if (new Set(contents).size !== contents.length)
          duplicateWithinSession += 1;
        session.problems.forEach((problem, index) => {
          const shown = view.problems[index];
          const at = `${where} #${index + 1}(${problem.tier})`;
          if (problem.figureSpec !== null || shown.figureUrl !== null)
            failures.push(`${at}: 그림`);
          if (problem.input.mode !== "number" || shown.input.mode !== "number")
            failures.push(`${at}: 입력 ${shown.input.mode}`);
          const choices = shown.answerChoices;
          if (!choices || choices.length !== 4 || new Set(choices).size !== 4) {
            failures.push(`${at}: 보기 ${JSON.stringify(choices)}`);
            return;
          }
          const grades = choices.map((c) => gradeCourseAnswer(problem, c));
          if (grades.filter((g) => g === true).length !== 1)
            failures.push(`${at}: 정답 보기 ${grades.filter((g) => g === true).length}개`);
          if (grades.some((g) => g === null))
            failures.push(`${at}: 채점 불가 보기`);
          if (gradeCourseAnswer(problem, wrongInput(problem.answer)) !== false)
            failures.push(`${at}: 오답 통과`);
        });
      }
      expect(failures).toEqual([]);
      // 세션 안의 같은 본문은 결함이 아니라 공급기의 거르기 대상이다 — 수를 남긴다.
      console.info(
        `[supply-gate] ${sectionId} 세션 안 같은 본문이 있는 세션 ${duplicateWithinSession}/200`,
      );
    });
  }

  it("갈래별 서로 다른 본문 수가 보존 창(연산 31 · 기본 62 · 응용 62)을 넘는다", () => {
    console.info(`[supply-gate] distinct ${JSON.stringify(counts)}`);
    const short: string[] = [];
    for (const { sectionId } of PILOT)
      for (const tier of TIERS) {
        const n = counts[sectionId]?.[tier];
        if (n === undefined) short.push(`${sectionId} ${tier}: 측정 안 됨`);
        else if (n <= WINDOW[tier])
          short.push(`${sectionId} ${tier}: ${n} ≤ ${WINDOW[tier]}`);
      }
    expect(short).toEqual([]);
  });
});
