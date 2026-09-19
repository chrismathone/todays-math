/** SVG 한 장 → 데이터 주소. SVG 데이터 주소를 짓는 곳은 이 함수 하나다. */
export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
