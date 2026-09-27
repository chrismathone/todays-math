import type { CSSProperties } from "react";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import s from "./math-explorers.module.css";

export function ChestIcon({ opened = false }: { opened?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d={opened ? "m9 27 4-14 41 6-3 13" : "M9 29v-9c0-7 46-7 46 0v9"}
        fill="#ffda78"
        stroke="#9d6c27"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 29h46v24H9z"
        fill="#edb345"
        stroke="#9d6c27"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M19 29v24m26-24v24M9 37h46" stroke="#9d6c27" strokeWidth="2.5" />
      <rect
        x="27"
        y="33"
        width="10"
        height="12"
        rx="2"
        fill="#fff1b2"
        stroke="#9d6c27"
        strokeWidth="2"
      />
      {opened ? (
        <path d="m32 7 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="#ffd05a" />
      ) : null}
    </svg>
  );
}

export function ExplorerChests({
  chests,
  busy,
  onClaim,
}: {
  chests: ExplorerState["chests"];
  busy: boolean;
  onClaim: (id: string) => void;
}) {
  return (
    <div className={s.chests} aria-label="단원 보상상자">
      {chests.map((chest) => (
        <button
          type="button"
          className={s.chest}
          key={chest.id}
          data-state={
            chest.claimed ? "opened" : chest.ready ? "ready" : "locked"
          }
          disabled={busy || !chest.ready || chest.claimed}
          onClick={() => onClaim(chest.id)}
          aria-label={`${chest.after}개 개념 보상상자, ${chest.claimed ? "보상 획득 완료" : chest.ready ? "열고 별 1개 받기" : `${chest.solved}/${chest.after}개 해결`}`}
        >
          <span className={s.chestArt}>
            <ChestIcon opened={chest.claimed} />
            {!chest.ready && !chest.claimed ? (
              <span className={s.lock} aria-hidden="true">
                ⌑
              </span>
            ) : null}
          </span>
          <strong>
            {chest.claimed
              ? "보상 획득"
              : chest.ready
                ? "상자 열기"
                : "보상상자"}
          </strong>
          <small>
            {chest.claimed
              ? "별 +1 받음"
              : chest.ready
                ? "별 +1"
                : `${chest.solved} / ${chest.after}개 개념`}
          </small>
        </button>
      ))}
    </div>
  );
}

/** D-144 · 05 §8.19 — 그 칸이 준 별(카드 레벨 + 한 칸 보장). 금색은 상자 보상의 금색 그대로. */
export function TileStars({ cards, bonus }: { cards: number; bonus: number }) {
  const total = cards + bonus;
  return (
    <>
      <span className={s.tileStars} aria-label={`별 ${total}개`}>
        <span aria-hidden="true">✦</span>+{total}
      </span>
      {cards && bonus ? (
        <span className={s.tileStarsWhy}>
          카드 {cards} · 한 칸 보장 {bonus}
        </span>
      ) : null}
    </>
  );
}

/** 칸을 얻은 순간 한 번(D-144) — 상자 효과 모양 그대로, 상자 그림 대신 큰 별. 느낌표 없음(D-08). */
export function TileRewardEffect({ stars }: { stars: number | null }) {
  if (stars === null) return null;
  return (
    <div className={s.chestEffect} role="status" aria-live="polite">
      <div className={s.chestBurst}>
        <i className={s.tileBurstStar} aria-hidden="true">
          ✦
        </i>
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            style={{ "--angle": `${index * 60}deg` } as CSSProperties}
          >
            ✦
          </span>
        ))}
      </div>
      <strong>오늘의 한 칸</strong>
      <span>별 +{stars}</span>
    </div>
  );
}

export function ChestRewardEffect({ stars }: { stars: number | null }) {
  if (stars === null) return null;
  return (
    <div className={s.chestEffect} role="status" aria-live="polite">
      <div className={s.chestBurst}>
        <ChestIcon opened />
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            style={{ "--angle": `${index * 60}deg` } as CSSProperties}
          >
            ✦
          </span>
        ))}
      </div>
      <strong>보물 발견!</strong>
      <span>별 +{stars}</span>
    </div>
  );
}
