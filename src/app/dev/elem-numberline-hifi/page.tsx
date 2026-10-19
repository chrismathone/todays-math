import type { CSSProperties } from "react";

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PastPaperTemplate } from "@/components/print/templates/PastPaperTemplate";
import type { TestPrintProblem } from "@/components/print/types";
import { devPageVisible } from "@/lib/devPageAccess";

import styles from "./NumberLineHifi.module.css";
import {
  numberLineSvg,
  type Range,
  type RangeLook,
  svgDataUri,
} from "./numberLineSvg";

/**
 * **초등 수직선 — 수의 범위 · 수직선 보기 Hi-fi 시안** (D-07 · 절대 규칙 1, 2026-10-18).
 *
 * 원장님 2026-10-18 «추천으로 진행» — Wire `/dev/elem-numberline-wire` 의 **R1(교과서형 — 축 위 진한 색 선)**
 * · **L2(넓은 그림 보기는 1열)**. 실제 2단 지면(`PastPaperTemplate` → `ProblemContent`)에 그렸다 —
 * 발문 그림은 엔진 그림과 같은 인라인 SVG 칸(`figureSvg`), 보기 그림은 D-156 의 짝 칸(`choiceFigureIndex`).
 * 1열은 아직 지면 규칙에 없어 이 화면만 칸을 1열로 덮어 그렸다(`.oneColumn`). 안끼리 다른 것은
 * 범위의 색 · 굵기 · 점 크기 · 그림 폭 · 보기 줄 간격이다. 계획서 §13.
 * DB 를 읽지 않는다 — 지어낸 문항 넷이다(초5 2-1 «수의 범위와 어림하기»).
 */

type Variant = {
  id: string;
  title: string;
  rec?: boolean;
  look: RangeLook;
  /** 보기 그림 폭 — "full" 이면 칸 폭 전부 · 수면 px 상한. */
  figureWidth: "full" | number;
  /** 보기 줄 사이(px). */
  rowGap: number;
  /** 보기 번호를 수직선 축 높이에 맞추나. */
  markOnAxis: boolean;
  what: string;
};

const VARIANTS: Variant[] = [
  {
    id: "H1",
    title: "H1 · Wire 그대로",
    rec: true,
    look: { color: "#a8432f", stroke: 3, dot: 3.6, font: 11 },
    figureWidth: "full",
    rowGap: 6,
    markOnAxis: true,
    what: "적갈색 3px · 점 3.6 · 그림은 칸 폭 전부 · 번호는 축 높이. 엔진 수직선의 숫자 크기(11)를 그대로 둔다.",
  },
  {
    id: "H2",
    title: "H2 · 점을 키움",
    look: { color: "#7d2718", stroke: 2.4, dot: 4.6, font: 12 },
    figureWidth: "full",
    rowGap: 8,
    markOnAxis: true,
    what: "더 진한 적갈색 · 선은 가늘게(2.4) · 점은 크게(4.6) · 숫자 12. ● 와 ○ 를 가르는 문항이라 점을 앞에 세웠다.",
  },
  {
    id: "H3",
    title: "H3 · 그림 폭 70mm 상한",
    look: { color: "#a8432f", stroke: 3, dot: 3.8, font: 11 },
    figureWidth: 240,
    rowGap: 6,
    markOnAxis: true,
    what: "보기 그림을 발문 그림과 같은 크기로(늘이지 않는다) · 오른쪽이 빈다. 발문 그림과 보기 그림의 숫자 크기가 같다.",
  },
  {
    id: "H4",
    title: "H4 · 보기 줄 사이 가는 선",
    look: { color: "#a8432f", stroke: 3, dot: 3.8, font: 11 },
    figureWidth: "full",
    rowGap: 4,
    markOnAxis: false,
    what: "보기 줄마다 아래 점선 · 번호는 줄 위쪽. 줄이 붙어 보일 때 어느 숫자가 어느 줄 것인지 갈린다. 지면에 선이 하나 더 는다.",
  },
];

const META = {
  academyName: "오늘의수학",
  title: "초5 · 10월 월말평가",
  subtitle: "수의 범위와 어림하기 — 시안",
};

const RAY: Range = { from: 27.3, to: null, fromIn: true };
const ROUND_CHOICES: Range[] = [
  { from: 550, to: 650, fromIn: true, toIn: true },
  { from: 550, to: 650, fromIn: true, toIn: false },
  { from: 550, to: 650, fromIn: false, toIn: true },
  { from: 550, to: 650, fromIn: false, toIn: false },
  { from: 500, to: 600, fromIn: true, toIn: false },
];
const BETWEEN: Range = { from: 32, to: 36, fromIn: false, toIn: true };

function problemsFor(v: Variant): TestPrintProblem[] {
  const stem1 = numberLineSvg({
    min: 26,
    max: 28,
    tick: 0.1,
    labelEvery: 0.5,
    range: RAY,
    look: v.look,
  });
  const choiceSvgs = ROUND_CHOICES.map((r) =>
    svgDataUri(
      numberLineSvg({
        min: 500,
        max: 700,
        tick: 10,
        labelEvery: 50,
        range: r,
        look: v.look,
      }),
    ),
  );
  const blankLine = svgDataUri(
    numberLineSvg({
      min: 500,
      max: 700,
      tick: 10,
      labelEvery: 50,
      look: v.look,
    }),
  );
  const stem3 = numberLineSvg({
    min: 30,
    max: 38,
    tick: 1,
    labelEvery: 1,
    range: BETWEEN,
    look: v.look,
  });
  return [
    {
      id: `${v.id}-1`,
      orderIndex: 1,
      content:
        "수직선에 나타낸 수의 범위를 바르게 나타낸 것은 어느 것입니까?\n[그림]\n① $27$ 이상인 수\n② $27.3$ 이상인 수\n③ $27.3$ 이하인 수\n④ $27.5$ 이상인 수\n⑤ $27.5$ 이하인 수",
      answer: "②",
      solution: null,
      questionType: "객관식",
      figureSvg: stem1,
    },
    {
      id: `${v.id}-2`,
      orderIndex: 2,
      content:
        "반올림하여 백의 자리까지 나타내면 $600$ 이 되는 수의 범위를 수직선에 나타낸 것은 어느 것입니까?\n[그림]\n① [그림]\n② [그림]\n③ [그림]\n④ [그림]\n⑤ [그림]",
      answer: "②",
      solution: null,
      questionType: "객관식",
      figureUrls: [blankLine, ...choiceSvgs],
      choiceFigureIndex: [0, 1, 2, 3, 4, 5],
    },
    {
      id: `${v.id}-3`,
      orderIndex: 3,
      content:
        "수직선에 나타낸 수의 범위에 들어가는 자연수는 모두 몇 개입니까?\n[그림]",
      answer: "$4$개",
      solution: null,
      questionType: "단답형",
      figureSvg: stem3,
    },
    {
      id: `${v.id}-4`,
      orderIndex: 4,
      content:
        "어떤 수를 올림하여 십의 자리까지 나타내었더니 $80$ 이 되었습니다. 어떤 수가 될 수 있는 자연수 가운데 가장 작은 수를 구하시오.",
      answer: "$71$",
      solution: null,
      questionType: "단답형",
    },
  ];
}

export default async function ElemNumberLineHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return (
    <main className={styles.shell}>
      <header className={styles.head}>
        <h1 className={styles.h1}>
          초등 수직선 — 수의 범위 · 수직선 보기 (Hi-fi)
        </h1>
        <p className={styles.note}>
          Wire 에서 고르신 <b>R1(축 위 진한 색 선 · 포함 ● · 불포함 ○)</b>과{" "}
          <b>L2(수직선이 보기면 1열)</b>을 실제 2단 시험지에 그렸습니다. 문항
          넷은 초5 «수의 범위와 어림하기»의 지어낸 예입니다 — 1번 발문 그림 ·
          2번 그림 보기 · 3번 이상/이하 아닌 «초과 · 이하» · 4번 그림 없는
          문항(옆 문항과 높이 비교용). 안끼리 다른 것은 범위의 색 · 굵기 · 점
          크기와 보기 줄의 모양입니다. 각 안 아래는 흑백 인쇄로 본 모습입니다.
        </p>
      </header>

      {VARIANTS.map((v) => {
        const problems = problemsFor(v);
        const columns = [problems.slice(0, 2), problems.slice(2)];
        const page = (
          <PastPaperTemplate
            columns={columns}
            meta={META}
            numberOf={(p) => p.orderIndex}
            page={1}
            scoreOf={() => null}
          />
        );
        return (
          <section key={v.id} className={styles.variant} id={v.id}>
            <h2 className={styles.h2}>
              {v.title}
              {v.rec ? <span className={styles.rec}>추천</span> : null}
            </h2>
            <p className={styles.note}>{v.what}</p>
            <div
              className={[
                styles.oneColumn,
                v.markOnAxis ? styles.markOnAxis : styles.markTop,
                v.id === "H4" ? styles.divided : "",
              ].join(" ")}
              style={
                {
                  "--choice-gap": `${v.rowGap}px`,
                  "--choice-fig-w":
                    v.figureWidth === "full" ? "100%" : `${v.figureWidth}px`,
                } as CSSProperties
              }
            >
              <div className={styles.pages}>
                {page}
                <div className={styles.gray} aria-label="흑백 인쇄로 본 모습">
                  {page}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
