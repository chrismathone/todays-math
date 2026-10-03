/**
 * 정답 표지가 빠진 HWP 미주의 답 머리도 분리한다.
 * 수식이 이어졌다는 이유만으로 풀이 첫 식까지 먹지 않는다. 소문항 번호의 반복은
 * 풀이의 시작이며, 조사로 이어지는 식은 답이 아니라 풀이의 주어/가정이다.
 * 근거가 모호한 머리는 빈 답으로 남겨 편별 원문 검토가 필요하게 한다.
 */
export interface AnswerRepair {
  /** 정확한 답 머리. 일치하지 않으면 중단하므로 재변환 뒤의 엉뚱한 잘림을 막는다. */
  head?: string;
  /** 머리가 없을 때 원문 결론을 확인해 기록한 답. 해설은 통째로 남긴다. */
  answer?: string;
  evidence?: string[];
  why: string;
}

export function splitAnswer(
  text: string,
  existingAnswer = "",
  repair?: AnswerRepair,
): { answer: string; solution: string } {
  if (repair) {
    if (repair.head) {
      if (!text.startsWith(repair.head))
        throw new Error(`답 머리가 원문과 다르다: ${repair.why}`);
      return {
        answer: repair.head,
        solution: text.slice(repair.head.length).trim(),
      };
    }
    if (
      !repair.answer ||
      !repair.evidence?.length ||
      repair.evidence.some((part) => !text.includes(part))
    ) {
      throw new Error(`답 복구 근거가 원문에 없다: ${repair.why}`);
    }
    return { answer: repair.answer, solution: text.trim() };
  }
  const marked = /^\s*정답\s*/.exec(text);
  if (!marked && existingAnswer) return { answer: "", solution: text.trim() };
  const rest = text.slice(marked?.[0].length ?? 0).trim();
  const reference = /^(?:풀이\s*참조|해설\s*참조|아래\s*참조)/.exec(rest);
  if (reference)
    return {
      answer: "풀이 참조",
      solution: rest.slice(reference[0].length).trim(),
    };

  const mark = /^(?:[⑴-⑽㉠-㉩]|\$\([1-9]\)\$)/;
  const seen = new Set<string>();
  let cursor = /^약\s*/.exec(rest)?.[0].length ?? 0;
  let end = 0;
  let needsValue = false;
  let allowNextMath = true;
  while (cursor < rest.length) {
    const spaces = /^\s*/.exec(rest.slice(cursor))![0];
    cursor += spaces.length;
    const label = mark.exec(rest.slice(cursor));
    if (label) {
      if (seen.has(label[0]) || needsValue) break;
      seen.add(label[0]);
      cursor += label[0].length;
      needsValue = true;
      allowNextMath = true;
      continue;
    }
    if (!allowNextMath) break;
    const token = /^(?:\$[^$]+\$|정삼각형)/.exec(rest.slice(cursor));
    if (!token) break;
    const after = rest.slice(cursor + token[0].length);
    if (
      /^\s*(?:는|은|에서|이므로|이고|이며|이라|의\s|를\s|을\s|라\s*하면)/.test(
        after,
      )
    )
      break;
    // (1)이라는 표지만 있는 머리는 값이 아니다. 수식으로 시작하는 풀이도 보존한다.
    if (/^\$[⑴-⑽]/.test(token[0])) break;
    cursor += token[0].length;
    end = cursor;
    needsValue = false;
    allowNextMath = /[,=][\s~]*\$$/.test(token[0]);
    // 답 사이의 쉼표와 수식 밖 단위(예: 120$°⑵)를 보존한다.
    const separator = /^(?:\s*[,·]\s*|°)/.exec(rest.slice(cursor));
    if (separator) {
      cursor += separator[0].length;
      if (separator[0] === "°") end = cursor;
      else allowNextMath = true;
    }
  }
  return {
    answer: rest.slice(0, end).replace(/\s+/g, " ").trim(),
    solution: rest.slice(end).trim(),
  };
}
