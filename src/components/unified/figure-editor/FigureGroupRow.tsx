import { useEffect, useRef, useState } from "react";
import type { FigureObjectGroup } from "./figureObjectGroups";

/**
 * 한 묶음 전부를 골랐을 때 오른쪽 칸 위쪽에 서는 묶음 줄 — 원장님 2026-09-19 «그룹 선택과 개별 선택 시 왜 줄바꿈이
 * 다르지?» → «우측에서 그룹 이름과 해제 설정 가능하게». 전에는 요소 목록의 묶음 상자 끝에 «이름»·«해제»가 붙어
 * 상자가 넓어지고, 고를 때마다 목록 줄바꿈이 바뀌었다.
 * - 이름: Enter·포커스 아웃에 확정, Esc 는 이름만 그대로(편집기는 안 닫는다). 역할 묶음의 이름을 바꾸면 사용자 묶음이 된다.
 * - «묶음 해제»: 내가 묶은 묶음은 **한 겹만** 푼다(Ctrl+Shift+G 와 같은 길 — 다시 묶은 묶음이면 안쪽 묶음이 돌아오고,
 *   처음 묶은 것이면 묶기 전 역할 어림으로). 역할 묶음(선분·글자 …)은 묶음 밖으로.
 *   «묶음 없음»을 통째로 골랐으면 «자동 묶기»(역할 어림으로 돌아간다).
 */
export function FigureGroupRow({
  group,
  focus,
  onFocused,
  onAssign,
  onUngroup,
}: {
  group: FigureObjectGroup;
  /** «묶음 만들기» 직후 — 이름 칸에 바로 초점을 준다. */
  focus: boolean;
  onFocused: () => void;
  onAssign: (ids: string[], name: string | null) => void;
  /** 내가 묶은 묶음 한 겹 풀기 — 편집기 `ungroupIds`(Ctrl+Shift+G 와 같다). */
  onUngroup: (ids: string[]) => void;
}) {
  return (
    <section aria-label="묶음" className="mb-3 space-y-1.5 text-xs">
      {group.loose ? (
        <button
          type="button"
          aria-label="묶음 없는 요소 자동 묶기"
          onClick={() => onAssign(group.ids, null)}
          className="border border-control rounded px-2 py-1"
        >
          자동 묶기
        </button>
      ) : (
        <>
          <span className="block font-medium">묶음 이름</span>
          <div className="flex gap-2">
            <GroupNameInput
              key={`${group.key}:${group.name}`}
              name={group.name}
              focus={focus}
              onFocused={onFocused}
              onRename={(to) => onAssign(group.ids, to)}
            />
            <button
              type="button"
              aria-label={`${group.name} 묶음 해제`}
              onClick={() =>
                group.custom ? onUngroup(group.ids) : onAssign(group.ids, "")
              }
              className="shrink-0 border border-control rounded px-2 py-1"
            >
              묶음 해제
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function GroupNameInput({
  name,
  focus,
  onFocused,
  onRename,
}: {
  name: string;
  focus: boolean;
  onFocused: () => void;
  onRename: (to: string) => void;
}) {
  const [value, setValue] = useState(name);
  const input = useRef<HTMLInputElement>(null);
  // Esc 로 그만둔 뒤 따라오는 포커스 아웃은 확정이 아니다.
  const cancelled = useRef(false);
  useEffect(() => {
    if (!focus) return;
    input.current?.focus();
    onFocused();
  }, [focus, onFocused]);
  const commit = () => {
    const to = value.trim();
    if (to && to !== name) onRename(to);
    else setValue(name);
  };
  return (
    <input
      ref={input}
      aria-label={`${name} 묶음 이름`}
      value={value}
      maxLength={20}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") {
          // 편집기 창을 닫는 Esc 로 번지지 않게 — 이름 바꾸기만 그만둔다.
          event.preventDefault();
          event.stopPropagation();
          cancelled.current = true;
          setValue(name);
          event.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (cancelled.current) {
          cancelled.current = false;
          return;
        }
        commit();
      }}
      className="min-w-0 flex-1 border border-control rounded px-2 py-1"
    />
  );
}
