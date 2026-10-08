/**
 * 판정형(`src/lib/middle/judge/`)이 **지금 무엇을 내놓는가**의 지문 한 줄 — 변이 하네스(`mutate-judge.mjs`)가 쓴다.
 *
 * 변이 판정은 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나(2026-08-21 교훈).
 * ⑵ 를 건너뛰면 «뜻이 안 바뀐 변이»를 두고 «가드가 아니다»로 오판해 멀쩡한 가드를 고치러 간다.
 * 생성이 던지면 그것도 «달라진 산출물»이므로 사유를 지문에 적는다.
 *
 * ## 산출물은 둘이다 (2단계 — 2026-10-08)
 *
 *   ⑴ 등록된 판정형이 내는 **문항**(본문 · 정답 · 해설)
 *   ⑵ 등록부 **관문의 판정** — 틀린 산출물(3+2 · 5+0 · 극값 동점 · 거짓 보기를 참으로)을 먹였을 때 멈추는가
 *
 * ⑵ 가 없으면 관문을 푼 변이(«4+1 이 아니어도 낸다»)가 «산출물이 그대로»로 읽힌다 — 살아 있는 생성기는 3+2 를
 * 안 내므로 문항은 한 글자도 안 바뀐다. 관문의 산출물은 «멈춘다 / 낸다»다.
 *
 *   npx tsx scripts/qa/judge-digest.ts
 */
import { createHash } from "node:crypto";

import { createRng } from "../../src/lib/elementary/rng";
import { COMPARE_JUDGES } from "../../src/lib/middle/judge/compare";
import type {
  CompareAsk,
  CompareOption,
} from "../../src/lib/middle/judge/contract";
import {
  HELD_JUDGE_DEFINITIONS,
  JUDGE_DEFINITIONS,
} from "../../src/lib/middle/judge/definitions";
import {
  buildTruthBody,
  CALC_PAPER_STYLE,
} from "../../src/lib/middle/judge/calcJudge";
import {
  mul2Material,
  MUL_DIV_JUDGES,
} from "../../src/lib/middle/judge/mulDiv";
import { fitsPaper } from "../../src/lib/middle/judge/paper";
import {
  assembleCompare,
  assembleJudge,
  createJudgeRegistry,
} from "../../src/lib/middle/judge/registry";
import { fracText } from "../../src/lib/middle/judge/texArith";
import { m1Rational } from "../../src/lib/middle/m1Calc";

const { q } = m1Rational;

const SEEDS = [
  20261008,
  1,
  7777,
  424242,
  99991,
  31337,
  5,
  909090,
  271828,
  4,
  ...Array.from({ length: 50 }, (_, i) => 1000 + i * 7919),
];

const parts: string[] = [];
// 등록 목록 자체도 산출물이다 — 보류한 것을 등록부에 올리는 변이가 지문을 바꾸게.
// 문항은 등록한 것 + 보류한 것(`definitions.ts`)을 한 등록부로 지어 뽑는다 — 보류한 생성기도 변이의 대상이다.
const LIVE = JUDGE_DEFINITIONS.map((d) => d.familyId).join(",");
parts.push(`registered:${LIVE}`);
const registry = createJudgeRegistry([
  ...JUDGE_DEFINITIONS.filter(
    (d) => !HELD_JUDGE_DEFINITIONS.some((h) => h.familyId === d.familyId),
  ),
  ...HELD_JUDGE_DEFINITIONS,
]);
for (const d of registry.definitions()) {
  for (const seed of SEEDS) {
    for (let v = 0; v < 4; v += 1) {
      try {
        const p = registry.generate(d.key, seed, v);
        parts.push([d.key, seed, v, p.content, p.answer, p.solution].join("␟"));
      } catch (err) {
        parts.push([d.key, seed, v, "THROW", (err as Error).message].join("␟"));
      }
    }
  }
}

// ── 관문 탐침 — 틀린 산출물을 먹여 «멈춘다 / 낸다»를 적는다 ──────────────────────────

/** 멈추면 사유의 머리(문항마다 다른 수는 빼고), 내면 `PASS`. */
function outcome(run: () => unknown): string {
  try {
    run();
    return "PASS";
  } catch (err) {
    const m = (err as Error).message;
    return `STOP:${/묶음이 [\d+]+|동점|다시 재니|다시 재지 못했다|해설에 적을 값|칸에서 접힌다|폭을 못 쟀다/.exec(m)?.[0] ?? m.slice(0, 40)}`;
  }
}
const math = (text: string) => text.trim().replace(/^\$|\$$/g, "");
/** 값이 같은 **다른 식** — 뒤에 $\times 1$ 을 붙인다(등록부의 읽개가 읽는 꼴). */
const twin = (text: string) => `$${math(text)}\\times 1$`;

for (const def of COMPARE_JUDGES) {
  for (const seed of SEEDS.slice(0, 4)) {
    def.asks.forEach((ask: CompareAsk, k) => {
      let body;
      try {
        body = def.generate(createRng(seed + k), ask);
      } catch (err) {
        parts.push(
          [
            "probe",
            def.familyId,
            seed,
            ask,
            "GEN-THROW",
            (err as Error).message,
          ].join("␟"),
        );
        return;
      }
      const swap = (at: number, from: CompareOption, claim: boolean) =>
        body.options.map((o, i) =>
          i !== at
            ? o
            : claim
              ? {
                  ...o,
                  text: twin(from.text),
                  claimed: from.claimed,
                  brief: from.brief,
                }
              : { ...o, text: twin(from.text) },
        );
      const feed = (options: readonly CompareOption[]) =>
        outcome(() =>
          assembleCompare(def, ask, { ...body, options }, createRng(seed)),
        );
      if (ask === "나머지 넷과 다른 하나") {
        // 첫째가 «다른 하나»다. 3+2: 둘째를 다른 하나의 값으로 · 5+0: 첫째를 공통값으로.
        const odd = body.options[0]!;
        const same = body.options[1]!;
        parts.push(
          [
            "probe",
            def.familyId,
            seed,
            "3+2 주장",
            feed(swap(1, odd, true)),
          ].join("␟"),
          [
            "probe",
            def.familyId,
            seed,
            "3+2 지면만",
            feed(swap(1, odd, false)),
          ].join("␟"),
          ["probe", def.familyId, seed, "5+0", feed(swap(0, same, true))].join(
            "␟",
          ),
        );
      } else {
        // 동점: 둘째를 첫째의 값으로(극값이든 아니든 다섯 값은 서로 달라야 한다).
        const first = body.options[0]!;
        parts.push(
          [
            "probe",
            def.familyId,
            seed,
            `${ask} 동점 주장`,
            feed(swap(1, first, true)),
          ].join("␟"),
          [
            "probe",
            def.familyId,
            seed,
            `${ask} 동점 지면만`,
            feed(swap(1, first, false)),
          ].join("␟"),
        );
      }
    });
  }
}

for (const def of MUL_DIV_JUDGES) {
  for (const seed of SEEDS.slice(0, 4)) {
    for (const ask of def.asks) {
      try {
        const body = def.generate(createRng(seed), ask);
        // 거짓 보기를 참으로 — 틀린 보기의 오른쪽에 참값(해설 첫 줄의 값)을 찍는다. 주장은 그대로 «거짓».
        const wrong = body.options.findIndex((o) => !o.claimedTrue);
        const options = body.options.map((o, i) =>
          i === wrong
            ? { ...o, text: o.text.replace(/=[^=]+\$$/, `=${math(o.brief)}$`) }
            : o,
        );
        parts.push(
          [
            "probe",
            def.familyId,
            seed,
            `${ask} 거짓→참`,
            outcome(() =>
              assembleJudge(def, ask, { ...body, options }, createRng(seed)),
            ),
          ].join("␟"),
        );
      } catch (err) {
        parts.push(
          [
            "probe",
            def.familyId,
            seed,
            ask,
            "GEN-THROW",
            (err as Error).message,
          ].join("␟"),
        );
      }
    }
  }
}

// ── 지면 관문 탐침 — 제품이 2열로 보내는데 2열 칸보다 넓은 식 ─────────────────────────

/** 두 분수의 곱 다섯 — 값이 서로 다르다. `wide` 면 다섯째의 분자 · 분모가 두 자리 수다(2열 칸보다 넓다). */
const productTexts = (wide: boolean) =>
  [
    ["1}{2", "3}{4"],
    ["2}{3", "5}{4"],
    ["3}{5", "7}{2"],
    ["5}{6", "9}{4"],
    wide ? ["11}{4", "13}{12"] : ["7}{8", "3}{2"],
  ].map(
    ([a, b]) =>
      `$\\left(-\\dfrac{${a}}\\right)\\times\\left(+\\dfrac{${b}}\\right)$`,
  );
const maxMul = COMPARE_JUDGES.find((d) => d.familyId === "max-mul2");
if (maxMul)
  for (const wide of [false, true]) {
    const texts = productTexts(wide);
    parts.push(
      [
        "probe",
        "paper",
        wide ? "2열 칸보다 넓은 식" : "2열 칸에 들어가는 식",
        outcome(() => {
          const options = texts.map((text) => {
            const v = maxMul.readValue(text, { lead: "" });
            if (v === null) throw new Error("탐침의 식을 못 읽었다");
            const value = `$${fracText(v).replace(/^(-?)(\d+)\/(\d+)$/, "$1\\dfrac{$2}{$3}")}$`;
            return { text, claimed: v, brief: value, work: value };
          });
          return assembleCompare(
            maxMul,
            "가장 큰 것",
            {
              lead: "다음 중 계산 결과가 가장 큰 것은?",
              briefLead: "계산하면",
              options,
              facts: {},
            },
            createRng(1),
          );
        }),
      ].join("␟"),
    );
  }

/**
 * 계산 판정의 «접히는 묶음은 버리고 다시 모은다» — 살아 있는 재료에서는 드물어(곱셈 · 나눗셈 1% 아래) 문항 지문만으로는
 * 이 가드를 끈 변이가 안 보인다. 앞의 여덟은 제품이 2열로 보내는 좁은 수(다섯이 차면 접히는 묶음이다), 그 뒤는
 * 1열로 가는 수다 — 가드가 살아 있으면 첫 묶음을 버리고 열 번째 재료에서 «들어가는 묶음»이 찬다.
 */
{
  let i = 0;
  const body = buildTruthBody(
    createRng(1),
    "옳지 않은 것",
    () => {
      const k = i;
      i += 1;
      return k < 8
        ? mul2Material(q(-1, 2), q(-(10 * k + 3), 4))
        : mul2Material(q(11, 2), q(-(2 * (k - 8) + 3), 4));
    },
    CALC_PAPER_STYLE,
  );
  parts.push(
    [
      "probe",
      "paper",
      "접히는 묶음을 버린다",
      body.facts.draws,
      fitsPaper(body.options.map((o) => o.text)) ? "FITS" : "FOLDS",
    ].join("␟"),
  );
}

if (process.argv.includes("--probes"))
  for (const p of parts)
    if (p.startsWith("probe")) console.log(p.split("␟").join(" | "));
console.log(createHash("sha256").update(parts.join("\n")).digest("hex"));
