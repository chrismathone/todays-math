// @vitest-environment node
/**
 * 문제 지면 남은 결정 11건의 합의(D-164 · `docs/planning/tracks/reports/problem-display-decisions-consensus-20261021.md`)
 * 가운데 초등 엔진 몫 — ① 식 뒤 조사 붙임 · ⑤ 세기 자료 그림 · ⑥ 세로셈 틀 · ⑦ 어림 세로셈 · ⑨ 합쇼체.
 *
 * 참은 생성기 출력에서 다시 센다. 붙이는 낱말 목록도 제품 상수를 되부르지 않고 여기 따로 적는다.
 */
import { describe, expect, it } from "vitest";

import { COUNTING_FIGURE_FORMS } from "@/lib/elementary/countingFigureForms";
import { attachMathWords, mathJosa } from "@/lib/elementary/format";
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";
import { distinctKey } from "@/lib/engine/variants";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";

const SEEDS = Array.from({ length: 10 }, (_, s) => 20260825 + s * 1009);

type Out = { where: string; content: string; solution: string; answer: string; figureSpec: Record<string, unknown> | null };

/** 초등 출력 — 문형(적재기 경로) · 난이도 경로 · 학생 SRS. */
function* outputs(): Generator<Out> {
  for (const unit of elementaryUnits()) {
    for (const form of listedForms(unit))
      for (const seed of SEEDS)
        yield { where: `${unit.grade}|${unit.section.split(" ")[0]}|${form.id}|${seed}`, ...generateElementaryForm(unit, seed, form.id) };
    for (const tier of [undefined, ...supportedTiers(unit)])
      for (const seed of SEEDS)
        yield { where: `${unit.grade}|${unit.section.split(" ")[0]}|${tier ?? "-"}|${seed}`, ...generateElementaryProblem(unit, seed, tier) };
  }
  const now = new Date("2026-10-21T00:00:00Z");
  for (const sec of COURSE_SECTIONS)
    for (let s = 0; s < 4; s++)
      for (const p of generateCourseSession(sec.id, 4242 + s * 104729, now).problems)
        yield { where: `srs|${sec.id}|${p.seed}`, content: p.content, solution: p.solution, answer: p.answer, figureSpec: (p.figureSpec ?? null) as Record<string, unknown> | null };
}
const ALL = [...outputs()];

const MATH = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;
/** 식 바로 뒤 «공백 + 한 낱말». */
function* spacedAfterMath(text: string): Generator<string> {
  for (const m of text.matchAll(MATH)) {
    const w = /^ ([가-힣]+)(?![가-힣])/.exec(text.slice(m.index + m[0].length));
    if (w) yield w[1]!;
  }
}

// 붙여 쓰는 낱말 — 조사 · 서술격 조사 «이다»의 활용(합의 ① 목록). 단위 · 의존 명사 · 독립 낱말은 넣지 않는다.
const ATTACHED = new Set([
  "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "로", "으로", "만", "에서", "에는", "까지", "보다",
  "부터", "만큼", "처럼", "만큼은", "만큼을", "만큼이", "만큼의", "만큼과", "만큼씩", "까지가", "까지의", "부터는",
  "입니다", "입니까", "이므로", "이고", "이며", "인", "인데", "인지", "일", "이면", "이라", "라", "이라면", "라면",
  "이라고", "이어야", "여야", "였습니다", "이었습니다", "만큼입니다", "만큼이고", "만큼이므로", "까지입니다",
  "까지이므로", "까지인", "부터이고", "뿐입니다", "뿐이므로", "뿐인",
]);

describe("① 식 뒤 조사 · «이다» 활용은 붙인다", () => {
  it("초등 출력(문형 · 난이도 · SRS)의 발문 · 해설에 «$식$ + 공백 + 조사»가 없다", () => {
    const left: string[] = [];
    for (const o of ALL)
      for (const text of [o.content, o.solution])
        for (const w of spacedAfterMath(text)) if (ATTACHED.has(w)) left.push(`${o.where}: …${w}`);
    expect(left.slice(0, 20)).toEqual([]);
  });

  it("단위 · 의존 명사 · 독립 낱말은 띄운 그대로 남는다(음성 대조 — 이 꼴이 실제로 출력에 있다)", () => {
    const seen = new Map<string, number>();
    for (const o of ALL)
      for (const text of [o.content, o.solution])
        for (const w of spacedAfterMath(text)) seen.set(w, (seen.get(w) ?? 0) + 1);
    for (const w of ["개", "이상", "이하인", "미만인", "초과", "배", "더", "안에", "중에서", "또는"])
      expect(seen.get(w) ?? 0, w).toBeGreaterThan(0);
  });

  it("붙이는 함수 — 낱말 전체가 목록일 때만 · 식은 짝지어 읽는다", () => {
    expect(attachMathWords("$x$ 의 값 · $25$ 입니다. · $3$ 이상 · $3$ 개 · $2$ 이고, $5$ 일 때")).toBe(
      "$x$의 값 · $25$입니다. · $3$ 이상 · $3$ 개 · $2$이고, $5$일 때",
    );
    // 식과 식 사이(«$ 개와 $»)를 식으로 읽지 않는다
    expect(attachMathWords("$3$ 개와 $4$ 의 합")).toBe("$3$ 개와 $4$의 합");
    expect(attachMathWords("$$x=1$$ 입니다")).toBe("$$x=1$$ 입니다");
  });

  it("붙인 뒤 받침 교정 — 수 · 분수 · 비 · 단위의 읽는 소리로", () => {
    const fix = (t: string) => mathJosa(attachMathWords(t));
    expect(fix("$1030$ 가 되었습니다")).toBe("$1030$이 되었습니다");
    expect(fix("$18:21$ 를")).toBe("$18:21$을");
    expect(fix("$10\\,\\mathrm{mm}$ 이 몇 번")).toBe("$10\\,\\mathrm{mm}$가 몇 번");
    expect(fix("$1000\\,\\mathrm{g}$ 이 되면")).toBe("$1000\\,\\mathrm{g}$이 되면");
    expect(fix("$1\\,\\mathrm{L}$ 을")).toBe("$1\\,\\mathrm{L}$를");
    expect(fix("$5\\,\\mathrm{t}$ 를")).toBe("$5\\,\\mathrm{t}$을");
    expect(fix("$20\\%$ 이")).toBe("$20\\%$가");
    expect(fix("$51^\\circ$ 을")).toBe("$51^\\circ$를");
    expect(fix("$8\\times\\square$ 이 $72$의 배수")).toBe("$8\\times\\square$가 $72$의 배수");
    // 모르는 식은 그대로
    expect(fix("$x^{2}$ 를")).toBe("$x^{2}$를");
  });
});

describe("⑨ 초등 발문은 합쇼체", () => {
  it("모든 물음표 앞 어절이 «…니까»다 — 예외 없음", () => {
    const left: string[] = [];
    for (const o of ALL)
      for (const m of o.content.matchAll(/(\S*)\?/g))
        if (!/니까$/.test(m[1]!)) left.push(`${o.where}: ${m[1]}?`);
    expect(left.slice(0, 20)).toEqual([]);
  });

  it("하라체 서술은 참거짓 판단 대상 문장에만 남는다(인용한 명제)", () => {
    const JUDGE = "다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n";
    const left: string[] = [];
    for (const o of ALL) {
      // 판단 대상: 지시 줄 뒤의 첫 문장 · «확실한 일» 보기 ①②③
      const body = o.content.startsWith(JUDGE)
        ? o.content.slice(JUDGE.length).replace(/^[\s\S]*?다\.(?=\s|$)/, "")
        : o.content.replace(/[①②③④⑤] [^.]*이다\./g, "");
      for (const m of body.matchAll(/([가-힣]+다)(?=[.)]|$)/g))
        if (!/니다$/.test(m[1]!)) left.push(`${o.where}: ${m[1]}`);
    }
    expect(left.slice(0, 20)).toEqual([]);
  });
});

describe("⑥ «세로셈으로 계산하시오»는 세로셈 + 빈 답 칸", () => {
  const rows = ALL.filter((o) => o.content.startsWith("세로셈으로 계산하시오"));

  it("발문에 가로식이 없고, 그림이 두 수 · 연산 기호를 놓고 답은 비운다 — 해설의 식과 같은 수", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const o of rows) {
      expect(o.content, o.where).toBe("세로셈으로 계산하시오.");
      const spec = o.figureSpec!;
      expect(spec?.kind, o.where).toBe("columnOp");
      expect(spec.result, o.where).toBeUndefined();
      const m = /^\$(\d+)([+-])(\d+)=(\d+)\$$/.exec(o.solution);
      expect(m, o.solution).toBeTruthy();
      expect([spec.top, spec.op, spec.bottom]).toEqual([m![1], m![2] === "+" ? "+" : "−", m![3]]);
      expect(o.answer).toBe(`$${m![4]}$`);
      // 네 칸 세로셈 안
      expect(String(spec.top).length).toBeLessThanOrEqual(4);
      expect(String(spec.bottom).length).toBeLessThanOrEqual(4);
    }
  });

  it("발문 글자가 같아도 그림이 다르면 다른 문항으로 남는다(다름의 열쇠가 그림을 본다)", () => {
    expect(new Set(rows.map((o) => o.content)).size).toBe(1);
    const figures = new Set(rows.map((o) => JSON.stringify(o.figureSpec)));
    expect(new Set(rows.map((o) => distinctKey(o))).size).toBe(figures.size);
  });
});

describe("⑤ 세기 자료 문형은 그림을 두고, 그림에 답을 적지 않는다", () => {
  it("목록의 문형 20개가 다 있고, 씨앗마다 입체 그림이 붙으며 그림 속 글자는 발문에 있는 수만 쓴다", () => {
    expect(COUNTING_FIGURE_FORMS.length).toBe(20);
    const strings = (v: unknown, out: string[] = []): string[] => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "kind" && k !== "version") strings(x, out);
      return out;
    };
    for (const key of COUNTING_FIGURE_FORMS) {
      const [grade, code, id] = key.split("|");
      const unit = elementaryUnits().find((u) => u.grade === grade && u.section.startsWith(`${code} `));
      expect(unit, key).toBeTruthy();
      expect(listedForms(unit!).some((f) => f.id === id), key).toBe(true);
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit!, seed, id!);
        expect(p.figureSpec?.kind, `${key}: ${p.content}`).toMatch(/^(cuboid|netCuboid|cylinder|netCylinder|cone)$/);
        expect(p.content, key).toMatch(/몇 개입니까\?$/);
        // 그림 글자의 수가 발문에 없으면 덧붙인 것(답 · 판정)이다
        const stem = new Set(p.content.match(/\d+(?:\.\d+)?/g) ?? []);
        const added = strings(p.figureSpec).flatMap((s) => s.match(/\d+(?:\.\d+)?/g) ?? []).filter((x) => !stem.has(x));
        expect(added, `${key}: ${p.content}`).toEqual([]);
      }
    }
  });
});

describe("⑦ 어림한 수의 세로셈은 그대로(원장님 «표시만»)", () => {
  it("초4 1-3-3 문형06 — 어림한 두 수의 세로셈이 붙고, 그 두 수는 발문에 없다", () => {
    const unit = elementaryUnits().find((u) => u.grade === "초4" && u.section.startsWith("1-3-3 "))!;
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.figureSpec?.kind, p.content).toBe("columnOp");
      const stem = new Set(p.content.match(/\d+/g) ?? []);
      expect(stem.has(String(p.figureSpec!.top)) && stem.has(String(p.figureSpec!.bottom)), p.content).toBe(false);
    }
  });
});

describe("SRS «확실한 일» — 보기 세 문장이 서로 다르다(2026-10-21 리드)", () => {
  it("초등 출력 전부에서 ①②③ · ㉠㉡㉢ 보기에 같은 문장이 둘 없다", () => {
    const dup: string[] = [];
    for (const o of ALL) {
      const items = o.content.split(/(?=[①②③④⑤㉠㉡㉢㉣㉤])/).slice(1).map((x) => x.slice(1).replace(/\s+/g, " ").trim().replace(/[.,]$/, ""));
      if (new Set(items).size !== items.length) dup.push(`${o.where}: ${o.content.slice(0, 120)}`);
    }
    expect(dup.slice(0, 10)).toEqual([]);
  });

  it("초5 2-6-3 기본 — 셋이 다르고, 답은 «top 이상» 인 문장의 수(0 ~ 3이 다 나온다)", () => {
    const sec = COURSE_SECTIONS.find((s) => s.unit.grade === "초5" && s.unit.section.startsWith("2-6-3 "))!;
    const answers = new Set<string>();
    const now = new Date("2026-10-21T00:00:00Z");
    for (let s = 0; s < 400; s++)
      for (const p of generateCourseSession(sec.id, 7 + s * 104729, now).problems) {
        const m = /\$1\$부터 \$(\d+)\$까지의 자연수가[\s\S]*① 뽑은 수가 \$(\d+)\$ 이하이다\. ② 뽑은 수가 \$(\d+)\$ 이하이다\. ③ 뽑은 수가 \$(\d+)\$ 이하이다\./.exec(p.content);
        if (!m) continue;
        const [top, ...ks] = m.slice(1).map(Number) as [number, ...number[]];
        expect(new Set(ks).size, p.content).toBe(3);
        expect(p.answer).toBe(`$${ks.filter((k) => k >= top).length}$`);
        answers.add(p.answer);
      }
    expect([...answers].sort()).toEqual(["$0$", "$1$", "$2$", "$3$"]);
  });
});
