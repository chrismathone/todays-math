/**
 * 중등 발문이 **지면의 그림을 가리키는가.**
 *
 * 초등 자(`elemFigureReference.test.ts`)와 같은 열쇠다. 낱말 「그림」이 아니라
 * **지시 어형**으로 좁힌다 — 2026-08-18 에 「그림」 한 낱말로 1,499건을 잘못 셌다.
 *
 * ⚠️ 「줄기와 잎 그림」은 표 이름이다. 자료가 본문에 글자로 들어 있으면 그림이
 *    없어도 풀린다. `1-2|도수분포표와 상대도수|20·22·26·27·28` 이 그 부류다.
 *    지시 어형 `그림에서` 가 「잎 그림에서」에 걸려 거짓 경보가 나므로, 이 이름을
 *    **먼저** 지운다. 그림그래프·그림자도 같은 이유로 지운다.
 */
const POINTS_AT_FIGURE = [
  /\$?\d+\$?\s*번\s*(그림|처럼)/,
  /(다음|아래|위|오른쪽|왼쪽)\s*그림/,
  /그림(에서|처럼|과 같이|와 같이|을 보고)/,
];

const NOT_A_POINTER = /그림그래프|그림 그래프|그림자|줄기와\s*잎\s*그림/;

export function pointsAtFigure(content: string): string | null {
  const text = content.replace(NOT_A_POINTER, " ").replace(/\s+/g, " ");
  for (const re of POINTS_AT_FIGURE) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}
