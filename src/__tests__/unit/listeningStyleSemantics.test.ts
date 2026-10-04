// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listeningStyleSemanticWarnings } from "@/lib/english/listening/reconstructionStyleSemantics";
const item = (correct: string, prompt = "When will the shipment arrive?") => ({
  prompt,
  choices: ["one", "two", correct, "four", "five"],
  correctChoiceOneBased: 3,
  questionType: "number" as const,
});
const warnings = (a: string, b: string, prompt?: string) =>
  listeningStyleSemanticWarnings(
    item(a),
    item(b, prompt ?? "대화를 듣고, 받을 시각을 고르시오."),
  );
describe("literal reconstructed answer meaning guard", () => {
  it("holds the actual by-Friday-to-exact-Friday regression", () => {
    expect(warnings("By this Friday", "금요일")).toContain("dropped_deadline");
    expect(warnings("By this Friday", "금요일까지")).toEqual([]);
    expect(
      warnings(
        "By this Friday",
        "금요일",
        "대화를 듣고, 늦어도 언제까지 받을 수 있는지 고르시오.",
      ),
    ).toEqual([]);
  });
  it("preserves before/after instead of reversing or silently losing them", () => {
    expect(warnings("Before Friday", "금요일 전까지")).toEqual([]);
    expect(warnings("Before Friday", "금요일 후에")).toContain(
      "before_changed_to_after",
    );
    expect(warnings("After Friday", "금요일 전에")).toContain(
      "after_changed_to_before",
    );
    expect(warnings("After Friday", "금요일")).toContain("dropped_after");
    expect(warnings("On Friday", "금요일까지")).toContain("added_deadline");
    expect(warnings("By Friday", "금요일 전까지")).toContain("added_before");
  });
  it("holds lost approximate or minimum/maximum quantity meaning", () => {
    expect(warnings("About $40", "40달러")).toContain("dropped_approximate");
    expect(warnings("About $40", "약 40달러")).toEqual([]);
    expect(warnings("At least $20", "20달러")).toContain("dropped_minimum");
    expect(warnings("At least $20", "20달러 이상")).toEqual([]);
    expect(warnings("At most $20", "20달러 이하")).toEqual([]);
  });
  it("permits equivalent currency/duration conversion but rejects changed quantities or kinds", () => {
    expect(warnings("$40", "40달러")).toEqual([]);
    expect(warnings("$40", "40달러", "대화를 듣고 금액을 고르시오.")).toEqual(
      [],
    );
    expect(warnings("$40", "40", "대화를 듣고 금액(달러)을 고르시오.")).toEqual(
      [],
    );
    expect(warnings("$40", "40유로")).toContain(
      "quantity_unit_changed_or_dropped",
    );
    expect(warnings("$40", "45달러")).toContain("quantity_value_changed");
    expect(warnings("25 cents", "$0.25")).toEqual([]);
    expect(warnings("Two hours", "120분")).toEqual([]);
    expect(warnings("Twenty-five minutes", "25분")).toEqual([]);
    expect(warnings("Two weeks", "14일")).toEqual([]);
    expect(warnings("Two hours", "2분")).toContain("quantity_value_changed");
    expect(warnings("Two hours", "2개월")).toContain(
      "quantity_unit_changed_or_dropped",
    );
  });
  it("keeps weekdays and equivalent 12-hour/24-hour clocks", () => {
    expect(warnings("On Friday", "금요일")).toEqual([]);
    expect(warnings("On Friday", "목요일")).toContain(
      "weekday_changed_or_dropped",
    );
    expect(warnings("5:30 p.m.", "오후 5시 30분")).toEqual([]);
    expect(warnings("5 p.m.", "17:00")).toEqual([]);
    expect(warnings("12 a.m.", "00:00")).toEqual([]);
    expect(warnings("12 p.m.", "12:00")).toEqual([]);
    expect(warnings("5 p.m.", "오전 5시")).toContain(
      "clock_time_changed_or_dropped",
    );
  });
  it("checks the immutable correct position and leaves unrelated style wording to its separate verifier", () => {
    const old = item("By Friday"),
      revised = item("금요일");
    revised.choices[0] = "금요일까지";
    expect(listeningStyleSemanticWarnings(old, revised)).toContain(
      "dropped_deadline",
    );
    expect(warnings("To buy a square watch", "네모난 시계를 사려고")).toEqual(
      [],
    );
    expect(warnings("By bus", "버스로")).toEqual([]);
    expect(warnings("Three tickets", "표 2장")).toContain(
      "literal_numbers_changed_or_dropped",
    );
  });
});
