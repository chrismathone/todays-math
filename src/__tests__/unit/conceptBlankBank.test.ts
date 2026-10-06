/**
 * 개념 백지 은행의 문지기(D-150) — 학년 트랙 일곱이 모두 이 시험을 통과해야 병합한다.
 * 꼴(계약) · 열쇠가 교육과정에 있나 · 파일이 제 학년만 담나 · id 겹침 · 핵심어 · 그림 이름표 자리.
 */
import { describe, expect, it } from "vitest";
import { BLANK_WIDTH, inkEm } from "@/components/concept-blank/paper/text";
import {
  blankKeywords,
  conceptBlankBankSchema,
  splitBlankSentence,
} from "@/contracts/conceptBlank.contract";
import {
  BANK_PARTS,
  CONCEPT_BLANK_BANK,
  PLUS_OF,
  sectionStock,
} from "@/lib/concept-blank/bank";
import { blankClashes, danglingExamples } from "@/lib/concept-blank/audit";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  bankNotationFaults,
  notationFaults,
} from "@/lib/concept-blank/notation";
import { BLANK_SECTIONS, getBlankSection } from "@/lib/concept-blank/sections";
import {
  retiredCounts,
  retiredKey,
} from "../../../scripts/qa/concept-blank/havruta/ledger";

const PART_GRADES: Record<string, readonly string[]> = {
  e3: ["초3"],
  e4: ["초4"],
  e5: ["초5"],
  e6: ["초6"],
  m1: ["중1"],
  m2: ["중2"],
  m3: ["중3"],
  e3plus: ["초3"],
  e4plus: ["초4"],
  e5plus: ["초5"],
  e6plus: ["초6"],
  m1plus: ["중1"],
  m2plus: ["중2"],
  m3plus: ["중3"],
};
const BASE_PARTS = Object.keys(BANK_PARTS).filter((p) => !(p in PLUS_OF));
const PLUS_PARTS = Object.keys(PLUS_OF);
/** 은행 3차 — 소단원마다 개념 · ○× · 적용이 난이도별 이만큼(원장님 2026-10-01 «하/중/상 10문제씩»). */
const PER_LEVEL = 10;
/** 까닭을 적고 빼더라도 난이도 한 칸에 남아야 하는 장수(26 §11). */
const MIN_PER_LEVEL = 1;
const LEVELS = ["하", "중", "상"] as const;
const squash = (s: string) => s.replace(/\s+/g, "");

const everyItem = (b = CONCEPT_BLANK_BANK) => [
  ...b.concepts,
  ...b.ox,
  ...b.apply,
  ...b.figures,
];

describe("concept blank bank", () => {
  it.each(Object.keys(BANK_PARTS))("%s matches the contract", (part) => {
    const parsed = conceptBlankBankSchema.safeParse(BANK_PARTS[part]);
    expect(
      parsed.success,
      JSON.stringify(parsed.error?.issues.slice(0, 5)),
    ).toBe(true);
  });

  it.each(Object.keys(BANK_PARTS))(
    "%s holds only its own grades, on real curriculum sections",
    (part) => {
      for (const item of everyItem(BANK_PARTS[part])) {
        const section = getBlankSection(item.section);
        expect(
          section,
          `${item.id}: 교육과정에 없는 소단원 ${item.section}`,
        ).toBeDefined();
        expect(
          PART_GRADES[part],
          `${item.id}: ${section?.grade} 는 ${part} 파일 밖`,
        ).toContain(section!.grade);
      }
    },
  );

  // 채우기 시작한 학년은 소단원을 하나도 빼먹지 않는다(브리프 cb-bank 의 최소 재고) — 빈 뼈대 학년은 건너뛴다.
  it.each(BASE_PARTS)(
    "%s, once filled, stocks every section of its grade",
    (part) => {
      const bank = BANK_PARTS[part]!;
      if (everyItem(bank).length === 0) return;
      const sections = BLANK_SECTIONS.filter((s) =>
        PART_GRADES[part]!.includes(s.grade),
      );
      expect(sections.length, `${part}: 교육과정 소단원`).toBeGreaterThan(0);
      const thin = sections.flatMap((s) => {
        const stock = sectionStock(s.key, bank);
        const short = [
          stock.concepts.length < 2 && `개념 ${stock.concepts.length}`,
          stock.ox.length < 1 && "○× 0",
          stock.apply.length < 1 && "적용 0",
        ].filter(Boolean);
        return short.length ? [`${s.key} — ${short.join(" · ")}`] : [];
      });
      expect(thin).toEqual([]);
    },
  );

  // 은행 3차(브리프 cb-ten) — 보강을 시작한 학년은 소단원마다 원래 + 보강이 개념 · ○× · 적용 모두 하 · 중 · 상 10개 이상.
  // «개념을 묻는다»(26 §11 · 원장님 2026-10-03 «정말 추가할 만한 게 없으면 그렇게 해»)에서 **까닭을 적고 뺀** 자리만큼은 봐준다 —
  // 그래도 난이도 한 칸에 MIN_PER_LEVEL 장은 남아야 한다(그보다 얇아지면 소단원을 고를 수 없는 칸이 생긴다).
  it.each(PLUS_PARTS)(
    "%s, once filled, brings every section to ten per level",
    (part) => {
      const retired = retiredCounts(CONCEPT_BLANK_BANK);
      const plus = BANK_PARTS[part]!;
      if (everyItem(plus).length === 0) return;
      const base = BANK_PARTS[PLUS_OF[part]!]!;
      const both = {
        concepts: [...base.concepts, ...plus.concepts],
        ox: [...base.ox, ...plus.ox],
        apply: [...base.apply, ...plus.apply],
        figures: [...base.figures, ...plus.figures],
      };
      const short = BLANK_SECTIONS.filter((s) =>
        PART_GRADES[part]!.includes(s.grade),
      ).flatMap((s) => {
        const stock = sectionStock(s.key, both);
        return (["concepts", "ox", "apply"] as const).flatMap((kind) =>
          LEVELS.flatMap((level) => {
            const n = stock[kind].filter((x) => x.level === level).length;
            const gone = retired.get(retiredKey(s.key, kind, level)) ?? 0;
            return n + gone < PER_LEVEL || n < MIN_PER_LEVEL
              ? [
                  `${s.key} ${kind} ${level} ${n}${gone ? ` (뺀 것 ${gone})` : ""}`,
                ]
              : [];
          }),
        );
      });
      expect(short.slice(0, 20), `모자람 ${short.length}칸`).toEqual([]);
    },
  );

  it.each(PLUS_PARTS)(
    "%s adds no figures and marks its ids as additions",
    (part) => {
      const plus = BANK_PARTS[part]!;
      expect(plus.figures).toEqual([]);
      // id 머리 = 그 소단원 원래 문항 id 의 앞부분(`e3-1-1-1-c1` → `e3-1-1-1`).
      const heads = new Map<string, Set<string>>();
      for (const item of everyItem(BANK_PARTS[PLUS_OF[part]!]))
        heads
          .set(item.section, heads.get(item.section) ?? new Set())
          .get(item.section)!
          .add(item.id.replace(/-[coaf]\d+$/, ""));
      const mark = { concepts: "xc", ox: "xo", apply: "xa" } as const;
      for (const kind of ["concepts", "ox", "apply"] as const)
        for (const item of plus[kind]) {
          expect(item.id, `${item.id}: 보강 id 꼴`).toMatch(
            new RegExp(`-${mark[kind]}\\d+$`),
          );
          expect(
            [...(heads.get(item.section) ?? [])],
            `${item.id}: 그 소단원 원래 id 머리와 다르다`,
          ).toContain(item.id.replace(/-x[coa]\d+$/, ""));
        }
    },
  );

  // «같은 개념이어도 난이도에 따라 구분» — 같은 개념을 다른 난이도로 다시 물어도 되지만, 한 소단원 안에 같은 글이 두 번 찍히면 안 된다.
  it("no section repeats a term, sentence, ○× statement or apply question", () => {
    const repeated = (
      label: string,
      items: readonly { id: string; section: string; text: string }[],
    ) => {
      const seen = new Map<string, string>();
      return items.flatMap((x) => {
        const key = `${x.section}|${squash(x.text)}`;
        const first = seen.get(key);
        if (first) return [`${label} ${first} = ${x.id}`];
        seen.set(key, x.id);
        return [];
      });
    };
    const { concepts, ox, apply } = CONCEPT_BLANK_BANK;
    const repeats = [
      ...repeated(
        "용어",
        concepts.map((c) => ({ ...c, text: c.term })),
      ),
      ...repeated(
        "뜻",
        concepts.map((c) => ({ ...c, text: c.definition })),
      ),
      ...repeated(
        "○×",
        ox.map((c) => ({ ...c, text: c.statement })),
      ),
      ...repeated(
        "적용",
        apply.map((c) => ({ ...c, text: c.prompt })),
      ),
    ];
    expect(repeats.slice(0, 20), `겹침 ${repeats.length}`).toEqual([]);
  });

  // 칸을 건넌 같은 글(트랙 cb-ten-e5 가 찾았다) — ○× 문장이 같은 소단원의 뜻 문장과 글자 그대로 같으면 «용어 → 뜻» 지면에서
  // ○× 줄이 뜻의 답을 그대로 보여 준다. 핵심어 괄호 · 빈칸 · 끝 마침표는 빼고 잰다. 고칠 자리: scripts/qa/concept-blank/check-cross.ts
  it("no ○× statement repeats a definition of its section", () => {
    const key = (text: string) =>
      text.replace(/[{}\s]/g, "").replace(/[.。]$/, "");
    const definitions = new Map(
      CONCEPT_BLANK_BANK.concepts.map((c) => [
        `${c.section}|${key(c.definition)}`,
        c.id,
      ]),
    );
    const hits = CONCEPT_BLANK_BANK.ox.flatMap((o) => {
      const id = definitions.get(`${o.section}|${key(o.statement)}`);
      return id ? [`${id} = ${o.id}`] : [];
    });
    expect(hits.slice(0, 20), `겹침 ${hits.length}`).toEqual([]);
  });

  // 원장님 2026-09-30 «카텍스 사용할 것» — 은행 2차가 0건으로 만든 표기를 잠근다(자: `concept-blank/notation.ts`).
  it.each(Object.keys(BANK_PARTS))(
    "%s keeps numbers, units and symbols inside KaTeX",
    (part) => {
      const faults = bankNotationFaults(BANK_PARTS[part]!).map(
        (f) => `${f.id} (${f.field}) [${f.rule}] ${f.what}`,
      );
      expect(faults.slice(0, 20)).toEqual([]);
    },
  );

  it("the notation ruler says both yes and no", () => {
    const rules = (s: string, sentence = false) =>
      notationFaults(s, sentence).map((f) => f.rule);
    expect(rules("구슬 20개를 5개씩 묶는다.")).toContain("수식 밖 숫자");
    expect(rules("구슬 $20$개를 $5$개씩 묶는다.")).toEqual([]);
    expect(rules("∠A의 크기는 직각이다.")).toContain("수식 밖 기호");
    expect(rules(String.raw`$\angle A=50^\circ$이다.`)).toEqual([]);
    expect(rules("$8$각형의 대각선")).toContain("아라비아 도형 이름");
    expect(rules("팔각형의 대각선")).toEqual([]);
    expect(rules(String.raw`값은 $\frac{1}{2$ 이다.`)).toContain("수식 오류");
    expect(
      rules(String.raw`$\cos 30^\circ=$ {$\frac{\sqrt{3}}{2}$}이다.`, true),
    ).toEqual([]);
    // `r` 없이 보통 따옴표로 쓴 글 — KaTeX 는 오류 없이 `3, mathrmm` 을 찍는다(전수 검토 2026-10-02).
    expect(rules("한 층의 높이가 $3,mathrm{m}$이다.")).toContain(
      "역슬래시 빠진 명령",
    );
    expect(rules(String.raw`한 층의 높이가 $3\,\mathrm{m}$이다.`)).toEqual([]);
    expect(rules(String.raw`$\triangle ABC$의 넓이`)).toEqual([]);
    // 앞 글자가 붙은 꼴(`dfrac`)도 같은 결함이고, 글 명령 안의 낱말은 명령이 아니다
    expect(rules("값은 $dfrac{1}{2}$이다.")).toContain("역슬래시 빠진 명령");
    expect(rules(String.raw`값은 $\dfrac{1}{2}$이다.`)).toEqual([]);
    expect(rules(String.raw`$\text{parallel lines}$`)).toEqual([]);
  });

  // 문장 빈칸(C)은 뜻 문장만 찍는다 — 빈칸을 비운 글이 같고 답이 다르면 학생지에서 가를 수 없다(인쇄 검토 2026-10-02).
  it("no chapter prints the same blanked sentence with different answers", () => {
    const clashes = blankClashes(CONCEPT_BLANK_BANK).map((g) =>
      g.map((c) => c.id).join(" = "),
    );
    expect(clashes.slice(0, 20), `겹침 ${clashes.length}묶음`).toEqual([]);
  });

  it("checks different subunits of one chapter because C students cannot see their titles", () => {
    const entry = (id: string, section: string, answer: string) => ({
      id,
      section,
      term: id,
      kind: "방법" as const,
      level: "하" as const,
      definition: `분모를 통일한 다음 분자는 {${answer}}, 공통분모는 {그대로} 적는다.`,
    });
    const concepts = [
      entry("add", "초5::1-5 분수의 덧셈과 뺄셈::진분수의 덧셈", "더하고"),
      entry("subtract", "초5::1-5 분수의 덧셈과 뺄셈::진분수의 뺄셈", "빼고"),
      entry(
        "other-grade",
        "초4::1-5 분수의 덧셈과 뺄셈::진분수의 뺄셈",
        "빼고",
      ),
      entry("other-chapter", "초5::2-2 분수의 곱셈::진분수의 곱셈", "곱하고"),
    ];
    expect(
      blankClashes({ concepts, ox: [], apply: [], figures: [] }).map((group) =>
        group.map((item) => item.id),
      ),
    ).toEqual([["add", "subtract"]]);
  });

  // 개념 지도(D)는 용어와 예 물음만 찍는다 — 예 물음이 뜻 문장을 가리키면(«이때 …») 풀 수 없다.
  it("no map example points at the unprinted definition", () => {
    const hits = danglingExamples(CONCEPT_BLANK_BANK).map(
      (c) => `${c.id} «${c.example!.prompt}»`,
    );
    expect(hits.slice(0, 20), `가리킴말 ${hits.length}건`).toEqual([]);
  });

  // 개념 지도(D)는 예 물음 뒤에 빈칸 하나만 준다 — 빈칸은 답의 보이는 폭만큼이고 `BLANK_WIDTH.max` 에서 잘린다.
  // 답이 그보다 넓으면 손으로 쓸 자리가 없다(2026-10-03 — 예의 답을 «…때문이다» 문장으로 쓰다가 드러났다 · 26 §11).
  it("every map example answer fits the blank the sheet gives it", () => {
    const { perEm, pad, max } = BLANK_WIDTH;
    const wide = CONCEPT_BLANK_BANK.concepts
      .filter((c) => c.example && inkEm(c.example.answer) * perEm + pad > max)
      .map((c) => c.id);
    // 자를 세울 때 넘던 다섯(초3 셋 · 중1 둘)은 학년 트랙이 줄였다 — 이제 하나도 없다.
    expect(wide).toEqual([]);
  });

  // 문장 빈칸(C)은 핵심어 하나하나를 빈칸 하나로 바꾼다 — 그 빈칸도 `BLANK_WIDTH.max` 에서 잘린다(2026-10-03 — 까닭 절을 통째로
  // 감싼 핵심어가 202개 · 처음 은행 32개였고, 학년 트랙이 알맹이만 감싸거나 둘로 나눠 0 이 됐다).
  it("every cloze keyword fits the blank the sheet gives it", () => {
    const { perEm, pad, max } = BLANK_WIDTH;
    const wide = CONCEPT_BLANK_BANK.concepts.flatMap((c) =>
      blankKeywords(c.definition)
        .filter((key) => inkEm(key) * perEm + pad > max)
        .map((key) => `${c.id} {${key}}`),
    );
    expect(wide).toEqual([]);
  });

  it("the cross-form ruler says both yes and no", () => {
    const concept = (id: string, definition: string, prompt?: string) => ({
      id,
      section: "초4::2-5 꺾은선그래프::2-5-2 꺾은선그래프 내용 알아보기",
      term: id,
      kind: "방법" as const,
      level: "하" as const,
      definition,
      ...(prompt ? { example: { prompt, answer: "$1$" } } : {}),
    });
    const bank = (concepts: ReturnType<typeof concept>[]) => ({
      concepts,
      ox: [],
      apply: [],
      figures: [],
    });
    expect(
      blankClashes(
        bank([
          concept("a", "그래프에서는 점들 중 {가장 높은 점}의 값을 찾는다."),
          concept("b", "그래프에서는 점들 중 {가장 낮은 점}의 값을 찾는다."),
          concept("c", "가장 큰 값을 찾으려면 {가장 높은 점}의 값을 읽는다."),
        ]),
      ).map((g) => g.map((c) => c.id)),
    ).toEqual([["a", "b"]]);
    expect(
      danglingExamples(
        bank([
          concept("a", "양변에 {같은 수}를 곱한다.", "이때 $a$의 값은?"),
          concept("b", "양변에 {같은 수}를 곱한다.", "구한 직선의 식"),
          concept("c", "양변에 {같은 수}를 곱한다.", "같은 방법으로 구하면?"),
          concept("d", "양변에 {같은 수}를 곱한다.", "같은 컵으로 부으면?"),
          concept("e", "양변에 {같은 수}를 곱한다.", "$2x=4$의 해는?"),
          // 글머리의 «그때 · 이렇게»도 뜻 문장을 가리킨다(다른 모델의 코드 검토 2026-10-02 — 은행에 다섯)
          concept("f", "양변에 {같은 수}를 곱한다.", "그때 가로의 길이"),
          concept("g", "양변에 {같은 수}를 곱한다.", "이렇게 그리면 무엇을?"),
          // 물음 안에서 닫히는 «그때»는 가리킴말이 아니다
          concept(
            "h",
            "양변에 {같은 수}를 곱한다.",
            "$A$가 $B$보다 위에 있으면 그때 더 멀리 간 사람은?",
          ),
        ]),
      ).map((c) => c.id),
    ).toEqual(["a", "b", "c", "f", "g"]);
  });

  it("ids are unique across the whole bank and the fixture", () => {
    const ids = [...everyItem(), ...everyItem(FIXTURE_BANK)].map((x) => x.id);
    // 한 번 훑어 센다 — `indexOf` 로 견주면 3만 개의 제곱이라 기계가 바쁠 때 시간 초과로 빨개진다(가드가 아니라 소음)
    const seen = new Set<string>();
    const dup = ids.filter((id) => seen.size === seen.add(id).size);
    expect(dup).toEqual([]);
  });

  it("every concept sentence keeps a readable sentence around its keywords", () => {
    for (const c of [
      ...CONCEPT_BLANK_BANK.concepts,
      ...FIXTURE_BANK.concepts,
    ]) {
      const keys = blankKeywords(c.definition);
      expect(keys.length, c.id).toBeGreaterThan(0);
      const rest = splitBlankSentence(c.definition)
        .filter((p) => p.kind === "text")
        .map((p) => p.text)
        .join("")
        .replace(/\s+/g, "");
      expect(
        rest.length,
        `${c.id}: 빈칸을 빼면 문장이 거의 없다`,
      ).toBeGreaterThanOrEqual(6);
    }
  });

  it("figure tags sit inside their viewBox", () => {
    for (const f of [...CONCEPT_BLANK_BANK.figures, ...FIXTURE_BANK.figures]) {
      const [, , w, h] = f.viewBox.split(" ").map(Number);
      for (const t of f.tags) {
        expect(
          t.x >= 0 && t.x + t.w <= w! && t.y >= 0 && t.y + 18 <= h!,
          `${f.id} 이름표 자리`,
        ).toBe(true);
      }
    }
  });

  it("the fixture itself is a valid bank on real sections", () => {
    expect(conceptBlankBankSchema.safeParse(FIXTURE_BANK).success).toBe(true);
    for (const item of everyItem(FIXTURE_BANK))
      expect(getBlankSection(item.section), item.id).toBeDefined();
  });
});
