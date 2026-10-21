import { memo, useRef, useState, type DragEvent } from "react";
import type { figureObjects } from "./figureSvgEditing";
import { figureLabelSummary } from "./FigureLabelInput";
import { FigureChipText } from "./FigureChipText";
import {
  isAngleKind,
  objectName,
  type FigureAngleKinds,
} from "./figureObjectNames";
import type { FigureObjectGroup } from "./figureObjectGroups";

type FigureObject = ReturnType<typeof figureObjects>[number];

/** 단추 이름 — 요소 이름(`objectName`, 모든 자리가 같이 쓴다)에 글이면 내용을 붙인다. */
const listLabel = (o: FigureObject, angles: FigureAngleKinds) =>
  o.type === "text"
    ? `${objectName(o, angles)} ${figureLabelSummary(o.attrs["data-mj"] ?? o.text)}`
    : objectName(o, angles);
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
  /** 요소 id → 고정 번호(`figureNumbers`) — 그림 위 번호표·AI 자료 목록과 같은 값. 그리는 차례가 아니다. */
  numbers: ReadonlyMap<string, number>;
  groups: FigureObjectGroup[];
  /** 각 표시의 종류(직각·예각·둔각) — 오른쪽 칸 제목·AI 요소 목록과 같은 이름을 쓰게 편집기가 한 번 재어 넘긴다. */
  angles: FigureAngleKinds;
  selectedIds: string[];
  onPick: (id: string, additive: boolean) => void;
  onPickGroup: (ids: string[], additive: boolean) => void;
  /** 묶음 옮기기 — 이름(그 묶음으로) · ""(묶음 밖). */
  onAssign: (ids: string[], name: string | null) => void;
}

/**
 * 요소 목록 — **역할로 묶어** 보인다(축 · 그래프 · 눈금 · 눈금 숫자 …, `figureObjectGroups.ts`).
 * 원장님 2026-09-18: «역할별로 묶고 사용자 커스텀도 가능하게» · «드래그해서 다른 묶음으로 이동» ·
 * «묶음 선택 후 공통 서식»(오른쪽 칸 — `FigureCommonFormat`) · «묶음 해제 — 해제하면 전부 묶음 밖으로».
 * - 묶음 이름을 누르면 그 요소가 모두 선택된다(Shift 로 더하기·빼기). 이름 바꾸기·해제는 오른쪽 칸(`FigureGroupRow`) —
 *   원장님 2026-09-19 «그룹 선택과 개별 선택 시 왜 줄바꿈이 다르지?»: 목록에 단추가 붙으면 상자가 넓어져 줄바꿈이 바뀐다.
 *   고르기 전과 후에 묶음 상자 안 단추가 같다.
 * - 요소 단추를 다른 묶음 위로 끌어 놓으면 옮겨진다. 고른 요소 위에서 끌면 고른 것이 다 간다.
 *   «묶음 없음» 칸(끄는 동안 늘 보인다)에 놓으면 묶음 밖으로.
 * 끄는 동안 원문이 걸음마다 새로 읽혀도 **이름·순서·묶음이 같으면 다시 그리지 않는다**(2026-09-18 끊김).
 */
export const FigureObjectList = memo(
  function FigureObjectList({
    objects,
    numbers,
    groups,
    angles,
    selectedIds,
    onPick,
    onPickGroup,
    onAssign,
  }: Props) {
    const [collapsed, setCollapsed] = useState<string[]>([]);
    const dragIds = useRef<string[] | null>(null);
    const [dragging, setDragging] = useState(false);
    const [over, setOver] = useState<string | null>(null);
    const numberOf = numbers;
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
          title={`${listLabel(o, angles)} · 끌어서 다른 묶음으로`}
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
          {short && (
            <span className="max-w-28 truncate">
              {/* math-figure-editor: 수식 글자는 조판한 모양으로(FigureChipText) */}
              <FigureChipText
                text={short}
                raw={o.type === "text" ? (o.attrs["data-mj"] ?? o.text) : undefined}
              />
            </span>
          )}
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
          const labels = members.map((o) => listLabel(o, angles));
          // 묶음 이름이 말해 주는 것은 단추에서 뺀다 — 모두 글이면 내용만, 모두 같은 종류면 번호만.
          // 각 표시는 늘 종류(직각·예각·둔각)를 적는다 — 묶음 이름 «각»은 종류를 말해 주지 않는다.
          const short = (o: FigureObject, i: number) =>
            g.loose || isAngleKind(angles.get(o.id))
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
              {!g.ids.length && (
                <span className="px-1 text-xs text-muted">
                  여기에 놓으면 묶음 밖으로
                </span>
              )}
              {!folded && members.map((o, i) => chip(o, short(o, i)))}
            </div>
          );
        })}
      </div>
    );
  },
  (a, b) =>
    a.selectedIds === b.selectedIds &&
    a.onPick === b.onPick &&
    a.onPickGroup === b.onPickGroup &&
    a.onAssign === b.onAssign &&
    groupsKey(a.groups) === groupsKey(b.groups) &&
    a.objects.length === b.objects.length &&
    a.objects.every(
      (o, i) =>
        o.id === b.objects[i].id &&
        a.numbers.get(o.id) === b.numbers.get(o.id) &&
        listLabel(o, a.angles) === listLabel(b.objects[i], b.angles),
    ),
);
