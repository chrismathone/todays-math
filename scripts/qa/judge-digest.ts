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
import { MUL_DIV_JUDGES } from "../../src/lib/middle/judge/mulDiv";
import {
  assembleCompare,
  assembleJudge,
  generateJudgeProblem,
  judgementDefinitions,
} from "../../src/lib/middle/judge/registry";

const SEEDS = [20261008, 1, 7777, 424242, 99991, 31337, 5, 909090, 271828, 4];

const parts: string[] = [];
for (const d of judgementDefinitions()) {
  for (const seed of SEEDS) {
    for (let v = 0; v < 4; v += 1) {
      try {
        const p = generateJudgeProblem(d.key, seed, v);
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
    return `STOP:${/묶음이 [\d+]+|동점|다시 재니|다시 재지 못했다|해설에 적을 값/.exec(m)?.[0] ?? m.slice(0, 40)}`;
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

if (process.argv.includes("--probes"))
  for (const p of parts)
    if (p.startsWith("probe")) console.log(p.split("␟").join(" | "));
console.log(createHash("sha256").update(parts.join("\n")).digest("hex"));
