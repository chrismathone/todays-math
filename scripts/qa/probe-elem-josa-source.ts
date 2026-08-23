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
 * `const <이름> = pick(rng, [ … 한글 … ])` 과
 * `const <이름> = pick(rng, <모듈 상수>)` 를 모아 **뽑히는 낱말 변수**를 만든다.
 */
export function pickedWordVars(src: string): Map<string, string[]> {
  const consts = new Map<string, string[]>();
  for (const m of src.matchAll(
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]{0,600}?)\]\s*as const/g,
  )) {
    const ws = wordsInArray(m[2]!);
    if (ws.length > 0) consts.set(m[1]!, ws);
  }
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*pick\(\s*rng\s*,\s*([\s\S]{0,600}?)\);/g,
  )) {
    const name = m[1]!;
    const arg = m[2]!;
    const direct = wordsInArray(arg);
    if (direct.length > 0) {
      out.set(name, [...(out.get(name) ?? []), ...direct]);
      continue;
    }
    const ref = /^([A-Za-z_$][\w$]*)\s*$/.exec(arg.trim())?.[1];
    const fromConst = ref ? consts.get(ref) : undefined;
    if (fromConst) out.set(name, [...(out.get(name) ?? []), ...fromConst]);
  }
  return out;
}

export type Fault = { file: string; line: number; text: string; why: string };

/** 보간 바로 뒤에 조사를 손으로 적은 자리 — **후보의 받침이 섞인 것만**. */
export function faultsIn(file: string, src: string): Fault[] {
  const vars = pickedWordVars(src);
  const out: Fault[] = [];
  const re = new RegExp(
    `\\$\\{\\s*([A-Za-z_$][\\w$]*)\\s*\\}(${PARTICLES.join("|")})(?![가-힣])`,
    "g",
  );
  for (const m of src.matchAll(re)) {
    const name = m[1]!;
    const particle = m[2]!;
    const words = vars.get(name);
    if (!words) continue; // 낱말 변수가 아니다 — 수 뒤 조사는 R-조사가 본다
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
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, src, want] of GAUGE) {
    const got = faultsIn("눈금", src).length;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`  ${ok ? "✅" : "❌"} ${why} — 기대 ${want} / 실제 ${got}`);
  }
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (양성 2 · 음성 6)`
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

console.log(
  `훑은 것 — 파일 ${files.length} · 보간 ${interpolations}자리 · ${fence.scopeLine()}\n` +
    "(수 뒤 조사는 안 본다 — probe-elem-rules 의 R-조사 몫. " +
    "josa() 인자가 뒤집힌 것도 안 본다 — 산출물 검사 몫)\n",
);
if (interpolations === 0) {
  console.log(
    "⛔ 보간을 한 자리도 못 읽었다 — 「위반 0」은 «깨끗»이 아니라 «못 셈»이다.",
  );
  process.exit(2);
}
if (all.length === 0) {
  console.log("✅ 뽑히는 낱말 뒤 손 조사 0");
} else {
  console.log(`❌ 뽑히는 낱말 뒤 손 조사 ${all.length}자리`);
  for (const f of all)
    console.log(`  · ${f.file}:${f.line}  ${f.text}\n      ${f.why}`);
}
process.exitCode = all.length === 0 ? 0 : 1;
