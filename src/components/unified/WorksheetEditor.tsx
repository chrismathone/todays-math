"use client";
import { useLayoutEffect, useRef } from "react";
import WorkspacePageHeader from "./WorkspacePageHeader";
import { MathText } from "@/components/math/MathText";
import UnifiedProblem from "./UnifiedProblem";
import { displayFractions } from "./fractionDisplay";
import Icon from "./WorkspaceIcon";
import type { StudioProblem } from "./types";
import s from "./WorksheetEditor.module.css";
interface Props {
  selected: StudioProblem[];
  title: string;
  columns: number;
  answers: boolean;
  savedAt: string;
  setTitle: (value: string) => void;
  setColumns: (value: number) => void;
  setAnswers: (value: boolean) => void;
  save: () => void;
  restore: () => void;
  download: () => void;
  toggle: (problem: StudioProblem) => void;
  move: (index: number, direction: number) => void;
  navigate: (view: "bank" | "studio") => void;
}
export default function WorksheetEditor({
  selected,
  title,
  columns,
  answers,
  savedAt,
  setTitle,
  setColumns,
  setAnswers,
  save,
  restore,
  download,
  toggle,
  move,
  navigate,
}: Props) {
  const orderListRef = useRef<HTMLOListElement>(null);
  const addFromBankRef = useRef<HTMLButtonElement>(null);
  const removedIndexRef = useRef<number | null>(null);
  const paperTitle = title || "오늘의 수학 학습지";

  useLayoutEffect(() => {
    if (removedIndexRef.current === null) return;
    const index = Math.min(removedIndexRef.current, selected.length - 1);
    const nextButton =
      orderListRef.current?.children[index]?.querySelector<HTMLButtonElement>(
        "button:last-child",
      );
    (nextButton || addFromBankRef.current)?.focus({ preventScroll: true });
    removedIndexRef.current = null;
  }, [selected]);

  function removeProblem(problem: StudioProblem, index: number) {
    // The parent still owns draft changes and undo; restore keyboard focus after
    // the active row is removed, including the transition to an empty worksheet.
    removedIndexRef.current = index;
    toggle(problem);
  }

  return (
    <main className={s.exportContent}>
      <WorkspacePageHeader
        title="시험지 구성하기"
        description="문제 순서와 배치를 정하고 인쇄하세요."
      >
        <button
          className={s.secondaryButton}
          onClick={save}
          disabled={!selected.length}
        >
          <Icon name="save" size={18} /> 작업 저장
        </button>
        <button
          className={s.primaryButton}
          disabled={!selected.length}
          onClick={() => window.print()}
        >
          <Icon name="print" size={18} />
          인쇄 / PDF 저장
        </button>
      </WorkspacePageHeader>
      {!selected.length ? (
        <div className={s.emptyExport}>
          <h2>시험지에 문제를 담아 주세요</h2>
          <p>문제은행에서 고르거나 내 자료를 가져오세요.</p>
          <div>
            <button
              className={s.primaryButton}
              ref={addFromBankRef}
              onClick={() => navigate("bank")}
            >
              문제은행에서 담기 <Icon name="arrow" size={18} />
            </button>
            <button
              className={s.secondaryButton}
              onClick={() => navigate("studio")}
            >
              자료 가져오기
            </button>
          </div>
          <button className={s.textButton} onClick={restore}>
            저장한 작업 불러오기
          </button>
        </div>
      ) : (
        <div className={s.exportGrid}>
          <aside className={s.exportInspector}>
            <h2>시험지 설정</h2>
            <label className={s.field}>
              제목
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
            </label>
            <div className={s.field}>
              <span id="worksheet-columns-label">문제 배치</span>
              <div
                className={s.segment}
                role="group"
                aria-labelledby="worksheet-columns-label"
              >
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    aria-pressed={columns === n}
                    className={columns === n ? s.segmentActive : ""}
                    onClick={() => setColumns(n)}
                  >
                    {n}단
                  </button>
                ))}
              </div>
            </div>
            <label className={s.checkField}>
              <input
                type="checkbox"
                checked={answers}
                onChange={(e) => setAnswers(e.target.checked)}
              />{" "}
              정답 · 해설지 포함
            </label>
            <div className={s.orderHeading}>
              <h3>문제 순서</h3>
              <span>{selected.length}문항</span>
            </div>
            <ol className={s.orderList} ref={orderListRef}>
              {selected.map((p, i) => (
                <li key={p.id}>
                  <span className={s.orderNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong title={p.section || p.sourceLabel || "가져온 문제"}>
                      {p.section || p.sourceLabel || "가져온 문제"}
                    </strong>
                    <small>
                      {p.grade} · {p.difficulty || "내 자료"}
                    </small>
                  </div>
                  <div className={s.orderActions}>
                    <button
                      disabled={i === 0}
                      aria-label={`${i + 1}번 문제 위로`}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      disabled={i === selected.length - 1}
                      aria-label={`${i + 1}번 문제 아래로`}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      aria-label={`${i + 1}번 문제 빼기`}
                      onClick={() => removeProblem(p, i)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button
              className={s.addMore}
              ref={addFromBankRef}
              onClick={() => navigate("bank")}
            >
              <Icon name="plus" size={16} /> 문제 더 담기
            </button>
            <button className={s.secondaryButton} onClick={download}>
              <Icon name="save" size={18} /> 작업 파일 내보내기
            </button>
            {savedAt && (
              <p className={s.subtle}>
                이 브라우저에 저장됨 ·{" "}
                {new Date(savedAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </aside>
          <div className={s.paperCanvas}>
            <div className={s.paperToolbar}>
              <span>
                미리보기
                {columns === 2 && (
                  <span className={s.previewScrollHint}>↔ 가로 이동</span>
                )}
              </span>
              <span>
                A4 · {columns}단 · {selected.length}문항
              </span>
            </div>
            <div
              className={s.paperViewport}
              role="region"
              aria-label="시험지 미리보기"
              tabIndex={0}
              data-columns={columns}
            >
              <article className={s.paper} data-unified-paper>
                <header className={s.paperHeader}>
                  <span>TODAY’S MATH</span>
                  <h2>{paperTitle}</h2>
                  <div>
                    <span>{selected.length}문항</span>
                    <span>이름 __________________</span>
                  </div>
                </header>
                <div
                  className={s.paperProblems}
                  style={{ columnCount: columns }}
                >
                  {selected.map((problem, i) => (
                    <section className={s.paperProblem} key={problem.id}>
                      <strong className={s.problemNumber}>
                        {String(i + 1).padStart(2, "0")}
                      </strong>
                      <UnifiedProblem problem={problem} print />
                    </section>
                  ))}
                </div>
                <footer className={s.paperFooter}>
                  오늘의수학 <span>수학의 힘을, 매일 조금씩.</span>
                </footer>
              </article>
              {answers && (
                <article
                  className={`${s.paper} ${s.answerPaper}`}
                  data-unified-paper
                >
                  <header className={s.paperHeader}>
                    <span>ANSWERS & SOLUTIONS</span>
                    <h2>{paperTitle} · 정답과 해설</h2>
                  </header>
                  <div
                    className={s.paperProblems}
                    style={{ columnCount: columns }}
                  >
                    {selected.map((p, i) => (
                      <section className={s.answerItem} key={p.id}>
                        <strong>{String(i + 1).padStart(2, "0")}</strong>
                        <MathText
                          text={displayFractions(
                            p.answer || "정답 미입력",
                            p.grade,
                            p.content,
                          )}
                        />
                        {p.solution && (
                          <MathText
                            text={displayFractions(
                              p.solution,
                              p.grade,
                              p.content,
                            )}
                            as="div"
                          />
                        )}
                      </section>
                    ))}
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
