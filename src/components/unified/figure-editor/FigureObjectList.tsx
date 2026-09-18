import { memo, useRef, useState, type DragEvent } from "react";
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
const LOOSE: FigureObjectGroup = {
  key: "loose",
  name: "묶음 없음",
  custom: false,
  loose: true,
  ids: [],
};

interface Props {
  objects: FigureObject[];
  groups: FigureObjectGroup[];
  selectedIds: string[];
  onPick: (id: string, additive: boolean) => void;
  onPickGroup: (ids: string[], additive: boolean) => void;
  /** 묶음 정하기 — 이름(옮기기·이름 바꾸기) · ""(해제 — 묶음 밖) · null(자동 묶음으로). */
  onAssign: (ids: string[], name: string | null) => void;
  /** 이름을 고치는 중인 묶음의 key. */
  renaming: string | null;
  onRenaming: (key: string | null) => void;
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
 * 원장님 2026-09-18: «역할별로 묶고 사용자 커스텀도 가능하게» · «드래그해서 다른 묶음으로 이동» ·
 * «묶음 선택 후 공통 서식»(오른쪽 칸 — `FigureCommonFormat`) · «묶음 해제 — 해제하면 전부 묶음 밖으로».
 * - 묶음 이름을 누르면 그 요소가 모두 선택된다(Shift 로 더하기·빼기). 고른 묶음에 «이름»·«해제»가 선다.
 * - 요소 단추를 다른 묶음 위로 끌어 놓으면 옮겨진다. 고른 요소 위에서 끌면 고른 것이 다 간다.
 *   «묶음 없음» 칸(끄는 동안 늘 보인다)에 놓으면 묶음 밖으로.
 * 끄는 동안 원문이 걸음마다 새로 읽혀도 **이름·순서·묶음이 같으면 다시 그리지 않는다**(2026-09-18 끊김).
 */
export const FigureObjectList = memo(
  function FigureObjectList({
    objects,
    groups,
    selectedIds,
    onPick,
    onPickGroup,
    onAssign,
    renaming,
    onRenaming,
  }: Props) {
    const [collapsed, setCollapsed] = useState<string[]>([]);
    const dragIds = useRef<string[] | null>(null);
    const [dragging, setDragging] = useState(false);
    const [over, setOver] = useState<string | null>(null);
    const numberOf = new Map(objects.map((o, n) => [o.id, n + 1]));
    const byId = new Map(objects.map((o) => [o.id, o]));
    const endDrag = () => {
      dragIds.current = null;
      setDragging(false);
      setOver(null);
    };
    const shown =
      dragging && !groups.some((g) => g.loose) ? [...groups, LOOSE] : groups;
    const chip = (o: FigureObject, short: string) => {
      const selected = selectedIds.includes(o.id);
      return (
        <button
          type="button"
          key={o.id}
          data-figure-list-number={numberOf.get(o.id)}
          aria-pressed={selected}
          title={`${listLabel(o)} · 끌어서 다른 묶음으로`}
          draggable
          onDragStart={(event) => {
            const ids =
              selected && selectedIds.length > 1 ? selectedIds : [o.id];
            dragIds.current = ids;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", ids.join(" "));
            setDragging(true);
          }}
          onDragEnd={endDrag}
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
    const dropProps = (g: FigureObjectGroup) => ({
      onDragOver: (event: DragEvent) => {
        if (!dragIds.current) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (over !== g.key) setOver(g.key);
      },
      onDragLeave: (event: DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOver((key) => (key === g.key ? null : key));
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        const ids = dragIds.current?.filter((id) => !g.ids.includes(id));
        endDrag();
        if (ids?.length) onAssign(ids, g.loose ? "" : g.name);
      },
    });
    return (
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
        {shown.map((g) => {
          const folded = collapsed.includes(g.key);
          const all =
            g.ids.length > 0 && g.ids.every((id) => selectedIds.includes(id));
          const members = g.ids.flatMap((id) => byId.get(id) ?? []);
          const labels = members.map(listLabel);
          // 묶음 이름이 말해 주는 것은 단추에서 뺀다 — 모두 글이면 내용만, 모두 같은 종류면 번호만.
          const short = (o: FigureObject, i: number) =>
            g.loose
              ? labels[i]
              : members.every((m) => m.type === "text")
                ? figureLabelSummary(o.attrs["data-mj"] ?? o.text)
                : labels.every((l) => l === labels[0])
                  ? ""
                  : labels[i];
          const tone = g.loose
            ? "border border-dashed border-control"
            : g.custom
              ? "bg-[var(--figure-accent-soft)]"
              : "bg-[var(--side)]";
          return (
            <div
              key={g.key}
              role="group"
              aria-label={`${g.name} 묶음`}
              {...dropProps(g)}
              className={`flex max-w-full flex-wrap items-center gap-1 rounded-md py-0.5 pl-0.5 pr-1 ${tone} ${over === g.key ? "ring-2 ring-[var(--figure-primary)]" : ""}`}
            >
              {!g.loose && (
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
              )}
              {renaming === g.key ? (
                <span className="w-28">
                  <RenameInput
                    name={g.name}
                    onDone={(to) => {
                      onRenaming(null);
                      if (to && to !== g.name) onAssign(g.ids, to);
                    }}
                  />
                </span>
              ) : (
                <button
                  type="button"
                  aria-pressed={all}
                  aria-label={`${g.name} ${g.ids.length}개`}
                  title="묶음 요소를 모두 선택 · Shift+클릭으로 더하기"
                  disabled={!g.ids.length}
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
              {!g.ids.length && (
                <span className="px-1 text-xs text-muted">
                  여기에 놓으면 묶음 밖으로
                </span>
              )}
              {!folded && members.map((o, i) => chip(o, short(o, i)))}
              {all && renaming !== g.key && (
                <>
                  {!g.loose && (
                    <button
                      type="button"
                      aria-label={`${g.name} 이름 바꾸기`}
                      onClick={() => onRenaming(g.key)}
                      className="rounded px-1 py-0.5 text-xs text-[var(--figure-accent-ink)] hover:bg-white"
                    >
                      이름
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={
                      g.loose
                        ? "묶음 없는 요소 자동 묶기"
                        : `${g.name} 묶음 해제`
                    }
                    onClick={() => onAssign(g.ids, g.loose ? null : "")}
                    className="rounded px-1 py-0.5 text-xs text-[var(--figure-accent-ink)] hover:bg-white"
                  >
                    {g.loose ? "자동 묶기" : "해제"}
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
    a.onAssign === b.onAssign &&
    a.onRenaming === b.onRenaming &&
    groupsKey(a.groups) === groupsKey(b.groups) &&
    a.objects.length === b.objects.length &&
    a.objects.every(
      (o, i) =>
        o.id === b.objects[i].id && listLabel(o) === listLabel(b.objects[i]),
    ),
);
