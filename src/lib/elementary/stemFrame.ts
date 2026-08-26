/**
 * 발문 틀 지문 — 소재 이름·수·수식을 지운 뒤의 구조.
 *
 * 안 2가 버린 것(수영/달리기 vs 줄넘기/수영)을 다른 틀로 세면
 * 파일럿 10문항류가 거짓이 된다. 테마 목록은 호출부가 넘긴다 —
 * 여기 손으로 적으면 세는 쪽과 고치는 쪽이 같이 눈이 먼다.
 */
export function stemFrame(
  content: string,
  themes: readonly string[] = [],
): string {
  // 수식 통째를 지우면 등호의 □ 자리가 사라져 다른 식이 같은 틀이 된다.
  // 숫자만 N 으로 바꾼다. 연산·등호·빈칸이 곧 문형이다.
  let s = content;
  const sorted = [...themes]
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length);
  for (const theme of sorted) {
    const re = new RegExp(
      `${escapeRegExp(theme)}(?:을|를|이|가|은|는|의|과|와|로|으로)?`,
      "g",
    );
    s = s.replace(re, "◇");
  }
  return s.replace(/\d+/g, "N").replace(/\s+/g, " ").trim();
}

export function sameStemFrame(
  a: string,
  b: string,
  themes: readonly string[] = [],
): boolean {
  return stemFrame(a, themes) === stemFrame(b, themes);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
