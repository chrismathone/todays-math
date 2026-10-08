/**
 * 「모두 고르시오」 규칙의 **산출물 지문** — 변이 하네스가 「뜻이 바뀌었나」를 묻는 자리.
 *
 *   npx tsx scripts/qa/probe-choose-all.ts
 *   npx tsx scripts/qa/probe-choose-all.ts --verbose   # 무엇을 쟀는지 눈으로
 *
 * 변이 판정은 **3단**이다(CLAUDE.md 2026-08-21):
 *   ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나.
 * ⑵ 를 건너뛰면 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다»로 찍혀
 * **멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.
 *
 * 지문에 무엇을 넣나:
 *   ㉠ **규칙 말뭉치** — 손으로 적은 발문·정답 열두 벌에 규칙 넷을 대어 답을 그대로
 *   ㉡ 「모두 고르시오」를 내는 유형의 **발문·정답** 그대로
 *   ㉢ 판정기의 답(`isChooseAll`)과 **정답 개수** — 판정을 고치면 여기가 달라진다
 *   ㉣ 판정 **밖**인데 「고르」가 든 문항 수 — 판정을 넓히면 이 수가 준다
 *   ㉤ 생성기가 **던지면** 그 사유도 넣는다 (던지는 것도 «달라진 산출물»이다)
 *
 * ⚠️ ㉠ 이 **왜 필요한가** — 처음에는 엔진 산출물만 지문에 넣었다. 그런데 엔진이 내는
 *    「모두 고르시오」는 **전부** 보기가 다섯이고 정답이 `①, ②` 꼴이라, 판정기의
 *    「보기가 둘 이상인가」·「모두가 고르 앞인가」·「표식으로 세는가」를 망가뜨려도
 *    지문이 **한 글자도 안 변했다**(2026-08-25 변이 [2]·[3]·[5] 가 「산출물이 그대로 —
 *    판정 거부」). 엔진 말뭉치에는 그 규칙들이 **가르는 자리가 없다.**
 *    그래서 규칙을 재는 자리를 따로 둔다 — 없으면 그 가드는 변이시킬 수 없다.
 */
import { createHash } from "node:crypto";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  answerShape,
  chooseAllAnswerCount,
  instructionTail,
  isChooseAll,
} from "../../src/lib/problem/chooseAllRule";

/**
 * **규칙 말뭉치** — 판정기가 «아니오»를 낼 수 있는 자리를 일부러 갖춘다.
 * 엔진 산출물에는 없는 모양들(보기 없음 · 「모두」가 뒤 · 표식 아닌 정답)이 들어 있다.
 */
const CORPUS: readonly { content: string; answer: string }[] = [
  {
    content:
      "다음 보기 중 부등식인 것을 모두 고르시오.\n① $2x+1>3$\n② $x=4$\n③ $x^2\\ge0$\n④ $3x-2$\n⑤ $x+1\\le7$",
    answer: "①, ③",
  },
  {
    content:
      "다음 보기의 설명 중 옳은 것은 모두 몇 개인지 구하시오.\n① $2x+1>3$\n② $x=4$\n③ $x^2\\ge0$\n④ $3x-2$\n⑤ $x+1\\le7$",
    answer: "$3$",
  },
  {
    content:
      "다음 보기의 설명 중 옳지 않은 것을 고르시오.\n① $2x+1>3$\n② $x=4$\n③ $x^2\\ge0$\n④ $3x-2$\n⑤ $x+1\\le7$",
    answer: "④",
  },
  // 보기가 없다 — 「모두 고르시오」라 적혀 있어도 고를 것이 없으면 다른 부류다.
  { content: "다음 중 옳은 것을 모두 고르시오.", answer: "①, ②" },
  { content: "다음 중 옳은 것을 모두 고르시오.\n① $x>1$", answer: "①" },
  // 「모두」가 「고르」보다 **뒤**에 있다 — 같은 문장이 아니다.
  {
    content:
      "가장 큰 것을 고르시오. 그리고 그 수의 약수를 모두 쓰시오.\n① $12$\n② $18$\n③ $20$",
    answer: "$1,\\ 2,\\ 3,\\ 4,\\ 6,\\ 12$",
  },
  // 정답이 표식이 아니다 — 개수를 «못 센다»가 나와야 한다.
  { content: "연립방정식의 해를 구하시오.", answer: "$x=3$, $y=4$" },
  { content: "$30$ 이상 $40$ 이하인 수를 모두 쓰시오.", answer: "$31,\\ 35$" },
  { content: "꼭짓점의 좌표를 구하시오.", answer: "$(5, 8)$" },
  { content: "몫과 남는 수를 구하시오.", answer: "몫 $7$, 남는 수 $0.8$" },
  {
    content: "두 분수 가운데 큰 것을 고르시오.\n\n$\\frac12$,  $\\frac13$",
    answer: "$\\frac12$",
  },
  {
    content:
      "다음 보기에서 옳은 것을 모두 고르시오.\n㉠ 모든 유한소수는 유리수이다.\n㉡ 모든 무한소수는 순환소수이다.\n㉢ 모든 순환소수는 무한소수이다.\n㉣ 순환소수 중에는 유리수가 아닌 것도 있다.",
    answer: "㉠, ㉢",
  },
  // ㄱㄴㄷ **조합형**(2026-10-08) — 보기 하나가 조합 하나라 정답이 하나다. 엔진 산출물에는 이 꼴이 없어
  // 여기 없으면 조합형 규칙 둘을 망가뜨려도 지문이 안 변한다(«판정 거부»).
  {
    content:
      "보기에서 옳은 것을 모두 고른 것을 고르시오.\n> ㄱ. 가\n> ㄴ. 나\n> ㄷ. 다\n① ㄱ\n② ㄴ\n③ ㄱ, ㄴ\n④ ㄴ, ㄷ\n⑤ ㄱ, ㄴ, ㄷ",
    answer: "③",
  },
  {
    content:
      "다음 보기 중 옳은 것을 모두 고르면?\n> ㄱ. 가\n> ㄴ. 나\n> ㄷ. 다\n① ㄱ\n② ㄴ\n③ ㄱ, ㄴ\n④ ㄴ, ㄷ\n⑤ ㄱ, ㄴ, ㄷ",
    answer: "④",
  },
];

const VERBOSE = process.argv.includes("--verbose");
const SEEDS = 24;
const SEED0 = 20260825;
const STEP = 7919;

function main(): void {
  const h = createHash("sha256");
  let judged = 0;
  let nearMiss = 0;
  let thrown = 0;

  // ㉠ 규칙 말뭉치 — 규칙을 망가뜨리면 **여기가** 먼저 달라진다.
  let corpusYes = 0;
  for (const c of CORPUS) {
    const hit = isChooseAll(c.content);
    if (hit) corpusYes += 1;
    const line = JSON.stringify([
      hit,
      chooseAllAnswerCount(c.answer),
      answerShape(c.answer),
      instructionTail(c.content),
    ]);
    h.update(`corpus ${line}`);
    if (VERBOSE) console.log(`  말뭉치 ${line}`);
  }
  h.update(`corpusYes ${corpusYes}/${CORPUS.length}`);

  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      const seed = SEED0 + s * STEP;
      try {
        const p = generateMiddleProblem(t.key, seed);
        const hit = isChooseAll(p.content);
        if (hit) {
          judged += 1;
          h.update(
            JSON.stringify([
              t.key,
              seed,
              p.content,
              p.answer,
              chooseAllAnswerCount(p.answer),
            ]),
          );
          if (VERBOSE) {
            console.log(
              `  ${t.key} #${s} → ${chooseAllAnswerCount(p.answer)}개 «${p.answer}»`,
            );
          }
        } else if (/고르/.test(p.content)) {
          nearMiss += 1;
          h.update(JSON.stringify(["near", t.key, seed, p.content]));
        }
      } catch (err) {
        thrown += 1;
        h.update(`THROW ${t.key} ${seed} ${String(err)}`);
      }
    }
  }

  // 초등은 오늘 0건이다 — 그래도 지문에 **분모와 0** 을 같이 넣는다.
  // 0 만 넣으면 훑기가 조용히 줄어도 지문이 그대로다(「깨끗」과 「못 셈」이 안 갈린다).
  let elemSeen = 0;
  let elemHit = 0;
  for (const unit of elementaryUnits()) {
    const tiers = supportedTiers(unit);
    const asks = tiers.length > 0 ? [...tiers] : [undefined];
    for (const tier of asks) {
      for (let s = 0; s < 4; s += 1) {
        try {
          const p = generateElementaryProblem(unit, SEED0 + s * STEP, tier);
          elemSeen += 1;
          if (isChooseAll(p.content)) {
            elemHit += 1;
            h.update(
              JSON.stringify(["elem", unit.section, p.content, p.answer]),
            );
          }
        } catch (err) {
          h.update(`ELEM-THROW ${unit.section} ${s} ${String(err)}`);
        }
      }
    }
  }
  h.update(
    JSON.stringify({ judged, nearMiss, thrown, elemSeen, elemHit, SEEDS }),
  );

  console.log(
    `말뭉치 판정 ${corpusYes}/${CORPUS.length} · 중등 판정 ${judged} · 판정밖「고르」 ${nearMiss} · 던짐 ${thrown} · 초등 ${elemHit}/${elemSeen}`,
  );
  console.log(h.digest("hex"));
}

main();
