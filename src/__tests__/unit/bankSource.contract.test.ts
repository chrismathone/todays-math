/**
 * 문제은행 «출처 고르기»(H1 · D-161) 계약 — 출처 갈래 · 학기 · 책 · 자료 종류 거르기와 고르기 창의 수.
 *
 * 쿼리스트링은 전부 문자열이라, 여럿 고르기(책 · 자료 종류)는 **쉼표로 이은 한 값**으로 온다
 * (이웃 필터와 같은 «열쇠 하나 · 값 하나» 꼴). 계약이 그것을 배열로 풀고 하나하나 검사한다.
 */
import { describe, expect, it } from "vitest";

import { problemSourceSchema } from "@/contracts/common.contract";
import {
  BANK_SOURCE_GROUP_SOURCES,
  BANK_SOURCE_GROUPS,
  bankSourceCountsSchema,
  unifiedBankQuerySchema,
} from "@/contracts/bankSource.contract";
import { SOURCE_MATERIAL_KINDS } from "@/contracts/sourceMaterial.contract";

const BOOK_A = "00000000-0000-4000-8000-00000000b00a";
const BOOK_B = "00000000-0000-4000-8000-00000000b00b";

describe("출처 갈래 — 출처 줄의 전체 · 엔진 · 교과서 · 기출 · 그 밖", () => {
  it("갈래 넷이 출처 값 다섯을 하나씩 빠짐없이 나눠 갖는다", () => {
    const owned = BANK_SOURCE_GROUPS.flatMap((group) => [
      ...BANK_SOURCE_GROUP_SOURCES[group],
    ]);
    expect([...owned].sort()).toEqual([...problemSourceSchema.options].sort());
    expect(new Set(owned).size).toBe(owned.length);
  });

  it("엔진은 source manual 전부 · 그 밖은 변형과 AI 생성이다(리드 결정 2026-10-08)", () => {
    expect(BANK_SOURCE_GROUP_SOURCES.engine).toEqual(["manual"]);
    expect([...BANK_SOURCE_GROUP_SOURCES.other].sort()).toEqual([
      "ai_generated",
      "transformed",
    ]);
  });
});

describe("unifiedBankQuerySchema — 목록 · 랜덤 추가가 같이 쓰는 조회 조건", () => {
  it("책 · 자료 종류는 쉼표로 이은 값을 배열로 풀고 겹친 것은 하나로 둔다", () => {
    const parsed = unifiedBankQuerySchema.parse({
      sourceGroup: "school_textbook",
      books: `${BOOK_A},${BOOK_B},${BOOK_A}`,
      materialKinds: "대단원 평가,형성 평가",
    });
    expect(parsed.books).toEqual([BOOK_A, BOOK_B]);
    expect(parsed.materialKinds).toEqual(["대단원 평가", "형성 평가"]);
  });

  it("책 열쇠는 source_book.id(uuid)만 받는다", () => {
    expect(
      unifiedBankQuerySchema.safeParse({
        sourceGroup: "school_textbook",
        books: "중1|천재교육|김화경",
      }).success,
    ).toBe(false);
  });

  it("자료 종류는 계약의 목록(SOURCE_MATERIAL_KINDS) 밖의 값을 거절한다", () => {
    for (const kind of SOURCE_MATERIAL_KINDS)
      expect(
        unifiedBankQuerySchema.safeParse({
          sourceGroup: "school_textbook",
          materialKinds: kind,
        }).success,
      ).toBe(true);
    expect(
      unifiedBankQuerySchema.safeParse({
        sourceGroup: "school_textbook",
        materialKinds: "형성평가",
      }).success,
    ).toBe(false);
  });

  it("빈 조각만 있는 값은 «고른 것 없음»이 아니라 잘못된 값이다 — 화면은 빈 고르기를 아예 안 보낸다", () => {
    expect(
      unifiedBankQuerySchema.safeParse({
        sourceGroup: "school_textbook",
        books: ",",
      }).success,
    ).toBe(false);
  });

  it("책 · 자료 종류는 출처가 교과서일 때만 받는다 — 다른 출처와 섞이면 조용히 0건이 되므로 400 으로 알린다", () => {
    expect(unifiedBankQuerySchema.safeParse({ books: BOOK_A }).success).toBe(
      false,
    );
    expect(
      unifiedBankQuerySchema.safeParse({
        sourceGroup: "engine",
        materialKinds: "형성 평가",
      }).success,
    ).toBe(false);
    // 옛 단일 출처 값으로 교과서를 고른 호출도 받는다(랜덤 추가 · 다른 화면 호환)
    expect(
      unifiedBankQuerySchema.safeParse({
        source: "school_textbook",
        books: BOOK_A,
      }).success,
    ).toBe(true);
  });

  it("학기는 1 · 2 만 받는다(차시의 unit.semester)", () => {
    expect(unifiedBankQuerySchema.parse({ semester: "1" }).semester).toBe("1");
    expect(unifiedBankQuerySchema.parse({ semester: "2" }).semester).toBe("2");
    expect(unifiedBankQuerySchema.safeParse({ semester: "3" }).success).toBe(
      false,
    );
  });

  it("출처 갈래는 넷만 받고, 옛 단일 출처(source)도 그대로 받는다", () => {
    for (const group of BANK_SOURCE_GROUPS)
      expect(
        unifiedBankQuerySchema.safeParse({ sourceGroup: group }).success,
      ).toBe(true);
    expect(
      unifiedBankQuerySchema.safeParse({ sourceGroup: "manual" }).success,
    ).toBe(false);
    expect(unifiedBankQuerySchema.safeParse({ source: "manual" }).success).toBe(
      true,
    );
  });

  it("모르는 열쇠는 거절한다(엄격) — 쓰지 않는 조건이 조용히 무시되지 않게", () => {
    expect(unifiedBankQuerySchema.safeParse({ pool: "shared" }).success).toBe(
      false,
    );
    expect(unifiedBankQuerySchema.safeParse({ book: BOOK_A }).success).toBe(
      false,
    );
  });
});

describe("bankSourceCountsSchema — 고르기 창이 받는 수", () => {
  const sample = {
    sources: {
      total: 109261,
      engine: 100794,
      school_textbook: 8370,
      past_exam: 82,
      other: 15,
    },
    textbook: {
      total: 8370,
      grades: ["중1", "중2"],
      kinds: [...SOURCE_MATERIAL_KINDS],
      books: [
        {
          id: BOOK_A,
          grade: "중1",
          publisher: "천재교육",
          author: "김화경",
          title: "중학 수학1",
          count: 811,
          open: 798,
          materials: 139,
          kinds: { "기초 연산": 455, "형성 평가": 113 },
        },
      ],
    },
  };

  it("갈래마다 수가 하나씩 있고, 책마다 자료 종류별 수를 싣는다", () => {
    expect(bankSourceCountsSchema.parse(sample)).toEqual(sample);
  });

  it("갈래 하나라도 빠지면 거절한다 — 화면이 «0»으로 지어내지 않게", () => {
    const { other: _other, ...sources } = sample.sources;
    expect(
      bankSourceCountsSchema.safeParse({ ...sample, sources }).success,
    ).toBe(false);
  });

  it("저자가 없는 책도 받는다(source_book.author 는 NULL 이 될 수 있다)", () => {
    const book = { ...sample.textbook.books[0], author: null };
    expect(
      bankSourceCountsSchema.safeParse({
        ...sample,
        textbook: { ...sample.textbook, books: [book] },
      }).success,
    ).toBe(true);
  });
});
