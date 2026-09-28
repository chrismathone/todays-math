"use client";

import { useId } from "react";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { kstDateOf } from "@/lib/kstDate";
import { ConceptKindTag, ConceptSourceTag } from "./ExplorerConceptHead";
import { ExplorerMath } from "./ExplorerMath";
import { TileStars } from "./ExplorerPieces";
import s from "./math-explorers.module.css";

/**
 * 보충 카드 화면 조각(D-147 · 05 §8.22 — Hi-fi 1안, 3자 합의 세부 다섯).
 * 단원 끝 줄은 «오늘의 한 칸» 카드 안 완료 줄 아래, 도감 선반은 «나의 개념 도감» 본 카드 격자 아래.
 */
export type SupplementCardView = NonNullable<
  ExplorerState["supplements"]
>["cards"][number];

/** 이름 끝 글자의 받침으로 조사를 고른다 — 괄호 · 기호는 건너뛴다(«변과 꼭짓점(도형)을»). */
export function withParticle(name: string, pair: "을/를" | "은/는") {
  const hangul = [...name].reverse().find((ch) => ch >= "가" && ch <= "힣");
  const [withFinal, withoutFinal] = pair.split("/") as [string, string];
  if (!hangul) return `${name}${withFinal}`;
  return `${name}${(hangul.charCodeAt(0) - 0xac00) % 28 ? withFinal : withoutFinal}`;
}

/** 보충 칸 — 배포 1단계 서버(보내지 않음)나 옛 응답이면 빈 값(읽기 먼저 · D-147). */
const EMPTY_SUPPLEMENTS: NonNullable<ExplorerState["supplements"]> = {
  cards: [],
  session: null,
  activity: null,
  offer: null,
};
export function supplementsOf(state: ExplorerState) {
  return state.supplements ?? EMPTY_SUPPLEMENTS;
}

export function supplementCardOf(state: ExplorerState, cardId: string) {
  return supplementsOf(state).cards.find((card) => card.id === cardId) ?? null;
}

/** 이어서 하기 · 다시 해 보기 · 세 활동 해 보기 — 카드 창 · 단원 끝 줄이 같은 말을 쓴다. */
export function supplementStartLabel(card: SupplementCardView) {
  return card.started
    ? `이어서 하기 · ${card.solved} / 3`
    : card.missedAt
      ? "다시 해 보기"
      : "세 활동 해 보기";
}

/**
 * 단원 끝 줄 — 그 단원 다섯을 오늘의 단원 탐험으로 다 모은 날 한 번(서버 `supplements.offer`).
 * 모으면 ✓ 없이 도감 모은 카드 글자색 한 줄 + 별 알약(D-144 값), 남으면 «아직 모으지 못했어요» 한 줄.
 */
export function SupplementLine({
  state,
  busy,
  onStart,
}: {
  state: ExplorerState;
  busy: boolean;
  onStart: (cardId: string) => void;
}) {
  const offer = supplementsOf(state).offer;
  const card = offer ? supplementCardOf(state, offer.cardId) : null;
  if (!offer || !card) return null;
  const today = state.today ?? kstDateOf(new Date());
  const left = supplementsOf(state).cards.filter(
    (item) => item.unitId === offer.unitId && !item.collectedAt,
  ).length;
  if (card.collectedAt)
    return (
      <div className={s.supplementLine} data-supplement-line="done">
        <p className={s.supplementDone} data-supplement-done="">
          교재 개념 {withParticle(card.name, "을/를")} 도감에 모았어요.
          <TileStars cards={1} bonus={0} />
        </p>
        {left ? (
          <p className={s.supplementNote}>
            남은 교재 개념 {left}장은 도감에 있어요.
          </p>
        ) : null}
      </div>
    );
  if (card.missedAt === today && !card.started)
    return (
      <div className={s.supplementLine} data-supplement-line="missed">
        <p className={s.supplementNote}>
          {withParticle(card.name, "은/는")} 아직 모으지 못했어요. 도감에서 다시
          해 볼 수 있어요.
        </p>
      </div>
    );
  return (
    <div className={s.supplementLine} data-supplement-line="offer">
      <p className={s.supplementCaption}>
        <span>교재에 한 장 더</span>
        <span>선택</span>
      </p>
      <button
        type="button"
        className={s.supplementRow}
        disabled={busy}
        onClick={() => onStart(card.id)}
      >
        <span className={s.supplementName}>
          <span data-concept-name="">
            <ExplorerMath text={card.name} />
          </span>
          <ConceptKindTag cardId={card.id} />
        </span>{" "}
        <span className={s.supplementGo}>
          {card.started ? `이어서 하기 · ${card.solved} / 3` : "살펴보기"}
          <span aria-hidden="true"> →</span>
        </span>
      </button>
      {card.started ? null : (
        <p className={s.supplementNote}>세 활동 · 한 칸과 따로예요</p>
      )}
    </div>
  );
}

/** 도감 선반 — 그 학년 보충 카드를 본 카드 격자 아래에 같은 카드 모양 + 이름 뒤 «교재» 딱지로. */
export function SupplementShelf({
  state,
  onInspect,
}: {
  state: ExplorerState;
  onInspect?: (cardId: string) => void;
}) {
  const titleId = useId();
  const units = state.units.filter(
    (unit) => unit.grade === state.profile.courseGrade,
  );
  const shelf = supplementsOf(state).cards.filter((card) =>
    units.some((unit) => unit.id === card.unitId),
  );
  if (!shelf.length) return null;
  return (
    <section className={s.supplementShelf} aria-labelledby={titleId}>
      <div className={s.shelfHeading}>
        <h3 id={titleId}>교재에서 더 만나는 개념</h3>
        <span>
          {shelf.filter((card) => card.collectedAt).length} / {shelf.length}
        </span>
      </div>
      <p className={s.quietNote}>선택 · 오늘의 탐험 · 기억 복습과 따로예요.</p>
      <div className={s.collection}>
        {shelf.map((card) => (
          <button
            type="button"
            key={card.id}
            data-level={card.collectedAt ? 1 : 0}
            data-supplement-card={card.id}
            onClick={() => onInspect?.(card.id)}
          >
            <span>{units.find((unit) => unit.id === card.unitId)?.title}</span>
            <strong>
              <ExplorerMath text={card.name} />
              <ConceptSourceTag cardId={card.id} />
            </strong>
            <small>
              {card.collectedAt
                ? "수집 완료"
                : card.started
                  ? `이어서 하기 · ${card.solved} / 3`
                  : "아직 수집 전"}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}
