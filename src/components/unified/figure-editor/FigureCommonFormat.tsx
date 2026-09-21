import type { ReactNode } from "react";
import type { figureObjects } from "./figureSvgEditing";
import { TEXT_BG_ATTR } from "./figureTextBackground";
import { formatToggleClass, isBoldWeight } from "./editorUi";
import { DEFAULT_FACE_FILL } from "./figureFaceSources";

type FigureObject = ReturnType<typeof figureObjects>[number];

const HEX = /^#[\da-f]{6}$/i;
/** 모두 같으면 그 값, 아니면 null(여러 값). */
const common = (list: FigureObject[], key: string, fallback: string) => {
  const values = list.map((o) => o.attrs[key] ?? fallback);
  return values.every((v) => v === values[0]) ? values[0] : null;
};
const colorOf = (value: string | null, fallback: string) =>
  value && HEX.test(value) ? value : fallback;

/**
 * 묶음 안쪽 채우기 — 고른 선들이 닫힌 영역을 이루면 그 안에 면을 선 뒤에 만든다(선을 옮기면 따라간다).
 * 원장님 2026-09-19 «그룹화했을 때 내부에 색을 넣을 수 있는 기능». 닫히지 않으면 흐리게 두고 이유를 적는다.
 */
export interface InnerFill {
  ok: boolean;
  reason?: string;
  /** 이미 있는 면의 색 — 있으면 켜짐 */
  color?: string;
  onFill: (color: string) => void;
  onClear: () => void;
}

/**
 * 여러 요소를 고르면(묶음 이름을 눌러도) 공통 서식을 한 번에 바꾼다 — 원장님 2026-09-18 «묶음 선택 후 공통 서식 수정가능하게».
 * 선·도형과 글자는 서식이 달라 칸을 나눈다. 값이 갈리면 «여러 값»이라 적고, 바꾸면 고른 요소 모두에 같은 값이 들어간다.
 *
 * 채우기·배경색·안쪽 채우기는 요소 하나를 골랐을 때와 같은 한 줄 «이름 … [없애기][색]»(원장님 2026-09-21 «안 D» 의
 * 채우기 줄 — 같은 칸에서 같은 일을 다른 꼴로 두지 않는다). 단추 이름(«채우기 없애기» 등)은 aria-label 에 남긴다.
 */
export function FigureCommonFormat({
  objects,
  onChange,
  innerFill,
}: {
  objects: FigureObject[];
  onChange: (ids: string[], attrs: Record<string, string>) => void;
  innerFill?: InnerFill;
}) {
  const shapes = objects.filter((o) => o.type !== "text");
  const texts = objects.filter((o) => o.type === "text");
  const fillable = shapes.filter((o) => o.type !== "line");
  const ids = (list: FigureObject[]) => list.map((o) => o.id);
  const stroke = common(shapes, "stroke", "#111111");
  const width = common(shapes, "stroke-width", "1.5");
  const dashed = shapes.every(
    (o) =>
      !!o.attrs["stroke-dasharray"] && o.attrs["stroke-dasharray"] !== "none",
  );
  const fill = common(fillable, "fill", "none");
  const textColor = common(texts, "fill", "#111111");
  const textBackground = common(texts, TEXT_BG_ATTR, "none");
  const size = common(texts, "font-size", "18");
  // 켜짐 · 꺼짐 · 섞임(aria-pressed="mixed") — 누르면 섞임·꺼짐은 모두 켜고, 켜짐은 모두 끈다.
  const toggle = (on: (o: FigureObject) => boolean) =>
    texts.every(on) ? true : texts.some(on) ? ("mixed" as const) : false;
  const italic = toggle((o) => o.attrs["font-style"] === "italic");
  const bold = toggle((o) => isBoldWeight(o.attrs["font-weight"]));
  const mixed = <span className="text-muted">여러 값</span>;
  return (
    <div className="space-y-4 text-xs">
      {shapes.length > 0 && (
        <section aria-label="선·도형 공통 서식" className="space-y-3">
          <h4 className="font-semibold">선·도형 {shapes.length}개</h4>
          <label className="flex items-center justify-between">
            <span>선 색 {stroke === null && mixed}</span>
            <input
              type="color"
              aria-label="고른 선 색"
              value={colorOf(stroke, "#111111")}
              onChange={(e) =>
                onChange(ids(shapes), { stroke: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="flex justify-between">
              선 두께
              <output>{width === null ? mixed : parseFloat(width)}</output>
            </span>
            <input
              type="range"
              min={0.2}
              max={20}
              step={0.2}
              aria-label="고른 선 두께"
              value={parseFloat(width ?? "1.5") || 1.5}
              onChange={(e) =>
                onChange(ids(shapes), { "stroke-width": e.target.value })
              }
              className="mt-2 w-full accent-[var(--figure-primary)]"
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              aria-label="고른 선 점선"
              checked={dashed}
              onChange={(e) =>
                onChange(ids(shapes), {
                  "stroke-dasharray": e.target.checked ? "5 4" : "",
                })
              }
            />
            점선
          </label>
          {fillable.length > 0 && (
            <FillRow
              name={<>채우기 {fill === null && mixed}</>}
              clearLabel="채우기 없애기"
              onClear={() => onChange(ids(fillable), { fill: "none" })}
              color={
                <input
                  type="color"
                  aria-label="고른 채우기 색"
                  value={colorOf(fill, "#ffffff")}
                  onChange={(e) =>
                    onChange(ids(fillable), { fill: e.target.value })
                  }
                />
              }
            />
          )}
          {innerFill && <InnerFillRow {...innerFill} />}
        </section>
      )}
      {texts.length > 0 && (
        <section aria-label="글자 공통 서식" className="space-y-3">
          <h4 className="font-semibold">글자 {texts.length}개</h4>
          <label className="flex items-center justify-between">
            <span>글자 색 {textColor === null && mixed}</span>
            <input
              type="color"
              aria-label="고른 글자 색"
              value={colorOf(textColor, "#111111")}
              onChange={(e) => onChange(ids(texts), { fill: e.target.value })}
            />
          </label>
          <FillRow
            name={<>배경색 {textBackground === null && mixed}</>}
            clearLabel="배경 없애기"
            onClear={() => onChange(ids(texts), { [TEXT_BG_ATTR]: "" })}
            color={
              <input
                type="color"
                aria-label="고른 글자 배경색"
                value={colorOf(textBackground, "#ffffff")}
                onChange={(e) =>
                  onChange(ids(texts), { [TEXT_BG_ATTR]: e.target.value })
                }
              />
            }
          />
          <label className="block">
            <span className="flex justify-between">
              글자 크기
              <output>{size === null ? mixed : parseFloat(size)}</output>
            </span>
            <input
              type="range"
              min={6}
              max={100}
              step={0.2}
              aria-label="고른 글자 크기"
              value={parseFloat(size ?? "18") || 18}
              onChange={(e) =>
                onChange(ids(texts), { "font-size": e.target.value })
              }
              className="mt-2 w-full accent-[var(--figure-primary)]"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={italic}
              className={formatToggleClass(italic)}
              onClick={() =>
                onChange(ids(texts), {
                  "font-style": italic === true ? "normal" : "italic",
                })
              }
            >
              기울임
            </button>
            <button
              type="button"
              aria-pressed={bold}
              className={`${formatToggleClass(bold)} font-bold`}
              onClick={() =>
                onChange(ids(texts), {
                  "font-weight": bold === true ? "normal" : "bold",
                })
              }
            >
              굵게
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * 채우기 줄 한 줄 — «이름 … [없애기][색]». 요소 하나를 골랐을 때의 채우기·배경색 줄(`FigureEditor`)과 같은 꼴
 * (시안 wire-t43-figure-panel.html D 의 fillInline).
 */
function FillRow({
  name,
  clearLabel,
  onClear,
  clearDisabled,
  color,
  className = "",
}: {
  name: ReactNode;
  clearLabel: string;
  onClear: () => void;
  clearDisabled?: boolean;
  color: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-fill-row=""
      className={`flex items-center justify-between gap-2 ${className}`}
    >
      {/* 이름은 한 칸 — «채우기 여러 값»이 조각으로 갈려 줄 가운데로 떨어지지 않게 */}
      <span>{name}</span>
      <span className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={clearLabel}
          disabled={clearDisabled}
          onClick={onClear}
          className="underline text-muted disabled:opacity-40"
        >
          없애기
        </button>
        {color}
      </span>
    </div>
  );
}

/** «[안쪽 채우기] … [없애기][■]» — 채우기 줄과 같은 꼴. 켜기 단추는 지금 색으로 켠다. */
function InnerFillRow({ ok, reason, color, onFill, onClear }: InnerFill) {
  const on = color !== undefined;
  const usable = ok || on;
  return (
    <div className="space-y-1">
      <FillRow
        className={usable ? "" : "opacity-40"}
        name={
          <button
            type="button"
            aria-pressed={on}
            disabled={!usable}
            onClick={() => (on ? onClear() : onFill(DEFAULT_FACE_FILL))}
            className={formatToggleClass(on)}
          >
            안쪽 채우기
          </button>
        }
        clearLabel="안쪽 채우기 없애기"
        clearDisabled={!on}
        onClear={onClear}
        color={
          <input
            type="color"
            aria-label="고른 선 안쪽 채우기 색"
            disabled={!usable}
            value={colorOf(color ?? null, DEFAULT_FACE_FILL)}
            onChange={(e) => onFill(e.target.value)}
          />
        }
      />
      {!ok && reason && <p className="text-muted">{reason}</p>}
    </div>
  );
}
