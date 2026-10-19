import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PastPaperTemplate } from "@/components/print/templates/PastPaperTemplate";
import type { TestPrintProblem } from "@/components/print/types";
import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";
import { EXAM_SAFETY_PX } from "@/lib/print/examRuler";
import { packExamPaper } from "@/lib/print/packExamPaper";
import { EXAM_MEASURED_PX } from "@/lib/printGeometry";

import styles from "./ExamPrint.module.css";

/**
 * **기출 2단 시험지 — 실제 지면.** Wire C → Hi-fi H2, 원장님 확정 2026-09-05.
 *
 * 시안(`/dev/exam-wire`·`/dev/exam-hifi`)은 쪽 나눔을 **손으로** 적었다. 여기서는
 * `packExamPaper` 가 잰 높이로 나눈다 — 그래서 이 화면이 처음으로 「19문항이 몇 장인가」에
 * 답한다.
 *
 * ## 🔴 문항이 조용히 사라질 자리가 없다
 *
 * 지면이 `column-count` 로 흘리면 브라우저가 셋째 단을 만들어 문항을 종이 밖으로 보낸다
 * (시안에서 문6 이 그렇게 없어졌다). 여기서는 단을 **명시적으로** 배치하고, 아래 표가
 * 「넣은 문항 수 == DB 문항 수」를 눈에 보이게 센다.
 *
 * ⚠️ DB 를 한 건도 안 바꾼다. 읽기만 한다.
 * ⚠️ 실물 프린터 검수는 아직이다 — 절대 규칙 6, `/dev/print-check` 에 항목이 있다.
 */
export const dynamic = "force-dynamic";

const EXAM_ID = "2025-jeonghwa-3-2-mid";

const META = {
  academyName: "오늘 수학",
  title: "JH중 3학년 · 2학기 중간고사 대비",
  subtitle: "삼각비 ~ 원주각 · 100점",
};

export default async function ExamPrintPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const rows = await db.problem.findMany({
    where: { examId: EXAM_ID },
    orderBy: { questionNumber: "asc" },
    select: {
      id: true,
      questionNumber: true,
      questionType: true,
      score: true,
      content: true,
      answer: true,
      solution: true,
      figureSvg: true,
      figureUrls: true,
      figureDims: true,
      figureSourceMm: true,
      choiceFigureIndex: true,
    },
  });

  if (rows.length === 0) {
    return (
      <main className={styles.shell}>
        <h1 className={styles.h1}>기출 2단 시험지</h1>
        <p className={styles.note}>{EXAM_ID} 문항이 DB 에 없다.</p>
      </main>
    );
  }

  const numberById = new Map(rows.map((r) => [r.id, r.questionNumber ?? 0]));
  const scoreById = new Map(rows.map((r) => [r.id, r.score]));

  const problems: TestPrintProblem[] = rows.map((r, index) => ({
    id: r.id,
    orderIndex: index,
    content: r.content,
    answer: r.answer,
    solution: r.solution,
    questionType: r.questionType,
    score: r.score,
    figureSvg: r.figureSvg,
    figureUrls: r.figureUrls,
    figureDims: r.figureDims,
    figureSourceMm: r.figureSourceMm,
    choiceFigureIndex: r.choiceFigureIndex,
  }));

  const { pages, tooTall, estimatedPx } = packExamPaper(problems);
  const tooTallIds = new Set(tooTall.map((p) => p.id));
  const placed = pages.reduce(
    (sum, page) => sum + page.columns.reduce((s, c) => s + c.length, 0),
    0,
  );

  return (
    <main className={styles.shell}>
      <header className={styles.head}>
        <h1 className={styles.h1}>기출 2단 시험지 — H2 금색 톤 띠</h1>
        <p className={styles.note}>
          정화중 25-2-중간 <strong>{rows.length}문항</strong>을 잰 높이로 나눠{" "}
          <strong>A4 {pages.length}장</strong>에 앉혔습니다. 쪽 나눔은 손으로
          적지 않고 <code>packExamPaper</code> 가 정합니다.
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>지면에 앉은 문항</dt>
            <dd className={placed === rows.length ? styles.ok : styles.bad}>
              {placed} / {rows.length}
              {placed === rows.length ? "" : " ← 사라진 문항이 있다"}
            </dd>
          </div>
          <div>
            <dt>한 단 높이</dt>
            <dd>
              첫 장 {EXAM_MEASURED_PX.firstPageColumn.toFixed(0)}px · 이어지는
              장 {EXAM_MEASURED_PX.continuationColumn.toFixed(0)}px
            </dd>
          </div>
          <div>
            <dt>문항마다 비워 둔 여유</dt>
            <dd>
              {EXAM_SAFETY_PX}px{" "}
              <span className={styles.dim}>
                (실측 최악 과소 −22px 를 덮는다)
              </span>
            </dd>
          </div>
          <div>
            <dt>한 단을 넘는 문항</dt>
            <dd className={tooTall.length === 0 ? styles.ok : styles.warn}>
              {tooTall.length === 0
                ? "없음"
                : tooTall.map((p) => `문 ${numberById.get(p.id)}`).join(" · ")}
            </dd>
          </div>
        </dl>
        <p className={styles.note}>
          <strong>아직 여쭐 것 둘</strong> — ㉠ 서술형 답란 높이(지금은 배점에
          비례한 제안입니다) ㉡ <code>&lt;보기&gt;</code> 상자의 머리 라벨(원본
          문3 은 라벨이 없는데 우리 규약은 그립니다). 종이로 보시고 말씀해
          주시면 그 값으로 박겠습니다.
        </p>
      </header>

      <div className={styles.pages}>
        {pages.map((page, index) => (
          <PastPaperTemplate
            columns={page.columns}
            key={index}
            meta={META}
            numberOf={(p) => numberById.get(p.id) ?? 0}
            page={index + 1}
            scoreOf={(p) => scoreById.get(p.id) ?? null}
            tooTallIds={tooTallIds}
          />
        ))}
      </div>

      <section className={styles.head}>
        <h2 className={styles.h2}>자가 잰 높이 (안전여유 제외)</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>문항</th>
              <th>추정 세로</th>
              <th>단 대비</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const px = estimatedPx.get(r.id) ?? 0;
              return (
                <tr key={r.id}>
                  <td>문 {r.questionNumber}</td>
                  <td className={styles.num}>{px.toFixed(0)}px</td>
                  <td className={styles.num}>
                    {((px / EXAM_MEASURED_PX.continuationColumn) * 100).toFixed(
                      0,
                    )}
                    %
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
