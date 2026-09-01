/**
 * 「배치가 정해지는가」 판정의 **눈금**(양성·음성 대조군)과 **행동 지문**.
 *
 * ## 왜 도구에서 떼어 냈나 — 시험이 DB 클라이언트를 끌고 들어왔다
 *
 * 처음엔 이 픽스처들이 `probe-figure-dependent.ts` 안에 있었다. 그런데 시험
 * (`arrangementRule.test.ts`)이 **픽스처를 정본으로 쓰려고** 그 파일을 import 하면서
 * `@prisma/client` 까지 vitest 워커에 딸려 들어왔다 — 단위 시험 하나가 DB 엔진을
 * 통째로 메모리에 올린다. 전량 관문에서 **다른 파일이 시간 초과로 흔들렸다**
 * (같은 회차에 실패하는 파일이 회차마다 달랐다 — 진짜 회귀가 아니라 압력의 증상).
 *
 * 그래서 **Prisma 를 안 물고 오는 자리**로 옮겼다. 픽스처는 여전히 **한 곳**이고
 * (두 벌이 되면 한쪽만 고쳐도 아무도 모른다), 도구와 시험이 둘 다 여기를 읽는다.
 * 계약 SSOT 를 zod 안 물게 쪼갠 D-106 과 같은 결이다.
 */
import { readFileSync } from "node:fs";

import {
  classifyArrangement,
  sharedVertexShapes,
} from "../../src/lib/figure/arrangementRule";

/* ────────────────────────────────────────────────────────────────────────────
 * 눈금 — **양성·음성 대조군을 둘 다** 둔다.
 *
 * 양성만 대면 재현율만 재고 지어냄은 구조적으로 0이 된다(CLAUDE.md 2026-08-20).
 * 그리고 양성은 **문자열로 박는다** — 엔진이 이 발문을 고치는 순간 살아 있는 DB 를
 * 보는 눈금은 조용히 사라지고, 그러면 재현율을 영영 못 잰다(2026-08-23).
 * ──────────────────────────────────────────────────────────────────────────── */

/** 배치가 **안 정해지는** 발문. 전량 눈으로 확인했다. */
export const POSITIVE_FIXTURES: { why: string; content: string }[] = [
  {
    why: "J30303-A08-002 (원장님 지적) — 점 E·F 가 어디 붙는지 발문이 안 적는다. 해설은 E∈AB 를 전제한다",
    content:
      "두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고 $\\square AEFD$는 정사각형이다. $\\overline{AB}=8$일 때, $\\overline{AD}$의 길이를 구하시오.",
  },
  {
    why: "J30303-A08-001 — 같은 갈래의 다른 수치판",
    content:
      "두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고 $\\square AEFD$는 정사각형이다. $\\overline{AD}=4$일 때, $\\overline{AB}$의 길이를 구하시오.",
  },
  {
    why: "J30303-A06-001 — 길이 몇 개인지·어느 방향인지 안 적는다. 해설은 가로·세로 양쪽에서 뺀다(십자)",
    content:
      "가로의 길이가 세로의 길이보다 $5\\,\\mathrm{m}$ 더 긴 직사각형 모양의 땅에 폭이 $4\\,\\mathrm{m}$인 길을 내었더니 길을 제외한 땅의 넓이가 $204\\,\\mathrm{m^2}$가 되었다. 이 땅의 가로의 길이를 구하시오.",
  },
];

/** 배치가 **정해지는** 발문. 전량 눈으로 확인했다 — 얽힘은 있는데 고정하는 말이 있다. */
export const NEGATIVE_FIXTURES: { why: string; content: string }[] = [
  {
    why: "J30201-A09-001 — 「가로 방향과 세로 방향으로 하나씩」이 배치를 적는다",
    content:
      "가로의 길이가 $6x$, 세로의 길이가 $4x$ 인 직사각형 모양의 땅에 폭이 일정하게 $1$ 인 길을 가로 방향과 세로 방향으로 하나씩 만들었다. 길을 제외한 땅의 넓이를 구하시오.",
  },
  {
    why: "J30303-A06-002 — 「십자 모양의」가 배치를 적는다. 위 양성 3번과 **같은 갈래**다",
    content:
      "한 변의 길이가 $23\\,\\mathrm{m}$인 정사각형 모양의 땅에 폭이 일정한 십자 모양의 길을 내었더니 길을 제외한 땅의 넓이가 $361\\,\\mathrm{m^2}$가 되었다. 길의 폭을 구하시오.",
  },
  {
    why: "J30303-A07-001 — 「네 귀퉁이에서 … 각각」이 배치를 적는다",
    content:
      "한 변의 길이가 $x\\,\\mathrm{cm}$인 정사각형 모양의 종이의 네 귀퉁이에서 한 변의 길이가 $4\\,\\mathrm{cm}$인 정사각형을 각각 잘라 내고 남은 부분으로 뚜껑이 없는 직육면체 모양의 상자를 만들었더니 부피가 $1156\\,\\mathrm{cm^3}$가 되었다. 처음 정사각형의 한 변의 길이를 구하시오.",
  },
  {
    // ⚠️ 이 행의 판정은 `배치확정` 이 **아니라** `얽힘없음` 이다 — 「이 순서대로」가
    //    이기기 전에 얽힘 축이 아예 안 문다(`\angle APB` 는 라벨이 하나뿐이다).
    //    음성 대조로서는 그대로 값이 있지만, 「이 조각이 무는 것을 봤다」로 읽지 말 것.
    //    무엇이 실제로 무는지는 `--tokens` 가 센다.
    why: "J30603-A09-001 — 얽힘 축이 안 문다(라벨 하나). 「이 순서대로」도 있다",
    content:
      "원 위에 네 점 $A$, $B$, $C$, $D$가 이 순서대로 있고, 두 현 $AC$와 $BD$는 원 안의 점 $P$에서 만난다. 호 $AB$의 길이는 원주의 $\\dfrac{1}{9}$, 호 $CD$의 길이는 원주의 $\\dfrac{1}{5}$일 때, $\\angle APB$의 크기를 구하시오.",
  },
  {
    why: "E61101-A04-001 — 「(단, …)」 단서절이 배치를 적는다",
    content:
      "어떤 원 안에 꼭 맞게 그린 정육각형의 둘레가 $30\\,\\mathrm{cm}$ 입니다. 같은 원 밖에 꼭 맞게 그린 정사각형의 둘레는 몇 cm인가? (단, 정육각형의 여섯 꼭짓점은 모두 원 위에 있습니다. 또, 정사각형의 네 변은 모두 원에 닿습니다.)",
  },
  {
    why: "얽힘이 아예 없는 순수 계산 — 이 축이 말이 없어야 한다",
    content: "다음 식을 인수분해하시오. $9x^2-12xy+4y^2$",
  },
  {
    why: "얽힘이 아예 없는 순수 계산 — 초등 연산",
    content: "계산하시오. $\\frac{5}{6}\\times\\frac{9}{10}$",
  },
];

/** 눈금을 돌린다. **하나라도 어긋나면 이 도구는 보고하지 않는다.** */
export function runSelfTest(): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;
  for (const f of POSITIVE_FIXTURES) {
    const v = classifyArrangement(f.content);
    const good = v === "배치미정";
    if (!good) ok = false;
    // ⚠️ 표식은 **✅/❌** 다 — 관문(`elemProbeGauges.test.ts`)이 판정 줄을
    //    `/^\s*[✅❌]/` 로 세어 「요약이 말한 N」과 대조한다(요약 수를 손으로 적는 것을
    //    막는 장치다). 다른 이모지로 바꾸면 그 대조가 **0줄**을 세고 막는다.
    lines.push(`  ${good ? "✅" : "❌"} 양성 → ${v.padEnd(6)} · ${f.why}`);
  }
  for (const f of NEGATIVE_FIXTURES) {
    const v = classifyArrangement(f.content);
    const good = v !== "배치미정";
    if (!good) ok = false;
    lines.push(`  ${good ? "✅" : "❌"} 음성 → ${v.padEnd(6)} · ${f.why}`);
  }
  return { ok, lines };
}

/**
 * **변이 하네스가 「뜻이 바뀌었나」를 재는 지문.** DB 없이 돈다.
 *
 * ⚠️ 지문이 눈금 열 줄뿐이면 **너무 좁다.** 실제로 `sharedVertexShapes` 를 망가뜨리는
 *    변이 셋이 「판정 그대로」로 거부됐다 — 양성 픽스처가 `닮은` 으로도 걸려서
 *    라벨 축이 죽어도 판정이 안 바뀌기 때문이다(조각끼리 서로 가린다).
 *    그래서 지문에 ⑴ 눈금 ⑵ **커밋된 스냅숏 357행의 판정** ⑶ 라벨 축의 산출을
 *    같이 넣는다. 좁은 지문은 「가드가 아니다」를 **거짓으로** 만든다.
 */
export function behaviourSignature(): string {
  const probes = [
    "두 직사각형 $ABCD$와 $BCFE$는 정사각형이다",
    "$\\square AEFD$는 정사각형이고 $\\square ABCD$이다",
    "직각삼각형 $ABC$에서 $\\overline{AB}=20$",
    "사각형 $ABCD$와 오각형 $PQRST$가 있다",
    // 명령 지우기가 **실제로 무는** 자리. 이것이 지문에 없어서 그 변이가
    // 「판정 그대로」로 거부됐다 — 프로브가 경계를 안 가르면 변이는 재현되지 않는다.
    "$\\LEFT x$ 와 $\\RIGHT y$",
  ];
  const parts = [
    runSelfTest().lines.join("\n"),
    probes
      .map((p) => p + " → " + JSON.stringify(sharedVertexShapes(p)))
      .join("\n"),
  ];
  try {
    const snap = JSON.parse(
      readFileSync("scripts/qa/reports/figure-dependent-snapshot.json", "utf8"),
    ) as { 목록: { code: string; content: string }[] };
    parts.push(
      snap.목록
        .map((r) => r.code + ":" + classifyArrangement(r.content))
        .join("\n"),
    );
  } catch {
    parts.push("(스냅숏 없음)");
  }
  return parts.join("\n--\n");
}
