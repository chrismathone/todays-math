import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_TYPED_MAX,
  fadingPlacementSchema,
} from "@/contracts/fading.contract";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { fadingTrapsFor } from "@/lib/fading/traps";
import { fadingTypedOutcome, typedKey } from "@/lib/fading/typed";
import {
  buildHwpInlineShortcuts,
  hwpInlineShortcutFallback,
} from "@/components/math/editor/hwpMathShortcuts";

/**
 * 4단계 A′ — 자판으로 쓴 답을 견주는 규칙(`typed.ts`). 결정적이다(런타임 AI 없음).
 * 맞음 · 틀림(그 개념의 다른 답 · 함정) · 모름(어느 답도 아님 — 학생의 대조로) 셋으로 가른다.
 */

function conceptOf(definitions: readonly string[]): FadingConcept {
  const entries = definitions.map((definition, i): ConceptEntry => ({
    id: `t${i + 1}`,
    section: "중2::4. 삼각형의 성질::삼각형의 외심",
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  return buildFadingConcepts(entries, proposeFadingGroups(entries))[0]!;
}
const CONCEPT = conceptOf([
  "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
  "직각삼각형의 외심은 {빗변}의 {중점}이다.",
  "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
]);
/** 답이 같은 빈칸이 둘인 개념. */
const TWIN = conceptOf([
  "밑변이 같으면 넓이가 {같다}.",
  "높이가 같으면 넓이가 {같다}.",
  "넓이는 밑변과 {높이}의 곱의 반이다.",
]);
/** 완전제곱식에 더하는 같은 수 — 분수의 표시만 다른, 검토한 은행의 두 표기. */
const EQUIVALENT_SQUARE = [
  "$(b/2)^2$",
  "$\\left(\\frac{b}{2}\\right)^2$",
] as const;
/** 근호 인수가 한 토큰인 2 — 중괄호 유무와 관계없이 √2를 2로 나눈 같은 수. */
const EQUIVALENT_RADICAL = [
  "$\\frac{\\sqrt{2}}{2}$",
  "$\\frac{\\sqrt2}{2}$",
] as const;
const targetOf = (concept: FadingConcept, text: string, nth = 0) =>
  fadingTargets(concept).filter((t) => t.text === text)[nth]!;

describe("쓴 답을 견주는 열쇠", () => {
  const same = (bank: string, ...typed: string[]) => {
    for (const text of typed) expect(typedKey(text), text).toBe(typedKey(bank));
  };

  it("띄어쓰기 · 대소문자 · 수식 표시를 보지 않는다", () => {
    same("수직이등분선", " 수직 이등분선 ", "수직이등분선");
    same("하나의 항으로 합칠 수 없다", "하나의항으로합칠수없다");
    same("$R$", "R", "r");
    same("$x-2$", "x - 2", "X-2");
    same("$1\\,\\mathrm{kg}$", "1kg", "1 KG");
    same("$y$좌표", "y좌표", "y 좌표");
  });

  it("은행이 수식 명령으로 쓴 것을 자판 글자와 같게 본다", () => {
    same("$\\frac{c}{2}$", "c/2", "2분의 c", "2분의c");
    same("$\\frac{a}{a+b}$", "a/(a+b)");
    same("$2\\frac{1}{3}$", "2과 1/3", "2과 3분의 1");
    same("$360^\\circ$", "360도", "360°", "360 도");
    same("$2\\pi r^2$", "2파이r제곱", "2πr^2", "2파이 r^2");
    same("$\\sqrt{2}$", "루트2", "√2", "루트 2");
    same("$\\sqrt{a+b}$", "루트(a+b)");
    same("$a\\times b$", "a×b", "a*b", "axb");
    same("$6\\div 2$", "6÷2", "6/2");
    same("$\\angle A$", "각 A", "∠A");
    same("$\\triangle ABC$", "삼각형 ABC", "△ABC");
    same("$\\overline{AB}$", "선분 AB");
    same("$\\overleftrightarrow{AB}$", "직선 AB");
    same("$\\overrightarrow{AB}$", "반직선 AB");
    same("$l\\parallel m$", "l//m", "l∥m");
    same("$A\\ge B$", "A>=B", "A≥B");
    same("$a\\le b$", "a<=b");
    same("$a\\ne 0$", "a != 0", "a≠0");
    same("$100\\%$", "100%", "100 %");
    same("$\\left(u+m,\\ v+n\\right)$", "(u+m, v+n)", "(u+m,v+n)");
    same("$b\\tan A$", "btanA", "b tan a");
    same("$\\square$에 들어갈 수", "네모에 들어갈 수", "□에 들어갈 수");
    same("$a(x-\\alpha)(x-\\beta)=0$", "a(x-α)(x-β)=0");
  });

  it("기호 명령 바로 뒤의 분수도 명령의 이름을 잃지 않는다", () => {
    same("$\\left(1-\\frac{a}{b}\\right)\\times\\frac{c}{d}$", "(1-a/b)*c/d");
    same("$0\\le x\\le\\frac{l}{v}$", "0<=x<=l/v");
    same("$360^\\circ\\times\\frac{r}{l}$", "360도 x r/l");
  });

  it("TeX 인수는 중괄호 없이 한 글자나 명령으로도 쓴다 — 현재 은행의 짧은 분수", () => {
    same("$\\frac{d}{2}$", "$\\frac d2$", "d/2");
    same("$\\frac{x}{a}$", "$\\frac xa$", "x/a");
    same("$\\frac{1}{a}$", "$\\frac1a$", "1/a");
    same("$\\frac{1}{3}$", "$\\frac13$", "1/3");
    same("$\\frac{h}{\\tan x}$", "$\\frac h{\\tan x}$", "h/(tan x)");
    same(EQUIVALENT_RADICAL[0], EQUIVALENT_RADICAL[1], "(루트2)/2");
    same("$\\frac{a}{b}$", "$\\dfrac ab$", "$\\tfrac a{b}$", "$\\frac\ta\nb$");
  });

  it("인수 안의 명령도 끝까지 읽되 다음 인수·첨자·항을 삼키지 않는다", () => {
    same("$\\frac{\\sqrt{2}}{a}$", "$\\frac\\sqrt2a$", "(루트2)/a");
    same("$\\sqrt{\\frac{1}{2}}$", "$\\sqrt\\frac12$", "루트(1/2)");
    same("$\\frac{\\frac{1}{2}}{3}$", "$\\frac\\frac123$", "(1/2)/3");
    same("$\\frac{\\pi}{2}$", "$\\frac\\pi2$", "파이/2");
    same("$\\frac{\\tan}{2}$", "$\\frac\\tan2$", "tan/2");
    same("$\\frac{a}{b}^2$", "$\\frac ab^2$", "a/b제곱");
    same("$\\frac{1}{2}a$", "$\\frac12a$", "1/2a");
    same("$2\\frac{1}{3}$", "$2\\frac13$", "2과1/3");
    same("$\\frac{1}{\\sqrt{2}}$", "$\\frac1\\sqrt2$", "1/(루트2)");
    expect(typedKey("$\\frac ab^2$")).not.toBe(typedKey("$\\frac a{b^2}$"));
    expect(typedKey("$\\frac12a$")).not.toBe(typedKey("$\\frac1{2+a}$"));
    expect(typedKey("$\\frac{12}{3}$")).not.toBe(typedKey("$\\frac12$"));
  });

  it("모르는 명령·불완전한 인수·지원하지 않는 근호 지수는 그대로 남는다", () => {
    for (const text of [
      "$\\frac d$",
      "$\\frac{d}{2$",
      "$\\frac d}$",
      "$\\frac\\unknown2a$",
      "$\\fraction12$",
      "$\\constructor12$",
      "$\\sqrt[3]{2}$",
    ])
      expect(typedKey(text), text).toContain("\\");
    expect(typedKey("$\\frac d$")).not.toBe(typedKey("d/2"));
    expect(typedKey("$\\sqrt[3]{2}$")).not.toBe(typedKey("루트2"));
  });

  it("검토한 두 완전제곱 표기는 같고 부호·분모·제곱의 범위는 구별한다", () => {
    same(EQUIVALENT_SQUARE[0], EQUIVALENT_SQUARE[1], "(b/2)제곱");
    const distinct = [
      EQUIVALENT_SQUARE[0],
      "$(b/3)^2$",
      "$(2/b)^2$",
      "$-(b/2)^2$",
      "$b/2^2$",
      "$(b/2)^3$",
      // 대수 계산·약분은 이 규칙의 범위가 아니다.
      "$b^2/4$",
      "$(b+b)/4$",
    ].map(typedKey);
    expect(new Set(distinct).size).toBe(distinct.length);
  });

  it("작업실의 한컴 낱말로 쓴 수식도 같게 본다 — root · over · bar · deg · neq · bot …", () => {
    same("$\\sqrt{2}$", "root2", "root 2", "ROOT2", "sqrt 2");
    same("$\\frac{a}{b}$", "a over b", "a OVER b");
    same("$\\overline{AB}$", "bar AB");
    same("$30^\\circ$", "30deg", "30 deg", "30DEG");
    same("$^\\circ$", "deg");
    same("$a\\ne 0$", "a neq 0");
    same("$l\\perp P$", "l bot P");
    same("$a\\le b$", "a leq b");
    same("$\\square$", "box");
    same("$a\\times b$", "a times b");
    same("$\\pi r^2$", "pi r^2");
    // 다른 낱말의 일부 · 수식 명령은 한컴 낱말이 아니다.
    expect(typedKey("bottom")).toBe("bottom");
    expect(typedKey("$\\overline{AB}$")).not.toBe(typedKey("$/line{AB}$"));
  });

  it("작업실 수식 칸의 한컴 사전과 낱말이 어긋나지 않는다 — 사전의 낱말은 그 기호와 같은 열쇠다", () => {
    const words = Object.keys(buildHwpInlineShortcuts({})).filter(
      (key) => /^[a-z]+$/.test(key) && hwpInlineShortcutFallback(key),
    );
    expect(words.length).toBeGreaterThan(20);
    for (const word of words) {
      const latex = hwpInlineShortcutFallback(word);
      if (latex.includes("#")) continue; // 구조 셋(root · bar · over)은 위의 예로 본다.
      expect(typedKey(word), word).toBe(typedKey(`$${latex}$`));
    }
  });

  it("쉼표 · 가운뎃점 · 따옴표와 앞의 줄임표를 보지 않는다", () => {
    same("백, 십, 일의 자리 숫자가 모두", "백 십 일의 자리 숫자가 모두");
    same("곱셈·나눗셈", "곱셈 나눗셈", "곱셈, 나눗셈");
    same("'권'", "권");
    same("…보다 크다", "보다 크다", "...보다 크다");
    same("~와 같다", "와 같다");
  });

  it("서로 다른 답은 다른 열쇠로 남는다", () => {
    const keys = [
      "분모",
      "분자",
      "$0.1$",
      "$01$",
      "$x-2$",
      "$x+2$",
      "$\\frac{1}{2}$",
      "$\\frac{2}{1}$",
      "$1\\frac{1}{2}$",
      "$\\frac{11}{2}$",
      "$\\overline{AB}$",
      "$\\overleftrightarrow{AB}$",
      "$AB$",
      "$r^2$",
      "$r^3$",
      "$2r$",
      "커진다",
      "작아진다",
      // 은행에 실제로 한 개념 안에 같이 있는 짝 — 낱말 «도»와 기호 하나, 뒤에 줄임표가 붙은 답과 안 붙은 답, «%»와 «퍼센트».
      "도",
      "$^\\circ$",
      "$\\frac{1}{2}$배, …",
      "$\\frac{1}{2}$배",
      "$\\%$",
      "퍼센트",
    ].map(typedKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("줄임표뿐인 답은 그대로 남고, 아무 글자도 없으면 빈 열쇠다", () => {
    expect(typedKey("…")).toBe(typedKey("..."));
    expect(typedKey("…")).not.toBe("");
    expect(typedKey("  ")).toBe("");
    expect(typedKey("$ , $")).toBe("");
  });
});

describe("쓴 답 하나의 결과 — 맞음 · 틀림 · 모름", () => {
  it("그 빈칸의 답이면 맞음, 그 개념의 다른 답이면 틀림, 어느 답도 아니면 모름이다", () => {
    const hyp = targetOf(CONCEPT, "빗변").id;
    expect(fadingTypedOutcome(CONCEPT, hyp, " 빗 변")).toBe("correct");
    expect(fadingTypedOutcome(CONCEPT, hyp, "중점")).toBe("wrong");
    expect(fadingTypedOutcome(CONCEPT, hyp, "2분의 c")).toBe("wrong");
    expect(fadingTypedOutcome(CONCEPT, hyp, "가장 긴 변")).toBe("unknown");
    // 은행에 없는 다른 개념의 말도 모름이다 — 틀렸다고 하지 않는다.
    expect(fadingTypedOutcome(CONCEPT, hyp, "내심")).toBe("unknown");
  });

  it("함정 칩의 글은 틀림이다 — 함정이 없으면 모름이다", () => {
    const hyp = targetOf(CONCEPT, "빗변").id;
    expect(fadingTypedOutcome(CONCEPT, hyp, "내심", [{ text: "내심" }])).toBe(
      "wrong",
    );
    expect(fadingTypedOutcome(CONCEPT, hyp, "내심", [])).toBe("unknown");
  });

  it("답이 같은 빈칸이 둘이면 어느 쪽에 써도 맞음이다", () => {
    const [first, second] = [
      targetOf(TWIN, "같다", 0),
      targetOf(TWIN, "같다", 1),
    ];
    expect(fadingTypedOutcome(TWIN, first.id, "같다")).toBe("correct");
    expect(fadingTypedOutcome(TWIN, second.id, "같 다")).toBe("correct");
    expect(fadingTypedOutcome(TWIN, targetOf(TWIN, "높이").id, "같다")).toBe(
      "wrong",
    );
  });

  it.each([EQUIVALENT_SQUARE, EQUIVALENT_RADICAL])(
    "%s의 같은 표기는 두 빈칸 모두 맞음이고 다른 열쇠의 답·함정은 틀림이다",
    (first, second) => {
      const concept = conceptOf([
        `첫째 수는 {${first}}이다.`,
        `둘째 수는 {${second}}이다.`,
        "다른 수는 {$(b/3)^2$}이다.",
      ]);
      const traps = [{ text: "$(2/b)^2$" }];
      for (const form of [first, second]) {
        const target = targetOf(concept, form);
        for (const equivalent of [first, second])
          expect(
            fadingTypedOutcome(concept, target.id, equivalent, traps),
          ).toBe("correct");
        for (const wrong of ["$(b/3)^2$", "$(2/b)^2$"])
          expect(fadingTypedOutcome(concept, target.id, wrong, traps)).toBe(
            "wrong",
          );
        expect(fadingTypedOutcome(concept, target.id, "b^2/4", traps)).toBe(
          "unknown",
        );
      }
    },
  );

  it("견줄 글자가 없는 글 · 너무 긴 글 · 없는 빈칸은 받지 않는다", () => {
    const hyp = targetOf(CONCEPT, "빗변").id;
    expect(() => fadingTypedOutcome(CONCEPT, hyp, "   ")).toThrow();
    expect(() => fadingTypedOutcome(CONCEPT, hyp, ", ·")).toThrow();
    expect(() =>
      fadingTypedOutcome(CONCEPT, hyp, "가".repeat(FADING_TYPED_MAX + 1)),
    ).toThrow();
    expect(() => fadingTypedOutcome(CONCEPT, "nope#1", "빗변")).toThrow();
  });
});

describe("쓴 답 — 요청의 계약", () => {
  const targetId = "t2#1";
  it("넣은 것 하나는 칩이거나 글이다 — 둘 다이거나 둘 다 없으면 거절한다 · 옛 칩 꼴은 글자 그대로 읽힌다", () => {
    const chip = { targetId, chipId: "c1" };
    expect(fadingPlacementSchema.parse(chip)).toStrictEqual(chip);
    expect(
      fadingPlacementSchema.safeParse({ targetId, text: "빗변" }).success,
    ).toBe(true);
    expect(
      fadingPlacementSchema.safeParse({ targetId, chipId: "c1", text: "빗변" })
        .success,
    ).toBe(false);
    expect(fadingPlacementSchema.safeParse({ targetId }).success).toBe(false);
  });

  it("빈 글과 너무 긴 글을 거절한다", () => {
    expect(
      fadingPlacementSchema.safeParse({ targetId, text: "" }).success,
    ).toBe(false);
    expect(
      fadingPlacementSchema.safeParse({
        targetId,
        text: "가".repeat(FADING_TYPED_MAX),
      }).success,
    ).toBe(true);
    expect(
      fadingPlacementSchema.safeParse({
        targetId,
        text: "가".repeat(FADING_TYPED_MAX + 1),
      }).success,
    ).toBe(false);
  });
});

describe("쓴 답 — 은행 전체", () => {
  const load = async () => {
    const { CONCEPT_BLANK_BANK } = await import("@/lib/concept-blank/bank");
    const { FADING_GROUPS } = await import("@/lib/fading/groups");
    return buildFadingConcepts(CONCEPT_BLANK_BANK.concepts, FADING_GROUPS);
  };

  it("모든 답에 열쇠가 있고 상한 안에 들며, 겹친 표기는 검토한 같은 답뿐이다", async () => {
    const concepts = await load();
    expect(concepts.length).toBeGreaterThan(2000);
    const strict = (text: string) => text.trim().replace(/\s+/g, " ");
    const empty: string[] = [];
    const merged: string[] = [];
    const long: string[] = [];
    for (const concept of concepts) {
      const texts = new Set([
        ...fadingTargets(concept).map((t) => strict(t.text)),
        ...fadingTrapsFor(concept).map((t) => strict(t.text)),
      ]);
      const byKey = new Map<string, string>();
      for (const text of texts) {
        const key = typedKey(text);
        if (!key) empty.push(`${concept.id}: ${text}`);
        if (text.length > FADING_TYPED_MAX) long.push(`${concept.id}: ${text}`);
        const other = byKey.get(key);
        if (other !== undefined)
          merged.push(`${concept.id}: ${other} ↔ ${text}`);
        byKey.set(key, text);
      }
    }
    expect(empty).toEqual([]);
    // (b/2)의 제곱 · √2/2. 새 겹침을 무조건 허용하지 않고 검토한 두 쌍만 잠근다.
    expect(merged).toEqual([
      `m3-03-01-c8: ${EQUIVALENT_SQUARE[0]} ↔ ${EQUIVALENT_SQUARE[1]}`,
      `m3-05-02-c1: ${EQUIVALENT_RADICAL[0]} ↔ ${EQUIVALENT_RADICAL[1]}`,
    ]);
    expect(long).toEqual([]);
  }, 120_000);

  it("은행의 글·같은 열쇠의 표기는 맞음이고 다른 열쇠의 답·함정은 틀림이다 — 진짜 틀림은 «모름»으로 빠지지 않는다", async () => {
    const concepts = await load();
    const notCorrect: string[] = [];
    const notWrong: string[] = [];
    let pairs = 0;
    let equivalentPairs = 0;
    for (const concept of concepts) {
      const traps = fadingTrapsFor(concept);
      const targets = fadingTargets(concept);
      for (const target of targets) {
        const targetKey = typedKey(target.text);
        if (
          fadingTypedOutcome(concept, target.id, target.text, traps) !==
          "correct"
        )
          notCorrect.push(`${target.id}: ${target.text}`);
        for (const other of [
          ...targets.map((t) => t.text),
          ...traps.map((t) => t.text),
        ]) {
          if (
            other.trim().replace(/\s+/g, " ") ===
            target.text.trim().replace(/\s+/g, " ")
          )
            continue;
          const outcome = fadingTypedOutcome(concept, target.id, other, traps);
          if (typedKey(other) === targetKey) {
            equivalentPairs++;
            if (outcome !== "correct")
              notCorrect.push(`${target.id}: ${target.text} ← ${other}`);
          } else {
            pairs++;
            if (outcome !== "wrong")
              notWrong.push(`${target.id}: ${target.text} ← ${other}`);
          }
        }
      }
    }
    expect(pairs).toBeGreaterThan(50_000);
    expect(equivalentPairs).toBe(4);
    expect(notCorrect).toEqual([]);
    expect(notWrong).toEqual([]);
  }, 120_000);

  it("자판 글로 바꿀 수 없는 답은 적은 그대로다 — 늘면 운다(그 답은 학생의 대조로 간다)", async () => {
    const concepts = await load();
    const odd = new Set<string>();
    for (const concept of concepts)
      for (const target of fadingTargets(concept)) {
        const key = typedKey(target.text);
        // 자판에 없는 글자(라틴 · 한글 · 숫자 · 흔한 기호 밖)나 남은 수식 명령.
        if (/[\\{}]|[^\p{L}\p{N}\s.,()+\-*/=<>^_%'"!?:;~[\]&|]/u.test(key))
          odd.add(target.text);
      }
    expect([...odd].sort()).toEqual(
      [
        "$0.\\dot{a}$",
        "$P\\perp Q$",
        "$\\equiv$",
        "$\\triangle ABC\\equiv\\triangle DEF$",
        "$^\\circ$",
        "$l\\perp P$",
      ].sort(),
    );
  }, 120_000);
});
