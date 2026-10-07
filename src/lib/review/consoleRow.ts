import type { Prisma } from "@prisma/client";

/**
 * 검수 콘솔이 받는 한 행 — **화면·서버 페이지·API 가 같은 매퍼 하나를 쓴다.**
 *
 * 🔴 **왜 만들었나.** 예전에는 서버 페이지(`/review`)가 손으로 매핑하고, 더 불러오는
 *    API(`/api/review/queue`)는 `serializeProblem`(일반 문항 계약)을 썼다. 두 모양이
 *    **달랐다** — `serializeProblem` 은 `questionType`·`figureDims`·`figureSourceMm`·
 *    `unitName` 을 내보내지 않는다. 그런데 클라이언트가 응답을 `as ConsoleProblem[]` 로
 *    **캐스팅**해서 받으므로 타입이 그 차이를 못 잡았다.
 *
 *    결과: **첫 묶음은 멀쩡하고, 더 불러온 문항부터 그림 치수와 단원명이 조용히 사라진다.**
 *    에러도 경고도 없다. 이 저장소가 여러 번 적은 「두 곳이 같은 것을 보는가」의 그 자리다.
 *
 *    그래서 매퍼를 여기 하나만 두고 양쪽이 부른다. 한쪽만 고치면 타입이 빨개진다.
 */
export type ReviewConsoleRow = {
  id: string;
  problemCode: string;
  content: string;
  answer: string;
  solution: string | null;
  questionType: string | null;
  figureUrls: string[];
  figureDims: number[];
  figureSourceMm: number[];
  choiceFigureIndex?: number[];
  directUseAllowed: boolean;
  unitName: string;
  /**
   * 단원의 학년(없으면 `""`). 초등이면 콘솔이 가분수를 대분수로 **보인다** — 인쇄·문제은행과
   * 같은 결정(`fractionViewFor`, 원장님 2026-09-19 «모든 화면이 일치하도록»). 결정은 이 행의
   * 본문·정답·해설을 다 보고 한 번 한다 — 그래서 셋 중 하나라도 빠지면 콘솔만 다르게 보인다.
   * 원문은 그대로다.
   */
  grade: string;

  /**
   * 원본이 어디서 왔나 (원장님 요청 2026-08-24: 「검수 계정은 원본이 어디에 있는지
   * 원본 메타데이터도 하단에 나오게」). 검수자가 이상한 문항을 만났을 때 **원본을 열어
   * 대 보려면** 이 값들이 화면에 있어야 한다.
   */
  source: string;
  sourceFile: string | null;
  school: string | null;
  subject: string | null;
  examId: string | null;
  questionNumber: number | null;
  solutionSource: string;
};

/** 매퍼가 필요로 하는 최소 모양 — `include: { unit: … }` 로 읽은 행. */
export type ProblemWithUnit = Prisma.ProblemGetPayload<{
  include: { unit: { select: { grade: true; section: true } } };
}>;

export function toConsoleRow(p: ProblemWithUnit): ReviewConsoleRow {
  return {
    id: p.id,
    problemCode: p.problemCode,
    content: p.content,
    answer: p.answer,
    solution: p.solution,
    questionType: p.questionType,
    figureUrls: p.figureUrls ?? [],
    figureDims: p.figureDims ?? [],
    figureSourceMm: p.figureSourceMm ?? [],
    choiceFigureIndex: p.choiceFigureIndex ?? [],
    directUseAllowed: p.directUseAllowed,
    unitName: p.unit ? `${p.unit.grade} · ${p.unit.section}` : "—",
    grade: p.unit?.grade ?? "",

    source: p.source,
    sourceFile: p.sourceFile,
    school: p.school,
    subject: p.subject,
    examId: p.examId,
    questionNumber: p.questionNumber,
    solutionSource: p.solutionSource,
  };
}

/** 화면에 보여 줄 출처 이름. 기계 키(`source`)를 그대로 내보이지 않는다. */
export const SOURCE_LABELS: Record<string, string> = {
  manual: "자작",
  past_exam: "기출",
  transformed: "교재(RPM)",
  ai_generated: "AI 생성",
  school_textbook: "교과서",
};

export const SOLUTION_SOURCE_LABELS: Record<string, string> = {
  none: "해설 없음",
  original: "원본 해설",
  ai: "AI 해설",
};
