/**
 * 사각형 관계도 한 장 — 원장님 2026-09-21 화면과 같은 짜임(상자마다 테두리 + 이름 글자, 상자끼리 선으로 잇는다).
 * 상자 이름은 상자 안에 따로 선 글자라, 상자 하나가 요소 **둘**(사각·글자)이다 — 묶으면 번호표가 하나가 된다.
 * 왼쪽 줄(사다리꼴·직사각형)과 오른쪽 줄(평행사변형·마름모)의 x 를 일부러 어긋나게 두었다 — 정렬로 맞춘다.
 */
const BOX = 'fill="none" stroke="#111111" stroke-width="1.6"';
const INK = 'font-size="15" text-anchor="middle" fill="#111111"';
const LINE = 'stroke="#111111" stroke-width="1.2"';

const box = (x: number, y: number, name: string) =>
  `<rect x="${x}" y="${y}" width="110" height="40" ${BOX}/>` +
  `<text x="${x + 55}" y="${y + 25}" ${INK} data-mj="${name}">${name}</text>`;

export const RELATION_FIGURE = `
<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg">
  ${box(185, 20, "사각형")}
  ${box(48, 120, "사다리꼴")}
  ${box(300, 132, "평행사변형")}
  ${box(36, 232, "직사각형")}
  ${box(292, 244, "마름모")}
  ${box(170, 310, "정사각형")}
  <line x1="220" y1="60" x2="130" y2="120" ${LINE}/>
  <line x1="290" y1="60" x2="350" y2="132" ${LINE}/>
  <line x1="340" y1="172" x2="120" y2="232" ${LINE}/>
  <line x1="360" y1="172" x2="347" y2="244" ${LINE}/>
  <line x1="100" y1="272" x2="200" y2="310" ${LINE}/>
  <line x1="330" y1="284" x2="255" y2="310" ${LINE}/>
</svg>`.trim();
