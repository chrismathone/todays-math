/**
 * 루트 레이아웃의 `ClientErrorLog` — 브라우저 보고기를 설치하고, 화면에는 **아무것도 그리지 않는다**
 * (관리자 화면·표시는 이번 범위 밖 — D-07). 떠나면 설치를 푼다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ClientErrorLog from "@/components/errorLog/ClientErrorLog";

describe("ClientErrorLog", () => {
  it("아무것도 그리지 않고, 붙어 있는 동안만 fetch 를 감싼다", () => {
    // 전역 설정(MSW)이 beforeAll 에서 fetch 를 갈아 끼운다 — 렌더 직전의 것과 견준다
    const before = window.fetch;
    const { container, unmount } = render(<ClientErrorLog />);
    expect(container.innerHTML).toBe("");
    expect(window.fetch).not.toBe(before);
    unmount();
    expect(window.fetch).toBe(before);
  });
});
