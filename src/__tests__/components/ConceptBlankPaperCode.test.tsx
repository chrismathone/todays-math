/**
 * 개념 백지 지면 코드 줄(트랙 cb-code) — 학생지 · 채점표 **모든 장** 맨 아래에 «코드 · 쪽/전체쪽 · 학생지|채점표».
 *
 * 보는 것 — 모든 장에 코드와 쪽 번호가 있다 · 쪽 번호는 몫(학생지 · 채점표)마다 형식을 넘어 1 부터 이어 센다
 * (같은 코드 안에서 «쪽 · 몫»이 장 하나를 가리킨다 — 형식이 여럿이어도) · 학생지와 채점표의 코드 몸이 같다 ·
 * 코드가 없으면 줄도 없다 · 인쇄 · 미리보기가 같은 쪽 나누기라 view 를 바꿔도 번호가 같다.
 * ⚠️ 줄의 높이 · 넘침은 jsdom 이 못 잰다 — `e2e/concept-blank-paper` 가 인쇄 매체로 잰다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import { SHEET_CODE_LINE_CAPACITY } from "@/components/concept-blank/paper/paginate";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { composeSheets } from "@/lib/concept-blank/compose";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";

const ALL = { 하: 40, 중: 40, 상: 40 };
const NONE = { 하: 0, 중: 0, 상: 0 };
const SELECTION: ConceptBlankSelection = {
  sections: [
    ...new Set(
      [
        ...FIXTURE_BANK.concepts,
        ...FIXTURE_BANK.ox,
        ...FIXTURE_BANK.apply,
        ...FIXTURE_BANK.figures,
      ].map((x) => x.section),
    ),
  ],
  forms: [
    { form: "recall", counts: ALL, extras: NONE },
    { form: "term", counts: ALL, extras: ALL },
    { form: "cloze", counts: ALL, extras: ALL },
    { form: "map", counts: ALL, extras: NONE },
    { form: "figure", counts: ALL, extras: NONE },
  ],
  title: "합동과 대칭",
  date: "2026-10-01",
};
const SHEETS = composeSheets(SELECTION, FIXTURE_BANK);
const CODE = encodeSheetCode(SELECTION, FIXTURE_BANK);

/** 장마다 [몫, 코드 줄 글] — 지면 DOM 차례. */
function codeLines(view: "student" | "key" | "both", code = CODE) {
  render(<ConceptBlankPaper code={code} sheets={SHEETS} view={view} />);
  return [...document.querySelectorAll<HTMLElement>("[data-cb-page]")].map(
    (page) => ({
      part: page.dataset.cbPart!,
      lines: [...page.querySelectorAll<HTMLElement>("[data-cb-code]")],
    }),
  );
}

describe("지면 코드 줄 — 모든 장 맨 아래", () => {
  it("학생지 · 채점표의 모든 장에 코드 줄이 꼭 하나 있고, 장의 맨 끝 덩이다", () => {
    const pages = codeLines("both");
    expect(pages.length).toBeGreaterThan(SHEETS.length * 2);
    for (const { lines } of pages) expect(lines).toHaveLength(1);
    for (const page of document.querySelectorAll("[data-cb-page]"))
      expect(page.lastElementChild!.hasAttribute("data-cb-code")).toBe(true);
  });

  it("«코드 · 쪽/전체쪽 · 학생지|채점표» — 쪽 번호는 몫마다 형식을 넘어 1 부터 이어 센다", () => {
    const pages = codeLines("both");
    for (const part of ["student", "key"] as const) {
      const mine = pages.filter((p) => p.part === part);
      const label = part === "student" ? "학생지" : "채점표";
      mine.forEach(({ lines }, i) =>
        expect(lines[0]!.textContent).toBe(
          `${CODE} · ${i + 1}/${mine.length} · ${label}`,
        ),
      );
    }
  });

  it("학생지와 채점표의 코드 몸이 같다 — 같은 고르기에서 나온 한 묶음", () => {
    const bodies = new Set(
      codeLines("both").map(({ lines }) => lines[0]!.dataset.cbCode),
    );
    expect([...bodies]).toEqual([CODE]);
  });

  it("view 를 바꿔도 같은 장에는 같은 번호 — 학생지만 · 채점표만 뽑아도 «둘 다»와 같다", () => {
    const text = (view: "student" | "key" | "both") => {
      const out = codeLines(view).map(({ lines }) => lines[0]!.textContent);
      document.body.innerHTML = "";
      return out;
    };
    const both = text("both");
    expect([...text("student"), ...text("key")]).toEqual(both);
  });

  it("한 줄 정원 안이면 코드가 찍히고, 넘으면 «코드 없음 · 쪽/전체쪽 · 몫»(쪽 번호는 남는다 — 리드 2026-10-01)", () => {
    /** 판 번호 `1` 뒤를 넓은 글자로 채운 n 글자 코드(네 글자마다 점). */
    const long = (n: number) =>
      `1${"W".repeat(n - 1)}`.replace(/(.{4})(?=.)/g, "$1.");
    const fits = codeLines("both", long(SHEET_CODE_LINE_CAPACITY));
    expect(fits[0]!.lines[0]!.textContent).toBe(
      `${long(SHEET_CODE_LINE_CAPACITY)} · 1/${fits.filter((p) => p.part === "student").length} · 학생지`,
    );
    document.body.innerHTML = "";

    const over = codeLines("both", long(SHEET_CODE_LINE_CAPACITY + 1));
    const students = over.filter((p) => p.part === "student").length;
    expect(over[0]!.lines[0]!.textContent).toBe(
      `코드 없음 · 1/${students} · 학생지`,
    );
    expect(over[0]!.lines[0]!.dataset.cbCode).toBe("");
    expect(over.at(-1)!.lines[0]!.textContent).toMatch(
      /^코드 없음 · \d+\/\d+ · 채점표$/,
    );
    expect(document.body.textContent).not.toContain("WWWW");
  });

  it("코드를 안 주면 코드 줄도 없다(지면의 다른 것은 그대로)", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="both" />);
    expect(document.querySelector("[data-cb-code]")).toBeNull();
    expect(document.querySelectorAll("[data-cb-page]").length).toBeGreaterThan(
      0,
    );
  });
});
