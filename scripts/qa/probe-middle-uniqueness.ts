/**
 * 🟢 판정기 — **「답이 하나로 정해지는가」**. 「답이 맞는가」와 다른 물음이다.
 *
 * ## 왜 이 축이 따로 필요한가
 *
 * 2026-08-24 미분류 133건을 눈으로 읽다가 `3-1|이차함수의 그래프 ⑵|11` 에서 이런 문항을 봤다:
 *
 * > 축의 방정식이 $x=-1$ 이고 두 점 $(-4, 17)$, $(2, 17)$ 을 지나는 포물선 …
 *
 * 두 점이 **축에 대칭**이라 대입한 두 식이 $9a+q=17$ 로 **똑같아진다.** $a$ 는 아무 값이나
 * 되고($q=17-9a$), 적힌 답 $y=x^2+2x+9$ 는 그중 하나일 뿐이다. $y=2(x+1)^2-1$ 도 두 점을
 * 지난다. **답이 여럿인 문항이 지면에 나간다.**
 *
 * 그런데 **값 검사는 이것을 구조적으로 못 잡는다** — 적힌 답도 조건을 만족하기 때문이다.
 * 「하나가 맞나」로는 「하나로 정해지나」를 못 센다(2026-08-24 교훈, 중3 다항식 「공통인 인수」와
 * 같은 자리다). 그래서 **조건이 미지수를 실제로 묶는가**를 따로 묻는다.
 *
 * ## 어떻게 재나
 *
 * 이 유형은 미지수가 둘($a$, $q$)이고 조건이 둘(두 점)이다. 두 조건이 **같은 식**이면
 * 계수행렬의 계수가 1이라 해가 무수히 많다. 풀이가 그 두 식을 글자 그대로 찍으므로
 * 지면에서 바로 읽어 낼 수 있다 — 계수 산술을 옮겨 적지 않는다.
 *
 * ⚠️ 눈금: **양성**(대칭인 두 점)과 **음성**(대칭이 아닌 두 점)을 둘 다 지어 대 본다.
 *    양성만 대면 「걸리는가」만 재고 「멀쩡한 것을 걸지는 않는가」는 구조적으로 0이 된다.
 *
 *   npx tsx scripts/qa/probe-middle-uniqueness.ts
 *   npx tsx scripts/qa/probe-middle-uniqueness.ts --seeds 2000
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";

/** 「대입하면 A, B이다」에서 A·B 를 뽑는다. 둘이 같으면 조건이 하나뿐이다. */
export function substitutedEquations(
  solution: string,
): [string, string] | null {
  const m = /대입하면 (\$[^$]+\$), (\$[^$]+\$)이다/.exec(solution);
  return m ? [m[1]!, m[2]!] : null;
}

/** 조건 둘이 같은 식이면 미지수가 안 묶인다 — 답이 하나로 안 정해진다. */
export function isUnderdetermined(solution: string): boolean {
  const eqs = substitutedEquations(solution);
  return eqs !== null && eqs[0] === eqs[1];
}

const TYPES = ["3-1|이차함수의 그래프 ⑵|11"] as const;

function calibrate(): boolean {
  // 양성 — 두 조건이 같은 식 (축에 대칭인 두 점)
  const positive = "두 점의 좌표를 대입하면 $9a+q=17$, $9a+q=17$이다.";
  // 음성 — 두 조건이 다른 식
  const negative = "두 점의 좌표를 대입하면 $a+q=7$, $9a+q=15$이다.";
  // 음성 — 아예 이 문형이 아닌 풀이
  const other = "좌변을 인수분해하면 $(x-1)(x-2)=0$이다.";
  const ok =
    isUnderdetermined(positive) &&
    !isUnderdetermined(negative) &&
    !isUnderdetermined(other);
  console.log(
    ok
      ? "눈금 — 양성 1/1 잡음 · 음성 2/2 안 걸림"
      : "🔴 눈금이 안 맞는다 — 판정을 믿을 수 없다",
  );
  return ok;
}

function main() {
  if (!calibrate()) {
    process.exitCode = 1;
    return;
  }
  const i = process.argv.indexOf("--seeds");
  const seeds = i >= 0 ? Number(process.argv[i + 1]) : 400;

  let total = 0;
  let bad = 0;
  for (const key of TYPES) {
    const examples: string[] = [];
    let hit = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const p = generateMiddleProblem(key, seed);
      total += 1;
      if (isUnderdetermined(p.solution)) {
        hit += 1;
        bad += 1;
        if (examples.length < 3) examples.push(p.content.replace(/\n/g, " "));
      }
    }
    console.log(
      `${key} — 씨앗 ${seeds}개 중 답이 하나로 안 정해지는 것 ${hit}건 (${((hit / seeds) * 100).toFixed(1)}%)`,
    );
    for (const e of examples) console.log("   " + e.slice(0, 170));
  }

  console.log(
    bad === 0
      ? `\n✅ 깨끗하다 (표본 ${total})`
      : `\n🔴 ${bad}건 — 값 검사는 이것을 통과시킨다. 적힌 답도 조건을 만족하기 때문이다.`,
  );
  process.exitCode = bad === 0 ? 0 : 1;
}

main();
