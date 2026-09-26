/**
 * 보기 수식의 가로폭 어림(em, KaTeX 글꼴 기준).
 *
 * 폰 320px 에서 보기 한 칸의 수식 자리는 **약 79px** 다 — 본문 여백 12×2, 문제 카드 여백 12×2,
 * 칸 사이 8, 단추 테두리 2×2·여백 8×2, 번호 동그라미 23 + 틈 10 을 빼면 남는 폭
 * (`authenticated.module.css` 의 `max-width: 350px` 규칙에서 보기 글자는 18px, KaTeX 는 그 1.21배 =
 * 21.8px/em). 79 / 21.8 ≈ **3.62em**. 390px 은 114px / 24.2px ≈ 4.7em 이라 320 이 묶는다.
 *
 * 🔴 이 어림은 생성기가 «넘칠 보기»를 버리는 데 쓴다. **실측이 아니다** — 실측은
 *    `/dev/quick-items` 을 Playwright 로 320·390 에서 재서 맞췄다(보고서).
 */
export const QUICK_CHOICE_MAX_EM = 3.6;

// KaTeX_Main/Math 글자 폭(em). 문자는 기울임(Math-Italic) 폭.
const GLYPH: Record<string, number> = {
  x: 0.572,
  a: 0.529,
  b: 0.429,
  y: 0.49,
};
const DIGIT = 0.5;
const PAREN = 0.389;
const BIN = 0.778; // + − × ÷ 글자 자체
const BIN_SPACE = 0.444; // 이항 연산자 양옆 중간 간격(2 × 0.2222)
const REL = 0.778; // =
const REL_SPACE = 0.556; // 관계 기호 양옆 굵은 간격(2 × 0.2778)
const COLON = 0.278;
const NULL_DELIM = 0.24; // 분수 양옆 빈 구분자(2 × 0.12)
const SCRIPT = 0.7;

function readGroup(src: string, at: number): [string, number] {
  if (src[at] !== "{") throw new Error(`«{» 가 와야 합니다 — ${src}`);
  let depth = 0;
  for (let i = at; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return [src.slice(at + 1, i), i + 1];
    }
  }
  throw new Error(`«}» 가 없습니다 — ${src}`);
}

/**
 * TeX 조각의 폭(em). `script` 이면 분수 안(글자 0.7배, 연산자 간격 없음).
 * 연산자는 앞에 «값»이 있을 때만 이항(간격 포함), 식 맨 앞·여는 괄호·관계 기호 뒤에서는 단항이다.
 */
export function choiceWidthEm(tex: string, script = false): number {
  let em = 0;
  let operand = false; // 바로 앞이 값(수·문자·닫는 괄호·분수)인가
  const scale = script ? SCRIPT : 1;
  let i = 0;
  while (i < tex.length) {
    const ch = tex[i]!;
    if (ch === " ") {
      i += 1;
      continue;
    }
    if (tex.startsWith("\\frac", i)) {
      const [num, afterNum] = readGroup(tex, i + 5);
      const [den, afterDen] = readGroup(tex, afterNum);
      // 분자·분모는 이미 0.7배로 잰다(안쪽 분수는 쓰지 않는다)
      const inner = Math.max(
        choiceWidthEm(num, true),
        choiceWidthEm(den, true),
      );
      em += inner + NULL_DELIM * scale;
      operand = true;
      i = afterDen;
      continue;
    }
    const cmd = /^\\([a-zA-Z]+)/.exec(tex.slice(i));
    if (cmd) {
      const name = cmd[1]!;
      if (name === "times" || name === "div" || name === "cdot") {
        em += (BIN + (operand && !script ? BIN_SPACE : 0)) * scale;
        operand = false;
      } else if (name === "square") {
        em += 0.778 * scale;
        operand = true;
      } else if (name === "to") {
        em += (1.0 + (script ? 0 : REL_SPACE)) * scale;
        operand = false;
      } else {
        em += 1 * scale; // 모르는 명령은 넉넉히
        operand = true;
      }
      i += cmd[0].length;
      continue;
    }
    if (/\d/.test(ch)) {
      em += DIGIT * scale;
      operand = true;
    } else if (/[a-z]/.test(ch)) {
      em += (GLYPH[ch] ?? 0.55) * scale;
      operand = true;
    } else if (ch === "(" || ch === ")") {
      em += PAREN * scale;
      operand = ch === ")";
    } else if (ch === "+" || ch === "-") {
      em += (BIN + (operand && !script ? BIN_SPACE : 0)) * scale;
      operand = false;
    } else if (ch === "=") {
      em += (REL + (script ? 0 : REL_SPACE)) * scale;
      operand = false;
    } else if (ch === ":") {
      em += (COLON + (script ? 0 : REL_SPACE)) * scale;
      operand = false;
    } else {
      em += 0.6 * scale;
      operand = true;
    }
    i += 1;
  }
  return em;
}
