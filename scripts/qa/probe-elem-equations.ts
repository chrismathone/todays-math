/**
 * **지면에 적힌 등식이 스스로 성립하는가** — 학년 무관 전수 검산.
 *
 *   npx tsx scripts/qa/probe-elem-equations.ts          # 전 학년, 씨앗 0~299
 *   npx tsx scripts/qa/probe-elem-equations.ts 초4       # 한 학년만
 *   npx tsx scripts/qa/probe-elem-equations.ts 초4 1000  # 씨앗 수를 늘려
 *   npx tsx scripts/qa/probe-elem-equations.ts --selftest
 *
 * ## 이 도구가 재는 것과 **못 재는 것**
 *
 * 잰다: 발문·정답·해설 안 `$...$` 에 든 **등식**을 유리수로 다시 계산해 양변이 같은가.
 * 부동소수점을 안 쓰므로 `0.1+0.2=0.3` 이 참으로 나온다(초등 소수 단원에서 중요하다).
 *
 * **못 잰다: 「그 값이 물은 것에 대한 답인가」.** 해설이 통째로 엉뚱한 값을 **일관되게**
 * 적으면 이 검사는 전량 초록이다. 그건 각 학년 시험의 **재도출**(발문을 읽어 답을 다시
 * 세우는 것) 몫이고, 두 축은 서로를 대신하지 못한다 — **넓지만 얕은 것**과 **좁지만
 * 깊은 것**이다. 둘 다 있어야 한다.
 *
 * ## 「0 위반」이 깨끗하다는 뜻이 되려면
 *
 * 이 도구는 **검산한 등식 수와 건너뛴 수를 반드시 함께 찍는다.** 못 읽는 꼴(변수·□·
 * 단위가 낀 것)은 조용히 통과시키지 않고 **«안 잼»으로 세어 드러낸다** — 그러지 않으면
 * 파서가 망가진 날 「위반 0」이 「깨끗하다」로 읽힌다. `--selftest` 는 **일부러 틀린
 * 등식**과 **맞는 등식**을 둘 다 대 본다(양성만 대면 지어냄이 구조적으로 0이 된다).
 *
 * 2026-08-23 리드 검수에서 만들어 팀 공용으로 올린다. 그날 초4 2-1 에서 43,212개를 재
 * 전량 성립을 확인했고, 그 축이 없었다면 해설 안 중간값은 아무도 안 보고 있었다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import { ELEM_TIERS, type ElemTier } from "../../src/lib/elementary/difficulty";
import { supportedTiers } from "../../src/lib/elementary/generate";
import { SweepTally, openFence } from "./elemProbeFence";

/* ─────────────────────────── 유리수 ─────────────────────────── */

type R = { n: number; d: number };
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** 언제나 기약으로 들고 다닌다 — 안 줄이면 몇 걸음 만에 자릿수가 넘친다. */
function rat(n: number, d: number): R {
  if (d === 0) throw new Error("0으로 나눔");
  const s = d < 0 ? -1 : 1;
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}
const add = (x: R, y: R) => rat(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x: R, y: R) => rat(x.n * y.d - y.n * x.d, x.d * y.d);
const mul = (x: R, y: R) => rat(x.n * y.n, x.d * y.d);
const div = (x: R, y: R) => rat(x.n * y.d, x.d * y.n);
const same = (x: R, y: R) => x.n * y.d === y.n * x.d;
const show = (x: R) => (x.d === 1 ? `${x.n}` : `${x.n}/${x.d}`);
/** 정수 범위를 벗어나면 판정하지 않는다 — 조용히 틀린 답을 내느니 «안 잼»으로 센다. */
const sane = (x: R) => Math.abs(x.n) < 1e15 && Math.abs(x.d) < 1e15;

/* ─────────────────────────── 토큰·파서 ─────────────────────────── */

type Tok =
  | { t: "num"; v: R }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "(" }
  | { t: ")" };

/** `{` 자리에서 짝이 되는 `}` 자리를 찾는다. 중첩을 센다. 못 찾으면 null. */
function matchBrace(s: string, open: number): number | null {
  if (s[open] !== "{") return null;
  let depth = 0;
  for (let k = open; k < s.length; k += 1) {
    if (s[k] === "{") depth += 1;
    else if (s[k] === "}") {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return null;
}

/** 한 덩어리를 값으로 — 못 읽으면 null. `\frac` 안쪽을 다시 읽는 데도 쓴다. */
function evaluate(src: string): R | null {
  const toks = tokenize(src);
  return toks ? parse(toks) : null;
}

/** 못 읽는 꼴이면 null — 「통과」가 아니라 «안 잼»이다. */
function tokenize(src: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  const s = src;
  while (i < s.length) {
    const rest = s.slice(i);
    if (rest.startsWith("\\times")) {
      out.push({ t: "op", v: "*" });
      i += 6;
      continue;
    }
    if (rest.startsWith("\\div")) {
      out.push({ t: "op", v: "/" });
      i += 4;
      continue;
    }
    if (rest.startsWith("\\cdot")) {
      out.push({ t: "op", v: "*" });
      i += 5;
      continue;
    }
    if (s[i] === "+") {
      out.push({ t: "op", v: "+" });
      i += 1;
      continue;
    }
    if (s[i] === "-") {
      out.push({ t: "op", v: "-" });
      i += 1;
      continue;
    }
    if (s[i] === "(") {
      out.push({ t: "(" });
      i += 1;
      continue;
    }
    if (s[i] === ")") {
      out.push({ t: ")" });
      i += 1;
      continue;
    }
    // 대분수 `2\frac{1}{5}` · 진분수 `\frac{1}{5}` · **분자·분모가 식인 것** `\frac{3}{4\times5}`
    // ⚠️ 중괄호 안을 「숫자만」으로 읽으면 약분 해설(`\frac{6}{2\times9}=\frac{1}{3}`)이 통째로
    //    «못 읽음»이 된다 — 실측 초6 750자리. 거기가 바로 결함이 숨기 좋은 자리다.
    const head = rest.match(/^(\d+(?:\.\d+)?)?\\frac\{/);
    if (head) {
      const w = head[1] ? dec(head[1]) : rat(0, 1);
      const numOpen = i + head[0].length - 1;
      const numClose = matchBrace(s, numOpen);
      if (numClose === null || s[numClose + 1] !== "{") return null;
      const denClose = matchBrace(s, numClose + 1);
      if (denClose === null) return null;
      const nv = evaluate(s.slice(numOpen + 1, numClose));
      const dv = evaluate(s.slice(numClose + 2, denClose));
      if (nv === null || dv === null || dv.n === 0) return null;
      const f = div(nv, dv);
      if (!sane(f)) return null;
      out.push({ t: "num", v: add(w, f) });
      i = denClose + 1;
      continue;
    }
    const num = rest.match(/^\d+(?:\.\d+)?/);
    if (num) {
      out.push({ t: "num", v: dec(num[0]) });
      i += num[0].length;
      continue;
    }
    return null; // 변수·□·명령어 — 판정하지 않는다
  }
  return out.length > 0 ? out : null;
}

/** `1.25` → 125/100. **부동소수점을 안 거친다** — 소수 단원에서 이게 핵심이다. */
function dec(text: string): R {
  const [a, b = ""] = text.split(".");
  return rat(Number(`${a}${b}`), 10 ** b.length);
}

/** 재귀 하강 — `×÷` 가 `+-` 보다 먼저 묶인다. 못 읽으면 null. */
function parse(toks: Tok[]): R | null {
  let p = 0;
  const peek = () => toks[p];
  function factor(): R | null {
    const t = peek();
    if (!t) return null;
    if (t.t === "num") {
      p += 1;
      return t.v;
    }
    if (t.t === "(") {
      p += 1;
      const v = expr();
      const close = peek();
      if (v === null || !close || close.t !== ")") return null;
      p += 1;
      return v;
    }
    if (t.t === "op" && t.v === "-") {
      // 앞에 붙은 음수
      p += 1;
      const v = factor();
      return v === null ? null : sub(rat(0, 1), v);
    }
    return null;
  }
  function term(): R | null {
    let v = factor();
    if (v === null) return null;
    for (;;) {
      const t = peek();
      if (!t || t.t !== "op" || (t.v !== "*" && t.v !== "/")) return v;
      p += 1;
      const r = factor();
      if (r === null) return null;
      if (t.v === "/" && r.n === 0) return null;
      v = t.v === "*" ? mul(v, r) : div(v, r);
      if (!sane(v)) return null;
    }
  }
  function expr(): R | null {
    let v = term();
    if (v === null) return null;
    for (;;) {
      const t = peek();
      if (!t || t.t !== "op" || (t.v !== "+" && t.v !== "-")) return v;
      p += 1;
      const r = term();
      if (r === null) return null;
      v = t.v === "+" ? add(v, r) : sub(v, r);
      if (!sane(v)) return null;
    }
  }
  const v = expr();
  return v !== null && p === toks.length ? v : null;
}

/**
 * 한 변에 실린 단위 **종류**(개수가 아니다). `12\,cm+3\,cm` 은 `cm` 하나로 센다 —
 * 개수로 세면 「$12\,cm+3\,cm=15\,cm$」가 «단위가 다르다»로 잘못 걸린다(자체 눈금이 잡았다).
 */
function unitsOf(side: string): string {
  return [
    ...new Set(
      [...side.matchAll(/\\mathrm\{([a-zA-Z]+)\}/g)].map((m) => m[1]!),
    ),
  ]
    .sort()
    .join(",");
}

/**
 * 판정 하나 — `null` 은 «안 잼», `true/false` 는 성립/불성립.
 *
 * ⚠️ **단위가 다르면 판정하지 않는다.** `100\,\mathrm{cm}=1\,\mathrm{m}` 은 **참인 환산식**
 * 인데 단위를 지우고 수만 보면 `100=1` 이라 거짓이 된다. 2026-08-23 첫 판이 초5 1-6-3 ·
 * 초6 1-6-3 에서 이런 거짓 경보를 **1,008자리** 냈다. 거짓 경보는 정확도 문제가 아니라
 * **가드 생존** 문제다 — 늘 울면 다음 사람이 이 도구를 꺼 버린다.
 */
export function checkEquation(body: string): boolean | null {
  const spaced = body
    .replace(/\\,|\\;|\\!|\\ |\s/g, "")
    .replace(/\\left|\\right/g, "");
  if (!spaced.includes("=")) return null;
  const rawSides = spaced.split("=");
  if (rawSides.length < 2) return null;
  // 환산식은 이 도구가 재는 것이 아니다(단위 사이의 관계를 모른다).
  const us = rawSides.map(unitsOf);
  if (us.some((u) => u !== us[0])) return null;
  const clean = spaced.replace(/\\mathrm\{[a-zA-Z]*\}/g, "");
  const sides = clean.split("=");
  if (sides.length < 2) return null;
  const vals: R[] = [];
  for (const side of sides) {
    const toks = tokenize(side);
    if (!toks) return null;
    const v = parse(toks);
    if (v === null || !sane(v)) return null;
    vals.push(v);
  }
  lastValues = vals.map(show);
  return vals.every((v) => same(vals[0]!, v));
}

/**
 * 직전 판정에서 각 변이 실제로 얼마였는가 — **보고에만** 쓴다.
 * 「$17\div6=2$」만 찍으면 다음 사람이 다시 계산해야 한다. 「17/6 ≠ 2」까지 찍어 준다.
 */
let lastValues: string[] = [];
export const valuesOfLastCheck = (): string[] => lastValues;

/* ─────────────────────────── 자체 눈금 ─────────────────────────── */

/** 양성(걸려야)·음성(통과해야)·경계(«안 잼») 셋을 다 댄다. */
const GAUGE: [string, string, boolean | null][] = [
  ["맞는 정수 등식", "3+4=7", true],
  ["틀린 정수 등식 — 걸려야", "2+2=5", false],
  ["곱이 합보다 먼저 묶인다", "2+3\\times4=14", true],
  ["묶는 차례를 틀리면 — 걸려야", "2+3\\times4=20", false],
  ["괄호", "(43-6)\\times4+21\\div3=155", true],
  ["동분모 합", "\\frac{1}{3}+\\frac{2}{3}=1", true],
  ["이분모 합", "\\frac{1}{2}+\\frac{1}{3}=\\frac{5}{6}", true],
  ["이분모 합 오답 — 걸려야", "\\frac{1}{2}+\\frac{1}{3}=\\frac{2}{5}", false],
  ["대분수 = 가분수", "2\\frac{1}{5}=\\frac{11}{5}", true],
  // 약분 해설 — 분모가 **식**이다. 「숫자만」으로 읽던 첫 판은 이걸 통째로 못 봤다.
  ["분모가 식인 분수", "\\frac{6}{2\\times9}=\\frac{1}{3}", true],
  ["분모가 식인데 틀리면 — 걸려야", "\\frac{6}{2\\times9}=\\frac{1}{2}", false],
  ["분자도 식", "\\frac{2\\times3}{4}=1\\frac{1}{2}", true],
  ["대분수 뺄셈", "3\\frac{1}{5}-1\\frac{3}{5}=1\\frac{3}{5}", true],
  // 부동소수점이면 여기가 거짓이 된다 — 유리수로 재는 이유다.
  ["소수 합 (부동소수점이면 틀린다)", "0.1+0.2=0.3", true],
  ["소수 나눗셈", "8.55\\div5.7=1.5", true],
  ["소수 나눗셈 오답 — 걸려야", "8.55\\div5.7=1.6", false],
  ["세 변 등식", "1=\\frac{5}{5}=\\frac{10}{10}", true],
  ["세 변 중 하나가 틀리면 — 걸려야", "1=\\frac{5}{5}=\\frac{9}{10}", false],
  // 경계 — «통과»가 아니라 «안 잼»이다. 이 줄이 없으면 다음 사람이 「□ 도 검사된다」고 읽는다.
  ["□ 는 판정하지 않는다 (경계)", "5+\\square=12", null],
  ["변수는 판정하지 않는다 (경계)", "x+1=3", null],
  ["등호가 없으면 판정하지 않는다 (경계)", "3+4", null],
  [
    "같은 단위끼리면 값을 잰다",
    "12\\,\\mathrm{cm}+3\\,\\mathrm{cm}=15\\,\\mathrm{cm}",
    true,
  ],
  [
    "같은 단위인데 틀리면 — 걸려야",
    "12\\,\\mathrm{cm}+3\\,\\mathrm{cm}=16\\,\\mathrm{cm}",
    false,
  ],
  // 환산식 — 참인데 수만 보면 거짓이다. 이 줄이 없으면 초5·초6 넓이 단원이 통째로 빨개진다.
  [
    "단위가 다르면 판정하지 않는다 (경계)",
    "100\\,\\mathrm{cm}=1\\,\\mathrm{m}",
    null,
  ],
  ["단위가 다르면 — 한쪽만 있어도 (경계)", "1\\,\\mathrm{km}=1000", null],
];

function selftest(): number {
  let bad = 0;
  for (const [name, body, want] of GAUGE) {
    const got = checkEquation(body);
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? "✅" : "❌"} ${name} — 기대 ${String(want)} / 실제 ${String(got)}`,
    );
  }
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (양성 ${GAUGE.filter((g) => g[2] === false).length} · 음성 ${GAUGE.filter((g) => g[2] === true).length} · 경계 ${GAUGE.filter((g) => g[2] === null).length})`
      : `\n❌ 눈금 ${bad}건 틀렸다 — **이 도구를 믿지 마라**`,
  );
  return bad;
}

/* ─────────────────────────── 쓸기 ─────────────────────────── */

if (process.argv.includes("--selftest")) {
  process.exitCode = selftest() === 0 ? 0 : 1;
} else {
  const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
  const seedCount = Number(
    process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 300,
  );

  if (selftest() !== 0) process.exit(1);
  console.log("");

  // 재는 동안 생성기가 쓰이면 이 수치는 못 쓴다. 범위는 **읽는 범위**와 같게 —
  // `초3` 만 재면서 g4 저장에 멈추면 다음 사람이 울타리를 끈다(거짓 경보는 가드를 끈다).
  const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
  /** 갈래를 따로 센다 — 소단원·문항만 찍으면 D-72 축이 통째로 빠져도 안 보인다. */
  const tally = new SweepTally();

  const units = elementaryUnits().filter(
    (u) => !gradeArg || u.grade === gradeArg,
  );
  type Hit = { where: string; body: string; seeds: number[] };
  const hits = new Map<string, Hit>();
  let checked = 0;
  let skipped = 0;
  let noEquals = 0;
  let problems = 0;
  let truthProblems = 0;
  /** 못 읽은 꼴을 수만 가려 모은다 — 「안 잼」이 파서 실패를 덮지 않게. */
  const unread = new Map<string, number>();

  /**
   * **「이 식이 옳은가?」 문항은 일부러 틀린 등식을 싣는다.** 초4 1-6-5(등호를 사용하여
   * 나타내기)가 그렇고, 답이 「아니요」인 것이 정답이다. 그런 문항의 등식을 재면 **문항이
   * 옳을수록 이 도구가 빨개진다** — 2026-08-23 첫 판이 실제로 그랬다(85가지).
   * 그래서 그 문항은 통째로 빼고, **몇 건을 뺐는지 반드시 찍는다**(조용히 빼면 다음 사람이
   * 「전부 쟀다」로 읽는다).
   */
  const asksTruth = (content: string, answer: string) =>
    /옳은가|옳지 않|옳으면|맞는 식인가/.test(content) ||
    /^(예|아니요)$/.test(answer.trim());

  for (const unit of units) {
    const tiers: (ElemTier | undefined)[] =
      supportedTiers(unit).length > 0
        ? [undefined, ...ELEM_TIERS]
        : [undefined];
    for (const tier of tiers) {
      const where = `${unit.grade} ${unit.section}${tier ? ` «${tier}»` : ""}`;
      tally.count(unit.grade, unit.section, tier, seedCount);
      for (let seed = 0; seed < seedCount; seed += 1) {
        const p = generateElementaryProblem(unit, seed, tier);
        problems += 1;
        if (asksTruth(p.content, p.answer)) {
          truthProblems += 1;
          continue;
        }
        const all = `${p.content}\n${p.answer}\n${p.solution ?? ""}`;
        for (const m of all.matchAll(/\$([^$]*)\$/g)) {
          // 등호가 없는 덩어리는 애초에 대상이 아니다 — 「못 읽었다」와 갈라 세어야
          // 파서가 망가진 날 «검산 수가 줄고 못 읽음이 늘어난» 것이 보인다.
          if (!m[1]!.includes("=")) {
            noEquals += 1;
            continue;
          }
          const verdict = checkEquation(m[1]!);
          if (verdict === null) {
            skipped += 1;
            // 「못 읽음」 안에 **파서 실패**가 숨을 수 있다 — `--skipped` 로 눈으로 훑는다.
            const k = m[1]!.replace(/\d+/g, "N");
            unread.set(k, (unread.get(k) ?? 0) + 1);
            continue;
          }
          checked += 1;
          if (verdict) continue;
          const key = `${where}|${m[0]}`;
          const hit = hits.get(key);
          if (hit) hit.seeds.push(seed);
          else
            hits.set(key, {
              where,
              body: `${m[0]}   →   ${valuesOfLastCheck().join(" ≠ ")}`,
              seeds: [seed],
            });
        }
      }
    }
  }

  const rows = [...hits.values()].sort(
    (a, b) => b.seeds.length - a.seeds.length,
  );
  const total = rows.reduce((s, r) => s + r.seeds.length, 0);
  // **찍기 전에** 닫는다 — 뒤에 닫으면 못 쓸 수치를 이미 내보낸 뒤다.
  tally.assertNonEmpty();
  fence.close();
  console.log(
    `훑은 것 — ${tally.line()} · ${fence.scopeLine()}\n` +
      `소단원 ${units.length}${gradeArg ? ` (${gradeArg})` : ""} · 씨앗 0~${seedCount - 1} · 문항 ${problems}건\n` +
      `등식 **검산 ${checked}개** · 등호 있는데 **못 읽음 ${skipped}개**(변수·□·단위 환산) · ` +
      `등호 없는 덩어리 ${noEquals}개\n` +
      `「이 식이 옳은가」 문항 ${truthProblems}건은 통째로 뺐다 — 일부러 틀린 등식을 싣는 갈래다\n`,
  );
  if (process.argv.includes("--skipped")) {
    console.log("못 읽은 꼴 (수는 N 으로 가림) — 빈도순 20:");
    for (const [k, c] of [...unread.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20))
      console.log(`  ${String(c).padStart(6)}  ${k}`);
    console.log("");
  }
  if (rows.length === 0) {
    console.log("✅ 안 맞는 등식 0");
  } else {
    console.log(`❌ 안 맞는 등식 ${total}자리 · ${rows.length}가지`);
    for (const r of rows.slice(0, 30)) {
      console.log(
        `  · ${r.where}\n      ${r.body}\n      씨앗 ${r.seeds.length}개 예: ${r.seeds.slice(0, 5).join(", ")}`,
      );
    }
    if (rows.length > 30)
      console.log(
        `  … 그 밖 ${rows.length - 30}가지 (전부 보려면 학년을 좁혀라)`,
      );
  }
  process.exitCode = rows.length === 0 ? 0 : 1;
}
