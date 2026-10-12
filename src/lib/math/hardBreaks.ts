/**
 * 홑 줄바꿈을 **지면에서도 줄바꿈으로** 그린다 (원장님 확정 2026-08-25).
 *
 * ## 왜 필요한가
 *
 * 원장님 지적: *「문제은행에서 줄바꿈 안되는 문제들이 여전히 존재」*. 실측했더니
 * 저장된 본문은 **멀쩡했다** — `발문\n$\sqrt5$, $5$, $\sqrt3$` 처럼 진짜 `\n` 이 있다.
 * 그런데 **Markdown 에서 홑 `\n` 은 줄바꿈이 아니라 공백**이라 한 `<p>` 로 붙어 나갔다.
 * 실측 shared 2,410건 중 **142건(5.9%)**, 전부 엔진 생성 문항. 보기 ①②③ 가 통째로
 * 한 줄로 붙는 것도 포함된다.
 *
 * ## 왜 렌더러인가 (원장님 판단)
 *
 * *「엔진이 바꾸게하면 기존 문제 전부 수정해야하잖아」* — 맞다. 이미 적재된 142건을
 * 고쳐도 **생성기가 계속 만들어 낸다.** 렌더러에서 한 번 고치면 둘 다 끝난다.
 * 그리고 이 저장소는 렌더 경로가 **하나**라(`MarkdownRenderer`) 문제은행·검수·인쇄가
 * 같이 바뀐다 — 원장님 최우선 규칙(*「모든 화면에서 똑같이」*)이 그래서 지켜진다.
 *
 * ## 왜 `remark-breaks` 가 아닌가
 *
 * `MarkdownRenderer` 주석이 「새 의존성 금지」로 그것을 이미 물리쳤다. 대신 Markdown
 * **표준 하드 브레이크**(줄 끝 공백 둘)를 넣는다 — 플러그인 없이 같은 결과가 나온다.
 *
 * ## 🔴 건드리면 안 되는 것
 *
 * ⑴ **`$$…$$` 블록 안** — 여러 줄 수식(`\begin{cases}` 등)의 줄바꿈은 LaTeX 것이다.
 *    Markdown 이 손대면 안 되고, 공백을 붙이면 수식 원문이 바뀐다.
 * ⑵ **빈 줄(문단 경계)** — 이미 문단으로 갈린 42,169건은 한 글자도 바뀌면 안 된다.
 * ⑶ **이미 하드 브레이크인 줄**(끝에 공백 둘) — 두 번 붙이지 않는다.
 */

/** `$$ … $$` 블록. 여러 줄을 넘는다. */
const MATH_BLOCK = /\$\$[\s\S]*?\$\$/g;

/**
 * 문단 안의 홑 줄바꿈을 Markdown 하드 브레이크로 바꾼다.
 *
 * 빈 줄은 그대로 둔다 — 그건 이미 문단 경계라 손댈 이유가 없고, 손대면
 * 기존 4만 건의 지면이 움직인다.
 */
function hardBreakOutsideMath(text: string): string {
  return text.replace(/([^\s])[ \t]*\n(?![ \t]*\n)/g, "$1  \n");
}

/**
 * 수식 블록 **바로 뒤**의 홑 줄바꿈 — 블록 뒤 조각이 줄바꿈으로 시작하면 위 규칙이 «앞 글자»를 못 본다
 * (앞 글자는 블록의 닫는 `$$` 다). 행렬 · 연립식으로 끝나는 줄이 다음 줄과 붙어 나갔다(2026-10-08 — 공유 DB 의
 * 교과서 문항 219행). 빈 줄(문단) · 이미 하드 브레이크(공백 둘)는 그대로 둔다.
 */
function hardBreakAfterBlock(tail: string, atEnd: boolean): string {
  const lead = /^([ \t]*)\n(?![ \t]*\n)/.exec(tail);
  if (!lead || lead[1]!.length >= 2) return tail;
  // 글의 맨 끝 줄바꿈 뒤에는 이을 줄이 없다 — 붙이지 않는다(다음 블록이 이어지는 사이 조각은 붙인다)
  if (atEnd && tail.length === lead[0].length) return tail;
  return `  \n${tail.slice(lead[0].length)}`;
}

/**
 * 홑 줄바꿈 → 하드 브레이크. `$$…$$` 는 통째로 건너뛴다.
 *
 * ⚠️ 순수 함수다. 같은 입력이면 같은 출력 — `MarkdownRenderer` 의 전처리 캐시가
 *    이 성질에 기대고 있다.
 */
export function applyHardBreaks(content: string): string {
  if (!content.includes("\n")) return content;

  let out = "";
  let last = 0;
  MATH_BLOCK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_BLOCK.exec(content)) !== null) {
    const between = content.slice(last, m.index);
    out += hardBreakOutsideMath(
      last === 0 ? between : hardBreakAfterBlock(between, false),
    );
    out += m[0]; // 수식 블록은 **그대로**
    last = m.index + m[0].length;
  }
  const tail = content.slice(last);
  out += hardBreakOutsideMath(
    last === 0 ? tail : hardBreakAfterBlock(tail, true),
  );
  return out;
}
