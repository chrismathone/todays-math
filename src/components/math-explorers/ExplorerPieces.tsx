import type { CSSProperties } from "react";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { ChestArt, StarMark } from "./JourneyArt";
import s from "./math-explorers.module.css";

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
            <ChestArt opened={chest.claimed} />
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

/** D-144 · 05 §8.20 — 그 칸이 준 별(카드 레벨 + 한 칸 보장). 금색은 상자 보상의 금색 그대로. */
export function TileStars({ cards, bonus }: { cards: number; bonus: number }) {
  const total = cards + bonus;
  return (
    <>
      {" "}
      {/* 눈에는 «✦+3», 화면 읽기에는 «별 3개» — role 없는 span 의 aria-label 은 읽히지 않는다 */}
      <span className={s.tileStars} aria-hidden="true">
        <span>
          <StarMark />
        </span>
        +{total}
      </span>
      <span className={s.srOnly}>별 {total}개</span>
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
      <div className={s.chestBurst} aria-hidden="true">
        <i className={s.tileBurstStar} aria-hidden="true">
          <StarMark />
        </i>
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            style={{ "--angle": `${index * 60}deg` } as CSSProperties}
          >
            <StarMark />
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
      <div className={s.chestBurst} aria-hidden="true">
        <ChestArt opened />
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            style={{ "--angle": `${index * 60}deg` } as CSSProperties}
          >
            <StarMark />
          </span>
        ))}
      </div>
      <strong>보물 발견!</strong>
      <span>별 +{stars}</span>
    </div>
  );
}
