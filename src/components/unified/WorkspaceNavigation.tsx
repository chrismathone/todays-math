"use client";
import { useEffect, useRef } from "react";
import Icon, { type WorkspaceIconName } from "./WorkspaceIcon";
import s from "./Workroom.module.css";

export default function WorkspaceNavigation<T extends string>({ items, view, ownStart, collapsed, outputCount = 0, onNavigate, onPrepare }: {
  items: readonly { id: T; label: string; short: string; icon: WorkspaceIconName }[];
  view: T | null;
  ownStart?: T;
  collapsed?: boolean;
  outputCount?: number;
  onNavigate: (id: T) => void;
  onPrepare?: (id: T) => void;
}) {
  const navigation = useRef<HTMLElement>(null);
  const identity = items.map(item => item.id).join("|");
  useEffect(() => {
    const nav = navigation.current;
    if (!nav || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 760px)");
    const active = nav.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (!active) return;
    const reveal = () => {
      if (!media.matches) return;
      const container = nav.getBoundingClientRect(), button = active.getBoundingClientRect();
      if (container.width > 0 && (button.left < container.left || button.right > container.right)) {
        // Scroll only the horizontal menu, never the document or focused panel.
        nav.scrollTo({ left: nav.scrollLeft + button.left - container.left - (container.width - button.width) / 2, behavior: "auto" });
      }
    };
    reveal();
    media.addEventListener?.("change", reveal);
    window.addEventListener("resize", reveal);
    document.fonts?.addEventListener("loadingdone", reveal);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reveal) : null;
    observer?.observe(nav); observer?.observe(active);
    return () => { media.removeEventListener?.("change", reveal); window.removeEventListener("resize", reveal); document.fonts?.removeEventListener("loadingdone", reveal); observer?.disconnect(); };
  }, [view, identity]);
  return <nav ref={navigation} className={s.navigation} aria-label="작업실 메뉴">
    {items.map(item => <div key={item.id} className={item.id === ownStart ? s.navGroupStart : ""} data-nav-group-start={item.id === ownStart ? "true" : undefined}>
      <button aria-label={item.label} title={collapsed ? item.label : undefined} aria-current={view === item.id ? "page" : undefined} className={view === item.id ? s.navActive : ""} onPointerEnter={onPrepare ? () => onPrepare(item.id) : undefined} onFocus={onPrepare ? () => onPrepare(item.id) : undefined} onClick={() => onNavigate(item.id)}>
        <Icon name={item.icon} /><span className={s.navLabel}>{item.label}</span><span className={s.navShort}>{item.short}</span>
        {item.id === "export" && outputCount > 0 && <span className={s.navCount}>{outputCount}</span>}
      </button>
    </div>)}
  </nav>;
}
