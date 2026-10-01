/**
 * 지면 코드의 지문이 **쪽 나눔**까지 보는가(리뷰 2026-10-01). 코드의 «3/5 · 학생지»는 쪽 나눔 규칙이 정한 장을 가리킨다 —
 * 규칙(예산 · 천장 · 어림)이 바뀌면 같은 고르기 · 같은 은행이라도 그 장에 다른 문항이 든다. 지문이 은행만 보면 옛 코드가
 * «은행 그대로»로 읽혀 채점이 조용히 틀린다. 쪽 나눔 함수(`planSheet`)를 갈아 끼워 지문이 달라지는지 본다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";

const paging = vi.hoisted(() => ({ squeeze: false }));

vi.mock("@/components/concept-blank/paper/paginate", async (importOriginal) => {
  const real =
    await importOriginal<
      typeof import("@/components/concept-blank/paper/paginate")
    >();
  return {
    ...real,
    planSheet: (sheet: Parameters<typeof real.planSheet>[0]) => {
      const plan = real.planSheet(sheet);
      if (!paging.squeeze) return plan;
      // 쪽 나눔 규칙이 바뀐 셈 — 같은 문항이 다른 장 번호에 든다(학생지 장 차례를 뒤집는다 · 장이 둘 이상이어야 뜻이 있다)
      return { ...plan, student: [...plan.student].reverse() };
    },
  };
});

const { decodeSheetCode, encodeSheetCode, sheetBankDigest } =
  await import("@/lib/concept-blank/sheetCode");

const SECTIONS = [
  ...new Set(
    [...FIXTURE_BANK.concepts, ...FIXTURE_BANK.ox, ...FIXTURE_BANK.apply].map(
      (x) => x.section,
    ),
  ),
];
const SELECTION: ConceptBlankSelection = {
  sections: SECTIONS,
  forms: [
    {
      form: "term",
      counts: { 하: 6, 중: 6, 상: 6 },
      extras: { 하: 3, 중: 3, 상: 3 },
    },
  ],
};

afterEach(() => {
  paging.squeeze = false;
});

describe("지면 코드 지문 — 쪽 나눔", () => {
  it("쪽 나눔이 바뀌면 지문이 달라지고, 옛 코드는 «은행이 바뀜»으로 읽힌다", () => {
    const code = encodeSheetCode(SELECTION, FIXTURE_BANK);
    const before = sheetBankDigest(SELECTION, FIXTURE_BANK);
    expect(decodeSheetCode(code, FIXTURE_BANK)?.bankChanged).toBe(false);

    paging.squeeze = true;
    expect(sheetBankDigest(SELECTION, FIXTURE_BANK)).not.toBe(before);
    expect(decodeSheetCode(code, FIXTURE_BANK)?.bankChanged).toBe(true);
  });

  it("쪽 나눔이 그대로면 지문도 그대로다(같은 고르기 = 같은 코드)", () => {
    expect(encodeSheetCode(SELECTION, FIXTURE_BANK)).toBe(
      encodeSheetCode(SELECTION, FIXTURE_BANK),
    );
  });
});
