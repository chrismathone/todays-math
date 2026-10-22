import { afterEach, expect, it, vi } from "vitest";
import { download } from "@/lib/figure/exportImage";

vi.unmock("@/lib/figure/exportImage");
afterEach(() => vi.restoreAllMocks());

it.each([
  ["figure.svg", "data:image/svg+xml,%3Csvg%2F%3E"],
  ["figure.png", "data:image/svg+xml,%3Csvg%2F%3E"],
  ["figure.svg", "data:image/png;base64,AAAA"],
])("PNG가 아닌 파일이나 내용을 저장하지 않는다: %s", (name, href) => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  expect(() => download(name, href)).toThrow("PNG 이미지만 저장할 수 있습니다.");
  expect(click).not.toHaveBeenCalled();
});

it("PNG를 요청한 파일명으로 내려받는다", () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe("figure.png");
    expect(this.href).toBe("data:image/png;base64,AAAA");
  });
  download("figure.png", "data:image/png;base64,AAAA");
  expect(click).toHaveBeenCalledOnce();
  expect(document.querySelector("a[download]")).toBeNull();
});
