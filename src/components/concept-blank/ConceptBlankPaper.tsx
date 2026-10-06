import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";

import { A4Page } from "@/components/print/A4Page";

import { KeyHead, KeyNotes, KeyTable } from "./paper/KeyBody";
import {
  numberColumnWidth,
  planSheet,
  sheetHasContent,
  type SheetPlan,
} from "./paper/paginate";
import {
  ContinuationHead,
  SheetCodeLine,
  SheetFoot,
  SheetHead,
} from "./paper/PaperParts";
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
 * - 지면 코드(트랙 cb-code) — `code` 를 주면 모든 장 맨 아래에 «코드 · 쪽/전체쪽 · 학생지|채점표». 쪽은 몫(학생지 · 채점표)마다
 *   형식을 넘어 1 부터 센다(머리의 «p. N» 은 형식 안 번호 그대로). view 와 상관없이 같은 장에는 같은 번호다.
 */
export type ConceptBlankPaperProps = {
  sheets: ConceptBlankSheet[];
  /** 학생지만 · 채점표만 · 둘 다(학생지 뒤에 채점표). */
  view: "student" | "key" | "both";
  /** 지면 코드(`encodeSheetCode` — 고르기 · 은행 지문). 없으면 코드 줄을 안 그린다. */
  code?: string;
};

/** 코드 줄 하나에 들어갈 것 — 그 장의 몫 안 번호는 `start + 장 차례 + 1`. */
type CodeSpot = { code: string; start: number; total: number };

/** 미리보기와 인쇄가 같은 쪽 나누기와 코드 번호를 사용한다. */
export function conceptBlankPages({
  sheets,
  view,
  code,
}: ConceptBlankPaperProps) {
  const plans = sheets.filter(sheetHasContent).map(planSheet);
  /** 몫마다 지면의 첫 장 앞까지 센 장 수 — 학생지 · 채점표 따로. */
  const spots = (pages: (plan: SheetPlan) => number) => {
    const total = plans.reduce((n, plan) => n + pages(plan), 0);
    let start = 0;
    return plans.map((plan): CodeSpot | null => {
      const spot = code ? { code, start, total } : null;
      start += pages(plan);
      return spot;
    });
  };
  const studentSpots = spots((plan) => plan.student.length);
  const keySpots = spots((plan) => plan.key.length);
  return [
    ...(view !== "key"
      ? plans.flatMap((plan, i) =>
          studentPages(plan, i, studentSpots[i] ?? null),
        )
      : []),
    ...(view !== "student"
      ? plans.flatMap((plan, i) => keyPages(plan, i, keySpots[i] ?? null))
      : []),
  ];
}

export default function ConceptBlankPaper(props: ConceptBlankPaperProps) {
  const pages = conceptBlankPages(props);
  if (!pages.length)
    return (
      <p
        className={styles.empty}
        data-concept-blank-paper={props.view}
        role="status"
      >
        담을 문항이 없습니다.
      </p>
    );
  return (
    <div className={styles.paper} data-concept-blank-paper={props.view}>
      {pages}
    </div>
  );
}

function codeLine(
  spot: CodeSpot | null,
  pageIndex: number,
  part: "student" | "key",
) {
  return spot ? (
    <SheetCodeLine
      code={spot.code}
      page={spot.start + pageIndex + 1}
      part={part}
      total={spot.total}
    />
  ) : null;
}

function studentPages(
  plan: SheetPlan,
  sheetIndex: number,
  spot: CodeSpot | null,
) {
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
          <SheetHead
            header={sheet.header}
            goal={
              sheet.form === "term" &&
              sheet.terms.some((entry) => entry.bQuestion)
                ? "물음을 읽고, 답이나 풀이 방법 · 까닭을 쓰세요."
                : sheet.form === "cloze" &&
                    sheet.sentences.some((entry) => entry.clozeQuestion)
                  ? "주어진 상황을 생각하며 빈칸에 알맞은 말이나 수를 쓰세요."
                  : sheet.form === "map" && sheet.questionMode
                    ? "같은 단원의 물음들을 묶었습니다. 가지마다 답을 쓰세요."
                    : undefined
            }
          />
        ) : (
          <ContinuationHead header={sheet.header} page={i + 1} />
        )}
        <StudentBody first={i === 0} page={page} />
        <SheetFoot page={i + 1} tally={i === 0 ? plan.tally : undefined} />
        {codeLine(spot, i, "student")}
      </div>
    </A4Page>
  ));
}

function keyPages(plan: SheetPlan, sheetIndex: number, spot: CodeSpot | null) {
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
        {codeLine(spot, i, "key")}
      </div>
    </A4Page>
  ));
}
