import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { encodeSelection } from "@/lib/concept-blank/selectionCodec";

beforeEach(() => {
  window.history.replaceState(
    null,
    "",
    `/?blank=${encodeSelection({
      sections: [FIXTURE_BANK.concepts[0].section],
      forms: [
        {
          form: "term",
          counts: { 하: 1, 중: 0, 상: 0 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
    })}#conceptBlank`,
  );
});
afterEach(() => window.history.replaceState(null, "", "/"));

describe("개념 백지의 상단·하단 지면 전환", () => {
  it.each(["인쇄할 지면", "미리보기 지면"])(
    "%s에서 바꾸면 양쪽 선택·실제 지면·인쇄 주소가 함께 바뀐다",
    (groupName) => {
      render(<ConceptBlankView bank={FIXTURE_BANK} />);
      const preview = screen.getByRole("region", { name: "미리보기" });
      const parts = () =>
        [...preview.querySelectorAll<HTMLElement>("[data-cb-part]")].map(
          (page) => page.dataset.cbPart,
        );
      expect(parts()).toEqual(["student", "key"]);
      const selection = window.location.search;
      for (const [label, view, expected] of [
        ["학생지", "student", ["student"]],
        ["채점표", "key", ["key"]],
        ["전체", "both", ["student", "key"]],
      ] as const) {
        fireEvent.click(
          within(screen.getByRole("group", { name: groupName })).getByRole(
            "button",
            { name: label },
          ),
        );
        for (const name of ["인쇄할 지면", "미리보기 지면"]) {
          const group = within(screen.getByRole("group", { name }));
          for (const choice of ["학생지", "채점표", "전체"])
            expect(group.getByRole("button", { name: choice })).toHaveAttribute(
              "aria-pressed",
              String(choice === label),
            );
        }
        expect(parts()).toEqual(expected);
        const print = screen.getByRole("link", { name: "인쇄하기" });
        expect(
          new URL(print.getAttribute("href")!, location.href).searchParams.get(
            "view",
          ),
        ).toBe(view);
        expect(window.location.search).toBe(selection);
      }
    },
  );
});
