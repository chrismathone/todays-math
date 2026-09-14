// Source answer matching, D:/mathg-gen/src/services/ai/sanitize.ts:700 (9b52813).
export const resolveMCAnswer = (
  answer: string,
  choices: string[] | null | undefined,
): string => {
  if (!answer || !Array.isArray(choices) || choices.length === 0) return answer;
  const trimmed = answer.trim();
  // 이미 올바른 마커 형식이면 건드리지 않음 (CRITICAL — 가드 절대 제거 X).
  if (/^[①②③④⑤⑥⑦⑧⑨⑩,\s]+$/.test(trimmed)) return trimmed;
  if (/^[ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ,\s]+$/.test(trimmed)) return trimmed;
  if (/^[㉠㉡㉢㉣㉤㉮㉯㉰㉱㉲,\s]+$/.test(trimmed)) return trimmed;

  // 정규화 — `$` 제거 + 공백 제거 + 안전 char 만 남김. 둘 다 같은 처리.
  const normalize = (s: string): string =>
    s
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
      .replace(/\$/g, "")
      .replace(/\s+/g, "")
      .replace(/[^0-9A-Za-z\-+/\\{}.()]/g, "");

  const normAns = normalize(trimmed);
  if (!normAns) return trimmed;
  const idx = choices.findIndex((c) => normalize(c) === normAns);
  if (idx < 0) return trimmed;
  return "①②③④⑤⑥⑦⑧⑨⑩"[idx] ?? trimmed;
};
