/**
 * 개념 백지 은행의 문지기(D-150) — 학년 트랙 일곱이 모두 이 시험을 통과해야 병합한다.
 * 꼴(계약) · 열쇠가 교육과정에 있나 · 파일이 제 학년만 담나 · id 겹침 · 핵심어 · 그림 이름표 자리.
 */
import { describe, expect, it } from "vitest";
import {
  blankKeywords,
  conceptBlankBankSchema,
  splitBlankSentence,
} from "@/contracts/conceptBlank.contract";
import {
  BANK_PARTS,
  CONCEPT_BLANK_BANK,
  sectionStock,
} from "@/lib/concept-blank/bank";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  bankNotationFaults,
  notationFaults,
} from "@/lib/concept-blank/notation";
import { BLANK_SECTIONS, getBlankSection } from "@/lib/concept-blank/sections";

const PART_GRADES: Record<string, readonly string[]> = {
  e3: ["초3"],
  e4: ["초4"],
  e5: ["초5"],
  e6: ["초6"],
  m1: ["중1"],
  m2: ["중2"],
  m3: ["중3"],
};

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
  it.each(Object.keys(BANK_PARTS))(
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
  });

  it("ids are unique across the whole bank and the fixture", () => {
    const ids = [...everyItem(), ...everyItem(FIXTURE_BANK)].map((x) => x.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
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
