"use client";

import { useCallback, useState } from "react";

import { ProblemCard } from "@/components/problem/ProblemCard";
import type { ProblemEntity } from "@/contracts/problem.contract";

/**
 * UI-07 재확인 표본 — **제품 카드 그대로** 그린다.
 *
 * 🔴 카드를 흉내 내지 않는다. `ProblemCard` 를 그대로 부르고 상태만 바꿔 넘긴다 —
 *    흉내 내면 「같은 무게로 보이나」를 **다른 화면에서** 묻게 된다(2026-09-08 에
 *    헤더 시안이 정확히 그렇게 틀렸다).
 *
 * ⚠️ 아무것도 안 바꾼다. 「담기」는 이 화면 안에서만 켜졌다 꺼진다(서버로 안 간다).
 */
type Props = {
  approved: ProblemEntity | null;
  pending: ProblemEntity | null;
  locked: ProblemEntity | null;
};

const NOTE = "text-[11.5px] text-text-2 leading-relaxed";

export function CardStatesClient({ approved, pending, locked }: Props) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = useCallback((id: string, was: boolean) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (was) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const noop = useCallback(async () => {}, []);

  const rows: Array<{
    title: string;
    note: string;
    row: ProblemEntity | null;
  }> = [
    {
      title: "① 승인·출제 가능",
      note: '🔴 실측하고 고친 설명 — 처음엔 「승인된 문항에는 승인·반려가 없다」고 적었는데 틀렸다. 「승인」만 사라지고 「반려」는 남는다(조건이 `reviewStatus !== "rejected"` 라서). 공유 DB 는 pending 0 · rejected 0 · approved 100,828 이므로 모든 카드가 이 모양이다.',
      row: approved,
    },
    {
      title: "② 미승인(pending)",
      note: "「승인」이 보이는 유일한 상태. ⚠️ 지금 공유 DB 에는 pending 이 0건이라 이 칸은 비어 있다 — 곧 「승인」 버튼은 실제 화면에 영영 안 나온다.",
      row: pending,
    },
    {
      title: "③ 출제가 잠긴 문항",
      note: "담기가 비활성이고 사유가 옆에 글자로 붙는다(원장님 확정 2026-09-07 — title 은 마우스를 올려야 보인다).",
      row: locked,
    },
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 bg-canvas px-6 py-8 text-ink">
      <header className="flex flex-col gap-2 border-b-[3px] border-ink pb-4">
        <h1 className="text-[22px] font-black">
          문제 카드 상태 표본 (UI-07 재확인)
        </h1>
        <p className={NOTE}>
          리뷰가 「주 행동과 관리 행동이 같은 무게」라고 본 캡처는 일반 문항
          하나뿐이라, 잠김·담김·처리 중을 본 적이 없습니다. 아래는 실데이터를
          제품 카드로 그대로 그린 것입니다. 실측 결과: 공유 DB 는 pending 0 ·
          rejected 0 · approved 100,828 이라, 「승인」은 안 뜨고 「반려」는 모든
          카드에 뜹니다.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBusy((v) => !v)}
            aria-pressed={busy}
            className={`border px-3 py-1 text-[12.5px] ${
              busy ? "border-ink bg-ink text-white" : "border-control bg-white"
            }`}
          >
            처리 중
          </button>
          <span className={NOTE}>
            켜면 담기가 비활성이 됩니다. 「담기」를 눌러 담김 상태도 볼 수
            있습니다.
          </span>
        </div>
      </header>

      {rows.map(({ title, note, row }) => (
        <section key={title} className="flex flex-col gap-2">
          <h2 className="text-[15px] font-black">{title}</h2>
          <p className={NOTE}>{note}</p>
          {row ? (
            <ProblemCard
              problem={row}
              onReviewStatusChange={noop}
              onTransformAdopted={() => {}}
              basket={{
                picked: picked.has(row.id),
                busy,
                onToggle: toggle,
              }}
            />
          ) : (
            <p className="text-[12.5px] text-g-red-text">
              이 상태의 문항이 DB 에 없습니다 — 표본이 비었으므로 이 칸으로는
              아무것도 확인할 수 없습니다.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
