/**
 * 출처·형식 라벨의 색을 **찾는다** — 눈으로 고르지 않는다.
 *
 *     node scripts/qa/find-provenance-palette.mjs [갈래수]
 *
 * ## 왜 이 도구가 있나
 *
 * 처음에 색상환을 눈대중으로 나눠 여덟을 골랐다. 재 보니 **최소 ΔE2000 이 8.4** 였다 —
 * `[초]`(#6A3FBF)와 `[중]`(#3B47B5)이 사실상 같은 색인데, 화면에서는 둘 다 「보라 계열」로
 * 보여서 **어긋난 줄도 몰랐다.** 색은 재야 갈린다.
 *
 * ## 목적함수와 제약
 *
 * 「후보 N개 ∪ 이 화면의 기존 색 여섯」의 **최소 ΔE2000 을 최대화**한다. 제약은 05 에서 온다:
 *
 *  - **대비 4.6~8.0** (§6.1 텍스트 4.5:1 이상). 위끝을 막는 것은 §2.2 때문이다 —
 *    G2 는 1.31~10.49 의 **명도 계단**으로 「어디까지 왔나」를 나르는데, 출처·형식은
 *    위계가 없는 **분류**축이라 계단을 만들면 안 된다. 한 띠 안에 가둔다.
 *  - **채도 28~64** — 「절제된 색 사용」(§1). 회색으로 흐려지지도, 형광으로 튀지도 않게.
 *  - 기존 색 여섯(`ink`·`text-2`·`green`·`yellow-text`·`red-text`·`blue`)과 ΔE ≥ 14.
 *    같은 카드 머리 줄에 검수 상태(초록·노랑·빨강 **글자**)가 있어서, 가까우면
 *    「승인」과 「기출」이 같은 색으로 읽힌다.
 *
 * 결과는 `src/app/globals.css` 의 `:root` 에 손으로 옮겨 적고,
 * `provenancePalette.test.ts` 가 **그 파일을 읽어 다시 잰다**(도구를 믿지 않는다).
 */
const FIXED = ["#161616", "#61615E", "#08492E", "#996B11", "#A62D1B", "#2064B3"];
const ARG = process.argv[2] ?? "10";
/**
 * 두 가지 모드다.
 *   `node … 10`                     — 10색을 **찾는다**
 *   `node … '{"[초]":"#7f5eca",…}'` — 정해 놓은 배정을 **재서 보고한다**(짝별 ΔE)
 * 뒤엣것이 있어야 「어느 짝이 가장 가까운가」를 보고서에 적을 수 있다 — 시험은
 * 문턱만 보고 «가장 가까운 짝»을 안 알려 준다.
 */
const REPORT = ARG.trim().startsWith("{") ? JSON.parse(ARG) : null;
const N = REPORT ? 0 : Number(ARG);

const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const finv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
const chans = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function labOf(hex) {
  const [r, g, b] = chans(hex).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const [x, y, z] = [f(X), f(Y), f(Z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function hexOf(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const y = (L + 16) / 116;
  const X = finv(y + a / 500) * 0.95047;
  const Y = finv(y);
  const Z = finv(y - b / 200) * 1.08883;
  const v = [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.204 * Y + 1.057 * Z,
  ];
  if (v.some((x) => x < -0.0005 || x > 1.0005)) return null;
  return (
    "#" +
    v
      .map((x) =>
        Math.round(Math.max(0, Math.min(1, unlin(x))) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
const lum = (hex) => {
  const [r, g, b] = chans(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (hex) => 1.05 / (lum(hex) + 0.05);

function de(hexA, hexB) {
  const [L1, a1, b1] = labOf(hexA);
  const [L2, a2, b2] = labOf(hexB);
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const ang = (y, x) => {
    if (y === 0 && x === 0) return 0;
    const d = (Math.atan2(y, x) * 180) / Math.PI;
    return d < 0 ? d + 360 : d;
  };
  const hp1 = ang(b1, ap1);
  const hp2 = ang(b2, ap2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh * Math.PI) / 360);
  const Lb = (L1 + L2) / 2;
  const Cpb = (Cp1 + Cp2) / 2;
  let hpb;
  if (Cp1 * Cp2 === 0) hpb = hp1 + hp2;
  else {
    hpb = (hp1 + hp2) / 2;
    if (Math.abs(hp1 - hp2) > 180) hpb += hp1 + hp2 < 360 ? 180 : -180;
  }
  const T =
    1 -
    0.17 * Math.cos(((hpb - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hpb * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hpb + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hpb - 63) * Math.PI) / 180);
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const Sc = 1 + 0.045 * Cpb;
  const Sh = 1 + 0.015 * Cpb * T;
  const Rt =
    -2 *
    Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7)) *
    Math.sin((60 * Math.exp(-(((hpb - 275) / 25) ** 2)) * Math.PI) / 180);
  return Math.sqrt(
    (dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh),
  );
}

if (REPORT) {
  const names = Object.keys(REPORT);
  const hex = (n) => REPORT[n].toUpperCase();
  let worst = [Infinity, "", ""];
  console.log("갈래      hex      대비  L*  색상각");
  for (const n of names) {
    const [L, a, b] = labOf(hex(n));
    const hu = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    console.log(
      `${n.padEnd(8)} ${hex(n)} ${contrast(hex(n)).toFixed(2).padStart(6)} ${L.toFixed(0).padStart(3)} ${hu.toFixed(0).padStart(6)}`,
    );
  }
  console.log("\n짝별 ΔE2000 (18 미만만):");
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const d = de(hex(names[i]), hex(names[j]));
      if (d < worst[0]) worst = [d, names[i], names[j]];
      if (d < 18) console.log(`  ${names[i]} ↔ ${names[j]} = ${d.toFixed(1)}`);
    }
  }
  console.log(`  최소 = ${worst[0].toFixed(1)} (${worst[1]} ↔ ${worst[2]})`);
  let worstF = [Infinity, "", ""];
  console.log("\n기존 색과의 ΔE2000 (18 미만만):");
  const FIXED_NAME = ["ink", "text-2", "green", "yellow-text", "red-text", "blue"];
  for (const n of names) {
    for (let k = 0; k < FIXED.length; k += 1) {
      const d = de(hex(n), FIXED[k]);
      if (d < worstF[0]) worstF = [d, n, FIXED_NAME[k]];
      if (d < 18) console.log(`  ${n} ↔ ${FIXED_NAME[k]} = ${d.toFixed(1)}`);
    }
  }
  console.log(`  최소 = ${worstF[0].toFixed(1)} (${worstF[1]} ↔ ${worstF[2]})`);
  const rr = names.map((n) => contrast(hex(n)));
  console.log(
    `\n대비 띠 ${Math.min(...rr).toFixed(2)}~${Math.max(...rr).toFixed(2)} (${(Math.max(...rr) / Math.min(...rr)).toFixed(2)}배 — G2 는 4.7배)`,
  );
  process.exit(0);
}

// 후보 격자
const pool = new Set();
for (let L = 34; L <= 50; L += 2) {
  for (let h = 0; h < 360; h += 3) {
    let lo = 0;
    let hi = 140;
    for (let i = 0; i < 30; i += 1) {
      const m = (lo + hi) / 2;
      if (hexOf(L, m, h)) lo = m;
      else hi = m;
    }
    for (const frac of [1, 0.85, 0.7]) {
      const C = Math.min(lo * frac, 64);
      if (C < 28) continue;
      const hex = hexOf(L, C, h);
      if (!hex) continue;
      const c = contrast(hex);
      if (c < 4.6 || c > 8.0) continue;
      pool.add(hex.toUpperCase());
    }
  }
}
const cand = [...pool].filter((h) => Math.min(...FIXED.map((x) => de(h, x))) >= 14);
console.log(`후보 ${pool.size}개 · 기존 색과 ΔE>=14 인 것 ${cand.length}개`);

const dfix = new Map(cand.map((h) => [h, Math.min(...FIXED.map((x) => de(h, x)))]));
const minPair = (set) => {
  let m = Infinity;
  for (let i = 0; i < set.length; i += 1) {
    if (dfix.get(set[i]) < m) m = dfix.get(set[i]);
    for (let j = i + 1; j < set.length; j += 1) {
      const d = de(set[i], set[j]);
      if (d < m) m = d;
    }
  }
  return m;
};

let best = null;
let bestScore = -1;
const step = Math.max(1, Math.floor(cand.length / 70));
for (let seed = 0; seed < cand.length; seed += step) {
  const set = [cand[seed]];
  while (set.length < N) {
    let bh = null;
    let bs = -1;
    for (const h of cand) {
      if (set.includes(h)) continue;
      const s = Math.min(dfix.get(h), ...set.map((x) => de(h, x)));
      if (s > bs) {
        bs = s;
        bh = h;
      }
    }
    set.push(bh);
  }
  for (let it = 0; it < 3; it += 1) {
    for (let k = 0; k < N; k += 1) {
      let bh = set[k];
      let bs = minPair(set);
      for (const h of cand) {
        if (set.includes(h)) continue;
        const t = [...set];
        t[k] = h;
        const s = minPair(t);
        if (s > bs) {
          bs = s;
          bh = h;
        }
      }
      set[k] = bh;
    }
  }
  const sc = minPair(set);
  if (sc > bestScore) {
    bestScore = sc;
    best = [...set];
  }
}

const hueOf = (hex) => {
  const [, a, b] = labOf(hex);
  const d = (Math.atan2(b, a) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};
best.sort((a, b) => hueOf(a) - hueOf(b));
console.log(`\n${N}색 · 최소 ΔE2000 = ${bestScore.toFixed(1)}`);
for (const h of best) {
  console.log(
    `  ${h}  대비 ${contrast(h).toFixed(2)}  L*=${labOf(h)[0].toFixed(0)}  색상각 ${hueOf(h).toFixed(0).padStart(3)}  기존최소ΔE ${dfix.get(h).toFixed(1)}`,
  );
}
const ratios = best.map(contrast);
console.log(
  `대비 띠 ${Math.min(...ratios).toFixed(2)}~${Math.max(...ratios).toFixed(2)} (${(Math.max(...ratios) / Math.min(...ratios)).toFixed(2)}배 — G2 는 4.7배)`,
);
console.log(JSON.stringify(best.map((h) => h.toLowerCase())));
