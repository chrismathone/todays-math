import type { CSSProperties } from "react";

import { FigureSvg } from "./FigureSvg";
import type { StudentPage } from "./paginate";
import { termRuledLines } from "./paginate";
import { Blank, BlankSentence, HowTo, PaperText } from "./PaperParts";
import styles from "./paper.module.css";
import { circled, textEm } from "./text";

/**
 * 학생지 한 장의 몸(머리 · 발 사이) — 형식 다섯(시안 `concept-blank-5-two-units.html` 의 틀을 그대로 옮겼다).
 * 채점표에만 있을 답은 여기 한 글자도 싣지 않는다(빈칸 · 이름표 자리 · 줄).
 */
export function StudentBody({
  page,
  first,
}: {
  page: StudentPage;
  first: boolean;
}) {
  switch (page.form) {
    case "recall":
      return <RecallBody first={first} page={page} />;
    case "term":
      return <TermBody page={page} />;
    case "cloze":
      return <ClozeBody page={page} />;
    case "map":
      return <MapBody first={first} page={page} />;
    case "figure":
      return <FigureBody first={first} page={page} />;
  }
}

/* ───────── A 완전 백지 ───────── */

function RecallBody({
  page,
  first,
}: {
  page: Extract<StudentPage, { form: "recall" }>;
  first: boolean;
}) {
  return (
    <>
      {first ? (
        <HowTo>
          소단원 이름만 적혀 있습니다. 칸마다 <b>뜻</b>을 문장으로 쓰고, 오른쪽
          칸에는 <b>그림</b>이나 <b>예</b>로도 나타내세요.
        </HowTo>
      ) : null}
      <div className={styles.zones} data-cb-fit="">
        {page.zones.map(({ n, zone }) => (
          <section className={styles.zone} data-cb-zone={zone.side} key={n}>
            <div className={styles.zoneHead}>
              <span className={styles.zoneNo}>{circled(n)}</span>
              <span className={styles.zoneTitle}>{zone.title}</span>
              <span className={styles.zoneHint}>{zone.hint}</span>
            </div>
            <div className={styles.zoneBody}>
              <div className={styles.ruled} />
              <div
                className={zone.side === "그림" ? styles.gridBox : styles.exBox}
              >
                <span className={styles.boxLabel}>{zone.side}</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/* ───────── B 용어 → 뜻 (+ ○×) ───────── */

/** 문항이 이만큼 있어야 장 전체에 고르게 벌린다(시안) — 적으면 위에서부터 붙여 쓴다. */
const TERM_SPREAD_MIN = 6;

function TermBody({ page }: { page: Extract<StudentPage, { form: "term" }> }) {
  return (
    <section
      className={`${styles.termList} ${page.blocks.length < TERM_SPREAD_MIN ? styles.termListSparse : ""}`}
      data-cb-fit=""
    >
      {page.blocks.map((block, i) => {
        if (block.kind === "term")
          return (
            <div className={styles.termItem} data-cb-item="term" key={i}>
              <div className={styles.qline}>
                <span className={styles.qn}>문 {block.n}</span>
                <span className={styles.term}>
                  <PaperText text={block.entry.term} />
                </span>
              </div>
              <div
                className={`${styles.ruled} ${termRuledLines(block.entry) === 1 ? styles.r1 : styles.r2}`}
              />
            </div>
          );
        const firstOx = page.blocks[i - 1]?.kind !== "ox";
        return (
          <div key={i}>
            {firstOx ? (
              <div className={styles.oxPart}>
                맞으면 ○, 틀리면 × 에 표시하고 까닭을 쓰시오.
              </div>
            ) : null}
            <div className={styles.termItem} data-cb-item="ox">
              <div className={styles.qline}>
                <span className={styles.qn}>문 {block.n}</span>
                <span className={styles.statement}>
                  <PaperText text={block.item.statement} />
                </span>
              </div>
              <div className={styles.oxRow}>
                <span className={styles.oxMark}>○</span>
                <span className={styles.oxMark}>×</span>
                <span className={styles.field}>까닭</span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ───────── C 문장 빈칸 (+ 나 · 적용) ───────── */

function ClozeBody({
  page,
}: {
  page: Extract<StudentPage, { form: "cloze" }>;
}) {
  const sentences = page.blocks.filter((b) => b.kind === "sentence");
  const apply = page.blocks.filter((b) => b.kind === "apply");
  return (
    <div className={styles.clozeBody} data-cb-fit="">
      {sentences.length ? (
        <>
          <div className={styles.part}>
            <span>가</span>빈칸에 알맞은 말을 쓰시오.
          </div>
          <ol className={styles.sent}>
            {sentences.map((b) => (
              <li data-cb-item="sentence" key={b.n}>
                <span className={styles.qn}>문 {b.n}</span>
                {/* <p> 가 아니다 — 제품 MathText(인라인)가 <div> 를 내서 HTML 파서가 문단을 끊는다 */}
                <div className={styles.sentText}>
                  <BlankSentence sentence={b.entry.definition} />
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {apply.length ? (
        <>
          <div className={styles.part}>
            <span>나</span>방금 쓴 뜻으로 풀어 보시오.
          </div>
          <div className={styles.apply}>
            {apply.map((b) => (
              <div className={styles.ap} data-cb-item="apply" key={b.n}>
                <div className={styles.apPrompt}>
                  <span className={styles.qn}>문 {b.n}</span>
                  <span>
                    <PaperText text={b.item.prompt} />
                  </span>
                </div>
                <div className={styles.apAnswer}>
                  <span>답</span>
                  <span className={styles.field} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ───────── D 개념 지도 ───────── */

/** 가지 자리 — 왼쪽 위 · 가운데 · 아래(0~2), 오른쪽 위 · 가운데 · 아래(3~5). */
const MAP_SLOTS: Record<number, readonly number[]> = {
  1: [1],
  2: [1, 4],
  3: [0, 3, 1],
  4: [0, 3, 2, 5],
  5: [0, 3, 1, 4, 2],
  6: [0, 3, 1, 4, 2, 5],
};
/** 시안의 선 — 가운데 원(347, 390)에서 가지로(viewBox 694×780, 칸에 맞춰 늘인다). */
const WIRES = [
  "M347 390 C 300 390 290 130 240 130",
  "M347 390 L 240 390",
  "M347 390 C 300 390 290 650 240 650",
  "M347 390 C 394 390 404 130 454 130",
  "M347 390 L 454 390",
  "M347 390 C 394 390 404 650 454 650",
] as const;

function slotStyle(slot: number): CSSProperties {
  return { gridColumn: slot < 3 ? 1 : 3, gridRow: (slot % 3) + 1 };
}

/** 가운데 원 글씨 — 이름이 길면 줄인다(원 132px). */
const hubFont = (hub: string) => {
  const em = textEm(hub);
  return em <= 6 ? 19 : em <= 10 ? 17 : em <= 14 ? 15 : 13;
};

function MapBody({
  page,
  first,
}: {
  page: Extract<StudentPage, { form: "map" }>;
  first: boolean;
}) {
  const nodes = page.map.nodes.slice(0, 6);
  const slots = MAP_SLOTS[nodes.length] ?? [];
  return (
    <>
      {first ? (
        <HowTo>
          가지마다 <b>뜻</b>을 쓰고, 아래 <b>예</b>를 채우세요. 다 쓴 가지는
          동그라미 안에 ✓.
        </HowTo>
      ) : null}
      <div className={styles.map} data-cb-fit="">
        <svg
          aria-hidden="true"
          className={styles.wires}
          preserveAspectRatio="none"
          viewBox="0 0 694 780"
        >
          <g fill="none" opacity={0.75} stroke="#A57F00" strokeWidth={1.4}>
            {slots.map((slot) => (
              <path d={WIRES[slot]} key={slot} />
            ))}
          </g>
        </svg>
        <div className={styles.hub} style={{ fontSize: hubFont(page.map.hub) }}>
          {page.map.hub}
        </div>
        {nodes.map((entry, i) => (
          <section
            className={styles.node}
            data-cb-node=""
            key={entry.id}
            style={slotStyle(slots[i]!)}
          >
            <div className={styles.nodeTitle}>
              <span className={styles.done} />
              <span>
                <PaperText text={entry.term} />
              </span>
            </div>
            <div className={styles.nodeLabel}>뜻</div>
            <div className={`${styles.ruled} ${styles.nodeRuled}`} />
            <div className={styles.nodeLabel}>예</div>
            <div className={styles.nodeExample}>
              {entry.example ? (
                <>
                  <PaperText text={entry.example.prompt} />{" "}
                  <Blank answer={entry.example.answer} />
                </>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/* ───────── E 그림 보고 쓰기 ───────── */

function FigureBody({
  page,
  first,
}: {
  page: Extract<StudentPage, { form: "figure" }>;
  first: boolean;
}) {
  return (
    <>
      {first ? (
        <HowTo>
          점선 네모에는 가리키는 것의 <b>이름</b>을, 줄에는 <b>뜻 · 성질</b>을
          문장으로 쓰세요.
        </HowTo>
      ) : null}
      <div className={styles.cards} data-cb-fit="">
        {page.cards.map(({ n, figure }) => (
          <section className={styles.card} data-cb-card="" key={figure.id}>
            <div className={styles.cardHead}>
              <span className={styles.qn}>문 {n}</span>
              <span>
                <PaperText text={figure.prompt} />
              </span>
            </div>
            <FigureSvg item={figure} />
            {figure.lines.map((line, i) => (
              <div className={styles.cardLine} key={i}>
                <span>{line.label}</span>
                <span className={styles.field} />
              </div>
            ))}
            <div className={`${styles.ruled} ${styles.cardFill}`} />
          </section>
        ))}
      </div>
    </>
  );
}
