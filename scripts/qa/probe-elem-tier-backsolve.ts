/**
 * **되짚기 축의 반증문 ④·⑥ 을 기계로 잰다** (D-113 확정 잣대, 2026-08-30).
 *
 *     npx tsx scripts/qa/probe-elem-tier-backsolve.ts 초5
 *     npx tsx scripts/qa/probe-elem-tier-backsolve.ts 초5 2-4
 *     npx tsx scripts/qa/probe-elem-tier-backsolve.ts --selftest
 *
 * ## 무엇을 재나
 *
 * ⑥ **「발문이 준 수에 그 소단원 연산을 순방향으로만 적용해 답이 나오면 중·상이 아니다」**
 *    — **규칙은 `src/lib/elementary/forwardReach.ts` 한 곳**에 있고 생성기도 같은 것을
 *    쓴다. 다른 것은 **입력**이다 — 생성기는 지면에 나갈 수를 «예측»하고, 이 자는
 *    **찍힌 지면을 읽는다.** 둘이 갈리면 이 자가 옳다(실제로 14건이 그렇게 걸렸다).
 *
 * ④ **뒤집힘 필터** — 같은 소단원의 **연산·기본·응용**에 같은 자를 댄다. 그것들이
 *    순방향으로 **안 닿으면** 이미 되짚기를 요구한다는 뜻이고, 그러면 이 축은 그
 *    소단원에서 난이도를 **안 가른다**. 그 소단원은 **비워야 한다.**
 *
 * ## 🔴 이 자가 **못 보는 것** — 여기 안 적으면 「검사됐다」로 읽힌다
 *
 * · **「되짚기가 필요한가」를 못 잰다.** 재는 것은 «순방향으로도 되나» 하나뿐이다.
 *   닿으면 확실히 아니지만, **안 닿는다고 되짚기인 것은 아니다**(단위 환산·도형
 *   공식처럼 다른 이유로 안 닿는 문항이 있다). 그건 사람이 본다.
 * · **마디가 «굳는가»를 못 잰다.** 심화하와 심화중을 가르는 것이 그것인데, 이 자는
 *   둘을 구분하지 못한다. 사다리의 **바닥**만 지킨다.
 * · **해설을 안 본다.** 리드가 짚은 초3 2-1-4 처럼 «생성기는 전수, 해설은 한 줄»인
 *   부류는 지면의 수만 봐서는 안 걸린다.
 * · 🔴 **나눗셈·덧뺄셈 한 걸음을 못 본다.** `forwardReachable` 의 허용 꼴이 전부 곱을
 *   물어(`forwardReach.ts` 머리말), `a\div b \pm c` 나 `a \pm b` 로만 닿는 답에는
 *   **«예»를 낼 수 없다.** 그래서 순수 덧뺄셈·둘레·도형 소단원에서 「⑥ 0건」은
 *   «깨끗»이 아니라 **«못 셈»**이다. 2026-08-31 적대 검토가 그 자리에서 초4
 *   `2-4-3 심화중`(답이 지면 두 수의 차, 2,400/2,400)을 찾았는데 **이 자는 안 울었다.**
 *   그 부류는 `pmOneStepReachable` 로 따로 세거나 **사람이 손으로 대야 한다.**
 *
 * ## ⚠️ 심화중·심화상 쪽 0 은 **절반이 동어반복**이다
 *
 * `g5.ts` 의 생성기가 같은 성질(순방향 도달)을 **만들 때 이미 걸러 낸다.** 그래서
 * 여기서 0 이 나오는 것은 당연하다 — 그것을 «깨끗하다»로 읽으면 안 된다.
 * 그래도 값이 있는 까닭 둘:
 *   ㉠ 이 자는 **지면의 수 전부**를 본다 — 생성기는 자기가 고른 몇 개만 봤다.
 *      그래서 「조건 문구에 섞인 수까지 넣으면 닿는다」 같은 자리가 여기서 걸린다.
 *   ㉡ **④ 쪽은 동어반복이 아니다** — 연산·기본·응용은 생성기가 그 자로 거른 적이
 *      없다. 이 자의 값어치는 거기에 있다.
 */
import { type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  readRat,
} from "../../src/lib/elementary/forwardReach";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242];

/* ── 쓸기 ────────────────────────────────────────────────────────────────── */

type Row = {
  grade: string;
  code: string;
  tier: ElemTier;
  seed: number;
  reachable: boolean;
};

export function sweep(grade?: string, chapter?: string): Row[] {
  const out: Row[] = [];
  for (const unit of elementaryUnits()) {
    if (grade && unit.grade !== grade) continue;
    const code = unit.section.split(" ")[0]!;
    if (chapter && !code.startsWith(chapter)) continue;
    for (const tier of supportedTiers(unit)) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim());
        if (!ans) continue; // 수 답이 아니면 이 자의 축이 아니다
        out.push({
          grade: unit.grade,
          code,
          tier,
          seed,
          reachable: forwardReachable(pageNumbers(p.content), ans),
        });
      }
    }
  }
  return out;
}

/* ── ④ 의 자격 — **연산 갈래가 양성 대조군이다** ─────────────────────────── */

export type FlatVerdict = {
  key: string;
  /** 연산·기본·응용 중 «안 닿는» 문항 수 — ④ 가 거는 근거. */
  flatN: number;
  /** 훑은 연산 문항 수. 0 이면 이 소단원에는 **대조군 자체가 없다**. */
  yeonsanN: number;
  /** 그중 «닿는» 수. 0 이면 이 자는 여기서 **눈이 멀었다**. */
  yeonsanReach: number;
};

/**
 * **④ 를 낼 자격이 있는 소단원과 «못 재는» 소단원을 가른다** (2026-08-31).
 *
 * ## 왜 연산 갈래가 대조군인가
 *
 * D-113 이 정한 **연산 = 「그 소단원의 연산을 그대로 한 번 하는 자리」**다. 곧 연산
 * 문항은 **정의상 순방향으로 풀린다.** 그런데 이 자가 그것을 「안 닿는다」고 하면,
 * 안 닿는 쪽은 문항이 아니라 **자다.** 그 소단원에서 이 자의 「0」은 «깨끗»이 아니라
 * **«못 셈»**이다 — 이 저장소가 여러 번 적은 그 자리다.
 *
 * ## 🔴 안 갈랐더니 ④ 의 **81%가 거짓**이었다 (2026-08-31 실측)
 *
 * ```
 * ④ 가 걸던 소단원      140
 *    그중 근거가 없는 것 113  (81%)
 *    진짜 후보            27
 * ```
 *
 * 눈먼 뿌리가 넷인데 **넷 다 이 한 대조군에 걸린다**:
 *
 * ```
 * ㉠ 순수 덧뺄셈        `forwardReachable` 은 곱셈이 한 번은 있어야 길이 열린다.
 *                      초3 1-1-1 연산 「$764+135$」 답 $899$ → «안 닿는다».
 * ㉡ 나눗셈            허용 꼴 넷이 전부 `a×b…` 라 **÷ 가 통째로 없다.**
 *                      초3 1-3-1 연산 「$18\div2$」 답 $9$ → «안 닿는다».
 * ㉢ 분수를 못 읽었다   ✅ **2026-08-31 에 고쳤다** — `pageNumbers` 가 `\frac{3}{4}` 를
 *                      [3, 4] 두 낱값으로 읽던 것을 **한 값**으로 바꿨다(대분수 포함).
 * ㉣ 답이 수가 아니었다 ✅ **같이 고쳤다** — `readRat` 이 대분수·단위·조사 꼬리를 읽는다.
 *                      훑은 자리 4,760 → **6,451**(+35.5%).
 * ```
 *
 * 🔴 **㉠·㉡ 은 «못 고치는» 것이 아니라 «고치면 더 나빠지는» 것이다 — 재서 기각했다.**
 *
 * ```
 * 축                 연산     기본     응용    심화하   심화중   심화상   판정
 * 「+− 한 번」       10.3%   12.1%    7.4%    9.6%    4.9%    5.4%   ✗ 안 갈린다
 * 「÷ 를 × 처럼」    28.5%   29.2%   27.4%   31.6%    9.2%   28.0%   ✗ 안 갈린다
 * ```
 *
 * 둘 다 **산술 우연**이 너무 잦다. 넣으면 머리말 ⑴ 의 거짓 경보 46건이 돌아오고,
 * ÷ 는 심화상의 **28%를 거짓으로 문다.** 같은 규칙을 생성기가 쓰므로 이미 착지한
 * 문항까지 흔든다. **그래서 넓히지 않고, 못 재는 자리를 «선언»한다.**
 *
 * ⚠️ **이 대조군은 «필요조건»이지 «충분조건»이 아니다.** 연산이 닿는다고 그 소단원의
 *    위 갈래까지 이 자가 다 본다는 뜻은 아니다 — 살아 있는 길이 하나는 있다는 뜻뿐이다.
 */
export function splitFlatUnits(rows: readonly Row[]): {
  candidates: FlatVerdict[];
  unmeasurable: FlatVerdict[];
} {
  const lower = new Set(["연산", "기본", "응용"]);
  const per = new Map<string, FlatVerdict>();
  for (const r of rows) {
    const key = `${r.grade} ${r.code}`;
    const v = per.get(key) ?? { key, flatN: 0, yeonsanN: 0, yeonsanReach: 0 };
    if (lower.has(r.tier) && !r.reachable) v.flatN += 1;
    if (r.tier === "연산") {
      v.yeonsanN += 1;
      if (r.reachable) v.yeonsanReach += 1;
    }
    per.set(key, v);
  }
  const candidates: FlatVerdict[] = [];
  const unmeasurable: FlatVerdict[] = [];
  for (const v of per.values()) {
    if (v.flatN === 0) continue; // ④ 가 애초에 안 건다
    (v.yeonsanReach > 0 ? candidates : unmeasurable).push(v);
  }
  return { candidates, unmeasurable };
}

/** 「왜 못 재나」를 한 낱말로. */
export const unmeasurableReason = (v: FlatVerdict): string =>
  v.yeonsanN === 0 ? "연산 갈래를 못 훑었다" : `연산 0/${v.yeonsanN}`;

/* ── 눈금 — 이 자가 «아니오»를 낼 수 있나 ────────────────────────────────── */

const R = (s: string) => readRat(s)!;

/** 눈금용 지어낸 행 — 살아 있는 엔진을 안 쓴다. */
const row = (
  grade: string,
  code: string,
  tier: string,
  reachable: boolean,
): Row => ({ grade, code, tier: tier as ElemTier, seed: 0, reachable });

function gauges(): { label: string; ok: () => boolean }[] {
  return [
    {
      label: "양성 — 「계산하시오 $0.9\\times5$」 답 $4.5$ 는 순방향이다",
      ok: () => forwardReachable(pageNumbers("$0.9\\times5$"), R("4.5")),
    },
    {
      label: "양성 — 두 걸음 문장제(곱한 뒤 뺀다)도 순방향이다",
      ok: () => forwardReachable(pageNumbers("$0.3$ $4$ $1.1$"), R("0.1")),
    },
    {
      // 실측으로 놓쳤던 꼴 ⑴ — 「전체의 $0.6$만큼 쓰고 남은 것」은 **같은 수를 다시** 쓴다.
      label: "양성 — 「$4$ 중 전체의 $0.6$만큼 쓰고 남은 것」 = $1.6$",
      ok: () => forwardReachable(pageNumbers("$4$ $0.6$"), R("1.6")),
    },
    {
      // 실측으로 놓쳤던 꼴 ⑵ — 두 곱의 합.
      label: "양성 — 「$2.3$ m 막대 $2$개와 $1.1$ m 막대 $3$개」 = $7.9$",
      ok: () => forwardReachable(pageNumbers("$2.3$ $2$ $1.1$ $3$"), R("7.9")),
    },
    {
      // 거짓 경보의 뿌리 — 「$1$보다 작은」의 `$1$` 로 곱셈을 흉내 내면 안 된다.
      label: "음성 — `$1$` 을 곱해 만든 뺄셈은 «순방향»이 아니다",
      ok: () => !forwardReachable(pageNumbers("$1$ $3.5$ $3$"), R("0.5")),
    },
    {
      label: "음성 — 되짚기 문항은 순방향으로 안 닿는다 (심화중 실물)",
      ok: () => !forwardReachable(pageNumbers("$6$ $0.48$"), R("4.8")),
    },
    {
      label: "음성 — 인수 되짚기도 안 닿는다 (심화상 실물)",
      ok: () => !forwardReachable(pageNumbers("$1.6$ $0.8$ $6$ $9$"), R("0.2")),
    },
    {
      // 🔴 **이름이 거짓이던 눈금** (2026-08-31 정정). 옛 이름은 「답이 발문의 수
      //    그대로면 닿는다」였는데, 그 성질은 `answerPrintedOnPage` 로 갈라 냈다.
      //    이 표본이 초록인 진짜 까닭은 $7\times2-7=7$ 이라 **`a×b−c` 꼴**이라서다.
      //    이름만 보면 「갈라 낸 것이 아직 여기 있다」로 읽힌다 — 아래 음성이 짝이다.
      label: "양성 — `a×b−c` 꼴은 순방향이다",
      ok: () => forwardReachable(pageNumbers("$7$ $2$"), R("7")),
    },
    {
      // 실물: 초3 2-1-1 심화중 「$116$ 에 곱했더니 곱의 일의 자리가 $6$」 답 $6$.
      // 지면의 `$6$` 은 **자릿수 설명**이지 피연산자가 아니다.
      label: "음성 — 답이 지면에 그대로 있는 것만으로는 «순방향»이 아니다",
      ok: () =>
        !forwardReachable(pageNumbers("$116$ $6$"), R("6")) &&
        answerPrintedOnPage(pageNumbers("$116$ $6$"), R("6")),
    },
    {
      label: "지면 읽기 — 식 안의 수도 전부 뽑는다",
      ok: () => pageNumbers("$0.9\\times5=4.5$").length === 3,
    },
    {
      label: "지면 읽기 — KaTeX 밖 숫자는 안 센다 (R1 을 믿는다)",
      ok: () => pageNumbers("보기 3개 중 $2$").length === 1,
    },
    // ── 지면 읽기를 넓힌 자리 (2026-08-31) ─────────────────────────────────
    // 넓히기 전에는 답의 **38.2%** 를 못 읽어 그 행이 아예 안 생겼다.
    // 못 생긴 행은 「깨끗」이 아니라 **없음**이라, 초4 는 62소단원 중 27개만 훑혔다.
    {
      label: "읽기 — `\\frac{3}{4}` 는 **한 값**이다 (두 낱값이 아니다)",
      ok: () => {
        const n = pageNumbers("$\\frac{3}{4}\\times4$");
        return (
          n.length === 2 &&
          n[0]!.n === 3 &&
          n[0]!.d === 4 &&
          forwardReachable(n, R("3"))
        );
      },
    },
    {
      label: "읽기 — 대분수 `1\\frac{1}{12}` 도 한 값이다",
      ok: () => {
        const a = readRat("1\\frac{1}{12}");
        return a?.n === 13 && a.d === 12;
      },
    },
    {
      label:
        "읽기 — 단위·조사 꼬리를 뗀다 (`3000개` · `12\\,\\mathrm{cm}` · `66^\\circ`)",
      ok: () =>
        readRat("3000개")?.n === 3000 &&
        readRat("12\\,\\mathrm{cm}")?.n === 12 &&
        readRat("66^\\circ")?.n === 66,
    },
    {
      // 🔴 음성 대조군 — 넓히기가 **어디서 멈추는지**를 못 박는다.
      //    억지로 첫 수만 떼면 「$3$시간 $20$분」이 $3$ 이 되어 **없는 판정을 지어낸다.**
      label: "읽기 — 수가 둘 이상인 답은 **안 읽는다** (혼합 표기·비·나열)",
      ok: () =>
        readRat("3시간 20분") === null &&
        readRat("2\\,\\mathrm{L}\\ 480\\,\\mathrm{mL}") === null &&
        readRat("3:4") === null &&
        readRat("5,\\ 7") === null &&
        readRat("둔각삼각형") === null,
    },
    // ── ④ 의 자격 (2026-08-31) ────────────────────────────────────────────
    // 🔴 살아 있는 엔진으로 재면 안 된다 — 이 갈라내기가 «세는 능력»을 잃어도
    //    엔진 답은 그대로다(도장). 그래서 **지어낸 표**로 두 쪽을 직접 댄다.
    {
      label: "④ 양성 — 연산이 닿는 소단원은 «진짜 후보»로 남는다",
      ok: () => {
        const s = splitFlatUnits([
          row("초X", "1-1-1", "연산", true),
          row("초X", "1-1-1", "응용", false),
        ]);
        return (
          s.candidates.length === 1 &&
          s.candidates[0]!.key === "초X 1-1-1" &&
          s.unmeasurable.length === 0
        );
      },
    },
    {
      label: "④ 음성 — 연산이 **0%** 면 후보가 아니라 «못 잼»이다",
      ok: () => {
        const s = splitFlatUnits([
          row("초X", "1-1-1", "연산", false),
          row("초X", "1-1-1", "응용", false),
        ]);
        return (
          s.candidates.length === 0 &&
          s.unmeasurable.length === 1 &&
          unmeasurableReason(s.unmeasurable[0]!) === "연산 0/1"
        );
      },
    },
    {
      label: "④ 음성 — 연산 갈래를 **못 훑은** 소단원도 «못 잼»이다",
      ok: () => {
        const s = splitFlatUnits([row("초X", "1-1-1", "응용", false)]);
        return (
          s.candidates.length === 0 &&
          s.unmeasurable.length === 1 &&
          unmeasurableReason(s.unmeasurable[0]!) === "연산 갈래를 못 훑었다"
        );
      },
    },
    {
      label: "④ 분모 — 안 닿는 하위 갈래가 없으면 어느 쪽에도 안 올린다",
      ok: () => {
        const s = splitFlatUnits([
          row("초X", "1-1-1", "연산", true),
          row("초X", "1-1-1", "응용", true),
          row("초X", "1-1-1", "심화중", false),
        ]);
        return s.candidates.length === 0 && s.unmeasurable.length === 0;
      },
    },
    {
      label: "④ 분모 — 심화 갈래는 연산 대조군으로 안 센다",
      ok: () => {
        const s = splitFlatUnits([
          row("초X", "1-1-1", "심화하", true),
          row("초X", "1-1-1", "응용", false),
        ]);
        return s.candidates.length === 0 && s.unmeasurable.length === 1;
      },
    },
  ];
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    let bad = 0;
    for (const g of gauges()) {
      const ok = g.ok();
      if (!ok) bad += 1;
      console.log(`${ok ? "✅" : "❌"} ${g.label}`);
    }
    console.log(`\n눈금 ${gauges().length}건 — 실패 ${bad}건`);
    process.exit(bad === 0 ? 0 : 1);
  }

  const args = process.argv.slice(2);
  const grade = args.find((a) => a.startsWith("초"));
  const chapter = args.find((a) => /^\d+-\d+/.test(a));
  const rows = sweep(grade, chapter);
  if (rows.length === 0) {
    console.log("훑은 문항이 없다 — 범위를 확인하십시오.");
    process.exit(2);
  }

  const byTier = new Map<string, { n: number; reach: number }>();
  for (const r of rows) {
    const t = byTier.get(r.tier) ?? { n: 0, reach: 0 };
    t.n += 1;
    if (r.reachable) t.reach += 1;
    byTier.set(r.tier, t);
  }

  console.log(
    `되짚기 축 반증 ④·⑥ — ${grade ?? "전 학년"}${chapter ? ` ${chapter}` : ""} · 문항 ${rows.length}건 (씨앗 ${SEEDS.length})\n`,
  );
  console.log("  갈래      n     순방향으로 닿는 비율");
  for (const [tier, t] of byTier) {
    console.log(
      `  ${tier.padEnd(6)} ${String(t.n).padStart(5)}     ${((t.reach / t.n) * 100).toFixed(1).padStart(6)}%`,
    );
  }

  // ⑥ — 중·상이 순방향으로 닿으면 그 문항은 그 갈래가 아니다.
  const six = rows.filter(
    (r) => (r.tier === "심화중" || r.tier === "심화상") && r.reachable,
  );
  // ④ — 연산·기본·응용이 **안 닿으면** 그 소단원에서는 이 축이 난이도를 안 가른다.
  //      단 **연산 갈래가 실제로 닿을 때만** 그 말을 할 자격이 있다(`splitFlatUnits`).
  const { candidates, unmeasurable } = splitFlatUnits(rows);

  console.log(
    `\n⑥ 중·상인데 순방향으로 닿는 문항 ${six.length}건 (÷·± 못 셈 — 머리말 참조)` +
      (six.length
        ? `\n   ${[...new Set(six.map((r) => `${r.grade} ${r.code} «${r.tier}»`))].slice(0, 12).join(" · ")}`
        : ""),
  );
  console.log(
    `④ 연산·기본·응용이 이미 순방향으로 **안 닿는** 소단원 ${candidates.length}개` +
      (candidates.length
        ? `\n   ${candidates
            .map((v) => `${v.key}(${v.flatN})`)
            .slice(0, 16)
            .join(" · ")}` +
          `\n   → 이 소단원들에서는 되짚기 축이 난이도를 안 가를 수 있다. **채우기 전에 사람이 본다.**`
        : ""),
  );
  console.log(
    `\n🔴 ④ 를 **못 재는** 소단원 ${unmeasurable.length}개 — 여기의 «안 닿는다»는 근거가 아니다` +
      (unmeasurable.length
        ? `\n   ${unmeasurable
            .map((v) => `${v.key}(${unmeasurableReason(v)})`)
            .slice(0, 16)
            .join(" · ")}` +
          (unmeasurable.length > 16
            ? ` … 외 ${unmeasurable.length - 16}개`
            : "") +
          `\n   연산 갈래는 **정의상 순방향**인데 이 자가 그것도 «안 닿는다»고 한다 —` +
          `\n   안 닿는 쪽은 문항이 아니라 자다. 머리말 §「④ 의 자격」을 읽어라.`
        : ""),
  );
  console.log(
    "\n⚠️ 중·상 쪽 0 은 절반이 동어반복이다(생성기가 같은 성질을 이미 거른다).\n" +
      "   이 자의 값어치는 ④ 쪽에 있다 — 머리말의 «못 보는 것»을 먼저 읽어라.",
  );
  // 🔴 **⑥ 은 세어서 찍되 막지 않는다** (2026-08-31, 리드 정정).
  //
  //    병합 뒤 전 학년에 대니 13건이 걸렸는데 **손으로 풀어 보니 전부 거짓 양성**이었다.
  //    둘로 갈린다:
  //
  //    ㉠ **답이 지면에 그대로 있다**(초3 2-1-1 — 「곱의 일의 자리 숫자가 $6$」, 답 $6$).
  //       그 `$6$` 은 피연산자가 아니라 **자릿수 설명**이다. 연산을 0번 쓰는 것은
  //       「연산을 적용해 답이 나온다」가 아니므로 `forwardReach.ts` 에서 갈라 냈다.
  //       그것으로 초3 3건 → 0건.
  //
  //    ㉡ **「범위 + 배수」 문항은 창의 두 끝이 답을 산술적으로 되뿜는다**(초6 10건).
  //       초6 2-2-1 심화상: 「$1.4$ 로도 $2.1$ 로도 몫이 자연수, $5.3$ 보다 크고
  //       $9.3$ 보다 작은 수」 → 답 $8.4$. 그런데
  //         $2.1\times9.3 - 2.1\times5.3 = 2.1\times(9.3-5.3) = 2.1\times4 = 8.4$
  //       로 «닿는다». 창을 답 둘레에 잡으니 **창 너비 × 나누는 수 = 답**이 되는 것이
  //       구조적이다 — 학생의 풀이 경로가 아니다. 2-2-3 도 $3.3\times(38-28)=33$ 이다.
  //
  //    그래서 이 축은 **아직 막을 만큼 안 여물었다.** 늘 빨간 관문은 꺼지고
  //    (「거짓 경보는 가드를 끈다」, 2026-08-20), 그러면 ④ 까지 같이 안 보인다.
  //    세어 찍는 것은 그대로 두어 다음 사람이 ㉡ 을 갈라 낼 수 있게 남긴다.
  //
  //    ⚠️ **다시 막게 하려면** ㉡ 을 먼저 갈라라 — 「같은 인수를 공유하는 두 곱의 차」
  //    (곧 `a×hi − a×lo`)로 닿는 것은 창이 만든 자국이지 풀이가 아니다.
  process.exitCode = 0;
}

if (isDirectScript(import.meta.url)) main();
