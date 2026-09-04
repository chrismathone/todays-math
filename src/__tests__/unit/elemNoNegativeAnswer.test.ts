/**
 * **초등 답에 음수가 나가는가** — 전 학년·전 소단원·전 문형을 훑어 센다.
 *
 * ## 왜 생겼나 (2026-09-04, 원장님 지시)
 *
 * 음수는 **중1** 개념이다. 초등 지면에 음수 답이 나가면 학생이 풀 수 없다.
 * 생성기마다 「답이 음수가 되지 않게」라는 **국소 가드**는 십수 군데 있었는데
 * (`g3.ts`·`g4.ts`·`g5.ts` 주석), **전부를 한 번에 세는 자가 없었다.**
 * 그러면 새 문형이 하나 들어올 때 아무도 안 울린다 — 「사람이 기억할 일로 두면
 * 그 사람이 잊는 날 그대로 나간다」.
 *
 * 세울 때 실측(2026-09-04): **엔진 15,790판 · 적재본 55,782행 둘 다 0건.**
 * 곧 이 자는 **지금 상태를 못 박는 자**이지 결함을 고치려고 만든 자가 아니다.
 *
 * ## 🔴 이 자가 눈멀 수 있는 자리, 그리고 막은 법
 *
 * ㉠ **0 이 «깨끗»인지 «못 셈»인지 안 갈린다.** 그래서 전수를 판정하기 **전에**
 *    검출기에 「일부러 걸리는 글」 여섯과 「걸리면 안 되는 글」 여섯을 댄다.
 *    실제로 그 눈금이 픽스처의 역슬래시가 먹힌 것을 **두 번** 잡아 판정을 거부했다.
 * ㉡ **모집단이 비면 0 이 공짜다.** 판 수와 «한 판이라도 낸 소단원 수»를 함께
 *    못 박는다 — 엔진이 죽어 전부 던져도 「음수 0」은 초록이기 때문이다.
 * ㉢ **문형을 안 훑으면 절반을 못 본다.** 적재기(`buildElemRows`)가 부르는 것은
 *    갈래가 아니라 **문형**이다. 2026-08-28 에 그림 판정기가 갈래만 훑어 결함을
 *    통째로 놓친 자리가 그것이다 — 여기서는 둘 다 훑는다.
 *
 * ## 이 자가 못 보는 것
 *
 * - **발문·해설은 안 본다.** 축은 「답」이다. 발문에 음수가 필요한 초등 문항은
 *   없어야 하지만 그것은 다른 축이고, 여기서 같이 재면 무엇이 빨간지 흐려진다.
 * - **적재본은 안 본다.** 관문은 망 없이 돌아야 한다(`checkLoadedRawLatex.ts`
 *   머리말과 같은 까닭). 엔진이 못 내면 적재본에도 안 들어가지만, **옛 엔진으로
 *   적재한 행**은 이 자의 밖이다 — 세울 때 한 번 손으로 쟀고(0건) 다시 재려면
 *   `negativeSigns` 를 그대로 import 해 DB 를 훑으면 된다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";
import { negativeSigns } from "@/lib/elementary/rules";

/** 씨앗 넷 — 그림 판정기와 같은 수를 쓴다(관문 시간을 같은 자리에 둔다). */
const SEEDS = [20260827, 20261836, 7, 12345] as const;

describe("초등 답에 음수가 없다", () => {
  it("🔴 눈금 — 이 자가 «예»와 «아니오»를 **둘 다** 낼 수 있다", () => {
    // 양성: 부호로 쓰인 빼기표. 하나라도 못 잡으면 아래 전수의 0 은 «못 셈»이다.
    const POS = [
      "$-3$",
      "$x=-5$",
      "$-\\dfrac{1}{2}$",
      "-7개",
      "$(-4)$",
      "$-\\sqrt{2}$",
    ];
    // 음성: 연산자로 쓰인 빼기표. 잡으면 거짓 경보이고, **거짓 경보는 가드를 끈다.**
    //  🔴 첫 줄이 이 자를 만든 까닭이다 — 적재본에서 걸린 13건이 **전부** 이 모양이었다.
    const NEG = [
      "$\\triangle=\\square-3$",
      "$7-3$",
      "$4$",
      "$\\square-2$",
      "$3-1=2$",
      "오후 $3$시",
    ];
    for (const s of POS)
      expect(negativeSigns(s), `양성인데 못 잡았다 — ${s}`).not.toHaveLength(0);
    for (const s of NEG)
      expect(negativeSigns(s), `음성인데 잡았다 — ${s}`).toHaveLength(0);
  });

  it("🔴 초3~초6 전 소단원 × 갈래 × 문형 — 답이 음수인 판이 **하나도 없다**", () => {
    const hits: string[] = [];
    let made = 0;
    const covered = new Set<string>();

    for (const unit of elementaryUnits()) {
      const where = `${unit.grade} ${unit.chapter} ${unit.section}`;
      for (const seed of SEEDS) {
        // ㉠ 표준·갈래 문항
        for (const tier of supportedTiers(unit)) {
          let answer: string;
          try {
            answer = generateElementaryProblem(unit, seed, tier).answer;
          } catch {
            continue; // 생성 실패는 이 자의 축이 아니다 — 다른 자가 본다
          }
          made += 1;
          covered.add(where);
          const bad = negativeSigns(answer);
          if (bad.length > 0)
            hits.push(`${where} [${tier}] 씨앗 ${seed} — ${answer}`);
        }
        // ㉡ 🔴 **문형** — 적재기(`buildElemRows`)가 부르는 것이 이쪽이다.
        //    갈래만 훑으면 지면에 실제로 나가는 것의 절반을 구조적으로 못 본다.
        for (const form of listedForms(unit)) {
          let answer: string;
          try {
            answer = generateElementaryForm(unit, seed, form.id).answer;
          } catch {
            continue;
          }
          made += 1;
          covered.add(where);
          const bad = negativeSigns(answer);
          if (bad.length > 0)
            hits.push(`${where} 문형 ${form.id} 씨앗 ${seed} — ${answer}`);
        }
      }
    }

    // ㉡ **분모를 먼저 못 박는다** — 엔진이 죽어 전부 던져도 「음수 0」은 초록이다.
    //    실측(2026-09-04): 판 15,790 · 낸 소단원 230(초3 56 · 초4 62 · 초5 56 · 초6 56).
    expect(covered.size, "판을 낸 소단원 수가 줄었다").toBe(230);
    expect(made, "낸 판이 줄었다 — 분모가 비면 0 이 공짜다").toBeGreaterThan(
      12_000,
    );

    expect(hits.slice(0, 20).join("\n"), `음수 답 ${hits.length}건`).toBe("");
  });
});
