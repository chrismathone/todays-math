/**
 * 채점 — 정답 대조 · KaTeX 렌더 · 글 유사도 · 상자 IoU. 실호출 없이 단위 시험한다.
 *
 * 정답 대조는 «같음 / 다름 / 빈 답»만 낸다. «다름»은 표기 차이(`1/36` 대 `\frac{1}{36}`, 단위가 붙은 것,
 * 같은 식의 다른 꼴)일 수 있으니 결과 표에서 문항 목록으로 따로 보여 사람이 본다 — 자동으로 «틀림»이라 하지 않는다.
 */
import katex from "katex";
import { isFailedKatexHtml, UI_KATEX_OPTIONS } from "@/lib/math/katexRender";

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

/** 비교용 정규화 — 수식 기호 · 공백 · 흔한 표기 차이를 걷는다 */
export function normalizeAnswer(raw: string): string {
  let s = (raw ?? "").trim();
  // 객관식: 원문자 하나만 있으면 그 번호
  const circled = [...s].filter((ch) => CIRCLED.includes(ch));
  if (circled.length === 1 && s.replace(/[\s$①-⑩]/g, "").length <= 2)
    return `#${CIRCLED.indexOf(circled[0]!) + 1}`;
  s = s
    .replace(/\$/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[dt]frac/g, "\\frac")
    .replace(/\\[,;: !]|~/g, "")
    .replace(/\\pi\b/g, "π")
    .replace(/\\sqrt\{([^{}]*)\}/g, "√$1")
    .replace(/\\sqrt(\d)/g, "√$1")
    .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, "$1")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\le(?:q)?\b/g, "≤")
    .replace(/\\ge(?:q)?\b/g, "≥")
    .replace(/\s+/g, "")
    .replace(/[.。]$/, "");
  // \frac{a}{b} → a/b
  for (let i = 0; i < 4; i++) s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\(([0-9a-z]+)\)/gi, "$1");
  return s;
}

export type AnswerMatch = "same" | "differs" | "empty";

export function matchAnswer(model: string, truth: string): AnswerMatch {
  if (!model?.trim()) return "empty";
  const a = normalizeAnswer(model);
  const b = normalizeAnswer(truth);
  if (a === b) return "same";
  // 숫자 하나끼리면 값으로
  const num = (x: string) => (/^-?[0-9]+(\.[0-9]+)?$/.test(x) ? Number(x) : NaN);
  if (!Number.isNaN(num(a)) && num(a) === num(b)) return "same";
  // 모델 답이 «x=3» 꼴이고 정답이 «3» 이면 같음
  if (a.replace(/^[a-z]=/i, "") === b.replace(/^[a-z]=/i, "")) return "same";
  return "differs";
}

/** `$…$` 조각을 실제 KaTeX 로 그려 실패 신호를 센다 · `$` 짝이 안 맞으면 따로 표시 */
export function renderCheck(text: string): { renderFail: number; dollarOdd: boolean } {
  const body = (text ?? "").replace(/\\\$/g, "");
  const dollarOdd = (body.match(/\$/g)?.length ?? 0) % 2 === 1;
  let renderFail = 0;
  for (const m of body.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
    const tex = (m[1] ?? m[2] ?? "").trim();
    if (!tex) continue;
    const html = katex.renderToString(tex, {
      ...UI_KATEX_OPTIONS,
      throwOnError: false,
      output: "html",
      displayMode: Boolean(m[1]),
    });
    if (isFailedKatexHtml(html)) renderFail++;
  }
  return { renderFail, dollarOdd };
}

/** 수식 안의 빗금 분수만 센다 — a/6, -1/12, (a+b)/(c-d), 1/2/3 등. */
export function countSlashFractions(text: string): number {
  const body = (text ?? "").replace(/\\\$/g, "");
  let count = 0;
  for (const m of body.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
    const tex = m[1] ?? m[2] ?? "";
    count += [...tex.matchAll(/[\da-zA-Z)\]}]\s*\/\s*(?=[+-]?\s*[\da-zA-Z([{\\])/g)].length;
  }
  return count;
}

/** 표기만 다른 것을 걷는다 — `\text{ cm}` · `\mathrm{G}` · `\,` · `[그림1]` 표지 · 공백 · `$` */
export function plainText(s: string): string {
  return (s ?? "")
    .replace(/\[(그림|표)\d*\]/g, "")
    .replace(/\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\[,;:! ]/g, "")
    .replace(/\\[dt]frac/g, "\\frac")
    .replace(/[\s${}]/g, "");
}

/** 글 유사도 0~1 — 표기 차이를 걷은 뒤(`plainText`) 편집 거리 기준 */
export function textSimilarity(a: string, b: string): number {
  const x = plainText(a);
  const y = plainText(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const prev = new Array(y.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[y.length]! / Math.max(x.length, y.length);
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.left + a.width, b.left + b.width);
  const y2 = Math.min(a.top + a.height, b.top + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

/** 정답 상자 가운데 예측 상자 안에 든 비율 — 1 이면 문제를 다 담았다(여유 여백은 벌하지 않는다) */
export function coverage(truth: Box, predicted: Box): number {
  const x1 = Math.max(truth.left, predicted.left);
  const y1 = Math.max(truth.top, predicted.top);
  const x2 = Math.min(truth.left + truth.width, predicted.left + predicted.width);
  const y2 = Math.min(truth.top + truth.height, predicted.top + predicted.height);
  const area = truth.width * truth.height;
  return area > 0 ? (Math.max(0, x2 - x1) * Math.max(0, y2 - y1)) / area : 0;
}

/** 예측 상자를 정답 상자에 하나씩 짝짓는다(IoU 큰 차례, 욕심쟁이) — 짝 · 놓침 · 지어냄 */
export function matchBoxes(truth: Box[], predicted: Box[]) {
  const pairs: { t: number; p: number; iou: number }[] = [];
  truth.forEach((t, ti) => predicted.forEach((p, pi) => pairs.push({ t: ti, p: pi, iou: iou(t, p) })));
  pairs.sort((a, b) => b.iou - a.iou);
  const usedT = new Set<number>();
  const usedP = new Set<number>();
  const matched: { t: number; p: number; iou: number }[] = [];
  for (const pair of pairs) {
    if (pair.iou <= 0 || usedT.has(pair.t) || usedP.has(pair.p)) continue;
    usedT.add(pair.t);
    usedP.add(pair.p);
    matched.push(pair);
  }
  return {
    matched,
    missed: truth.length - matched.length,
    extra: predicted.length - matched.length,
  };
}

export const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export const percentile = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
};
