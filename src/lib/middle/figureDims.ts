/**
 * 그림 치수 — **한 곳**에서 만든다.
 *
 * 09 §4-16 「`cm` 이 붙은 글자는 전부 `measured()` 가 낸다」의 v2 판이다.
 * 날 `<text>` 를 변 옆에 얹으면 지면에서 「선에서 떨어진 맨 길이 표기」가 되고,
 * 그것은 원장님이 2026-08-13 에 물린 바로 그 모양이다(`lint_svg` 규칙 4).
 *
 * ⚠️ 세 모듈(`m3Trig`·`m3`·`m3Tangent`)이 같은 규칙을 쓴다 — 각자 적으면 한쪽만
 *    고쳐진다(2026-08-18 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게 하라」).
 */

/** FigureSpec v2 는 열린 JSON — 모양 검증은 엔진이 정본이다(09 §0.1). */
type FigureSpec = Record<string, unknown>;

/**
 * 치수 라벨 — `dimensions.label` 은 **순수 SVG 글자**이지 KaTeX 가 아니다(09 §4-26).
 *
 * 발문 표기를 그대로 넣으면 **렌더는 성공하고 지면에 `3+\sqrt{3}` 이 날 것으로 찍힌다**
 * — 스스로 신고하지 않는 부류다. 그래서 근호·분수·단위만 글자로 바꾸고,
 * **못 바꾼 명령이 남으면 던진다.** 조용히 통과시키면 「렌더 성공한 오답」이 된다.
 */
export function dimText(v: number | string, unit = "cm"): string {
  const s = String(v)
    .replace(/\\sqrt\{([^{}]+)\}/g, "√$1")
    .replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (s.includes("\\"))
    throw new Error(`치수 라벨은 글자여야 한다 — 남은 LaTeX: ${s} (09 §4-26)`);
  return unit ? `${s} ${unit}` : s;
}

/** 그림 치수 라벨(cm). */
export function dimCm(v: number | string): string {
  return dimText(v, "cm");
}

/** 발문이 말한 변의 길이 — `\overline{AB}=12\,\mathrm{cm}` 꼴. */
const GIVEN_LENGTH =
  /\\overline\{([A-Z])([A-Z])\}=([^$]*?)\\,\\mathrm\{(cm|m)\}/g;

/** 값에서 «수의 지문»만 남긴다 — 「적은 값이 곧 답」인지 견주는 데 쓴다. */
function numbersOf(text: string): string {
  return text.replace(/[^\d.]/g, "");
}

/**
 * 원 계열 그림에 **발문이 말한 길이**를 옮겨 단다 (원장님 확정 2026-08-25:
 * 「지름은 치수선이 너저분해지니까 빼고, 높이나 이런 너저분해지지않는 선에서 허용」).
 *
 * 🔴 **유형마다 손으로 나열하지 않는다.** 한 유형이 갈래(mode)를 넷씩 갖고 갈래마다
 *    주는 값이 달라서, 손으로 적으면 **한 갈래만 치수가 붙는 그림**이 나온다 —
 *    그 자체가 결함이다(09 §2.2 ⑥ 「그림이 있다는 것 자체가 신호가 되면 안 된다」).
 *    그래서 **발문에서 뽑는다**: 갈래가 늘어도 규칙이 한 벌이다.
 *
 * 안 다는 자리 셋 — 전부 **이유가 다르다**:
 *  ⑴ `skip` — **지름**처럼 원장님이 뺀 것. 부르는 쪽이 이름으로 준다.
 *  ⑵ 그림에 그 두 점이 없다 — 조용히 건너뛴다(그릴 자리가 없다).
 *  ⑶ **적으려는 값이 곧 답이다** — 그림이 답을 말하면 안 된다(09 §2.2 ①).
 *     발문·정답이 같은 수를 쓰는 갈래가 실제로 있어서 이 그물이 필요하다.
 *
 * ⚠️ **엔진이 못 그리면 던진다** — 그때는 부르는 쪽에서 `policy` 를 `"none"` 으로
 *    돌린다. 조용히 빠뜨리는 길은 두지 않는다(빠뜨리면 「달았다」가 거짓말이 된다).
 */
export function attachGivenDims(
  spec: FigureSpec | null | undefined,
  content: string,
  answer: string,
  skip: readonly string[] = [],
): FigureSpec | null | undefined {
  if (spec === null || spec === undefined) return spec;
  const shape = spec;
  const points = shape.points as Record<string, unknown> | undefined;
  const answerNumbers = numbersOf(answer);
  const dims: Record<string, string> = {};
  for (const m of content.matchAll(GIVEN_LENGTH)) {
    const pair = `${m[1]}${m[2]}`;
    if (skip.includes(pair) || skip.includes(`${m[2]}${m[1]}`)) continue;
    if (!points?.[m[1]!] || !points?.[m[2]!]) continue;
    if (numbersOf(m[3]!) === answerNumbers) continue;
    dims[pair] = dimText(m[3]!, m[4]);
  }
  return Object.keys(dims).length > 0 ? withDims(shape, dims) : spec;
}

/**
 * 이미 만든 스펙에 치수를 붙인다. 키는 **두 점 이름**(`"OM"`)이고 엔진 이름은
 * `d_` 를 붙인다 — 기하 객체 이름은 한 네임스페이스를 쓴다(09 §4-2).
 *
 * 끝점이 스펙에 없으면 **던진다**. 조용히 빠뜨리면 「치수를 달았다」가 거짓말이 된다.
 */
export function withDims(
  spec: FigureSpec,
  dims: Record<string, string | undefined>,
  side?: Record<string, "left" | "right">,
): FigureSpec {
  const points = spec.points as Record<string, unknown> | undefined;
  const out: Record<string, unknown> = { ...(spec.dimensions as object) };
  for (const [pair, label] of Object.entries(dims)) {
    if (label === undefined) continue;
    const [p, q] = [
      pair.slice(0, pair.length / 2),
      pair.slice(pair.length / 2),
    ];
    const [a, b] = pair.length === 2 ? [pair[0]!, pair[1]!] : [p, q];
    if (!points?.[a] || !points?.[b])
      throw new Error(`치수의 끝점이 스펙에 없다: ${pair} (${a}, ${b})`);
    out[`d_${pair}`] = { points: [a, b], label, side: side?.[pair] ?? "auto" };
  }
  return Object.keys(out).length > 0 ? { ...spec, dimensions: out } : spec;
}
