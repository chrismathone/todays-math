/**
 * 오늘의 영어 — 학생용·교사용 A4 지면 (D-148 · 25 §5 · 브리프 english-print §1).
 *
 * **순수 컴포넌트**다 — 상태·효과 없이 세트(`EnglishSet`)와 쪽 나눔(`pages`)을 받아 `A4Page` 안에
 * **1단**으로 그린다. 수학 2단 폭(`PAPER_COLUMN_WIDTH`)·`.paperParity`·장당 2문항(D-28)은 쓰지 않는다.
 * 쪽 나눔은 `useEnglishPages` 가 숨은 틀에서 이 컴포넌트를 그대로 그려 재고(`data-measure-idx`),
 * `pages` 가 없으면 한 쪽에 전부 올린다(재기 전 · 시험).
 *
 * 배점은 **없다**(원장님 ⑻ · D-28 결) — 어디에도 점수 글자를 찍지 않는다.
 * 학생용은 서술형·원문 복원에 답란(50px 밑줄), 교사용은 그 자리에 정답·해설·근거 상자.
 *
 * 묶음(D-151 · 25 §12.11 3자 합의): 학생용은 `bundle` 을 받으면 **그 묶음의 문항**(독해 묶음이면 원 지문도)만 싣고,
 * 머리의 시험 줄 아래에 «문제 묶음 1 · 3~4번»을 찍는다 — 학생 종이에 운영 문장은 없다. 문항 번호는 세트 번호 그대로.
 * 🔴 교사용은 학생용 묶음과 관계없이 **모든 문항**을 싣고, 첫 쪽 머리에 안내 줄(`teacherNotes` — 배부 순서 · 답이 보이는 문항)을 둔다.
 * 밑줄 문항(어법 · 어휘)의 `<u>…</u>` 표기는 밑줄로 그린다(`underline.ts` — 글을 HTML 로 넣지 않는다 · 짝이 깨졌으면 글자 그대로).
 */
import { A4Page } from "@/components/print/A4Page";
import {
  ENGLISH_OPEN_TYPES,
  type EnglishExam,
  type EnglishQuestion,
  type EnglishSet,
} from "@/contracts/english.contract";
import { englishBundleLabel } from "@/lib/english/bundle";
import {
  ENGLISH_CHOICE_MARKS,
  englishOptionLayout,
} from "@/lib/english/options";

import EnglishPromptText from "../EnglishPromptText";
import styles from "./EnglishPrint.module.css";
import {
  ENGLISH_BLOCK_GAP,
  ENGLISH_PARAGRAPH_GAP,
  englishPaperBlocks,
  type EnglishPaperBlock,
  type EnglishPaperSelection,
} from "./englishPaperLayout";

export type EnglishPaperView = "student" | "teacher";

export const ENGLISH_VIEW_LABEL: Record<EnglishPaperView, string> = {
  student: "학생용",
  teacher: "교사용 · 정답 및 해설",
};

/** 학생용 묶음 — `no` 가 `null` 이면 묶음이 하나뿐인 세트다(가른 것이 없어 머리에 묶음 줄을 찍지 않는다) */
export interface EnglishPaperBundle extends EnglishPaperSelection {
  no: number | null;
}

/** 교사용 머리의 안내 줄 — «배부 순서 — 묶음 1(3~4번) → …» */
export interface EnglishTeacherNote {
  label: string;
  text: string;
}

/** 이 지면에 실을 것 — 교사용은 늘 세트 전부(`undefined`) */
export function englishPaperSelection(
  view: EnglishPaperView,
  bundle: EnglishPaperBundle | undefined,
): EnglishPaperSelection | undefined {
  return view === "student" ? bundle : undefined;
}

export interface EnglishPaperProps {
  set: EnglishSet;
  exam: Pick<EnglishExam, "school" | "grade" | "title">;
  view: EnglishPaperView;
  academyName: string;
  /** 학생용 묶음 — 안 주면 세트 전부. 교사용은 받아도 쓰지 않는다 */
  bundle?: EnglishPaperBundle;
  /** 교사용 첫 쪽 머리의 안내 줄 — 학생용에는 찍지 않는다 */
  teacherNotes?: readonly EnglishTeacherNote[];
  /** Display numbers in a composed paper, while source indices remain unchanged. */
  questionNumbers?: readonly number[];
  /**
   * 쪽 나눔 — 쪽마다 블록 번호(`englishPaperBlocks` 순). 없으면 **한 쪽에 전부**.
   * 빈 배열 `[]` 인 쪽은 머리·꼬리만 그린다(측정 틀이 본문 높이를 잴 때 쓴다).
   */
  pages?: readonly (readonly number[])[];
}

/** 쪽에 놓인 블록 — 블록 번호(`englishPaperBlocks` 순)와 그 내용 */
type PassagePlaced = {
  index: number;
  block: Extract<EnglishPaperBlock, { kind: "passage" }>;
};
type QuestionPlaced = {
  index: number;
  block: Extract<EnglishPaperBlock, { kind: "question" }>;
};
type Placed = PassagePlaced | QuestionPlaced;
type Group =
  | { kind: "passage"; items: PassagePlaced[] }
  | { kind: "question"; item: QuestionPlaced };

function place(index: number, block: EnglishPaperBlock): Placed {
  return block.kind === "passage" ? { index, block } : { index, block };
}

/** 한 쪽의 블록을 «이어진 지문 문단 묶음»과 «문항 하나»로 나눈다 — 지문 상자는 묶음마다 하나 */
function groupBlocks(placed: Placed[]): Group[] {
  const groups: Group[] = [];
  for (const item of placed) {
    if (item.block.kind === "passage") {
      const passageItem: PassagePlaced = {
        index: item.index,
        block: item.block,
      };
      const last = groups[groups.length - 1];
      if (last?.kind === "passage") last.items.push(passageItem);
      else groups.push({ kind: "passage", items: [passageItem] });
    } else {
      groups.push({
        kind: "question",
        item: { index: item.index, block: item.block },
      });
    }
  }
  return groups;
}

function answerMark(question: EnglishQuestion): string {
  if (ENGLISH_OPEN_TYPES.includes(question.type)) return question.answer;
  const number = Number(question.answer);
  return ENGLISH_CHOICE_MARKS[number - 1] ?? question.answer;
}

function PassageBox({
  items,
  continued,
}: {
  items: PassagePlaced[];
  continued: boolean;
}) {
  return (
    <section
      aria-label={continued ? "지문 (이어짐)" : "지문"}
      className={styles.passageBox}
      data-english-passage={continued ? "continued" : "first"}
    >
      <div className={styles.passageLabel}>
        {continued ? "지문 (이어짐)" : "지문"}
      </div>
      {items.map(({ index, block }, order) => (
        <p
          className={styles.passageText}
          data-measure-idx={index}
          key={index}
          lang="en"
          style={order === 0 ? undefined : { marginTop: ENGLISH_PARAGRAPH_GAP }}
        >
          {block.text}
        </p>
      ))}
    </section>
  );
}

function QuestionBlock({
  index,
  displayNumber,
  question,
  view,
}: {
  index: number;
  displayNumber?: number;
  question: EnglishQuestion;
  view: EnglishPaperView;
}) {
  const number = displayNumber ?? index + 1;
  const open = ENGLISH_OPEN_TYPES.includes(question.type);
  // 보기 줄 — 편집 화면과 같은 규칙(번호뿐인 보기는 발문 속 번호가 곧 보기 · 겹친 번호를 찍지 않는다)
  const options = englishOptionLayout(question);
  return (
    <article
      className={styles.question}
      data-english-question={number}
      data-english-type={question.type}
    >
      <div className={styles.prompt}>
        <span className={styles.number}>{number}.</span>
        <span className={styles.promptText}>
          <EnglishPromptText
            question={question}
            underlineClassName={styles.underline}
          />
        </span>
      </div>
      {options.lines.length > 0 && !options.omitted ? (
        <ol
          aria-label={`${number}번 보기`}
          className={styles.choices}
          lang="en"
        >
          {options.lines.map((line, choice) => (
            <li key={choice}>
              <span>{line.mark}</span>
              <span className={styles.choiceText}>{line.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {open && view === "student" ? (
        <div
          aria-hidden="true"
          className={styles.answerBlank}
          data-english-answer-blank={number}
        />
      ) : null}
      {view === "teacher" ? (
        <section
          aria-label={`${number}번 정답 및 해설`}
          className={styles.teacherBox}
          data-english-teacher-box={number}
        >
          <div className={styles.teacherRow}>
            <span className={styles.teacherLabel}>정답</span>
            <span className={styles.teacherText}>{answerMark(question)}</span>
          </div>
          {question.explanation ? (
            <div className={styles.teacherRow}>
              <span className={styles.teacherLabel}>해설</span>
              <span className={styles.teacherText}>{question.explanation}</span>
            </div>
          ) : null}
          {question.evidence ? (
            <div className={styles.teacherRow}>
              <span className={styles.teacherLabel}>근거</span>
              <span className={styles.teacherText} lang="en">
                {question.evidence}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

export function EnglishPaper({
  set,
  exam,
  view,
  academyName,
  bundle,
  teacherNotes,
  questionNumbers,
  pages,
}: EnglishPaperProps) {
  const selection = englishPaperSelection(view, bundle);
  const blocks = englishPaperBlocks(set, selection);
  // 학생 종이의 묶음 이름 — 화면의 묶음 번호와 같다. 묶음이 하나뿐이면 없다
  const bundleNo = view === "student" ? (bundle?.no ?? null) : null;
  const bundleLabel =
    bundle && bundleNo !== null
      ? englishBundleLabel({
          no: bundleNo,
          questions: bundle.questions.map(
            (i) => (questionNumbers?.[i] ?? i + 1) - 1,
          ),
        })
      : null;
  const layout: readonly (readonly number[])[] = pages ?? [
    blocks.map((_, index) => index),
  ];
  const total = layout.length;
  const viewLabel = ENGLISH_VIEW_LABEL[view];
  // 지문 문단이 처음 놓인 쪽 — 그보다 뒤 쪽의 지문 상자는 «이어짐»이다
  const firstPassagePage = layout.findIndex((indices) =>
    indices.some((index) => blocks[index]?.kind === "passage"),
  );

  return (
    <>
      {layout.map((indices, pageIndex) => {
        const page = pageIndex + 1;
        const placed = indices.flatMap((index) => {
          const block = blocks[index];
          return block ? [place(index, block)] : [];
        });
        const groups = groupBlocks(placed);
        const continuedHere =
          firstPassagePage !== -1 && pageIndex > firstPassagePage;

        return (
          <A4Page
            className={[
              styles.paper,
              page === 1 ? styles.paperFirst : styles.paperContinuation,
            ].join(" ")}
            key={page}
            kind={view === "teacher" ? "answers" : "questions"}
            pageNumber={page}
          >
            {page === 1 ? (
              <header className={styles.head}>
                <div className={styles.headRow}>
                  <span className={styles.brand}>
                    오늘 영어 · {academyName}
                  </span>
                  <span className={styles.viewTag}>
                    {viewLabel} · {set.status}
                  </span>
                </div>
                <h1 className={styles.title}>{set.title}</h1>
                <div className={styles.examLine}>
                  {exam.school} {exam.grade} · {exam.title}
                </div>
                {bundleLabel ? (
                  <div className={styles.bundleLine}>{bundleLabel}</div>
                ) : null}
                <div className={styles.nameLine}>
                  이름 ________________ · 날짜 ____ . ____ . ____
                </div>
                {view === "teacher" && teacherNotes?.length ? (
                  <dl className={styles.teacherNotes}>
                    {teacherNotes.map((note) => (
                      <div className={styles.teacherNote} key={note.label}>
                        <dt>{note.label}</dt>
                        <dd>{note.text}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </header>
            ) : (
              <header className={styles.slimHead}>
                <span>오늘 영어 · {set.title}</span>
                <span>
                  {bundleNo !== null ? `문제 묶음 ${bundleNo}` : viewLabel} · p.{" "}
                  {page}
                </span>
              </header>
            )}

            <div
              className={styles.body}
              data-english-body={page}
              style={{ gap: ENGLISH_BLOCK_GAP }}
            >
              {groups.map((group, order) =>
                group.kind === "passage" ? (
                  <PassageBox
                    continued={continuedHere || order > 0}
                    items={group.items}
                    key={`passage-${group.items[0]!.index}`}
                  />
                ) : (
                  <div
                    data-measure-idx={group.item.index}
                    key={`question-${group.item.block.index}`}
                  >
                    <QuestionBlock
                      index={group.item.block.index}
                      displayNumber={questionNumbers?.[group.item.block.index]}
                      question={set.questions[group.item.block.index]!}
                      view={view}
                    />
                  </div>
                ),
              )}
            </div>

            <footer className={styles.footer}>
              <span>
                {academyName} · {exam.school} {exam.grade}
              </span>
              <span>
                p. {page} / {total}
              </span>
            </footer>
          </A4Page>
        );
      })}
    </>
  );
}
