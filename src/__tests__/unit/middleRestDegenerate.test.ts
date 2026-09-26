/**
 * 중1 세 모듈 **밖** 중등 유형 — 원장님이 «같은 방식으로 고쳐»라고 한 «말이 안 되는 수치»가 0 인가.
 *
 * 트랙 A(`middleM1Degenerate.test.ts`)가 모바일 복습이 쓰는 중1 세 모듈을 고친 뒤, 같은
 * 판정기로 나머지 1,361유형을 훑어 **A 분류**(중1 에서 고친 것과 같은 꼴) 21행을 찾았다
 * (보고서 §9 — 2026-09-27). 원장님 결정(같은 날): A 는 같은 방식으로 고친다 —
 * **값 뽑기를 좁혀** 그 경우가 안 나오게. B(경계)·C(거짓 경보)·«우연히 답이 발문에» 28유형
 * 묶음은 손대지 않는다.
 *
 * 그래서 이 시험은 유형마다 **고친 규칙만** 본다. 같은 유형에 B 행이 함께 있으면(예:
 * 다면체 16 의 직각이등변삼각형 「각각 $a$, $a$」) 그 규칙은 일부러 안 본다 — 그건 원장님 판단
 * 몫이다.
 *
 * 이 모듈들은 모바일 복습(`src/lib/math-srs/engineCatalog.ts`)이 안 부른다 — 종이 길
 * (`generateMiddleProblem`)만 돈다.
 *
 * ⚠️ `1-1|좌표와 그래프|09`(대관람차, 32.4%)는 A 로 올라왔으나 **값 뽑기로 못 막는다** —
 *    갈래 2 는 「탄 지 $x$분 후의 높이」를 묻고, $x$ 가 늘 최고점이나 출발점과 같은 때라
 *    답이 **언제나** 발문의 최고 높이나 처음 높이다. 묻는 것을 바꿔야 해서 멈추고 보고했다.
 *
 * 아래 둘째 묶음은 같은 날 훑다가 나온 **원래 있던 지면 결함**이다(1회차 보고 뒤 «알아서
 * 추천 방향으로» 지시를 받아 함께 고침 — 2회차):
 * `1\pi`·`1\sqrt{15}`(계수 $1$ 을 적음 — 기존 `pageSmells` 가 뒤가 역슬래시라 못 봤다),
 * `+1a`, 「$k=-19$은」(조사 고정).
 *
 * 판정은 제품 밖 `scripts/qa/census-middle-degenerate.ts` 의 `degenerateFindings` 다
 * (눈금 `CALIBRATION` 은 `middleM1Degenerate.test.ts` 가 잠근다 — 여기서 다시 적지 않는다).
 */
import { describe, expect, it } from "vitest";

import { degenerateFindings } from "../../../scripts/qa/census-middle-degenerate";
import { generateMiddleProblem } from "../../lib/middle/generate";
import { josaMismatches, pageSmells } from "../helpers/midPage";

/**
 * 씨앗 수 — 가장 드문 행이 1,000번에 27번(`1-2|다면체와 회전체|16` 2.7%)이었다.
 * 500 번이면 그런 결함을 놓칠 확률이 $(1-0.027)^{500}\approx 10^{-6}$ 이다.
 */
const SEEDS = 500;

const 나란한 = "나란한 두 자리의 값이 같다";
const 답 = "답이 발문에 그대로 있다";
const 각각 = "각각 뒤 두 값이 같다";
const 같은비 = "비의 두 항이 같다";
const 기약 = "비가 기약이 아니다";

/** 고친 21행 중 20행 — 유형과 **그 유형에서 고친 규칙**(고치기 전 비율, 씨앗 1,000). */
const TARGETS: { key: string; rules: string[]; what: string }[] = [
  {
    key: "1-2|다각형|20",
    rules: [기약, 같은비],
    what: "내각:외각 $42:6$(81.8%)·$4:4$(5.1%)",
  },
  {
    key: "2-1|연립일차방정식의 활용|10A",
    rules: [같은비, 기약],
    what: "남녀 비 $3:3$(19.4%)·$6:3$(32.9%)",
  },
  {
    key: "1-2|원과 부채꼴|03",
    rules: [기약],
    what: "호의 비 $8:2:2$(18.6%)",
  },
  {
    key: "2-1|연립일차방정식의 활용|35A",
    rules: [답],
    what: "형이 딱 2배 빠르면 답=출발 시차(18.2%)",
  },
  {
    key: "2-1|일차부등식의 활용|12",
    rules: [답],
    what: "농도 절반 → 넣을 물=소금물(12.5%)",
  },
  {
    key: "2-1|일차부등식의 활용|18",
    rules: [답],
    what: "농도 절반 → 최대로 넣을 물=소금물(9.1%)",
  },
  {
    key: "3-2|산포도|06",
    rules: [나란한, 답],
    what: "두 반 평균·학생 수가 같음(62.7%)·답=주어진 평균(15.1%)",
  },
  {
    key: "2-2|도형의 닮음|14",
    rules: [답],
    what: "막대 $3$m·그림자 $3$m → 답=나무 그림자(8.6%)",
  },
  {
    key: "1-1|정수와 유리수의 계산|10",
    rules: [답],
    what: "증감 합이 $0$ → 답=수요일 인원(13.4%)",
  },
  {
    key: "1-1|최대공약수와 최소공배수|30",
    rules: [답],
    what: "$4$cm·$12$cm → 답=$12$cm(11.0%)",
  },
  {
    key: "3-1|다항식의 곱셈|08",
    rules: [나란한],
    what: "가로 $3x$, 세로 $3x$인 직사각형(18.3%)",
  },
  {
    key: "3-1|이차방정식의 활용|12",
    rules: [각각],
    what: "가로, 세로 각각 $7$m, $7$m(3.1%)",
  },
  {
    key: "1-2|원과 부채꼴|17",
    rules: [나란한],
    what: "가로 $9$cm, 세로 $9$cm인 직사각형(11.6%)",
  },
  {
    key: "1-2|입체도형의 겉넓이와 부피|05",
    rules: [나란한],
    what: "가로=세로 직사각형 밑면(3.6%)",
  },
  {
    key: "1-2|입체도형의 겉넓이와 부피|09",
    rules: [나란한],
    what: "가로=세로 직사각형(2.8%)",
  },
  {
    // 같은 유형의 「각각 뒤 두 값」(직각이등변삼각형, 3.1%)은 B 라 안 본다.
    key: "1-2|다면체와 회전체|16",
    rules: [나란한],
    what: "가로=세로 직사각형(2.7%)",
  },
  {
    // 같은 유형의 「각각 뒤 두 값」(목록 속 직각이등변삼각형, 5.5%)은 B 라 안 본다.
    key: "1-2|다면체와 회전체|88X",
    rules: [나란한],
    what: "목록 속 가로=세로 직사각형(5.5%)",
  },
];

describe("중1 밖 A 분류 — 고친 규칙이 씨앗 500 에서 0", () => {
  it("20행을 빠짐없이 든다", () => {
    expect(TARGETS.reduce((n, t) => n + t.rules.length, 0)).toBe(20);
    expect(new Set(TARGETS.map((t) => t.key)).size).toBe(TARGETS.length);
  });

  it.each(TARGETS)("$key — $what", ({ key, rules }) => {
    const bad: string[] = [];
    for (let s = 0; s < SEEDS && bad.length < 6; s += 1) {
      const p = generateMiddleProblem(key, 20260927 + s);
      for (const f of degenerateFindings(p.content, p.answer)) {
        if (rules.includes(f.rule) && bad.length < 6) {
          bad.push(`씨앗 ${s} [${f.rule}] ${f.detail}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

/** 지면 표기 결함이 있던 8유형 — 냄새·조사를 **전부** 본다(그 밖의 결함은 전수로 0 이었다). */
const PAGE_TARGETS: { key: string; what: string }[] = [
  { key: "1-2|원과 부채꼴|10", what: "호의 길이 $1\\pi$" },
  { key: "1-2|원과 부채꼴|11", what: "둘레 $(8+1\\pi)$" },
  { key: "1-2|원과 부채꼴|12", what: "해설 $=1\\pi$" },
  { key: "1-2|원과 부채꼴|17", what: "넓이 $(28+1\\pi)$" },
  { key: "1-2|원과 부채꼴|18", what: "움직인 거리 $1\\pi$" },
  { key: "3-2|원과 직선|13", what: "내접원의 넓이 $1\\pi$" },
  {
    key: "3-1|근호를 포함한 식의 계산|17",
    what: "해설 $1\\sqrt{15}$·$+1a$",
  },
  { key: "3-1|이차방정식의 활용|12", what: "해설 「$k=-19$은」" },
];

describe("π·√ 앞 계수 1 — 가드가 본다", () => {
  it("계수 1 은 냄새고, 두 자리 수의 끝 1·소수·계수 없음은 아니다", () => {
    const label = "π·√ 앞에 계수 1 을 적었다";
    expect(pageSmells("$1\\pi\\,\\mathrm{cm}$")).toContain(label);
    expect(pageSmells("$(28+1\\pi)\\,\\mathrm{cm}^2$")).toContain(label);
    expect(pageSmells("$-1\\pi$")).toContain(label);
    expect(pageSmells("$1\\sqrt{15}-15$")).toContain(label);
    expect(pageSmells("$21\\pi$")).toEqual([]);
    expect(pageSmells("$0.1\\pi$")).toEqual([]);
    expect(pageSmells("$(28+\\pi)\\,\\mathrm{cm}^2$")).toEqual([]);
    expect(pageSmells("$11\\sqrt{2}$")).toEqual([]);
    expect(pageSmells("$\\dfrac{1}{\\sqrt{2}}$")).toEqual([]);
  });
});

describe("지면 표기 — 원래 있던 결함 8유형이 씨앗 500 에서 0", () => {
  it.each(PAGE_TARGETS)("$key — $what", ({ key }) => {
    const bad: string[] = [];
    for (let s = 0; s < SEEDS && bad.length < 6; s += 1) {
      const p = generateMiddleProblem(key, 20260927 + s);
      for (const [field, text] of [
        ["발문", p.content],
        ["정답", p.answer],
        ["해설", p.solution],
      ] as const) {
        for (const sm of pageSmells(text)) {
          if (bad.length < 6) bad.push(`씨앗 ${s} [냄새 ${field}] ${sm}`);
        }
        for (const j of josaMismatches(text)) {
          if (bad.length < 6) bad.push(`씨앗 ${s} [조사 ${field}] ${j}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
