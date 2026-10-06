"use client";
import { useEffect, useState } from "react";
import type {
  FadingCatalog,
  FadingState,
} from "@/contracts/fadingApi.contract";
import type { FadingSource } from "@/lib/fading/source";
import { FadingMath as ExplorerMath } from "./FadingMath";
import { FadingIcon } from "./FadingIcon";
import { curriculumName, stepNames } from "./labels";
import { FadingTerms } from "./FadingTerms";
import s from "./fading.module.css";

export function FadingEraseScreen({
  state,
  source,
  onCatalog,
  onOpen,
}: {
  state: FadingState;
  source: FadingSource;
  onCatalog: () => void;
  onOpen: (id: string) => void;
}) {
  const [catalog, setCatalog] = useState<FadingCatalog | null>(null);
  useEffect(() => {
    let live = true;
    void source
      .catalog()
      .then((value) => {
        if (live) setCatalog(value);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [source]);
  const section = catalog?.sections[0];
  return (
    <div className={s.eraseScreen}>
      <p className={s.summaryBadge}>단서를 지우며 개념 기억 학습</p>
      <h1>개념 소거</h1>
      <p className={s.muted}>문맥과 단서가 사라지는 네 단계</p>
      <section className={s.eraseWelcome}>
        <div className={s.eraseIllustration}>
          <div>
            <span>개념 문장</span>
            <strong>단서 → 빈칸</strong>
            <div className={s.guideTrack}>
              <span />
            </div>
          </div>
          <span className={s.brandMark}>
            <FadingIcon name="erase" />
          </span>
        </div>
        <h2>
          {state.session
            ? "이어 할 풀이가 있습니다"
            : "진행 중인 풀이가 없습니다"}
        </h2>
        <p>
          기억하고 싶은 개념을 고르고 정독부터 백지까지 칩으로 문장을 채워
          보세요.
        </p>
        <div className={s.stageTiles}>
          {([1, 2, 3, 4] as const).map((step) => (
            <div className={s.stageTile} key={step} data-final={step === 4}>
              <span className={s.caps}>STEP {step}</span>
              <strong>{stepNames[step]}</strong>
              <span>{state.summary.stepCounts[step]}개</span>
            </div>
          ))}
        </div>
        {state.session && (
          <button
            className={s.primary}
            onClick={() => onOpen(state.session!.conceptId)}
          >
            풀이 이어 하기
            <FadingIcon name="arrow" />
          </button>
        )}
      </section>
      <div className={s.sectionTitle}>
        <h2>바로 시작할 개념</h2>
        <span className={s.code}>학년의 첫 단원</span>
      </div>
      <div className={s.list}>
        {section?.concepts.slice(0, 3).map((concept) => (
          <article className={s.recommendCard} key={concept.id}>
            <span className={s.sectionTag}>
              {catalog!.grade} · {curriculumName(section.chapter)}
            </span>
            <h3>
              {curriculumName(section.unit)} · {concept.level} ·{" "}
              {concept.ordinal}/{concept.siblings}
            </h3>
            <FadingTerms terms={concept.terms} />
            <div className={s.queueAction}>
              <span className={s.formulaChip}>
                <ExplorerMath text={concept.terms[0]!} />
              </span>
              <button className={s.primary} onClick={onCatalog}>
                개념 보기
                <FadingIcon name="arrow" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <button className={s.secondary} onClick={onCatalog}>
        개념 목록에서 고르기
      </button>
    </div>
  );
}
