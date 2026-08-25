/**
 * 홑 줄바꿈이 **지면에서도 줄바꿈**인가 (원장님 확정 2026-08-25).
 *
 * 원장님 지적: *「문제은행에서 줄바꿈 안되는 문제들이 여전히 존재」*. 저장된 본문은
 * 멀쩡한데 Markdown 이 홑 `\n` 을 공백으로 읽어 한 줄로 붙였다.
 * 실측 shared 2,410건 중 **142건(5.9%)**.
 *
 * 🔴 **이 검사의 급소: 「바뀌었나」를 눈으로 보는 축이 있어야 한다.** 순수 함수만
 *    시험하면 「함수는 도는데 화면은 그대로」를 구조적으로 못 본다 — 이 저장소가
 *    여러 번 겪은 자리다. 그래서 **실제 렌더 결과에 `<br>` 이 생기는지**까지 본다.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { applyHardBreaks } from "@/lib/math/hardBreaks";

const BS = String.fromCharCode(92);

describe("[지면] 홑 줄바꿈은 줄바꿈으로 그린다", () => {
  it("원장님이 지목한 문항이 실제로 두 줄이 된다 (J30101-A15-002)", () => {
    const content = `다음 세 수를 작은 것부터 차례로 나열하시오.\n$${BS}sqrt{5}$, $5$, $${BS}sqrt{3}$`;
    const { container } = render(<MarkdownRenderer content={content} />);
    expect(container.querySelectorAll("br").length).toBeGreaterThan(0);
  });

  it("보기 ①②③ 가 각각 제 줄에 선다", () => {
    const content =
      "다음 중 옳은 것을 모두 고르시오.\n① 아래로 볼록하다.\n② 축은 $x=-2$이다.\n③ 최솟값은 $1$이다.";
    const { container } = render(<MarkdownRenderer content={content} />);
    // 발문 + 보기 셋 = 줄바꿈 셋
    expect(container.querySelectorAll("br").length).toBe(3);
  });

  it("🔴 빈 줄(문단)은 건드리지 않는다 — 기존 4만 건이 움직이면 안 된다", () => {
    const before = "앞 문단입니다.\n\n뒤 문단입니다.";
    expect(applyHardBreaks(before)).toBe(before);
  });

  it("🔴 `$$…$$` 안의 줄바꿈은 LaTeX 것이다 — 손대지 않는다", () => {
    const math = `$$${BS}begin{cases}\nx+y=3\\\\\nx-y=1\n${BS}end{cases}$$`;
    expect(applyHardBreaks(math)).toBe(math);
  });

  it("수식 블록 **밖**은 바꾸고 안은 그대로 — 한 본문에 둘 다 있을 때", () => {
    const src = `발문이다.\n$$a\nb$$\n뒤 문장이다.`;
    const out = applyHardBreaks(src);
    expect(out).toContain("발문이다.  \n"); // 밖 → 하드 브레이크
    expect(out).toContain("$$a\nb$$"); // 안 → 그대로
  });

  it("이미 하드 브레이크인 줄에 공백을 또 붙이지 않는다", () => {
    const src = "앞줄  \n뒷줄";
    expect(applyHardBreaks(src)).toBe(src);
  });

  it("줄바꿈이 없으면 아무것도 안 한다 (캐시가 기대는 순수성)", () => {
    const src = "한 줄짜리 발문 $x+1$";
    expect(applyHardBreaks(src)).toBe(src);
    expect(applyHardBreaks(src)).toBe(applyHardBreaks(src));
  });
});
