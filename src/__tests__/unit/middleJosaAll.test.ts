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
 * ⚠️ 그 자는 **수로 끝나는 수식**만 본다 — 문자·지수로 끝나면(「$x$를」·「$x^2$을」) 읽기를
 *    몰라 판정하지 않는다. 그리고 「이」는 서술격(「$5$이다」)과 겹쳐 안 본다 — 「이를 써야
 *    할 자리에 가를 썼다」만 잡는다. 「로/으로」도 안 본다.
 *    그 사각 셋을 이 파일의 `blindJosa` 가 따로 본다(공용 가드는 리드 소유라 여기 둔다 —
 *    `middleNotationAll` 이 「1(」 를 제 시험에 둔 것과 같은 까닭). 2026-09-27 전수에서 61유형이
 *    걸려 고쳤다: 「$3$로 통분」 37유형 · 「점 $B$이 있고」·「$R$가」·「$2x^{2}$를」 17유형 ·
 *    「$252$이 되어야」 4유형 · 「$R$라 하면」·「$y=mx+8$라」 5유형(앞 부류와 2유형 겹침).
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

/**
 * `josaMismatches` 의 사각 셋.
 *  ⑴ 수 뒤 **주격** 「이/가」 — 「$252$이 되어야」. 서술격(「$5$이다」·「$5$이고」)과 겹치므로
 *     「이」 뒤가 빈칸·쉼표·마침표·닫는 괄호·끝일 때만 조사로 본다.
 *  ⑵ **문자·제곱**으로 끝나는 수식 뒤 — 「점 $B$이 있고」·「$R$가」·「$2x^{2}$를」.
 *     영문자는 이름으로 읽는다: 받침은 엘·엠·엔·알(l·m·n·r)뿐, 나머지(엑스·와이·에이 …)는 없다.
 *     제곱·세제곱(`^2`·`^{3}`)은 받침이 있다.
 *  ⑶ 「로/으로」 — 수·문자·제곱 뒤. 받침이 없거나 ㄹ 받침(1·7·8·l·r)이면 「로」, 그 밖의
 *     받침(0·3·6·m·n·제곱)이면 「으로」다(`m2Josa` 의 `euroRo` 와 같은 표를 여기 다시 적는다).
 * 안 보는 것: 단위(`\mathrm{g}`·` cm` — 그램·센티미터가 소리를 정한다), 프라임(`B'` — 「프라임」·
 * 「대시」로 갈린다), 줄이 바뀐 뒤의 「이」(「⏎이 자료의」 — 지시어), 도(°).
 */
const JOSA_PAIR: Record<string, readonly [string, string]> = {
  은: ["은", "는"],
  는: ["은", "는"],
  을: ["을", "를"],
  를: ["을", "를"],
  이: ["이", "가"],
  가: ["이", "가"],
  과: ["과", "와"],
  와: ["과", "와"],
};

type Ending = { kind: "수" | "문자" | "제곱"; last: string } | null;

/** 수식을 소리 내어 읽을 때의 끝 — 판정할 수 없으면 `null`. */
function endingOf(math: string): Ending {
  let s = math.replace(/(?:\\right\)|\\right\]|\)|\]|\s)+$/, "");
  if (/\\mathrm\{[^{}]*\}(?:\^\{?\d\}?)?$|\\degree$|\^\\circ$|'$/.test(s)) {
    return null;
  }
  // 띄어 쓴 단위 — `$20 cm$`·`$x cm$`. 앞이 명령(`\le x`)이면 단위가 아니다.
  if (
    /(?:\d|(?<![\\A-Za-z])[A-Za-z]|\})(?:\s|\\,)+(?:[a-z]{1,2}|m?L)(?:\^\{?\d\}?)?$/.test(
      s,
    )
  ) {
    return null;
  }
  if (/\^\{?[23]\}?$/.test(s)) return { kind: "제곱", last: "" };
  const ol = /\\overline\{[A-Za-z]*([A-Za-z])\}$/.exec(s);
  if (ol) s = ol[1]!;
  const m = /(?<![\\A-Za-z])([A-Za-z]{1,3})$/.exec(s);
  if (m) return { kind: "문자", last: m[1]!.slice(-1).toLowerCase() };
  const d = /(?<![\d.])(\d+)$/.exec(s);
  if (d) return { kind: "수", last: d[1]!.slice(-1) };
  return null;
}

function hasBatchim(e: NonNullable<Ending>): boolean {
  if (e.kind === "제곱") return true;
  if (e.kind === "문자") return "lmnr".includes(e.last);
  return !"2459".includes(e.last);
}

function takesRo(e: NonNullable<Ending>): boolean {
  if (e.kind === "제곱") return false;
  if (e.kind === "문자") return !"mn".includes(e.last);
  return !"036".includes(e.last);
}

function blindJosa(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(
    /\$([^$]*)\$ ?(은|는|을|를|이|가|와|과)(.?)/g,
  )) {
    const [, body, josa, next] = m as unknown as [
      string,
      string,
      string,
      string,
    ];
    if (josa === "이" && !/^[\s,.)]?$/.test(next)) continue; // 이다·이고·이므로 …
    if (josa === "가" && next === "지") continue; // 가지
    if (josa === "과" && next === "목") continue; // 과목
    const e = endingOf(body);
    if (!e) continue;
    if (e.kind === "수" && josa !== "이") continue; // 그 밖은 `josaMismatches` 몫
    const want = JOSA_PAIR[josa]![hasBatchim(e) ? 0 : 1];
    if (want !== josa) out.push(`$…${body.slice(-12)}$${josa} → ${want}`);
  }
  for (const m of text.matchAll(
    /\$([^$]*)\$ ?(으로|로)(?:(?![가-힣])|(?=[서써부는도의만]))/g,
  )) {
    const [, body, josa] = m as unknown as [string, string, string];
    const e = endingOf(body);
    if (!e) continue;
    const want = takesRo(e) ? "로" : "으로";
    if (want !== josa) out.push(`$…${body.slice(-12)}$${josa} → ${want}`);
  }
  for (const m of text.matchAll(
    /\$([^$]*)\$ ?(이라|라)(?= 하|고 |고,|면|는 |서 )/g,
  )) {
    const [, body, josa] = m as unknown as [string, string, string];
    const e = endingOf(body);
    if (!e) continue;
    const want = hasBatchim(e) ? "이라" : "라";
    if (want !== josa) out.push(`$…${body.slice(-12)}$${josa} → ${want}`);
  }
  return out;
}

describe("사각 판정기(blindJosa) 눈금 — 양성은 잡고 음성은 안 잡는다", () => {
  it("수 뒤 주격 「이」, 문자·제곱 뒤 조사, 「로/으로」 를 잡는다", () => {
    for (const [t, want] of [
      ["최소공배수가 $252$이 되어야 한다.", "$…252$이 → 가"],
      ["$-5+20=15$이 되어", "$…-5+20=15$이 → 가"],
      ["평면 $P$ 위에 점 $A$, $B$이 있고", "$…B$이 → 가"],
      ["두 수를 빼면 $R$가 지워지므로", "$…R$가 → 이"],
      ["$\\overline{FD}$은 $\\overline{AB}$에", "$…overline{FD}$은 → 는"],
      ["$A\\times2x^{2}$를 계산하시오.", "$…\\times2x^{2}$를 → 을"],
      ["점 $(-3, t)$을 지날 때", "$…(-3, t)$을 → 를"],
      ["분모를 $3$로 통분하여", "$…3$로 → 으로"],
      ["분모를 $10$로 통분하여", "$…10$로 → 으로"],
      ["$(x-y)^2$ 로 인수분해한 뒤", "$…(x-y)^2$로 → 으로"],
      ["$y=ax(x-3)$로 놓는다", "$…y=ax(x-3)$로 → 으로"],
      ["$n$로 나누면", "$…n$로 → 으로"],
      ["$r$는 반지름", "$…r$는 → 은"],
      ["나머지를 $R$라 하면", "$…R$라 → 이라"],
      ["구하는 식을 $y=mx+8$라 하자.", "$…y=mx+8$라 → 이라"],
      ["두 수를 $x$, $x+14$이라 하고", "$…x+14$이라 → 라"],
      ["$-2\\le x$을 만족시키는", "$…-2\\le x$을 → 를"],
    ] as const) {
      expect(blindJosa(t), t).toEqual([want]);
    }
  });

  it("서술격·단위·프라임·지시어·옳은 조사는 조용하다", () => {
    for (const t of [
      "합은 $75$이다.",
      "$5$이고 $x$이므로",
      "소금물 $184\\,\\mathrm{g}$이 있다.", // 그램이
      "높이가 $108\\,\\mathrm{m}$가 되는", // 미터가
      "길이가 $20 cm$가 되는", // 센티미터가
      "넓이가 $16\\,\\mathrm{cm^2}$가 되는",
      "물 $5\\,\\mathrm{L}$를 부었더니", // 리터를
      "지름 $BA'$을 그으면", // 프라임을
      "$10$, $11$, $15$⏎이 자료의".replace("⏎", "\n"),
      "$252$가 되어야",
      "점 $A$, $B$가 있고",
      "$R$이 지워지므로",
      "$2x^{2}$을 곱했더니",
      "$y=x$가 성립한다",
      "분모를 $3$으로 통분하여",
      "$5$로 나누면",
      "$1$로",
      "$7$로",
      "$l$로",
      "$x$로 나타내면",
      "$3$가지",
      "$4$과목",
      "세로의 길이를 $x cm$라 하면", // 센티미터라
      "남은 길이를 $y cm$라 하면",
      "나머지를 $R$이라 하면",
      "구하는 식을 $y=mx+5$라 하자.",
      "$3$로서", // 로서 — 「으로서」 가 맞지만 이 자는 로/으로만 본다
    ]) {
      const got = blindJosa(t);
      if (t === "$3$로서") {
        expect(got, t).toEqual(["$…3$로 → 으로"]);
      } else {
        expect(got, t).toEqual([]);
      }
    }
  });
});

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
        for (const j of [...josaMismatches(text), ...blindJosa(text)]) {
          if (bad.length < 4) bad.push(`씨앗 ${s} [${field}] ${j}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
