import { memo, useRef, useState } from "react";
import type { figureObjects } from "./figureSvgEditing";
import { figureLabelSummary, isFigureMathLabel } from "./FigureLabelInput";
import { NAMES } from "./figureObjectNames";
import type { FigureObjectGroup } from "./figureObjectGroups";

type FigureObject = ReturnType<typeof figureObjects>[number];

const listLabel = (o: FigureObject) =>
  o.attrs["data-function"]
    ? "함수 그래프"
    : o.type === "text"
      ? `${isFigureMathLabel(o.attrs["data-mj"] ?? o.text) ? "수식" : "글자"} ${figureLabelSummary(o.attrs["data-mj"] ?? o.text)}`
      : (NAMES[o.type] ?? o.type);
const groupsKey = (groups: FigureObjectGroup[]) =>
  groups.map((g) => `${g.key}:${g.ids.join(",")}`).join("|");

interface Props {
  objects: FigureObject[];
  groups: FigureObjectGroup[];
  selectedIds: string[];
  onPick: (id: string, additive: boolean) => void;
  onPickGroup: (ids: string[], additive: boolean) => void;
  /** 사용자 묶음 — 선택을 넣기 · 이름 바꾸기(빈 이름은 풀기). */
  onAddToGroup: (name: string) => void;
  onRenameGroup: (from: string, to: string) => void;
  renaming: string | null;
  onRenaming: (name: string | null) => void;
}

function RenameInput({
  name,
  onDone,
}: {
  name: string;
  onDone: (to: string | null) => void;
}) {
  const [value, setValue] = useState(name);
  // Enter·Esc 뒤 입력칸이 사라지며 blur 가 한 번 더 올 수 있다 — 한 번만 끝낸다.
  const done = useRef(false);
  const finish = (to: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(to);
  };
  return (
    <input
      aria-label={`${name} 묶음 이름`}
      value={value}
      maxLength={20}
      autoFocus
      onFocus={(event) => event.target.select()}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(value.trim() || null);
        if (event.key === "Escape") {
          // 편집기 창을 닫는 Esc 로 번지지 않게 — 이름 바꾸기만 그만둔다.
          event.preventDefault();
          event.stopPropagation();
          finish(null);
        }
      }}
      onBlur={() => finish(value.trim() || null)}
      className="h-6 w-full min-w-0 rounded border border-[var(--figure-accent-line)] px-1.5 text-xs"
    />
  );
}

/**
 * 요소 목록 — **역할로 묶어** 보인다(축 · 그래프 · 눈금 · 눈금 숫자 …, `figureObjectGroups.ts`).
 * 묶음 이름을 누르면 그 요소가 한꺼번에 선택되고(Shift 로 더하기), 사용자가 묶음을 만들어 이름을 붙일 수 있다
 * (원장님 2026-09-18 «역할별로 묶고 사용자 커스텀도 가능하게»).
 * 끄는 동안 원문이 걸음마다 새로 읽혀도 **이름·순서·묶음이 같으면 다시 그리지 않는다**(2026-09-18 끊김).
 */
export const FigureObjectList = memo(
  function FigureObjectList({
    objects,
    groups,
    selectedIds,
    onPick,
    onPickGroup,
    onAddToGroup,
    onRenameGroup,
    renaming,
    onRenaming,
  }: Props) {
    const [collapsed, setCollapsed] = useState<string[]>([]);
    const numberOf = new Map(objects.map((o, n) => [o.id, n + 1]));
    const byId = new Map(objects.map((o) => [o.id, o]));
    const chip = (o: FigureObject, short: string) => {
      const selected = selectedIds.includes(o.id);
      return (
        <button
          type="button"
          key={o.id}
          data-figure-list-number={numberOf.get(o.id)}
          aria-pressed={selected}
          title={listLabel(o)}
          onClick={(event) =>
            onPick(o.id, event.shiftKey || event.ctrlKey || event.metaKey)
          }
          className={`flex items-center gap-1 rounded-md border p-0.5 text-xs ${short ? "pr-1.5" : ""} ${selected ? "border-[var(--figure-accent-line)] bg-[var(--figure-accent-soft)] text-[var(--figure-accent-ink)]" : "border-control bg-white hover:border-[var(--figure-accent-line)]"}`}
        >
          <span
            className={`grid h-5 min-w-5 place-items-center rounded px-0.5 text-[11px] font-semibold ${selected ? "bg-[var(--figure-primary)] text-white" : "bg-[var(--figure-accent-soft)] text-[var(--figure-accent-ink)]"}`}
          >
            {numberOf.get(o.id)}
          </span>
          {short && <span className="max-w-28 truncate">{short}</span>}
        </button>
      );
    };
    return (
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
        {groups.map((g) => {
          const folded = collapsed.includes(g.key);
          const all = g.ids.every((id) => selectedIds.includes(id));
          const adding =
            g.custom &&
            selectedIds.length > 0 &&
            selectedIds.some((id) => !g.ids.includes(id));
          const members = g.ids.flatMap((id) => byId.get(id) ?? []);
          const labels = members.map(listLabel);
          // 묶음 이름이 말해 주는 것은 단추에서 뺀다 — 모두 글이면 내용만, 모두 같은 종류면 번호만.
          const short = (o: FigureObject, i: number) =>
            members.every((m) => m.type === "text")
              ? figureLabelSummary(o.attrs["data-mj"] ?? o.text)
              : labels.every((l) => l === labels[0])
                ? ""
                : labels[i];
          return (
            <div
              key={g.key}
              role="group"
              aria-label={`${g.name} 묶음`}
              className={`flex max-w-full flex-wrap items-center gap-1 rounded-md py-0.5 pl-0.5 pr-1 ${g.custom ? "bg-[var(--figure-accent-soft)]" : "bg-[var(--side)]"}`}
            >
              <button
                type="button"
                aria-label={`${g.name} ${folded ? "펼치기" : "접기"}`}
                aria-expanded={!folded}
                onClick={() =>
                  setCollapsed((keys) =>
                    folded
                      ? keys.filter((key) => key !== g.key)
                      : [...keys, g.key],
                  )
                }
                className="grid h-6 w-4 shrink-0 place-items-center rounded text-[9px] text-muted hover:bg-white"
              >
                {folded ? "▶" : "▼"}
              </button>
              {renaming === g.name && g.custom ? (
                <span className="w-28">
                  <RenameInput
                    name={g.name}
                    onDone={(to) => {
                      onRenaming(null);
                      if (to && to !== g.name) onRenameGroup(g.name, to);
                    }}
                  />
                </span>
              ) : (
                <button
                  type="button"
                  aria-pressed={all}
                  aria-label={`${g.name} ${g.ids.length}개`}
                  title="묶음 요소를 모두 선택 · Shift+클릭으로 더하기"
                  onClick={(event) =>
                    onPickGroup(
                      g.ids,
                      event.shiftKey || event.ctrlKey || event.metaKey,
                    )
                  }
                  className={`flex h-6 min-w-0 items-center gap-1 rounded px-1 text-xs font-semibold ${all ? "bg-[var(--figure-primary)] text-white" : "hover:bg-white"}`}
                >
                  <span className="max-w-24 truncate">{g.name}</span>
                  <span className={`font-normal ${all ? "" : "text-muted"}`}>
                    {g.ids.length}
                  </span>
                </button>
              )}
              {!folded && members.map((o, i) => chip(o, short(o, i)))}
              {g.custom && renaming !== g.name && (
                <>
                  {adding && (
                    <button
                      type="button"
                      aria-label={`선택한 요소를 ${g.name}에 넣기`}
                      onClick={() => onAddToGroup(g.name)}
                      className="rounded px-1 py-0.5 text-xs text-[var(--figure-accent-ink)] hover:bg-white"
                    >
                      넣기
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`${g.name} 이름 바꾸기`}
                    onClick={() => onRenaming(g.name)}
                    className="rounded px-1 py-0.5 text-xs text-muted hover:bg-white"
                  >
                    이름
                  </button>
                  <button
                    type="button"
                    aria-label={`${g.name} 묶음 풀기`}
                    onClick={() => onRenameGroup(g.name, "")}
                    className="rounded px-1 py-0.5 text-xs text-muted hover:bg-white"
                  >
                    풀기
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  },
  (a, b) =>
    a.selectedIds === b.selectedIds &&
    a.renaming === b.renaming &&
    a.onPick === b.onPick &&
    a.onPickGroup === b.onPickGroup &&
    a.onAddToGroup === b.onAddToGroup &&
    a.onRenameGroup === b.onRenameGroup &&
    a.onRenaming === b.onRenaming &&
    groupsKey(a.groups) === groupsKey(b.groups) &&
    a.objects.length === b.objects.length &&
    a.objects.every(
      (o, i) =>
        o.id === b.objects[i].id && listLabel(o) === listLabel(b.objects[i]),
    ),
);
