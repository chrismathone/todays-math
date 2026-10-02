/**
 * 개념 백지 채점 안내(채점표 아래 글) — 전수 검토 2026-10-02 의 합의 안건 3 · 11(26 §10).
 * 굵은 부분은 **내용 기준**이고 느슨한 것은 말 · 식 · 단위의 **꼴**이다. «핵심어가 다 들어가야 ○»는 같은 뜻의 다른 말 ·
 * 같은 값의 다른 꼴을 오답으로 만들었다.
 */
import { describe, expect, it } from "vitest";
import { keyNotes } from "@/components/concept-blank/paper/paginate";
import type {
  ConceptBlankSheet,
  ConceptEntry,
  SheetHeader,
} from "@/contracts/conceptBlank.contract";

const r = String.raw;
const SECTION = "초5::2-4 소수의 곱셈::2-4-3 (자연수)×(소수)";
const header = (form: SheetHeader["form"]): SheetHeader => ({
  title: "소수의 곱셈",
  unitLabel: "초5 · 2-4 소수의 곱셈",
  date: null,
  form,
});
const entry: ConceptEntry = {
  id: "t-c1",
  section: SECTION,
  term: "단위가 있는 곱",
  kind: "방법",
  level: "하",
  definition: String.raw`$4\,\mathrm{m}$의 $0.3$배는 {$1.2\,\mathrm{m}$}이다.`,
};
const sheets: Record<string, ConceptBlankSheet> = {
  recall: {
    form: "recall",
    header: header("recall"),
    zones: [
      { section: SECTION, title: "(자연수)×(소수)", hint: "방법", side: "예" },
    ],
    key: [entry],
  },
  term: {
    form: "term",
    header: header("term"),
    terms: [entry],
    ox: [
      {
        id: "t-o1",
        section: SECTION,
        level: "하",
        statement: "소수를 곱하면 곱은 항상 작아진다.",
        answer: false,
        why: "$1$보다 큰 소수를 곱하면 커진다.",
      },
    ],
  },
  cloze: {
    form: "cloze",
    header: header("cloze"),
    sentences: [entry],
    apply: [],
  },
  map: {
    form: "map",
    header: header("map"),
    maps: [{ hub: "소수의 곱셈", nodes: [entry] }],
  },
};
const notes = (form: string) => keyNotes(sheets[form]!).join("\n");

describe("concept blank key notes", () => {
  it("no form says the bold keyword itself must be written", () => {
    for (const form of Object.keys(sheets)) {
      expect(notes(form), form).not.toMatch(/핵심어가 다/);
      // 간결 · 사무적(D-08) — 느낌표 없음
      expect(notes(form), form).not.toMatch(/!/);
    }
  });

  it("B · D grade the meaning of the bold part and let the wording vary", () => {
    for (const form of ["term", "map"]) {
      expect(notes(form), form).toContain("굵은 부분의 뜻이 모두 있어야 ○");
      expect(notes(form), form).toContain("말 · 식 · 단위의 꼴이 달라도 된다");
    }
    expect(notes("term")).toContain("문항 하나가 한 개");
    expect(notes("term")).toContain("○× 는 표시와 까닭이 둘 다 맞아야 한 개");
  });

  it("A keeps the ○ △ × ladder on meaning, not on wording", () => {
    expect(notes("recall")).toContain(
      "굵은 부분의 뜻이 다 있으면 ○, 하나 빠지면 △, 없으면 ×",
    );
    expect(notes("recall")).toContain(
      "꼴이 달라도 뜻이 같으면 있는 것으로 본다",
    );
    expect(notes("recall")).toContain("아래 1개와 맞춰 본다");
  });

  it("C accepts the same value in another form", () => {
    expect(notes("cloze")).toContain("굵은 글이 빈칸의 답이다");
    expect(notes("cloze")).toContain("같은 값 · 같은 뜻의 다른 꼴도 ○");
  });

  // 합의 안건 11 — 사례 문항은 A 채점표에 없다. 교사가 줄 수가 왜 다른지 알게 한 줄 — 실제로 뺀 것이 있을 때만.
  it("A says case cards are left off its key only when some were", () => {
    const CASES = "용어에 주어진 값으로 답이 정해지는 사례 문항은 싣지 않았다";
    const recall = sheets.recall!;
    if (recall.form !== "recall") throw new Error("꼴");
    expect(notes("recall")).not.toContain(CASES);
    expect(keyNotes({ ...recall, omittedCases: 0 }).join("\n")).not.toContain(
      CASES,
    );
    const withCases = keyNotes({ ...recall, omittedCases: 3 });
    expect(withCases.join("\n")).toContain(CASES);
    // 줄 수는 그대로 셋 — 스물넷 줄 채점표 장에 안내 상자가 같이 들어가야 한다
    expect(withCases).toHaveLength(3);
    expect(keyNotes(recall)).toHaveLength(3);
  });

  // 합의 안건 12 — 굵은 글이 용어 이름인 줄이 있을 때만 그 기준을 적는다(핵심어 표기는 늘리지 않는다).
  it("B · D add the name rule only when a row bolds its own term", () => {
    const NAME = "굵은 글이 용어와 같으면 그 이름은 답이 아니다";
    for (const form of ["term", "map"]) expect(notes(form)).not.toContain(NAME);
    const named = (term: string, definition: string): ConceptEntry => ({
      ...entry,
      id: "t-c2",
      term,
      kind: "정의",
      definition,
    });
    const term = sheets.term!;
    const map = sheets.map!;
    if (term.form !== "term" || map.form !== "map") throw new Error("꼴");
    const both = (row: ConceptEntry) => [
      keyNotes({ ...term, terms: [entry, row] }).join("\n"),
      keyNotes({ ...map, maps: [{ hub: "덧셈", nodes: [row] }] }).join("\n"),
    ];
    const on = [
      named(
        "세로셈",
        "수를 자리에 맞추어 위아래로 적고 계산하는 방법을 {세로셈}이라 한다.",
      ),
      // 한 글자 이름(각 · 합 · 몫 · 밑 …) — 은행에 아홉
      named("각", "한 점에서 출발한 두 반직선이 만드는 모양을 {각}이라 한다."),
      // 이름과 함께 뜻의 말도 굵은 줄 — 이름만 답에서 뺀다
      named(
        "정비례",
        "$x$가 $2$배가 될 때 $y$도 {$2$배}가 되면 $y$는 $x$에 {정비례}한다.",
      ),
      named(r`$\%$`, r`백분율의 숫자 뒤에는 {$\%$}를 붙인다.`),
    ];
    for (const row of on)
      for (const text of both(row)) expect(text, row.term).toContain(NAME);
    const off = [
      // 굵은 글이 용어의 한 토막일 뿐 — 이름이 아니라 뜻의 알맹이다(안내를 붙이면 «직각»을 빼고 채점하게 읽힌다)
      named(
        "직각삼각형",
        "삼각형의 세 각 가운데 {직각}이 있는 것을 직각삼각형이라 한다.",
      ),
      named("$2$의 배수", "일의 자리 숫자가 짝수이면 {$2$}로 나누어떨어진다."),
    ];
    for (const row of off)
      for (const text of both(row)) expect(text, row.term).not.toContain(NAME);
  });
});
