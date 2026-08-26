/**
 * 수식 안의 **백슬래시 명령**을 전부 세는 순수 계량기 — DB·파일 IO 없음.
 *
 * 이웃한 `mathTokenCensus.ts` 는 **백슬래시 없는** 덩어리(`3times5`)를 센다.
 * 그쪽은 백슬래시 명령을 일부러 뺀다 — 「정상 LaTeX 다」라는 이유로.
 * 그런데 원장님이 짚은 부류(`\min(a,3)`)는 **정상 LaTeX 이면서 학생이 못 읽는**
 * 글이다. KaTeX 는 초록이고 값도 맞다. 그래서 기존 계량기 둘 중 어느 쪽도
 * 이것을 셀 수 있는 축을 갖고 있지 않았다.
 *
 * 이 계량기는 **무엇이 대상인지 미리 정하지 않는다.** 명령을 전부 세어
 * 빈도순으로 늘어놓고, 그 목록을 보고 사람이 고른다.
 */

const BS = String.fromCharCode(92);

/** `\min` · `\operatorname` · `\@ifstar` — 백슬래시 뒤 영문 덩어리. */
const COMMAND = new RegExp(BS + BS + "([A-Za-z@]+)", "g");

/** `\operatorname{lcm}` · `\operatorname*{argmax}` 의 **인자**까지 이름으로 본다. */
const OPERATORNAME = new RegExp(
  BS + BS + "operatorname" + BS + BS + "*?" + `\s*\{([^{}]*)\}`,
  "g",
);

export interface MathCommand {
  /** 백슬래시를 포함한 이름. `\min` · `\operatorname{lcm}` */
  name: string;
  /** 원본 식에서의 시작 위치 — 고치는 쪽이 같은 자리를 짚을 수 있게. */
  index: number;
}

/**
 * 이 식에 든 명령 전부. **중복도 그대로 센다**(한 식에 `\min` 이 둘이면 둘).
 *
 * `\operatorname{lcm}` 은 `\operatorname` 과 `\operatorname{lcm}` 을 **둘 다**
 * 낸다 — 앞엣것은 「이 명령이 몇 번 쓰이나」, 뒤엣것은 「무슨 이름을 짓나」를
 * 답한다. 뒤엣것이 없으면 사람이 지은 연산자 이름은 구조적으로 안 보인다.
 */
export function mathCommands(expr: string): MathCommand[] {
  const out: MathCommand[] = [];
  for (const m of expr.matchAll(COMMAND)) {
    out.push({ name: BS + m[1]!, index: m.index ?? 0 });
  }
  for (const m of expr.matchAll(OPERATORNAME)) {
    const inner = (m[1] ?? "").trim();
    if (inner)
      out.push({ name: `${BS}operatorname{${inner}}`, index: m.index ?? 0 });
  }
  return out;
}
