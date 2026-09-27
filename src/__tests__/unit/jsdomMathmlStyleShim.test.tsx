import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathText } from "@/components/math/MathText";

/**
 * 잠금 — `vitest.setup.ts` 의 MathML 계산된 스타일 심.
 *
 * jsdom 29.1.1 은 MathML(`<math>`)을 `style` 없는 `Element` 로 만들어 `getComputedStyle(math)` 가
 * `TypeError: … reading 'length'` 로 터진다. `getByRole(…, { name })` 은 모든 후보의 접근성 이름을 계산하며
 * (dom-accessibility-api) 보기 단추 안 KaTeX `<math>` 까지 내려가므로, KaTeX 가 그려진 화면에서 **이름으로
 * 단추를 찾는 시험이 순서에 따라** 터졌다(AuthenticatedMathSrs «grades a choice immediately…», 2026-09-27).
 * 심을 빼면 이 파일이 빨개진다.
 */
describe("jsdom MathML 계산된 스타일 심", () => {
  it("KaTeX(MathML 포함)를 보기 단추 안에 그려도 이름으로 단추를 찾는다", () => {
    render(
      <div role="group" aria-label="답 고르기">
        <button type="button">
          <MathText text="$\frac{1}{3}$" />
        </button>
        <button type="button">다음 문제</button>
      </div>,
    );
    const group = screen.getByRole("group", { name: "답 고르기" });
    // 전제: 제품 렌더러가 정말 MathML 을 그린다(안 그리면 이 시험은 아무것도 지키지 않는다)
    expect(group.querySelectorAll("math").length).toBeGreaterThan(0);
    expect(
      within(group).getByRole("button", { name: "다음 문제" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "정답 확인" }),
    ).not.toBeInTheDocument();
  });

  it("MathML 요소의 계산된 스타일은 빈 값이다 — 터지지 않는다", () => {
    const math = document.createElementNS(
      "http://www.w3.org/1998/Math/MathML",
      "math",
    );
    document.body.appendChild(math);
    const style = window.getComputedStyle(math);
    expect(style.getPropertyValue("display")).toBe("");
    expect(style.getPropertyValue("visibility")).toBe("");
    math.remove();
  });

  it("style 이 있는 HTML · SVG 요소는 jsdom 원래 계산 그대로다", () => {
    const div = document.createElement("div");
    div.style.display = "none";
    div.style.color = "red";
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div);
    expect(computed.getPropertyValue("display")).toBe("none");
    expect(computed.getPropertyValue("color")).toBe("rgb(255, 0, 0)");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.visibility = "hidden";
    document.body.appendChild(svg);
    expect(window.getComputedStyle(svg).getPropertyValue("visibility")).toBe(
      "hidden",
    );
    div.remove();
    svg.remove();
  });

  it("요소가 아닌 값은 jsdom 처럼 여전히 던진다(심이 오류를 삼키지 않는다)", () => {
    expect(() =>
      window.getComputedStyle(document as unknown as Element),
    ).toThrow();
  });
});
