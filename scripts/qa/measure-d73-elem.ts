/**
 * D-73 파급 계량기 (초등) — 「대분수 자동 변환을 **뺀 것**이 우리 지면에서 무엇을 바꾸나」.
 *
 *   npx tsx scripts/qa/measure-d73-elem.ts
 *   npx tsx scripts/qa/measure-d73-elem.ts --grade=초5 --seeds=40
 *
 * ## 왜 갈래 시험이 이걸 구조적으로 못 보나
 *
 * 시험은 `p.content` 를 본다. 그 값은 **전처리 전**이다. D-73 은 **렌더 경로**를
 * 고친 것이라 엔진·DB 값은 한 자도 안 바뀌고 **종이만 바뀐다.** 그래서 관문이
 * 전부 초록인 채로 지면이 달라진다. 따로 잴 수밖에 없다.
 *
 * ## 왜 `census-mixed-number.ts --elem` 로는 못 재나
 *
 * 그 계량기는 「**제품이 무엇을 바꾸나**」를 잰다. 규칙을 없앤 지금은 제품이
 * 아무것도 안 바꾸므로 **구조적으로 0** 이다(D-73 이 그 함정을 이미 적어 뒀다).
 * 0 은 「깨끗」과 「못 셈」을 안 가른다. 그래서 이 자는 **옛 제품과 새 제품을
 * 맞대어** 잰다 — 참이 둘 다 git 에 있고, 어느 쪽도 손으로 옮겨 적지 않는다.
 *
 * ## 「무엇이 대상인가」를 손으로 적지 않는다
 *
 * `fracLatex` 냐 `fmtFrac` 이냐 손 `\frac` 이냐를 목록으로 적으면 목록에 없는
 * 부류가 구조적으로 0이 된다(이 저장소가 여러 번 밟은 자리). 그래서 **어느
 * 함수가 만들었는지 안 묻고**, 실제 산출물을 양쪽에 태워 다른 자리를 센다.
 *
 * ## 분모를 반드시 찍는다
 *
 * 「달라진 자리 N」만 적으면 N=0 이 「깨끗」인지 「못 셈」인지 안 갈린다.
 * **잰 자리**와 **분수를 담은 자리**를 같이 찍고, 스스로를 **일부러 걸리는
 * 입력**으로 먼저 시험한다(그 자기시험이 실패하면 아무것도 안 세고 멈춘다).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { preprocessMathText as NEW } from "../../src/lib/math/textPreprocess";

/** 규칙을 지운 커밋. 그 **부모**가 옛 제품이다. */
const D73_COMMIT = "f797eb60";
const SRC = "src/lib/math/textPreprocess.ts";

const arg = (k: string) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const onlyGrade = arg("grade");
const seedCount = Number(arg("seeds") ?? 40);

/** 옛 전처리를 **git 에서 그대로 꺼내** 쓴다 — 규칙을 옮겨 적지 않는다. */
async function loadOld(): Promise<(s: string) => string> {
  const out = path.join("scripts", "qa", "reports", "d73-old-preprocess.gen.ts");
  mkdirSync(path.dirname(out), { recursive: true });
  const text = execFileSync(
    "git",
    ["show", `${D73_COMMIT}^:${SRC}`],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  writeFileSync(out, text, "utf-8");
  const mod = (await import(path.resolve(out))) as {
    preprocessMathText: (s: string) => string;
  };
  return mod.preprocessMathText;
}

type Row = {
  grade: string; section: string; tier: string; seed: number;
  field: string; old: string; neu: string;
};

const FRACS = (s: string) => (s.match(/\d?frac/g) ?? []).length;

/** 지면이 **어떻게** 달라지나로 가른다 — 어느 함수가 만들었나가 아니라. */
function kindOf(r: Row): string {
  const lost = FRACS(r.neu) - FRACS(r.old); // 옛것이 분수를 접었으면 양수
  if (lost > 0 && /(\d+)\s*=\s*\1(?![\d])/.test(r.old))
    return "B 동어반복 — 옛 지면이 「$N=N$」이 됐다";
  if (lost > 0) return "B' 분수가 정수로 접혔다";
  return "A 가분수 ↔ 대분수 표기";
}

async function main() {
  const OLD = await loadOld();

  // ── 자기시험: 이 자가 **아니오를 낼 수 있는가**. 못 내면 아무것도 안 세고 멈춘다.
  const probe = "$\frac{7}{2}$ 와 $\frac{6}{3}$";
  if (OLD(probe) === NEW(probe)) {
    console.error(
      "❌ 자기시험 실패 — 일부러 걸리는 입력에서 옛것과 새것이 같다.\n" +
        `   probe : ${probe}\n   옛    : ${OLD(probe)}\n   새    : ${NEW(probe)}\n` +
        "   옛 전처리를 못 불러왔거나 규칙이 이미 같다. **0 을 «깨끗»으로 읽지 마라.**",
    );
    process.exit(2);
  }
  console.log(`자기시험 통과 — 옛 «${OLD(probe)}» ≠ 새 «${NEW(probe)}»\n`);

  const seeds = Array.from({ length: seedCount }, (_, i) => i);
  const rows: Row[] = [];
  let items = 0, measured = 0, withFrac = 0;

  for (const unit of elementaryUnits()) {
    if (onlyGrade && unit.grade !== onlyGrade) continue;
    const tiers = supportedTiers(unit);
    const list: (string | undefined)[] = tiers.length ? [...tiers] : [undefined];
    for (const tier of list) {
      for (const seed of seeds) {
        let p;
        try {
          p = generateElementaryProblem(
            unit, seed, tier as (typeof ELEM_TIERS)[number] | undefined,
          );
        } catch {
          continue;
        }
        items += 1;
        for (const [field, raw] of [
          ["발문", p.content], ["정답", p.answer], ["해설", p.solution],
        ] as const) {
          if (typeof raw !== "string" || raw === "") continue;
          measured += 1;
          if (FRACS(raw) > 0) withFrac += 1;
          const a = OLD(raw), b = NEW(raw);
          if (a !== b)
            rows.push({
              grade: unit.grade, section: unit.section ?? "",
              tier: tier ?? "(갈래없음)", seed, field, old: a, neu: b,
            });
        }
      }
    }
  }

  console.log(`문항 ${items} · **잰 자리 ${measured}** · 그중 분수를 담은 자리 ${withFrac}`);
  if (measured === 0) {
    console.error("❌ 분모가 0 이다 — 아무것도 안 쟀다.");
    process.exit(2);
  }
  if (withFrac === 0)
    console.log("⚠️ 분수를 담은 자리가 0 이다 — 0 을 «깨끗»으로 읽지 마라.");
  console.log(`달라지는 자리 **${rows.length}**\n`);

  const tally = (pick: (r: Row) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(pick(r), (m.get(pick(r)) ?? 0) + 1);
    return [...m].sort((x, y) => y[1] - x[1]);
  };

  console.log("── 부류");
  for (const [k, n] of tally(kindOf)) console.log(`  ${String(n).padStart(5)}  ${k}`);
  console.log("\n── 학년");
  for (const [k, n] of tally((r) => r.grade).sort()) console.log(`  ${String(n).padStart(5)}  ${k}`);
  console.log("\n── 칸");
  for (const [k, n] of tally((r) => r.field)) console.log(`  ${String(n).padStart(5)}  ${k}`);
  console.log("\n── 소단원 (많은 순 25)");
  for (const [k, n] of tally((r) => `${r.grade} ${r.section}`).slice(0, 25))
    console.log(`  ${String(n).padStart(5)}  ${k}`);

  console.log("\n── 표본 (부류마다 앞 3건 · 실제 지면 문자열)");
  const shown = new Map<string, number>();
  for (const r of rows) {
    const k = kindOf(r);
    if ((shown.get(k) ?? 0) >= 3) continue;
    shown.set(k, (shown.get(k) ?? 0) + 1);
    console.log(`\n[${k}] ${r.grade} ${r.section} · ${r.tier} · seed=${r.seed} · ${r.field}`);
    console.log(`  옛 : ${r.old.slice(0, 200)}`);
    console.log(`  새 : ${r.neu.slice(0, 200)}`);
  }
}

void main();
