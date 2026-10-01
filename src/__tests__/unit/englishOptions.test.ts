/**
 * 보기 줄 — 지면과 편집 화면이 같이 쓰는 규칙 (D-151 · 3자 합의 25 §12.12 「3」).
 * 보기 값이 번호 글자뿐인데 지면이 번호를 한 번 더 붙여 «① ①»로 찍던 것.
 */
import { describe, expect, it } from "vitest";

import { englishOptionLayout } from "@/lib/english/options";

const MARKS = ["①", "②", "③", "④", "⑤"];

describe("englishOptionLayout", () => {
  it("보기 글이 있으면 번호 + 글 그대로", () => {
    const layout = englishOptionLayout({
      prompt: "윗글의 주제로 가장 적절한 것은?",
      options: ["a", "b", "c", "d", "e"],
    });
    expect(layout.omitted).toBe(false);
    expect(layout.lines).toEqual(
      ["a", "b", "c", "d", "e"].map((text, i) => ({ mark: MARKS[i], text })),
    );
  });

  it("삽입 — 다섯 보기가 번호뿐이고 발문에 ( ① )~( ⑤ ) 자리가 다 있으면 보기 줄을 찍지 않는다", () => {
    const layout = englishOptionLayout({
      prompt:
        "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?\n[주어진 문장] A B C.\n( ① ) One. ( ② ) Two. ( ③ ) Three. ( ④ ) Four. ( ⑤ ) Five.",
      options: [...MARKS],
    });
    expect(layout.omitted).toBe(true);
  });

  it("어법 — 번호뿐인 보기 · 발문의 밑줄 다섯", () => {
    const layout = englishOptionLayout({
      prompt:
        "밑줄 친 ①~⑤ 가운데 어법상 틀린 것을 고르시오.\nGroups ①<u>took</u> turns, ②<u>recorded</u>, ③<u>appeared</u>, ④<u>looking</u>, ⑤<u>avoided</u>.",
      options: ["1", "2", "3", "4", "5"],
    });
    expect(layout.omitted).toBe(true);
  });

  it("🔴 «①~⑤» 처럼 번호를 말로만 든 것은 자리가 아니다 — 자리 번호가 모자라면 번호만 다섯 줄(겹치지 않게)", () => {
    const layout = englishOptionLayout({
      prompt: "밑줄 친 ①~⑤ 가운데 어법상 틀린 것을 고르시오. (지문 없음)",
      options: [...MARKS],
    });
    expect(layout.omitted).toBe(false);
    expect(layout.lines).toEqual(MARKS.map((mark) => ({ mark, text: "" })));
  });

  it("보기 글이 자기 번호로 시작하면 그 번호 하나만 걷는다 — 다른 번호 · 글 속 번호는 그대로", () => {
    const layout = englishOptionLayout({
      prompt: "다음 중 어법상 틀린 것은?",
      options: ["① grow", "②has grown", "③ ① grew", "④ ⑤ grows", "growing ⑤"],
    });
    expect(layout.lines.map((line) => line.text)).toEqual([
      "grow",
      "has grown",
      "① grew",
      "⑤ grows",
      "growing ⑤",
    ]);
  });

  it("보기가 없는 서술형은 빈 줄 목록", () => {
    expect(englishOptionLayout({ prompt: "요약하시오.", options: [] })).toEqual(
      { omitted: false, lines: [] },
    );
  });
});
