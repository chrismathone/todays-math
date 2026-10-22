import { useState } from "react";
import {
  ALIGN_BLOCKED,
  ALIGN_SPREAD_FEW,
  SPREAD_BLOCKED,
  type AlignKind,
  type SpreadAxis,
} from "./figureAlign";
import type { MirrorAxis } from "./figureMirror";
import type { OrderMove } from "./figureOrder";
import type { RotateTurn } from "./figureRotate";
import { modKey } from "./platform";

const BUTTON =
  "rounded border border-control px-2 py-1 enabled:hover:bg-side disabled:opacity-40";

/**
 * 오른쪽 칸 «반시계 90°»·«시계 90°»·«180도 회전».
 * 선택한 요소·여러 요소·묶음 칸 모두 같은 자리(제목·묶음 줄 아래)에 선다. 고른 것 전체가 한 덩어리로 돈다.
 * 돌릴 수 없으면 세 단추를 끄고 이유를 title 과 단추 밑 보조 글로 단다(꺼진 단추는 title 이 안 뜨는 브라우저가 있다).
 *
 * «좌우 대칭»·«상하 대칭»은 `mirror` 를 줄 때 아래 줄에 선다. 고른 것 전체를 제 가운데 축에 비춘다.
 */
export function FigureRotateRow({
  blocked,
  onRotate,
  mirror,
}: {
  /** 끌 이유 — 없으면 null */
  blocked: string | null;
  onRotate: (turn: RotateTurn) => void;
  /** «좌우 대칭»·«상하 대칭» — 없으면 그 줄을 세우지 않는다. `blocked` 는 끌 이유(없으면 null). */
  mirror?: { blocked: string | null; onMirror: (axis: MirrorAxis) => void };
}) {
  const buttons: { turn: RotateTurn; glyph: string; label: string }[] = [
    { turn: "ccw", glyph: "↺", label: "반시계 90°" },
    { turn: "cw", glyph: "↻", label: "시계 90°" },
    { turn: "half", glyph: "↻", label: "180도 회전" },
  ];
  const mirrors: { axis: MirrorAxis; glyph: string; label: string }[] = [
    { axis: "vertical", glyph: "↔", label: "좌우 대칭" },
    { axis: "horizontal", glyph: "↕", label: "상하 대칭" },
  ];
  return (
    <>
      <section
        aria-label="회전"
        className={`${mirror ? "mb-2" : "mb-3"} space-y-1 text-xs`}
      >
        <div className="flex flex-wrap items-center gap-2">
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
        <section aria-label="대칭" className="mb-3 space-y-1 text-xs">
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
 *
 * 둘 다 꺼졌으면 이유를 **한 줄**로 합쳐 간격 줄 밑에 적는다(원장님 2026-09-21 «안 D», 시안 그대로) —
 * «고른 것이 적어»면 «정렬은 둘, 간격은 셋 이상 고르면 켜집니다.», 이유가 같으면(면만 고름) 그 이유 하나.
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
  const merged =
    blocked === ALIGN_BLOCKED.few && spread.blocked === SPREAD_BLOCKED.few
      ? ALIGN_SPREAD_FEW
      : blocked !== null && blocked === spread.blocked
        ? blocked
        : null;
  const spreadNote = merged ?? spread.blocked;
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
        {blocked && !merged && <p className="text-muted">{blocked}</p>}
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
        {spreadNote && <p className="text-muted">{spreadNote}</p>}
      </section>
    </>
  );
}

/**
 * 오른쪽 칸 «순서» — 원장님 2026-09-21 «맨 뒤로 맨 앞으로, 뒤로, 앞으로 같은 순서를 이용해서 조절하는게 있는데,
 * 우리 도형 편집기에는 그 기능이 없어서 지금 y축이 가려져버렸어».
 *
 * 정렬·간격 줄과 같은 꼴(제목 + 단추)로 그 아래 선다 — ppt 도 «정렬» 메뉴에 순서를 같이 둔다. 단축키는 ppt 그대로라
 * title 에 적는다. 이미 맨 앞(맨 뒤)이면 그쪽 단추 둘을 끄고 이유는 title 에만 — 새로 그린 요소는 늘 맨 앞이라
 * 회전 줄처럼 밑에 줄 글로 달면 그릴 때마다 한 줄이 생겼다 사라진다. 규칙은 `figureOrder.ts`.
 */
export function FigureOrderRow({
  blocked,
  onOrder,
}: {
  /** 앞으로 가는 둘(맨 앞으로·앞으로) · 뒤로 가는 둘(뒤로·맨 뒤로)을 끌 이유 — 없으면 null */
  blocked: { front: string | null; back: string | null };
  onOrder: (move: OrderMove) => void;
}) {
  const mod = modKey();
  const moves: {
    move: OrderMove;
    label: string;
    keys: string;
    off: string | null;
  }[] = [
    {
      move: "front",
      label: "맨 앞으로",
      keys: `${mod}+Shift+]`,
      off: blocked.front,
    },
    { move: "forward", label: "앞으로", keys: `${mod}+]`, off: blocked.front },
    { move: "backward", label: "뒤로", keys: `${mod}+[`, off: blocked.back },
    {
      move: "back",
      label: "맨 뒤로",
      keys: `${mod}+Shift+[`,
      off: blocked.back,
    },
  ];
  return (
    <section aria-label="순서" className="mb-3 space-y-1 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">순서</span>
        {moves.map(({ move, label, keys, off }) => (
          <button
            key={move}
            type="button"
            disabled={off !== null}
            title={off ?? `${label} (${keys})`}
            onClick={() => onOrder(move)}
            className={BUTTON}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * «다 보이게» — 그림을 손으로 끌어 틀 밖으로 내보내면 편집 화면에서만 잘린다(저장하면 틀이 다시 맞춰진다).
 * 원장님 2026-09-20 확정: 끌 때마다 자동으로 넓히지 않고(그러면 끌 때마다 그림이 야금야금 작아진다)
 * **단추 하나**로 한다. 누르면 지금 내용에 틀을 딱 맞춘다 — 잘린 것이 들어오고 남는 여백은 줄어든다.
 * 규칙은 저장할 때와 같은 한 함수(`figureFrame.renderFittedFigure`)다.
 *
 * 오른쪽 칸 «틀 · 세부» 무리의 첫 줄 — 고른 것이 없어도 늘 선다(틀은 선택과 무관하다). 꼴은 회전·정렬 줄과 같은
 * «이름 + 단추 + 짧은 글» 한 줄(원장님 2026-09-21 «안 D», 시안 그대로).
 * 이미 딱 맞으면 눌러도 아무 일이 안 일어난다(되돌리기 자리도 안 생긴다). 미리 흐리게 하려면 렌더마다
 * 조판·측정을 다시 해야 해서 끄지 않는다.
 */
export function FigureFitRow({ onFit, onExpand }: {
  onFit: () => void;
  onExpand?: (margin: number, axis: "both" | "horizontal" | "vertical") => void;
}) {
  const [margin, setMargin] = useState(20);
  return (
    <section
      aria-label="틀"
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      <span className="font-medium">틀</span>
      <button
        type="button"
        title="그림 전체가 들어가게 틀을 다시 맞춥니다"
        onClick={onFit}
        className={BUTTON}
      >
        다 보이게
      </button>
      <span className="text-muted">잘린 곳을 들이고 여백을 줄입니다</span>
      {onExpand && <div className="flex w-full flex-wrap items-center gap-1.5">
        <label className="flex items-center gap-1">여백
          <input type="number" aria-label="틀 확장 여백" min={1} max={1000} value={margin}
            onChange={(event) => setMargin(Number(event.target.value))}
            className="w-14 rounded border border-control px-1 py-1" />
        </label>
        {([["both", "전체 넓히기"], ["horizontal", "가로 넓히기"], ["vertical", "세로 넓히기"]] as const).map(([axis, name]) =>
          <button key={axis} type="button" className={BUTTON} disabled={!Number.isFinite(margin) || margin < 1 || margin > 1000}
            onClick={() => onExpand(margin, axis)}>{name}</button>)}
      </div>}
    </section>
  );
}
