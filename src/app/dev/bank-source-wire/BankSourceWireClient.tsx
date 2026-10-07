"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import type { BankProblem } from "@/components/unified/types";
import { provenanceBadges } from "@/lib/problem/provenance";
import styles from "@/components/unified/BankView.module.css";

import {
  PUBLISHERS,
  WIRE_BOOKS,
  WIRE_GRADES,
  WIRE_KINDS,
  WIRE_PROBLEMS,
  WIRE_SEMESTERS,
  WIRE_TOTAL,
  publisherCount,
  type WireProblem,
} from "./fixtures";

/**
 * 문제은행 **교과서 거르기** Wire 시안 5안 (D-07, 05 §0-3 Wire 단계 · 원장님 2026-10-08 «그렇게 해야함»).
 *
 * 묻는 것: 교과서 문항 6,124개를 **출판사 · 책(저자) · 자료 종류 · 학기**로 거르는 손놀림을 어디에 둘 것인가.
 * 다섯 안이 **같은 카드 · 같은 자료**를 쓴다 — 다른 것은 «거르는 자리»뿐이다.
 *
 * 실제 화면의 CSS(`BankView.module.css`)와 실제 렌더러(`UnifiedProblem`) · 실제 수(`fixtures.ts` — 공유 DB 에서 센 값)로 그린다.
 * 시안이 제 나름의 틀과 가짜 목록으로 서면 그 시안으로 한 판단이 제품과 어긋난다(20번 문서 2026-08-19 · 2026-10-01).
 * 🔴 여기의 단추 · 칸은 **동작하지 않는다**(고르기 창을 여닫는 것만 된다) — 자리와 손놀림을 보는 그림이다.
 */

const GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
} as const;

const BADGE_CHIP =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[11px] font-semibold leading-none text-white";

function Chevron() {
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
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

const toBankProblem = (problem: WireProblem): BankProblem => ({
  id: problem.code,
  content: problem.content,
  answer: "",
  solution: "",
  grade: problem.grade,
  chapter: "",
  section: problem.section,
  difficulty: problem.difficulty,
  problemCode: problem.code,
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  source: "school_textbook",
  familyKey: null,
  originProblemId: null,
  questionTypeRaw: problem.format,
  reviewStatus: "approved",
});

/** 실제 카드 껍데기 — 머리 · 본문이 `BankView` 와 같은 규칙을 쓴다. 출처 메타데이터 한 줄이 더해진 것만 다르다. */
function Card({ problem, number }: { problem: WireProblem; number: number }) {
  const bank = toBankProblem(problem);
  return (
    <article className={styles.problemRow}>
      <div className={styles.cardHeader}>
        <span className={styles.rowNumber}>
          문제 {String(number).padStart(2, "0")}
        </span>
        <span className={styles.provenance}>
          {provenanceBadges({
            ...bank,
            source: "school_textbook",
            questionType: bank.questionTypeRaw,
          }).map((badge) => (
            <abbr
              key={badge.axis}
              title={badge.name}
              className={`${BADGE_CHIP} ${badge.className}`}
            >
              {badge.text}
            </abbr>
          ))}
        </span>
        <div className={styles.problemMeta}>
          <span className={styles.gradeBadge}>{problem.grade}</span>
          <span>{problem.semester}</span>
          <span>
            {problem.publisher} · {problem.kind}
          </span>
          <span className={styles.difficultyBadge}>{problem.difficulty}</span>
          <span className={styles.problemCode}>{problem.code}</span>
        </div>
      </div>
      <div className={styles.rowMain}>
        <p className={styles.sectionLabel}>{problem.section}</p>
        <div className={styles.problemBody}>
          <UnifiedProblem problem={bank} />
        </div>
      </div>
    </article>
  );
}

function Cards({ count = 2 }: { count?: number }) {
  return (
    <div className={styles.problemList} style={GRID_STYLE}>
      {WIRE_PROBLEMS.slice(0, count).map((problem, index) => (
        <Card key={problem.code} problem={problem} number={index + 1} />
      ))}
    </div>
  );
}

function Select({
  label,
  options,
  value,
  disabled,
  wide,
}: {
  label: string;
  options: string[];
  value?: string;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.filterField} ${wide ? styles.rangeField : ""}`}>
      <div className={styles.selectWrap}>
        <select
          aria-label={label}
          defaultValue={value ?? ""}
          disabled={disabled}
        >
          <option value="">{options[0]}</option>
          {options.slice(1).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className={styles.chevronDown}>
          <Chevron />
        </span>
      </div>
    </div>
  );
}

/** 지금 화면의 첫 줄 — 검색 · 학년 · 단원 · 범위 · 상세 필터 */
function TopRow({
  children,
  grade = "중1",
}: {
  children?: ReactNode;
  grade?: string;
}) {
  return (
    <div className={styles.filterBar} role="group" aria-label="검색과 필터">
      <form
        className={styles.searchForm}
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          aria-label="문제 검색"
          placeholder="내용·코드·정답·해설·학교"
          readOnly
        />
        <button className={styles.searchButton} type="submit">
          검색
        </button>
      </form>
      <div className={styles.selectFilters}>
        <Select
          label="학년"
          options={["전체 학년", ...WIRE_GRADES]}
          value={grade}
        />
        {children}
        <Select label="단원" options={["전체 단원"]} />
        <div className={`${styles.filterField} ${styles.rangeField}`}>
          <button type="button" className={styles.rangeButton}>
            <span>단원 범위 선택</span>
            <span className={styles.chevronDown}>
              <Chevron />
            </span>
          </button>
        </div>
      </div>
      <div className={styles.filterToolbar}>
        <button
          type="button"
          className={styles.filterToggle}
          aria-expanded="true"
        >
          필터 접기
        </button>
        <button type="button" className={styles.resetButton}>
          초기화
        </button>
      </div>
    </div>
  );
}

/** 지금 화면의 둘째 줄 — 난이도 · 유형 · 상태 · 출처 · 자료 */
function ExtraRow({
  children,
  source = "교과서",
  withSource = true,
}: {
  children?: ReactNode;
  source?: string;
  withSource?: boolean;
}) {
  return (
    <div className={styles.extraFilters}>
      <Select
        label="난이도"
        options={["전체 난이도", "연산", "기본", "응용"]}
      />
      <Select
        label="유형"
        options={["전체 유형", "계산", "개념", "활용", "서술형"]}
      />
      <Select label="상태" options={["출제 가능", "검수 대기", "반려"]} />
      {withSource ? (
        <Select
          label="출처"
          options={["전체 출처", "기출", "변형", "자작", "교과서", "AI 생성"]}
          value={source}
        />
      ) : null}
      {children}
      <fieldset className={styles.assetFilters}>
        <legend className="sr-only">자료 있는 문제만</legend>
        <div>
          {["그림", "해설", "정답"].map((label) => (
            <label key={label}>
              <input type="checkbox" readOnly /> {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Chips({ items }: { items: Array<[string, string]> }) {
  return (
    <div
      className={styles.filterSummary}
      role="group"
      aria-label="적용한 검색 조건"
    >
      {items.map(([label, value]) => (
        <button key={label + value} type="button" className={styles.filterChip}>
          <span className={styles.chipLabel}>{label}</span>
          <span className={styles.chipValue}>{value}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  );
}

function ResultLine({ text }: { text: string }) {
  return (
    <p
      style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--bank-muted)" }}
    >
      {text}
    </p>
  );
}

function Variant({
  no,
  title,
  good,
  cost,
  children,
}: {
  no: string;
  title: string;
  good: string;
  cost: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 56 }} aria-label={`${no} ${title}`}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>
        {no} {title}
      </h2>
      <p style={{ margin: "0 0 2px", fontSize: 13 }}>좋은 점 — {good}</p>
      <p
        style={{ margin: "0 0 12px", fontSize: 13, color: "var(--bank-muted)" }}
      >
        치르는 값 — {cost}
      </p>
      {children}
    </section>
  );
}

const boxStyle: CSSProperties = {
  border: "1px solid var(--bank-line)",
  borderRadius: 12,
  background: "#fff",
  padding: 16,
};

const countStyle: CSSProperties = {
  color: "var(--bank-muted)",
  fontVariantNumeric: "tabular-nums",
};

/** 책 · 자료 종류를 체크로 고르는 목록 — Ⓑ 의 창과 Ⓓ 의 옆 패널이 같은 알맹이를 쓴다 */
function CheckList({
  title,
  items,
  checked = [],
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  checked?: string[];
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
      <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        {title}
      </legend>
      <div style={{ display: "grid", gap: 4 }}>
        {items.map(({ label, count }) => (
          <label
            key={label}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <input type="checkbox" defaultChecked={checked.includes(label)} />
            <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
            <span style={countStyle}>{count.toLocaleString()}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const booksOf = (grade: string) =>
  WIRE_BOOKS.filter((book) => book.grade === grade);

/** Ⓑ 의 창 안 — 과목 → 책 → 자료 종류 */
function BookPicker() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px minmax(0, 1fr) 220px",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        {WIRE_GRADES.map((grade) => (
          <button
            key={grade}
            type="button"
            className={styles.textButton}
            aria-pressed={grade === "중1"}
            style={{
              justifyContent: "space-between",
              width: "100%",
              ...(grade === "중1"
                ? {
                    borderColor: "var(--bank-primary)",
                    background: "var(--bank-selected)",
                  }
                : null),
            }}
          >
            <span>{grade}</span>
            <span style={countStyle}>{booksOf(grade).length}권</span>
          </button>
        ))}
      </div>
      <CheckList
        title="중1 교과서 7권"
        checked={["천재교육 · 김화경"]}
        items={booksOf("중1").map((book) => ({
          label: `${book.publisher} · ${book.author}`,
          count: book.count,
        }))}
      />
      <CheckList
        title="자료 종류"
        checked={["중단원 평가", "대단원 평가"]}
        items={WIRE_KINDS.map(({ kind, count }) => ({ label: kind, count }))}
      />
    </div>
  );
}

export function BankSourceWireClient() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState("교과서");

  return (
    <main
      className={styles.bank}
      style={{ maxWidth: 1360, margin: "0 auto", padding: "24px 24px 80px" }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
          문제은행 — 교과서 문항 거르기 (Wire 5안)
        </h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
          교과서 문항 {WIRE_TOTAL.toLocaleString()}개(책 {WIRE_BOOKS.length}권 ·
          자료 종류 {WIRE_KINDS.length}개)를 출판사 · 책 · 자료 종류 · 학기로
          거르는 자리를 정한다. 다섯 안의 카드와 자료는 같고, 거르는 자리만
          다르다. 수는 지금 문제은행에서 센 값이다.
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "var(--bank-muted)",
          }}
        >
          지금은 «상세 필터»의 출처 칸에서 «교과서»까지만 고를 수 있다. 칸 ·
          단추는 그림이다(Ⓑ 의 [고르기]와 Ⓒ 의 탭만 눌린다).
        </p>
      </header>

      <Variant
        no="Ⓐ"
        title="선택 칸을 더한다"
        good="지금 화면과 손놀림이 같다. 새로 배울 것이 없다."
        cost="칸이 일곱에서 열로 늘어 좁은 창에서는 필터가 세 줄이 된다. 한 칸에 하나씩만 고른다(두 출판사를 같이 못 본다). 책이 늘면 출판사 칸이 길어진다."
      >
        <div className={styles.filters}>
          <TopRow>
            <Select
              label="학기"
              options={["전체 학기", "1학기", "2학기"]}
              value="1학기"
            />
          </TopRow>
          <ExtraRow>
            <Select
              label="교과서"
              wide
              options={[
                "전체 교과서",
                ...booksOf("중1").map(
                  (book) => `${book.publisher} · ${book.author}`,
                ),
              ]}
              value="천재교육 · 김화경"
            />
            <Select
              label="자료 종류"
              options={["전체 자료", ...WIRE_KINDS.map(({ kind }) => kind)]}
              value="중단원 평가"
            />
          </ExtraRow>
          <Chips
            items={[
              ["학년", "중1"],
              ["학기", "1학기"],
              ["출처", "교과서"],
              ["교과서", "천재교육 · 김화경"],
              ["자료", "중단원 평가"],
            ]}
          />
        </div>
        <ResultLine text="출처가 «교과서»가 아니면 교과서 · 자료 종류 칸은 잠긴다. 학기 칸은 모든 출처에 듣는다(차시의 값)." />
        <Cards />
      </Variant>

      <Variant
        no="Ⓑ"
        title="고르기 창"
        good="화면에는 «지금 고른 것» 한 줄과 단추 하나만 는다. 책 · 자료 종류를 여럿 같이 고른다. 책이 늘어도(문제집 · 다른 교육과정) 화면이 그대로다. 개념 백지 · 교재 제작의 고르기 창과 같은 부품이다."
        cost="고르려면 창을 한 번 연다. 무엇이 걸려 있는지는 그 한 줄을 읽어야 안다."
      >
        <div className={styles.filters}>
          <TopRow>
            <Select
              label="학기"
              options={["전체 학기", "1학기", "2학기"]}
              value="1학기"
            />
          </TopRow>
          <ExtraRow withSource={false}>
            <div
              className={`${styles.filterField} ${styles.rangeField}`}
              style={{ flexGrow: 3, width: 360 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                  padding: "0 4px 0 12px",
                  border: "1px solid var(--bank-control)",
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--bank-muted)" }}>
                  출처
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  교과서 · 천재교육(김화경) · 중단원 평가 외 1
                </span>
                <button
                  ref={pickerButton}
                  type="button"
                  className={styles.textButton}
                  onClick={() => setPickerOpen(true)}
                >
                  고르기
                </button>
              </div>
            </div>
          </ExtraRow>
          <Chips
            items={[
              ["학년", "중1"],
              ["학기", "1학기"],
              ["교과서", "천재교육 · 김화경"],
              ["자료", "중단원 평가 · 대단원 평가"],
            ]}
          />
        </div>
        <ResultLine text="[고르기]를 누르면 아래 창이 뜬다(여기서는 실제로 열린다). 출처(기출 · 엔진 · 교과서)도 이 창의 첫 칸에서 고른다." />
        <div style={{ ...boxStyle, marginBottom: 16 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700 }}>
            창 안 — 과목 · 책 · 자료 종류
          </p>
          <BookPicker />
        </div>
        {pickerOpen ? (
          <PickerDialog
            title="교과서 고르기"
            doneLabel="적용"
            returnFocus={pickerButton}
            onClose={() => setPickerOpen(false)}
          >
            <BookPicker />
          </PickerDialog>
        ) : null}
        <Cards />
      </Variant>

      <Variant
        no="Ⓒ"
        title="출처 탭"
        good="출처마다 메타데이터가 다르다는 것을 화면이 그대로 말한다 — 교과서 탭에는 출판사 · 자료 종류, 기출 탭에는 학교 · 연도(뒤에). «출처» 선택 칸이 없어지고 탭마다 문항 수가 보인다."
        cost="탭 다섯이 목록 위에 한 줄을 차지한다. 출처를 섞어 보려면 «전체» 탭으로 가야 하고 거기서는 출판사로 못 거른다."
      >
        <div
          role="tablist"
          aria-label="출처"
          style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}
        >
          {(
            [
              ["전체", 107015],
              ["엔진", 100794],
              ["교과서", WIRE_TOTAL],
              ["기출", 82],
              ["그 밖", 15],
            ] as const
          ).map(([label, count]) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tab === label}
              className={styles.textButton}
              style={
                tab === label
                  ? {
                      borderColor: "var(--bank-primary)",
                      background: "var(--bank-selected)",
                      fontWeight: 700,
                    }
                  : undefined
              }
              onClick={() => setTab(label)}
            >
              {label} <span style={countStyle}>{count.toLocaleString()}</span>
            </button>
          ))}
        </div>
        <div className={styles.filters}>
          <TopRow>
            <Select
              label="학기"
              options={["전체 학기", "1학기", "2학기"]}
              value="1학기"
            />
          </TopRow>
          <ExtraRow withSource={false}>
            {tab === "교과서" ? (
              <>
                <Select
                  label="교과서"
                  wide
                  options={[
                    "전체 교과서",
                    ...booksOf("중1").map(
                      (book) => `${book.publisher} · ${book.author}`,
                    ),
                  ]}
                  value="천재교육 · 김화경"
                />
                <Select
                  label="자료 종류"
                  options={["전체 자료", ...WIRE_KINDS.map(({ kind }) => kind)]}
                  value="중단원 평가"
                />
              </>
            ) : null}
          </ExtraRow>
          <Chips
            items={[
              ["학년", "중1"],
              ["학기", "1학기"],
              ...(tab === "교과서"
                ? ([
                    ["교과서", "천재교육 · 김화경"],
                    ["자료", "중단원 평가"],
                  ] as Array<[string, string]>)
                : []),
            ]}
          />
        </div>
        <ResultLine text="다른 탭을 누르면 교과서 칸 둘이 사라진다(눌러 볼 수 있다)." />
        <Cards />
      </Variant>

      <Variant
        no="Ⓓ"
        title="옆 패널 — 수와 함께"
        good="고르기 전에 무엇이 얼마나 있는지 보인다(천재교육 2,999 · 대단원 평가 1,380). 여럿을 같이 고르고, 고르는 대로 수가 줄어드는 것을 본다."
        cost="패널(240px)만큼 카드 자리가 줄어 넓은 창에서도 열이 하나 빠진다. 항목마다 수를 세는 조회가 더 든다. 지금 화면에 없는 꼴이다."
      >
        <div className={styles.filters}>
          <TopRow />
          <ExtraRow />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <aside style={boxStyle} aria-label="교과서 조건">
            <CheckList
              title="학기"
              checked={["1학기"]}
              items={WIRE_SEMESTERS.map(({ label, count }) => ({
                label,
                count,
              }))}
            />
            <CheckList
              title="출판사"
              checked={["천재교육"]}
              items={PUBLISHERS.map((publisher) => ({
                label: publisher,
                count: publisherCount(publisher),
              }))}
            />
            <CheckList
              title="자료 종류"
              checked={["중단원 평가"]}
              items={WIRE_KINDS.map(({ kind, count }) => ({
                label: kind,
                count,
              }))}
            />
          </aside>
          <div>
            <ResultLine text="패널은 출처가 «교과서»일 때만 나온다. 접을 수 있다." />
            <Cards />
          </div>
        </div>
      </Variant>

      <Variant
        no="Ⓔ"
        title="책장부터"
        good="«우리 학교 교과서»로 들어가는 길이 가장 짧다 — 책을 고르면 그 책의 문항만 단원 차례로 나온다. 책마다 문항 수 · 자료 수가 한눈에 보인다."
        cost="출처를 «교과서»로 고르면 문항 대신 책 목록이 먼저 나온다(한 걸음 더). 여러 책을 섞어 보려면 책장으로 돌아가야 한다. 지금 화면에 없는 꼴이다."
      >
        <div className={styles.filters}>
          <TopRow>
            <Select
              label="학기"
              options={["전체 학기", "1학기", "2학기"]}
              value="1학기"
            />
          </TopRow>
          <ExtraRow />
        </div>
        <div style={{ ...boxStyle, marginBottom: 16 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700 }}>
            중1 교과서 {booksOf("중1").length}권
          </p>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "var(--bank-muted)" }}>
                <th style={{ padding: "6px 8px", fontWeight: 500 }}>출판사</th>
                <th style={{ padding: "6px 8px", fontWeight: 500 }}>저자</th>
                <th
                  style={{
                    padding: "6px 8px",
                    fontWeight: 500,
                    textAlign: "right",
                  }}
                >
                  문항
                </th>
                <th
                  style={{
                    padding: "6px 8px",
                    fontWeight: 500,
                    textAlign: "right",
                  }}
                >
                  자료
                </th>
                <th style={{ padding: "6px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {booksOf("중1").map((book) => (
                <tr
                  key={book.publisher + book.author}
                  style={{ borderTop: "1px solid var(--bank-line)" }}
                >
                  <td style={{ padding: "8px" }}>{book.publisher}</td>
                  <td style={{ padding: "8px" }}>{book.author}</td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      ...countStyle,
                    }}
                  >
                    {book.count.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      ...countStyle,
                    }}
                  >
                    {book.materials}편
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    <button type="button" className={styles.textButton}>
                      문항 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ResultLine text="«문항 보기»를 누른 뒤 — 천재교육 · 김화경 · 중1 ▸ 자료 종류 [중단원 평가 ▾] · [책장으로]" />
        <Cards />
      </Variant>
    </main>
  );
}
