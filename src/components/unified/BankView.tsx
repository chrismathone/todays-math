"use client";

import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

import WorkspacePageHeader from "./WorkspacePageHeader";
import WorkProgress from "./WorkProgress";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { updateReviewStatus } from "@/lib/problem/problemApi";
import { MathText } from "@/components/math/MathText";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { UnitRangePicker } from "@/components/progress/UnitRangePicker";
import { describeRange } from "@/components/test/rangeSummary";
import {
  BANK_SOURCE_GROUP_LABEL,
  PROBLEM_FILTER_OPTIONS,
  REVIEW_STATUS_LABEL,
  SOURCE_LABEL,
  splitProblemFilterValue,
} from "@/components/problem/labels";
import {
  BANK_SEMESTERS,
  bankSourceCountsSchema,
  type BankSourceCounts,
  type BankSourceGroup,
} from "@/contracts/bankSource.contract";
import { BankSourceField, BankSourcePicker } from "./BankSourcePicker";
import {
  booksText,
  kindsText,
  leavesGrade,
  sourceFieldText,
  type SourcePick,
} from "./bankSourcePick";
import { provenanceBadges } from "@/lib/problem/provenance";
import { solutionForDisplay } from "@/lib/solutionSteps";
import { ProblemTransformPanel } from "@/components/problem/ProblemTransformPanelLazy";
import { ProblemSourceReference } from "@/components/problem/ProblemSourceReference";
import { sourceReferenceLabel } from "@/lib/problem/sourceReferenceLabel";
import UnifiedProblem from "./UnifiedProblem";
import { fractionViewFor } from "./fractionDisplay";
import type {
  BankData,
  BankProblem,
  BankViewProps,
  StudioProblem,
} from "./types";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import styles from "./BankView.module.css";
import BankBasket from "./BankBasket";
import BankRandomPanel, { type BankRandomResult } from "./BankRandomPanel";

/**
 * 문제 목록 격자 — **카드 폭을 지면 한 단으로 박고 «열 수만» 바뀐다.**
 *
 * 원장님 지시 2026-08-19: 「문제 공간은 고정시켜 … 창 크기에 따라서 그냥 3열 4열
 * 이렇게만 바뀌면 되고」. 옛 문제은행(`ProblemBank`)이 쓰는 관용구와 **같은 상수**를
 * 쓴다 — 414px 을 CSS 에 따로 적으면 두 화면이 조용히 갈라진다(`tokens.ts` 머리말).
 *
 * 종전에는 `.problemList` 가 `display:grid` 라고만 하고 열을 한 번도 선언하지 않아
 * 문항 하나가 **1,600px 짜리 한 줄**이 됐다. 그러면 그림은 `mx-auto` 로 그 한가운데
 * 뜨고 보기는 2열로 갈라져 ①과 ② 가 800px 떨어진다(원장님 2026-09-14
 * 「너무 많이 공간 축소를 해버렸는데」).
 *
 * 너무 좁은 창에서는 `min(100%, …)` 가 1단으로 떨어뜨린다 — 가로 스크롤 대신이다.
 */
const PROBLEM_GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
} as const;

type Filters = {
  q: string;
  grade: string;
  /** 학기 — 차시의 `unit.semester`(D-161). `""` 는 전체 학기. */
  semester: string;
  chapter: string;
  difficulty: string;
  unitFrom: string;
  unitTo: string;
  problemFilter: string;
  reviewStatus: string;
  /**
   * 출처 — 고르기 창 맨 위 출처 줄의 갈래(H1 ⑴). 옛 «출처» 선택 칸(`source` 한 값)은 없어졌다 —
   * 서버는 `source` 도 그대로 받지만 이 화면은 갈래만 보낸다.
   */
  sourceGroup: BankSourceGroup | "";
  /** 교과서 책(`source_book.id`) · 자료 종류 — 여럿 고르기. 주소에는 쉼표로 이은 한 값으로 실린다. */
  books: string[];
  materialKinds: string[];
  hasFigure: boolean;
  hasSolution: boolean;
  hasAnswer: boolean;
  page: number;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  grade: "",
  semester: "",
  chapter: "",
  difficulty: "",
  unitFrom: "",
  unitTo: "",
  problemFilter: "",
  reviewStatus: "",
  sourceGroup: "",
  books: [],
  materialKinds: [],
  hasFigure: false,
  hasSolution: false,
  hasAnswer: false,
  page: 1,
};

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

type ChipKey =
  | "q"
  | "grade"
  | "semester"
  | "chapter"
  | "difficulty"
  | "unitFrom"
  | "problemFilter"
  | "reviewStatus"
  | "sourceGroup"
  | "books"
  | "materialKinds"
  | "hasFigure"
  | "hasSolution"
  | "hasAnswer";

const ASSET_FILTERS = [
  { key: "hasFigure", label: "그림" },
  { key: "hasSolution", label: "해설" },
  { key: "hasAnswer", label: "정답" },
] as const;

function queryFor(filters: Filters, random = false) {
  const { problemFilter, ...query } = filters;
  const params = new URLSearchParams();
  Object.entries({
    ...query,
    ...splitProblemFilterValue(problemFilter),
  }).forEach(([key, value]) => {
    // 여럿 고르기는 쉼표로 이은 한 값 — 이웃 필터와 같은 «열쇠 하나 · 값 하나»(계약이 배열로 푼다).
    // 빈 고르기는 아예 안 보낸다(= 전부).
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (value !== "" && value !== false && value !== undefined)
      params.set(key, String(value));
  });
  if (random) {
    params.delete("difficulty");
    params.delete("page");
  }
  return params;
}

/**
 * 출처·그림·형식 배지의 겉모습 — 옛 카드(`ProblemCard`)와 **같은 규격**을 쓴다
 * (원장님 지시 2026-08-27 「동그라미에 **흰색 글씨**에 **검정 테두리**. **배경색만**
 * 라벨에 따라 다르게」). 한 글자(`초`·`변`)는 동그라미가 되고 여러 글자(`SVG`·`?형식`)는
 * 알약으로 늘어나므로 폭을 고정하지 않는다.
 *
 * 면색(`bg-src-*`)은 `provenanceBadges` 가 붙인다 — 색 규칙을 여기 옮겨 적지 않는다.
 */
export const BADGE_CHIP = [
  "inline-flex items-center justify-center",
  "min-w-[1.35rem] h-[1.35rem] px-[0.3rem] rounded-full",
  "border border-ink",
  "text-[10px] font-extrabold leading-none text-white no-underline",
  "print:hidden",
].join(" ");

function Icon({
  name,
}: {
  name:
    | "search"
    | "arrow"
    | "chevron"
    | "reset"
    | "basket"
    | "check"
    | "plus"
    | "filter"
    | "close";
}) {
  const paths = {
    search: "m21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    chevron: "m9 5 7 7-7 7",
    reset: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
    basket: "m3 8 2 12h14l2-12H3Zm5 0 4-6 4 6M9 12v4m6-4v4",
    check: "m5 12 4 4L19 6",
    plus: "M12 5v14M5 12h14",
    filter: "M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6",
    close: "m6 6 12 12M6 18 18 6",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function ProblemRow({
  problem,
  number,
  selected,
  onToggle,
  onOpenDetail,
  busy = false,
  replacing = false,
}: {
  problem: BankProblem;
  number: number;
  selected: boolean;
  onToggle: (problem: StudioProblem) => void;
  /** 상세는 **카드를 펼치지 않고 모달로** 연다 (05 §8.6 확정 2026-09-14, Hi-fi ③). */
  onOpenDetail: (problem: BankProblem) => void;
  busy?: boolean;
  replacing?: boolean;
}) {
  const id = useId();
  const addDisabled =
    busy ||
    (replacing && selected) ||
    (problem.eligible === false && !selected);
  const action =
    replacing && !selected ? "이 문제로 교체" : selected ? "담기 취소" : "담기";
  const ineligibleReason =
    problem.eligible === false
      ? problem.ineligibleReason || "출제할 수 없는 문항입니다."
      : null;

  function toggle() {
    if (!addDisabled) onToggle(problem);
  }

  return (
    <article
      className={`${styles.problemRow} ${selected ? styles.selectedRow : ""}`}
    >
      <div
        className={`${styles.cardHeader} ${problem.sourceReference ? styles.cardHeaderWithReference : ""}`}
      >
        <label className={styles.rowSelect}>
          <input
            type="checkbox"
            checked={selected}
            disabled={addDisabled}
            aria-describedby={
              ineligibleReason ? `${id}-eligibility` : undefined
            }
            onChange={toggle}
            aria-label={`${number}번 문제 ${action}`}
          />
          <span className={styles.rowNumber}>
            문제 {String(number).padStart(2, "0")}
          </span>
        </label>
        {/* 🔴 출처·그림·형식 배지 (원장님 2026-09-14 「원래 문제은행에서는 각종 라벨이
            있었는데 어디갔지?」). 옛 카드(`ProblemCard`)에는 있었고 이 화면에만 없었다 —
            05 §8.6 은 S-08 이 「같은 ProblemCard」를 쓴다고 적어 두었는데 이쪽이 제 머리를
            새로 그리면서 축이 통째로 빠졌다.

            판정은 `provenanceBadges` **하나**가 한다 — 여기서 조건을 다시 쓰지 않는다.
            ⚠️ `questionType` 이 아니라 **`questionTypeRaw`** 를 먹인다. 서버가 앞의 것을
               영문 파생값으로 덮어쓰는데 판정기는 한글과 견주므로, 덮어쓴 값을 주면
               서버는 `[서]` 인데 화면만 `[?형식]` 이 된다.
            ⚠️ 누르는 것이 아니다 — 손가락 커서·hover 금지(D-30). `abbr` 인 이유는 색을
               못 보는 사람이 `title` 로 풀어 읽을 수 있어야 하기 때문이다(05 §5). */}
        <span className={styles.provenance}>
          {provenanceBadges({
            ...problem,
            source: problem.source ?? "",
            questionType: problem.questionTypeRaw,
          }).map((badge) => (
            <abbr
              key={badge.axis}
              title={badge.name}
              data-provenance={badge.kind}
              data-provenance-axis={badge.axis}
              className={`${BADGE_CHIP} ${badge.className}`}
            >
              {badge.text}
            </abbr>
          ))}
        </span>
        <div className={styles.problemMeta}>
          {problem.grade ? (
            <span className={styles.gradeBadge}>{problem.grade}</span>
          ) : null}
          <span>{problem.chapter || "단원 미지정"}</span>
          {/* 옛 카드의 마이크로 라벨 셋(난이도·**유형**·검수) 중 유형만 빠져 있었다. */}
          {problem.problemType ? <span>{problem.problemType}</span> : null}
          {problem.difficulty ? (
            <span className={styles.difficultyBadge}>{problem.difficulty}</span>
          ) : null}
          {problem.problemCode ? (
            <span className={styles.problemCode}>{problem.problemCode}</span>
          ) : null}
          {problem.reviewStatus &&
          problem.reviewStatus in REVIEW_STATUS_LABEL ? (
            <span className={styles.reviewBadge}>
              {
                REVIEW_STATUS_LABEL[
                  problem.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
                ]
              }
            </span>
          ) : null}
        </div>
        <ProblemSourceReference problem={problem} />
      </div>
      <div className={styles.rowMain}>
        {problem.section ? (
          <p className={styles.sectionLabel}>{problem.section}</p>
        ) : null}
        <div className={styles.problemBody}>
          <UnifiedProblem problem={problem} />
        </div>
        {ineligibleReason ? (
          <p id={`${id}-eligibility`} className={styles.ineligibleReason}>
            {ineligibleReason}
          </p>
        ) : null}
        <div className={styles.rowActions}>
          {/* 🔴 정답·풀이·정보를 **한 창에서** 본다 — 카드를 펼치던 두 단추를 하나로
              합쳤다(05 §8.6 확정 2026-09-14). 카드 표면이 아니라 **진짜 단추**로 연다:
              `<article onClick>` 은 D-30 위반이고 `lint:affordance` 가 막는다. */}
          <button
            type="button"
            className={styles.textButton}
            onClick={() => onOpenDetail(problem)}
          >
            문제 상세
            <span className={styles.chevronDown}>
              <Icon name="chevron" />
            </span>
          </button>
          <button
            type="button"
            className={`${styles.addButton} ${selected ? styles.addedButton : ""}`}
            aria-pressed={selected}
            aria-label={`${number}번 문제 ${action}`}
            disabled={addDisabled}
            aria-describedby={
              ineligibleReason ? `${id}-eligibility` : undefined
            }
            onClick={toggle}
          >
            <Icon name={selected ? "check" : "plus"} />
            {selected
              ? "담기 완료"
              : problem.eligible === false
                ? "담기 불가"
                : replacing
                  ? "이 문제로 교체"
                  : "문제 담기"}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * 문항 상세 — **전체 상세 모달, 2열** (05 §8.6 확정 2026-09-14 · Wire Ⓑ + Hi-fi ③).
 *
 * 왼쪽은 문제를 **지면 한 단 폭**(`PROBLEM_CARD_WIDTH`)으로 고정한다. 그 폭이 지면과
 * 같아야 「같은 문제는 같은 뷰」가 지켜진다 — 넓게 늘리면 그림이 한가운데 뜨고 보기가
 * 양 끝으로 갈라진다(2026-09-14 목록에서 겪은 그 자리).
 *
 * ⚠️ 색은 토큰만 쓴다(§2.2.1). 기능색은 **검수 상태에만** — 난이도·유형은 무채색(§2.2).
 */
function DetailModal({
  problem,
  onClose,
  onReviewStatusChange,
  onTransformAdopted,
  canUseAi,
  selected,
  onToggle,
  busy,
  selectionBusy = false,
  replacing = false,
}: {
  problem: BankProblem;
  onClose: () => void;
  onReviewStatusChange: (id: string, next: "approved" | "rejected") => void;
  /**
   * 변형 채택분이 저장되면 알린다 — 목록을 **다시 조회한다**.
   *
   * 🔴 옛 은행처럼 목록 앞에 끼워 넣지 않는다(`ProblemBank` 의 `prepend`). 되돌아오는
   *    것은 `ProblemEntity` 라 `unitId` 는 있어도 **학년·대단원·소단원 «글자»가 없는데**,
   *    이 화면의 행(`BankProblem`)은 그 글자로 서 있다. 끼워 넣으려면 단원명을 지어내야
   *    하고, 그건 이 저장소가 여러 번 밟은 함정이다. 다시 조회하면 서버가 제대로 된
   *    행을 준다.
   */
  onTransformAdopted: () => void;
  canUseAi: boolean;
  /**
   * 담기는 **모달 바닥의 주 행동**이다 (05 §8.6 확정 — 「담기(primary, **맨 앞**)」).
   * 상세에서 모든 것을 처리하는 자리라, 읽고 나서 담으려고 카드로 되돌아가면 안 된다.
   */
  selected: boolean;
  onToggle: (problem: StudioProblem) => void;
  busy: boolean;
  selectionBusy?: boolean;
  replacing?: boolean;
}) {
  // 담을 수 없는 행이라도 **이미 담은 것은 뺄 수 있다** — 카드(`ProblemRow`)와 같은 규칙.
  const addDisabled =
    selectionBusy ||
    (replacing && selected) ||
    (problem.eligible === false && !selected);
  // 정답·풀이는 본문(`UnifiedProblem`)과 같은 문항 단위 결정으로 대분수를 보인다.
  const shownFractions = fractionViewFor(problem);
  const [showTransform, setShowTransform] = useState(false);
  /**
   * 채택 결과 알림 — **없으면 「저장했는데 아무 일도 안 일어난」 것으로 읽힌다.**
   * 변형본은 `pending` 으로 저장되므로, 지금 필터가 「출제 가능」이면 다시 조회해도
   * 목록에 안 나타난다. 그건 거짓이 아니라 사실이고, 그래서 **말로 알린다.**
   */
  const [transformNotice, setTransformNotice] = useState<string | null>(null);
  const referenceLabel = sourceReferenceLabel(problem);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${problem.problemCode || "문항"} 상세`}
      className={`${styles.detailDialog} flex max-h-[86vh] flex-col overflow-hidden border border-divider bg-surface p-0 text-ink`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <header className={styles.cardHeader}>
        <span className={styles.provenance}>
          {provenanceBadges({
            ...problem,
            source: problem.source ?? "",
            questionType: problem.questionTypeRaw,
          }).map((badge) => (
            <abbr
              key={badge.axis}
              title={badge.name}
              data-provenance={badge.kind}
              data-provenance-axis={badge.axis}
              className={`${BADGE_CHIP} ${badge.className}`}
            >
              {badge.text}
            </abbr>
          ))}
        </span>
        <div className={styles.problemMeta}>
          {problem.grade ? (
            <span className={styles.gradeBadge}>{problem.grade}</span>
          ) : null}
          <span>{problem.chapter || "단원 미지정"}</span>
          {problem.problemType ? <span>{problem.problemType}</span> : null}
          {problem.difficulty ? (
            <span className={styles.difficultyBadge}>{problem.difficulty}</span>
          ) : null}
          <span className={styles.problemCode}>
            {problem.problemCode || problem.id}
          </span>
        </div>
        <button
          ref={closeRef}
          type="button"
          className={styles.textButton}
          onClick={onClose}
        >
          닫기
        </button>
      </header>

      {/* 스크롤은 **이 바깥 상자**가 맡는다 — 2열 격자는 그 안에 있고 변형 패널은
            격자 아래에 전폭으로 붙는다. 그래야 바닥 단추가 계속 고정된다
            (원장님 지시 2026-09-14 「문제 제외한 … 버튼은 하단 고정시켜」). */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className={styles.detailColumns}>
          <div
            className={styles.problemBody}
            style={{ width: PROBLEM_CARD_WIDTH, maxWidth: "100%" }}
          >
            <UnifiedProblem problem={problem} />
          </div>
          <div className="min-w-0">
            <dl className={styles.detailMeta}>
              <div>
                <dt>소단원</dt>
                <dd>{problem.section || "미지정"}</dd>
              </div>
              <div>
                <dt>출처</dt>
                <dd>
                  {problem.sourceLabel ||
                    SOURCE_LABEL[problem.source as keyof typeof SOURCE_LABEL] ||
                    "문제은행"}
                </dd>
              </div>
              <div>
                <dt>검수</dt>
                <dd>
                  {REVIEW_STATUS_LABEL[
                    problem.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
                  ] || "미정"}
                </dd>
              </div>
              {referenceLabel ? (
                <div>
                  <dt>원문 출처</dt>
                  <dd className={styles.sourceReference}>{referenceLabel}</dd>
                </div>
              ) : null}
            </dl>
            <div className={styles.answer}>
              <span className={styles.answerLabel}>정답</span>
              <MathText
                text={
                  problem.answer
                    ? shownFractions(problem.answer)
                    : "등록된 정답이 없습니다."
                }
              />
            </div>
            <div className={styles.detail}>
              <h4>풀이</h4>
              {/* 풀이는 `solutionForDisplay` 를 지난다 — 안 거치면 이 화면에서만 해설이
                    한 줄로 붙는다(solutionSteps.ts · solutionWiring.test.ts). 분수 표시를
                    먼저 하고 줄은 그리기 직전에 나눈다. */}
              <MathText
                as="div"
                text={
                  solutionForDisplay(
                    problem.solution ? shownFractions(problem.solution) : null,
                  ) || "등록된 풀이가 없습니다."
                }
              />
            </div>
          </div>
        </div>

        {/* 변형은 **상세 안에서** 한다 (원장님 2026-09-14 「상세 화면에서 모든걸
              처리하는게 어떨지」). 2열 격자 **밖**, 전폭으로 붙인다 — 패널 안에 후보
              목록과 도형 미리보기가 들어와 좁은 단에서는 읽히지 않는다.

              ⚠️ 지연 청크로 연다(`ProblemTransformPanelLazy`) — 옛 카드와 같은 이유로
                 계약(zod)과 `problemApi` 가 첫 화면 청크에 딸려 들어오지 않게 한다. */}
        {canUseAi && showTransform ? (
          <ProblemTransformPanel
            origin={problem}
            onAdopted={(created) => {
              setShowTransform(false);
              setTransformNotice(
                `${created.length}건을 변형해 검수 대기로 저장했습니다. 승인해야 출제에 쓰입니다.`,
              );
              onTransformAdopted();
            }}
            onClose={() => setShowTransform(false)}
          />
        ) : null}
      </div>

      {/* 바닥은 **늘 선다** — 변형은 검수 상태와 무관하기 때문이다. 승인·반려만
            검수 대기일 때 붙는다(이미 승인된 것에 「승인」을 다시 누를 일이 없다 —
            옛 카드와 같은 규칙). D-22: 승격은 사람이 누른다. */}
      <footer className={styles.rowActions} style={{ padding: "12px 20px" }}>
        {/* 🔴 담기가 **맨 앞**이다 (05 §8.6 확정). 카드 안에서는 오른쪽 끝으로 밀리는
              단추(`.addButton` 의 `margin-left:auto`)라 그 밀림만 끈다 — 색·크기·아이콘은
              카드와 **같은 규격**을 쓴다. 두 자리가 달라 보이면 같은 동작으로 안 읽힌다. */}
        <button
          type="button"
          className={`${styles.addButton} ${selected ? styles.addedButton : ""}`}
          style={{ marginLeft: 0 }}
          aria-pressed={selected}
          disabled={addDisabled}
          onClick={() => {
            if (!addDisabled) onToggle(problem);
          }}
        >
          <Icon name={selected ? "check" : "plus"} />
          {selected
            ? "담기 완료"
            : problem.eligible === false
              ? "담기 불가"
              : replacing
                ? "이 문제로 교체"
                : "문제 담기"}
        </button>
        {canUseAi && (
          <button
            type="button"
            className={styles.textButton}
            aria-expanded={showTransform}
            onClick={() => setShowTransform((current) => !current)}
          >
            {showTransform ? "변형 닫기" : "변형"}
          </button>
        )}
        {problem.reviewStatus === "pending" ? (
          <>
            <button
              type="button"
              className={styles.textButton}
              disabled={busy}
              onClick={() => onReviewStatusChange(problem.id, "approved")}
            >
              승인
            </button>
            <button
              type="button"
              className={styles.textButton}
              disabled={busy}
              onClick={() => onReviewStatusChange(problem.id, "rejected")}
            >
              반려
            </button>
          </>
        ) : null}
        {transformNotice ? (
          <p role="status" className="ml-auto text-[12.5px] font-bold text-ink">
            {transformNotice}
          </p>
        ) : null}
      </footer>
    </dialog>
  );
}

function pageNumbers(
  page: number,
  total: number,
): (number | "start-gap" | "end-gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const valid = [...pages]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const result: (number | "start-gap" | "end-gap")[] = [];
  valid.forEach((value, index) => {
    if (index > 0 && value - valid[index - 1] > 1)
      result.push(value <= page ? "start-gap" : "end-gap");
    result.push(value);
  });
  return result;
}

export default function BankView({
  initialData,
  initialFilters,
  selected,
  onToggle,
  onSelectionChange,
  onExport,
  canExport = true,
  canUseAi = true,
}: BankViewProps & { canExport?: boolean; canUseAi?: boolean }) {
  const [search, setSearch] = useState(initialFilters?.q ?? "");
  const [randomOpen, setRandomOpen] = useState(false);
  const [randomBusy, setRandomBusy] = useState(false);
  const [randomResult, setRandomResult] = useState<BankRandomResult | null>(
    null,
  );
  const [randomError, setRandomError] = useState<string | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState("");
  const randomController = useRef<AbortController | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => () => randomController.current?.abort(), []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rangeEditing, setRangeEditing] = useState(false);
  /**
   * «출처 고르기» 창(H1) — 창의 수는 처음 열 때 한 번 받는다(다른 필터와 무관한 수라 필터를 바꿔도 다시 셀 일이
   * 없다). 실패하면 창 안에서 말하고 다시 시도한다.
   */
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceCounts, setSourceCounts] = useState<BankSourceCounts | null>(
    null,
  );
  const [sourceCountsError, setSourceCountsError] = useState<string | null>(
    null,
  );
  const sourceCountsLoading = useRef(false);
  const sourceOpener = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [request, setRequest] = useState<{ filters: Filters; version: number }>(
    {
      filters: {
        ...EMPTY_FILTERS,
        q: initialFilters?.q?.trim() ?? "",
        grade: initialFilters?.grade ?? "",
        page:
          initialFilters?.q?.trim() || initialFilters?.grade
            ? 1
            : initialData.page,
      },
      version: initialFilters?.q?.trim() || initialFilters?.grade ? 1 : 0,
    },
  );
  const [response, setResponse] = useState<{
    data: BankData;
    error?: string;
    version: number;
  }>({
    data: initialData,
    error: initialData.error,
    version: 0,
  });
  const { filters } = request;
  const { data } = response;
  const loading = request.version !== response.version;
  const error = loading ? undefined : response.error;
  const selectedIds = useMemo(
    () => new Set(selected.map((problem) => problem.id)),
    [selected],
  );
  const replaceIndex = selected.findIndex(
    (problem) => problem.id === replaceId,
  );
  const replacing = replaceIndex >= 0;
  const totalPages = Math.max(
    1,
    Math.ceil(data.total / Math.max(1, data.pageSize)),
  );
  const firstRow = (data.page - 1) * data.pageSize + 1;
  const units = data.units ?? initialData.units ?? [];
  const rangeSummary = describeRange(units, filters.unitFrom, filters.unitTo);
  const sourcePick: SourcePick = {
    group: filters.sourceGroup,
    books: filters.books,
    kinds: filters.materialKinds,
  };
  const activeFilters = (
    [
      { key: "q", label: "검색어", value: filters.q },
      { key: "grade", label: "학년", value: filters.grade },
      {
        key: "semester",
        label: "학기",
        value: filters.semester ? `${filters.semester}학기` : "",
      },
      { key: "chapter", label: "단원", value: filters.chapter },
      { key: "difficulty", label: "난이도", value: filters.difficulty },
      {
        key: "unitFrom",
        label: "범위",
        value: rangeSummary?.text || (filters.unitFrom ? "선택한 단원" : ""),
      },
      {
        key: "problemFilter",
        label: "유형",
        value:
          PROBLEM_FILTER_OPTIONS.find(
            (option) => option.value === filters.problemFilter,
          )?.label || "",
      },
      {
        key: "reviewStatus",
        label: "상태",
        value:
          REVIEW_STATUS_LABEL[
            filters.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
          ] || "",
      },
      /*
        출처 칩(H1) — «교과서 …» 하나 · «자료 …» 하나, 각각 × 로 그 차원만 푼다. 책을 고르면 «교과서 …» 칩이
        출처까지 말하므로 «출처 교과서» 칩은 책이 없을 때만 선다(× 하면 출처 차원 전부 — 자료 종류까지 — 를 푼다).
      */
      {
        key: "sourceGroup",
        label: "출처",
        value:
          filters.sourceGroup &&
          !(filters.sourceGroup === "school_textbook" && filters.books.length)
            ? BANK_SOURCE_GROUP_LABEL[filters.sourceGroup]
            : "",
      },
      {
        key: "books",
        label: "교과서",
        value: filters.books.length
          ? booksText(sourceCounts, filters.books)
          : "",
      },
      {
        key: "materialKinds",
        label: "자료",
        value: filters.materialKinds.length
          ? kindsText(filters.materialKinds)
          : "",
      },
      ...ASSET_FILTERS.map(({ key, label }) => ({
        key,
        label: "자료",
        value: filters[key] ? `${label} 있음` : "",
      })),
    ] satisfies { key: ChipKey; label: string; value: string }[]
  ).filter(({ value }) => Boolean(value));
  const availableGrades = data.grades.length ? data.grades : initialData.grades;
  const eligibleOnPage = data.problems.filter(
    (problem) => problem.eligible !== false,
  );
  const selectedOnPage = eligibleOnPage.filter((problem) =>
    selectedIds.has(problem.id),
  ).length;
  const allOnPageSelected =
    eligibleOnPage.length > 0 && selectedOnPage === eligibleOnPage.length;
  const headingId = useId();
  /** 상세 모달에 띄운 문항 (05 §8.6 확정 — 카드를 펼치지 않는다). */
  const [detail, setDetail] = useState<BankProblem | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const reviewInFlight = useRef(false);
  const [reviewReadError, setReviewReadError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const refreshReviewedRow = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/studio/problems/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("최신 문항 조회에 실패했습니다.");
    const json = await response.json();
    const fresh = json?.data;
    if (
      !fresh ||
      fresh.id !== id ||
      typeof fresh.eligible !== "boolean" ||
      !["pending", "approved", "rejected"].includes(fresh.reviewStatus) ||
      (fresh.ineligibleReason !== null &&
        typeof fresh.ineligibleReason !== "string")
    )
      throw new Error("최신 문항 정보를 확인하지 못했습니다.");
    const apply = (row: BankProblem) =>
      row.id === id
        ? {
            ...row,
            reviewStatus: fresh.reviewStatus as BankProblem["reviewStatus"],
            eligible: fresh.eligible as boolean,
            ineligibleReason: fresh.ineligibleReason as string | null,
          }
        : row;
    setResponse((current) => ({
      ...current,
      data: { ...current.data, problems: current.data.problems.map(apply) },
    }));
    setDetail((current) => (current ? apply(current) : current));
    setReviewReadError((current) => (current?.id === id ? null : current));
  }, []);

  /**
   * 같은 조건으로 **다시 조회한다** — 변형 채택처럼 목록 «밖에서» 행이 늘었을 때 쓴다.
   *
   * ⚠️ `updateFilters` 를 쓰면 안 된다 — 그쪽은 쪽을 **1로 되돌린다**(필터가 바뀌었으면
   *    그게 맞다). 보고 있던 쪽이 3인데 저장 한 번에 1쪽으로 튀면 방금 무엇을 했는지를
   *    잃는다. 여기서는 필터를 그대로 두고 판만 올린다.
   */
  const refresh = useCallback(() => {
    setRequest((current) => ({
      filters: current.filters,
      version: current.version + 1,
    }));
  }, []);

  /**
   * 검수 승인·반려 — D-22 「승격은 사람이 누른다」. 옛 문제은행과 **같은 규칙**으로
   * 목록을 맞춘다(`ProblemBank.handleReviewStatusChange`): 바뀐 값을 그 행에 갈아 끼우고,
   * 모달의 내용도 같이 바꾼다. 여기서는 필터 이탈 판정을 하지 않는다 — 그 판정은
   * 서버 질의와 같은 규칙이어야 하는데(`matchesFilters`) 이 화면엔 아직 그 자가 없다.
   * 대신 **다음 조회에서 자연히 빠진다**.
   */
  const handleReviewStatusChange = useCallback(
    async (id: string, next: "approved" | "rejected") => {
      if (reviewInFlight.current) return;
      reviewInFlight.current = true;
      setReviewBusy(true);
      setReviewReadError(null);
      try {
        const { data: updated } = await updateReviewStatus(id, next);
        setResponse((current) => ({
          ...current,
          data: {
            ...current.data,
            problems: current.data.problems.map((row) =>
              row.id === id
                ? {
                    ...row,
                    reviewStatus: updated.reviewStatus,
                    eligible: false,
                    ineligibleReason: "출제 가능 여부를 확인 중입니다.",
                  }
                : row,
            ),
          },
        }));
        setDetail((current) =>
          current && current.id === id
            ? {
                ...current,
                reviewStatus: updated.reviewStatus,
                eligible: false,
                ineligibleReason: "출제 가능 여부를 확인 중입니다.",
              }
            : current,
        );
        try {
          await refreshReviewedRow(id);
        } catch {
          setReviewReadError({
            id,
            message:
              "검수 상태는 저장했습니다. 출제 가능 여부 조회에 실패했습니다.",
          });
        }
      } catch (caught) {
        setReviewReadError({
          id,
          message:
            caught instanceof TypeError || caught instanceof SyntaxError
              ? "검수 변경 결과를 확인하지 못했습니다. 현재 상태를 다시 조회해 주세요."
              : caught instanceof Error
                ? caught.message
                : "검수 상태를 바꾸지 못했습니다.",
        });
      } finally {
        reviewInFlight.current = false;
        setReviewBusy(false);
      }
    },
    [refreshReviewedRow],
  );

  useEffect(() => {
    // Reuse the server page unless dashboard entry filters need a fresh request.
    if (request.version === 0) return;
    const controller = new AbortController();
    // The real bank splits one dropdown into problemType OR format. Do not send
    // the UI value, empty strings, or false booleans to the strict API contract.
    const params = queryFor(request.filters);

    async function loadProblems() {
      try {
        const result = await fetch(
          `${getStudioEndpoints().problems}?${params}`,
          {
            signal: controller.signal,
          },
        );
        const payload: BankData = await result.json();
        if (!result.ok || payload.error)
          throw new Error(
            payload.error || `문제를 불러오지 못했습니다. (${result.status})`,
          );
        if (
          !Array.isArray(payload.problems) ||
          !Array.isArray(payload.grades) ||
          !Array.isArray(payload.chapters) ||
          !Number.isFinite(payload.total) ||
          !Number.isFinite(payload.page) ||
          !(payload.pageSize > 0)
        ) {
          throw new Error(
            "문제 목록을 확인할 수 없습니다. 다시 시도해 주세요.",
          );
        }
        if (!controller.signal.aborted)
          setResponse({ data: payload, version: request.version });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setResponse((previous) => ({
          data: previous.data,
          version: request.version,
          error:
            cause instanceof Error && !(cause instanceof SyntaxError)
              ? cause.message
              : "문제를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        }));
      }
    }

    void loadProblems();
    return () => controller.abort();
  }, [request]);

  function updateFilters(patch: Partial<Filters>) {
    setRequest((current) => ({
      filters: { ...current.filters, ...patch, page: patch.page ?? 1 },
      version: current.version + 1,
    }));
  }

  function resetFilters() {
    setSearch("");
    setRangeEditing(false);
    updateFilters(EMPTY_FILTERS);
  }

  function removeFilter(key: ChipKey) {
    if (key === "q") setSearch("");
    // A unit belongs to its grade; removing the grade also removes that unit.
    if (key === "grade")
      updateFilters({ grade: "", chapter: "", unitFrom: "", unitTo: "" });
    else if (key === "chapter")
      updateFilters({ chapter: "", unitFrom: "", unitTo: "" });
    else if (key === "unitFrom") updateFilters({ unitFrom: "", unitTo: "" });
    // 책 · 자료 종류는 교과서 출처에만 붙는다 — 출처를 풀면 둘도 같이 푼다(서버가 섞인 조건을 400 으로 막는다).
    else if (key === "sourceGroup")
      updateFilters({ sourceGroup: "", books: [], materialKinds: [] });
    else if (key === "books" || key === "materialKinds")
      updateFilters({ [key]: [] });
    else if (
      key === "hasFigure" ||
      key === "hasSolution" ||
      key === "hasAnswer"
    )
      updateFilters({ [key]: false });
    else updateFilters({ [key]: "" });
    resultsHeading.current?.focus({ preventScroll: true });
  }

  /** 창의 수 — 한 번 받으면 다시 열어도 다시 세지 않는다. 받는 중에는 겹쳐 부르지 않는다. */
  const loadSourceCounts = useCallback(async () => {
    if (sourceCountsLoading.current) return;
    sourceCountsLoading.current = true;
    setSourceCountsError(null);
    try {
      const response = await fetch(`${getStudioEndpoints().problems}/sources`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "출처별 문항 수를 불러오지 못했습니다.",
        );
      const parsed = bankSourceCountsSchema.safeParse(payload);
      if (!parsed.success)
        throw new Error(
          "출처별 문항 수를 확인할 수 없습니다. 다시 시도해 주세요.",
        );
      setSourceCounts(parsed.data);
    } catch (cause) {
      setSourceCountsError(
        cause instanceof Error && !(cause instanceof SyntaxError)
          ? cause.message
          : "출처별 문항 수를 불러오지 못했습니다.",
      );
    } finally {
      sourceCountsLoading.current = false;
    }
  }, []);

  function openSourcePicker() {
    setSourceOpen(true);
    if (!sourceCounts) void loadSourceCounts();
  }

  /**
   * [적용](H1 ⑷) — 창 안의 초안을 한 번에 건다. 바뀐 것이 없으면 요청을 안 보낸다.
   * ⑶ 학년 칸과 다른 과목의 책이 끼면 학년을 «전체 학년»으로 돌린다(단원은 학년에 딸려 같이 푼다) —
   * 그대로 두면 «중1 이면서 중2 책»이라 결과가 0 으로 빈다.
   */
  function applySource(next: SourcePick) {
    setSourceOpen(false);
    const textbook = next.group === "school_textbook";
    const patch: Partial<Filters> = {
      sourceGroup: next.group,
      books: textbook ? next.books : [],
      materialKinds: textbook ? next.kinds : [],
    };
    if (
      textbook &&
      sourceCounts &&
      leavesGrade(sourceCounts, filters.grade, next.books)
    )
      Object.assign(patch, { grade: "", chapter: "" });
    const unchanged =
      patch.sourceGroup === filters.sourceGroup &&
      sameList(patch.books!, filters.books) &&
      sameList(patch.materialKinds!, filters.materialKinds) &&
      !("grade" in patch);
    if (!unchanged) updateFilters(patch);
  }

  function goToPage(page: number) {
    updateFilters({ page });
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({ block: "start" });
  }

  function togglePage() {
    if (loading || error || randomBusy || replacing) return;
    const ids = new Set(eligibleOnPage.map((problem) => problem.id));
    changeSelection(
      allOnPageSelected
        ? selected.filter((problem) => !ids.has(problem.id))
        : [
            ...selected,
            ...eligibleOnPage.filter((problem) => !selectedIds.has(problem.id)),
          ],
    );
  }

  function changeSelection(next: StudioProblem[]) {
    const unique = [
      ...new Map(next.map((problem) => [problem.id, problem])).values(),
    ];
    if (onSelectionChange) onSelectionChange(unique);
    else {
      const nextIds = new Set(unique.map((problem) => problem.id));
      const currentIds = new Set(
        selectedRef.current.map((problem) => problem.id),
      );
      selectedRef.current
        .filter((problem) => !nextIds.has(problem.id))
        .forEach((problem) => onToggle(problem));
      unique
        .filter((problem) => !currentIds.has(problem.id))
        .forEach((problem) => onToggle(problem));
    }
  }

  function toggleProblem(problem: StudioProblem) {
    if (randomBusy) return;
    if (replacing) {
      if (problem.eligible === false || selectedIds.has(problem.id)) return;
      const next = [...selected];
      next[replaceIndex] = problem;
      changeSelection(next);
      setReplaceId(null);
      setDetail(null);
      setSelectionNotice(
        `${replaceIndex + 1}번 문제를 교체했습니다. 다른 문제와 순서는 유지됩니다.`,
      );
      return;
    }
    if (problem.eligible === false && !selectedIds.has(problem.id)) return;
    changeSelection(
      selectedIds.has(problem.id)
        ? selected.filter((item) => item.id !== problem.id)
        : [...selected, problem],
    );
  }

  async function addRandom(counts: DifficultyRatio) {
    const total = DIFFICULTY_LADDER.reduce(
      (sum, tier) => sum + counts[tier],
      0,
    );
    if (randomController.current || replacing || total < 1 || total > 100)
      return;
    const controller = new AbortController();
    randomController.current = controller;
    setRandomBusy(true);
    setRandomError(null);
    setRandomResult(null);
    try {
      const response = await fetch(`${getStudioEndpoints().problems}/random`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          filters: queryFor(filters, true).toString(),
          counts,
          excludeIds: selectedRef.current.map((problem) => problem.id),
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "문제를 추가하지 못했습니다. 다시 시도해 주세요.",
        );
      if (
        !Array.isArray(payload.problems) ||
        !DIFFICULTY_LADDER.every(
          (tier) =>
            Number.isInteger(payload.available?.[tier]) &&
            payload.available[tier] >= 0 &&
            Number.isInteger(payload.counts?.[tier]) &&
            payload.counts[tier] >= 0,
        )
      ) {
        throw new Error(
          "랜덤 추가 결과를 확인할 수 없습니다. 다시 시도해 주세요.",
        );
      }
      if (controller.signal.aborted) return;
      const actual = Object.fromEntries(
        DIFFICULTY_LADDER.map((tier) => [tier, 0]),
      ) as DifficultyRatio;
      const seen = new Set(selectedRef.current.map((problem) => problem.id));
      const additions = (payload.problems as BankProblem[]).filter(
        (problem) => {
          if (
            !problem ||
            typeof problem.id !== "string" ||
            typeof problem.content !== "string" ||
            problem.eligible === false ||
            seen.has(problem.id)
          )
            return false;
          const tier = DIFFICULTY_LADDER.find(
            (tier) => tier === problem.difficulty,
          );
          if (!tier || actual[tier] >= counts[tier]) return false;
          seen.add(problem.id);
          actual[tier] += 1;
          return true;
        },
      );
      if (additions.length)
        changeSelection([...selectedRef.current, ...additions]);
      setRandomResult({
        requested: counts,
        actual,
        available: payload.available,
      });
    } catch (cause) {
      if (!controller.signal.aborted)
        setRandomError(
          cause instanceof Error && !(cause instanceof SyntaxError)
            ? cause.message
            : "문제를 추가하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (randomController.current === controller)
        randomController.current = null;
      if (!controller.signal.aborted) setRandomBusy(false);
    }
  }

  return (
    <section className={styles.bank} aria-labelledby={headingId}>
      <WorkspacePageHeader
        title="시험지 만들기"
        titleId={headingId}
        description="출제 범위를 정하고, 필요한 문제를 골라 시험지를 완성하세요."
      />
      {reviewReadError ? (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-control p-4 text-sm"
        >
          <span>{reviewReadError.message}</span>
          <button
            type="button"
            className={styles.outlineButton}
            disabled={reviewBusy}
            onClick={() => {
              void refreshReviewedRow(reviewReadError.id).catch(() =>
                setReviewReadError({
                  id: reviewReadError.id,
                  message:
                    "최신 문항을 불러오지 못했습니다. 연결을 확인하고 다시 조회해 주세요.",
                }),
              );
            }}
          >
            문항 상태 다시 조회
          </button>
        </div>
      ) : null}
      <ol className={styles.buildSteps} aria-label="시험지 만드는 순서">
        <li>
          <span>1</span> 범위 설정
        </li>
        <li aria-current="step">
          <span>2</span> 문제 선택
        </li>
        <li>
          <span>3</span> 시험지 편집
        </li>
      </ol>

      <div className={styles.workspace}>
        <div className={styles.results}>
          <div className={styles.filters}>
            <div
              className={styles.filterBar}
              role="group"
              aria-label="검색과 필터"
            >
              <form
                className={styles.searchForm}
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateFilters({ q: search.trim() });
                }}
              >
                <Icon name="search" />
                <input
                  ref={searchInput}
                  aria-label="문제 검색"
                  aria-describedby={`${headingId}-search-help`}
                  placeholder="내용·코드·정답·해설·학교"
                  maxLength={100}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search ? (
                  <button
                    type="button"
                    className={styles.clearSearch}
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setSearch("");
                      if (filters.q) updateFilters({ q: "" });
                      searchInput.current?.focus();
                    }}
                  >
                    ×
                  </button>
                ) : null}
                <button className={styles.searchButton} type="submit">
                  검색
                </button>
              </form>
              <div className={styles.selectFilters}>
                <div className={styles.filterField}>
                  <label className="sr-only" htmlFor={`${headingId}-grade`}>
                    학년
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id={`${headingId}-grade`}
                      value={filters.grade}
                      onChange={(event) =>
                        updateFilters({
                          grade: event.target.value,
                          chapter: "",
                          unitFrom: "",
                          unitTo: "",
                        })
                      }
                    >
                      <option value="">전체 학년</option>
                      {filters.grade &&
                      !availableGrades.some(
                        ({ grade }) => grade === filters.grade,
                      ) ? (
                        <option value={filters.grade}>{filters.grade}</option>
                      ) : null}
                      {availableGrades.map(({ grade }) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                    <span className={styles.chevronDown}>
                      <Icon name="chevron" />
                    </span>
                  </div>
                </div>
                {/* 학기 — 차시의 `unit.semester`(D-161). 모든 출처에 듣는다. 단원 목록이 학기를 따라
                    좁아지므로 학기를 바꾸면 고른 단원은 푼다. */}
                <div className={styles.filterField}>
                  <label className="sr-only" htmlFor={`${headingId}-semester`}>
                    학기
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id={`${headingId}-semester`}
                      value={filters.semester}
                      onChange={(event) =>
                        updateFilters({
                          semester: event.target.value,
                          chapter: "",
                        })
                      }
                    >
                      <option value="">전체 학기</option>
                      {BANK_SEMESTERS.map((semester) => (
                        <option key={semester} value={semester}>
                          {semester}학기
                        </option>
                      ))}
                    </select>
                    <span className={styles.chevronDown}>
                      <Icon name="chevron" />
                    </span>
                  </div>
                </div>
                <div className={styles.filterField}>
                  <label className="sr-only" htmlFor={`${headingId}-chapter`}>
                    단원
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id={`${headingId}-chapter`}
                      value={filters.chapter}
                      disabled={loading}
                      onChange={(event) =>
                        updateFilters({
                          chapter: event.target.value,
                          unitFrom: "",
                          unitTo: "",
                        })
                      }
                    >
                      <option value="">전체 단원</option>
                      {filters.chapter &&
                      !data.chapters.includes(filters.chapter) ? (
                        <option value={filters.chapter}>
                          {filters.chapter}
                        </option>
                      ) : null}
                      {data.chapters.map((chapter) => (
                        <option key={chapter} value={chapter}>
                          {chapter}
                        </option>
                      ))}
                    </select>
                    <span className={styles.chevronDown}>
                      <Icon name="chevron" />
                    </span>
                  </div>
                </div>
                <div className={`${styles.filterField} ${styles.rangeField}`}>
                  <label className="sr-only" htmlFor={`${headingId}-range`}>
                    범위
                  </label>
                  <button
                    id={`${headingId}-range`}
                    type="button"
                    className={styles.rangeButton}
                    aria-expanded={rangeEditing}
                    aria-controls={`${headingId}-range-panel`}
                    disabled={units.length === 0}
                    title={rangeSummary?.text}
                    onClick={() => setRangeEditing((value) => !value)}
                  >
                    <span>{rangeSummary?.text || "단원 범위 선택"}</span>
                    <span
                      className={
                        rangeEditing ? styles.chevronUp : styles.chevronDown
                      }
                    >
                      <Icon name="chevron" />
                    </span>
                  </button>
                </div>
              </div>
              <div className={styles.filterToolbar}>
                <button
                  type="button"
                  className={styles.filterToggle}
                  aria-expanded={filtersOpen}
                  aria-controls={`${headingId}-filters`}
                  onClick={() => setFiltersOpen((value) => !value)}
                >
                  <Icon name="filter" />
                  {filtersOpen ? "필터 접기" : "상세 필터"}
                  <span
                    className={
                      filtersOpen ? styles.chevronUp : styles.chevronDown
                    }
                  >
                    <Icon name="chevron" />
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.resetButton}
                  disabled={
                    !activeFilters.length && !search && filters.page === 1
                  }
                  onClick={resetFilters}
                >
                  <Icon name="reset" />
                  초기화
                </button>
              </div>
            </div>
            {/* 도움말은 칸의 설명으로만 남는다 — 줄을 차지하지 않는다(읽기로는 그대로) */}
            <p id={`${headingId}-search-help`} className="sr-only">
              본문·문항번호·정답·해설·학교를 함께 검색합니다.
            </p>
            <div
              id={`${headingId}-filters`}
              className={styles.extraFilters}
              hidden={!filtersOpen}
            >
              <div className={styles.filterField}>
                <label className="sr-only" htmlFor={`${headingId}-difficulty`}>
                  난이도
                </label>
                <div className={styles.selectWrap}>
                  <select
                    id={`${headingId}-difficulty`}
                    value={filters.difficulty}
                    onChange={(event) =>
                      updateFilters({ difficulty: event.target.value })
                    }
                  >
                    <option value="">전체 난이도</option>
                    {DIFFICULTY_LADDER.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                  <span className={styles.chevronDown}>
                    <Icon name="chevron" />
                  </span>
                </div>
              </div>
              {(
                [
                  {
                    key: "problemFilter",
                    label: "유형",
                    empty: "전체 유형",
                    options: PROBLEM_FILTER_OPTIONS,
                  },
                  {
                    key: "reviewStatus",
                    label: "상태",
                    empty: "출제 가능",
                    options: Object.entries(REVIEW_STATUS_LABEL).map(
                      ([value, label]) => ({ value, label }),
                    ),
                  },
                ] as const
              ).map(({ key, label, empty, options }) => (
                <div key={key} className={styles.filterField}>
                  <label className="sr-only" htmlFor={`${headingId}-${key}`}>
                    {label}
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id={`${headingId}-${key}`}
                      value={filters[key]}
                      onChange={(event) =>
                        updateFilters({ [key]: event.target.value })
                      }
                    >
                      <option value="">{empty}</option>
                      {options.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <span className={styles.chevronDown}>
                      <Icon name="chevron" />
                    </span>
                  </div>
                </div>
              ))}
              {/* 출처 — 옛 선택 칸 자리에 넓은 칸 하나(H1 ⑴). 고르는 일은 공용 고르기 창에서(규칙 11). */}
              <BankSourceField
                text={sourceFieldText(sourceCounts, sourcePick)}
                opener={sourceOpener}
                onOpen={openSourcePicker}
              />
              <fieldset className={styles.assetFilters}>
                <legend className="sr-only">자료 있는 문제만</legend>
                <div>
                  {ASSET_FILTERS.map(({ key, label }) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(event) =>
                          updateFilters({ [key]: event.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            {sourceOpen ? (
              <BankSourcePicker
                counts={sourceCounts}
                error={sourceCountsError}
                onRetry={() => void loadSourceCounts()}
                value={sourcePick}
                filterGrade={filters.grade}
                returnFocus={sourceOpener}
                onApply={applySource}
                onCancel={() => setSourceOpen(false)}
              />
            ) : null}
            {rangeEditing ? (
              <div
                id={`${headingId}-range-panel`}
                className={styles.rangePanel}
              >
                <div className={styles.rangeHeader}>
                  {/*
                      범위 값을 여기 적지 않는다 — 아래 「적용한 검색 조건」 칩이 똑같은
                      글자를 갖고 있어 한 화면에 두 번 나왔다(원장님 2026-09-14
                      「범위가 3중으로 나옴」). 안내문(「시작 소단원을 고르세요」)도
                      고르개가 제 오른쪽 위에 이미 쓰므로 여기서 되풀이하지 않는다.
                      머리글은 단추만 맡고, 값은 칩 한 곳에서만 읽힌다.
                    */}
                  {filters.unitFrom ? (
                    <button
                      type="button"
                      className={styles.resetButton}
                      onClick={() =>
                        updateFilters({ unitFrom: "", unitTo: "" })
                      }
                    >
                      범위 전체로
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.resetButton}
                    onClick={() => setRangeEditing(false)}
                  >
                    범위 접기
                  </button>
                </div>
                <UnitRangePicker
                  units={units}
                  startUnitId={filters.unitFrom || null}
                  endUnitId={filters.unitTo || null}
                  onChange={(unitFrom, unitTo) =>
                    updateFilters({
                      unitFrom,
                      unitTo,
                      grade: "",
                      chapter: "",
                    })
                  }
                  label="문제은행 단원 범위"
                  columnMaxHeightPx={220}
                />
                {rangeSummary ? (
                  <p className={styles.rangeDescription}>
                    {rangeSummary.label}
                  </p>
                ) : null}
              </div>
            ) : null}
            {activeFilters.length ? (
              <div
                className={styles.filterSummary}
                role="group"
                aria-label="적용한 검색 조건"
              >
                {activeFilters.map(({ key, label, value }) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.filterChip}
                    aria-label={`${label} ${value} 조건 해제${key === "grade" && filters.chapter ? " (단원도 해제)" : ""}${key === "sourceGroup" && filters.materialKinds.length ? " (자료 종류도 해제)" : ""}`}
                    onClick={() => removeFilter(key)}
                  >
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipValue}>{value}</span>
                    <Icon name="close" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.chooseToolbar}>
            <p>문제를 직접 담거나, 난이도에 맞춰 한 번에 추가하세요.</p>
            <button
              type="button"
              className={styles.randomToggle}
              disabled={randomBusy}
              aria-expanded={randomOpen}
              aria-controls={`${headingId}-random`}
              onClick={() => setRandomOpen((value) => !value)}
            >
              <Icon name="plus" /> 난이도별 랜덤 추가{" "}
              <span aria-hidden="true">{randomOpen ? "−" : "+"}</span>
            </button>
          </div>
          <div id={`${headingId}-random`} hidden={!randomOpen}>
            <BankRandomPanel
              busy={randomBusy}
              disabled={loading || replacing || Boolean(error)}
              result={randomResult}
              error={randomError}
              onAdd={addRandom}
            />
          </div>
          {replacing ? (
            <div className={styles.replaceBanner} role="status">
              <div>
                <strong>{replaceIndex + 1}번 문제 교체 중</strong>
                <p>
                  목록에서 아직 담지 않은 문제를 선택하세요. 나머지 문제와
                  순서는 유지됩니다.
                </p>
              </div>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => setReplaceId(null)}
              >
                교체 취소
              </button>
            </div>
          ) : null}
          {selectionNotice ? (
            <p className={styles.selectionNotice} role="status">
              {selectionNotice}
            </p>
          ) : null}

          <div className={styles.resultsHeader}>
            <h2 ref={resultsHeading} tabIndex={-1}>
              문제 목록{" "}
              <span role="status">
                {loading ? (
                  "검색 중…"
                ) : error ? (
                  ""
                ) : (
                  <>
                    <strong>{data.total.toLocaleString("ko-KR")}</strong>문항
                  </>
                )}
              </span>
            </h2>
            <label className={styles.selectPage}>
              <input
                type="checkbox"
                checked={allOnPageSelected && !loading && !error}
                ref={(node) => {
                  if (node)
                    node.indeterminate =
                      !loading &&
                      !error &&
                      selectedOnPage > 0 &&
                      !allOnPageSelected;
                }}
                disabled={
                  loading ||
                  randomBusy ||
                  replacing ||
                  Boolean(error) ||
                  eligibleOnPage.length === 0
                }
                onChange={togglePage}
              />
              이 페이지 전체 담기
            </label>
          </div>
          <div
            className={styles.problemList}
            /*
              로딩·오류·「없어요」는 **칸 하나짜리 안내**라 격자를 안 씌운다 — 씌우면
              그 안내가 카드 폭(414px)으로 잘려 한 귀퉁이에 몰린다. 문항이 실제로
              있을 때만 다단이 된다.
            */
            style={
              !loading && !error && data.problems.length > 0
                ? PROBLEM_GRID_STYLE
                : undefined
            }
            aria-busy={loading}
          >
            {loading ? (
              <WorkProgress
                key={request.version}
                label="문제를 찾고 있어요"
                detail="선택한 조건에 맞는 문제를 불러옵니다."
              />
            ) : error ? (
              <div className={styles.emptyState} role="alert">
                <span className={styles.stateIcon}>!</span>
                <h3>문제를 불러오지 못했어요</h3>
                <p>{error}</p>
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={() => updateFilters({ page: filters.page })}
                >
                  <Icon name="reset" />
                  다시 시도
                </button>
              </div>
            ) : data.problems.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.stateIcon}>
                  <Icon name="search" />
                </span>
                <h3>조건에 맞는 문제가 없어요</h3>
                <p>검색어를 줄이거나 학년과 단원을 바꿔보세요.</p>
                {activeFilters.length ? (
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={resetFilters}
                  >
                    검색 조건 초기화
                  </button>
                ) : null}
              </div>
            ) : (
              data.problems.map((problem, index) => (
                <ProblemRow
                  key={problem.id}
                  problem={problem}
                  number={firstRow + index}
                  selected={selectedIds.has(problem.id)}
                  onToggle={toggleProblem}
                  busy={randomBusy}
                  replacing={replacing}
                  onOpenDetail={setDetail}
                />
              ))
            )}
          </div>
          {detail ? (
            <DetailModal
              problem={detail}
              busy={reviewBusy}
              selected={selectedIds.has(detail.id)}
              onToggle={toggleProblem}
              selectionBusy={randomBusy}
              replacing={replacing}
              onClose={() => setDetail(null)}
              onReviewStatusChange={handleReviewStatusChange}
              onTransformAdopted={refresh}
              canUseAi={canUseAi}
            />
          ) : null}
          {!loading && !error && data.problems.length > 0 ? (
            <div className={styles.listFooter}>
              <p>
                {firstRow.toLocaleString("ko-KR")}–
                {(firstRow + data.problems.length - 1).toLocaleString("ko-KR")}{" "}
                / {data.total.toLocaleString("ko-KR")}문항
              </p>
              <nav className={styles.pagination} aria-label="문제 목록 페이지">
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={data.page <= 1}
                  onClick={() => goToPage(data.page - 1)}
                >
                  <span className={styles.previousIcon}>
                    <Icon name="chevron" />
                  </span>
                </button>
                <span className={styles.mobilePageNumber}>
                  {data.page} / {totalPages} 페이지
                </span>
                {pageNumbers(data.page, totalPages).map((page) =>
                  typeof page === "number" ? (
                    <button
                      type="button"
                      key={page}
                      aria-label={`${page}페이지`}
                      aria-current={data.page === page ? "page" : undefined}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={page} className={styles.pageGap}>
                      …
                    </span>
                  ),
                )}
                <button
                  type="button"
                  aria-label="다음 페이지"
                  disabled={data.page >= totalPages}
                  onClick={() => goToPage(data.page + 1)}
                >
                  <Icon name="chevron" />
                </button>
              </nav>
            </div>
          ) : null}
        </div>

        <BankBasket
          selected={selected}
          busy={randomBusy}
          canExport={canExport}
          onExport={onExport}
          onChange={changeSelection}
          canReorder={Boolean(onSelectionChange)}
          onReplace={(id) => {
            setReplaceId(id);
            setSelectionNotice("");
            resultsHeading.current?.scrollIntoView({ block: "start" });
          }}
        />
      </div>
    </section>
  );
}
