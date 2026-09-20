/**
 * 원장님이 2026-09-20 에 겪은 것과 같은 문항 — 이등변삼각형 ABC, 치수 5·3·4.
 *
 * SVG 는 **실제 도형 엔진**(`scripts/figure/render_spec.py` → `vendor/figure-engine`)이
 * FigureSpec v2 로 그린 것을 그대로 옮겼다. 손으로 지어낸 그림이면 「라벨 글자 크기가
 * viewBox 에 비례한다」(`type_scale`)는 성질이 빠져 비례 측정이 헛돈다.
 *
 * `width`/`height` 속성은 작업실이 저장 직전에 `fitFigureViewport` 로 박는 것과 같다 —
 * 그 값이 `<img>` 의 **고유 크기**가 되어 지면 폭 규칙이 없을 때의 기본이 된다.
 */
export const TRIANGLE_VIEWBOX_W = 236.654;
export const TRIANGLE_VIEWBOX_H = 249.324;
/** 엔진이 `type_scale` 로 정한 라벨 글자 크기 (viewBox 단위). */
export const TRIANGLE_LABEL_FONT = 16.8;

export const TRIANGLE_SVG = `<svg viewBox="0 0 ${TRIANGLE_VIEWBOX_W} ${TRIANGLE_VIEWBOX_H}" width="${TRIANGLE_VIEWBOX_W}" height="${TRIANGLE_VIEWBOX_H}" xmlns="http://www.w3.org/2000/svg">
  <g>
    <line x1="118.327" y1="29.948" x2="28.327" y2="209.948" stroke="#111111" stroke-width="1.9" />
    <line x1="118.327" y1="29.948" x2="208.327" y2="209.948" stroke="#111111" stroke-width="1.9" />
    <line x1="28.327" y1="209.948" x2="208.327" y2="209.948" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <text x="118.327" y="24.6" font-size="${TRIANGLE_LABEL_FONT}" text-anchor="middle" fill="#111111" data-label="A">A</text>
    <text x="17.603" y="215.324" font-size="${TRIANGLE_LABEL_FONT}" text-anchor="middle" fill="#111111" data-label="B">B</text>
    <text x="219.051" y="215.324" font-size="${TRIANGLE_LABEL_FONT}" text-anchor="middle" fill="#111111" data-label="C">C</text>
    <text x="183.327" y="115.324" font-size="${TRIANGLE_LABEL_FONT}" text-anchor="middle" fill="#111111" data-label="3">3</text>
    <text x="118.327" y="237.324" font-size="${TRIANGLE_LABEL_FONT}" text-anchor="middle" fill="#111111" data-label="4">4</text>
    <text x="58.327" y="115.324" font-size="${TRIANGLE_LABEL_FONT}" text-anchor="middle" fill="#111111" data-label="5">5</text>
  </g>
</svg>`;

/** `svgDataUrl` 과 같은 규칙 — 작업실은 SVG 를 이 꼴로 `figureUrls` 에 싣는다. */
export const TRIANGLE_DATA_URL =
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(TRIANGLE_SVG);

/**
 * 작업실 크롭의 원본 픽셀 치수. 200dpi 로 스캔한 A4(1654px) 안에서 도형이
 * 가로 14% 를 차지할 때의 값이다 — `studioProblem()` 의 `figureDims` 와 같은 뜻.
 */
export const TRIANGLE_SOURCE_PX = [232, 244] as const;

/**
 * **아주 큰 그림** — viewBox 900 단위. `wide` 등급(70mm)에 걸려야 한다.
 * 상한이 없으면 고유 크기 900px 로 그려져 문항 열(363.5px)을 넘는다.
 */
export const HUGE_SVG = `<svg viewBox="-12 -12 900 420" width="900" height="420" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="860" height="380" fill="none" stroke="#111111" stroke-width="2" />
  <text x="450" y="220" font-size="30" text-anchor="middle" fill="#111111">넓은 그림</text>
</svg>`;

export const HUGE_DATA_URL =
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(HUGE_SVG);
