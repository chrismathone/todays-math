import {
  MAIN_ROW_INNER,
  MAIN_ROW_OUTER,
  type ClassRow,
} from "@/lib/main/pipeline";

import { ActionControl } from "./ActionControl";
import { StageGauge } from "./StageGauge";

type Props = {
  row: ClassRow;
  index: number;
  hot: boolean;
  onSelect: (classId: string) => void;
  onProgress: (classId: string) => void;
};

export function ClassCard({ row, index, hot, onSelect, onProgress }: Props) {
  const waiting = row.stage === "progress";

  return (
    <article
      aria-label={row.name}
      // 배경이 흰색이 되면서 `bg-white` 는 아무 일도 하지 않게 됐다(구 회색 배경 시절의
      // "hot = 흰 표면" 신호). 지금 **고른** 반은 **왼쪽 잉크 바 + 굵은 밑선**으로 표시한다.
      //
      // ⚠️ `opacity` 로 대기 행을 흐리게 하던 것을 걷었다. 투명도는 그 행의 **모든** 색
      // 대비를 한꺼번에 깎아서, 78% 만으로도 경고 글자가 4.5:1 밑으로 내려갔다.
      // 흐림은 이제 색 자체(`text-text-3`)로만 준다 — 대비를 계산할 수 있어야 한다.
      //
      // 고른 행은 **네 변 전부** 굵게 (원장님 2026-08-26 「아래 테두리만 굵어지는데
      // 전체 테두리가 굵어지도록」). 밑줄 하나로는 «고른 것»보다 «구분선»처럼 읽힌다.
      //
      // ⚠️ 안 고른 행에도 **같은 두께의 투명 테두리**를 깐다. 안 그러면 고를 때마다
      //    위·좌·우로 2px 씩 자라 **목록 전체가 들썩인다** — 누를 때마다 글자가 밀리면
      //    다음 행을 겨냥하기 어려워진다.
      className={`${MAIN_ROW_OUTER} border-2 py-3 ${
        hot
          ? "border-ink shadow-[inset_5px_0_0_var(--blue)]"
          : "border-transparent border-b-divider"
      }`}
    >
      {/*
       * 행을 눌러 반을 고른다 (원장님 확정 2026-08-26 — 「드롭다운으로 반 선택을 없애고
       * 클릭으로 원하는 반 먼저 액션」). 오른쪽 진도 패널이 이 반으로 바뀐다.
       *
       * ⚠️ D-30 은 「카드를 못 누르게」가 아니라 「눌리는 것처럼 보이는데 안 눌리는 것」을
       *    막는다. 그래서 표면(`article`)에 `onClick` 을 얹지 않고 **진짜 `<button>`** 을
       *    나란히 둔다 — 손가락 커서도 hover 도 이 버튼 것이라 거짓말이 아니다.
       *    액션 컨트롤을 이 버튼 **안에** 넣으면 컨트롤이 겹쳐 클릭이 서로를 먹는다.
       */}
      <button
        type="button"
        onClick={() => onSelect(row.classId)}
        aria-current={hot ? "true" : undefined}
        className={`${MAIN_ROW_INNER} min-h-11 cursor-pointer text-left hover:bg-side`}
      >
        <span
          className={`text-2xl font-black tabular-nums leading-none ${
            hot ? "text-g-blue" : "text-text-3"
          }`}
        >
          {index}
        </span>
        <span className="min-w-0 block">
          <span className="flex items-baseline gap-2 overflow-hidden whitespace-nowrap">
            <span className="shrink-0 text-[15px] font-black tracking-[-0.3px]">
              {row.name}
            </span>
            {row.testTypeLabel ? (
              <span className="shrink-0 text-[10.5px] font-bold text-faint">
                {row.testTypeLabel}
              </span>
            ) : null}
          </span>
          <span
            className={`mt-[3px] block overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] tabular-nums ${
              waiting ? "font-bold text-g-red-text" : "text-muted"
            }`}
          >
            {row.meta}
          </span>
        </span>
        <StageGauge stage={row.stage} waiting={waiting} />
      </button>
      <ActionControl row={row} onProgress={onProgress} />
    </article>
  );
}
