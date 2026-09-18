/**
 * «요청대로 고치기»의 좌표 — 요소 목록과 수정 명령은 **그림 자체의 좌표**(루트 viewBox)로 말한다. 요소는 묶음(`<g transform>`)
 * 안에 있거나(붙여넣기 · 끌어 옮긴 자리) 스스로 transform 을 가질 수 있어, 요소의 원래 좌표와 그림 좌표 사이를 여기서 오간다.
 * 화면 배치(getScreenCTM)를 쓰지 않는다 — 속성만 읽어 jsdom·서버 없는 자리에서도 같게 돈다.
 */
/** [a, b, c, d, e, f] — x′ = a·x + c·y + e, y′ = b·x + d·y + f (SVG matrix 차례). */
export type Affine = [number, number, number, number, number, number];
export type Point = [number, number];

const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** m·n — n 을 먼저 적용한다. */
export function multiply(m: Affine, n: Affine): Affine {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function invert(m: Affine): Affine | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

export const applyPoint = (m: Affine, [x, y]: Point): Point => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];
export const applyVector = (m: Affine, [x, y]: Point): Point => [
  m[0] * x + m[2] * y,
  m[1] * x + m[3] * y,
];
/** 길이의 배율 — 반지름을 그림 좌표로 옮길 때. */
export const scaleOf = (m: Affine) =>
  Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

/** transform 속성 하나 — 읽지 못하는 값은 브라우저처럼 없는 것으로 본다. */
export function parseTransform(value: string | null | undefined): Affine {
  if (!value?.trim()) return IDENTITY;
  let result = IDENTITY;
  const pattern = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let rest = value;
  for (const [whole, name, body] of value.matchAll(pattern)) {
    rest = rest.replace(whole, "");
    const v = body
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (!v.every(Number.isFinite)) return IDENTITY;
    const rad = ((v[0] ?? 0) * Math.PI) / 180;
    let step: Affine;
    if (name === "matrix") {
      if (v.length !== 6) return IDENTITY;
      step = v as Affine;
    } else if (name === "translate") step = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0];
    else if (name === "scale")
      step = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
    else if (name === "rotate") {
      const cos = Math.cos(rad),
        sin = Math.sin(rad);
      step = [cos, sin, -sin, cos, 0, 0];
      if (v.length === 3)
        step = multiply(multiply([1, 0, 0, 1, v[1], v[2]], step), [
          1,
          0,
          0,
          1,
          -v[1],
          -v[2],
        ]);
    } else if (name === "skewX") step = [1, 0, Math.tan(rad), 1, 0, 0];
    else step = [1, Math.tan(rad), 0, 1, 0, 0];
    result = multiply(result, step);
  }
  return rest.replace(/[\s,]/g, "") ? IDENTITY : result;
}

/** 루트 `<svg>` 바로 아래부터 요소의 부모까지 쌓인 변환. */
export function parentMatrix(element: Element): Affine {
  const chain: Element[] = [];
  for (
    let node = element.parentElement;
    node && node !== element.ownerDocument.documentElement;
    node = node.parentElement
  )
    chain.unshift(node);
  return chain.reduce(
    (matrix, node) =>
      multiply(matrix, parseTransform(node.getAttribute("transform"))),
    IDENTITY,
  );
}

/** 요소 자신의 transform 까지 — 요소 좌표 → 그림 좌표. */
export const elementMatrix = (element: Element): Affine =>
  multiply(
    parentMatrix(element),
    parseTransform(element.getAttribute("transform")),
  );

/** 소수 둘째 자리 — transform·좌표 속성에 쓰는 값(편집기 조절점과 같은 자릿수). */
export const round2 = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};
