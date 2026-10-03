import type { ReactNode } from "react";
import {
  CONCEPT_KINDS,
  EXPRESSIONS,
  SIDES,
  SPEAKERS,
  answerPlacement,
  canFinalize,
  moveBlock,
  orderBlankPicks,
  portraitMirrorAllowed,
  publishHeadline,
  sectionStatusLabel,
  videoStatusLabel,
  visibleAnswer,
  type AssignmentRow,
  type Audience,
  type BlankPick,
  type BookSummary,
  type ImportMode,
  type OutlineUnit,
  type PaperPreviewInput,
  type PreviewMode,
  type PublishStatus,
  type SectionDetail,
  type StudioIssue,
  type VideoBinding,
  type ZoomMode,
} from "@/components/textbook/model";
import styles from "@/components/textbook/textbook.module.css";

export function BookList({
  books,
  title,
  volumeCode,
  curriculumVersion,
  pageTarget,
  videoPolicy,
  busy,
  onTitle,
  onVolume,
  onCurriculum,
  onPageTarget,
  onVideoPolicy,
  onCreate,
  onOpen,
  onImport,
}: {
  books: BookSummary[];
  title: string;
  volumeCode: string;
  curriculumVersion: string;
  pageTarget: string;
  videoPolicy: "required" | "optional";
  busy: boolean;
  onTitle: (value: string) => void;
  onVolume: (value: string) => void;
  onCurriculum: (value: string) => void;
  onPageTarget: (value: string) => void;
  onVideoPolicy: (value: "required" | "optional") => void;
  onCreate: () => void;
  onOpen: (book: BookSummary) => void;
  onImport: () => void;
}) {
  return (
    <section className={styles.panel} aria-label="교재 목록">
      <h2>교재</h2>
      {books.length === 0 ? (
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
      <div className={styles.row}>
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
      <p className={styles.muted}>
        기본은 초등 5학년 1학기 1권, 통합, 여백 15mm, 표지 별도, 주요 구획은
        짝수 왼쪽입니다. 새 문항의 풀이선 기본은 7mm입니다. 학생 글 해설은 열지
        않습니다.
      </p>
    </section>
  );
}

export function Outline({
  units,
  collapsed,
  currentId,
  onToggle,
  onSelect,
}: {
  units: OutlineUnit[];
  collapsed: ReadonlySet<string>;
  currentId: string | null;
  onToggle: (unitKey: string) => void;
  onSelect: (sectionId: string) => void;
}) {
  return (
    <nav className={styles.outline} aria-label="단원">
      {units.map((unit) => {
        const open = !collapsed.has(unit.unitKey);
        return (
          <div key={unit.unitKey}>
            <button
              type="button"
              className={styles.unitButton}
              aria-expanded={open}
              onClick={() => onToggle(unit.unitKey)}
            >
              {unit.title}
            </button>
            {open
              ? unit.sections.map((section) => (
                  <button
                    key={section.sectionId}
                    type="button"
                    className={styles.sectionButton}
                    aria-current={
                      section.sectionId === currentId ? "true" : undefined
                    }
                    onClick={() => onSelect(section.sectionId)}
                  >
                    {section.title}
                    <span className={styles.status}>
                      {sectionStatusLabel(section.status)}
                    </span>
                  </button>
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
  audience,
  mode,
  conflictMessage,
  serverText,
  showServer,
  orderMessage,
  diffSummary,
  saving,
  onChange,
  onSave,
  onToggleServer,
  onCopy,
  onCapture,
  onDiff,
  onRecapture,
}: {
  draft: SectionDetail;
  audience: Audience;
  mode: PreviewMode;
  conflictMessage: string | null;
  serverText: string | null;
  showServer: boolean;
  orderMessage: string | null;
  diffSummary: string | null;
  saving: boolean;
  onChange: (next: SectionDetail) => void;
  onSave: () => void;
  onToggleServer: () => void;
  onCopy: () => void;
  onCapture: (testId: string, problemIds: string[]) => void;
  onDiff: (itemId: string) => void;
  onRecapture: (itemId: string) => void;
}) {
  const order = orderBlankPicks(draft.picks);
  const placement = answerPlacement(audience, mode);
  const mirrorsOk = draft.portraits.every((portrait) =>
    portraitMirrorAllowed(portrait.side, portrait.mirror),
  );
  return (
    <div className={styles.stack}>
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
                        phase === "study" ? block.showRepetitionChecks : false,
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
        return block.turns.map((turn, index) => (
          <div key={turn.id} className={styles.stack}>
            <label className={styles.field}>
              <span>화자</span>
              <select
                value={turn.speaker}
                onChange={(event) => {
                  const speaker =
                    SPEAKERS.find((item) => item === event.target.value) ??
                    turn.speaker;
                  const turns = block.turns.map((item) =>
                    item.id === turn.id ? { ...item, speaker } : item,
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
                {SPEAKERS.map((speaker) => (
                  <option key={speaker}>{speaker}</option>
                ))}
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
                    EXPRESSIONS.find((item) => item === event.target.value) ??
                    turn.expression;
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
        ));
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
        <label className={styles.field}>
          <span>교사용 정답</span>
          <input
            value={draft.answer}
            onChange={(event) =>
              onChange({ ...draft, answer: event.target.value })
            }
          />
        </label>
      ) : null}
      <PickEditor
        picks={draft.picks}
        onChange={(picks) => onChange({ ...draft, picks })}
      />
      {orderMessage ? (
        <p className={styles.alert} role="alert">
          {orderMessage}
        </p>
      ) : null}
      <ConceptFields draft={draft} onChange={onChange} />
      <ItemCapture
        items={draft.items}
        diffSummary={diffSummary}
        onCapture={onCapture}
        onDiff={onDiff}
        onRecapture={onRecapture}
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
    </div>
  );
}

function PickEditor({
  picks,
  onChange,
}: {
  picks: BlankPick[];
  onChange: (picks: BlankPick[]) => void;
}) {
  return (
    <fieldset className={styles.stack}>
      <legend>개념 백지</legend>
      <ul className={styles.list}>
        {picks.map((pick, index) => (
          <li key={`${pick.form}-${pick.entryId}-${index}`}>
            {pick.form} · {pick.entryId} ·{" "}
            {pick.reviewStatus === "confirmed"
              ? "확인"
              : pick.reviewStatus === "rejected"
                ? "거절"
                : "후보"}
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

function ConceptFields({
  draft,
  onChange,
}: {
  draft: SectionDetail;
  onChange: (next: SectionDetail) => void;
}) {
  const concept = draft.concept;
  if (!concept)
    return <p className={styles.muted}>연결할 개념 원고가 없습니다.</p>;
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
      ).map((key) => (
        <label key={key} className={styles.field}>
          <span>{conceptLabel(key)}</span>
          <textarea
            value={concept[key]}
            onChange={(event) => patch(key, event.target.value)}
          />
        </label>
      ))}
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

function ItemCapture({
  items,
  diffSummary,
  onCapture,
  onDiff,
  onRecapture,
}: {
  items: SectionDetail["items"];
  diffSummary: string | null;
  onCapture: (testId: string, problemIds: string[]) => void;
  onDiff: (itemId: string) => void;
  onRecapture: (itemId: string) => void;
}) {
  return (
    <fieldset className={styles.stack}>
      <legend>문항</legend>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const testId = String(data.get("testId") ?? "").trim();
          const problemIds = String(data.get("problemIds") ?? "")
            .split(/\s+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
          onCapture(testId, problemIds);
        }}
      >
        <label className={styles.field}>
          <span>시험지 ID</span>
          <input name="testId" />
        </label>
        <label className={styles.field}>
          <span>문제 ID</span>
          <textarea name="problemIds" />
        </label>
        <button type="submit" className={styles.button}>
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
          </li>
        ))}
      </ul>
      {diffSummary ? <p>{diffSummary}</p> : null}
    </fieldset>
  );
}

export function PreviewPane({
  input,
  zoom,
  pageLabel,
  onMode,
  onZoom,
  onPrev,
  onNext,
  showModes,
  renderPaper,
}: {
  input: PaperPreviewInput;
  zoom: ZoomMode;
  pageLabel: string;
  onMode: (mode: PreviewMode) => void;
  onZoom: (zoom: ZoomMode) => void;
  onPrev: () => void;
  onNext: () => void;
  showModes: boolean;
  renderPaper?: (input: PaperPreviewInput) => ReactNode;
}) {
  return (
    <section
      className={`${styles.panel} ${styles.preview}`}
      aria-label="미리보기"
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
        <button type="button" className={styles.button} onClick={onPrev}>
          이전 쪽
        </button>
        <span>{pageLabel}</span>
        <button type="button" className={styles.button} onClick={onNext}>
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
        ) : (
          <article className={styles.page}>
            <p className={styles.muted}>
              공유 지면 렌더러가 연결되면 이 자리에 펼침이 나타납니다. 측정된
              배치가 오기 전에는 인쇄 쪽 번호를 만들지 않습니다.
            </p>
            {input.mode === "draft" ? <p>초안</p> : null}
            <h3>{input.title}</h3>
            {input.blocks.map((block) =>
              block.kind === "dialogue" ? (
                <div key={block.id}>
                  {block.turns.map((turn) => (
                    <p key={turn.id}>
                      {turn.speaker} {turn.text}
                    </p>
                  ))}
                </div>
              ) : null,
            )}
            {input.parityMessage ? <p>{input.parityMessage}</p> : null}
            {input.answerPlacement === "sheet" && input.answer ? (
              <p>교사용 정답 {input.answer}</p>
            ) : null}
          </article>
        )}
      </div>
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
  onPreflight,
  onReserve,
  onStep,
  onFinalize,
}: {
  status: PublishStatus;
  issues: StudioIssue[];
  busy: boolean;
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
          disabled={busy}
          onClick={onPreflight}
        >
          발행 전 확인
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={
            busy || (status !== "idle" && status !== "preflight-failed")
          }
          onClick={onReserve}
        >
          예약
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={busy || (status !== "reserved" && status !== "running")}
          onClick={onStep}
        >
          조판 단계
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={busy || !canFinalize(status)}
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
  onCreate,
  onRevoke,
}: {
  rows: AssignmentRow[];
  onCreate: (kind: "class" | "student", id: string, label: string) => void;
  onRevoke: (assignmentId: string) => void;
}) {
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
      <form
        className={styles.row}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const kind = data.get("kind") === "student" ? "student" : "class";
          onCreate(
            kind,
            String(data.get("targetId") ?? ""),
            String(data.get("label") ?? ""),
          );
        }}
      >
        <label className={styles.field}>
          <span>대상</span>
          <select name="kind" defaultValue="class">
            <option value="class">반</option>
            <option value="student">학생</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>대상 번호</span>
          <input name="targetId" />
        </label>
        <label className={styles.field}>
          <span>표시 이름</span>
          <input name="label" />
        </label>
        <button type="submit" className={styles.button}>
          배정 추가
        </button>
      </form>
    </section>
  );
}

export function VideoPanel({
  rows,
  onUpdate,
}: {
  rows: VideoBinding[];
  onUpdate: (
    bindingId: string,
    status: VideoBinding["status"],
    policy: VideoBinding["policy"],
  ) => void;
}) {
  return (
    <section className={styles.panel} aria-label="영상">
      <h2>영상</h2>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.bindingId}>
            {row.label} · {videoStatusLabel(row.status)}
            {row.policy === "optional" && row.status !== "published"
              ? " · 준비 중"
              : ""}
            <button
              type="button"
              className={styles.button}
              onClick={() => onUpdate(row.bindingId, "published", row.policy)}
            >
              게시
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className={styles.muted}>연결된 영상이 없습니다.</p>
      ) : null}
    </section>
  );
}

export function ImportPanel({
  onSubmit,
}: {
  onSubmit: (mode: ImportMode, file: File) => void;
}) {
  return (
    <section className={styles.panel} aria-label="가져오기">
      <h2>가져오기</h2>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const file = data.get("file");
          const mode = data.get("mode") === "copy" ? "copy" : "archive";
          if (!(file instanceof File) || file.size === 0) return;
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
        <button type="submit" className={styles.button}>
          올리기
        </button>
      </form>
      <p className={styles.muted}>
        보관본은 읽기 전용입니다. 새 원고는 새 ID를 받습니다. 오류가 있으면 열지
        않습니다.
      </p>
    </section>
  );
}
