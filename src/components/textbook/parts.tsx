"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { ProblemType } from "@/contracts/problem.contract";
import { TextbookConceptLinkEditor } from "@/components/textbook/TextbookConceptLinkEditor";
import { getTextbookCharacter } from "@/lib/textbook/characters";
import {
  CONCEPT_KINDS,
  EXPRESSIONS,
  SIDES,
  SPEAKER_IDS,
  SPEAKERS,
  answerPlacement,
  canFinalize,
  moveBlock,
  orderBlankPicks,
  portraitMirrorAllowed,
  publishHeadline,
  sectionStatusLabel,
  toggleBlankForm,
  videoStatusLabel,
  visibleAnswer,
  youtubeVideoId,
  type AssignmentRow,
  type Audience,
  type BlankForm,
  type BlankPick,
  type BookSummary,
  type ImportMode,
  type NamedChoice,
  type OutlineUnit,
  type PaperPreviewInput,
  type PreviewMode,
  type PublishStatus,
  type RegisterFields,
  type SectionDetail,
  type StudioIssue,
  type VideoBinding,
  type ZoomMode,
} from "@/components/textbook/model";
import styles from "@/components/textbook/textbook.module.css";

export function BookList({
  books,
  emptyNote = true,
  title,
  volumeCode,
  curriculumVersion,
  pageTarget,
  videoPolicy,
  studentSolutionPolicy,
  schoolLevel,
  grade,
  semester,
  bookMode,
  innerMarginMm,
  outerMarginMm,
  coverMode,
  busy,
  onTitle,
  onVolume,
  onCurriculum,
  onPageTarget,
  onVideoPolicy,
  onSolutionPolicy,
  onSchoolLevel,
  onGrade,
  onSemester,
  onBookMode,
  onInnerMargin,
  onOuterMargin,
  onCoverMode,
  onCreate,
  onOpen,
  onImport,
}: {
  books: BookSummary[];
  /** 목록 없이 생성 양식으로만 쓸 때 — 다른 자리에 목록이 있으면 «없습니다» 를 내지 않는다 */
  emptyNote?: boolean;
  title: string;
  volumeCode: string;
  curriculumVersion: string;
  pageTarget: string;
  videoPolicy: "required" | "optional";
  studentSolutionPolicy: "never" | "assigned";
  schoolLevel: "elementary" | "middle" | "high";
  grade: string;
  semester: "1" | "2";
  bookMode: "integrated" | "concept" | "practice";
  innerMarginMm: string;
  outerMarginMm: string;
  coverMode: "included" | "separate";
  busy: boolean;
  onTitle: (value: string) => void;
  onVolume: (value: string) => void;
  onCurriculum: (value: string) => void;
  onPageTarget: (value: string) => void;
  onVideoPolicy: (value: "required" | "optional") => void;
  onSolutionPolicy: (value: "never" | "assigned") => void;
  onSchoolLevel: (value: "elementary" | "middle" | "high") => void;
  onGrade: (value: string) => void;
  onSemester: (value: "1" | "2") => void;
  onBookMode: (value: "integrated" | "concept" | "practice") => void;
  onInnerMargin: (value: string) => void;
  onOuterMargin: (value: string) => void;
  onCoverMode: (value: "included" | "separate") => void;
  onCreate: () => void;
  onOpen: (book: BookSummary) => void;
  onImport: () => void;
}) {
  const gradeMax = schoolLevel === "elementary" ? 6 : 3;
  return (
    <section className={styles.panel} aria-label="교재 목록">
      <h2>교재</h2>
      {books.length === 0 && emptyNote ? (
        <p className={styles.muted}>만든 교재가 없습니다.</p>
      ) : null}
      <ul className={styles.list}>
        {books.map((book) => (
          <li key={book.bookId} className={styles.book}>
            <span>
              {book.title}
              {book.archived ? " · 보관" : ""}
            </span>
            <button
              type="button"
              className={styles.button}
              disabled={book.activeEditionId === null || busy}
              onClick={() => onOpen(book)}
            >
              열기
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.bookForm}>
        <div className={styles.bookDetails}>
          <label className={styles.field}>
            <span>제목</span>
            <input
              value={title}
              onChange={(event) => onTitle(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>권 코드</span>
            <input
              value={volumeCode}
              placeholder="2-1-1"
              onChange={(event) => onVolume(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>교육과정</span>
            <input
              value={curriculumVersion}
              onChange={(event) => onCurriculum(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>목표 쪽수</span>
            <input
              value={pageTarget}
              inputMode="numeric"
              onChange={(event) => onPageTarget(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.bookOptions}>
          <div className={styles.bookSettings}>
            <label className={styles.field}>
              <span>학교급</span>
              <select
                aria-label="학교급"
                value={schoolLevel}
                onChange={(event) => {
                  const value = event.target.value;
                  onSchoolLevel(
                    value === "middle" || value === "high"
                      ? value
                      : "elementary",
                  );
                }}
              >
                <option value="elementary">초등</option>
                <option value="middle">중등</option>
                <option value="high">고등</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>학년</span>
              <select
                aria-label="학년"
                value={grade}
                onChange={(event) => onGrade(event.target.value)}
              >
                {Array.from({ length: gradeMax }, (_, index) =>
                  String(index + 1),
                ).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>학기</span>
              <select
                aria-label="학기"
                value={semester}
                onChange={(event) =>
                  onSemester(event.target.value === "2" ? "2" : "1")
                }
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>구성</span>
              <select
                aria-label="구성"
                value={bookMode}
                onChange={(event) => {
                  const value = event.target.value;
                  onBookMode(
                    value === "concept" || value === "practice"
                      ? value
                      : "integrated",
                  );
                }}
              >
                <option value="integrated">통합</option>
                <option value="concept">개념</option>
                <option value="practice">연습</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>안쪽 여백</span>
              <input
                aria-label="안쪽 여백"
                value={innerMarginMm}
                inputMode="numeric"
                onChange={(event) => onInnerMargin(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>바깥 여백</span>
              <input
                aria-label="바깥 여백"
                value={outerMarginMm}
                inputMode="numeric"
                onChange={(event) => onOuterMargin(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>표지</span>
              <select
                aria-label="표지"
                value={coverMode}
                onChange={(event) =>
                  onCoverMode(
                    event.target.value === "included" ? "included" : "separate",
                  )
                }
              >
                <option value="separate">별도</option>
                <option value="included">포함</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>영상</span>
              <select
                value={videoPolicy}
                onChange={(event) =>
                  onVideoPolicy(
                    event.target.value === "required" ? "required" : "optional",
                  )
                }
              >
                <option value="optional">선택</option>
                <option value="required">필수</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>학생 글 해설</span>
              <select
                value={studentSolutionPolicy}
                onChange={(event) =>
                  onSolutionPolicy(
                    event.target.value === "assigned" ? "assigned" : "never",
                  )
                }
              >
                <option value="never">열지 않음</option>
                <option value="assigned">배정한 QR만</option>
              </select>
            </label>
          </div>
          <div className={styles.bookActions}>
            <button
              type="button"
              className={styles.primary}
              disabled={
                busy ||
                title.trim() === "" ||
                volumeCode.trim() === "" ||
                curriculumVersion.trim() === "" ||
                pageTarget.trim() === ""
              }
              onClick={onCreate}
            >
              새 교재
            </button>
            <button type="button" className={styles.button} onClick={onImport}>
              가져오기
            </button>
          </div>
        </div>
      </div>
      <p className={styles.muted}>
        주요 구획은 짝수 왼쪽에서 시작합니다. 여백은 8mm 이상 40mm 이하입니다.
      </p>
    </section>
  );
}

export function Outline({
  units,
  collapsed,
  currentId,
  pendingSectionId,
  movesDisabled,
  onToggle,
  onSelect,
  onMoveUnit,
  onMoveSection,
}: {
  units: OutlineUnit[];
  collapsed: ReadonlySet<string>;
  currentId: string | null;
  pendingSectionId: string | null;
  movesDisabled: boolean;
  onToggle: (unitKey: string) => void;
  onSelect: (sectionId: string) => void;
  onMoveUnit: (unitKey: string, direction: -1 | 1) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
}) {
  return (
    <nav className={styles.outline} aria-label="단원">
      {units.map((unit) => {
        const open = !collapsed.has(unit.unitKey);
        return (
          <div key={unit.unitKey}>
            <div className={styles.row}>
              <button
                type="button"
                className={styles.unitButton}
                aria-expanded={open}
                onClick={() => onToggle(unit.unitKey)}
              >
                {unit.title}
              </button>
              <button
                type="button"
                className={styles.button}
                aria-label={`${unit.title} 위로`}
                disabled={movesDisabled}
                onClick={() => onMoveUnit(unit.unitKey, -1)}
              >
                위로
              </button>
              <button
                type="button"
                className={styles.button}
                aria-label={`${unit.title} 아래로`}
                disabled={movesDisabled}
                onClick={() => onMoveUnit(unit.unitKey, 1)}
              >
                아래로
              </button>
            </div>
            {open
              ? unit.sections.map((section) => (
                  <div key={section.sectionId} className={styles.row}>
                    <button
                      type="button"
                      className={styles.sectionButton}
                      aria-current={
                        section.sectionId === currentId ? "true" : undefined
                      }
                      onClick={() => onSelect(section.sectionId)}
                    >
                      {section.title}
                      <span className={styles.status}>
                        {section.sectionId === pendingSectionId
                          ? "저장 전"
                          : sectionStatusLabel(section.status)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      aria-label={`${section.title} 위로`}
                      disabled={movesDisabled}
                      onClick={() => onMoveSection(section.sectionId, -1)}
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      aria-label={`${section.title} 아래로`}
                      disabled={movesDisabled}
                      onClick={() => onMoveSection(section.sectionId, 1)}
                    >
                      아래로
                    </button>
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </nav>
  );
}

function turnLabel(index: number, total: number): string {
  return total === 1 ? "대사" : `대사 ${index + 1}`;
}

export function SectionEditor({
  draft,
  editionId,
  audience,
  mode,
  locked,
  conflictMessage,
  serverText,
  showServer,
  orderMessage,
  diffSummary,
  saving,
  frozen = false,
  existingBlankItems,
  confirmEntryIds,
  onConfirmEntries,
  conceptChanged,
  conceptLinks,
  confirmLinkIds,
  onConceptLinks,
  onChange,
  onSave,
  onToggleServer,
  onCopy,
  onCapture,
  onDiff,
  onRecapture,
  onLoadLinks,
  onLink,
  onRegister,
  onLoadUnits,
  onLoadProblems,
  onLoadClasses,
  onLoadStudents,
  onLoadTests,
  onSaveConcept,
  onCreateConcept,
  unattachedConcepts = [],
  onAttachConcept,
  conceptLinkFailure = null,
  onRetryConceptLink,
  onSearchCatalog,
  onDelete,
  lectureLink,
}: {
  draft: SectionDetail;
  editionId: string;
  audience: Audience;
  mode: PreviewMode;
  locked: boolean;
  conflictMessage: string | null;
  serverText: string | null;
  showServer: boolean;
  orderMessage: string | null;
  diffSummary: string | null;
  saving: boolean;
  /** 처리 중 — 응답이 올 때까지 원고 입력과 구획을 바꾸는 단추를 잠근다(발행 잠금과 달리 끝나면 풀린다) */
  frozen?: boolean;
  existingBlankItems: TextbookConcept["blankItems"];
  confirmEntryIds: string[];
  onConfirmEntries: (ids: string[]) => void;
  conceptChanged: boolean;
  conceptLinks: TextbookConcept["links"];
  confirmLinkIds: string[];
  onConceptLinks: (
    links: TextbookConcept["links"],
    confirmLinkIds: string[],
  ) => void;
  onChange: (next: SectionDetail) => void;
  onSave: () => void;
  onToggleServer: () => void;
  onCopy: () => void;
  onCapture: (testId: string, problemIds: string[]) => void;
  onDiff: (itemId: string) => void;
  onRecapture: (itemId: string) => void;
  onLoadLinks: (
    itemId: string,
  ) => Promise<{ problemId: string; problemCode: string }[]>;
  onLink: (itemId: string, problemId: string) => void;
  onRegister: (
    itemId: string,
    fields: RegisterFields,
  ) => Promise<{ problemId: string; problemCode: string }[] | null>;
  onLoadUnits: () => Promise<NamedChoice[]>;
  onLoadProblems: (unitId: string) => Promise<NamedChoice[] | null>;
  onLoadClasses: () => Promise<NamedChoice[]>;
  onLoadStudents: (classId: string) => Promise<NamedChoice[]>;
  onLoadTests: (
    classId: string,
    studentId?: string,
  ) => Promise<NamedChoice[] | null>;
  onSaveConcept: () => void;
  onCreateConcept: (conceptKey: string, title: string) => void;
  /** 이 판본에 저장돼 있지만 어느 구획에도 놓이지 않은 개념 */
  unattachedConcepts?: readonly NamedChoice[];
  onAttachConcept?: (conceptKey: string) => void;
  /** 개념은 저장됐는데 이 구획에 잇지 못했을 때의 사유 */
  conceptLinkFailure?: string | null;
  onRetryConceptLink?: () => void;
  onSearchCatalog: (query: string) => void;
  onDelete: () => void;
  lectureLink?: ReactNode;
}) {
  const order = orderBlankPicks(draft.picks);
  const placement = answerPlacement(audience, mode);
  const mirrorsOk = draft.portraits.every((portrait) =>
    portraitMirrorAllowed(portrait.side, portrait.mirror),
  );
  return (
    <div className={styles.stack}>
      <fieldset className={styles.stack} disabled={locked || frozen}>
        <label className={styles.field}>
          <span>구획 제목</span>
          <input
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
          />
        </label>
        <label className={styles.field}>
          <span>시작 면</span>
          <select
            value={draft.parity}
            onChange={(event) => {
              const parity =
                event.target.value === "even-left" ||
                event.target.value === "continue"
                  ? event.target.value
                  : "unconfirmed";
              onChange({ ...draft, parity });
            }}
          >
            <option value="unconfirmed">시작 면 미정</option>
            <option value="continue">이어짐</option>
            <option value="even-left">짝수 왼쪽</option>
          </select>
        </label>
        {draft.blocks.map((block) => {
          const move = (direction: -1 | 1) =>
            onChange({
              ...draft,
              blocks: moveBlock(draft.blocks, block.id, direction),
            });
          const replace = (next: SectionDetail["blocks"][number]) =>
            onChange({
              ...draft,
              blocks: draft.blocks.map((item) =>
                item.id === block.id ? next : item,
              ),
            });
          if (block.kind === "text") {
            return (
              <div key={block.id} className={styles.stack}>
                <label className={styles.field}>
                  <span>본문</span>
                  <textarea
                    value={block.text}
                    onChange={(event) =>
                      replace({ ...block, text: event.target.value })
                    }
                  />
                </label>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => move(-1)}
                  >
                    위로
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => move(1)}
                  >
                    아래로
                  </button>
                </div>
              </div>
            );
          }
          if (block.kind === "concept-recall") {
            return (
              <div key={block.id} className={styles.stack}>
                <label className={styles.field}>
                  <span>회상 단계</span>
                  <select
                    value={block.phase}
                    onChange={(event) => {
                      const phase =
                        event.target.value === "keywords" ||
                        event.target.value === "sentences"
                          ? event.target.value
                          : "study";
                      replace({
                        ...block,
                        phase,
                        showRepetitionChecks:
                          phase === "study"
                            ? block.showRepetitionChecks
                            : false,
                      });
                    }}
                  >
                    <option value="study">개념</option>
                    <option value="keywords">핵심어</option>
                    <option value="sentences">문장</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>회상 본문</span>
                  <textarea
                    value={block.text}
                    onChange={(event) =>
                      replace({ ...block, text: event.target.value })
                    }
                  />
                </label>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => move(-1)}
                  >
                    위로
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => move(1)}
                  >
                    아래로
                  </button>
                </div>
              </div>
            );
          }
          if (block.kind === "problems") {
            return (
              <div key={block.id} className={styles.row}>
                <span>문항 블록</span>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => move(-1)}
                >
                  위로
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => move(1)}
                >
                  아래로
                </button>
              </div>
            );
          }
          if (block.kind === "concept") {
            return (
              <label key={block.id} className={styles.field}>
                <span>개념 키</span>
                <input
                  value={block.conceptKey}
                  onChange={(event) =>
                    replace({ ...block, conceptKey: event.target.value })
                  }
                />
              </label>
            );
          }
          if (block.kind === "image") {
            return (
              <label key={block.id} className={styles.field}>
                <span>그림 설명</span>
                <input
                  value={block.caption}
                  onChange={(event) =>
                    replace({ ...block, caption: event.target.value })
                  }
                />
              </label>
            );
          }
          if (block.kind !== "dialogue") return null;
          return block.turns.map((turn, index) => {
            const character = getTextbookCharacter(
              turn.speakerId.replace(/^tb-portrait-/, ""),
            );
            return (
              <div key={turn.id} className={styles.stack}>
                <label className={styles.field}>
                  <span>화자</span>
                  <select
                    value={turn.speaker}
                    disabled={!!character}
                    onChange={(event) => {
                      const speaker =
                        SPEAKERS.find((item) => item === event.target.value) ??
                        turn.speaker;
                      const turns = block.turns.map((item) =>
                        item.id === turn.id
                          ? {
                              ...item,
                              speaker,
                              speakerId: SPEAKER_IDS[speaker],
                            }
                          : item,
                      );
                      onChange({
                        ...draft,
                        blocks: draft.blocks.map((item) =>
                          item.id === block.id && item.kind === "dialogue"
                            ? { ...item, turns }
                            : item,
                        ),
                      });
                    }}
                  >
                    {character ? (
                      <option value={turn.speaker}>{character.name}</option>
                    ) : (
                      SPEAKERS.map((speaker) => (
                        <option key={speaker}>{speaker}</option>
                      ))
                    )}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>자리</span>
                  <select
                    value={turn.side}
                    onChange={(event) => {
                      const side =
                        SIDES.find((item) => item === event.target.value) ??
                        turn.side;
                      const turns = block.turns.map((item) =>
                        item.id === turn.id ? { ...item, side } : item,
                      );
                      onChange({
                        ...draft,
                        blocks: draft.blocks.map((item) =>
                          item.id === block.id && item.kind === "dialogue"
                            ? { ...item, turns }
                            : item,
                        ),
                      });
                    }}
                  >
                    {SIDES.map((side) => (
                      <option key={side}>{side}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>표정</span>
                  <select
                    value={turn.expression}
                    onChange={(event) => {
                      const expression =
                        EXPRESSIONS.find(
                          (item) => item === event.target.value,
                        ) ?? turn.expression;
                      const turns = block.turns.map((item) =>
                        item.id === turn.id ? { ...item, expression } : item,
                      );
                      onChange({
                        ...draft,
                        blocks: draft.blocks.map((item) =>
                          item.id === block.id && item.kind === "dialogue"
                            ? { ...item, turns }
                            : item,
                        ),
                      });
                    }}
                  >
                    {EXPRESSIONS.map((expression) => (
                      <option key={expression}>{expression}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>초상 자료</span>
                  <input
                    value={turn.portraitAssetId}
                    onChange={(event) => {
                      const turns = block.turns.map((item) =>
                        item.id === turn.id
                          ? { ...item, portraitAssetId: event.target.value }
                          : item,
                      );
                      onChange({
                        ...draft,
                        blocks: draft.blocks.map((item) =>
                          item.id === block.id && item.kind === "dialogue"
                            ? { ...item, turns }
                            : item,
                        ),
                      });
                    }}
                  />
                </label>
                <label className={styles.field}>
                  <span>초상 뒤집기</span>
                  <select
                    value={
                      turn.side === "오른쪽" && turn.mirror ? "right" : "none"
                    }
                    disabled={turn.side !== "오른쪽"}
                    onChange={(event) => {
                      const mirror = event.target.value === "right";
                      const turns = block.turns.map((item) =>
                        item.id === turn.id ? { ...item, mirror } : item,
                      );
                      onChange({
                        ...draft,
                        blocks: draft.blocks.map((item) =>
                          item.id === block.id && item.kind === "dialogue"
                            ? { ...item, turns }
                            : item,
                        ),
                      });
                    }}
                  >
                    <option value="none">뒤집지 않음</option>
                    <option value="right">오른쪽만 뒤집기</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>{turnLabel(index, block.turns.length)}</span>
                  <textarea
                    value={turn.text}
                    onChange={(event) => {
                      const turns = block.turns.map((item) =>
                        item.id === turn.id
                          ? { ...item, text: event.target.value }
                          : item,
                      );
                      onChange({
                        ...draft,
                        blocks: draft.blocks.map((item) =>
                          item.id === block.id && item.kind === "dialogue"
                            ? { ...item, turns }
                            : item,
                        ),
                      });
                    }}
                  />
                </label>
              </div>
            );
          });
        })}
        {draft.portraits.map((portrait) => (
          <label key={portrait.id} className={styles.field}>
            <span>{portrait.character} 초상</span>
            <select
              aria-label={`${portrait.character} 뒤집기`}
              value={
                portrait.side === "오른쪽" && portrait.mirror ? "right" : "none"
              }
              disabled={portrait.side !== "오른쪽"}
              onChange={(event) => {
                const mirror = event.target.value === "right";
                onChange({
                  ...draft,
                  portraits: draft.portraits.map((item) =>
                    item.id === portrait.id ? { ...item, mirror } : item,
                  ),
                });
              }}
            >
              <option value="none">뒤집지 않음</option>
              <option value="right">오른쪽만 뒤집기</option>
            </select>
          </label>
        ))}
        {placement === "manuscript" ? (
          <>
            <label className={styles.field}>
              <span>구획 정답 메모</span>
              <input
                value={draft.answer}
                aria-describedby={`section-answer-note-${draft.sectionId}`}
                onChange={(event) =>
                  onChange({ ...draft, answer: event.target.value })
                }
              />
            </label>
            <p
              className={styles.muted}
              id={`section-answer-note-${draft.sectionId}`}
            >
              PDF에 인쇄되지 않습니다. 교사 원고와 교환 파일에만 저장하고 학생
              화면에는 보내지 않습니다.
            </p>
          </>
        ) : null}
        <PickEditor
          picks={draft.picks}
          existing={existingBlankItems}
          confirmEntryIds={confirmEntryIds}
          onConfirmEntries={onConfirmEntries}
          conceptChanged={conceptChanged}
          onChange={(picks) => onChange({ ...draft, picks })}
          onSearch={onSearchCatalog}
        />
        {orderMessage ? (
          <p className={styles.alert} role="alert">
            {orderMessage}
          </p>
        ) : null}
        <ConceptFields
          draft={draft}
          onChange={onChange}
          onCreate={onCreateConcept}
          onSave={onSaveConcept}
          unattached={unattachedConcepts}
          onAttach={onAttachConcept}
          linkFailure={conceptLinkFailure}
          onRetryLink={onRetryConceptLink}
          saving={saving}
        />
      </fieldset>
      {draft.concept ? (
        <TextbookConceptLinkEditor
          key={`${editionId}:${draft.concept.conceptKey}`}
          links={conceptLinks}
          confirmLinkIds={confirmLinkIds}
          disabled={locked || frozen}
          onChange={onConceptLinks}
        />
      ) : null}
      {lectureLink}
      <fieldset className={styles.stack} disabled={locked || frozen}>
        <ItemCapture
          items={draft.items}
          diffSummary={diffSummary}
          onCapture={onCapture}
          onDiff={onDiff}
          onRecapture={onRecapture}
          onLoadLinks={onLoadLinks}
          onLink={onLink}
          onRegister={onRegister}
          onLoadUnits={onLoadUnits}
          onLoadProblems={onLoadProblems}
          onLoadClasses={onLoadClasses}
          onLoadStudents={onLoadStudents}
          onLoadTests={onLoadTests}
        />
        <div className={styles.row}>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              onChange({
                ...draft,
                blocks: [
                  ...draft.blocks,
                  { id: crypto.randomUUID(), kind: "text", text: "" },
                ],
              })
            }
          >
            글 추가
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              onChange({
                ...draft,
                blocks: [
                  ...draft.blocks,
                  {
                    id: crypto.randomUUID(),
                    kind: "concept-recall",
                    conceptKey: "",
                    phase: "study",
                    text: "",
                    showRepetitionChecks: true,
                  },
                ],
              })
            }
          >
            회상 추가
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              onChange({
                ...draft,
                blocks: [
                  ...draft.blocks,
                  {
                    id: crypto.randomUUID(),
                    kind: "dialogue",
                    turns: [
                      {
                        id: crypto.randomUUID(),
                        speaker: "선생님",
                        speakerId: SPEAKER_IDS.선생님,
                        expression: "평온",
                        side: "왼쪽",
                        text: "",
                        portraitAssetId: "",
                        mirror: false,
                      },
                    ],
                  },
                ],
              })
            }
          >
            대화 추가
          </button>
          <button type="button" className={styles.button} onClick={onDelete}>
            구획 삭제
          </button>
        </div>
        {conflictMessage ? (
          <div className={styles.note} role="alert">
            <p>{conflictMessage}</p>
            <div className={styles.row}>
              <button
                type="button"
                className={styles.button}
                onClick={onToggleServer}
              >
                서버 내용 보기
              </button>
              <button type="button" className={styles.button} onClick={onCopy}>
                새 초안으로 복사
              </button>
            </div>
            {showServer && serverText ? <p>{serverText}</p> : null}
          </div>
        ) : null}
        <div className={styles.row}>
          <button
            type="button"
            className={styles.primary}
            disabled={saving || !order.ok || !mirrorsOk}
            onClick={onSave}
          >
            이 구획 저장
          </button>
          <p className={styles.muted}>기록 없음</p>
        </div>
      </fieldset>
    </div>
  );
}

function PickEditor({
  picks,
  existing,
  confirmEntryIds,
  onConfirmEntries,
  conceptChanged,
  onChange,
  onSearch,
}: {
  picks: BlankPick[];
  existing: TextbookConcept["blankItems"];
  confirmEntryIds: string[];
  onConfirmEntries: (ids: string[]) => void;
  conceptChanged: boolean;
  onChange: (picks: BlankPick[]) => void;
  onSearch: (query: string) => void;
}) {
  return (
    <fieldset className={styles.stack}>
      <legend>개념 백지</legend>
      {existing.length > 0 ? (
        <ul className={styles.list} aria-label="기존 개념백지 연결">
          {existing
            .filter(
              (entry) =>
                !picks.some(
                  (pick) =>
                    pick.entryId === entry.entryId &&
                    pick.entryKind === entry.entryKind,
                ),
            )
            .map((entry) => (
              <li key={`${entry.entryKind}:${entry.entryId}`}>
                <span>
                  {entry.blankSectionKey} · {entry.entryKind} · {entry.entryId}{" "}
                  ·{" "}
                  {confirmEntryIds.includes(entry.entryId)
                    ? "확인 요청"
                    : conceptChanged
                      ? "본문 변경 · 재확인 필요"
                      : entry.review.status === "confirmed"
                        ? "확인"
                        : entry.review.status === "rejected"
                          ? "거절"
                          : "후보"}
                </span>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`${entry.entryId} ${confirmEntryIds.includes(entry.entryId) ? "확인 취소" : "확인 요청"}`}
                  onClick={() =>
                    onConfirmEntries(
                      confirmEntryIds.includes(entry.entryId)
                        ? confirmEntryIds.filter((id) => id !== entry.entryId)
                        : [...confirmEntryIds, entry.entryId],
                    )
                  }
                >
                  {confirmEntryIds.includes(entry.entryId)
                    ? "확인 취소"
                    : "확인 요청"}
                </button>
              </li>
            ))}
        </ul>
      ) : null}
      <form
        className={styles.row}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSearch(String(data.get("query") ?? ""));
        }}
      >
        <label className={styles.field}>
          <span>은행 검색</span>
          <input name="query" />
        </label>
        <button type="submit" className={styles.button}>
          검색
        </button>
      </form>
      <ul className={styles.list}>
        {picks.map((pick, index) => (
          <li key={`${pick.form}-${pick.entryId}-${index}`}>
            {pick.form} · {pick.entryId} ·{" "}
            {pick.reviewStatus === "confirmed"
              ? "확인"
              : pick.reviewStatus === "rejected"
                ? "거절"
                : pick.confirmRequested
                  ? "확인 요청"
                  : "후보"}
            <button
              type="button"
              className={styles.button}
              aria-label={`${pick.entryId} 확인 요청`}
              onClick={() =>
                onChange(
                  picks.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          confirmRequested: true,
                          reviewStatus:
                            item.reviewStatus === "confirmed"
                              ? "confirmed"
                              : "candidate",
                        }
                      : item,
                  ),
                )
              }
            >
              확인 요청
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() =>
                onChange(
                  picks.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          confirmRequested: false,
                          reviewStatus: "rejected",
                        }
                      : item,
                  ),
                )
              }
            >
              거절
            </button>
          </li>
        ))}
      </ul>
      <PickAdd onAdd={(pick) => onChange([...picks, pick])} />
    </fieldset>
  );
}

function PickAdd({ onAdd }: { onAdd: (pick: BlankPick) => void }) {
  return (
    <form
      className={styles.row}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const entryKind = data.get("entryKind");
        const form = data.get("form");
        const level = data.get("level");
        if (
          entryKind !== "concept" &&
          entryKind !== "ox" &&
          entryKind !== "apply" &&
          entryKind !== "figure"
        )
          return;
        if (
          form !== "recall" &&
          form !== "term" &&
          form !== "cloze" &&
          form !== "map" &&
          form !== "figure"
        )
          return;
        if (level !== "하" && level !== "중" && level !== "상") return;
        onAdd({
          blankSectionKey: String(data.get("blankSectionKey") ?? ""),
          entryId: String(data.get("entryId") ?? ""),
          entryKind,
          form,
          level,
          reviewStatus: "candidate",
        });
        event.currentTarget.reset();
      }}
    >
      <label className={styles.field}>
        <span>소단원</span>
        <input name="blankSectionKey" />
      </label>
      <label className={styles.field}>
        <span>항목 ID</span>
        <input name="entryId" />
      </label>
      <label className={styles.field}>
        <span>종류</span>
        <select name="entryKind" defaultValue="concept">
          <option value="concept">개념</option>
          <option value="ox">참거짓</option>
          <option value="apply">적용</option>
          <option value="figure">그림</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>형식</span>
        <select name="form" defaultValue="recall">
          <option value="recall">회상</option>
          <option value="term">용어</option>
          <option value="cloze">빈칸</option>
          <option value="map">지도</option>
          <option value="figure">그림</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>난이도</span>
        <select name="level" defaultValue="중">
          <option value="하">하</option>
          <option value="중">중</option>
          <option value="상">상</option>
        </select>
      </label>
      <button type="submit" className={styles.button}>
        항목 추가
      </button>
    </form>
  );
}

const FORM_LABEL: Record<BlankForm, string> = {
  recall: "완전 백지",
  term: "용어",
  cloze: "빈칸",
  map: "지도",
  figure: "그림",
};

function ConceptFields({
  draft,
  onChange,
  onCreate,
  onSave,
  unattached,
  onAttach,
  linkFailure,
  onRetryLink,
  saving,
}: {
  draft: SectionDetail;
  onChange: (next: SectionDetail) => void;
  onCreate: (conceptKey: string, title: string) => void;
  onSave: () => void;
  unattached: readonly NamedChoice[];
  onAttach?: (conceptKey: string) => void;
  linkFailure: string | null;
  onRetryLink?: () => void;
  saving: boolean;
}) {
  const concept = draft.concept;
  if (!concept) {
    return (
      <div className={styles.stack}>
        <p className={styles.muted}>연결할 개념 원고가 없습니다.</p>
        {unattached.length > 0 && onAttach ? (
          // 저장은 됐지만 어느 구획에도 놓이지 않은 개념 — 새로 만들지 않고 이 구획에 잇는다
          <form
            className={styles.stack}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              onAttach(String(data.get("existingConcept") ?? ""));
            }}
          >
            <label className={styles.field}>
              <span>저장된 개념</span>
              <select name="existingConcept" defaultValue={unattached[0]!.id}>
                {unattached.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={styles.button} disabled={saving}>
              이 구획에 연결
            </button>
          </form>
        ) : null}
        <form
          className={styles.stack}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onCreate(
              String(data.get("conceptKey") ?? "").trim(),
              String(data.get("title") ?? "").trim(),
            );
          }}
        >
          <label className={styles.field}>
            <span>개념 키</span>
            <input name="conceptKey" />
          </label>
          <label className={styles.field}>
            <span>개념 제목</span>
            <input name="title" />
          </label>
          <button type="submit" className={styles.button}>
            개념 원고 만들기
          </button>
        </form>
      </div>
    );
  }
  const patch = (key: keyof typeof concept, value: string) =>
    onChange({ ...draft, concept: { ...concept, [key]: value } });
  return (
    <fieldset className={styles.stack}>
      <legend>개념 원고</legend>
      <label className={styles.field}>
        <span>갈래</span>
        <select
          value={concept.kind}
          onChange={(event) => {
            const kind = CONCEPT_KINDS.find(
              (item) => item === event.target.value,
            );
            if (!kind) return;
            onChange({ ...draft, concept: { ...concept, kind } });
          }}
        >
          {CONCEPT_KINDS.map((kind) => (
            <option key={kind}>{kind}</option>
          ))}
        </select>
      </label>
      {(
        [
          "goal",
          "definition",
          "conditions",
          "examples",
          "counterexamples",
          "misconceptions",
        ] as const
      ).map((key) => {
        const fieldId = `concept-${concept.conceptKey}-${key}`;
        return (
          <div key={key} className={styles.field}>
            <label htmlFor={fieldId}>{conceptLabel(key)}</label>
            <textarea
              id={fieldId}
              value={concept[key]}
              onChange={(event) => patch(key, event.target.value)}
            />
          </div>
        );
      })}
      <fieldset className={styles.row}>
        <legend>백지 형식</legend>
        {(Object.keys(FORM_LABEL) as BlankForm[]).map((form) => {
          const selected = concept.blankForms.includes(form);
          return (
            <button
              key={form}
              type="button"
              className={styles.button}
              aria-pressed={selected}
              onClick={() => {
                const next = toggleBlankForm(
                  concept.blankForms,
                  form,
                  draft.picks.some((pick) => pick.givenCase),
                );
                if (!next.ok) return;
                onChange({
                  ...draft,
                  concept: { ...concept, blankForms: next.forms },
                });
              }}
            >
              {FORM_LABEL[form]}
            </button>
          );
        })}
      </fieldset>
      {linkFailure ? (
        <div className={styles.note} role="alert">
          <p>개념 저장 완료 · 구획 연결 실패</p>
          <p>{linkFailure}</p>
          <p className={styles.muted}>
            개념 원고는 저장돼 있습니다. 다시 시도하면 이 구획에 연결만 합니다.
          </p>
          <button
            type="button"
            className={styles.button}
            disabled={saving}
            onClick={onRetryLink}
          >
            구획 연결 다시 시도
          </button>
        </div>
      ) : null}
      <button type="button" className={styles.primary} onClick={onSave}>
        개념 저장
      </button>
    </fieldset>
  );
}

function conceptLabel(
  key:
    | "goal"
    | "definition"
    | "conditions"
    | "examples"
    | "counterexamples"
    | "misconceptions",
): string {
  switch (key) {
    case "goal":
      return "목표";
    case "definition":
      return "정의";
    case "conditions":
      return "조건";
    case "examples":
      return "예";
    case "counterexamples":
      return "반례";
    case "misconceptions":
      return "오개념";
  }
}

const PROBLEM_TYPES = ["계산", "개념", "활용", "서술형"] as const;

function ChoiceSelect({
  label,
  value,
  options,
  empty,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly NamedChoice[];
  empty: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.length === 0 ? <option value="">{empty}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemCapture({
  items,
  diffSummary,
  onCapture,
  onDiff,
  onRecapture,
  onLoadLinks,
  onLink,
  onRegister,
  onLoadUnits,
  onLoadProblems,
  onLoadClasses,
  onLoadStudents,
  onLoadTests,
}: {
  items: SectionDetail["items"];
  diffSummary: string | null;
  onCapture: (testId: string, problemIds: string[]) => void;
  onDiff: (itemId: string) => void;
  onRecapture: (itemId: string) => void;
  onLoadLinks: (
    itemId: string,
  ) => Promise<{ problemId: string; problemCode: string }[]>;
  onLink: (itemId: string, problemId: string) => void;
  onRegister: (
    itemId: string,
    fields: RegisterFields,
  ) => Promise<{ problemId: string; problemCode: string }[] | null>;
  onLoadUnits: () => Promise<NamedChoice[]>;
  onLoadProblems: (unitId: string) => Promise<NamedChoice[] | null>;
  onLoadClasses: () => Promise<NamedChoice[]>;
  onLoadStudents: (classId: string) => Promise<NamedChoice[]>;
  onLoadTests: (
    classId: string,
    studentId?: string,
  ) => Promise<NamedChoice[] | null>;
}) {
  const [links, setLinks] = useState<{
    itemId: string;
    candidates: { problemId: string; problemCode: string }[];
    problemId: string;
  } | null>(null);
  const [sourceMode, setSourceMode] = useState<"test" | "problems" | null>(
    null,
  );
  const [classes, setClasses] = useState<NamedChoice[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<NamedChoice[]>([]);
  const [studentId, setStudentId] = useState("");
  const [tests, setTests] = useState<NamedChoice[]>([]);
  const [testId, setTestId] = useState("");
  const [units, setUnits] = useState<NamedChoice[]>([]);
  const [unitId, setUnitId] = useState("");
  const [problems, setProblems] = useState<NamedChoice[]>([]);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  // 화면의 목록이 «어느 선택» 의 것인지 — 상위 선택을 바꾼 직후에는 앞 선택의 목록이 남아 있다
  const [testsFor, setTestsFor] = useState<string | null>(null);
  const [problemsFor, setProblemsFor] = useState<string | null>(null);
  const [testsFailedFor, setTestsFailedFor] = useState<string | null>(null);
  const testsKey = `${classId}|${studentId}`;
  const testsReady = classId !== "" && testsFor === testsKey;
  const problemsReady = unitId !== "" && problemsFor === unitId;
  const [registerFor, setRegisterFor] = useState<string | null>(null);
  const [registerUnits, setRegisterUnits] = useState<NamedChoice[]>([]);
  const [registerUnitId, setRegisterUnitId] = useState("");
  const [difficulty, setDifficulty] =
    useState<RegisterFields["difficulty"]>("기본");
  const [problemType, setProblemType] = useState<ProblemType>("계산");

  useEffect(() => {
    if (sourceMode !== "test" || !classId) return;
    let cancel = false;
    void onLoadStudents(classId).then((rows) => {
      if (!cancel) setStudents(rows);
    });
    return () => {
      cancel = true;
    };
  }, [classId, onLoadStudents, sourceMode]);

  useEffect(() => {
    if (sourceMode !== "test" || !classId) return;
    let cancel = false;
    void onLoadTests(classId, studentId || undefined).then((rows) => {
      if (cancel) return;
      // null = 읽지 못했다 — 빈 목록으로 치지 않는다(«없습니다» 도 제출도 열리지 않는다)
      if (rows === null) {
        setTestsFailedFor(`${classId}|${studentId}`);
        return;
      }
      setTests(rows);
      setTestId(rows[0]?.id ?? "");
      setTestsFor(`${classId}|${studentId}`);
    });
    return () => {
      cancel = true;
    };
  }, [classId, onLoadTests, sourceMode, studentId]);

  useEffect(() => {
    if (sourceMode !== "problems" || !unitId) return;
    let cancel = false;
    void onLoadProblems(unitId).then((rows) => {
      if (cancel || rows === null) return;
      setProblems(rows);
      setProblemIds([]);
      setProblemsFor(unitId);
    });
    return () => {
      cancel = true;
    };
  }, [onLoadProblems, sourceMode, unitId]);

  return (
    <fieldset className={styles.stack}>
      <legend>문항</legend>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          // 지금 고른 반 · 단원의 목록이 도착한 뒤에만 보낸다 — 앞 선택의 것을 싣지 않는다
          if (sourceMode === "test") {
            if (!testsReady || !testId) return;
            onCapture(testId, []);
            return;
          }
          if (sourceMode === "problems") {
            if (!problemsReady || problemIds.length === 0) return;
            onCapture("", problemIds);
          }
        }}
      >
        <div className={styles.row}>
          <button
            type="button"
            className={styles.button}
            aria-pressed={sourceMode === "test"}
            onClick={() => {
              setSourceMode("test");
              void onLoadClasses().then((rows) => {
                setClasses(rows);
                setClassId(rows[0]?.id ?? "");
              });
            }}
          >
            시험지에서 가져오기
          </button>
          <button
            type="button"
            className={styles.button}
            aria-pressed={sourceMode === "problems"}
            onClick={() => {
              setSourceMode("problems");
              void onLoadUnits().then((rows) => {
                setUnits(rows);
                setUnitId(rows[0]?.id ?? "");
              });
            }}
          >
            문제에서 가져오기
          </button>
        </div>
        {sourceMode === "test" ? (
          <>
            <ChoiceSelect
              label="반"
              value={classId}
              options={classes}
              empty="반이 없습니다"
              onChange={(id) => {
                setClassId(id);
                setStudentId("");
              }}
            />
            <ChoiceSelect
              label="학생"
              value={studentId}
              options={[{ id: "", label: "반 전체" }, ...students]}
              empty="반 전체"
              onChange={setStudentId}
            />
            <ChoiceSelect
              label="시험지"
              value={testsReady ? testId : ""}
              options={testsReady ? tests : []}
              empty={
                testsReady || !classId
                  ? "시험지가 없습니다"
                  : testsFailedFor === testsKey
                    ? "시험지를 읽지 못했습니다"
                    : "시험지를 불러오는 중입니다"
              }
              onChange={setTestId}
            />
          </>
        ) : null}
        {sourceMode === "problems" ? (
          <>
            <ChoiceSelect
              label="단원"
              value={unitId}
              options={units}
              empty="단원이 없습니다"
              onChange={(id) => {
                setUnitId(id);
                setProblemIds([]);
              }}
            />
            <ul className={styles.list}>
              {(problemsReady ? problems : []).map((problem) => (
                <li key={problem.id}>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={problem.label}
                      checked={problemIds.includes(problem.id)}
                      onChange={(event) => {
                        setProblemIds((current) =>
                          event.target.checked
                            ? current.includes(problem.id)
                              ? current
                              : [...current, problem.id]
                            : current.filter((id) => id !== problem.id),
                        );
                      }}
                    />
                    {problem.label}
                  </label>
                </li>
              ))}
            </ul>
            {problemsReady && problems.length === 0 ? (
              <p className={styles.muted}>이 단원의 문제가 없습니다.</p>
            ) : null}
          </>
        ) : null}
        <button
          type="submit"
          className={styles.button}
          disabled={
            (sourceMode === "test" && !testsReady) ||
            (sourceMode === "problems" && !problemsReady)
          }
        >
          문항 가져오기
        </button>
      </form>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.itemId}>
            {item.label} ·{" "}
            {item.state === "same"
              ? "같음"
              : item.state === "changed"
                ? "달라짐"
                : item.state === "uncompared"
                  ? "비교 전"
                  : "없음"}
            <button
              type="button"
              className={styles.button}
              onClick={() => onDiff(item.itemId)}
            >
              비교
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => onRecapture(item.itemId)}
            >
              다시 고정
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                void onLoadLinks(item.itemId).then((candidates) => {
                  setLinks({
                    itemId: item.itemId,
                    candidates,
                    problemId: candidates[0]?.problemId ?? "",
                  });
                });
              }}
            >
              연결
            </button>
            {links &&
            links.itemId === item.itemId &&
            links.candidates.length > 0 ? (
              <>
                <label className={styles.field}>
                  <span>연결 후보</span>
                  <select
                    aria-label="연결 후보"
                    value={links.problemId}
                    onChange={(event) =>
                      setLinks({ ...links, problemId: event.target.value })
                    }
                  >
                    {links.candidates.map((candidate) => (
                      <option
                        key={candidate.problemId}
                        value={candidate.problemId}
                      >
                        {candidate.problemCode}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => onLink(item.itemId, links.problemId)}
                >
                  선택한 문항 연결
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setRegisterFor(item.itemId);
                void onLoadUnits().then((rows) => {
                  setRegisterUnits(rows);
                  setRegisterUnitId(rows[0]?.id ?? "");
                });
              }}
            >
              등록
            </button>
            {registerFor === item.itemId ? (
              <div className={styles.stack}>
                <ChoiceSelect
                  label="등록 단원"
                  value={registerUnitId}
                  options={registerUnits}
                  empty="단원이 없습니다"
                  onChange={setRegisterUnitId}
                />
                <label className={styles.field}>
                  <span>난이도</span>
                  <select
                    aria-label="난이도"
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(
                        event.target.value as RegisterFields["difficulty"],
                      )
                    }
                  >
                    {DIFFICULTY_LADDER.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>문제 유형</span>
                  <select
                    aria-label="문제 유형"
                    value={problemType}
                    onChange={(event) =>
                      setProblemType(event.target.value as ProblemType)
                    }
                  >
                    {PROBLEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.button}
                  disabled={!registerUnitId}
                  onClick={() => {
                    if (!registerUnitId) return;
                    void onRegister(item.itemId, {
                      unitId: registerUnitId,
                      difficulty,
                      problemType,
                    }).then((candidates) => {
                      if (!candidates || candidates.length === 0) return;
                      setLinks({
                        itemId: item.itemId,
                        candidates,
                        problemId: candidates[0]?.problemId ?? "",
                      });
                    });
                  }}
                >
                  검수 대기로 등록
                </button>
                <p className={styles.muted}>
                  검수 대기로 올라갑니다. 연결은 후보를 고른 뒤에 따로 합니다.
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {diffSummary ? <p>{diffSummary}</p> : null}
    </fieldset>
  );
}

export type LectureChoice = {
  lectureId: string;
  title: string;
  status: "draft" | "published" | "archived";
};

/** 단원 개념 준비 강의. 문항 풀이 영상 바인딩과는 다른 목록이다. */
export function LectureLink({
  conceptKey,
  sourceUnitIds,
  refs,
  disabled,
  onFind,
  onLink,
  onUnlink,
}: {
  conceptKey: string | null;
  sourceUnitIds: readonly string[];
  refs: readonly { lectureId: string; conceptKey: string }[];
  disabled: boolean;
  onFind: () => Promise<LectureChoice[]>;
  onLink: (lectureId: string) => void;
  onUnlink: (lectureId: string, conceptKey: string) => void;
}) {
  const [choices, setChoices] = useState<LectureChoice[] | null>(null);
  const [picked, setPicked] = useState("");
  const published = (choices ?? []).filter((row) => row.status === "published");
  const mine = conceptKey
    ? refs.filter((ref) => ref.conceptKey === conceptKey)
    : [];
  return (
    <fieldset className={styles.stack} disabled={disabled}>
      <legend>개념 준비 강의</legend>
      {!conceptKey ? (
        <p className={styles.muted}>개념 키를 먼저 만드세요.</p>
      ) : sourceUnitIds.length === 0 ? (
        <p className={styles.muted}>
          이 단원에 연결된 차시가 없어 강의를 찾지 않습니다.
        </p>
      ) : (
        <>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              void onFind().then((rows) => {
                setChoices(rows);
                const first = rows.find((row) => row.status === "published");
                setPicked(first?.lectureId ?? "");
              });
            }}
          >
            강의 찾기
          </button>
          {choices && published.length === 0 ? (
            <p>게시한 강의가 없습니다.</p>
          ) : null}
          {published.length > 0 ? (
            <div className={styles.row}>
              <label className={styles.field}>
                <span>강의</span>
                <select
                  aria-label="개념 준비 강의"
                  value={picked}
                  onChange={(event) => setPicked(event.target.value)}
                >
                  {published.map((row) => (
                    <option key={row.lectureId} value={row.lectureId}>
                      {row.title || "제목 없음"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  if (picked) onLink(picked);
                }}
              >
                연결
              </button>
            </div>
          ) : null}
        </>
      )}
      {mine.length > 0 ? (
        <ul>
          {mine.map((ref) => {
            const title = choices?.find(
              (row) => row.lectureId === ref.lectureId,
            )?.title;
            const label = title && title.length > 0 ? title : "연결된 강의";
            return (
              <li key={`${ref.lectureId}:${ref.conceptKey}`}>
                {label}
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`${label} 빼기`}
                  onClick={() => onUnlink(ref.lectureId, ref.conceptKey)}
                >
                  빼기
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}

export function ObservationForm({
  onLoadClasses,
  onLoadStudents,
  onSubmit,
}: {
  onLoadClasses: () => Promise<NamedChoice[]>;
  onLoadStudents: (classId: string) => Promise<NamedChoice[]>;
  onSubmit: (studentId: string, form: BlankForm, observation: string) => void;
}) {
  const [classes, setClasses] = useState<NamedChoice[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<NamedChoice[]>([]);
  const [studentId, setStudentId] = useState("");
  useEffect(() => {
    let cancel = false;
    void onLoadClasses().then((rows) => {
      if (cancel) return;
      setClasses(rows);
      setClassId(rows[0]?.id ?? "");
    });
    return () => {
      cancel = true;
    };
  }, [onLoadClasses]);
  useEffect(() => {
    if (!classId) return;
    let cancel = false;
    void onLoadStudents(classId).then((rows) => {
      if (cancel) return;
      setStudents(rows);
      setStudentId(rows[0]?.id ?? "");
    });
    return () => {
      cancel = true;
    };
  }, [classId, onLoadStudents]);
  return (
    <form
      className={styles.stack}
      aria-label="종이 활동"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const form = data.get("form");
        const chosen =
          form === "recall" ||
          form === "term" ||
          form === "cloze" ||
          form === "map" ||
          form === "figure"
            ? form
            : "recall";
        onSubmit(
          studentId,
          chosen,
          String(data.get("observation") ?? "").trim(),
        );
      }}
    >
      <fieldset className={styles.stack}>
        <legend>종이 활동</legend>
        <ChoiceSelect
          label="반"
          value={classId}
          options={classes}
          empty="반이 없습니다"
          onChange={setClassId}
        />
        <ChoiceSelect
          label="학생"
          value={studentId}
          options={students}
          empty="학생이 없습니다"
          onChange={setStudentId}
        />
        <label className={styles.field}>
          <span>형식</span>
          <select name="form" defaultValue="term" aria-label="종이 활동 형식">
            {(
              [
                ["recall", "완전 백지"],
                ["term", "용어"],
                ["cloze", "빈칸"],
                ["map", "지도"],
                ["figure", "그림"],
              ] as const
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>관찰</span>
          <textarea name="observation" />
        </label>
        <button type="submit" className={styles.button}>
          기록
        </button>
      </fieldset>
    </form>
  );
}

export function PreviewPane({
  panelId,
  tabLabelledBy,
  input,
  zoom,
  pageLabel,
  onMode,
  onZoom,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  showModes,
  renderPaper,
  measured,
  unavailable,
}: {
  panelId?: string;
  tabLabelledBy?: string;
  input: PaperPreviewInput;
  zoom: ZoomMode;
  pageLabel: string;
  onMode: (mode: PreviewMode) => void;
  onZoom: (zoom: ZoomMode) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  showModes: boolean;
  renderPaper?: (input: PaperPreviewInput) => ReactNode;
  /** 측정이 되면 대기 문장과 대사 덤프 대신 이 노드를 보여 준다. */
  measured?: ReactNode;
  /** 측정하지 않는 사유. 없으면 기존 대기 지면을 그대로 둔다. */
  unavailable?: string | null;
}) {
  return (
    <section
      id={panelId}
      role={tabLabelledBy ? "tabpanel" : undefined}
      aria-labelledby={tabLabelledBy}
      className={`${styles.panel} ${styles.preview}`}
      aria-label={tabLabelledBy ? undefined : "미리보기"}
    >
      <h2>미리보기</h2>
      {showModes ? (
        <div className={styles.row} role="group" aria-label="지면 종류">
          <ModeButton
            current={input.mode}
            mode="draft"
            label="초안"
            onMode={onMode}
          />
          <ModeButton
            current={input.mode}
            mode="student"
            label="학생용"
            onMode={onMode}
          />
          <ModeButton
            current={input.mode}
            mode="teacher"
            label="교사용"
            onMode={onMode}
          />
        </div>
      ) : null}
      <div className={styles.row} role="group" aria-label="배율">
        <button
          type="button"
          className={styles.button}
          aria-pressed={zoom === "fit"}
          onClick={() => onZoom("fit")}
        >
          맞춤
        </button>
        <button
          type="button"
          className={styles.button}
          aria-pressed={zoom === "wide"}
          onClick={() => onZoom("wide")}
        >
          넓게
        </button>
      </div>
      <div className={styles.pageNav}>
        <button
          type="button"
          className={styles.button}
          onClick={onPrev}
          disabled={prevDisabled}
        >
          이전 쪽
        </button>
        <span>{pageLabel}</span>
        <button
          type="button"
          className={styles.button}
          onClick={onNext}
          disabled={nextDisabled}
        >
          다음 쪽
        </button>
      </div>
      <div
        className={styles.spread}
        role="region"
        aria-label="지면"
        data-zoom={zoom}
      >
        {renderPaper ? (
          renderPaper(input)
        ) : measured ? (
          measured
        ) : (
          <article className={styles.page}>
            <p className={styles.muted}>
              {unavailable ?? "이 구획은 측정하지 않습니다."}
            </p>
            <h3>{input.title}</h3>
            {input.parityMessage ? <p>{input.parityMessage}</p> : null}
          </article>
        )}
      </div>
      {input.answerPlacement === "sheet" && input.answer ? (
        // 지면 밖에 둔다 — 조판하지 않는 글이다
        <div className={styles.note} role="note" aria-label="구획 정답 메모">
          <p>구획 정답 메모 · PDF에 인쇄되지 않음</p>
          <p>{input.answer}</p>
        </div>
      ) : null}
    </section>
  );
}

function ModeButton({
  current,
  mode,
  label,
  onMode,
}: {
  current: PreviewMode;
  mode: PreviewMode;
  label: string;
  onMode: (mode: PreviewMode) => void;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={current === mode}
      onClick={() => onMode(mode)}
    >
      {label}
    </button>
  );
}

export function paperInput(
  draft: SectionDetail,
  audience: Audience,
  mode: PreviewMode,
  zoom: ZoomMode,
  pageLabel: string,
): PaperPreviewInput {
  const answer = visibleAnswer(audience, mode, draft.answer);
  return {
    mode,
    zoom,
    title: draft.title,
    blocks: draft.blocks,
    portraits: draft.portraits,
    answer,
    answerPlacement: answerPlacement(audience, mode),
    parityMessage: draft.parityMessage,
    pageLabel,
  };
}

export function ReviewTable({ issues }: { issues: StudioIssue[] }) {
  return (
    <section className={styles.panel} aria-label="검수">
      <h2>검수</h2>
      {issues.length === 0 ? (
        <p className={styles.muted}>표시할 검수 항목이 없습니다.</p>
      ) : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>정도</th>
              <th>내용</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, index) => (
              <tr key={`${issue.message}-${index}`}>
                <td>
                  {issue.severity === "error"
                    ? "오류"
                    : issue.severity === "warning"
                      ? "경고"
                      : "안내"}
                </td>
                <td>{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PublishPanel({
  status,
  issues,
  busy,
  locked,
  onPreflight,
  onReserve,
  onStep,
  onFinalize,
}: {
  status: PublishStatus;
  issues: StudioIssue[];
  busy: boolean;
  locked: boolean;
  onPreflight: () => void;
  onReserve: () => void;
  onStep: () => void;
  onFinalize: () => void;
}) {
  const failed = status === "failed" || status === "preflight-failed";
  return (
    <section className={styles.panel} aria-label="발행">
      <h2>발행</h2>
      <p className={failed ? styles.alert : styles.muted} role="status">
        {publishHeadline(status)}
      </p>
      <ReviewTable issues={issues} />
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          disabled={busy || locked}
          onClick={onPreflight}
        >
          발행 전 확인
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={
            busy ||
            locked ||
            (status !== "idle" && status !== "preflight-failed")
          }
          onClick={onReserve}
        >
          예약
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={
            busy || locked || (status !== "reserved" && status !== "running")
          }
          onClick={onStep}
        >
          조판 단계
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={busy || locked || !canFinalize(status)}
          onClick={onFinalize}
        >
          확정
        </button>
      </div>
    </section>
  );
}

export function AssignmentPanel({
  rows,
  unavailable = null,
  onLoadClasses,
  onLoadStudents,
  onCreate,
  onRevoke,
}: {
  rows: AssignmentRow[];
  /** 배정할 수 없는 사유(발행 전 판본). 있으면 배정 추가를 막고 사유를 먼저 보여 준다 */
  unavailable?: string | null;
  onLoadClasses: () => Promise<NamedChoice[]>;
  onLoadStudents: (classId: string) => Promise<NamedChoice[]>;
  onCreate: (kind: "class" | "student", id: string, label: string) => void;
  onRevoke: (assignmentId: string) => void;
}) {
  const [kind, setKind] = useState<"class" | "student">("class");
  // null = 아직 불러오는 중. 빈 배열(반이 없음)과 가른다
  const [classes, setClasses] = useState<NamedChoice[] | null>(null);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<NamedChoice[]>([]);
  const [studentId, setStudentId] = useState("");
  useEffect(() => {
    let cancel = false;
    void onLoadClasses().then((next) => {
      if (cancel) return;
      setClasses(next);
      setClassId(next[0]?.id ?? "");
    });
    return () => {
      cancel = true;
    };
  }, [onLoadClasses]);
  const chosenTarget =
    kind === "class"
      ? (classes ?? []).some((row) => row.id === classId)
      : students.some((row) => row.id === studentId);
  useEffect(() => {
    if (kind !== "student" || !classId) return;
    let cancel = false;
    void onLoadStudents(classId).then((next) => {
      if (cancel) return;
      setStudents(next);
      setStudentId(next[0]?.id ?? "");
    });
    return () => {
      cancel = true;
    };
  }, [classId, kind, onLoadStudents]);
  return (
    <section className={styles.panel} aria-label="배정">
      <h2>배정</h2>
      <p className={styles.muted}>
        판본 전체에 배정합니다. 반과 학생은 함께 고르지 않습니다.
      </p>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.assignmentId}>
            {row.target.label}
            {row.revoked ? " · 회수" : ""}
            <button
              type="button"
              className={styles.button}
              onClick={() => onRevoke(row.assignmentId)}
            >
              회수
            </button>
          </li>
        ))}
      </ul>
      {unavailable ? (
        <p className={styles.alert} role="note">
          {unavailable}
        </p>
      ) : null}
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          if (unavailable) return;
          if (kind === "class") {
            const chosen = (classes ?? []).find((row) => row.id === classId);
            if (!chosen) return;
            onCreate("class", chosen.id, chosen.label);
            return;
          }
          const chosen = students.find((row) => row.id === studentId);
          if (!chosen) return;
          onCreate("student", chosen.id, chosen.label);
        }}
      >
        <label className={styles.field}>
          <span>대상</span>
          <select
            aria-label="대상"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value === "student" ? "student" : "class")
            }
          >
            <option value="class">반</option>
            <option value="student">학생</option>
          </select>
        </label>
        <ChoiceSelect
          label="반"
          value={classId}
          options={classes ?? []}
          empty={
            classes === null ? "반 목록을 불러오는 중입니다" : "반이 없습니다"
          }
          onChange={setClassId}
        />
        {kind === "student" ? (
          <ChoiceSelect
            label="학생"
            value={studentId}
            options={students}
            empty="학생이 없습니다"
            onChange={setStudentId}
          />
        ) : null}
        <button
          type="submit"
          className={styles.button}
          disabled={Boolean(unavailable) || !chosenTarget}
        >
          배정 추가
        </button>
        {!unavailable && classes !== null && !chosenTarget ? (
          <p className={styles.muted}>배정할 대상이 없습니다.</p>
        ) : null}
      </form>
    </section>
  );
}

export function ReissuePanel({
  items,
  classes,
  units,
  onSubmit,
}: {
  items: readonly { itemId: string; label: string }[];
  classes: readonly NamedChoice[];
  units: readonly NamedChoice[];
  onSubmit: (input: {
    itemIds: string[];
    classId: string;
    title: string;
    testType: "daily" | "review";
    rangeEndUnitId: string;
  }) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [classId, setClassId] = useState("");
  const [unitId, setUnitId] = useState("");
  const selectedClassId = classes.some((row) => row.id === classId)
    ? classId
    : (classes[0]?.id ?? "");
  const selectedUnitId = units.some((row) => row.id === unitId)
    ? unitId
    : (units[0]?.id ?? "");
  const [testType, setTestType] = useState<"daily" | "review">("daily");
  const [title, setTitle] = useState("");
  function move(index: number, delta: number) {
    setChosen((current) => {
      const next = current.slice();
      const target = index + delta;
      const item = next[index];
      const other = next[target];
      if (item === undefined || other === undefined) return current;
      next[index] = other;
      next[target] = item;
      return next;
    });
  }
  return (
    <section className={styles.panel} aria-label="다시 출제">
      <h2>다시 출제</h2>
      <p className={styles.muted}>
        발행본의 배치를 고른 차례대로 이 반의 시험지로 만듭니다. 제목은 시험지에
        저장되지 않습니다.
      </p>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          if (chosen.length === 0 || !selectedClassId || !selectedUnitId)
            return;
          onSubmit({
            itemIds: chosen,
            classId: selectedClassId,
            title: title.trim(),
            testType,
            rangeEndUnitId: selectedUnitId,
          });
        }}
      >
        <ChoiceSelect
          label="반"
          value={selectedClassId}
          options={classes}
          empty="반이 없습니다"
          onChange={setClassId}
        />
        <ChoiceSelect
          label="범위 끝 단원"
          value={selectedUnitId}
          options={units}
          empty="단원이 없습니다"
          onChange={setUnitId}
        />
        <label className={styles.field}>
          <span>종류</span>
          <select
            aria-label="종류"
            value={testType}
            onChange={(event) =>
              setTestType(event.target.value === "review" ? "review" : "daily")
            }
          >
            <option value="daily">일일테스트</option>
            <option value="review">확인테스트</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>제목</span>
          <input
            aria-label="제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.itemId}>
              {item.label}
              <button
                type="button"
                className={styles.button}
                disabled={chosen.length >= 200}
                onClick={() =>
                  setChosen((current) => [...current, item.itemId])
                }
              >
                {item.label} 추가
              </button>
            </li>
          ))}
        </ul>
        {chosen.length >= 200 ? (
          <p className={styles.muted}>한 번에 200문항까지 고릅니다.</p>
        ) : null}
        <ol>
          {chosen.map((itemId, index) => {
            const label =
              items.find((item) => item.itemId === itemId)?.label ?? itemId;
            return (
              <li key={`${itemId}:${index}`}>
                {label}
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`${label} 위로`}
                  onClick={() => move(index, -1)}
                >
                  위로
                </button>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`${label} 아래로`}
                  onClick={() => move(index, 1)}
                >
                  아래로
                </button>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={`${label} 빼기`}
                  onClick={() =>
                    setChosen((current) =>
                      current.filter((_, at) => at !== index),
                    )
                  }
                >
                  빼기
                </button>
              </li>
            );
          })}
        </ol>
        <button type="submit" className={styles.button}>
          시험지 만들기
        </button>
      </form>
    </section>
  );
}

/** 영상을 걸 문항 — 화면이 읽어 둔 확정본의 내용과 그 해시 */
export type VideoSnapshotChoice = {
  snapshotId: string;
  label: string;
  content: string;
  answer: string;
  contentHash: string;
};

export function VideoPanel({
  rows,
  choices = [],
  snapshots = [],
  onUpdate,
  onCreate,
  onBind,
}: {
  rows: VideoBinding[];
  /** 내가 등록한 영상 */
  choices?: readonly NamedChoice[];
  snapshots?: readonly VideoSnapshotChoice[];
  /** `contentHash` 는 검수자가 이 화면에서 본 내용의 해시다 */
  onUpdate: (
    bindingId: string,
    status: VideoBinding["status"],
    policy: VideoBinding["policy"],
    contentHash: string,
  ) => void;
  onCreate: (title: string, providerVideoId: string) => void;
  onBind: (snapshotId: string, videoId: string, contentHash: string) => void;
}) {
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [chosenSnapshot, setChosenSnapshot] = useState("");
  /**
   * 연결하려는 문항에서 **본 내용**과 그 해시 — 고른 순간의 것을 붙잡아 둔다.
   * 보낼 때 목록을 다시 읽어 채우지 않는다: 그사이 내용이 바뀌었으면 서버가 409 로 알려야 한다.
   */
  const [viewed, setViewed] = useState<VideoSnapshotChoice | null>(null);
  const [chosenVideo, setChosenVideo] = useState("");
  /** 연결마다 «내용 확인»을 눌러 본 해시 */
  const [reviewed, setReviewed] = useState<Record<string, VideoSnapshotChoice>>(
    {},
  );
  const parsedId = youtubeVideoId(address);
  const videoId = choices.some((choice) => choice.id === chosenVideo)
    ? chosenVideo
    : (choices[0]?.id ?? "");
  return (
    <section className={styles.panel} aria-label="영상">
      <h2>영상</h2>
      <form
        className={styles.row}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const id = youtubeVideoId(address);
          if (!id) {
            setAddressError(
              "유튜브 주소나 11자 영상 ID를 넣어 주세요. 주소에서 영상 ID만 저장합니다.",
            );
            return;
          }
          setAddressError(null);
          onCreate(String(data.get("title") ?? "").trim(), id);
        }}
      >
        <label className={styles.field}>
          <span>영상 제목</span>
          <input name="title" />
        </label>
        <label className={styles.field}>
          <span>유튜브 주소 또는 ID</span>
          <input
            name="providerVideoId"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setAddressError(null);
            }}
          />
        </label>
        <button type="submit" className={styles.button}>
          영상 등록
        </button>
        {address.trim() !== "" && parsedId ? (
          <p className={styles.muted}>영상 ID {parsedId}</p>
        ) : null}
        {addressError ? (
          <p className={styles.alert} role="alert">
            {addressError}
          </p>
        ) : null}
      </form>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          // 고급 입력에 값을 적었으면 그 값이 먼저다. 비워 두면 위에서 고르고 확인한 것을 쓴다
          const typedSnapshot = String(data.get("snapshotId") ?? "").trim();
          const typedVideo = String(data.get("videoId") ?? "").trim();
          const typedHash = String(data.get("contentHash") ?? "").trim();
          onBind(
            typedSnapshot || viewed?.snapshotId || "",
            typedVideo || videoId,
            typedHash || viewed?.contentHash || "",
          );
        }}
      >
        <div className={styles.row}>
          <label className={styles.field}>
            <span>문항</span>
            <select
              aria-label="문항"
              value={chosenSnapshot}
              onChange={(event) => {
                setChosenSnapshot(event.target.value);
                // 고른 순간 화면에 띄운 내용을 붙잡는다 — 아래 «확인한 내용»이 이것이다
                setViewed(
                  snapshots.find(
                    (row) => row.snapshotId === event.target.value,
                  ) ?? null,
                );
              }}
            >
              <option value="">
                {snapshots.length === 0
                  ? "이 판본에 담은 문항이 없습니다"
                  : "문항을 고르세요"}
              </option>
              {snapshots.map((row) => (
                <option key={row.snapshotId} value={row.snapshotId}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>등록한 영상</span>
            <select
              aria-label="등록한 영상"
              value={videoId}
              onChange={(event) => setChosenVideo(event.target.value)}
            >
              {choices.length === 0 ? (
                <option value="">등록한 영상이 없습니다</option>
              ) : null}
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {viewed ? (
          <div
            className={styles.note}
            role="group"
            aria-label="확인한 문항 내용"
          >
            <p>확인한 문항 내용 · {viewed.label}</p>
            <p>{viewed.content}</p>
            <p>정답 {viewed.answer}</p>
            <p className={styles.muted}>
              이 내용을 기준으로 연결합니다. 연결 전에 내용이 바뀌면 서버가
              거절합니다.
            </p>
          </div>
        ) : null}
        <details className={styles.details}>
          <summary>고급 입력</summary>
          <p className={styles.muted}>
            비워 두면 위에서 고른 문항 · 영상과 확인한 내용의 해시를 씁니다.
          </p>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>확정본</span>
              <input name="snapshotId" />
            </label>
            <label className={styles.field}>
              <span>영상 번호</span>
              <input name="videoId" />
            </label>
            <label className={styles.field}>
              <span>내용 해시</span>
              <input name="contentHash" />
            </label>
          </div>
        </details>
        <button type="submit" className={styles.button}>
          영상 연결
        </button>
      </form>
      <ul className={styles.list}>
        {rows.map((row) => {
          const source = snapshots.find(
            (item) => item.snapshotId === row.snapshotId,
          );
          const seen = reviewed[row.bindingId];
          // 중지는 검수가 아니다 — 본 해시가 없으면 게시 때 적힌 해시를 쓴다
          const stopHash = seen?.contentHash ?? row.contentHash;
          return (
            <li key={row.bindingId}>
              {row.label} · {videoStatusLabel(row.status)}
              {row.policy === "optional" && row.status !== "published"
                ? " · 준비 중"
                : ""}
              <button
                type="button"
                className={styles.button}
                disabled={!source}
                onClick={() =>
                  source &&
                  setReviewed((current) => ({
                    ...current,
                    [row.bindingId]: source,
                  }))
                }
              >
                내용 확인
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={!seen}
                onClick={() =>
                  seen &&
                  onUpdate(
                    row.bindingId,
                    "pending-review",
                    row.policy,
                    seen.contentHash,
                  )
                }
              >
                검수 요청
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={!seen}
                onClick={() =>
                  seen &&
                  onUpdate(
                    row.bindingId,
                    "published",
                    row.policy,
                    seen.contentHash,
                  )
                }
              >
                게시
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={!stopHash}
                onClick={() =>
                  stopHash &&
                  onUpdate(row.bindingId, "stopped", row.policy, stopHash)
                }
              >
                중지
              </button>
              {seen ? (
                <div
                  className={styles.note}
                  role="group"
                  aria-label={`${row.label} 확인한 문항 내용`}
                >
                  <p>확인한 문항 내용 · {seen.label}</p>
                  <p>{seen.content}</p>
                  <p>정답 {seen.answer}</p>
                </div>
              ) : (
                <p className={styles.muted}>
                  {source
                    ? "문항 내용을 확인한 뒤 검수 요청 · 게시를 누를 수 있습니다."
                    : "이 연결의 문항 내용이 이 판본에 없습니다. 내용을 확인할 수 없어 검수 요청 · 게시를 보내지 않습니다."}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? (
        <p className={styles.muted}>연결된 영상이 없습니다.</p>
      ) : null}
    </section>
  );
}

export function ConfigPanel({
  volumeCode,
  title,
  pageTarget,
  videoPolicy,
  studentSolutionPolicy,
  print,
  locked,
  busy,
  onSave,
}: {
  volumeCode: string;
  title: string;
  pageTarget: string;
  videoPolicy: "required" | "optional";
  studentSolutionPolicy: "never" | "assigned";
  print?: {
    coverMode: "included" | "separate";
    firstPhysicalPageIndex: number;
  };
  locked: boolean;
  busy: boolean;
  onSave: (value: {
    volumeCode: string;
    title: string;
    pageTarget: string;
    videoPolicy: "required" | "optional";
    studentSolutionPolicy: "never" | "assigned";
    coverMode?: "included" | "separate";
    firstPhysicalPageIndex?: string;
  }) => void;
}) {
  return (
    <form
      className={styles.stack}
      aria-label="교재 설정"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const policy = data.get("studentSolutionPolicy");
        const video = data.get("videoPolicy");
        const cover = data.get("coverMode");
        onSave({
          volumeCode: String(data.get("volumeCode") ?? ""),
          title: String(data.get("title") ?? ""),
          pageTarget: String(data.get("pageTarget") ?? ""),
          videoPolicy: video === "required" ? "required" : "optional",
          studentSolutionPolicy: policy === "assigned" ? "assigned" : "never",
          ...(print
            ? {
                coverMode:
                  cover === "included"
                    ? ("included" as const)
                    : ("separate" as const),
                firstPhysicalPageIndex: String(
                  data.get("firstPhysicalPageIndex") ?? "",
                ),
              }
            : {}),
        });
      }}
    >
      <h2>설정</h2>
      <fieldset className={styles.stack} disabled={locked}>
        <label className={styles.field}>
          <span>제목</span>
          <input name="title" defaultValue={title} />
        </label>
        <label className={styles.field}>
          <span>권 코드</span>
          <input name="volumeCode" defaultValue={volumeCode} />
        </label>
        <label className={styles.field}>
          <span>목표 쪽수</span>
          <input
            name="pageTarget"
            defaultValue={pageTarget}
            inputMode="numeric"
          />
        </label>
        <label className={styles.field}>
          <span>영상</span>
          <select name="videoPolicy" defaultValue={videoPolicy}>
            <option value="optional">선택</option>
            <option value="required">필수</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>학생 글 해설</span>
          <select
            name="studentSolutionPolicy"
            defaultValue={studentSolutionPolicy}
          >
            <option value="never">열지 않음</option>
            <option value="assigned">배정한 QR만</option>
          </select>
        </label>
        {print ? (
          <>
            <div className={styles.field}>
              <label htmlFor="textbook-cover-mode">표지</label>
              <select
                id="textbook-cover-mode"
                name="coverMode"
                defaultValue={print.coverMode}
              >
                <option value="separate">별도</option>
                <option value="included">교재에 포함</option>
              </select>
            </div>
            <label className={styles.field}>
              <span>첫 인쇄 쪽</span>
              <input
                name="firstPhysicalPageIndex"
                defaultValue={String(print.firstPhysicalPageIndex)}
                inputMode="numeric"
              />
            </label>
            <p className={styles.muted}>
              주요 구획은 짝수 왼쪽에서 시작합니다.
            </p>
          </>
        ) : null}
        <button type="submit" className={styles.primary} disabled={busy}>
          설정 저장
        </button>
      </fieldset>
    </form>
  );
}

export function ImportPanel({
  onSubmit,
  busy = false,
  note = null,
  error = null,
  issues = [],
}: {
  onSubmit: (mode: ImportMode, file: File) => void;
  busy?: boolean;
  note?: string | null;
  error?: string | null;
  /** 이 가져오기가 돌려준 항목 — 판본 검수 항목과 다른 것이다 */
  issues?: readonly StudioIssue[];
}) {
  return (
    <section
      className={`${styles.panel} ${styles.importPanel}`}
      aria-label="가져오기"
    >
      <h2>가져오기</h2>
      <form
        className={styles.importForm}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const picker = event.currentTarget.elements.namedItem("file");
          const file =
            picker instanceof HTMLInputElement ? picker.files?.[0] : undefined;
          const mode = data.get("mode") === "copy" ? "copy" : "archive";
          if (!file || file.size === 0) return;
          onSubmit(mode, file);
        }}
      >
        <label className={styles.field}>
          <span>방식</span>
          <select name="mode" defaultValue="archive">
            <option value="archive">보관본</option>
            <option value="copy">새 원고</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>파일</span>
          <input name="file" type="file" />
        </label>
        <button type="submit" className={styles.button} disabled={busy}>
          {busy ? "올리는 중…" : "올리기"}
        </button>
      </form>
      {note ? <p role="status">{note}</p> : null}
      {error ? (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      ) : null}
      {issues.length > 0 ? (
        <ul className={styles.list} aria-label="가져오기 확인 항목">
          {issues.map((issue, index) => (
            <li key={`${issue.path ?? ""}-${issue.message}-${index}`}>
              {issue.severity === "error"
                ? "오류"
                : issue.severity === "warning"
                  ? "경고"
                  : "안내"}
              {issue.path ? ` · ${issue.path}` : ""} · {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.muted}>
        보관본은 읽기 전용입니다. 새 원고는 새 ID를 받습니다. 오류가 있으면 열지
        않습니다. 파일을 고친 뒤 다시 올릴 수 있습니다.
      </p>
    </section>
  );
}
