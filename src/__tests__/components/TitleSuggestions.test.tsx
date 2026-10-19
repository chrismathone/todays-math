import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import TitleSuggestions from "@/components/unified/print/TitleSuggestions";
import { DEFAULT_DRAFT_TITLE } from "@/components/unified/draftStore";
import type { TitleSuggestion } from "@/components/unified/print/suggestTitles";

/**
 * W7 제목 추천(Hi-fi 1안) — 기본 제목 · 추천으로 정한 제목은 [적용]이 바로 바꾸고,
 * 직접 쓴 제목은 누른 줄 아래 노란 줄에서 한 번 묻는다.
 */
const ROWS: TitleSuggestion[] = [
  { id: "scope", label: "범위 이름", text: "중2 일차부등식의 해와 성질 외 2" },
  { id: "course", label: "과정 · 대단원 · 날짜", text: "중2-1 부등식 10.16" },
  { id: "date", label: "날짜 먼저", text: "10.16 중2 부등식" },
];
function Harness({ start = DEFAULT_DRAFT_TITLE }: { start?: string }) {
  const [title, setTitle] = useState(start);
  return (
    <>
      <label>
        제목
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <TitleSuggestions suggestions={ROWS} title={title} onApply={setTitle} />
    </>
  );
}
const field = () => screen.getByRole("textbox", { name: "제목" });
const apply = (text: string) =>
  fireEvent.click(screen.getByRole("button", { name: `${text} 적용` }));
afterEach(cleanup);

describe("title suggestions (W7 · Hi-fi 1)", () => {
  it("shows three labelled rows under the title", () => {
    render(<Harness />);
    const box = document.querySelector<HTMLElement>("[data-suggest]")!;
    expect(box).toHaveTextContent(
      "추천 제목범위 이름중2 일차부등식의 해와 성질 외 2적용과정 · 대단원 · 날짜중2-1 부등식 10.16적용날짜 먼저10.16 중2 부등식적용",
    );
  });

  it("replaces the default title at once, and another suggestion after that too", () => {
    render(<Harness />);
    apply(ROWS[0].text);
    expect(field()).toHaveValue(ROWS[0].text);
    expect(screen.queryByRole("alert")).toBeNull();
    apply(ROWS[1].text);
    expect(field()).toHaveValue(ROWS[1].text);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks in place before replacing a typed title — [그대로 두기] keeps it, [바꾸기] replaces", () => {
    render(<Harness start="중2A 화요일 시험" />);
    apply(ROWS[1].text);
    const ask = screen.getByRole("alert");
    expect(ask).toHaveTextContent(
      "직접 쓰신 제목 «중2A 화요일 시험»을 바꿀까요?",
    );
    // 누른 줄 바로 아래.
    expect(ask.closest("li")).toHaveTextContent(ROWS[1].text);
    expect(field()).toHaveValue("중2A 화요일 시험");
    fireEvent.click(within(ask).getByRole("button", { name: "그대로 두기" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field()).toHaveValue("중2A 화요일 시험");
    apply(ROWS[2].text);
    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", { name: "바꾸기" }),
    );
    expect(field()).toHaveValue(ROWS[2].text);
  });

  it("asks again once a suggested title has been edited by hand", () => {
    render(<Harness />);
    apply(ROWS[0].text);
    fireEvent.change(field(), { target: { value: `${ROWS[0].text} 2차` } });
    apply(ROWS[1].text);
    expect(screen.getByRole("alert")).toHaveTextContent(
      `직접 쓰신 제목 «${ROWS[0].text} 2차»을 바꿀까요?`,
    );
    expect(field()).toHaveValue(`${ROWS[0].text} 2차`);
  });
});
