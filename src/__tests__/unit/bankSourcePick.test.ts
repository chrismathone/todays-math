/**
 * 문제은행 «출처 고르기» 창 안의 셈 (D-161 H1) — 요청 없이 센다(⑷ [적용] 전에는 목록 요청이 안 나간다).
 * 수는 시안(`/dev/bank-source-hifi`)의 셈과 같은 규칙이다: 책을 안 고르면 교과서 전부, 종류를 안 고르면 종류 전부.
 */
import { describe, expect, it } from "vitest";

import type { BankSourceCounts } from "@/contracts/bankSource.contract";
import {
  booksText,
  kindCount,
  kindsText,
  leavesGrade,
  matchedCount,
  openingGrade,
  sourceFieldText,
} from "@/components/unified/bankSourcePick";

const KIM = "00000000-0000-4000-8000-00000000b001";
const JANG = "00000000-0000-4000-8000-00000000b002";
const RYU = "00000000-0000-4000-8000-00000000b003";
const NOAUTHOR = "00000000-0000-4000-8000-00000000b004";

const counts: BankSourceCounts = {
  sources: {
    total: 120,
    engine: 90,
    school_textbook: 25,
    past_exam: 3,
    other: 2,
  },
  textbook: {
    total: 25,
    grades: ["중1", "중2", "공통수학1"],
    kinds: ["기초 연산", "형성 평가", "대단원 평가", "서술형 평가"],
    books: [
      {
        id: KIM,
        grade: "중1",
        publisher: "천재교육",
        author: "김화경",
        title: "중학 수학1",
        count: 10,
        open: 9,
        materials: 4,
        kinds: { "기초 연산": 6, "형성 평가": 3, "대단원 평가": 1 },
      },
      {
        id: JANG,
        grade: "중1",
        publisher: "지학사",
        author: "장경윤",
        title: "중학 수학1",
        count: 5,
        open: 5,
        materials: 2,
        kinds: { "대단원 평가": 5 },
      },
      {
        id: RYU,
        grade: "중2",
        publisher: "YBM",
        author: "류희찬",
        title: "중학 수학2",
        count: 6,
        open: 6,
        materials: 2,
        kinds: { "서술형 평가": 6 },
      },
      {
        id: NOAUTHOR,
        grade: "공통수학1",
        publisher: "비상교육",
        author: null,
        title: "공통수학1",
        count: 2,
        open: 2,
        materials: 1,
        kinds: { "기초 연산": 2 },
      },
    ],
  },
};

describe("걸리는 문항 · 고른 책에 맞춘 자료 종류별 수", () => {
  it("아무것도 안 고르면 교과서 전부 — 자료 없는 문항까지 든 수(textbook.total)", () => {
    expect(matchedCount(counts, [], [])).toBe(25);
  });

  it("책만 고르면 그 책들의 실린 수의 합", () => {
    expect(matchedCount(counts, [KIM, RYU], [])).toBe(16);
  });

  it("종류만 고르면 모든 책의 그 종류 합 · 책과 종류를 같이 고르면 «그리고»", () => {
    expect(matchedCount(counts, [], ["대단원 평가"])).toBe(6);
    expect(matchedCount(counts, [KIM], ["대단원 평가", "형성 평가"])).toBe(4);
  });

  it("자료 종류의 수는 고른 책에 맞춰 바뀐다 — 책을 안 고르면 모든 책", () => {
    expect(kindCount(counts, [], "기초 연산")).toBe(8);
    expect(kindCount(counts, [JANG], "기초 연산")).toBe(0);
    expect(kindCount(counts, [JANG, KIM], "대단원 평가")).toBe(6);
  });
});

describe("칸 · 칩의 글", () => {
  it("출처 칸 — 전체 출처 · 갈래 이름 · 교과서 · 책 · 자료", () => {
    expect(sourceFieldText(counts, { group: "", books: [], kinds: [] })).toBe(
      "전체 출처",
    );
    expect(
      sourceFieldText(counts, { group: "engine", books: [], kinds: [] }),
    ).toBe("엔진");
    expect(
      sourceFieldText(counts, {
        group: "school_textbook",
        books: [],
        kinds: [],
      }),
    ).toBe("교과서 · 책 전부 · 자료 전부");
    expect(
      sourceFieldText(counts, {
        group: "school_textbook",
        books: [KIM, JANG],
        kinds: ["대단원 평가", "형성 평가"],
      }),
    ).toBe("교과서 · 중1 천재교육(김화경) 외 1권 · 대단원 평가 외 1");
  });

  it("책 글은 «과목 출판사(저자)», 저자가 없으면 괄호를 안 단다 · 수를 모르면 권수만", () => {
    expect(booksText(counts, [NOAUTHOR])).toBe("공통수학1 비상교육");
    expect(booksText(null, [KIM, JANG])).toBe("2권");
  });

  it("자료 글은 고른 차례 그대로의 첫 종류 + 외 n", () => {
    expect(kindsText(["형성 평가"])).toBe("형성 평가");
    expect(kindsText(["대단원 평가", "형성 평가", "기초 연산"])).toBe(
      "대단원 평가 외 2",
    );
  });
});

describe("창은 필터 줄의 학년을 따라 열린다 (⑶)", () => {
  it("학년 칸의 과목에 책이 있으면 그 과목부터, 없으면 고른 책의 과목, 그것도 없으면 첫 과목", () => {
    expect(openingGrade(counts, "중2", [])).toBe("중2");
    expect(openingGrade(counts, "중3", [KIM])).toBe("중1");
    expect(openingGrade(counts, "", [RYU])).toBe("중2");
    expect(openingGrade(counts, "", [])).toBe("중1");
  });

  it("학년 칸과 다른 과목의 책을 고르면 적용 때 학년이 «전체 학년»으로 — 학년이 비어 있으면 그대로", () => {
    expect(leavesGrade(counts, "중1", [KIM, JANG])).toBe(false);
    expect(leavesGrade(counts, "중1", [KIM, RYU])).toBe(true);
    expect(leavesGrade(counts, "", [RYU])).toBe(false);
  });
});
