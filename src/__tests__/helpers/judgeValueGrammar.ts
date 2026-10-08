/**
 * 식의 값 문형(`calc-value` · `odd-value` · `max-value`)의 **식을 시험 쪽에서 따로 읽는다** (2026-10-08 엔진 보강 2단계).
 *
 * 생성기(`valueForms.ts`)의 틀 목록을 불러 쓰지 않는다 — 지면에 찍힌 글을 정규식으로 갈라 «알맹이 + 상수»로
 * 읽고, 실수로 계산한 값도 **글을 바꿔 끼워**(`-x^{2}` → `\left(-x\right)^{2}` …) 시험 셈(`texFloat.ts`)으로 낸다.
 * 생성기가 «이 까닭으로 이 값»이라 한 것을 다른 길로 다시 재려는 것이다.
 */
import { floatOf } from "./texFloat";

export type ValueTemplate = "일차" | "제곱" | "세제곱" | "계수 제곱" | "분모";
export type ValueShape = {
  template: ValueTemplate;
  /** 문자가 든 덩어리 — `-2a^{2}` */
  core: string;
  /** 앞에 선 상수(`7-x^{2}` 의 7) — 없으면 null */
  front: string | null;
  /** 뒤에 붙은 상수(`+5` · `-12`) — 없으면 "" */
  back: string;
};

/** 알맹이의 꼴 — 앞에서부터 먼저 맞는 것. `L` 은 문자 자리. */
const CORES: readonly (readonly [ValueTemplate, string])[] = [
  ["분모", "-?\\\\dfrac\\{\\d+\\}\\{L\\}"],
  ["계수 제곱", "-?[23]L\\^\\{2\\}"],
  ["제곱", "(?:-?L|\\\\left\\(-L\\\\right\\))\\^\\{2\\}"],
  ["세제곱", "(?:-?L|\\\\left\\(-L\\\\right\\))\\^\\{3\\}"],
  ["일차", "(?:-|-?[2-5])L"],
];

/** 식 하나(`$` 없이)를 알맹이와 상수로 읽는다 — 이 문형의 꼴이 아니면 던진다. */
export function valueShape(expr: string, letter: string): ValueShape {
  const src = expr.replace(/\s+/g, "");
  for (const [template, pattern] of CORES) {
    const core = pattern.split("L").join(letter);
    const m = new RegExp(`^(\\d+)?(${core})([+-]\\d+)?$`).exec(src);
    if (!m) continue;
    const front = m[1] ?? null;
    const back = m[3] ?? "";
    // 상수는 하나뿐이고, 앞에 서는 것은 알맹이가 `-` 로 시작할 때뿐이다(`7-x^{2}`).
    if (front !== null && (back !== "" || !m[2]!.startsWith("-"))) continue;
    return { template, core: m[2]!, front, back };
  }
  throw new Error(`식의 값 문형의 꼴이 아니다: ${expr}`);
}

/** 알맹이를 바꿔 끼운 식 — 앞 상수 뒤에 `-` 로 시작하지 않는 덩어리가 오면 `+` 로 잇는다. */
function withCore(s: ValueShape, core: string): string {
  const head =
    s.front === null ? "" : core.startsWith("-") ? s.front : `${s.front}+`;
  return `${head}${core}${s.back}`;
}

export type ValueSlip =
  | "bare"
  | "dropped"
  | "signIntoBase"
  | "signOutOfBase"
  | "coefficientIntoPower";

/**
 * 그 실수로 계산하면 얼마가 되나 — 그 실수가 이 식에 해당하지 않으면 null.
 *
 *   bare                  `x^{e}` 에 음수를 괄호 없이 넣어 $-(|x|^{e})$ 로 계산
 *   dropped               음수 대신 절댓값을 넣음
 *   signIntoBase          `-x^{e}` 를 `(-x)^{e}` 로
 *   signOutOfBase         `(-x)^{e}` 를 `-x^{e}` 로
 *   coefficientIntoPower  `kx^{2}` 를 `(kx)^{2}` 로
 */
export function valueBySlip(
  expr: string,
  letter: string,
  x0: number,
  slip: ValueSlip,
): number | null {
  const s = valueShape(expr, letter);
  const env = { [letter]: x0 };
  if (slip === "dropped") return floatOf(expr, { [letter]: Math.abs(x0) });
  const power = new RegExp(`^(-?)(\\d*)${letter}\\^\\{(\\d)\\}$`).exec(s.core);
  const paren = new RegExp(
    `^\\\\left\\(-${letter}\\\\right\\)\\^\\{(\\d)\\}$`,
  ).exec(s.core);
  if (slip === "bare") {
    if (!power) return null;
    const [, sign, k, e] = power;
    const wrong = `\\left(-${Math.abs(x0)}^{${e}}\\right)`;
    return floatOf(withCore(s, `${sign}${k ? `${k}\\times` : ""}${wrong}`));
  }
  if (slip === "signIntoBase") {
    if (!power || power[1] !== "-" || power[2] !== "") return null;
    return floatOf(withCore(s, `\\left(-${letter}\\right)^{${power[3]}}`), env);
  }
  if (slip === "signOutOfBase") {
    if (!paren) return null;
    return floatOf(withCore(s, `-${letter}^{${paren[1]}}`), env);
  }
  if (!power || power[2] === "") return null;
  return floatOf(
    withCore(s, `\\left(${power[1]}${power[2]}${letter}\\right)^{${power[3]}}`),
    env,
  );
}
