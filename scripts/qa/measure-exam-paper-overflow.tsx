/**
 * 기출 2단 지면에서 문항이 **넘치는가**를 전수로 잰다 (읽기 전용 · DB 는 SELECT 만).
 *
 *   npx tsx --require ./scripts/qa/css-module-stub.cjs scripts/qa/measure-exam-paper-overflow.tsx --json out.json
 *   npx tsx --require ./scripts/qa/css-module-stub.cjs scripts/qa/measure-exam-paper-overflow.tsx --take 600 --json probe.json
 *
 * 둘을 잰다(D-164 ② · 2026-10-21 — 한글 어절 줄바꿈 전후를 같은 자로 견주려고 세웠다).
 *  ㉠ **문항마다** — 이어지는 장의 왼쪽 단 · 오른쪽 단에 하나씩 그려 높이와 가로로 새는 너비를 잰다. 오른쪽 단은
 *     가운데 룰(테두리)과 안쪽 여백만큼 좁다(`PastPaper.module.css` `.column + .column`) — 왼쪽만 재면 오른쪽을 보증 못 한다.
 *     자(`estimateExamProblemPx`)와 배치 자리(`seatExamProblemPx` = 추정 + 안전여유)를 같이 적는다.
 *  ㉡ **실제 배치** — id 차례로 20문항씩 묶어 제품의 `packExamPaper` 로 장 · 단을 나눈 그대로 그리고, 단마다 내용이
 *     쓸 수 있는 세로를 넘었는지 잰다. 한 문항이 제 자리를 넘어도 단에 남는 자리가 있으면 겹치지 않는다 — 겹침은 단이 정한다.
 *     쓸 수 있는 세로는 같은 문서에 빈 장(첫 장 · 이어지는 장)을 그려 잰다(`measure-exam-paper-units.tsx` 와 같은 법 —
 *     `.column` 의 높이는 내용을 따라 늘어나므로 문항이 든 장에서 재면 늘 «안 넘침»이다).
 *
 * 🔴 «참»은 이 지면에서 잰 값이다. 추정은 옆에 적을 뿐 넘침의 판정에 안 쓴다(CLAUDE.md 2026-08-18).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { chromium, type Page } from "@playwright/test";

import type { TestPrintProblem } from "../../src/components/print/types";
import {
  estimateExamProblemPx,
  seatExamProblemPx,
} from "../../src/lib/print/examRuler";
import { packExamPaper } from "../../src/lib/print/packExamPaper";
import {
  assertExamSane,
  EXAM_GUARD,
  examDocument,
  renderExamItem,
  renderExamPage,
  type ExamSlot,
} from "./examPaperProbe";
import { measuredRowsHash } from "./heightCacheManifest";
import { writeProbe } from "./paperProbe";

const prisma = new PrismaClient();

interface Row {
  id: string;
  content: string | null;
  questionType: string | null;
  score: number | null;
  figureUrls: string[];
  figureDims: number[] | null;
  figureSourceMm: number[] | null;
  choiceFigureIndex: number[] | null;
  figureSvg: string | null;
}

const SQL = `SELECT id::text AS id, content, question_type AS "questionType", score,
       figure_urls AS "figureUrls", figure_dims AS "figureDims", figure_source_mm AS "figureSourceMm",
       choice_figure_index AS "choiceFigureIndex", figure_svg AS "figureSvg"
  FROM problem ORDER BY id`;

/** 제품 인쇄 경로가 판정 · 배치에 넘기는 칸을 전부 넘긴다. */
const problemOf = (row: Row, index: number): TestPrintProblem => ({
  id: row.id,
  orderIndex: index,
  content: row.content ?? "",
  answer: "",
  solution: null,
  questionType: row.questionType,
  figureUrls: row.figureUrls,
  figureDims: row.figureDims ?? undefined,
  figureSourceMm: row.figureSourceMm ?? undefined,
  choiceFigureIndex: row.choiceFigureIndex ?? undefined,
  figureSvg: row.figureSvg,
});

const slotOf = (row: Row, number: number): ExamSlot => ({
  id: row.id,
  number,
  content: row.content ?? "",
  questionType: row.questionType,
  score: row.score,
  figureSvg: row.figureSvg,
  figureUrls: row.figureUrls,
  figureDims: row.figureDims ?? undefined,
  figureSourceMm: row.figureSourceMm ?? undefined,
  choiceFigureIndex: row.choiceFigureIndex ?? undefined,
});

/** 기계가 바쁘면 넉넉히 기다리고 두 번 더 연다(`measure-print-overflow.tsx` 의 `gotoPatiently` 와 같은 까닭). */
async function open(page: Page, url: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      break;
    } catch (error) {
      if (attempt >= 3) throw error;
      console.warn(`\n탐침 지면 열기 ${attempt}번째 실패 — 다시 연다`);
    }
  }
  await page.evaluate(() => document.fonts.ready);
  assertExamSane(
    (await page.evaluate(EXAM_GUARD)) as Parameters<typeof assertExamSane>[0],
  );
}

/**
 * 가로로 새는 너비 — 문항 안의 상자마다 «제 폭보다 넓게 그려진 내용»의 최댓값(`measure-print-overflow.tsx` 와 같은 자).
 * 이름 붙은 함수를 만들지 않는다(esbuild `__name` — `paperProbe` 함정 3).
 */
const MEASURE_ITEMS = `(() => Array.from(document.querySelectorAll(".item[data-side]")).map((item) => {
  let ox = 0;
  [item, ...item.querySelectorAll("*:not(.katex *, svg, svg *)")].forEach((el) => {
    if (el.clientWidth > 0 && el.scrollWidth - el.clientWidth > ox) ox = el.scrollWidth - el.clientWidth;
  });
  return [item.getAttribute("data-pid"), item.getAttribute("data-side"), item.getBoundingClientRect().height, ox];
}))()`;

/** 단마다 내용의 세로 — 단 꼭대기에서 마지막 문항 바닥까지. 빈 장의 `.columns` 높이가 쓸 수 있는 세로다. */
const MEASURE_COLUMNS = `(() => {
  const empty = {};
  document.querySelectorAll(".a4Page[data-empty]").forEach((page) => {
    empty[page.getAttribute("data-empty")] = page.querySelector(".columns").getBoundingClientRect().height;
  });
  const out = [];
  document.querySelectorAll(".a4Page[data-exam]").forEach((page) => {
    const top = page.querySelector(".columns").getBoundingClientRect().top;
    page.querySelectorAll(".column").forEach((column, index) => {
      const items = [...column.querySelectorAll(".item")];
      if (!items.length) return;
      const bottom = Math.max(...items.map((it) => it.getBoundingClientRect().bottom));
      out.push({
        exam: Number(page.getAttribute("data-exam")),
        page: Number(page.getAttribute("data-page-number")),
        kind: page.getAttribute("data-kind"),
        column: index,
        pids: items.map((it) => it.getAttribute("data-pid")),
        contentPx: bottom - top,
        capacityPx: empty[page.getAttribute("data-kind")],
      });
    });
  });
  return out;
})()`;

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const take = Number(arg("--take") ?? 0);
  const outPath = arg("--json");
  const examSize = Number(arg("--exam-size") ?? 20);

  let rows = (await prisma.$queryRawUnsafe(SQL)) as Row[];
  if (take > 0) rows = rows.slice(0, take);
  const ground = measuredRowsHash(rows);
  console.log(
    `문항 ${rows.length.toLocaleString()}건 · 기출 2단 · 인쇄 매체 · 시험지 ${examSize}문항씩`,
  );

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  await page.emulateMedia({ media: "print" });

  const items: Array<{
    pid: string;
    side: "L" | "R";
    heightPx: number;
    overflowXPx: number;
  }> = [];
  const columns: Array<{
    exam: number;
    page: number;
    kind: string;
    column: number;
    pids: string[];
    contentPx: number;
    capacityPx: number;
  }> = [];
  try {
    // ㉠ 문항마다 — 한 장에 같은 문항을 왼쪽 · 오른쪽 단에 하나씩.
    const BATCH = 60;
    for (let start = 0; start < rows.length; start += BATCH) {
      const chunk = rows.slice(start, start + BATCH);
      const pages = chunk.map((row, i) => {
        const item = renderExamItem(slotOf(row, 1));
        const side = (s: string) =>
          item.replace('class="item"', `class="item" data-side="${s}"`);
        return renderExamPage(
          "continuation",
          [[side("L")], [side("R")]],
          i + 1,
        );
      });
      await open(
        page,
        writeProbe("exam-overflow-items.html", await examDocument(pages)),
      );
      const got = (await page.evaluate(MEASURE_ITEMS)) as [
        string,
        "L" | "R",
        number,
        number,
      ][];
      if (got.length !== chunk.length * 2)
        throw new Error(`잰 문항 ${got.length} ≠ ${chunk.length * 2} — 멈춘다`);
      for (const [pid, side, heightPx, overflowXPx] of got)
        items.push({ pid, side, heightPx, overflowXPx });
      process.stdout.write(
        `\r㉠ 문항 ${Math.min(start + BATCH, rows.length)}/${rows.length}`,
      );
    }
    console.log("");

    // ㉡ 실제 배치 — 20문항씩 제품이 나눈 장 · 단 그대로.
    const EXAMS_PER_DOC = 10;
    const exams: Row[][] = [];
    for (let start = 0; start < rows.length; start += examSize)
      exams.push(rows.slice(start, start + examSize));
    for (let e = 0; e < exams.length; e += EXAMS_PER_DOC) {
      const docPages: string[] = [];
      exams.slice(e, e + EXAMS_PER_DOC).forEach((exam, k) => {
        const byId = new Map(exam.map((row) => [row.id, row]));
        const number = new Map(exam.map((row, i) => [row.id, i + 1]));
        packExamPaper(exam.map(problemOf)).pages.forEach((packed, p) => {
          const kind = p === 0 ? "first" : "continuation";
          const html = renderExamPage(
            kind,
            packed.columns.map((col) =>
              col.map((problem) =>
                renderExamItem(
                  slotOf(byId.get(problem.id)!, number.get(problem.id)!),
                ),
              ),
            ),
            p + 1,
          );
          docPages.push(
            html.replace(
              '<section class="a4Page page"',
              `<section data-exam="${e + k}" data-kind="${kind}" class="a4Page page"`,
            ),
          );
        });
      });
      // 쓸 수 있는 세로 — 빈 장 둘(첫 장 · 이어지는 장).
      for (const kind of ["first", "continuation"] as const)
        docPages.push(
          renderExamPage(kind, [[], []], 1).replace(
            '<section class="a4Page page"',
            `<section data-empty="${kind}" class="a4Page page"`,
          ),
        );
      await open(
        page,
        writeProbe("exam-overflow-packed.html", await examDocument(docPages)),
      );
      columns.push(
        ...((await page.evaluate(MEASURE_COLUMNS)) as typeof columns),
      );
      process.stdout.write(
        `\r㉡ 시험지 ${Math.min(e + EXAMS_PER_DOC, exams.length)}/${exams.length}`,
      );
    }
    console.log("");
  } finally {
    await browser.close();
  }

  let after = (await prisma.$queryRawUnsafe(SQL)) as Row[];
  if (take > 0) after = after.slice(0, take);
  if (measuredRowsHash(after) !== ground)
    throw new Error(
      "재는 동안 DB 가 바뀌었다 — 앞뒤가 다른 지면을 섞어 쟀으니 버린다",
    );

  const byId = new Map(rows.map((row, i) => [row.id, problemOf(row, i)]));
  const rowsOut = items.map((it) => {
    const problem = byId.get(it.pid)!;
    return {
      ...it,
      estimatePx: estimateExamProblemPx(problem),
      seatPx: seatExamProblemPx(problem),
    };
  });
  const overSeat = (side: "L" | "R") =>
    rowsOut.filter((r) => r.side === side && r.heightPx > r.seatPx).length;
  const overflowing = columns.filter((c) => c.contentPx > c.capacityPx + 0.5);
  console.log(
    `㉠ 배치 자리(추정 + 안전여유)를 넘는 문항 — 왼쪽 단 ${overSeat("L")} · 오른쪽 단 ${overSeat("R")}`,
  );
  console.log(
    `   가로로 새는 문항(1px 넘게) — 왼쪽 ${rowsOut.filter((r) => r.side === "L" && r.overflowXPx > 1).length} · 오른쪽 ${rowsOut.filter((r) => r.side === "R" && r.overflowXPx > 1).length}`,
  );
  console.log(
    `㉡ 시험지 ${Math.ceil(rows.length / examSize).toLocaleString()}개 · 단 ${columns.length.toLocaleString()}개 중 넘친 단 ${overflowing.length}`,
  );
  for (const c of overflowing.slice(0, 10))
    console.log(
      `   · 시험지 ${c.exam} ${c.page}쪽 ${c.column + 1}단 ${(c.contentPx - c.capacityPx).toFixed(1)}px — 마지막 ${c.pids.at(-1)}`,
    );

  if (outPath) {
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify({ rows: rowsOut, columns }), "utf8");
    console.log(`→ ${outPath}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
