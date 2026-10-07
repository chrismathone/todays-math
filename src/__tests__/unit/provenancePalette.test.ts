/**
 * 출처 라벨 팔레트 — 원장님 지시 「라벨 색상 전부 다르게」를 **재서** 지킨다.
 *
 * ## 왜 «다르다»를 눈으로 확인하면 안 되나
 *
 * 처음 여덟 색은 색상환을 눈대중으로 나눠 골랐다. 재 보니 최소 ΔE2000 이 **8.4** 였다 —
 * `[초]`(#6A3FBF)와 `[중]`(#3B47B5)이 사실상 같은 색이다. 화면에서는 둘 다 「보라 계열」로
 * 보여서 **어긋난 줄도 몰랐다.** 그래서 이 시험은 색을 **잰다**.
 *
 * ## 참이 어디서 오나
 *
 * 색값은 `src/app/globals.css` 의 `:root` 하나가 정한다(05 §2.2.1). 이 시험은 **그 파일을
 * 읽어서** 대비와 ΔE 를 다시 계산한다 — 제품 코드가 계산해 준 값을 받아 쓰지 않는다.
 * 갈래→토큰 대응만 `provenance.ts` 에서 가져온다(그쪽이 SSOT 이므로 옮겨 적으면 두 벌이 된다).
 *
 * ## 🔴 여기서 가장 중요한 검사
 *
 * `@theme inline` 에 `--color-src-*` 가 없으면 Tailwind 의 `text-src-*` 는 **아무 색도 안
 * 내면서 에러도 안 낸다.** 05 §2.2.1 이 적어 둔 그 함정이다(*「`:root` 만 바꾸면 화면이
 * 하나도 안 바뀌는데 에러도 안 났다」*). 그래서 두 블록에 **둘 다** 있는지 본다.
 *
 * ⚠️ 그래도 **한 겹 남는다** — 「토큰이 이어져 있다」와 「빌드된 CSS 에 클래스가 나온다」는
 *    또 다른 말이다. 그 마지막 한 겹은 `node scripts/qa/check-provenance-css.mjs` 가
 *    **제품과 같은 postcss 플러그인으로 실제 컴파일해서** 본다. 여기 안 넣은 이유는
 *    한 번에 8초가 들어서다 — 단위 시험에 넣으면 다른 세션이 CPU 를 쓸 때 간헐 빨강이
 *    되고, 늘 우는 가드는 꺼진다. **팔레트를 손봤으면 그 스크립트를 한 번 돌려라.**
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  FIGURE_ORIGINS,
  PROBLEM_FORMATS,
  PROBLEM_ORIGINS,
  provenanceColorToken,
} from "@/lib/problem/provenance";

const CSS = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

/** `:root { … }` 첫 블록 — 값의 유일한 출처. */
const ROOT_BLOCK = /:root\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? "";
/** `@theme inline { … }` — 클래스 이름을 만드는 자리. */
const THEME_BLOCK = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? "";

function declaredValue(block: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\n)\\s*${name}:\\s*([^;]+);`).exec(block);
  return m ? m[1]!.trim() : null;
}

/**
 * 같은 화면·같은 카드 머리 줄에 이미 있는 색. 여기에 붙으면 「승인」과 「기출」이
 * 같은 색으로 읽힌다 — 이름은 `:root` 에서 그대로 읽어 온다(값을 옮겨 적지 않는다).
 */
const EXISTING_TOKENS = [
  "--ink",
  "--text-2",
  "--green",
  "--yellow-text",
  "--red-text",
  "--blue",
];

// ── 색 계산 (표준 공식 — 제품 코드를 안 쓴다) ──────────────────────────
const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** 흰 바탕 대비비 (WCAG 2.x). 배경은 `--bg: #ffffff` 다. */
const contrastOnWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

function toLab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number];
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [x, y, z] = [f(X), f(Y), f(Z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE ΔE2000 — 「두 색이 사람 눈에 얼마나 다른가」. 10 남짓이면 확실히 다른 색이다. */
function deltaE2000(hexA: string, hexB: string): number {
  const [L1, a1, b1] = toLab(hexA);
  const [L2, a2, b2] = toLab(hexB);
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const angle = (y: number, x: number) => {
    if (y === 0 && x === 0) return 0;
    const d = (Math.atan2(y, x) * 180) / Math.PI;
    return d < 0 ? d + 360 : d;
  };
  const hp1 = angle(b1, ap1);
  const hp2 = angle(b2, ap2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh * Math.PI) / 360);
  const Lbar = (L1 + L2) / 2;
  const Cpbar = (Cp1 + Cp2) / 2;
  let hpbar: number;
  if (Cp1 * Cp2 === 0) hpbar = hp1 + hp2;
  else {
    hpbar = (hp1 + hp2) / 2;
    if (Math.abs(hp1 - hp2) > 180) hpbar += hp1 + hp2 < 360 ? 180 : -180;
  }
  const T =
    1 -
    0.17 * Math.cos(((hpbar - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hpbar * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hpbar + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hpbar - 63) * Math.PI) / 180);
  const Sl = 1 + (0.015 * (Lbar - 50) ** 2) / Math.sqrt(20 + (Lbar - 50) ** 2);
  const Sc = 1 + 0.045 * Cpbar;
  const Sh = 1 + 0.015 * Cpbar * T;
  const Rt =
    -2 *
    Math.sqrt(Cpbar ** 7 / (Cpbar ** 7 + 25 ** 7)) *
    Math.sin((60 * Math.exp(-(((hpbar - 275) / 25) ** 2)) * Math.PI) / 180);
  return Math.sqrt(
    (dL / Sl) ** 2 +
      (dC / Sc) ** 2 +
      (dH / Sh) ** 2 +
      Rt * (dC / Sc) * (dH / Sh),
  );
}

// ── 잰 값 ────────────────────────────────────────────────────────────
/**
 * 축 셋 전량. 「모른다」 셋은 색을 새로 만들지 않으므로 이름 붙은 것만 남긴다.
 * 목록을 손으로 적지 않는다 — 갈래를 하나 더하고 여기를 잊으면 그 색은 **구조적으로
 * 안 재진다**(D-106 「타입은 배열 길이를 안 센다」와 같은 자리).
 */
const AXES = [
  ["origin", PROBLEM_ORIGINS],
  ["figure", FIGURE_ORIGINS],
  ["format", PROBLEM_FORMATS],
] as const;

/** `축/갈래` 로 지목한다 — 세 축이 «모른다»에 같은 이름을 써서 갈래만으로는 안 갈린다. */
const NAMED = AXES.flatMap(([axis, kinds]) =>
  kinds.filter((k) => k !== "unknown").map((k) => `${axis}/${k}`),
);

const tokenOf = (id: string) => {
  const [axis, kind] = id.split("/") as [
    "origin" | "figure" | "format",
    string,
  ];
  return provenanceColorToken(axis, kind);
};

/** 갈래 → `:root` 에 적힌 hex. 토큰 이름은 `provenance.ts` 에서 가져온다(두 벌 금지). */
const NAMED_HEX = new Map(
  NAMED.map((id) => {
    const token = tokenOf(id).replace("--color-", "--");
    return [id, declaredValue(ROOT_BLOCK, token)] as const;
  }),
);

/**
 * 문턱은 실측보다 **낮게** 잡는다(후보끼리 16.1 · 기존 색과 16.5). 실측값 그대로 박으면
 * 색을 한 자리 손볼 때마다 우는데, 늘 우는 가드는 꺼진다(CLAUDE.md 2026-08-20).
 * 15 는 「확실히 다른 색」선(≈10)보다 넉넉히 위다.
 */
const MIN_DELTA_E = 15;

describe("[출처 팔레트] 토큰이 실제로 연결되어 있는가", () => {
  it("`:root` 에서 파싱한 블록이 비어 있지 않다 — 정규식이 죽으면 아래가 전부 헛돈다", () => {
    expect(ROOT_BLOCK).toContain("--ink:");
    expect(THEME_BLOCK).toContain("--color-ink:");
  });

  it.each(NAMED)("%s 의 색이 `:root` 에 hex 로 적혀 있다", (id) => {
    const hex = NAMED_HEX.get(id);
    expect(hex, `${tokenOf(id)} 가 :root 에 없다`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  // 🔴 05 §2.2.1 의 함정 — 여기가 비면 `text-src-*` 가 **아무 색도 안 내면서 에러도 안 난다.**
  it.each([...NAMED, "origin/unknown"] as const)(
    "%s 의 색이 `@theme inline` 에도 이어져 있다",
    (id) => {
      const themeName = tokenOf(id);
      const value = declaredValue(THEME_BLOCK, themeName);
      expect(value, `${themeName} 가 @theme inline 에 없다`).not.toBeNull();
      // 리터럴을 한 벌 더 두지 않는다 — 반드시 `:root` 토큰을 가리켜야 한다.
      expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/);
    },
  );

  // 「모른다」에 고유색을 만들면 그것이 하나의 «분류»처럼 읽힌다. 회색을 **빌려** 쓴다.
  it("「모른다」는 새 색을 만들지 않고 기존 회색을 가리킨다", () => {
    expect(declaredValue(ROOT_BLOCK, "--src-unknown")).toBe("var(--text-2)");
  });
});

describe("[출처 팔레트] 원장님 지시 「색상 전부 다르게」 — 재서 지킨다", () => {
  it("열세 갈래의 색값이 서로 다른 문자열이다", () => {
    const hexes = NAMED.map((k) => NAMED_HEX.get(k)!.toLowerCase());
    expect(hexes).toHaveLength(13);
    expect(new Set(hexes).size).toBe(13);
  });

  it(`열세 갈래가 서로 ΔE2000 >= ${MIN_DELTA_E} 떨어져 있다`, () => {
    const 가까운짝: string[] = [];
    for (let i = 0; i < NAMED.length; i += 1) {
      for (let j = i + 1; j < NAMED.length; j += 1) {
        const d = deltaE2000(
          NAMED_HEX.get(NAMED[i]!)!,
          NAMED_HEX.get(NAMED[j]!)!,
        );
        if (d < MIN_DELTA_E) {
          가까운짝.push(`${NAMED[i]} ↔ ${NAMED[j]} = ${d.toFixed(1)}`);
        }
      }
    }
    expect(가까운짝).toEqual([]);
  });

  // Workroom's blue controls and navy text are chrome, not status categories.
  // Preserve the owner's distinct badge colours: status/category gaps stay 15;
  // chrome gaps use the perceptible-difference floor of 10 (see §8.9).
  it("상태색과 15, 작업실 글자·조작색과 10 이상 떨어져 있다", () => {
    const 가까운짝: string[] = [];
    for (const kind of NAMED) {
      for (const token of EXISTING_TOKENS) {
        let existing = declaredValue(ROOT_BLOCK, token);
        while (existing?.startsWith("var(--")) {
          existing = declaredValue(ROOT_BLOCK, existing.slice(4, -1));
        }
        expect(existing, `${token} 가 :root 에 없다`).toMatch(
          /^#[0-9a-f]{6}$/i,
        );
        const d = deltaE2000(NAMED_HEX.get(kind)!, existing!);
        const minimum = ["--ink", "--text-2", "--blue"].includes(token)
          ? 10
          : MIN_DELTA_E;
        if (d < minimum) {
          가까운짝.push(`${kind} ↔ ${token} = ${d.toFixed(1)}`);
        }
      }
    }
    expect(가까운짝).toEqual([]);
  });
});

describe("[출처 팔레트] 05 §6.1 대비 · §2.2 명도 계단이 아님", () => {
  it.each(NAMED)("%s 는 흰 바탕에서 대비 4.5:1 이상이다", (id) => {
    expect(contrastOnWhite(NAMED_HEX.get(id)!)).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * G2 는 1.31~10.49 의 **계단**으로 「어디까지 왔나」를 나른다. 출처는 위계가 없는
   * **분류**축이라 계단이면 안 된다 — 곁눈질로 「이게 더 나아간 상태」로 읽힌다.
   * 그래서 여덟 색을 한 띠 안에 가둔다(실측 4.81~7.49, 폭 1.56배).
   */
  it("열세 색의 대비가 한 띠 안에 있다 — 계단을 만들지 않는다", () => {
    const ratios = NAMED.map((k) => contrastOnWhite(NAMED_HEX.get(k)!));
    const span = Math.max(...ratios) / Math.min(...ratios);
    expect(span).toBeLessThan(2);
    // 참고: G2 넷은 같은 계산에서 10.49/2.23 = 4.7배다. 구조가 다르다는 뜻이다.
    expect(Math.max(...ratios)).toBeLessThan(9);
  });
});
