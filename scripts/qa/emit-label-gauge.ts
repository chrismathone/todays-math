/**
 * 조판된 라벨 **눈금 도형**을 제품 코드로 찍어 낸다 (JSON 한 줄).
 *
 *   npx tsx scripts/qa/emit-label-gauge.ts
 *
 * `probe-figure-label-collisions.mjs --selftest` 가 이것을 불러 「조판된 라벨을
 * 실제로 재는가」를 확인한다. ⚠️ **눈금 도형을 그 판정기 안에 글자로 박으면 안 된다** —
 * `placeLabel` 이 속성 이름을 바꾸는 날 눈금만 옛 모양으로 남아 **초록인 채로**
 * 판정기가 눈이 먼다. 눈금은 재려는 그 함수에서 나와야 한다.
 */
import { placeLabel, typesetLabel } from "../../src/lib/figure/mathjaxLabel";

const HEAD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" width="200" height="160">';
const LINE =
  '<line x1="10" y1="100" x2="190" y2="100" stroke="#111111" stroke-width="1.3"/>';

const laid = typesetLabel("25");
if (!laid) {
  console.error("MathJax 가 «25» 를 조판하지 못했다 — 눈금을 만들 수 없다");
  process.exit(1);
}

/** `y` 는 글자 밑선. 100 이 실선이므로 104 면 밟고 130 이면 비킨다. */
const at = (y: number, halo?: { color: string; width: number }) =>
  `${HEAD}${LINE}${placeLabel(laid, "25", 50, y, 12, "#111111", halo, {
    anchor: "middle",
  })}</svg>`;

// ⑨⑩ 은 **같은 자리**의 짝이다 — halo 만 다르다. 잉크 윗변은 111 − 7.99 = 103.0 이라
// halo 가 없으면 선(100)에 안 닿고, halo 8(반폭 4)이면 99.0 까지 내려와 **지운다**.
// 짝으로 두지 않으면 「halo 를 아예 안 보는」 판정기도 ⑨ 하나는 맞힐 수 있다.
const HALO_Y = 111;

// ── halo 가 **글자를 먹지 않는가** ────────────────────────────────────────
//
// 🔴 조판본은 **글자 하나가 `<path>` 하나**다. halo 를 `paint-order="stroke"` 로
//    주면 그 규칙이 **요소마다** 걸려, 앞 글자를 칠한 뒤 뒤 글자의 굵은 흰 테두리가
//    그 위를 덮는다 — 실측으로 `7 cm` 이 지면에 **`7 ⟨ m`** 으로 나갔다
//    (원장님 지적 2026-08-28). 옛 `<text>` 는 한 요소라 이 일이 안 생겼다.
//
//    이 부류는 **스스로 신고하지 않는다** — 글자는 그려지고, 라벨 상자도
//    그대로이고, 겹침 판정도 그대로다. 잉크를 **세어야만** 보인다.
const INK_TEXT = "7 cm";
const inkLaid = typesetLabel(INK_TEXT);
if (!inkLaid) {
  console.error(`MathJax 가 «${INK_TEXT}» 를 조판하지 못했다`);
  process.exit(1);
}
const inkSvg = (halo?: { color: string; width: number }) =>
  `${HEAD}${placeLabel(inkLaid, INK_TEXT, 100, 80, 24, "#111111", halo, {
    anchor: "middle",
  })}</svg>`;

console.log(
  JSON.stringify({
    collision: [
      { name: "⑦ 조판된 라벨이 선을 밟는다", svg: at(104), expect: true },
      { name: "⑧ 조판된 라벨이 선을 비킨다", svg: at(130), expect: false },
      {
        name: "⑨ halo 없으면 그 자리는 깨끗하다",
        svg: at(HALO_Y),
        expect: false,
      },
      {
        name: "⑩ **같은 자리**인데 halo 가 선을 지운다",
        svg: at(HALO_Y, { color: "#ffffff", width: 8 }),
        expect: true,
      },
    ],
    ink: {
      text: INK_TEXT,
      plain: inkSvg(),
      haloed: inkSvg({ color: "#ffffff", width: 8 }),
    },
  }),
);
