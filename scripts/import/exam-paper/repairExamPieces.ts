/** 원문에 붙어 있는 공통 지문·합쳐진 보기의 경계를 되살린다. 내용은 만들지 않는다. */
interface QuestionLabel {
  number: number;
  answer: string | null;
  label?: string | null;
}

const RANGE = /\$?\[[^\]\n]*(?:SIM|~|∼|～)[^\]\n]*\]\$?/;

/** PDF 대조본에서도 옮긴 공통 지문을 걷어, 그 상자를 앞 문항에 다시 만들지 않는다. */
export function withoutSharedPassage(text: string): string {
  const range = RANGE.exec(text);
  return range ? text.slice(0, range.index).trimEnd() : text;
}

export function repairExamPieces(
  input: Map<string, string>,
  questions: QuestionLabel[],
): Map<string, string> {
  const pieces = new Map(input);
  for (const [id, text] of input) {
    const range = RANGE.exec(text);
    if (!range) continue;
    const numbers = range[0].match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length !== 2 || numbers[0] >= numbers[1]) continue;
    const descriptive = range[0].includes("서술형");
    const recipients = questions.filter((q) => {
      const number = descriptive
        ? Number(q.label?.match(/\d+/)?.[0])
        : q.number;
      return number >= numbers[0] && number <= numbers[1];
    });
    if (
      recipients.length !== numbers[1] - numbers[0] + 1 ||
      recipients.some((q) => id.startsWith(`${q.number}-`))
    ) {
      throw new Error(
        `공통 지문의 문항 범위를 확인할 수 없다: ${id} ${range[0]}`,
      );
    }
    const passage = text.slice(range.index).trim();
    pieces.set(id, text.slice(0, range.index).trimEnd());
    for (const q of recipients) {
      const key = `${q.number}-stem`;
      const stem = pieces.get(key);
      if (stem === undefined)
        throw new Error(`공통 지문 수신 발문이 없다: ${key}`);
      pieces.set(key, `${passage}\n\n${stem}`);
    }
  }

  // 원문은 ⑤를 답으로 갖는데 보기 4개만 추출되었다. 처음 세 보기와 같은 크기의
  // 두 묶음이 ④에 빈 줄로 구분되어 있을 때만 분리한다(성화 7의 세 칸짜리 보기).
  for (const q of questions) {
    if (q.answer !== "⑤" || pieces.has(`${q.number}-c5`)) continue;
    const fourth = pieces.get(`${q.number}-c4`);
    const groups = fourth?.split(/\n\s*\n/).map((s) => s.trim());
    if (groups?.length !== 2) continue;
    const lines = (s: string) =>
      s.split("\n").filter((line) => line.trim()).length;
    const sizes = [1, 2, 3].map((i) =>
      lines(pieces.get(`${q.number}-c${i}`) ?? ""),
    );
    if (
      sizes[0] < 2 ||
      !sizes.every((n) => n === sizes[0]) ||
      !groups.every((g) => lines(g) === sizes[0])
    )
      continue;
    pieces.set(`${q.number}-c4`, groups[0]);
    pieces.set(`${q.number}-c5`, groups[1]);
  }
  return pieces;
}
