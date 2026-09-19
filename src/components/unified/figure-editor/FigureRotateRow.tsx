import type { RotateTurn } from "./figureRotate";

/**
 * 오른쪽 칸 «반시계 90°»·«시계 90°» — 원장님 2026-09-19 «회전 옵션 추가 가능한지. 시계 반시계 90도 방향».
 * 선택한 요소·여러 요소·묶음 칸 모두 같은 자리(제목·묶음 줄 아래)에 선다. 고른 것 전체가 한 덩어리로 돈다.
 * 돌릴 수 없으면 두 단추를 끄고 이유를 title 과 단추 밑 보조 글로 단다(꺼진 단추는 title 이 안 뜨는 브라우저가 있다).
 */
export function FigureRotateRow({
  blocked,
  onRotate,
}: {
  /** 끌 이유 — 없으면 null */
  blocked: string | null;
  onRotate: (turn: RotateTurn) => void;
}) {
  const buttons: { turn: RotateTurn; glyph: string; label: string }[] = [
    { turn: "ccw", glyph: "↺", label: "반시계 90°" },
    { turn: "cw", glyph: "↻", label: "시계 90°" },
  ];
  return (
    <section aria-label="회전" className="mb-3 space-y-1 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium">회전</span>
        {buttons.map(({ turn, glyph, label }) => (
          <button
            key={turn}
            type="button"
            disabled={blocked !== null}
            title={blocked ?? undefined}
            onClick={() => onRotate(turn)}
            className="rounded border border-control px-2 py-1 enabled:hover:bg-side disabled:opacity-40"
          >
            <span aria-hidden="true" className="mr-1">
              {glyph}
            </span>
            {label}
          </button>
        ))}
      </div>
      {blocked && <p className="text-muted">{blocked}</p>}
    </section>
  );
}
