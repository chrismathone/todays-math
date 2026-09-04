"use client";

import { useEffect, useState } from "react";

import { ProblemCard } from "@/components/problem/ProblemCard";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import { Button } from "@/components/ui/Button";
import type { ProblemEntity } from "@/contracts/problem.contract";

/**
 * 하단 고정 바 Hi-fi **4안**. 원장님이 Wire 에서 ① 하단 고정 바를 고르셨고,
 * 「담은 것만으로 새 시험지」·「계정에 저장」까지 정하셨다. 남은 것은 **바의 밀도**다.
 *
 * 네 안의 축은 하나다 — **바가 얼마나 말하는가.**
 * ㉠ 수만 · ㉡ 수 + 난이도 분포 · ㉢ 담은 문항의 얼굴(코드 칩) · ㉣ 접었다 펴는 목록.
 *
 * ⚠️ 넷 다 **같은 규칙**을 지킨다(D-30) — 누르는 것은 실제 `<button>` 뿐이고
 *    카드·바 표면에는 손가락 커서를 안 준다.
 */
const VARIANTS = [
  { id: "count", label: "㉠ 수만" },
  { id: "spread", label: "㉡ 수 + 난이도 분포" },
  { id: "chips", label: "㉢ 담은 문항 칩" },
  { id: "expand", label: "㉣ 접었다 펴기" },
] as const;
type VariantId = (typeof VARIANTS)[number]["id"];

const GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
} as const;

/** 바가 지면을 가리지 않게 목록 아래에 두는 여백 — 바 높이 + 여유. */
const BAR_ROOM: Record<VariantId, string> = {
  count: "5.5rem",
  spread: "6.5rem",
  chips: "7.5rem",
  expand: "5.5rem",
};

export function BasketHifiClient() {
  const [problems, setProblems] = useState<ProblemEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [variant, setVariant] = useState<VariantId>("count");
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  // 🔴 **픽스처를 안 쓴다.** 실제 문항 코드·본문 길이·배지가 있어야 바가 무엇을
  //    가리는지, 담김 표시가 카드 어디에 들어가는지가 보인다.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/problems?page=1&pageSize=12", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`문항을 못 받았다 — HTTP ${res.status}`);
        const body = (await res.json()) as { data: ProblemEntity[] };
        if (alive) setProblems(body.data);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pickedProblems = problems.filter((p) => picked.includes(p.id));
  const toggle = (id: string): void =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const spread = new Map<string, number>();
  for (const p of pickedProblems) {
    const d = p.difficulty ?? "—";
    spread.set(d, (spread.get(d) ?? 0) + 1);
  }

  return (
    <main
      className="mx-auto max-w-[1180px] px-6 py-8"
      style={{ paddingBottom: picked.length > 0 ? BAR_ROOM[variant] : "2rem" }}
    >
      <h1 className="text-[17.25px] font-bold text-ink">
        담기 바구니 — 하단 고정 바 Hi-fi
      </h1>
      <p className="mt-1 text-[12.5px] text-text-2">
        실제 문항으로 그렸습니다. 카드의 「담기」를 눌러 보시고, 아래 네 안을
        바꿔 가며 견주십시오. 담기 전에는 바가 없습니다.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <Button
            key={v.id}
            variant={variant === v.id ? "ink" : "secondary"}
            onClick={() => setVariant(v.id)}
          >
            {v.label}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => setPicked([])}>
          담은 것 비우기
        </Button>
      </div>

      {error ? (
        <p className="mt-4 text-[12.5px] font-bold text-g-red-text">
          {error} — 로그인한 창에서 여십시오.
        </p>
      ) : null}
      {!error && problems.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-text-2">문항을 받는 중입니다…</p>
      ) : null}

      <section className="mt-6 grid gap-6" style={GRID_STYLE}>
        {problems.map((problem) => (
          <div key={problem.id} className="grid gap-2">
            <ProblemCard problem={problem} />
            {/* D-30 — 담기는 실제 버튼이다. 카드 표면에 손가락 커서를 주지 않는다. */}
            <Button
              variant={picked.includes(problem.id) ? "ink" : "secondary"}
              onClick={() => toggle(problem.id)}
            >
              {picked.includes(problem.id) ? "✓ 담김" : "담기"}
            </Button>
          </div>
        ))}
      </section>

      {picked.length > 0 ? (
        <BottomBar
          variant={variant}
          picked={pickedProblems}
          spread={spread}
          open={open}
          onToggleOpen={() => setOpen((v) => !v)}
          onRemove={toggle}
        />
      ) : null}
    </main>
  );
}

type BarProps = {
  variant: VariantId;
  picked: ProblemEntity[];
  spread: Map<string, number>;
  open: boolean;
  onToggleOpen: () => void;
  onRemove: (id: string) => void;
};

function BottomBar({
  variant,
  picked,
  spread,
  open,
  onToggleOpen,
  onRemove,
}: BarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {variant === "expand" && open ? (
        <ul className="mx-auto flex max-h-[40vh] max-w-[1180px] flex-col gap-1 overflow-y-auto px-6 pt-3">
          {picked.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-b border-divider py-1.5 text-[12.5px]"
            >
              <span className="w-5 tabular-nums text-text-3">{i + 1}</span>
              <span className="font-bold text-ink">{p.problemCode}</span>
              <span className="text-text-2">{p.difficulty ?? "—"}</span>
              <Button
                variant="ghost"
                className="ml-auto"
                onClick={() => onRemove(p.id)}
              >
                빼기
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <span className="text-[12.5px] font-bold text-ink">
          담은 문항 {picked.length}개
        </span>

        {variant === "spread" ? (
          <span className="text-[12.5px] text-text-2">
            {[...spread.entries()].map(([d, n]) => `${d} ${n}`).join(" · ")}
          </span>
        ) : null}

        {variant === "chips" ? (
          <span className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {picked.map((p) => (
              <span
                key={p.id}
                className="shrink-0 border border-divider bg-side px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-text-2"
              >
                {p.problemCode}
              </span>
            ))}
          </span>
        ) : null}

        <span className="ml-auto flex gap-2">
          {variant === "expand" ? (
            <Button variant="secondary" onClick={onToggleOpen}>
              {open ? "접기" : "목록 보기"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onToggleOpen}>
              목록 보기
            </Button>
          )}
          <Button variant="primary">시험지 만들기</Button>
        </span>
      </div>
    </div>
  );
}
