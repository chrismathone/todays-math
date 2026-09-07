"use client";

import type { Difficulty } from "@/contracts/difficulty";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

/**
 * **담기 바구니 하단 고정 바** — 원장님 확정 2026-09-04 (Wire ① · Hi-fi ㉡).
 *
 * 담기 전에는 **아예 없다.** 담는 순간 나타나고, 필터를 바꿔도 쪽을 넘겨도 따라다닌다.
 * 바가 말하는 것은 **수 + 난이도 분포**다 — 짜면서 균형이 보여야 하기 때문이다.
 *
 * ## 🔴 분포를 여기서 세지 않는다
 *
 * `spread` 는 서버가 센 것을 그대로 받는다(`/api/basket`). 화면이 다시 세면
 * **담긴 것의 일부만 받아 온 쪽**에서 조용히 다른 수가 나온다 — 그때 바는 거짓말을
 * 하는데 아무도 안 울린다.
 *
 * ## 0인 칸은 안 적는다
 *
 * 서버는 사다리 전 칸을 $0$ 으로 채워 보낸다(「칸이 없다」와 「0이다」를 가르려고).
 * 그러나 **지면에 「연산 0 · 기본 0」을 늘어놓으면 읽을 것이 아니라 소음**이다.
 * 그래서 그리는 쪽에서 0을 접는다 — 세는 쪽과 그리는 쪽의 일이 다르다.
 *
 * ## 적힌 수의 합은 곧 「담은 문항 N개」다
 *
 * 예전에는 「난이도 없음 N」을 따로 적었는데, 난이도는 **NOT NULL** 이라 그 칸이
 * 구조적으로 늘 0 이었다(원장님 지시로 2026-09-05 에 뗐다). 지금은 0 인 칸만
 * 접히므로, 적힌 수를 다 더하면 `total` 이 된다.
 *
 * D-30 — 바 표면은 누르는 것이 아니다. 손가락 커서는 실제 `<button>` 에만 있다.
 *
 * ## 🔴 바는 자기를 화면에 고정하지 않는다 (2026-09-07)
 *
 * 고정(`fixed bottom-0`)은 **`ProblemBank` 의 틀**이 한다 — 틀 안에 패널과 이 바가 차례로
 * 선다. 예전엔 이 바의 뿌리에도 `fixed bottom-0` 이 붙어 있어서 **틀과 겹쳐 그려졌고**,
 * 패널을 열면 마지막 줄(「이 문항들로 시험지 만들기」)이 바 밑에 깔려 **눌리지 않았다.**
 * 새 계정으로 걸어 보다 Playwright 가 「`담은 문항` 영역이 포인터를 가로챈다」고 찍어서
 * 드러났다. `BasketBar.test.tsx` 가 그 모양을 잠근다.
 */
export type BasketBarProps = {
  total: number;
  spread: Record<Difficulty, number>;
  /** 왕복 중에는 버튼을 잠근다 — 두 번 눌러 시험지가 둘 생기는 것을 막는다. */
  busy: boolean;
  onOpenList: () => void;
  onMakeTest: () => void;
};

export function BasketBar({
  total,
  spread,
  busy,
  onOpenList,
  onMakeTest,
}: BasketBarProps) {
  // 사다리 차례대로 — 손으로 나열하지 않는다(새 갈래가 붙으면 여기도 따라온다).
  const parts = DIFFICULTY_LADDER.filter((d) => (spread[d] ?? 0) > 0).map(
    (d) => `${d} ${spread[d]}`,
  );

  return (
    <div
      className="print:hidden"
      // 담긴 것이 있다는 사실 자체가 알림이다 — 화면 낭독기에도 그렇게 읽히게 한다.
      role="region"
      aria-label="담은 문항"
    >
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <span className="text-[12.5px] font-bold text-ink">
          담은 문항 {total}개
        </span>
        {parts.length > 0 ? (
          <span className="text-[12.5px] text-text-2">{parts.join(" · ")}</span>
        ) : null}
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onOpenList}
            className="inline-flex min-h-11 cursor-pointer items-center border border-control bg-surface px-4 text-[12.5px] font-bold text-ink transition-colors hover:bg-side"
          >
            목록 보기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onMakeTest}
            className="inline-flex min-h-11 cursor-pointer items-center bg-g-blue px-4 text-[12.5px] font-bold text-white transition-colors hover:enabled:bg-[#18497f] disabled:cursor-not-allowed disabled:bg-side disabled:text-text-3"
          >
            시험지 만들기
          </button>
        </span>
      </div>
    </div>
  );
}
