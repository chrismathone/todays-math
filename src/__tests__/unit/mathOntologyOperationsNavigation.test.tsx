// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WorkspaceNavigation from "@/components/unified/WorkspaceNavigation";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const items = Array.from({ length: 11 }, (_, i) => ({ id: `menu-${i}`, label: `메뉴 ${i}`, short: `메뉴${i}`, icon: "home" as const }));
describe("actual workspace navigation", () => {
  it("rechecks only its scoped navigation after a late layout or font event and cleans observers/listeners", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    let resized!: () => void, offscreen = false;
    const observe = vi.fn(), disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe = observe; disconnect = disconnect; constructor(callback: () => void) { resized = callback; } });
    const fonts = new EventTarget(), original = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
    const scroll = vi.fn(); Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: scroll, configurable: true });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) { const isNav = this.tagName === "NAV", left = !isNav && offscreen ? 680 : 0; return { left, right: isNav ? 390 : left + 68, width: isNav ? 390 : 68 } as DOMRect; });
    try {
      const { unmount } = render(<WorkspaceNavigation items={items} view="menu-10" onNavigate={() => {}} />);
      expect(scroll).not.toHaveBeenCalled(); expect(observe).toHaveBeenCalledTimes(2);
      offscreen = true; resized(); expect(scroll).toHaveBeenCalledTimes(1);
      fonts.dispatchEvent(new Event("loadingdone")); expect(scroll).toHaveBeenCalledTimes(2);
      unmount(); expect(disconnect).toHaveBeenCalledOnce();
      fonts.dispatchEvent(new Event("loadingdone")); window.dispatchEvent(new Event("resize")); expect(scroll).toHaveBeenCalledTimes(2);
    } finally { if (original) Object.defineProperty(document, "fonts", original); else Reflect.deleteProperty(document, "fonts"); }
  });
  it("reveals the current item when a desktop window crosses into the mobile layout and releases its listener", () => {
    let listener!: () => void;
    const media = { matches: false, addEventListener: vi.fn((_event: string, callback: () => void) => { listener = callback; }), removeEventListener: vi.fn() };
    vi.stubGlobal("matchMedia", () => media);
    const scroll = vi.fn(); Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: scroll, configurable: true });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) { return { left: this.tagName === "NAV" ? 0 : 680, right: this.tagName === "NAV" ? 390 : 748, width: this.tagName === "NAV" ? 390 : 68 } as DOMRect; });
    const { unmount } = render(<WorkspaceNavigation items={items} view="menu-10" onNavigate={() => {}} />);
    expect(scroll).not.toHaveBeenCalled(); media.matches = true; listener();
    expect(scroll).toHaveBeenCalledWith({ left: 519, behavior: "auto" });
    unmount(); expect(media.removeEventListener).toHaveBeenCalledWith("change", listener);
  });
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
