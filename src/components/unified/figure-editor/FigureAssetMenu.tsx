import { useEffect, useId, useRef, useState } from "react";
import { TOOL_BUTTON, TOOL_PRESSED } from "./FigureToolMenu";
import { FIGURE_LIBRARY, type FigureLibraryAsset } from "./figureAssetLibrary";

/** 메뉴 탭 — 입체 그림은 매니페스트 tags 의 «입체»로 가른다(사용자 2026-10-21 «2d/3d 탭을 분리해서 고를 수 있게»). */
const TABS = [
  {
    id: "flat",
    label: "평면",
    items: FIGURE_LIBRARY.filter((asset) => !asset.tags.includes("입체")),
  },
  {
    id: "solid",
    label: "입체",
    items: FIGURE_LIBRARY.filter((asset) => asset.tags.includes("입체")),
  },
] as const;

/**
 * 툴바 «그림» — 에셋(건물·집·사람·나무 …)을 골라 그림에 넣는다. 사용자 2026-10-21 «상단에 에셋에서 보유한 그림도
 * 넣을 수 있게 추가해주면 더 좋겠네». 고르면 그림 가운데에 들어가고 바로 골라진다(끌어 옮기고 조절점으로 크기를 맞춘다).
 *
 * 메뉴는 ▾ 도구 메뉴와 같은 표식(`data-figure-tool-menu`)을 단다 — 열린 동안 편집기 단축키 처리기가 키를 넘긴다
 * (안 넘기면 Esc 가 «선택 해제»로, 글자 키가 도구 바꾸기로 먹힌다). 키보드: Enter·Space 로 열고 Tab·Shift+Tab 으로
 * 옮겨 Enter 로 넣고, Esc 로 닫는다. 바깥을 누르면 닫힌다.
 */
export function FigureAssetMenu({
  disabled,
  onInsert,
}: {
  disabled: boolean;
  onInsert: (asset: FigureLibraryAsset) => void;
}) {
  const [opened, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("flat");
  const items = TABS.find((t) => t.id === tab)!.items;
  const open = opened && !disabled;
  const host = useRef<HTMLSpanElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const [position, setPosition] = useState({ left: 8, top: 8, width: 280, maxHeight: 320 });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const box = opener.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(432, Math.max(160, window.innerWidth - 16));
      const top = Math.max(8, Math.min(box.bottom + 4, window.innerHeight - 128));
      setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - width - 8)),
        top, width, maxHeight: Math.max(112, window.innerHeight - top - 8) });
    };
    place();
    first.current?.focus();
    const outside = (event: Event) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  return (
    <span ref={host} className="relative inline-flex">
      <button
        ref={opener}
        type="button"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-label="그림 넣기"
        title="그림 넣기 — 건물·집·사람·나무 같은 실물 그림"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        className={`${TOOL_BUTTON} ${open ? TOOL_PRESSED : "hover:bg-side"}`}
      >
        <span aria-hidden="true" className="text-base mr-1">
          ⌂
        </span>
        그림
      </button>
      {open && (
        <div
          id={popupId}
          role="region"
          aria-label="그림 넣기"
          data-figure-tool-menu=""
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            // 대화상자(Esc 닫기)는 막힌 키를 넘긴다 — 편집기가 닫히지 않고 메뉴만 닫힌다
            e.preventDefault();
            close();
          }}
          style={position}
          className="fixed z-20 overflow-y-auto rounded-md border border-control bg-white p-1.5 shadow-[0_6px_18px_#172b4d22]"
        >
          <div
            role="tablist"
            aria-label="그림 종류"
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 :
                (TABS.findIndex((t) => t.id === tab) + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
              setTab(TABS[next].id);
              e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
            }}
            className="mb-1.5 flex gap-1 border-b border-control pb-1.5"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${popupId}-${t.id}`}
                aria-controls={`${popupId}-panel`}
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`min-h-11 rounded px-3 py-1 text-xs ${tab === t.id ? TOOL_PRESSED : "hover:bg-side"}`}
              >
                {t.label} <span className="text-muted">{t.items.length}</span>
              </button>
            ))}
          </div>
          {!items.length && (
            <p className="px-2 py-6 text-center text-xs text-muted">
              아직 이 종류의 그림이 없습니다.
            </p>
          )}
          <div id={`${popupId}-panel`} role="tabpanel" aria-labelledby={`${popupId}-${tab}`} className="grid grid-cols-4 gap-1 sm:grid-cols-6">
            {items.map((asset, at) => (
              <button
                key={asset.slug}
                ref={at === 0 ? first : undefined}
                type="button"
                title={`${asset.label} — ${asset.tags.join(" · ")}`}
                onClick={() => {
                  close();
                  onInsert(asset);
                }}
                className="flex min-h-11 min-w-0 flex-col items-center gap-0.5 rounded p-1 text-[11px] hover:bg-side focus-visible:bg-side"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Local digest-named SVG thumbnails need no image optimization. */}
                <img
                  src={asset.thumb}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-10 w-10 object-contain"
                />
                <span className="w-full truncate text-center">
                  {asset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
