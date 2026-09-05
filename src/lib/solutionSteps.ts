/**
 * 해설 줄 나누기 — 표시 전용 (원장님 검수 지적 2026-08-21: 「해설도 문제와 같은
 * 기준치를 적용해야 함. 줄바꿈 하나도 안 되고 1행으로」).
 *
 * HWP 추출이 해설의 줄 구조를 잃어 DB 해설엔 개행이 없다. **데이터는 손대지
 * 않고** 그릴 때 잃어버린 경계를 되찾는다 — 지우면 근거가 사라지지만, 표시는
 * 언제든 물릴 수 있다.
 *
 * 자르는 자리 (전부 **수식 밖**에서만):
 *  1. `…$` 바로 뒤 `$…` — 인접한 수식 경계. 원본에서 줄이 갈리던 자리다.
 *     보통 글은 수식 사이에 낱말이 있다 (J30602-VMC9 실측).
 *  2. 소문항 표지 `⑴⑵…` · `∴` · `따라서` · `그러므로` 앞.
 *  3. 한글 문장 끝(한글+`.`) 뒤 — `$3.5$` 는 수식 안이라 애초에 안 걸린다.
 *
 * ## 🔴 2026-09-06 — 배선이 **한쪽만** 되어 있었다
 *
 * 이 파일은 2026-08-21 에 만들어졌는데 **검수 화면 하나에만** 걸렸다. 그래서
 * 문제은행·인쇄 정답지·검수 콘솔 셋은 그대로 한 줄로 나갔고, 원장님이 **같은 지적을
 * 다시** 하셨다 — *「전체적으로 우리 서술형 해설은 다 한 줄로 되어 있음」*.
 * 「배선이 한쪽만 되면 그쪽 지표만 좋아진다」(CLAUDE.md 2026-08-18)가 그대로 났다.
 *
 * 그때 「인쇄은 절대 규칙 6 때문에 별도 트랙」이라 적어 둔 것이 화근이었다 —
 * **실물 검수가 필요한 것과 배선을 미루는 것은 다른 일이다.** 배선은 하고
 * 검수 항목을 남기면 된다. 이제 넷이 `solutionForDisplay` 하나를 지난다.
 */

const MARKER = /^(?:[⑴⑵⑶⑷⑸⑹⑺⑻∴]|따라서\s|그러므로\s)/;

/**
 * 해설을 **그리기 직전에** 줄로 나눠 돌려준다. 해설을 그리는 자리는 **전부** 이것을
 * 지난다 — 문제은행 · 인쇄 정답지 · 검수 콘솔 · 시험 검수.
 *
 * 줄은 홑 개행으로 잇는다. `applyHardBreaks`(2026-08-25)가 그것을 Markdown 하드
 * 브레이크로 바꾸므로 **지면과 화면이 같은 줄**로 그려진다 — 규칙이 두 벌이 되지 않는다.
 *
 * ⚠️ **데이터는 안 고친다.** 표시만 바꾸면 언제든 물릴 수 있고, DB 를 고치면
 *    10만 행을 되돌릴 자리가 필요하다(원장님 2026-08-25 판단과 같은 이유).
 */
export function solutionForDisplay(
  text: string | null | undefined,
): string | null {
  if (text === null || text === undefined) return null;
  const steps = splitSolutionSteps(text);
  return steps.length === 0 ? "" : steps.join("\n");
}

export function splitSolutionSteps(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const cuts: number[] = [];
  let inMath = false;
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i]!;
    if (ch === "$") {
      inMath = !inMath;
      // 닫는 $ 바로 다음이 여는 $ — 인접 수식 경계
      if (!inMath && t[i + 1] === "$" && i + 1 < t.length - 1) cuts.push(i + 1);
      continue;
    }
    if (inMath) continue;
    // 진짜 개행(새로 생성되는 해설이 쓴다)은 그대로 줄 경계다
    if (ch === "\n") {
      cuts.push(i);
      continue;
    }
    if (MARKER.test(t.slice(i)) && i > 0) cuts.push(i);
    // 한글 문장 끝: 한글 + '.' 뒤에 내용이 더 있을 때
    if (ch === "." && /[가-힣]/.test(t[i - 1] ?? "") && i < t.length - 1)
      cuts.push(i + 1);
  }

  const steps: string[] = [];
  let prev = 0;
  for (const c of [...new Set(cuts)].sort((a, b) => a - b)) {
    const piece = t.slice(prev, c).trim();
    if (piece) steps.push(piece);
    prev = c;
  }
  const last = t.slice(prev).trim();
  if (last) steps.push(last);
  return steps;
}
