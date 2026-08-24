/**
 * 중학 유형 목록 고르기 — `scripts/middle/listing.ts`.
 *
 * 이 검사가 지키는 것은 **「고를 수 있는 크기로 줄이는 규칙」**이다. `--list` 는
 * 715줄이라 대화로 못 쓰고, 줄이는 규칙이 틀리면 **목록이 조용히 비거나** 반대로
 * 안 줄어든다 — 둘 다 에러가 아니라 「그냥 이상한 화면」으로 나타난다.
 *
 * ⚠️ 살아 있나 확인은 **제품을 거치지 않는다** — 손으로 지은 항목으로 먼저
 * 「거르는 일을 하긴 하나」를 본다. 실제 등록표만 보면, 등록표가 어느 날
 * 한 학년만 남아도 검사는 초록이다(구조적으로 0을 못 가른다).
 */
import { describe, expect, it } from "vitest";

import { filterEntries, sectionSummary } from "../../../scripts/middle/listing";
import { registeredTypes } from "../../lib/middle/generate";
import type { TypeEntry } from "../../lib/middle/types";

/** 손으로 지은 표본 — 제품 등록표와 무관하게 규칙 자체를 잰다. */
function fake(
  grade: string,
  book: string,
  section: string,
  minor: string,
  type: string,
  title: string,
): TypeEntry {
  return {
    key: `${book}|${minor}|${type}`,
    grade,
    unitSection: section,
    rpmBook: book,
    rpmMinor: minor,
    rpmType: type,
    rpmTitle: title,
    handler: () => {
      throw new Error("이 검사는 생성기를 부르지 않는다");
    },
  };
}

const SAMPLE: TypeEntry[] = [
  fake("중1", "1-1", "소인수분해", "소인수분해", "01", "거듭제곱"),
  fake("중1", "1-1", "소인수분해", "소인수분해", "02", "소인수분해하기"),
  fake(
    "중3",
    "3-1",
    "이차함수와 그래프",
    "이차함수의 그래프 ⑴",
    "01",
    "이차함수의 뜻",
  ),
  fake("중3", "3-2", "원주각", "원주각", "01", "원주각과 중심각"),
];

describe("[중학 목록] 거르기", () => {
  it("조건이 없으면 전량을 그대로 돌려준다 — 빈 조건은 «아무것도 없음»이 아니다", () => {
    expect(filterEntries(SAMPLE, {})).toHaveLength(SAMPLE.length);
  });

  it("학년으로 거른다", () => {
    const got = filterEntries(SAMPLE, { grade: "중3" });
    expect(got.map((e) => e.rpmBook)).toEqual(["3-1", "3-2"]);
  });

  it("책으로 거른다 — 같은 학년의 다른 책은 빠진다", () => {
    const got = filterEntries(SAMPLE, { book: "3-1" });
    expect(got).toHaveLength(1);
    expect(got[0]!.unitSection).toBe("이차함수와 그래프");
  });

  it("자유 검색은 유형 제목에서도 걸린다 — 단원명만 보면 못 찾는다", () => {
    // 「거듭제곱」은 unitSection·rpmMinor 어디에도 없고 rpmTitle 에만 있다.
    const got = filterEntries(SAMPLE, { q: "거듭제곱" });
    expect(got).toHaveLength(1);
    expect(got[0]!.rpmType).toBe("01");
  });

  it("조건 둘은 **함께** 걸린다 (하나만 맞으면 빠진다)", () => {
    expect(filterEntries(SAMPLE, { grade: "중3", book: "1-1" })).toHaveLength(
      0,
    );
  });
});

describe("[중학 목록] 단원으로 접기", () => {
  it("단원마다 한 줄로 접고 개수를 센다", () => {
    const rows = sectionSummary(SAMPLE);
    expect(rows.map((r) => [r.unitSection, r.count])).toEqual([
      ["소인수분해", 2],
      ["이차함수와 그래프", 1],
      ["원주각", 1],
    ]);
  });

  it("등록 순서를 지킨다 — 정렬하면 진도 순서가 깨진다", () => {
    const rows = sectionSummary(SAMPLE);
    expect(rows[0]!.grade).toBe("중1");
    expect(rows.at(-1)!.grade).toBe("중3");
  });

  it("한 단원이 두 책에 걸치면 둘 다 적는다", () => {
    const mixed = [
      ...SAMPLE,
      fake("중3", "3-2", "이차함수와 그래프", "삼각비", "09", "곁가지"),
    ];
    const row = sectionSummary(mixed).find(
      (r) => r.unitSection === "이차함수와 그래프",
    )!;
    expect(row.books).toEqual(["3-1", "3-2"]);
  });
});

describe("[중학 목록] 실제 등록표", () => {
  it("접은 줄 수가 유형 수보다 훨씬 적다 — 그래야 대화로 고를 수 있다", () => {
    const all = registeredTypes();
    const rows = sectionSummary(all);
    expect(all.length).toBeGreaterThan(700);
    // 715유형 → 110단원 남짓. 「줄었다」를 반증 가능한 형태로 못 박는다.
    expect(rows.length).toBeLessThan(all.length / 4);
    // 접으면서 하나도 잃지 않는다.
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(all.length);
  });

  it("학년 셋이 다 있다 — 한 학년만 남아도 위 검사는 초록이다", () => {
    const grades = new Set(registeredTypes().map((e) => e.grade));
    expect([...grades].sort()).toEqual(["중1", "중2", "중3"]);
  });
});
