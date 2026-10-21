import {
  coverFigureGrid,
  GRID_COLORS,
  GRID_MAX_CELLS,
  GRID_WIDTHS,
  gridShortfall,
  resizeFigureGrid,
  type FigureBox,
  type FigureGrid,
} from "./figureGrid";

/**
 * 오른쪽 칸 «모눈» — 배경 모눈의 칸 수·칸 크기·자리·선 모양(math-figure-editor 2026-10-21).
 * 모눈은 요소가 아니라서 캔버스에서 골라 옮길 수 없다 — 여기서만 고친다.
 * 칸 수를 바꿔도 그림은 그대로다(찌그러지지 않는다). 모눈이 그림보다 작아지면 경고하고 늘리는 단추를 준다.
 */
export function FigureGridPanel({
  grid,
  content,
  onChange,
  onAdd,
  onCenter,
  onRemove,
}: {
  grid: FigureGrid | null;
  /** 선·도형이 차지한 상자(그림 좌표) — 모눈보다 크면 경고. 못 재면 null. */
  content: FigureBox | null;
  onChange: (grid: FigureGrid) => void;
  onAdd: () => void;
  onCenter: () => void;
  onRemove: () => void;
}) {
  if (!grid)
    return (
      <div className="space-y-2 text-xs">
        <p className="leading-relaxed text-muted">
          그림 뒤에 모눈종이를 깝니다. 둘레 여백은 남기고, 칸은 정사각형입니다.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded border border-control bg-surface px-2 py-1.5"
        >
          모눈 깔기
        </button>
      </div>
    );
  const cell = Math.round(grid.cellW * 10) / 10;
  const number = (
    name: string,
    value: number,
    min: number,
    max: number,
    step: number,
    set: (v: number) => FigureGrid,
  ) => (
    <label className="block">
      {name}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`모눈 ${name}`}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value === "" || !Number.isFinite(v)) return;
          onChange(set(Math.min(max, Math.max(min, v))));
        }}
        className="mt-1 w-full rounded border border-control px-1 py-1"
      />
    </label>
  );
  const short = content ? gridShortfall(grid, content) : null;
  const missing = short
    ? (
        [
          ["왼쪽", short.left],
          ["오른쪽", short.right],
          ["위", short.top],
          ["아래", short.bottom],
        ] as const
      ).filter(([, n]) => n > 0)
    : [];
  const move = (dx: number, dy: number) =>
    onChange({ ...grid, x: grid.x + dx * grid.cellW, y: grid.y + dy * grid.cellH });
  const covered = content ? coverFigureGrid(grid, content) : grid;
  const remainder = content ? gridShortfall(covered, content) : null;
  const exceedsLimit = !!remainder && Object.values(remainder).some((n) => n > 0);
  return (
    <div className="space-y-3 text-xs">
      {missing.length > 0 && content && (
        <div
          role="alert"
          className="space-y-1.5 rounded border border-[var(--learn-warning)] bg-[var(--learn-warning-bg)] p-2 text-[var(--learn-warning)]"
        >
          <p className="leading-relaxed">
            모눈이 그림보다 작습니다 — 선·도형이 모눈 밖으로 나갑니다(
            {missing.map(([side, n]) => `${side} ${n}칸`).join(" · ")} 더 필요).
          </p>
          <button
            type="button"
            onClick={() => onChange(covered)}
            disabled={exceedsLimit}
            className="min-h-11 w-full rounded border border-[var(--learn-warning)] bg-surface px-2 py-1 disabled:opacity-50"
          >
            그림이 다 들어가게 늘리기
          </button>
          {exceedsLimit && <p role="status">60칸 한도를 넘습니다. 칸 크기를 늘린 뒤 다시 확인해 주세요.</p>}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {number("가로 칸", grid.cols, 1, GRID_MAX_CELLS, 1, (v) =>
          resizeFigureGrid(grid, "x", v),
        )}
        {number("세로 칸", grid.rows, 1, GRID_MAX_CELLS, 1, (v) =>
          resizeFigureGrid(grid, "y", v),
        )}
        {number("칸 크기", cell, 4, 200, 1, (v) => ({
          ...grid,
          cellW: v,
          cellH: v,
        }))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-muted">자리</span>
        {(
          [
            ["←", -1, 0],
            ["↑", 0, -1],
            ["↓", 0, 1],
            ["→", 1, 0],
          ] as const
        ).map(([name, dx, dy]) => (
          <button
            type="button"
            key={name}
            aria-label={`모눈 한 칸 ${name}`}
            onClick={() => move(dx, dy)}
            className="rounded border border-control px-2 py-1"
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          onClick={onCenter}
          className="rounded border border-control px-2 py-1"
        >
          가운데로
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-muted">선</span>
        {GRID_COLORS.map(([name, color]) => (
          <button
            type="button"
            key={color}
            aria-pressed={grid.color.toLowerCase() === color}
            onClick={() => onChange({ ...grid, color })}
            className={`flex items-center gap-1 rounded border px-2 py-1 ${grid.color.toLowerCase() === color ? "border-ink" : "border-control"}`}
          >
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm border border-control"
              style={{ background: color }}
            />
            {name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-muted">굵기</span>
        {GRID_WIDTHS.map((width) => (
          <button
            type="button"
            key={width}
            aria-pressed={grid.width === width}
            onClick={() => onChange({ ...grid, width })}
            className={`rounded border px-2 py-1 ${grid.width === width ? "border-ink" : "border-control"}`}
          >
            {width}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1">
          <input
            type="checkbox"
            checked={grid.dashed}
            onChange={(e) => onChange({ ...grid, dashed: e.target.checked })}
          />
          점선
        </label>
      </div>
      <p className="leading-relaxed text-muted">
        모눈은 그림 맨 뒤 배경이라 캔버스에서 고르지 않습니다. 칸 수를 바꿔도 그림은 그대로이고, 칸은 양쪽으로 반씩
        늘고 줍니다. 둘레 여백은 «틀 · 세부»의 «다 보이게»로 맞춥니다.
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="w-full rounded border border-control px-2 py-1.5 text-g-red-text"
      >
        모눈 지우기
      </button>
    </div>
  );
}
