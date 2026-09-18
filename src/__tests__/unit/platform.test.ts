import { afterEach, describe, expect, it, vi } from "vitest";
import { isMac, modKey } from "@/components/unified/figure-editor/platform";

/** 도형 편집기는 끄는 걸음마다 다시 그리며 modKey() 를 여덟 번 부른다 — 세션 중 안 바뀌니 한 번만 검사한다. */
afterEach(() => vi.restoreAllMocks());

describe("isMac", () => {
  it("한 번 판정한 뒤로는 navigator 를 다시 읽지 않는다", () => {
    const platform = vi
      .spyOn(navigator, "platform", "get")
      .mockReturnValue("Win32");
    const first = isMac();
    const reads = platform.mock.calls.length;
    expect(first).toBe(false);
    expect(modKey()).toBe("Ctrl");
    isMac();
    isMac();
    expect(platform.mock.calls.length).toBe(reads);
  });
});
