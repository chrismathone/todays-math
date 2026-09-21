/**
 * 원장님 2026-09-21 화면과 같은 짜임 — 좌표평면(x축·y축) · 포물선 y = x² · 원점 O · 포물선에 내접한
 * 삼각형 ABC(회색 채움, **독립 다각형 — 요소 5**) · 이름 글자.
 *
 * 엔진처럼 층(`<g>`)으로 싼다 — 선 층 · 면 층 · 글자 층. 삼각형이 선 층 **뒤에 적혀** y축을 덮는다
 * (y = 3 ~ 6 구간). 원본은 y축이 삼각형 위로 지나간다 — «맨 뒤로»로 풀린다.
 *
 * 한 칸 = 가로 40px · 세로 16px, 원점 (240, 250). A(−3, 9) · B(2, 4) · C(1, 1) 이 포물선 위에 있다.
 */
const INK = 'stroke="#111111" stroke-width="1.6"';
const LABEL =
  'font-size="17" font-style="italic" text-anchor="middle" fill="#111111"';
const at = (x: number, y: number) => [240 + x * 40, 250 - y * 16] as const;
const [ax, ay] = at(-3, 9);
const [bx, by] = at(2, 4);
const [cx, cy] = at(1, 1);

export const PARABOLA_FIGURE = `
<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg">
  <g>
    <line x1="40" y1="250" x2="450" y2="250" ${INK}/>
    <line x1="240" y1="345" x2="240" y2="12" ${INK}/>
    <path d="M 100 54 Q 240 446 380 54" fill="none" ${INK}/>
    <circle cx="240" cy="250" r="2.4" fill="#111111" stroke="none"/>
  </g>
  <g>
    <polygon points="${ax},${ay} ${bx},${by} ${cx},${cy}" fill="#c8c8c8" ${INK}/>
  </g>
  <g>
    <text x="${ax - 12}" y="${ay - 6}" ${LABEL} data-mj="A">A</text>
    <text x="${bx + 14}" y="${by - 4}" ${LABEL} data-mj="B">B</text>
    <text x="${cx + 12}" y="${cy + 16}" ${LABEL} data-mj="C">C</text>
    <text x="228" y="268" ${LABEL} data-mj="O">O</text>
    <text x="456" y="266" ${LABEL} data-mj="x">x</text>
    <text x="252" y="20" ${LABEL} data-mj="y">y</text>
  </g>
</svg>`.trim();

/** 삼각형 안의 y축 한 점(수학 좌표 (0, 4.5)) — «맨 뒤로» 뒤에 이 점의 색이 축 색이어야 한다. */
export const PROBE = at(0, 4.5);
