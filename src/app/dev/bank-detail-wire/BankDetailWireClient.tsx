"use client";

import { useState, type ReactNode } from "react";

import { MathText } from "@/components/math/MathText";
import { REVIEW_STATUS_LABEL, SOURCE_LABEL } from "@/components/problem/labels";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import type { BankProblem } from "@/components/unified/types";
import { solutionForDisplay } from "@/lib/solutionSteps";
import styles from "@/components/unified/BankView.module.css";

import { WIRE_PROBLEMS } from "./fixtures";

/**
 * 문제은행 **상세 처리** Wire 시안 5안 (D-07, 05 §0-3 Wire 단계).
 *
 * 실제 카드 CSS(`BankView.module.css`)와 실제 렌더러(`UnifiedProblem` →
 * `ProblemContent`)로 그린다. 「같은 문제는 같은 뷰」가 최우선 규칙이라, 시안이
 * 제 나름의 마크업으로 문제를 그리면 그 시안으로 한 판단이 지면과 어긋난다.
 */

/** `BankView` 의 Icon 은 그 파일 안 지역 함수라 못 가져온다 — path 값만 옮겼다. */
function Icon({ name }: { name: "chevron" | "check" | "plus" | "close" }) {
  const paths = {
    chevron: "m9 5 7 7-7 7",
    check: "m5 12 4 4L19 6",
    plus: "M12 5v14M5 12h14",
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

const GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
} as const;

/** 다섯 안이 **똑같이** 담는 알맹이 — 다른 것은 «어디에 담기는가» 뿐이다. */
function DetailBody({ problem }: { problem: BankProblem }) {
  return (
    <>
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
          <dt>문제 번호</dt>
          <dd>{problem.problemCode || problem.id}</dd>
        </div>
        <div>
          <dt>검수</dt>
          <dd>
            {REVIEW_STATUS_LABEL[
              problem.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
            ] || "미정"}
          </dd>
        </div>
      </dl>
      <div className={styles.answer}>
        <span className={styles.answerLabel}>정답</span>
        <MathText text={problem.answer || "등록된 정답이 없습니다."} />
      </div>
      <h4 style={{ margin: "16px 0 4px", fontSize: 13 }}>풀이</h4>
      <MathText
        as="div"
        text={solutionForDisplay(problem.solution) || "등록된 풀이가 없습니다."}
      />
    </>
  );
}

/**
 * 동작 넷. 옛 문제은행(`ProblemCard`)이 가진 것을 그대로 옮겼다 —
 * 지금 통합 화면에는 **변형과 승인/반려가 통째로 없다.**
 * 자리 규칙도 그대로다: 담기가 맨 앞, 검수는 왼쪽(판단) · 변형은 오른쪽(작업).
 */
function Actions({
  problem,
  onOpen,
  openLabel,
}: {
  problem: BankProblem;
  onOpen?: () => void;
  openLabel?: string;
}) {
  const [picked, setPicked] = useState(false);
  return (
    <div className={styles.rowActions}>
      <button
        type="button"
        className={`${styles.addButton} ${picked ? styles.addedButton : ""}`}
        aria-pressed={picked}
        style={{ marginLeft: 0 }}
        onClick={() => setPicked((value) => !value)}
      >
        <Icon name={picked ? "check" : "plus"} />
        {picked ? "담기 완료" : "문제 담기"}
      </button>
      {onOpen ? (
        <button type="button" className={styles.textButton} onClick={onOpen}>
          {openLabel ?? "문제 상세"}
          <span className={styles.chevronDown}>
            <Icon name="chevron" />
          </span>
        </button>
      ) : null}
      <button type="button" className={styles.textButton}>
        변형
      </button>
      {problem.reviewStatus === "pending" ? (
        <>
          <button type="button" className={styles.textButton}>
            승인
          </button>
          <button type="button" className={styles.textButton}>
            반려
          </button>
        </>
      ) : null}
    </div>
  );
}

/** 실제 카드 껍데기 — 머리·본문·바닥이 `BankView` 와 같은 규칙을 쓴다. */
function Card({
  problem,
  number,
  children,
  pinBottom = true,
}: {
  problem: BankProblem;
  number: number;
  children?: ReactNode;
  pinBottom?: boolean;
}) {
  return (
    <article
      className={styles.problemRow}
      style={
        pinBottom
          ? { display: "flex", flexDirection: "column", position: "relative" }
          : { position: "relative" }
      }
    >
      <div className={styles.cardHeader}>
        <span className={styles.rowNumber}>
          문제 {String(number).padStart(2, "0")}
        </span>
        <div className={styles.problemMeta}>
          <span className={styles.gradeBadge}>{problem.grade}</span>
          <span>{problem.chapter}</span>
          <span className={styles.difficultyBadge}>{problem.difficulty}</span>
          <span className={styles.problemCode}>{problem.problemCode}</span>
        </div>
      </div>
      <div
        className={styles.rowMain}
        style={
          pinBottom
            ? { display: "flex", flexDirection: "column", flex: 1 }
            : undefined
        }
      >
        <p className={styles.sectionLabel}>{problem.section}</p>
        <div className={styles.problemBody}>
          <UnifiedProblem problem={problem} />
        </div>
        {/* 🔴 단추 줄을 바닥에 붙인다 — 원장님 2026-09-14 「버튼은 하단 고정시켜」.
            한 줄에 놓인 카드들의 단추가 길이와 상관없이 나란히 선다. */}
        <div style={pinBottom ? { marginTop: "auto" } : undefined}>
          {children}
        </div>
      </div>
    </article>
  );
}

function Variant({
  no,
  title,
  note,
  children,
}: {
  no: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 15, fontWeight: 900 }}>
        {no} {title}
      </h2>
      {/* §2.2.1 — 컴포넌트는 hex 를 직접 쓰지 않는다. 토큰 클래스로 옮겼다. */}
      <p className="m-0 mb-3 mt-1.5 text-[12.5px] leading-[1.7] text-text-2">
        {note}
      </p>
      {children}
    </section>
  );
}

export function BankDetailWireClient() {
  const [popover, setPopover] = useState<string | null>(null);
  const [modal, setModal] = useState<BankProblem | null>(null);
  const [drawer, setDrawer] = useState<BankProblem | null>(WIRE_PROBLEMS[0]!);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [split, setSplit] = useState<BankProblem>(WIRE_PROBLEMS[0]!);

  return (
    <main className={styles.bank} style={{ padding: 24 }}>
      <h1 style={{ fontSize: 17, fontWeight: 900 }}>
        문제은행 상세 처리 — Wire 시안 5안 (D-07)
      </h1>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.8 }}>
        문제 본문은 <strong>실제 렌더러</strong>로, 카드는{" "}
        <strong>실제 CSS</strong>로 그렸습니다. 그림은 손으로 그린 것이 아니라{" "}
        <strong>실제 도형 엔진이 뽑은 산출물</strong>입니다. 단추는 다섯 안 모두{" "}
        <strong>담기 · 상세 · 변형 · 승인/반려</strong> 넷을 답니다 — 지금 통합
        화면에는 변형과 승인/반려가 없습니다.
      </p>
      {/* §2.2.1 — 컴포넌트는 hex 를 직접 쓰지 않는다. 경고 역할이므로 기능색 Red 의
          «글자색» 토큰을 쓴다(§2.2 — 면색이 아니라 글자색). */}
      <p className="m-0 mt-2 text-[12.5px] leading-[1.8] text-g-red-text">
        ⚠️ 「카드를 아무 데나 눌러서 연다」는 절대 규칙 8(D-30)에 걸립니다 —
        `scanAffordance` 가 <code>&lt;article onClick&gt;</code> 을 막습니다.
        그래서 여는 것은 언제나 <strong>진짜 단추</strong>입니다(Ⓑ·Ⓒ 는 「문제
        상세」 단추).
      </p>

      <Variant
        no="Ⓐ"
        title="문항 위 팝오버"
        note="카드 위에 작은 판이 뜬다. 목록이 밀리지 않아 스크롤 자리가 그대로다. 대신 긴 풀이에는 좁다."
      >
        <div className={styles.problemList} style={GRID_STYLE}>
          {WIRE_PROBLEMS.map((problem, index) => (
            <Card key={problem.id} problem={problem} number={index + 1}>
              <Actions
                problem={problem}
                openLabel={popover === problem.id ? "닫기" : "정답·상세"}
                onOpen={() =>
                  setPopover((id) => (id === problem.id ? null : problem.id))
                }
              />
              {popover === problem.id ? (
                <div
                  className={`${styles.detail} border border-divider bg-surface`}
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 64,
                    zIndex: 5,
                    maxHeight: 320,
                    overflowY: "auto",
                    padding: 16,
                  }}
                >
                  <DetailBody problem={problem} />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </Variant>

      <Variant
        no="Ⓑ"
        title="전체 상세 모달"
        note="문제·정보·정답·풀이·모든 동작이 한 창에 있다. 목록 자리는 전혀 흔들리지 않는다. 한 번에 한 문항만 본다."
      >
        <div className={styles.problemList} style={GRID_STYLE}>
          {WIRE_PROBLEMS.map((problem, index) => (
            <Card key={problem.id} problem={problem} number={index + 1}>
              <Actions problem={problem} onOpen={() => setModal(problem)} />
            </Card>
          ))}
        </div>
        {modal ? (
          <div
            className="bg-ink/40"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setModal(null);
            }}
          >
            <dialog
              open
              role="dialog"
              aria-modal="true"
              aria-label="문제 상세"
              className="border border-divider bg-surface"
              style={{
                position: "static",
                margin: 0,
                maxHeight: "86vh",
                width: "min(720px, 100%)",
                overflowY: "auto",
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <strong style={{ fontSize: 14 }}>문제 상세</strong>
                <span className={styles.problemCode}>{modal.problemCode}</span>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setModal(null)}
                  aria-label="닫기"
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className={styles.problemBody}>
                <UnifiedProblem problem={modal} />
              </div>
              <DetailBody problem={modal} />
              <Actions problem={modal} />
            </dialog>
          </div>
        ) : null}
      </Variant>

      <Variant
        no="Ⓒ"
        title="오른쪽 서랍"
        note="목록을 보면서 고른 문항을 오른쪽에서 본다. 다음·이전으로 연속 검토하기 좋다. 목록 폭이 줄어든다."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 380px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div className={styles.problemList} style={{ gap: 12 }}>
            {WIRE_PROBLEMS.map((problem, index) => (
              <Card key={problem.id} problem={problem} number={index + 1}>
                <Actions
                  problem={problem}
                  openLabel="오른쪽에 열기"
                  onOpen={() => setDrawer(problem)}
                />
              </Card>
            ))}
          </div>
          <aside
            className={styles.filters}
            style={{ position: "sticky", top: 16, marginBottom: 0 }}
          >
            {drawer ? (
              <>
                <div className={styles.problemBody}>
                  <UnifiedProblem problem={drawer} />
                </div>
                <DetailBody problem={drawer} />
                <Actions problem={drawer} />
              </>
            ) : (
              <p style={{ fontSize: 12.5 }}>왼쪽에서 문항을 고르세요.</p>
            )}
          </aside>
        </div>
      </Variant>

      <Variant
        no="Ⓓ"
        title="그 자리에서 뒤집기"
        note="팝업이 없다. 카드가 제자리에서 상세로 바뀐다. 격자가 흔들리지 않는 대신 문제와 해설을 같이 못 본다."
      >
        <div className={styles.problemList} style={GRID_STYLE}>
          {WIRE_PROBLEMS.map((problem, index) => (
            <Card key={problem.id} problem={problem} number={index + 1}>
              {flipped === problem.id ? (
                <>
                  <DetailBody problem={problem} />
                  <Actions
                    problem={problem}
                    openLabel="문제로 돌아가기"
                    onOpen={() => setFlipped(null)}
                  />
                </>
              ) : (
                <Actions
                  problem={problem}
                  onOpen={() => setFlipped(problem.id)}
                />
              )}
            </Card>
          ))}
        </div>
      </Variant>

      <Variant
        no="Ⓔ"
        title="2단 — 목록 + 상시 상세"
        note="오른쪽이 늘 켜져 있다. 누를 것이 없어도 보이지만, 목록이 가장 좁아진다."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <ol style={{ display: "grid", gap: 8, listStyle: "none", margin: 0 }}>
            {WIRE_PROBLEMS.map((problem, index) => (
              <li key={problem.id}>
                {/* 고른 행의 테두리는 기능색 Blue(「지금 보고 있는 것」, §2.2) 토큰이다.
                    종전 `#3159df` 는 팔레트에 아예 없는 값이었다(진짜 Blue 는 #2064B3). */}
                <button
                  type="button"
                  className={`${styles.textButton} ${
                    split.id === problem.id ? "border-g-blue" : ""
                  }`}
                  aria-pressed={split.id === problem.id}
                  style={{
                    width: "100%",
                    height: "auto",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    padding: "10px 12px",
                  }}
                  onClick={() => setSplit(problem)}
                >
                  문제 {String(index + 1).padStart(2, "0")} · {problem.grade} ·{" "}
                  {problem.problemCode}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.filters} style={{ marginBottom: 0 }}>
            <div className={styles.problemBody}>
              <UnifiedProblem problem={split} />
            </div>
            <DetailBody problem={split} />
            <Actions problem={split} />
          </div>
        </div>
      </Variant>
    </main>
  );
}
