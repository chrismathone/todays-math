/**
 * **라벨 글자 폭 표를 MathJax 에서 뽑는다** → `scripts/figure/label-widths.json`.
 *
 *   npx tsx scripts/qa/build-label-width-table.ts          # 굽는다
 *   npx tsx scripts/qa/build-label-width-table.ts --check   # 낡았는지만 본다
 *
 * ## 왜 필요한가
 *
 * 파이썬 배치기는 라벨 자리를 미리 빼려고 폭을 **어림**한다. 종전 어림은
 * 「13pt 에서 ASCII 8.0/글자」 한 값이었다(= 0.6154em). 그런데 지면을 그리는 것은
 * 이제 MathJax 이고, 그 글꼴에서 **34종이 그 값보다 넓다** — `M` 1.71배 · `m` 1.43배 ·
 * `+` 1.26배. 어림이 실제보다 좁으면 배치기는 「자리가 남는다」고 판단하고,
 * 지면에서는 라벨이 **잘리거나 선을 밟는다**(실측: `12 cm` 의 `1` 이 왼쪽으로
 * 5.24단위 나갔다 — 원장님 지적 2026-08-28).
 *
 * 그래서 **손으로 정한 한 값을 버리고 정본(MathJax)에서 뽑는다.**
 *
 * ⚠️ 글자 폭의 **합**이 라벨 폭과 정확히 같지는 않다(빈칸이 `\,` 로 바뀌고
 *    `\mathrm{}` 이 묶인다). 그래서 이 도구는 **실제 라벨 뭉치로 검산**하고,
 *    합이 실제보다 좁은 경우가 하나라도 있으면 **안전계수를 올려** 다시 잰다.
 *    표는 「어림」이지만 **아래로 새지 않는 어림**이어야 한다.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { typesetLabel } from "../../src/lib/figure/mathjaxLabel";

const OUT = path.join(process.cwd(), "scripts", "figure", "label-widths.json");

/** 라벨에 실제로 나오는 글자들. 모르는 글자는 `default` 로 넉넉히 잡는다. */
const CHARS = (
  "0123456789" +
  "abcdefghijklmnopqrstuvwxyz" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "+-=<>()[]{}.,:;/*'\"?!°%×÷ "
).split("");

/**
 * 검산용 라벨 뭉치 — **실제로 지면에 나가는 모양**이어야 한다.
 * 좁게 잡으면 「합이 실제보다 좁은 경우」를 구조적으로 못 본다.
 */
const CORPUS = [
  "0",
  "5",
  "12",
  "100",
  "1000",
  "0.5",
  "1.5",
  "12.75",
  "1 cm",
  "6 cm",
  "12 cm",
  "0.5 cm",
  "125 cm",
  "24 cm",
  "1 m",
  "5 mm",
  "3 km",
  "7 kg",
  "2 L",
  "0°",
  "30°",
  "45°",
  "125°",
  "360°",
  "x",
  "y",
  "A",
  "B",
  "C",
  "M",
  "N",
  "AB",
  "CD",
  "MN",
  "ABCD",
  "+",
  "-",
  "×",
  "÷",
  "=",
  "<",
  ">",
  "3x°+5°",
  "2x°+40°",
  "x°-9°",
  "5x°+10°",
  "(개)",
  "(원)",
  "(명)",
  "10%",
  "40%",
  "100%",
  "sin",
  "cos",
  "tan",
  "log",
  "1/2",
  "3/4",
];

/**
 * ⚠️ **가운데 낀 연산자는 앞뒤에 여백을 얻는다.** TeX 는 `a+b` 의 `+` 를 이항
 *    연산자로 보고 양쪽에 medium space 를 준다 — 실측 한 개당 **0.445em**.
 *    홀로 선 `+` 는 여백이 없다(단항/기호로 읽힌다).
 *
 *    이 항이 없으면 어림이 아래로 샜다 — 실측으로 `x°-9°` 가 16.3% 좁게 나왔고,
 *    그것 하나 때문에 **모든 라벨에 18% 안전계수**가 붙고 있었다. 규칙을 제대로
 *    적으면 나머지 52개 라벨이 전부 **오차 0**이다.
 */
const OPERATORS = new Set(["+", "-", "=", "<", ">", "×", "÷"]);
const OP_SPACE = 0.445;

function infixOps(text: string): number {
  const chars = [...text];
  let n = 0;
  for (let i = 1; i < chars.length - 1; i += 1) {
    if (OPERATORS.has(chars[i]!)) n += 1;
  }
  return n;
}

function bound(
  table: Record<string, number>,
  def: number,
  text: string,
): number {
  let sum = 0;
  for (const ch of text) sum += table[ch] ?? def;
  return sum + infixOps(text) * OP_SPACE;
}

function main(): void {
  const check = process.argv.includes("--check");
  const table: Record<string, number> = {};
  for (const c of CHARS) {
    // 빈칸은 홀로 조판하면 0 이다 — 라벨 안에서는 `\,`(0.1667em) 이 된다.
    if (c === " ") {
      table[c] = 0.1667;
      continue;
    }
    // ⚠️ **같은 글자가 자리마다 다른 폭이다.** 낱글자는 변수라 **이탤릭**이고,
    //    낱말 안(`cm`·`sin`)에서는 `\mathrm` 이라 **정자체**다 — 정자체 `c` 가 더 넓다.
    //    한쪽만 재면 어림이 아래로 새고, 그러면 배치기가 「자리가 남는다」고 잘못 본다.
    //    둘 다 재서 **넓은 쪽**을 쓴다(어림은 위로만 새야 한다).
    //    ⚠️ **굵기도 폭을 바꾼다.** 초등 엔진은 라벨을 `font-weight="700"` 으로 내고,
    //       조판기는 그것을 `oldsymbol` 로 받는다 — `+` 가 0.778 → **0.894em** 이다.
    //       보통 굵기만 재면 어림이 아래로 새고, 실측으로 `timeAdd` 의 `+` 가
    //       왼쪽으로 1.61단위 잘려 나갔다(2026-08-28).
    //    ⚠️ **홑 대문자는 2026-08-28 부터 정자체다**(점 이름 — `toTex` 주석 참조).
    //       그러면 `typesetLabel("A")` 는 이탤릭 폭을 **더 이상 안 잰다.** 스펙이
    //       `$A$` 로 이탤릭을 부를 수 있으므로 그쪽도 같이 재서 **넓은 쪽**을 쓴다.
    //       한쪽만 재면 어림이 아래로 새고, 그러면 배치기가 「자리가 남는다」고
    //       잘못 본다 — 이 표의 존재 이유가 그것이다.
    const cands = [
      typesetLabel(c)?.widthEm ?? 0,
      typesetLabel(c, true)?.widthEm ?? 0,
      typesetLabel(`$${c}$`)?.widthEm ?? 0,
      typesetLabel(`$${c}$`, true)?.widthEm ?? 0,
    ];
    if (/[A-Za-z]/.test(c)) {
      for (const bold of [false, true]) {
        const pair = typesetLabel(`${c}${c}`, bold)?.widthEm;
        if (pair !== undefined) cands.push(pair / 2);
      }
    }
    const w = Math.max(...cands);
    if (w <= 0) continue;
    // 자릿수를 줄일 때는 **올림**한다. 내림하면 합이 실제보다 몇 만분의 일 좁아지고,
    // 그 티끌 하나가 안전계수를 1.02 로 밀어 올린다(실측) — 어림은 위로만 새야 한다.
    table[c] = Math.ceil(w * 10000) / 10000;
  }
  const def = Number(Math.max(...Object.values(table)).toFixed(4));

  // ── 검산 — 합이 실제보다 **좁은** 라벨이 없어야 한다.
  let safety = 1.0;
  const worst: { text: string; est: number; real: number }[] = [];
  for (let round = 0; round < 20; round += 1) {
    worst.length = 0;
    let ok = true;
    for (const text of CORPUS) {
      // 굵기 두 갈래를 **둘 다** 본다 — 한쪽만 보면 나머지가 사각지대다.
      for (const bold of [false, true]) {
        const laid = typesetLabel(text, bold);
        if (!laid) continue;
        const est = bound(table, def, text) * safety;
        if (est < laid.widthEm - 1e-6) {
          ok = false;
          worst.push({
            text: bold ? `${text} (굵게)` : text,
            est,
            real: laid.widthEm,
          });
        }
      }
    }
    if (ok) break;
    // 걸음이 굵으면 티끌 하나에 2% 가 붙는다 — 필요한 만큼만 올린다.
    safety = Number((safety + 0.002).toFixed(3));
  }
  if (worst.length > 0) {
    console.error("🔴 안전계수를 올려도 아래로 새는 라벨이 있다:");
    for (const w of worst.slice(0, 10)) {
      console.error(
        `   «${w.text}» 어림 ${w.est.toFixed(4)} < 실제 ${w.real.toFixed(4)}`,
      );
    }
    process.exit(1);
  }

  const doc = {
    _: "MathJax 에서 뽑은 글자 폭(em). scripts/qa/build-label-width-table.ts 가 굽는다 — 손으로 고치지 마라.",
    safety,
    // 가운데 낀 이항 연산자 하나가 얻는 앞뒤 여백(em). 실측.
    opSpace: OP_SPACE,
    operators: [...OPERATORS],
    default: def,
    // 한글은 MathJax 가 조판하지 않는다(글리프가 없다) — 브라우저가 Batang 으로 그리고,
    // 그 실측 상한이 13pt 에서 13.24 = 1.0185em 이다(종전 값 그대로 이어받는다).
    hangul: 1.0185,
    widths: table,
  };
  const next = `${JSON.stringify(doc, null, 1)}\n`;
  const prev = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (check) {
    console.log(
      next === prev ? "OK — 표가 최신이다" : "🔴 표가 낡았다 — 다시 구워라",
    );
    process.exit(next === prev ? 0 : 1);
  }
  writeFileSync(OUT, next, "utf8");
  console.log(
    `글자 ${Object.keys(table).length}종 · 안전계수 ${safety} · 모르는 글자 ${def}em\n→ ${OUT}`,
  );
}

main();
