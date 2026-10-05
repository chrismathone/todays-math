import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { figureToolKey } from "./figureShortcuts";
import {
  figureTool,
  type FigureTool,
  type FigureToolChoice,
  type FigureToolGroupName,
} from "./figureTools";

/** 도구 줄 단추의 눌림 모양 — 도구와 «전체 요소 크기 고정»이 같이 쓴다. */
export const TOOL_PRESSED =
  "bg-[var(--figure-accent-soft)] text-[var(--figure-accent-ink)] ring-1 ring-[var(--figure-accent-line)]";
/** 도구 줄 단추 — 글리프(16px) + 이름(12px). */
export const TOOL_BUTTON = "px-2 py-1.5 text-xs rounded";

/**
 * 이 키는 ▾ 메뉴가 받는다 — 편집기 단축키 처리기(창 capture 단계라 메뉴보다 먼저 돈다)가 그냥 넘겨야 한다.
 * 안 넘기면 열린 메뉴의 Esc 가 «선택 해제»로, ↑↓ 가 고른 요소의 «미세 이동»으로 먹힌다.
 */
export function toolMenuOwnsKey(e: KeyboardEvent): boolean {
  const target = e.target as Element | null;
  if (!target?.closest) return false;
  if (target.closest("[data-figure-tool-menu]")) return true;
  return (
    !!target.closest("[data-figure-tool-menu-button]") &&
    (e.key === "ArrowDown" || e.key === "ArrowUp")
  );
}

/**
 * 묶인 도구 — ppt 식 나눈 단추(원장님 2026-09-21 확정 «안 A — 마지막에 쓴 도구가 겉에»).
 *
 * 겉(왼쪽)을 누르면 **마지막에 쓴 도구**로 바로 그리고, ▾ 를 누르면 무리의 도구가 펼쳐진다. 고른 도구가 겉에 남는다
 * (한 글자 단축키로 골라도 — 겉은 편집기가 쥐고 있다). 켜진 도구가 이 무리면 겉과 ▾ 가 같이 눌린 모양이다(시안 `.split[data-on]`).
 *
 * 키보드(시안 그대로): 겉 = 여느 단추(Tab·Enter), ▾ = 메뉴 단추 — Enter·Space·↓ 로 열고(↑ 는 끝에서부터) ↑↓·Home·End 로 옮겨
 * Enter·Space 로 고르고 Esc 로 닫는다. Tab·Shift+Tab 은 메뉴를 닫고 문서의 다음·이전 단추로 이동한다. 바깥을 누르면 닫힌다.
 * 초점: 고르면 **겉 단추**로, Esc 면 ▾ 로 돌린다 — 메뉴가 사라지며 초점이 <body> 로 떨어지면 이어 누른 단축키가
 * «편집기 밖»으로 걸러진다(트랙 43 «맨 뒤로» 뒤 Ctrl+Z 가 안 먹던 것과 같은 자리).
 */
export function FigureToolMenu({
  name,
  tools,
  face,
  active,
  disabled,
  onChoose,
}: {
  name: FigureToolGroupName;
  tools: readonly FigureTool[];
  /** 겉에 선 도구 — 마지막에 쓴 것 */
  face: FigureTool;
  /** 지금 켜진 도구(함수 입력 중이면 null) */
  active: FigureToolChoice | null;
  disabled: boolean;
  onChoose: (tool: FigureTool) => void;
}) {
  const [opened, setOpen] = useState(false);
  // 편집 중(AI 요청 등)이면 닫힌 것으로 본다 — 단추가 꺼진 채 메뉴만 떠 있지 않게.
  const open = opened && !disabled;
  const [target, setTarget] = useState(0);
  const host = useRef<HTMLSpanElement>(null);
  const faceButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const on = active === face;
  const shown = figureTool(face);
  const titleOf = (id: FigureTool) =>
    `${figureTool(id).label} (${figureToolKey(id)})`;

  // 바깥을 누르면 닫는다 — 초점은 누른 곳이 가져간다.
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);
  useLayoutEffect(() => {
    if (open) items.current[target]?.focus();
  }, [open, target]);

  const current = () => {
    const at = tools.indexOf(active as FigureTool);
    return at >= 0 ? at : Math.max(0, tools.indexOf(face));
  };
  const show = (at: number) => {
    setTarget(at);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };
  const choose = (id: FigureTool) => {
    onChoose(id);
    setOpen(false);
    faceButton.current?.focus();
  };
  const move = (at: number) => setTarget((at + tools.length) % tools.length);

  return (
    <span ref={host} className="relative inline-flex">
      <span className="inline-flex rounded" data-on={on}>
        <button
          ref={faceButton}
          type="button"
          aria-label={shown.label}
          aria-pressed={on}
          title={titleOf(face)}
          onClick={() => {
            // 메뉴가 열린 채 겉을 눌러도 닫는다 — 겉은 같은 무리(바깥 누름이 아니다)
            onChoose(face);
            setOpen(false);
          }}
          disabled={disabled}
          className={`${TOOL_BUTTON} ${on ? TOOL_PRESSED : "hover:bg-side"}`}
        >
          <span aria-hidden="true" className="text-base mr-1">
            {shown.glyph}
          </span>
          {shown.label}
        </button>
        <button
          ref={opener}
          type="button"
          data-figure-tool-menu-button=""
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={`${name} 도구 고르기`}
          title={tools.map((id) => figureTool(id).label).join(" · ")}
          onClick={() => (open ? setOpen(false) : show(current()))}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            show(e.key === "ArrowUp" ? tools.length - 1 : current());
          }}
          disabled={disabled}
          className={`rounded px-1 py-1.5 text-[10px] ${on ? TOOL_PRESSED : "text-[var(--text-2)] hover:bg-side"}`}
        >
          ▾
        </button>
      </span>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`${name} 도구`}
          data-figure-tool-menu=""
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              // Anchor native tab order at ▾ before the focused menu item unmounts.
              close();
              return;
            }
            const keys: Record<string, () => void> = {
              ArrowDown: () => move(target + 1),
              ArrowUp: () => move(target - 1),
              Home: () => move(0),
              End: () => move(tools.length - 1),
              Enter: () => choose(tools[target]),
              " ": () => choose(tools[target]),
              Escape: close,
            };
            const run = keys[e.key];
            if (!run) return;
            // 편집기(Esc = 선택 해제·닫기)와 대화상자(Tab 가두기·Esc 닫기)는 막힌 키를 그냥 넘긴다.
            e.preventDefault();
            run();
          }}
          className="absolute left-0 top-full z-20 mt-0.5 min-w-[120px] rounded-md border border-control bg-white p-1 shadow-[0_6px_18px_#172b4d22]"
        >
          {tools.map((id, at) => {
            const tool = figureTool(id);
            const checked = active === id;
            return (
              <button
                key={id}
                ref={(node) => {
                  items.current[at] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={at === target ? 0 : -1}
                title={titleOf(id)}
                onClick={() => choose(id)}
                onFocus={() => setTarget(at)}
                className="flex w-full items-center whitespace-nowrap rounded px-2 py-1.5 text-xs hover:bg-side"
              >
                <span aria-hidden="true" className="text-base mr-1">
                  {tool.glyph}
                </span>
                {tool.label}
                {checked && (
                  <span
                    aria-hidden="true"
                    className="ml-auto pl-2.5 text-[var(--figure-accent-ink)]"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
