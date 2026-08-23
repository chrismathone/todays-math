/**
 * m3Figures.ts 의 실증 생성기 전부를 대표 인자로 불러 FigureSpec v2 JSON 을
 * stdout 으로 내보낸다 — 2B 마크 문법 하위 호환 코퍼스 수집용.
 *
 *   npx tsx scripts/qa/dump-m3-figure-specs.ts
 *
 * 대표 인자는 각 생성기의 실사용 범위 안 값이다(발문 수치와 일치할 필요 없음 —
 * 여기서는 «렌더 바이트가 변하지 않는가»만 잰다).
 */
import {
  figArcHeight,
  figChordCross,
  figChordPerp,
  figDiameterCross,
  figInscribedCentral,
  figInscribedIso,
  figSemicircle,
  figTangentPair,
  figTriSine,
  figTwoChords,
} from "../../src/lib/middle/m3Figures";

const specs: Record<string, unknown> = {
  "m3-chord-perp": figChordPerp({ r: 5, d: 3, h: 4 }),
  "m3-arc-height": figArcHeight({ r: 5, c: 2, h: 4 }),
  "m3-two-chords": figTwoChords({ r: 5, d: 3 }),
  "m3-inscribed-iso": figInscribedIso({ a: 40 }),
  "m3-inscribed-central-major": figInscribedCentral({
    c: 80,
    minor: false,
    labelO: "80°",
    labelP: "x",
  }),
  "m3-inscribed-central-minor": figInscribedCentral({
    c: 100,
    minor: true,
    labelO: "100°",
    labelP: "x",
  }),
  "m3-tangent-pair": figTangentPair({ p: 50 }),
  "m3-chord-cross": figChordCross({ a: 30, x: 40, p: 70 }),
  "m3-semicircle": figSemicircle({ a: 35 }),
  "m3-tri-sine": figTriSine({ bc: 8, r: 5 }),
  "m3-diameter-cross": figDiameterCross({ a: 25 }),
};

process.stdout.write(JSON.stringify(specs));
