"use client";

import { useEffect, useState } from "react";

import type { BasketItem } from "@/contracts/basket.contract";
import type { ClassEntity } from "@/contracts/class.contract";

/**
 * **담은 문항 목록 + 시험지 만들기** — 하단 바가 펼치는 한 겹.
 *
 * 바에는 단추가 둘이지만 **여는 것은 이 하나**다(원장님이 고르신 「간결」).
 * 「목록 보기」는 담긴 것을 보여 주고, 「시험지 만들기」는 같은 판을 열되 아래
 * 만들기 칸으로 데려간다. 두 판을 따로 두면 무엇이 어디 있는지 외워야 한다.
 *
 * ## 🔴 여기서 «빼기»는 서버를 바꾼다
 *
 * 바구니는 계정에 저장된다(원장님 확정). 화면에서만 빼면 새로고침에 되살아나고,
 * 그건 「계정에 저장」이라는 약속이 절반만 참이라는 뜻이다.
 *
 * D-30 — 행 표면은 누르는 것이 아니다. 손가락 커서는 실제 `<button>` 에만.
 */
export type BasketPanelProps = {
  items: BasketItem[];
  busy: boolean;
  onRemove: (problemId: string) => void;
  onClear: () => void;
  onMakeTest: (classId: string, testDate: string) => void;
  onClose: () => void;
};

/** 오늘 날짜(YYYY-MM-DD) — 시험 예정일의 기본값. */
function today(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BasketPanel({
  items,
  busy,
  onRemove,
  onClear,
  onMakeTest,
  onClose,
}: BasketPanelProps) {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [classId, setClassId] = useState("");
  const [testDate, setTestDate] = useState(today);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/classes?page=1&pageSize=100");
        if (!res.ok) throw new Error("반 목록을 불러오지 못했습니다");
        const body = (await res.json()) as { data: ClassEntity[] };
        if (!alive) return;
        setClasses(body.data);
        // 반이 하나뿐이면 고를 것이 없다 — 미리 골라 둔다(원장님 대부분이 그렇다).
        if (body.data.length === 1) setClassId(body.data[0]!.id);
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1180px] px-6 pt-3">
      <div className="flex items-center gap-3">
        <span className="text-[12.5px] font-bold text-ink">
          담은 문항 {items.length}개
        </span>
        <button
          type="button"
          disabled={busy || items.length === 0}
          onClick={onClear}
          className="ml-auto min-h-11 cursor-pointer px-2 text-[12.5px] font-bold text-ink underline-offset-2 hover:enabled:underline disabled:cursor-not-allowed disabled:text-text-3"
        >
          모두 비우기
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 cursor-pointer border border-control bg-surface px-4 text-[12.5px] font-bold text-ink transition-colors hover:bg-side"
        >
          접기
        </button>
      </div>

      <ul className="mt-2 max-h-[38vh] overflow-y-auto border-t border-divider">
        {items.map((item, index) => (
          <li
            key={item.problem.id}
            className="flex items-center gap-3 border-b border-divider py-1.5 text-[12.5px]"
          >
            {/* 🔴 바구니에 적힌 차례가 아니라 **다시 센 번호**를 보여 준다 —
                빼기가 구멍을 내므로 저장된 번호는 1..N 이 아니고, 시험지의 문항
                번호도 여기 보이는 이 수가 된다. 저장된 값을 그대로 보이면 원장님이
                「3번이 없다」를 보시게 된다. */}
            <span className="w-6 shrink-0 tabular-nums text-text-3">
              {index + 1}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-ink">
              {item.problem.problemCode}
            </span>
            <span className="shrink-0 text-text-2">
              {item.problem.difficulty ?? "난이도 없음"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(item.problem.id)}
              className="ml-auto min-h-11 shrink-0 cursor-pointer px-2 font-bold text-ink underline-offset-2 hover:enabled:underline disabled:cursor-not-allowed disabled:text-text-3"
            >
              빼기
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-divider pt-3">
        <label className="grid gap-1 text-[10px] font-extrabold tracking-[1.2px] text-text-2">
          반
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="min-h-11 w-[180px] border border-control bg-surface px-3 text-[12.5px] font-bold text-ink"
          >
            <option value="">선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-extrabold tracking-[1.2px] text-text-2">
          시험 예정일
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="min-h-11 w-[170px] border border-control bg-surface px-3 text-[12.5px] font-bold text-ink"
          />
        </label>
        <button
          type="button"
          // 반을 안 고르면 만들 수 없다 — 그 사실을 «비활성»으로 보인다(D-30 규약대로
          // 비활성은 흐리지 않고 전용 색을 쓴다).
          disabled={busy || classId === "" || items.length === 0}
          onClick={() => onMakeTest(classId, testDate)}
          className="min-h-11 cursor-pointer bg-g-blue px-4 text-[12.5px] font-bold text-white transition-colors hover:enabled:bg-[#18497f] disabled:cursor-not-allowed disabled:bg-side disabled:text-text-3"
        >
          이 문항들로 시험지 만들기
        </button>
        {loadError ? (
          <span className="text-[12.5px] font-bold text-g-red-text">
            {loadError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
