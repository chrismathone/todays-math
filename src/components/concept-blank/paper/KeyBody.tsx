import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_FORM_LABELS } from "@/contracts/conceptBlank.contract";
import {
  clozeAlternatives,
  clozeSentence,
  termCriteria,
} from "@/lib/concept-blank/questions";

import { FigureSvg } from "./FigureSvg";
import { keyNotes, type KeyRow } from "./paginate";
import {
  KeySentence,
  PaperText,
  sheetTitle,
  titleSizeClass,
} from "./PaperParts";
import styles from "./paper.module.css";

/**
 * 교사용 채점표 — 시안의 표 모양(번호 · 개념 · 채점 기준)을 옮기고, 🔴 시안의 «교재 문장» 칸은 옮기지 않는다
 * (교재 원문). 채점 기준은 은행의 우리 문장 — 뜻(핵심어 굵게) · 예 답 · ○× 답과 까닭 · 적용 답 · 이름표 답 · 줄 답.
 */
export function KeyHead({ sheet }: { sheet: ConceptBlankSheet }) {
  const title = sheetTitle(sheet.header);
  return (
    <header className={styles.keyHead} data-cb-head="key">
      <div className={styles.keyKicker}>ANSWER KEY · 교사용</div>
      <h3 className={titleSizeClass(title)}>{title}</h3>
      <div className={styles.keySource}>
        {sheet.header.unitLabel} · {CONCEPT_BLANK_FORM_LABELS[sheet.form]}
      </div>
    </header>
  );
}

export function KeyTable({ rows }: { rows: KeyRow[] }) {
  return (
    <table className={styles.key}>
      {/* 열 폭 고정 — 번호 · 개념 · 채점 기준(나머지). 줄마다 글 길이가 달라도 열이 흔들리지 않는다 */}
      <colgroup>
        <col className={styles.keyColNo} />
        <col className={styles.keyColConcept} />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>번호</th>
          <th>개념</th>
          <th>채점 기준(핵심어 · 답)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            className={row.kind === "figure" ? styles.keyFigureRow : undefined}
            data-cb-key-row={row.kind}
            key={`${row.kind}-${row.n}`}
          >
            <td className={styles.keyNo}>{row.n}</td>
            <KeyCells row={row} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KeyCells({ row }: { row: KeyRow }) {
  switch (row.kind) {
    case "concept": {
      const ex = row.entry.example;
      return (
        <>
          <td className={styles.keyConcept}>
            <PaperText text={row.entry.term} />
            {row.place ? (
              <span className={styles.keyPlace} data-cb-place="">
                <PaperText text={row.place} />
              </span>
            ) : null}
          </td>
          <td className={styles.keyText}>
            {row.questionForm === "term" && row.entry.bQuestion ? (
              <>
                <PaperText text={row.entry.bQuestion.answer} />
                {termCriteria(row.entry).map((criterion, index) => (
                  <span className={styles.keyEx} key={index}>
                    확인할 내용 {index + 1}: <PaperText text={criterion} />
                  </span>
                ))}
              </>
            ) : (
              <KeySentence
                sentence={
                  row.questionForm === "cloze"
                    ? clozeSentence(row.entry)
                    : row.entry.definition
                }
              />
            )}
            {row.questionForm === "cloze"
              ? clozeAlternatives(row.entry).map((alternative, index) => (
                  <span className={styles.keyEx} key={index}>
                    <PaperText text={alternative} />
                  </span>
                ))
              : null}
            {row.example && ex ? (
              <span className={styles.keyEx}>
                {row.example === "reference" ? "예(참고) " : "예 "}
                <PaperText text={ex.prompt} /> →{" "}
                <b>
                  <PaperText text={ex.answer} />
                </b>
              </span>
            ) : row.example === "free" ? (
              <span className={styles.keyEx}>
                예 — 학생이 든 예가 뜻에 맞으면 ○
              </span>
            ) : null}
          </td>
        </>
      );
    }
    case "ox":
      return (
        <>
          <td className={styles.keyConcept}>○×</td>
          <td className={styles.keyText}>
            <b data-cb-ox-answer="">{row.item.answer ? "○" : "×"}</b> ·{" "}
            <PaperText text={row.item.why} />
            <span className={styles.keyEx}>
              <PaperText text={row.item.statement} />
            </span>
          </td>
        </>
      );
    case "apply":
      return (
        <>
          <td className={styles.keyConcept}>적용</td>
          <td className={styles.keyText}>
            <span className={styles.keyPrompt}>
              <PaperText text={row.item.prompt} />
            </span>
            <b>
              <PaperText text={row.item.answer} />
            </b>
          </td>
        </>
      );
    case "figure":
      return (
        <>
          <td className={styles.keyConcept}>
            <PaperText text={row.item.prompt} />
          </td>
          <td className={styles.keyText}>
            <div className={styles.keyFigure}>
              <FigureSvg answers className={styles.keySvg} item={row.item} />
              <div>
                {row.item.tags.length ? (
                  <span className={styles.keyLine} data-cb-tag-list="">
                    이름표:{" "}
                    {row.item.tags.map((t, i) => (
                      <span key={i}>
                        {i ? " · " : ""}
                        <b>
                          <PaperText text={t.answer} />
                        </b>
                      </span>
                    ))}
                  </span>
                ) : null}
                {row.item.lines.map((line, i) => (
                  <span className={styles.keyLine} key={i}>
                    <PaperText text={line.label} />:{" "}
                    <PaperText text={line.answer} />
                  </span>
                ))}
              </div>
            </div>
          </td>
        </>
      );
  }
}

export function KeyNotes({ sheet }: { sheet: ConceptBlankSheet }) {
  return (
    <div className={styles.notes} data-cb-notes="">
      <div className={styles.notesLabel}>채점</div>
      {keyNotes(sheet).map((note, i) => (
        <p key={i}>· {note}</p>
      ))}
    </div>
  );
}
