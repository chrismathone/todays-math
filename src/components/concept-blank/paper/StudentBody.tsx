import { Fragment, type CSSProperties } from "react";

import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { clozeSentence, termPrompt } from "@/lib/concept-blank/questions";

import { FigureSvg } from "./FigureSvg";
import type { StudentPage } from "./paginate";
import { termRuledLines } from "./paginate";
import { Blank, BlankSentence, HowTo, PaperText } from "./PaperParts";
import styles from "./paper.module.css";
import { circled, inkEm } from "./text";

/**
 * 학생지 한 장의 몸(머리 · 발 사이) — 형식 다섯(시안 `concept-blank-5-two-units.html` 의 틀을 옮겼다).
 * 채점표에만 있을 답은 여기 한 글자도 싣지 않는다(빈칸 · 이름표 자리 · 줄).
 *
 * 칸은 장의 남는 높이를 나눠 채운다(원장님 2026-09-30 «A4 에 맞게») — 문항 · 칸 · 가지 · 카드가 정원보다 적은 장도
 * 아래가 비지 않는다. 시안은 정원이 꽉 찬 장만 그렸다.
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
              <span className={styles.zoneTitle} data-cb-zone-title="">
                <PaperText text={zone.title} />
              </span>
              <span className={styles.zoneHint}>{zone.hint}</span>
            </div>
            <div className={styles.zoneBody}>
              <div className={styles.ruled} data-cb-ruled="" />
              <div
                className={zone.side === "그림" ? styles.gridBox : styles.exBox}
                data-cb-box=""
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

/** 문항마다 쓰기 줄이 늘어나 장을 채운다(`paper.module.css` `.termItem`) — 문항이 적은 장일수록 쓸 자리가 넓다. */
function TermBody({ page }: { page: Extract<StudentPage, { form: "term" }> }) {
  return (
    <section className={styles.termList} data-cb-fit="">
      {page.blocks.map((block, i) => {
        if (block.kind === "term")
          return (
            <div className={styles.termItem} data-cb-item="term" key={block.n}>
              <div className={styles.qline}>
                <span className={styles.qn} data-cb-qn="">
                  문 {block.n}
                </span>
                <span className={styles.term}>
                  <PaperText text={termPrompt(block.entry)} />
                </span>
              </div>
              <div
                className={`${styles.ruled} ${styles.termRuled}`}
                style={
                  {
                    "--cb-answer-lines": termRuledLines(block.entry),
                  } as CSSProperties
                }
                data-cb-ruled=""
              />
            </div>
          );
        const firstOx = page.blocks[i - 1]?.kind !== "ox";
        return (
          <Fragment key={block.n}>
            {firstOx ? (
              <div className={styles.oxPart}>
                맞으면 ○, 틀리면 × 에 표시하고 까닭을 쓰시오.
              </div>
            ) : null}
            <div className={styles.termItem} data-cb-item="ox">
              <div className={styles.qline}>
                <span className={styles.qn} data-cb-qn="">
                  문 {block.n}
                </span>
                <span className={styles.statement}>
                  <PaperText text={block.item.statement} />
                </span>
              </div>
              <div className={styles.oxRow}>
                <span className={styles.oxMark}>○</span>
                <span className={styles.oxMark}>×</span>
                <div
                  className={`${styles.ruled} ${styles.oxWhy}`}
                  data-cb-ruled=""
                >
                  <span className={styles.oxWhyLabel}>까닭</span>
                </div>
              </div>
            </div>
          </Fragment>
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
            <span>가</span>빈칸에 알맞은 말, 수, 식이나 기호를 쓰세요.
          </div>
          {/* 적용이 없는 장은 문장 칸이 늘어나 장을 채운다 — 적용이 있으면 적용 칸이 채운다 */}
          <ol
            className={`${styles.sent} ${apply.length ? "" : styles.sentFill}`}
            data-cb-fill={apply.length ? undefined : ""}
          >
            {sentences.map((b) => (
              <li data-cb-item="sentence" key={b.n}>
                <span className={styles.qn} data-cb-qn="">
                  문 {b.n}
                </span>
                {/* <p> 가 아니다 — 제품 MathText(인라인)가 <div> 를 내서 HTML 파서가 문단을 끊는다 */}
                <div className={styles.sentText}>
                  <BlankSentence sentence={clozeSentence(b.entry)} />
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {apply.length ? (
        <>
          <div className={styles.part}>
            <span>나</span>방금 쓴 뜻으로 답하고, 까닭을 쓰시오.
          </div>
          <div className={styles.apply}>
            {apply.map((b) => (
              <div className={styles.ap} data-cb-item="apply" key={b.n}>
                <div className={styles.apPrompt}>
                  <span className={styles.qn} data-cb-qn="">
                    문 {b.n}
                  </span>
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

/**
 * 가지 놓기 — 읽는 차례대로 왼쪽 · 오른쪽을 번갈아(시안: 왼쪽 위 → 오른쪽 위 → 왼쪽 가운데 …). 기둥마다 가지가
 * 높이를 나눠 채워, 가지가 여섯보다 적어도 장 아래가 비지 않는다. 가지가 하나면 오른쪽 기둥 없이 넓게 쓴다.
 */
export function mapColumns<T>(nodes: readonly T[]): { left: T[]; right: T[] } {
  return {
    left: nodes.filter((_, i) => i % 2 === 0),
    right: nodes.filter((_, i) => i % 2 === 1),
  };
}

/** 선을 그리는 자 — viewBox 694×1000 을 칸에 맞춰 늘인다(선 굵기는 늘이지 않는다). 가운데 기둥 폭 170. */
const WIRE_VIEW = { width: 694, height: 1000, hub: 170 } as const;

/** 선 — 가운데 원에서 가지의 안쪽 변 가운데로(가지 밑으로 22 들어가 끝난다). */
export function wirePaths(left: number, right: number): string[] {
  const { width, height, hub } = WIRE_VIEW;
  const cy = height / 2;
  const centers = (count: number) =>
    Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * height);
  if (right === 0) {
    // 가지 하나 — 원은 오른쪽 기둥 가운데, 가지는 왼쪽에 넓게
    const cx = width - hub / 2;
    return left ? [`M${cx} ${cy} L ${width - hub - 22} ${cy}`] : [];
  }
  const cx = width / 2;
  const path = (y: number, side: -1 | 1) => {
    const end = cx + side * (hub / 2 + 22);
    if (Math.abs(y - cy) < 1) return `M${cx} ${cy} L ${end} ${cy}`;
    return `M${cx} ${cy} C ${cx + side * 47} ${cy} ${cx + side * 57} ${y} ${end} ${y}`;
  };
  return [
    ...centers(left).map((y) => path(y, -1)),
    ...centers(right).map((y) => path(y, 1)),
  ];
}

/** 가운데 원 글씨 — 이름이 길면 줄인다(원 132px). 길이는 보이는 폭으로 잰다(수식 마크업은 세지 않는다). */
const hubFont = (hub: string) => {
  const em = inkEm(hub);
  return em <= 6 ? 19 : em <= 10 ? 17 : em <= 14 ? 15 : 13;
};

function MapNode({
  entry,
  questionMode,
  n,
}: {
  entry: ConceptEntry;
  questionMode?: true;
  n?: number;
}) {
  return (
    <section className={styles.node} data-cb-node="">
      <div className={styles.nodeTitle}>
        {questionMode ? (
          <span className={styles.nodeNumber}>문 {n}</span>
        ) : (
          <span className={styles.done} />
        )}
        <span>
          <PaperText text={entry.term} />
        </span>
      </div>
      {questionMode ? (
        <>
          <div className={styles.nodeLabel}>물음</div>
          <div className={styles.nodeQuestion}>
            <PaperText text={termPrompt(entry)} />
          </div>
          <div className={styles.nodeLabel}>답</div>
          <div
            className={`${styles.ruled} ${styles.nodeRuled} ${styles.termRuled}`}
            data-cb-ruled=""
            style={
              { "--cb-answer-lines": termRuledLines(entry) } as CSSProperties
            }
          />
        </>
      ) : (
        <>
          <div className={styles.nodeLabel}>뜻</div>
          <div
            className={`${styles.ruled} ${styles.nodeRuled}`}
            data-cb-ruled=""
          />
          <div className={styles.nodeLabel}>예</div>
          <div className={styles.nodeExample}>
            {entry.example ? (
              <>
                <PaperText text={entry.example.prompt} />{" "}
                <Blank answer={entry.example.answer} />
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function MapBody({
  page,
  first,
}: {
  page: Extract<StudentPage, { form: "map" }>;
  first: boolean;
}) {
  const { left, right } = mapColumns(page.map.nodes.slice(0, 6));
  return (
    <>
      {first ? (
        <HowTo>
          {page.questionMode ? (
            <>
              같은 단원의 가지마다 <b>물음</b>을 읽고 답을 쓰세요.
            </>
          ) : (
            <>
              가지마다 <b>뜻</b>을 쓰고, 아래 <b>예</b>를 채우세요. 다 쓴 가지는
              동그라미 안에 ✓.
            </>
          )}
        </HowTo>
      ) : null}
      <div
        className={`${styles.map} ${right.length ? "" : styles.mapSingle}`}
        data-cb-fit=""
      >
        <svg
          aria-hidden="true"
          className={styles.wires}
          preserveAspectRatio="none"
          viewBox={`0 0 ${WIRE_VIEW.width} ${WIRE_VIEW.height}`}
        >
          <g fill="none" opacity={0.75} stroke="#A57F00" strokeWidth={1.4}>
            {wirePaths(left.length, right.length).map((d) => (
              <path d={d} key={d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        </svg>
        <div className={styles.mapSide} data-cb-side="left">
          {left.map((entry) => (
            <MapNode
              entry={entry}
              questionMode={page.questionMode}
              n={(page.nodeStart ?? 1) + page.map.nodes.indexOf(entry)}
              key={entry.id}
            />
          ))}
        </div>
        <div
          className={styles.hub}
          data-cb-hub=""
          style={{ fontSize: hubFont(page.map.hub) }}
        >
          <PaperText text={page.map.hub} />
        </div>
        {right.length ? (
          <div className={styles.mapSide} data-cb-side="right">
            {right.map((entry) => (
              <MapNode
                entry={entry}
                questionMode={page.questionMode}
                n={(page.nodeStart ?? 1) + page.map.nodes.indexOf(entry)}
                key={entry.id}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ───────── E 그림 보고 쓰기 ───────── */

/**
 * 카드 놓기 — 넷부터 두 줄기(넷 2×2 · 다섯 · 여섯 2×3), 셋까지는 한 줄기(넓은 카드 — 그림 왼쪽 · 줄 오른쪽).
 * 다섯이면 마지막 카드가 두 줄기를 다 쓴다. 줄 수만큼 장 높이를 고르게 나눠, 카드가 여섯보다 적어도 장 아래가 비지 않는다.
 */
export function cardGrid(count: number): {
  columns: 1 | 2;
  rows: number;
  wide: (index: number) => boolean;
} {
  const columns = count >= 4 ? 2 : 1;
  return {
    columns,
    rows: Math.max(1, Math.ceil(count / columns)),
    wide: (index) => columns === 1 || (count % 2 === 1 && index === count - 1),
  };
}

function FigureBody({
  page,
  first,
}: {
  page: Extract<StudentPage, { form: "figure" }>;
  first: boolean;
}) {
  const grid = cardGrid(page.cards.length);
  const style = {
    gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
    // 줄이 둘 이하면 카드가 높다 — 그림을 더 크게 그린다
    ["--cb-figure-max" as string]: grid.rows <= 2 ? "170px" : "118px",
  } as CSSProperties;
  return (
    <>
      {first ? (
        <HowTo>
          점선 네모에는 가리키는 것의 <b>이름</b>을, 줄에는 <b>뜻 · 성질</b>을
          문장으로 쓰세요.
        </HowTo>
      ) : null}
      <div
        className={`${styles.cards} ${grid.columns === 1 ? styles.cardsOne : ""}`}
        data-cb-fit=""
        style={style}
      >
        {page.cards.map(({ n, figure }, i) => (
          <section
            className={`${styles.card} ${grid.wide(i) ? styles.cardWide : ""}`}
            data-cb-card={grid.wide(i) ? "wide" : "narrow"}
            key={figure.id}
          >
            <div className={styles.cardHead}>
              <span className={styles.qn} data-cb-qn="">
                문 {n}
              </span>
              <span>
                <PaperText text={figure.prompt} />
              </span>
            </div>
            <div className={styles.cardBody}>
              <FigureSvg item={figure} />
              <div className={styles.cardWrite}>
                {figure.lines.map((line, k) => (
                  <div className={styles.cardLine} data-cb-line="" key={k}>
                    <span>
                      <PaperText text={line.label} />
                    </span>
                    <span className={styles.field} />
                  </div>
                ))}
                <div
                  className={`${styles.ruled} ${styles.cardFill}`}
                  data-cb-ruled=""
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
