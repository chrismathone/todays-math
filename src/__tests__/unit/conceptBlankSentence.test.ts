/**
 * 뜻 문장의 핵심어 가르기(D-150) — `$...$` 안의 `{ }` 는 TeX 묶음이지 핵심어가 아니다.
 * 중3 트랙이 근의 공식 · `\sqrt{12}` 를 뜻 문장에 못 써서 글자로 돌아갔다(2026-09-30) — 계약과 지면이 같은 가르기를 쓴다.
 */
import { describe, expect, it } from "vitest";
import {
  blankKeywords,
  blankSentenceSchema,
  splitBlankSentence,
} from "@/contracts/conceptBlank.contract";

const ok = (s: string) => blankSentenceSchema.safeParse(s).success;

describe("blank sentence keywords", () => {
  it("keeps TeX groups inside math out of the keywords", () => {
    const s = String.raw`$\sqrt{12}=2\sqrt{3}$ 처럼 근호 안을 {가장 작은 자연수}로 만든다.`;
    expect(blankKeywords(s)).toEqual(["가장 작은 자연수"]);
    expect(ok(s)).toBe(true);
  });

  it("splits text, math and keywords in reading order", () => {
    const s = String.raw`해는 $x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}$ 이고 이를 {근의 공식}이라 한다.`;
    expect(splitBlankSentence(s)).toEqual([
      {
        kind: "text",
        text: String.raw`해는 $x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}$ 이고 이를 `,
      },
      { kind: "key", text: "근의 공식" },
      { kind: "text", text: "이라 한다." },
    ]);
    expect(ok(s)).toBe(true);
  });

  it("is unchanged for sentences without math", () => {
    const s = "{유리수}와 {무리수}를 한데 모아 실수라고 부른다.";
    expect(blankKeywords(s)).toEqual(["유리수", "무리수"]);
    expect(ok(s)).toBe(true);
  });

  it("does not count math groups toward the 1~4 keyword rule", () => {
    // 수식 묶음만 있고 핵심어가 없다
    expect(ok(String.raw`분수 $\frac{1}{2}$ 은 절반을 나타내는 수이다.`)).toBe(
      false,
    );
    // 핵심어 넷 + 수식 묶음 여럿 — 넷으로 센다
    expect(
      ok(
        String.raw`{가}와 {나}, {다}와 {라}는 $\frac{1}{2}+\frac{1}{3}$ 과 상관없이 넷이다.`,
      ),
    ).toBe(true);
    expect(ok("{가} {나} {다} {라} {마} 다섯은 너무 많다.")).toBe(false);
  });

  // 원장님 2026-09-30 «카텍스 사용할 것» — 빈칸의 답이 식이면 핵심어에 수식을 그대로 싣는다.
  it("lets a keyword carry math, TeX groups and all", () => {
    const s = String.raw`이차방정식 $ax^2+bx+c=0$ 의 해는 $x=$ {$\frac{-b\pm\sqrt{b^2-4ac}}{2a}$} 이다.`;
    expect(blankKeywords(s)).toEqual([
      String.raw`$\frac{-b\pm\sqrt{b^2-4ac}}{2a}$`,
    ]);
    expect(ok(s)).toBe(true);
    const mixed = String.raw`$\cos 30^\circ=$ {$\frac{\sqrt{3}}{2}$}, $\tan 45^\circ=$ {1}이다.`;
    expect(blankKeywords(mixed)).toEqual([
      String.raw`$\frac{\sqrt{3}}{2}$`,
      "1",
    ]);
    expect(ok(mixed)).toBe(true);
    expect(ok("제곱해서 {$a$}가 되는 수를 제곱근이라 한다.")).toBe(true);
  });

  it("still rejects stray braces outside math and unclosed math in a keyword", () => {
    expect(ok("수식이 안 닫힌 {$a} 핵심어가 있는 문장은 안 된다.")).toBe(false);
    expect(ok("짝이 없는 { 괄호가 있는 {문장}은 안 된다.")).toBe(false);
    expect(ok("닫기만 하는 } 괄호가 있는 {문장}도 안 된다.")).toBe(false);
    expect(ok("겹친 {핵심어 {안의} 괄호}는 안 된다.")).toBe(false);
  });
});
