// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WorkspaceNavigation from "@/components/unified/WorkspaceNavigation";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const items = Array.from({ length: 11 }, (_, i) => ({ id: `menu-${i}`, label: `메뉴 ${i}`, short: `메뉴${i}`, icon: "home" as const }));
describe("actual workspace navigation", () => {
  it("keeps every native button accessible and reveals an offscreen active item only on the mobile navigation axis", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const scroll = vi.fn(); Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: scroll, configurable: true });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) { return { left: this.tagName === "NAV" ? 0 : 680, right: this.tagName === "NAV" ? 390 : 748, width: this.tagName === "NAV" ? 390 : 68 } as DOMRect; });
    const navigate = vi.fn(), prepare = vi.fn();
    render(<WorkspaceNavigation items={items} view="menu-10" onNavigate={navigate} onPrepare={prepare} />);
    expect(screen.getAllByRole("button")).toHaveLength(11);
    expect(scroll).toHaveBeenCalledWith({ left: 519, behavior: "auto" });
    const active = screen.getByRole("button", { name: "메뉴 10" }); expect(active.getAttribute("aria-current")).toBe("page");
    fireEvent.focus(active); expect(prepare).toHaveBeenCalledWith("menu-10");
    fireEvent.click(active); expect(navigate).toHaveBeenCalledWith("menu-10");
  });
  it("leaves desktop navigation and visible active controls in place", () => {
    const scroll = vi.fn(); Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: scroll, configurable: true });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const { rerender } = render(<WorkspaceNavigation items={items} view="menu-0" onNavigate={() => {}} />);
    expect(scroll).not.toHaveBeenCalled();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, right: 390, width: 390 } as DOMRect);
    rerender(<WorkspaceNavigation items={items} view="menu-1" onNavigate={() => {}} />);
    expect(scroll).not.toHaveBeenCalled();
  });
});
