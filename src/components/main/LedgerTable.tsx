import { OwnerTag } from "@/components/ui/OwnerTag";
import { nameSelectionClass } from "@/components/ui/rowSelection";
import { hasOwners } from "@/lib/class/ownerLabel";
import type { ClassRow } from "@/lib/main/pipeline";
import type { ReadStatus } from "@/lib/main/loadMainDashboard";

import { ActionControl } from "./ActionControl";
import { StageGauge } from "./StageGauge";

type Props = {
  rows: ClassRow[];
  selectedClassId: string;
  onSelect: (classId: string) => void;
  onProgress: (classId: string) => void;
  readStatusByClass?: Record<string, ReadStatus>;
  canExport?: boolean;
  testsPending?: boolean;
  onRetry?: (classId: string) => void;
};

export function LedgerTable({
  rows,
  selectedClassId,
  onSelect,
  onProgress,
  readStatusByClass = {},
  canExport = true,
  testsPending = false,
  onRetry,
}: Props) {
  // «담당» 열은 서버가 담당을 실어 보낼 때만(관리자 — D-132). 반 바로 뒤(Hi-fi 3).
  const withOwner = hasOwners(rows);
  const heads = withOwner
    ? ["반", "담당", "현재 진도", "오늘", "내일 테스트", "작업"]
    : ["반", "현재 진도", "오늘", "내일 테스트", "작업"];
  return (
    <div className="overflow-x-auto px-6 pt-1.5">
      <table className="w-full border-collapse text-xs tabular-nums">
        <thead>
          <tr>
            {heads.map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b-[2.5px] border-ink px-2.5 py-2 text-left text-[10px] font-black tracking-[1.5px] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.classId}>
              {/*
               * 표 보기에서도 반을 고를 수 있어야 한다 — 반 선택이 드롭다운에서
               * 행 클릭으로 옮겨 갔기 때문이다(원장님 확정 2026-08-26). 이 칸이 없으면
               * **표 보기에서는 어느 반도 못 고른다**(표 보기는 전부 끝난 날 기본 화면이다).
               *
               * ⚠️ D-30: `<tr>` 을 통째로 누르게 만들지 않는다. 진짜 `<button>` 하나만 둔다.
               */}
              <td className="border-b border-divider px-2.5 py-2.5 text-[13px] font-black">
                <button
                  type="button"
                  onClick={() => onSelect(row.classId)}
                  aria-current={
                    row.classId === selectedClassId ? "true" : undefined
                  }
                  className={`min-h-11 cursor-pointer text-left ${nameSelectionClass(
                    row.classId === selectedClassId,
                  )}`}
                >
                  {row.name}
                </button>
              </td>
              {withOwner ? (
                <td className="whitespace-nowrap border-b border-divider px-2.5 py-2.5">
                  {row.owner ? <OwnerTag owner={row.owner} /> : null}
                </td>
              ) : null}
              <td className="border-b border-divider px-2.5 py-2.5">
                {readStatusByClass[row.classId] === "loading"
                  ? "조회 중…"
                  : readStatusByClass[row.classId] === "error"
                    ? "조회 실패"
                    : row.unitLabel}
              </td>
              <td className="border-b border-divider px-2.5 py-2.5">
                {!readStatusByClass[row.classId] ||
                readStatusByClass[row.classId] === "ready" ? (
                  <StageGauge stage={row.stage} compact />
                ) : (
                  "—"
                )}
              </td>
              <td className="border-b border-divider px-2.5 py-2.5">
                {/* 자동 준비 스케줄러는 없다(반자동, D-32 후속). 진도가 있으면 그 차시를
                    원장이 직접 출제하는 흐름이므로 "직접 출제"로 정직하게 표기한다. */}
                {row.hasProgress ? "직접 출제" : "다음 단원 시작"}
              </td>
              <td className="border-b border-divider px-2.5 py-2.5">
                {readStatusByClass[row.classId] === "error" ? (
                  <button
                    type="button"
                    className="min-h-11 cursor-pointer border border-control px-3"
                    onClick={() => onRetry?.(row.classId)}
                  >
                    진도 다시 조회
                  </button>
                ) : (
                  <ActionControl
                    row={row}
                    onProgress={onProgress}
                    canExport={canExport}
                    readPending={
                      readStatusByClass[row.classId] === "loading" ||
                      (canExport && testsPending)
                    }
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
