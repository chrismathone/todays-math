/**
 * 중등 **전 유형** — 수 뒤 조사가 읽기와 맞나(`$7$를` 이 아니라 `$7$을`).
 *
 * 값·KaTeX·냄새 자가 다 초록이어도 조사는 틀릴 수 있다 — 산술은 맞고 글자만 틀렸다.
 * 2026-09-27 전수(1,505유형 × 씨앗 600)에서 옛 판정기로 89유형 98행이 걸렸는데, 그중
 * 34행(29유형)은 **판정기의 거짓 경보**였다: 「$3$가지」의 「가」·「$4$과목」의 「과」는
 * 조사가 아니라 낱말의 첫 글자다. 거꾸로 닫는 괄호 뒤(「점 $(6, 8)$는」)는 통째로 못 보고
 * 있었다(33행). 그래서 판정기를 먼저 바로잡고(아래 눈금) — 진짜 결함 82유형 97행 — 고쳤다.
 *
 * 판정은 `../helpers/midPage.ts` 의 `josaMismatches` 다 — 받침 규칙을 제품(`m2Josa`)에서
 * 가져오지 않고 시험 쪽에 다시 적어 두었다(동어반복 방지). 그래서 제품이 조사를 고를 때
 * 엉뚱한 수를 넘기면(「$(3, 8)$」에 `eulReul(3)`) 여기서 빨개진다.
 *
 * ⚠️ 이 자는 **수로 끝나는 수식**만 본다 — 문자·지수로 끝나면(「$x$를」·「$x^2$을」) 읽기를
 *    몰라 판정하지 않는다. 그리고 「이」는 서술격(「$5$이다」)과 겹쳐 안 본다 — 「이를 써야
 *    할 자리에 가를 썼다」만 잡는다. 새는 방향이 «못 잡는 쪽»이다.
 */
import { describe, expect, it } from "vitest";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import { josaMismatches } from "../helpers/midPage";

/**
 * 씨앗 수 — 고치기 전 가장 드문 진짜 결함이 `1-2|입체도형의 겉넓이와 부피|07` 로, 이 시험의
 * 씨앗 200 에서 15번 · 다른 씨앗 400 에서 34번(약 8%)이었다. 200번이면 놓칠 확률이
 * $(1-0.075)^{200}\approx10^{-7}$ 이다.
 */
const SEEDS = 200;

describe("조사 판정기 눈금 — 양성은 잡고 음성은 안 잡는다", () => {
  it("낱말의 첫 글자는 조사가 아니다 — 「가지」·「과목」", () => {
    expect(josaMismatches("조건을 만족시키는 것은 $3$가지이다.")).toEqual([]);
    expect(josaMismatches("주사위 한 개는 $6$가지의 경우가")).toEqual([]);
    expect(
      josaMismatches("노선은 $3$가지, 지하철 노선은 $6$가지가 있다."),
    ).toEqual([]);
    expect(josaMismatches("전체 $4$과목의 평균이")).toEqual([]);
  });

  it("조사는 그대로 잡는다 — 뒤에 띄어쓰기·다른 조사가 와도", () => {
    expect(josaMismatches("식은 $y=-2x+7-8$가 된다")).toEqual([
      "$…y=-2x+7-8$가 → 이",
    ]);
    expect(josaMismatches("$5$과 $28$가 각각 $2$번")).toEqual([
      "$…5$과 → 와",
      "$…28$가 → 이",
    ]);
    expect(josaMismatches("$4$과의 차")).toEqual(["$…4$과 → 와"]);
    expect(josaMismatches("$x=20$를 대입하면")).toEqual(["$…x=20$를 → 을"]);
    expect(josaMismatches("$\\cos x=0.7660$를")).toEqual([
      "$…\\cos x=0.7660$를 → 을",
    ]);
  });

  it("닫는 괄호는 안 읽는다 — 좌표·함숫값 뒤 조사도 본다", () => {
    // 예전 판은 「)」로 끝나면 판정하지 않아 좌표 뒤 조사가 통째로 0 으로 보였다(33유형이 샜다).
    expect(josaMismatches("점 $(6, 8)$는 제 몇 사분면")).toEqual([
      "$…(6, 8)$는 → 은",
    ]);
    expect(josaMismatches("순서쌍 $(x, 8)$가 해일 때")).toEqual([
      "$…(x, 8)$가 → 이",
    ]);
    expect(josaMismatches("점 $\\mathrm{C}(1, -1)$를 꼭짓점")).toEqual([
      "$…mathrm{C}(1, -1)$를 → 을",
    ]);
    expect(josaMismatches("점 $(2, 3)$을 지나는")).toEqual([]);
    expect(josaMismatches("점 $(a, b)$를 지나는")).toEqual([]); // 문자 — 판정 안 함
    expect(josaMismatches("$\\left(\\dfrac{1}{2}\\right)$을")).toEqual([]); // 이분의 일
  });

  it("옳은 조사는 조용하다", () => {
    expect(josaMismatches("$x=20$을 대입하면 $y=5$를 얻는다")).toEqual([]);
    expect(josaMismatches("$\\dfrac{7}{8}$을 빼야")).toEqual([]);
    expect(josaMismatches("$y=2x+2$와 $y=3x-1$의")).toEqual([]);
    expect(josaMismatches("$k=-19$는 버린다")).toEqual([]);
  });
});

const TYPES = registeredTypes().map((e) => ({ key: e.key }));

describe(`중등 전 유형(${TYPES.length}) × 씨앗 ${SEEDS} — 조사 결함 0`, () => {
  it.each(TYPES)("$key", ({ key }) => {
    const bad: string[] = [];
    for (let s = 0; s < SEEDS && bad.length < 4; s += 1) {
      const p = generateMiddleProblem(key, 20260927 + s);
      for (const [field, text] of [
        ["발문", p.content],
        ["정답", p.answer],
        ["해설", p.solution],
      ] as const) {
        for (const j of josaMismatches(text)) {
          if (bad.length < 4) bad.push(`씨앗 ${s} [${field}] ${j}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
