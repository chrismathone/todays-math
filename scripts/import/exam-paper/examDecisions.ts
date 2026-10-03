/** 원본 대조·합의가 끝난 편집 정정. 추출 보관본은 바꾸지 않는다. */
export interface TextCorrection {
  from: string;
  to: string;
  why: string;
}
export interface ChoiceCorrection extends TextCorrection {
  number: number;
}

/** 번호로 지정한 보기 전체가 예상값과 같아야 한다. 빈 보기와 없는 보기는 다르다. */
export function correctExamChoices(
  input: ReadonlyMap<string, string>,
  corrections: Record<string, ChoiceCorrection[]> = {},
): Map<string, string> {
  const out = new Map(input);
  for (const [question, repairs] of Object.entries(corrections)) {
    for (const repair of repairs) {
      const id = `${question}-c${repair.number}`;
      if (
        !Number.isInteger(repair.number) ||
        repair.number < 1 ||
        out.get(id) !== repair.from
      )
        throw new Error(`[중단] ${id} 보기 정정의 예상값과 원문이 다르다`);
      out.set(id, repair.to);
    }
  }
  return out;
}

/** 해설의 확인된 한 자리만 바꾼다. 누락·중복이면 원본부터 다시 확인한다. */
export function correctExamSolutions(
  input: ReadonlyMap<string, string>,
  corrections: Record<string, TextCorrection[]> = {},
): Map<string, string> {
  const out = new Map(input);
  for (const [question, repairs] of Object.entries(corrections)) {
    for (const repair of repairs) {
      const text = out.get(question);
      if (
        !repair.from ||
        text === undefined ||
        text.split(repair.from).length !== 2
      )
        throw new Error(
          `[중단] 문${question} 해설 정정의 원문이 없거나 둘 이상이다`,
        );
      out.set(question, text.replace(repair.from, repair.to));
    }
  }
  return out;
}

/** 안내만 든 초안도 나중에 실제 풀이로 채울 수 있도록 본문과 안내를 나눈다. */
export function withoutSolutionNote(
  solution: string | null,
  note?: string,
): string | null {
  if (!note || !solution) return solution;
  if (solution === note) return null;
  return solution.endsWith(`\n${note}`)
    ? solution.slice(0, -(note.length + 1)) || null
    : solution;
}

/** 풀이 선택 뒤 호출한다. 이미 붙인 안내는 중복하지 않고 마지막 한 줄로 남긴다. */
export function appendSolutionNote(
  solution: string | null,
  note?: string,
): string | null {
  if (!note) return solution;
  const body = withoutSolutionNote(solution, note);
  return body ? `${body.trimEnd()}\n${note}` : note;
}
