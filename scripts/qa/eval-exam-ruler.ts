/**
 * 기출 2단 지면 **자의 성적표** — 추정을 지면 실측에 대고 채점한다 (읽기 전용).
 *
 *   npx tsx scripts/qa/eval-exam-ruler.ts
 *
 * ## 🔴 «참»이 어디서 오는가
 *
 * 정답은 `measure-exam-paper-units.tsx` 가 **Chromium 인쇄 매체에서 잰 높이**다.
 * `estimateExamProblemPx` 가 낸 값이 아니다 — 채점의 정답을 제품에서 가져오면
 * 제품이 틀릴수록 점수가 오른다(CLAUDE.md 2026-08-18).
 *
 * ## 어느 쪽 오차가 나쁜가
 *
 * **과소평가가 놓침이다.** 자가 덜 세면 단에 문항을 하나 더 넣고, 그 문항은
 * 종이에서 **다음 문항 위에 겹쳐 찍힌다.** 과대평가는 지면이 헐거워질 뿐이다.
 * 그래서 평균 오차가 아니라 **과소 건수와 최악 과소**를 먼저 본다.
 */
import { chromium } from "@playwright/test";

import type { TestPrintProblem } from "../../src/components/print/types";
import { db } from "../../src/lib/db";
import { estimateExamProblemPx } from "../../src/lib/print/examRuler";
import {
  assertExamSane,
  EXAM_GUARD,
  examDocument,
  renderExamItem,
  renderExamPage,
  type ExamSlot,
} from "./examPaperProbe";
import { writeProbe } from "./paperProbe";

const EXAM_ID = "2025-jeonghwa-3-2-mid";
/** 이 안이면 「맞다」로 본다. 본문 한 줄(20px)이 기준이다. */
const OK_PX = 20;

async function main(): Promise<number> {
  const rows = await db.problem.findMany({
    where: { examId: EXAM_ID },
    orderBy: { questionNumber: "asc" },
    select: {
      id: true,
      questionNumber: true,
      questionType: true,
      score: true,
      content: true,
      figureSvg: true,
      figureUrls: true,
      figureDims: true,
      figureSourceMm: true,
      choiceFigureIndex: true,
    },
  });
  if (rows.length === 0) {
    console.error(`${EXAM_ID} 문항이 DB 에 없다 — 채점 중단`);
    return 2;
  }

  const slots: ExamSlot[] = rows.map((r) => ({
    id: r.id,
    number: r.questionNumber ?? 0,
    content: r.content,
    questionType: r.questionType,
    score: r.score,
    figureSvg: r.figureSvg,
    figureUrls: r.figureUrls,
    figureDims: r.figureDims,
    figureSourceMm: r.figureSourceMm,
    choiceFigureIndex: r.choiceFigureIndex,
  }));

  const pages = slots.map((s, i) =>
    renderExamPage("continuation", [[renderExamItem(s)], []], i + 1),
  );
  const url = writeProbe("exam-ruler.html", await examDocument(pages));

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  await page.emulateMedia({ media: "print" });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(400);
  assertExamSane(await page.evaluate(EXAM_GUARD));
  const measured = (await page.evaluate(`(() => {
    return Array.from(document.querySelectorAll(".item")).map((el) => [
      el.getAttribute("data-pid"),
      el.getBoundingClientRect().height,
    ]);
  })()`)) as [string, number][];
  await browser.close();

  const truth = new Map(measured);
  // 🔴 잰 것과 채점할 것이 어긋나면 조용히 표본이 준다 — 세어서 멈춘다.
  if (truth.size !== rows.length) {
    console.error(
      `잰 문항 ${truth.size}개 ≠ DB ${rows.length}개 — 표본이 샜다. 채점 중단`,
    );
    return 2;
  }

  const results = rows.map((r) => {
    const actual = truth.get(r.id)!;
    const est = estimateExamProblemPx(r as unknown as TestPrintProblem);
    return { n: r.questionNumber ?? 0, actual, est, err: est - actual };
  });

  console.log("문항   실측     추정     오차");
  for (const r of results.sort((a, b) => a.n - b.n)) {
    const mark =
      r.err < -OK_PX ? "  ← 과소(놓침)" : r.err > OK_PX ? "  ← 과대" : "";
    console.log(
      `문 ${String(r.n).padStart(2)}  ${r.actual.toFixed(0).padStart(6)}  ${r.est.toFixed(0).padStart(6)}  ${(r.err >= 0 ? "+" : "") + r.err.toFixed(0).padStart(5)}${mark}`,
    );
  }

  const under = results.filter((r) => r.err < -OK_PX);
  const over = results.filter((r) => r.err > OK_PX);
  const ok = results.length - under.length - over.length;
  const worst = Math.min(...results.map((r) => r.err));
  const mean =
    results.reduce((s, r) => s + Math.abs(r.err), 0) / results.length;

  console.log(
    `\n|오차| <= ${OK_PX}px : ${ok}/${results.length} (${((ok / results.length) * 100).toFixed(1)}%)` +
      `\n과소(놓침 위험) : ${under.length}건 · 최악 ${worst.toFixed(0)}px` +
      `\n과대(헐거움)    : ${over.length}건` +
      `\n평균 |오차|     : ${mean.toFixed(1)}px`,
  );
  if (under.length > 0)
    console.log(
      "\n⚠️ 과소는 곧 놓침이다 — 단에 한 문항을 더 넣어 **겹쳐 찍힌다.**\n" +
        "   자를 고치거나, 못 고치면 그만큼 안전여유를 두고 그 사실을 적을 것.",
    );
  return 0;
}

main()
  .then(async (code) => {
    await db.$disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
