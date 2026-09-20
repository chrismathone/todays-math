import type { MirrorAxis } from "./figureMirror";
import type { RotateTurn } from "./figureRotate";

const BUTTON =
  "rounded border border-control px-2 py-1 enabled:hover:bg-side disabled:opacity-40";

/**
 * 오른쪽 칸 «반시계 90°»·«시계 90°» — 원장님 2026-09-19 «회전 옵션 추가 가능한지. 시계 반시계 90도 방향».
 * 선택한 요소·여러 요소·묶음 칸 모두 같은 자리(제목·묶음 줄 아래)에 선다. 고른 것 전체가 한 덩어리로 돈다.
 * 돌릴 수 없으면 두 단추를 끄고 이유를 title 과 단추 밑 보조 글로 단다(꺼진 단추는 title 이 안 뜨는 브라우저가 있다).
 *
 * 밑으로 줄 둘이 더 선다 — 끄는 방식은 모두 회전과 같다.
 * ① «좌우 대칭»·«상하 대칭»(원장님 2026-09-20) — `mirror` 를 줄 때. 고른 것 전체를 제 가운데 축에 비춘다.
 * ② «반대쪽으로 뒤집기»(원장님 2026-09-19) — `flip` 을 줄 때만(곡선·꺾은선 하나를 골랐을 때). ①과 달리
 *    **곡선 하나를 제 두 끝을 잇는 현에 대해** 비추는 다른 기능이라 줄을 따로 세우고 문구도 갈라 둔다.
 */
export function FigureRotateRow({
  blocked,
  onRotate,
  mirror,
  flip,
}: {
  /** 끌 이유 — 없으면 null */
  blocked: string | null;
  onRotate: (turn: RotateTurn) => void;
  /** «좌우 대칭»·«상하 대칭» — 없으면 그 줄을 세우지 않는다. `blocked` 는 끌 이유(없으면 null). */
  mirror?: { blocked: string | null; onMirror: (axis: MirrorAxis) => void };
  /** «반대쪽으로 뒤집기» — 없으면 그 줄을 세우지 않는다. `blocked` 는 끌 이유(없으면 null). */
  flip?: { blocked: string | null; onFlip: () => void };
}) {
  const buttons: { turn: RotateTurn; glyph: string; label: string }[] = [
    { turn: "ccw", glyph: "↺", label: "반시계 90°" },
    { turn: "cw", glyph: "↻", label: "시계 90°" },
  ];
  const mirrors: { axis: MirrorAxis; glyph: string; label: string }[] = [
    { axis: "vertical", glyph: "↔", label: "좌우 대칭" },
    { axis: "horizontal", glyph: "↕", label: "상하 대칭" },
  ];
  return (
    <>
      <section
        aria-label="회전"
        className={`${mirror || flip ? "mb-2" : "mb-3"} space-y-1 text-xs`}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">회전</span>
          {buttons.map(({ turn, glyph, label }) => (
            <button
              key={turn}
              type="button"
              disabled={blocked !== null}
              title={blocked ?? undefined}
              onClick={() => onRotate(turn)}
              className={BUTTON}
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
      {mirror && (
        <section
          aria-label="대칭"
          className={`${flip ? "mb-2" : "mb-3"} space-y-1 text-xs`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">대칭</span>
            {mirrors.map(({ axis, glyph, label }) => (
              <button
                key={label}
                type="button"
                disabled={mirror.blocked !== null}
                title={mirror.blocked ?? undefined}
                onClick={() => mirror.onMirror(axis)}
                className={BUTTON}
              >
                <span aria-hidden="true" className="mr-1">
                  {glyph}
                </span>
                {label}
              </button>
            ))}
          </div>
          {mirror.blocked && <p className="text-muted">{mirror.blocked}</p>}
        </section>
      )}
      {flip && (
        <section aria-label="뒤집기" className="mb-3 space-y-1 text-xs">
          <button
            type="button"
            disabled={flip.blocked !== null}
            title={flip.blocked ?? undefined}
            onClick={flip.onFlip}
            className={BUTTON}
          >
            반대쪽으로 뒤집기
          </button>
          {flip.blocked && <p className="text-muted">{flip.blocked}</p>}
        </section>
      )}
    </>
  );
}
