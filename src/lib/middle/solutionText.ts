/**
 * 풀이 지면 다듬기 — **뜻을 안 바꾸는 것만** 한다.
 *
 * ## 왜 한 곳에 두나
 *
 * 2026-08-24 미분류 133건을 읽다가 지면에서 이런 줄을 봤다.
 *
 * > $a=-4$이므로 $a=-4$이다.
 * > $x=1$, $y=2$를 대입하면 $a=2$이므로 $a=2$이다.
 *
 * 중간 계산이 결론과 **우연히 같아질 때**(예: 대입점이 $x=\pm1$ 이라 $a$ 의 계수가 $1$) 난다.
 * 값은 맞고 KaTeX 도 초록이라 기존 시험이 구조적으로 못 잡는다. 씨앗 120개로 훑으니
 * **10유형**에서 났다.
 *
 * 열 군데를 따로 손보면 조건이 열 벌이 되고 한쪽만 옮겨도 아무도 모른다. 그래서
 * **판정 함수 하나**를 두고 세는 쪽(`scripts/qa/sweep-middle-duplicate-conditions.ts`)과
 * 고치는 쪽(여기)이 그것을 같이 부른다.
 *
 * ## ⚠️ 값을 만들지 않는다
 *
 * 이 저장소는 「전처리가 빈 자리를 채워 숫자를 지어낸」 결함을 겪었다(2026-08-21
 * `\frac{}{2}` → `\frac{0}{2}`). 여기서 하는 일은 **글자까지 똑같은 되풀이를 지우는 것뿐**이라
 * 뜻이 구조적으로 안 바뀐다. 지우는 것 말고는 하지 않는다.
 */

/**
 * 되풀이된 두 등식 사이에 이것**만** 있어야 한다.
 *
 * ⚠️ 처음엔 「글자 수 6 이하」로 쟀는데 눈금이 잡아냈다 — 「$\dots=8$, **높이는** $\dots=8$이다」도
 *    6자라 통과했다. 그건 되풀이가 아니라 **다른 양**이 우연히 같은 값인 것이다.
 */
const CONNECTIVES = /^[\s,]*(이므로|므로|에서|이니|이고|즉)[\s]*$/;

/**
 * 되풀이된 쪽이 **문장을 끝맺어야** 한다 — 「그러므로 X는 X**이다**」.
 *
 * ⚠️ 이것도 눈금이 찾아냈다. 「한 근이 $x=-2$이므로 $x=-2$**을 대입하면** 등식이 성립한다」는
 *    되풀이가 아니라 **그 값을 쓰는** 문장이다(120/120 으로 걸려 목록을 통째로 덮을 뻔했다).
 */
const RESTATED_TAIL = /^\s*이다/;

type Span = { text: string; at: number; len: number };

/**
 * 한 줄에서 «변이 있는» 수식 등식들을 자리와 함께 뽑는다.
 *
 * ⚠️ `$=$` 처럼 변이 빈 것은 등식이 아니라 글의 조각이다
 *    (「(교점의 개수)$=$(꼭짓점의 개수)$=12$」). 세면 거짓 경보가 된다.
 */
function equationSpans(line: string): Span[] {
  return [...line.matchAll(/\$([^$]*=[^$]*)\$/g)]
    .map((m) => ({ text: m[1]!.trim(), at: m.index!, len: m[0].length }))
    .filter((e) => {
      const [lhs, rhs] = e.text.split("=");
      return (lhs ?? "").trim() !== "" && (rhs ?? "").trim() !== "";
    });
}

/**
 * 「같은 등식이 이어 붙어 되풀이된 자리」를 돌려준다. 없으면 null.
 *
 * 세는 쪽과 고치는 쪽이 **이 함수 하나**를 본다.
 */
export function repeatedStatement(line: string): string | null {
  const found = equationSpans(line);
  for (let i = 1; i < found.length; i += 1) {
    const prev = found[i - 1]!;
    const cur = found[i]!;
    if (prev.text !== cur.text) continue;
    if (!CONNECTIVES.test(line.slice(prev.at + prev.len, cur.at))) continue;
    if (!RESTATED_TAIL.test(line.slice(cur.at + cur.len))) continue;
    return cur.text;
  }
  return null;
}

/**
 * 되풀이를 지운다 — **앞엣것과 이음말**을 지우고 뒤엣것을 남긴다.
 *
 * 「$a=-4$이므로 $a=-4$이다」 → 「$a=-4$이다」
 * 「따라서 $a=-11$, $b=22$이므로 $b=22$이다」 → 「따라서 $a=-11$, $b=22$이다」
 *
 * 뒤엣것을 지우면 「$a=-4$이므로 이다」가 되어 문장이 깨진다. 앞엣것을 지워야 맞다.
 */
function collapseLine(line: string): string {
  let out = line;
  // 한 줄에 되풀이가 둘 이상일 수 있다. 더 안 걸릴 때까지 줄인다.
  for (let guard = 0; guard < 8; guard += 1) {
    const found = equationSpans(out);
    let cut: [number, number] | null = null;
    for (let i = 1; i < found.length; i += 1) {
      const prev = found[i - 1]!;
      const cur = found[i]!;
      if (prev.text !== cur.text) continue;
      if (!CONNECTIVES.test(out.slice(prev.at + prev.len, cur.at))) continue;
      if (!RESTATED_TAIL.test(out.slice(cur.at + cur.len))) continue;
      cut = [prev.at, cur.at];
      break;
    }
    if (!cut) return out;
    out = out.slice(0, cut[0]) + out.slice(cut[1]);
  }
  return out;
}

/** 풀이 전체에서 되풀이를 지운다. 줄 단위로 본다. */
export function tidySolution(solution: string): string {
  if (!solution.includes("=")) return solution;
  return solution.split("\n").map(collapseLine).join("\n");
}
