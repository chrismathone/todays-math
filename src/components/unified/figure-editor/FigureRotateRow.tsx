import type { AlignKind, SpreadAxis } from "./figureAlign";
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

/**
 * 오른쪽 칸 «정렬»·«간격» — 원장님 2026-09-21 «요소별 각종 정렬 기능 넣어줄 수 있으면 넣어줘.
 * 왼쪽 정렬, 가운데 정렬, 우측 정렬, 중앙 정렬 등등».
 *
 * 회전·대칭 줄과 같은 꼴(제목 + 단추들)로 그 아래 선다. 고른 것 **둘 이상**을 서로 맞춘다 —
 * 기준은 고른 것들의 바깥 상자다(그림 틀이 아니다). 하나만 골랐으면 흐리고 이유를 단추 밑에 적는다.
 * «간격»(고르게 벌리기)은 셋부터 — 사이가 둘은 되어야 «고르게»가 뜻이 있다.
 */
export function FigureAlignRow({
  blocked,
  onAlign,
  spread,
}: {
  /** 끌 이유 — 없으면 null */
  blocked: string | null;
  onAlign: (kind: AlignKind) => void;
  /** «고르게 벌리기» — `blocked` 는 끌 이유(없으면 null). */
  spread: { blocked: string | null; onSpread: (axis: SpreadAxis) => void };
}) {
  const kinds: { kind: AlignKind; label: string }[] = [
    { kind: "left", label: "왼쪽" },
    { kind: "centerX", label: "가로 가운데" },
    { kind: "right", label: "오른쪽" },
    { kind: "top", label: "위" },
    { kind: "middleY", label: "세로 가운데" },
    { kind: "bottom", label: "아래" },
  ];
  const axes: { axis: SpreadAxis; label: string }[] = [
    { axis: "horizontal", label: "가로 고르게" },
    { axis: "vertical", label: "세로 고르게" },
  ];
  return (
    <>
      <section aria-label="정렬" className="mb-2 space-y-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">정렬</span>
          {kinds.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              disabled={blocked !== null}
              title={blocked ?? `${label} 맞추기`}
              onClick={() => onAlign(kind)}
              className={BUTTON}
            >
              {label}
            </button>
          ))}
        </div>
        {blocked && <p className="text-muted">{blocked}</p>}
      </section>
      <section aria-label="간격" className="mb-3 space-y-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">간격</span>
          {axes.map(({ axis, label }) => (
            <button
              key={axis}
              type="button"
              disabled={spread.blocked !== null}
              title={spread.blocked ?? "사이 간격을 같게 — 양 끝은 제자리"}
              onClick={() => spread.onSpread(axis)}
              className={BUTTON}
            >
              {label}
            </button>
          ))}
        </div>
        {spread.blocked && <p className="text-muted">{spread.blocked}</p>}
      </section>
    </>
  );
}

/**
 * «다 보이게» — 그림을 손으로 끌어 틀 밖으로 내보내면 편집 화면에서만 잘린다(저장하면 틀이 다시 맞춰진다).
 * 원장님 2026-09-20 확정: 끌 때마다 자동으로 넓히지 않고(그러면 끌 때마다 그림이 야금야금 작아진다)
 * **단추 하나**로 한다. 누르면 지금 내용에 틀을 딱 맞춘다 — 잘린 것이 들어오고 남는 여백은 줄어든다.
 * 규칙은 저장할 때와 같은 한 함수(`figureFrame.renderFittedFigure`)다.
 *
 * 회전·대칭 줄 **아래**, 고른 것이 없어도 늘 선다 — 틀은 선택과 무관하다.
 * 이미 딱 맞으면 눌러도 아무 일이 안 일어난다(되돌리기 자리도 안 생긴다). 미리 흐리게 하려면 렌더마다
 * 조판·측정을 다시 해야 해서 끄지 않는다.
 */
export function FigureFitRow({ onFit }: { onFit: () => void }) {
  return (
    <section aria-label="틀" className="mb-3 space-y-1 text-xs">
      <button
        type="button"
        title="그림 전체가 들어가게 틀을 다시 맞춥니다"
        onClick={onFit}
        className={BUTTON}
      >
        다 보이게
      </button>
      <p className="text-muted">
        틀을 지금 그림에 맞춥니다. 잘린 곳이 들어오고 남는 여백은 줄어듭니다.
      </p>
    </section>
  );
}
