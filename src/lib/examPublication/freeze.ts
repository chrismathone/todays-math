import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * 월말평가 M1 — «내 시험지»를 **낸 그대로** 묶는다 (`docs/planning/monthly-exam-plan-20261017.md` §9.2). 화면도 DB 도 모른다.
 *
 * - 은행 문항만 받는다. 채점 기록(`problem_answer`)이 은행 문항을 외래 키로 요구하기 때문이다. 직접 가져온 문항
 *   (자른 그림 `studioCrop` · 통째 그림 `croppedImage` · 영어 `english` · 계산 묶음 `arithmetic` · id 가 UUID 가 아닌 것)은
 *   **문항 번호를 모두 모아** 거절한다 — 조용히 채점에서 빼지 않는다. 은행에 실제로 있는지는 서버가 따로 본다.
 * - 같은 은행 문항이 두 번 들면 거절한다(채점이 문항 id 로 가른다).
 * - 글을 고친 은행 문항은 **고친 글 그대로** 고정한다 — 은행 원문으로 덮지 않는다.
 * - 지면 설정(단 · 정답지 · 출력 옵션 · 머리 정보)도 같이 묶는다 — 다시 인쇄해도 낸 그 모양이다.
 */
export const EXAM_PUBLICATION_FROZEN_VERSION = 1;

const uuid = z.uuid();
const text = z.string().catch("");
const numbers = z.array(z.number()).catch([]);

const problemSchema = z
  .object({
    id: z.string(),
    content: text,
    answer: text,
    solution: text,
    grade: text,
    chapter: text,
    section: text,
    difficulty: text,
    problemCode: text,
    questionType: z
      .enum(["multiple-choice", "short-answer", "descriptive"])
      .optional()
      .catch(undefined),
    figureUrls: z.array(z.string()).catch([]),
    figureSvg: z.string().nullable().catch(null),
    figureDims: numbers,
    figureSourceMm: numbers,
    choiceFigureIndex: numbers.optional(),
    studioCrop: z.unknown().optional(),
    croppedImage: z.unknown().optional(),
    english: z.unknown().optional(),
    arithmetic: z.unknown().optional(),
  })
  .passthrough();

const draftSchema = z
  .object({
    problems: z.array(z.unknown()),
    columns: z.unknown().optional(),
    answers: z.unknown().optional(),
    printOptions: z.unknown().optional(),
    printMeta: z.unknown().optional(),
  })
  .passthrough();

export type FrozenProblem = {
  /** 지면의 번호 — 1부터. */
  no: number;
  problemId: string;
  content: string;
  answer: string;
  solution: string;
  questionType: "multiple-choice" | "short-answer" | "descriptive" | null;
  grade: string;
  chapter: string;
  section: string;
  difficulty: string;
  problemCode: string;
  figureUrls: string[];
  figureSvg: string | null;
  figureDims: number[];
  figureSourceMm: number[];
  choiceFigureIndex: number[];
};

export type FrozenPayload = {
  version: typeof EXAM_PUBLICATION_FROZEN_VERSION;
  problems: FrozenProblem[];
  layout: {
    columns: unknown;
    answers: unknown;
    printOptions: unknown;
    printMeta: unknown;
  };
};

export type FreezeResult =
  | { ok: true; frozen: FrozenPayload }
  | { ok: false; notBank: number[]; duplicate: number[] }
  | { ok: false; empty: true };

const isBank = (p: z.infer<typeof problemSchema>) =>
  uuid.safeParse(p.id).success &&
  p.studioCrop === undefined &&
  p.croppedImage === undefined &&
  p.english === undefined &&
  p.arithmetic === undefined;

export function freezeDraftPayload(payload: unknown): FreezeResult {
  const draft = draftSchema.safeParse(payload);
  if (!draft.success || !draft.data.problems.length)
    return { ok: false, empty: true };
  const notBank: number[] = [];
  const duplicate: number[] = [];
  const seen = new Set<string>();
  const problems: FrozenProblem[] = [];
  draft.data.problems.forEach((raw, index) => {
    const no = index + 1;
    const parsed = problemSchema.safeParse(raw);
    if (!parsed.success || !isBank(parsed.data)) {
      notBank.push(no);
      return;
    }
    const p = parsed.data;
    if (seen.has(p.id)) {
      duplicate.push(no);
      return;
    }
    seen.add(p.id);
    problems.push({
      no,
      problemId: p.id,
      content: p.content,
      answer: p.answer,
      solution: p.solution,
      questionType: p.questionType ?? null,
      grade: p.grade,
      chapter: p.chapter,
      section: p.section,
      difficulty: p.difficulty,
      problemCode: p.problemCode,
      figureUrls: p.figureUrls,
      figureSvg: p.figureSvg,
      figureDims: p.figureDims,
      figureSourceMm: p.figureSourceMm,
      choiceFigureIndex: p.choiceFigureIndex ?? [],
    });
  });
  if (notBank.length || duplicate.length)
    return { ok: false, notBank, duplicate };
  return {
    ok: true,
    frozen: {
      version: EXAM_PUBLICATION_FROZEN_VERSION,
      problems,
      layout: {
        columns: draft.data.columns ?? null,
        answers: draft.data.answers ?? null,
        printOptions: draft.data.printOptions ?? null,
        printMeta: draft.data.printMeta ?? null,
      },
    },
  };
}

/** 키 차례와 상관없는 JSON — 지문이 같은 내용에 같게 나오도록. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          canonical((value as Record<string, unknown>)[key]),
        ]),
    );
  return value;
}

/** 고정본의 지문(SHA-256 16진 64자) — `exam_publication.content_hash`. */
export function examPublicationContentHash(frozen: FrozenPayload): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(frozen)))
    .digest("hex");
}
