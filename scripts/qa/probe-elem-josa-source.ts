/**
 * **뽑히는 낱말 뒤에 조사를 손으로 적은 자리** — 생성기 **원문**에서 찾는다.
 *
 *   npx tsx scripts/qa/probe-elem-josa-source.ts
 *   npx tsx scripts/qa/probe-elem-josa-source.ts --selftest
 *
 * ## 왜 원문인가
 *
 * 산출물(찍힌 문장)에서 「낱말+조사」를 세면 **어미가 대부분 걸린다** — 「있**는**」·
 * 「몇 개**인가**」·「그**은**」. 2026-08-23 실측으로 네 학년 27,180문항에서 67가지가
 * 걸렸는데 거의 다 거짓이었다. **조사와 어미는 글자로 안 갈린다.**
 *
 * 원문에서는 갈린다 — 우리가 찾는 것은 `` `${food}를` `` 처럼 **보간 바로 뒤**에
 * 조사를 **손으로 적은** 자리이고, 그 «자리»는 문자열이 아니라 구조다.
 * 문턱을 옮길 일이 아니라 **축을 바꿀 일**이었다.
 *
 * ## 무엇이 결함인가 — **받침이 섞일 때만**
 *
 * `${food}를` 은 `food` 후보가 `["피자", "케이크", "빵"]` 일 때 **결함**이다
 * (「빵를」). 그런데 후보가 전부 받침이 있으면(`["사탕", "구슬", "귤"]`) 손으로 적은
 * 「을」이 **언제나 옳다.** 그래서 **후보의 받침이 섞인 자리만** 센다 —
 * 안 그러면 멀쩡한 자리가 무더기로 걸리고, **거짓 경보는 가드를 끈다.**
 *
 * ## 이 검사가 **못 보는 것** (그건 저쪽이 본다)
 *
 * ⚠️ **`josa()` 를 쓰되 인자를 뒤집은 것**(`josa(x, "를", "을")`)은 여기서 통과한다 —
 *   원문만 보면 「josa 를 썼다」로 보이기 때문이다. 그 부류는 **산출물에서 그림 라벨
 *   조사를 재는 g4 쪽 검사**가 잡는다. 두 검사는 **서로의 사각지대를 덮는다** —
 *   한쪽만 보고 「조사는 검사된다」고 읽지 말 것이고, 한쪽을 지우지도 말 것.
 * ⚠️ 수 뒤 조사(`${n(x)}는`)도 여기 대상이 아니다. 그건 `probe-elem-rules` 의
 *   R-조사가 **찍힌 `$…$` 뒤**에서 잡는다. 여기는 **낱말**만 본다.
 * ⚠️ 그리고 이 검사는 **`pick` 으로 뽑는 낱말**만 안다. 조건문으로 갈라 넣는 낱말
 *   (`const x = cond ? "가로" : "세로"`)은 못 본다 — 만나면 여기부터 채울 것.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { openFence } from "./elemProbeFence";

const GEN_DIR = path.join(process.cwd(), "src", "lib", "elementary");

/** 받침 여부로 갈리는 조사 짝 — 앞이 받침 있음, 뒤가 없음. */
const PAIRS: [string, string][] = [
  ["은", "는"],
  ["이", "가"],
  ["을", "를"],
  ["과", "와"],
  ["으로", "로"],
  ["이나", "나"],
  ["이라", "라"],
];
const PARTICLES = PAIRS.flat();

/** 한글 음절의 받침 유무. 「로/으로」는 ㄹ 받침도 «없음» 쪽으로 친다(읽는 소리). */
export function hasBatchim(word: string, forRo = false): boolean {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  const jong = code % 28;
  return forRo ? jong !== 0 && jong !== 8 : jong !== 0;
}

/** 문자열 배열 리터럴에서 한글 낱말만 꺼낸다. */
function wordsInArray(src: string): string[] {
  return [...src.matchAll(/"([^"\\]*[가-힣][^"\\]*)"/g)].map((m) => m[1]!);
}

/**
 * 최상위 `function 이름(` 의 시작점 — **함수 경계**를 알아야 변수를 옳게 푼다.
 * (`probe-elem-routing` 이 같은 이유로 같은 자리를 잡는다.)
 */
function functionBounds(src: string): { at: number }[] {
  return [...src.matchAll(/^(?:export\s+)?function\s+\w+\s*\(/gm)].map((m) => ({
    at: m.index!,
  }));
}

/** 모듈 상수 `const NAME = [ … ] as const` — 파일 어디서나 참조된다. */
function modulePools(src: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]{0,600}?)\]\s*as const/g,
  )) {
    const ws = wordsInArray(m[2]!);
    if (ws.length > 0) out.set(m[1]!, ws);
  }
  return out;
}

/**
 * `const <이름> = pick(rng, …)` 를 **그 자리가 속한 함수 안에서만** 찾는다.
 *
 * ⚠️ **파일 전체에서 이름으로 찾으면 안 된다.** 2026-08-23 실전 첫 실행에서 4건 중
 * **3건이 거짓**이었다 — `g6.ts` 의 두 함수가 둘 다 `const thing = pick(rng, …)` 을
 * 쓰는데, 한쪽은 `CMP_SHEETS`(색종이·딱지·카드 — 받침 **없음**), 다른 쪽은
 * `CUT_STUFF`(끈·리본·철사… — **섞임**)였다. 이름으로 모으니 **둘이 합쳐져** 받침이
 * 섞인 것처럼 보였고, 「가/는」이 늘 옳은 자리가 결함으로 찍혔다.
 *
 * 「같은 이름의 다른 풀」은 **글자로 안 갈리고 자리로 갈린다** — 문턱이 아니라 축이
 * 틀렸던 것이다. 못 풀면 **「모름」으로 두고 걸지 않는다**(거짓 경보보다 낫다).
 */
/** 한 함수 몸통 안의 `const X = pick(rng, …)` 만 모은다. */
function poolsInRange(
  src: string,
  start: number,
  end: number,
  pools: Map<string, string[]>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  // ⚠️ `pick(rng, POOL)[0]` 꼴을 같이 본다 — `);` 로만 끝을 잡으면 이 꼴이 통째로
  //   「모름」이 되고, 실측으로 그게 못 푼 자리의 가장 큰 덩어리였다(g4 `dir` 24자리).
  for (const m of src
    .slice(start, end)
    .matchAll(
      /const\s+([A-Za-z_$][\w$]*)\s*=\s*pick\(\s*rng\s*,\s*([\s\S]{0,600}?)\)\s*(?:\[\s*\d+\s*\])?\s*;/g,
    )) {
    const name = m[1]!;
    const arg = m[2]!;
    const direct = wordsInArray(arg);
    if (direct.length > 0) {
      out.set(name, [...(out.get(name) ?? []), ...direct]);
      continue;
    }
    const ref = /^([A-Za-z_$][\w$]*)\s*$/.exec(arg.trim())?.[1];
    const fromPool = ref ? pools.get(ref) : undefined;
    if (fromPool) out.set(name, [...(out.get(name) ?? []), ...fromPool]);
  }
  return out;
}

export type Fault = { file: string; line: number; text: string; why: string };

/**
 * **판정한 자리 / 모르는 자리** — 「위반 0」이 «깨끗»인지 «못 셈»인지 가르는 분모.
 *
 * 스코프로 좁힌 뒤에는 **못 푸는 자리**가 생긴다(그 함수 밖에서 온 변수 · 조건문으로
 * 고른 낱말). 그걸 조용히 통과시키면 좁힌 것이 곧 사각지대가 된다 — 그래서 센다.
 */
export type Judged = { judged: number; unknown: number };
const judgedTally: Judged = { judged: 0, unknown: 0 };
export const judgedSoFar = (): Judged => ({ ...judgedTally });
/** 못 푼 자리 — 「모름」이 한 덩어리면 좁힌 것이 곧 사각지대다. `--unknown` 으로 본다. */
const unknownNames = new Map<string, number>();
export const unknownSoFar = (): Map<string, number> => new Map(unknownNames);

/** 보간 바로 뒤에 조사를 손으로 적은 자리 — **후보의 받침이 섞인 것만**. */
export function faultsIn(file: string, src: string): Fault[] {
  const pools = modulePools(src);
  const bounds = functionBounds(src);
  /** 그 자리를 감싸는 함수 안의 풀만 본다 — 파일 전체에서 이름으로 찾으면 섞인다. */
  const varsAt = (index: number): Map<string, string[]> => {
    const start = bounds.filter((b) => b.at <= index).pop()?.at ?? 0;
    const end = bounds.find((b) => b.at > index)?.at ?? src.length;
    return poolsInRange(src, start, end, pools);
  };
  const out: Fault[] = [];
  const re = new RegExp(
    `\\$\\{\\s*([A-Za-z_$][\\w$]*)\\s*\\}(${PARTICLES.join("|")})(?![가-힣])`,
    "g",
  );
  for (const m of src.matchAll(re)) {
    const name = m[1]!;
    const particle = m[2]!;
    // ⚠️ **그 자리의 스코프**에서 푼다. 못 풀면 「모름」이고, 모르면 **안 건다** —
    //   거짓 경보 하나가 판정기 전체의 신뢰를 깎는다(실전 첫 실행 4건 중 3건이 그랬다).
    const words = varsAt(m.index!).get(name);
    if (!words) {
      judgedTally.unknown += 1;
      // **무엇을 못 봤는지** 모아 둔다 — 「모름」이 한 덩어리면 좁힌 것이 사각지대가 된다.
      unknownNames.set(
        `${file}  \${${name}}${particle}`,
        (unknownNames.get(`${file}  \${${name}}${particle}`) ?? 0) + 1,
      );
      continue; // 낱말 변수가 아니거나 이 함수 밖에서 왔다 — 판정하지 않는다
    }
    judgedTally.judged += 1;
    const forRo = particle === "로" || particle === "으로";
    const kinds = new Set(words.map((w) => hasBatchim(w, forRo)));
    if (kinds.size < 2) continue; // 받침이 다 같으면 손으로 적은 조사가 늘 옳다
    const wrong = words.filter((w) => {
      const pair = PAIRS.find((p) => p.includes(particle))!;
      return hasBatchim(w, forRo) ? particle !== pair[0] : particle !== pair[1];
    });
    out.push({
      file,
      line: src.slice(0, m.index).split("\n").length,
      text: `\${${name}}${particle}`,
      why: `${name} ∈ [${words.slice(0, 5).join(", ")}] — ${wrong
        .slice(0, 3)
        .map((w) => `「${w}${particle}」`)
        .join(" ")} 가 그대로 나간다`,
    });
  }
  return out;
}

/* ─────────────────────────── 눈금 ─────────────────────────── */

const GAUGE: [string, string, number][] = [
  [
    "양성 — 받침이 섞인 후보에 「를」을 손으로 적었다",
    'const food = pick(rng, ["피자", "케이크", "빵"]);\nreturn `똑같은 ${food}를 먹었다`;',
    1,
  ],
  [
    "음성 — josa() 를 썼다",
    'const food = pick(rng, ["피자", "케이크", "빵"]);\nreturn `똑같은 ${food}${josa(food, "을", "를")} 먹었다`;',
    0,
  ],
  [
    "음성 — 후보의 받침이 **다 같다**(손으로 적은 「을」이 늘 옳다)",
    'const stuff = pick(rng, ["사탕", "구슬", "귤"]);\nreturn `${stuff}을 나누었다`;',
    0,
  ],
  [
    "음성 — 받침이 다 없는 후보 + 「를」",
    'const toy = pick(rng, ["딱지", "쿠키"]);\nreturn `${toy}를 세었다`;',
    0,
  ],
  [
    "음성 — 수 뒤 조사는 여기 대상이 아니다 (R-조사가 본다)",
    "return `${n(whole)}를 나누면`;",
    0,
  ],
  [
    "음성 — 조사가 아니라 셈숱말",
    'const stuff = pick(rng, ["사탕", "딱지"]);\nreturn `${stuff} ${n(x)}개를 담았다`;',
    0,
  ],
  [
    "경계 — 모듈 상수를 참조해도 후보를 찾아낸다",
    'const FOODS = ["피자", "빵"] as const;\nconst food = pick(rng, FOODS);\nreturn `${food}를 먹었다`;',
    1,
  ],
  [
    "경계 — 어미는 조사가 아니다 (「있는」)",
    'const stuff = pick(rng, ["사탕", "딱지"]);\nreturn `${stuff} 상자에 있는 것`;',
    0,
  ],
  // ── 실데이터가 잡아 준 축 (2026-08-23) ─────────────────────────────
  // 같은 이름의 변수를 두 함수가 **다른 풀**로 뽑는다. 파일 전체에서 이름으로 모으면
  // 둘이 합쳐져 받침이 섞인 것처럼 보이고, 「가/는」이 늘 옳은 자리가 결함으로 찍힌다.
  // 실전 첫 실행에서 **4건 중 3건**이 이 부류였다 — 픽스처에 이 모양이 없었다.
  [
    "음성 — 같은 파일 **다른 함수**에 받침 섞인 풀이 있어도, 이 자리 풀이 받침 없으면",
    'const CUT_STUFF = ["끈", "리본", "철사"] as const;\n' +
      "function cut(rng: Rng) {\n" +
      "  const thing = pick(rng, CUT_STUFF);\n" +
      '  return `${thing}${josa(thing, "을", "를")} 자른다`;\n' +
      "}\n" +
      'const CMP_SHEETS = ["색종이", "딱지", "카드"] as const;\n' +
      "function cmp(rng: Rng) {\n" +
      "  const thing = pick(rng, CMP_SHEETS);\n" +
      "  return `파란 ${thing}가 있습니다`;\n" +
      "}",
    0,
  ],
  [
    "양성 — **이 자리 스코프**의 풀에 받침이 섞였을 때만",
    'const CMP_SHEETS = ["색종이", "딱지", "카드"] as const;\n' +
      "function cmp(rng: Rng) {\n" +
      "  const thing = pick(rng, CMP_SHEETS);\n" +
      "  return `파란 ${thing}가 있습니다`;\n" +
      "}\n" +
      'const CUT_STUFF = ["끈", "리본", "철사"] as const;\n' +
      "function cut(rng: Rng) {\n" +
      "  const thing = pick(rng, CUT_STUFF);\n" +
      "  return `${thing}를 자른다`;\n" +
      "}",
    1,
  ],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, src, want] of GAUGE) {
    const got = faultsIn("눈금", src).length;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`  ${ok ? "✅" : "❌"} ${why} — 기대 ${want} / 실제 ${got}`);
  }
  // ⚠️ 양성·음성 수를 **손으로 적지 않는다** — 눈금을 늘리면 그 숫자가 곧 거짓말이 된다.
  //   실제로 2026-08-23 에 눈금 8 → 10 으로 늘렸는데 라벨은 「양성 2 · 음성 6」이었다.
  const pos = GAUGE.filter(([, , want]) => want > 0).length;
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (양성 ${pos} · 음성 ${GAUGE.length - pos})`
      : `\n❌ 눈금 ${bad}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const fence = openFence();
const files = readdirSync(GEN_DIR).filter((f) => f.endsWith(".ts"));
const all: Fault[] = [];
let interpolations = 0;
for (const f of files) {
  const src = readFileSync(path.join(GEN_DIR, f), "utf8");
  interpolations += [...src.matchAll(/\$\{[^}]*\}/g)].length;
  all.push(...faultsIn(f, src));
}
fence.close();

const jt = judgedSoFar();
console.log(
  `훑은 것 — 파일 ${files.length} · 보간 ${interpolations}자리 · ${fence.scopeLine()}\n` +
    `조사가 붙은 보간 ${jt.judged + jt.unknown}자리 중 **판정 ${jt.judged}** · ` +
    `**모름 ${jt.unknown}**(그 함수 밖에서 온 변수·수 뒤 조사)\n` +
    "(수 뒤 조사는 안 본다 — probe-elem-rules 의 R-조사 몫. " +
    "josa() 인자가 뒤집힌 것도 안 본다 — 산출물 검사 몫)\n",
);
if (jt.judged === 0) {
  console.log(
    "⛔ **한 자리도 판정하지 못했다** — 「위반 0」은 «깨끗»이 아니라 «못 셈»이다.\n" +
      "   스코프 해결이 깨졌는지(함수 경계 정규식) 보라.",
  );
  process.exit(2);
}
if (interpolations === 0) {
  console.log(
    "⛔ 보간을 한 자리도 못 읽었다 — 「위반 0」은 «깨끗»이 아니라 «못 셈»이다.",
  );
  process.exit(2);
}
if (process.argv.includes("--unknown")) {
  console.log(
    "못 푼 자리 — 빈도순 20 (대부분 `n()`·`expr()` 로 수를 넣은 것이라 R-조사 몫이다):",
  );
  for (const [k, c] of [...unknownSoFar()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20))
    console.log(`  ${String(c).padStart(4)}  ${k}`);
  console.log("");
}
if (all.length === 0) {
  console.log("✅ 뽑히는 낱말 뒤 손 조사 0");
} else {
  console.log(`❌ 뽑히는 낱말 뒤 손 조사 ${all.length}자리`);
  for (const f of all)
    console.log(`  · ${f.file}:${f.line}  ${f.text}\n      ${f.why}`);
}
process.exitCode = all.length === 0 ? 0 : 1;
