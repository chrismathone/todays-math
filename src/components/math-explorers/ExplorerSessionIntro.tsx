"use client";

import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { ConceptKindTag, conceptHead as c } from "./ExplorerConceptHead";
import { ExplorerMath } from "./ExplorerMath";
import { ExplorerPracticeFrame } from "./ExplorerPractice";
import s from "./math-explorers.module.css";
import type { SessionIntroKind } from "./sessionIntro";

/**
 * «오늘 다시 만날 개념» — 기억 복습 날 · 지난 학습 다시 풀기의 첫 활동 앞 한 장(05 §8.19 · D-143 ③).
 * 뜻은 가린 채 이름 · 갈래 딱지 · 단원만 보인다. 시작은 서버에 요청을 보내지 않는다(엔진 15활동 · 날짜 규칙 그대로).
 * 틀은 풀이 화면 그대로(`ExplorerPracticeFrame`) · 답 칸은 뜻 만나기처럼 단추 하나.
 */
export default function ExplorerSessionIntro({
  kind,
  session,
  units,
  busy,
  onStart,
  onHome,
}: {
  kind: SessionIntroKind;
  session: NonNullable<ExplorerState["session"]>;
  units: ExplorerState["units"];
  busy: boolean;
  onStart: () => void;
  onHome: () => void;
}) {
  const cards = units.flatMap((unit) =>
    unit.cards.map((card) => ({ card, unit })),
  );
  const list = session.cardIds.flatMap((id) => {
    const found = cards.find((item) => item.card.id === id);
    return found ? [found] : [];
  });
  return (
    <ExplorerPracticeFrame
      session={session}
      busy={busy}
      correct={null}
      eventKey=""
      onHome={onHome}
    >
      <div
        className={s.problemPane}
        tabIndex={0}
        aria-label="오늘 다시 만날 개념"
        data-session-intro=""
      >
        <div className={s.activityMeta}>
          <span className={c.metaMuted}>
            {kind === "memory" ? "기억 복습" : "지난 학습 다시 풀기"} · 개념{" "}
            {session.cardIds.length}개 · {session.total}활동
          </span>
          <span>시작 전</span>
        </div>
        <h2 className={s.questionTitle}>오늘 다시 만날 개념</h2>
        <ul className={c.today}>
          {list.map(({ card, unit }) => (
            <li key={card.id}>
              <span className={c.todayName}>
                <span data-concept-name="">
                  <ExplorerMath text={card.name} />
                </span>
                <ConceptKindTag cardId={card.id} />
              </span>
              <span className={c.todayUnit}>
                <ExplorerMath text={unit.title} />
              </span>
            </li>
          ))}
        </ul>
        <p className={s.quietNote}>
          뜻은 가린 채로 풀어요. 다 푼 뒤 도감에서 다시 볼 수 있어요.
        </p>
      </div>
      <div
        className={`${s.answerDock} ${c.dockSlim}`}
        data-explorer-dock="true"
        data-dock-size="slim"
      >
        <button
          type="button"
          className={s.primary}
          disabled={busy}
          onClick={onStart}
        >
          {kind === "memory" ? "기억 복습 시작하기" : "다시 풀기 시작하기"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </ExplorerPracticeFrame>
  );
}
