import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";

import { A4Page } from "@/components/print/A4Page";

import { KeyHead, KeyNotes, KeyTable } from "./paper/KeyBody";
import {
  numberColumnWidth,
  planSheet,
  sheetHasContent,
  type SheetPlan,
} from "./paper/paginate";
import { ContinuationHead, SheetFoot, SheetHead } from "./paper/PaperParts";
import { StudentBody } from "./paper/StudentBody";
import styles from "./paper/paper.module.css";

/**
 * 개념 백지 A4 지면(D-150 · 26 §6) — 다섯 형식의 학생지와 교사용 채점표.
 * 겉(이름 · props)은 바꾸지 않는다 — 화면 트랙(cb-app)의 미리보기와 인쇄 페이지가 이 겉으로 부른다.
 * 훅을 쓰지 않는다(서버 인쇄 페이지에서도 그린다).
 *
 * - 얼굴은 확정 시험지(05 §8.5 — 따뜻한 흰 종이 · 금색 · 명조 본문 · 고딕 라벨 · 배점 없음)와 시안 두 벌
 *   (`D:\tmp\concept-blank\` — 저장소 밖). A4 경계는 제품 `A4Page`(인쇄 `@page { size: A4; margin: 0 }` · 장마다 나눔).
 * - 쪽 나누기는 DOM 을 재지 않는 고정 규칙(`paper/paginate.ts` 의 `planSheet` 하나 — 화면 미리보기 · 인쇄 페이지가 같은
 *   함수를 쓴다: 같은 고르기면 같은 장 수 · 같은 문항 번호). 넘치면 다음 장 — 간소 머리 «오늘의수학 · 제목» + p. N.
 * - 장은 아래가 비지 않게 칸이 늘어나 채운다 · 번호 열 · 줄 간격 · 기준선을 맞춘다(`paper/paper.module.css` 머리 주석).
 * - «둘 다»는 학생지를 모두 먼저, 채점표를 그 뒤에 — 인쇄한 묶음에서 학생지만 떼어 복사하기 쉽게.
 * - 화면에서는 줄여 보인다(시안처럼 0.58배). 부르는 쪽이 CSS 변수 `--cb-paper-scale` 로 바꾼다(인쇄에서는 늘 1배).
 */
export type ConceptBlankPaperProps = {
  sheets: ConceptBlankSheet[];
  /** 학생지만 · 채점표만 · 둘 다(학생지 뒤에 채점표). */
  view: "student" | "key" | "both";
};

export default function ConceptBlankPaper({
  sheets,
  view,
}: ConceptBlankPaperProps) {
  const plans = sheets.filter(sheetHasContent).map(planSheet);
  if (plans.length === 0)
    return (
      <p className={styles.empty} data-concept-blank-paper={view} role="status">
        담을 문항이 없습니다.
      </p>
    );
  return (
    <div className={styles.paper} data-concept-blank-paper={view}>
      {view !== "key" ? plans.map((plan, i) => studentPages(plan, i)) : null}
      {view !== "student" ? plans.map((plan, i) => keyPages(plan, i)) : null}
    </div>
  );
}

function studentPages(plan: SheetPlan, sheetIndex: number) {
  const { sheet } = plan;
  return plan.student.map((page, i) => (
    <A4Page
      className={`${styles.page} ${i === 0 ? styles.pageFirst : styles.pageNext}`}
      key={`s-${sheetIndex}-${i}`}
      kind="questions"
      pageNumber={i + 1}
    >
      <div
        className={styles.sheet}
        data-cb-page={i + 1}
        data-cb-part="student"
        data-cb-sheet={sheet.form}
        style={{ ["--cb-num" as string]: `${numberColumnWidth(sheet)}px` }}
      >
        {i === 0 ? (
          <SheetHead header={sheet.header} />
        ) : (
          <ContinuationHead header={sheet.header} page={i + 1} />
        )}
        <StudentBody first={i === 0} page={page} />
        <SheetFoot page={i + 1} tally={i === 0 ? plan.tally : undefined} />
      </div>
    </A4Page>
  ));
}

function keyPages(plan: SheetPlan, sheetIndex: number) {
  const { sheet } = plan;
  return plan.key.map((rows, i) => (
    <A4Page
      className={`${styles.page} ${i === 0 ? styles.pageFirst : styles.pageNext}`}
      key={`k-${sheetIndex}-${i}`}
      kind="answers"
      pageNumber={i + 1}
    >
      <div
        className={styles.sheet}
        data-cb-page={i + 1}
        data-cb-part="key"
        data-cb-sheet={sheet.form}
      >
        {i === 0 ? (
          <KeyHead sheet={sheet} />
        ) : (
          <ContinuationHead
            header={sheet.header}
            page={i + 1}
            suffix="채점표"
          />
        )}
        <div className={styles.keyBody} data-cb-fit="">
          <KeyTable rows={rows} />
        </div>
        {i === plan.key.length - 1 ? <KeyNotes sheet={sheet} /> : null}
      </div>
    </A4Page>
  ));
}
