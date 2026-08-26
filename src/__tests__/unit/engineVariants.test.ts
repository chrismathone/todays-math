/**
 * 문항류마다 숫자 변형 3개. 답이 같거나 글자까지 같으면 변형이 아니다.
 * 공간이 좁아 3개를 못 채우면 조용히 모자란 세트를 내지 않고 던진다.
 */
import { describe, expect, it } from "vitest";

import { collectDistinctVariants } from "@/lib/engine/variants";

describe("collectDistinctVariants", () => {
  it("발문+정답이 다른 것을 n개 모은다", () => {
    const got = collectDistinctVariants(
      (v) => ({ content: `값 ${v}`, answer: `$${v + 1}$` }),
      3,
    );
    expect(got).toHaveLength(3);
    expect(new Set(got.map((g) => g.content + g.answer)).size).toBe(3);
  });

  it("글자가 같은 산출은 세지 않는다", () => {
    let calls = 0;
    const got = collectDistinctVariants((v) => {
      calls += 1;
      // 짝수 variant 는 전부 같은 글자
      if (v % 2 === 0) return { content: "같음", answer: "$1$" };
      return { content: `다름 ${v}`, answer: `$${v}$` };
    }, 3);
    expect(got).toHaveLength(3);
    expect(calls).toBeGreaterThan(3);
    expect(got.filter((g) => g.content === "같음")).toHaveLength(1);
  });

  it("공간이 좁으면 던진다 — 모자란 세트를 조용히 안 낸다", () => {
    expect(() =>
      collectDistinctVariants(
        () => ({ content: "항상 같음", answer: "$1$" }),
        3,
      ),
    ).toThrow(/변형 공간/);
  });

  it("n=3 이 기본 목표다 — 호출부가 3을 빼도 빨개지게 리터럴로 잠근다", () => {
    const got = collectDistinctVariants(
      (v) => ({ content: `s${v}`, answer: `$${v}$` }),
      3,
    );
    expect(got).toHaveLength(3);
  });
});
