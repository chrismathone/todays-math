import {
  MAIN_ROW_INNER,
  MAIN_ROW_OUTER,
  type ClassRow,
} from "@/lib/main/pipeline";

import { OwnerTag } from "@/components/ui/OwnerTag";

import { StageGauge } from "./StageGauge";

type Props = {
  row: ClassRow;
  hot: boolean;
  onSelect: (classId: string) => void;
};

/**
 * 오늘 끝난 반 한 줄.
 *
 * ⚠️ 여기도 **누를 수 있어야 한다.** 반 선택이 드롭다운에서 행 클릭으로 옮겨 갔는데
 *    (원장님 확정 2026-08-26), 그 드롭다운은 **완료된 반까지 담고 있었다.** 완료 행을
 *    안 눌리게 두면 「끝난 반의 진도를 다시 보기」가 통째로 사라진다 — 화면 어디에도
 *    그 반으로 가는 길이 없어지고, **오류도 안 난다.**
 */
export function DoneSummaryRow({ row, hot, onSelect }: Props) {
  return (
    <div
      // 진행 행과 **같은 표시**를 쓴다 — 고른 행은 네 변 전부 굵게, 안 고른 행은
      // 같은 두께의 투명 테두리로 자리만 잡는다(목록이 들썩이지 않게).
      className={`${MAIN_ROW_OUTER} border-2 py-2.5 text-[11px] font-bold text-faint ${
        hot
          ? "border-ink shadow-[inset_5px_0_0_var(--blue)]"
          : "border-transparent"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(row.classId)}
        aria-label={`${row.name} 완료`}
        aria-current={hot ? "true" : undefined}
        className={`${MAIN_ROW_INNER} min-h-11 cursor-pointer text-left hover:bg-side`}
      >
        <span />
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {row.name}
          {/* 담당 — 서버가 실어 보낼 때만(관리자, D-132). 반 이름 바로 뒤 */}
          {row.owner ? (
            <OwnerTag owner={row.owner} className="ml-1.5" />
          ) : null}{" "}
          — {row.meta}
        </span>
        <span className="max-sm:col-span-2">
          <StageGauge stage="done" />
        </span>
      </button>
      <span className="text-center">완료</span>
    </div>
  );
}
