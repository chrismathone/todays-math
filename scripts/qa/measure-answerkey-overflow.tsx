/**
 * 정답지(해설) 지면이 **잘리는 양**을 실측한다 (읽기 전용 · DB 읽기만).
 *
 * `.answerSolutions` 는 `column-count:2` + `overflow:hidden` 이라, 높이를 넘긴 해설은
 * **3번째 단**으로 밀려 지면 밖에서 통째로 사라진다(문항 하나가 통으로 없어진다).
 * `paginateAnswerKey` 는 장당 8건 고정이고, **1쪽에는 빠른 정답 상자가 더 얹힌다**
 * (문항 수에 비례해 커진다). 넘침 경고는 `content` 만 보고 `solution` 은 안 본다.
 *
 *   npx tsx --require ./scripts/qa/css-module-stub.cjs scripts/qa/measure-answerkey-overflow.tsx --tests 120 --count 25
 *   npx tsx --require ./scripts/qa/css-module-stub.cjs scripts/qa/measure-answerkey-overflow.tsx --with-solution --shot out.png
 *   npx tsx --require ./scripts/qa/css-module-stub.cjs scripts/qa/measure-answerkey-overflow.tsx --with-solution --json .measure/ak.json
 *
 * ⚠️ 이 수는 **장을 쪼개지 않는 길**의 것이다(기출 교사용 정답지 `PastPaperPrint`). 자습 · 확인테스트(`TestPrint`)는
 *    그린 뒤 실제 DOM 을 재서 넘친 장을 쪼갠다(`splitOverflowingAnswerPages` · 2026-10-18) — 거기서는 잃지 않고 장이 는다.
 *    잘림 판정은 그 쪼개기와 **같은 식**이다(해설 2단 상자 밖에 조각 하나라도 있으면).
 *
 * ⚠️ 2026-08-18 추가: 장 단위 «잘렸다/아니다» 만으로는 **판정을 만들 수 없다.**
 *    어느 문항이 사라졌는지가 있어야 «solution 으로 예측할 수 있는가»를 채점한다.
 *    그래서 `.solutionItem` 하나하나가 2단 밖(3번째 단)으로 밀렸는지도 같이 낸다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";

import { PrintAnswerKeyPage } from "../../src/components/print/PrintAnswerKeyPage";
import type { TestPrintProblem } from "../../src/components/print/types";
import { paginateAnswerKey } from "../../src/lib/printLayout";
import {
  assertFontsLoaded,
  FONT_GUARD,
  paperStyles,
  writeProbe,
} from "./paperProbe";

const prisma = new PrismaClient();

/** 글꼴 가드 — 정답지 해설 본문이 지면 명조로 풀리는가(`paperProbe.FONT_GUARD` 를 `.solutionBody` 에 댄다). */
const ANSWER_FONT_GUARD = `(() => {
  const text = document.querySelector(".solutionBody");${FONT_GUARD}
  return fonts;
})()`;

/**
 * 제품의 `PrintAnswerKeyPage` 를 **그대로** 그린다.
 *
 * 🔴 2026-10-21(D-164 ② · Codex 검토) 전에는 그 DOM 을 손으로 지었고 셋이 갈려 있었다 — 지면 변수를 `style` 속성에 그대로
 *    끼워 글꼴 스택의 첫 따옴표에서 속성이 끊겼고(`paperProbe.PAPER_VARS_ATTR` 의 함정 — 본문이 지면 명조가 아니었다),
 *    «빠른 정답» 상자를 해설 2단 **밖**에 두었고(제품은 안쪽 첫머리), 답을 머리 줄에 붙였다(제품은 따로 한 줄).
 *    CSS 모듈 이름은 `css-module-stub.cjs` 가 원문 이름으로 풀어 탐침이 싣는 `TestPrint.module.css` 원문과 맞는다.
 */
function renderAnswerPage(
  all: TestPrintProblem[],
  pageProblems: TestPrintProblem[],
  pageNumber: number,
  startingNumber: number,
  totalPages: number,
  tag: string,
): string {
  return renderToStaticMarkup(
    <PrintAnswerKeyPage
      allProblems={all}
      pageProblems={pageProblems}
      page={pageNumber}
      startingNumber={startingNumber}
      testTitle="일일테스트 · 이차방정식"
      totalPages={totalPages}
    />,
  ).replace(
    "<section ",
    `<section data-tag="${tag}" data-page="${pageNumber}" `,
  );
}

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const nTests = Number(arg("--tests") ?? 120);
  const perTest = Number(arg("--count") ?? 25);
  const shotPath = arg("--shot");
  const onlyWithSolution = process.argv.includes("--with-solution");

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, answer, solution FROM problem ${onlyWithSolution ? "WHERE solution IS NOT NULL" : ""} ORDER BY id`,
  )) as Array<{ id: string; answer: string; solution: string | null }>;
  console.log(
    `풀 ${rows.length.toLocaleString()}건 → 시험지 ${nTests}개 × ${perTest}문항${onlyWithSolution ? " (해설 있는 문항만)" : ""}`,
  );

  // 시험지마다 다른 구간을 뽑는다(무작위를 쓰지 않아 재실행이 같은 결과를 낸다).
  const pick = (k: number) => {
    const start = (k * perTest * 7) % Math.max(1, rows.length - perTest);
    return rows.slice(start, start + perTest).map((r, i) => ({
      id: r.id,
      orderIndex: i + 1,
      content: "",
      answer: r.answer ?? "",
      solution: r.solution,
    })) as TestPrintProblem[];
  };

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1200 },
  });
  await page.emulateMedia({ media: "print" });
  const styles = await paperStyles();

  let clipped = 0;
  let total = 0;
  const worst: Array<{ test: number; page: number; ratio: number }> = [];
  /** 채점용 산출물 — 쪽마다 «어느 문항이 사라졌는가». */
  const pageLog: Array<{
    test: number;
    page: number;
    ids: string[];
    lost: string[];
    heights: number[];
    quickCells: number[];
    columnPx: number;
  }> = [];
  const BATCH = 20;
  try {
    for (let t = 0; t < nTests; t += BATCH) {
      const sections: string[] = [];
      for (let k = t; k < Math.min(t + BATCH, nTests); k += 1) {
        const picked = pick(k);
        const pages = paginateAnswerKey(picked);
        pages.forEach((p, i) =>
          sections.push(
            renderAnswerPage(
              picked,
              p.problems,
              i + 1,
              p.startingNumber,
              pages.length,
              String(k),
            ),
          ),
        );
      }
      const url = writeProbe(
        "probe-answerkey.html",
        `<!doctype html><html><head><meta charset="utf-8">${styles}<style>body{margin:0}</style></head><body>${sections.join("\n")}</body></html>`,
      );
      await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      await page.evaluate(() => document.fonts.ready);
      assertFontsLoaded(
        (await page.evaluate(ANSWER_FONT_GUARD)) as Parameters<
          typeof assertFontsLoaded
        >[0],
      );
      const res = (await page.evaluate(() => {
        const out: Array<{
          tag: number;
          page: number;
          clientW: number;
          scrollW: number;
          lost: number[];
          heights: number[];
          quickCells: number[];
          columnPx: number;
        }> = [];
        document.querySelectorAll(".a4Page").forEach((section) => {
          const el = section.querySelector(".answerSolutions") as HTMLElement;
          const box = el.getBoundingClientRect();
          const lost: number[] = [];
          const heights: number[] = [];
          el.querySelectorAll(".solutionItem").forEach((node, index) => {
            const item = node as HTMLElement;
            // 다단에서 넘친 항목은 **3번째 단**(상자 오른쪽 밖)이나 상자 아래로 밀려 지면에서 사라진다.
            // 판정은 제품 `TestPrint` 의 쪼개기와 같은 식 — 조각(줄 상자) 하나라도 상자 밖이면.
            if (
              [...item.getClientRects()].some(
                (rect) =>
                  rect.left >= box.right - 1 ||
                  rect.right > box.right + 1 ||
                  rect.bottom > box.bottom + 1,
              )
            )
              lost.push(index);
            // 항목 높이는 **이 지면 안에서** 재야 한다 — 따로 떼어 재면 글꼴 문맥이
            // 달라져 조용히 다른 값이 나온다(실제로 그래서 자가 20% 짧았다).
            heights.push(
              item.getBoundingClientRect().height +
                parseFloat(getComputedStyle(item).marginBottom),
            );
          });
          // 「빠른 정답」 상자는 1쪽에만 있고, 셀 높이가 **정답의 수식**에 달렸다
          // (실측 25문항에서 상자 높이가 344~668px 로 갈린다).
          const quickCells: number[] = [];
          (section as HTMLElement)
            .querySelectorAll(".quickAnswerCell")
            .forEach((cell) => {
              quickCells.push(
                (cell as HTMLElement).getBoundingClientRect().height,
              );
            });
          const style = getComputedStyle(el);
          out.push({
            tag: Number((section as HTMLElement).dataset.tag),
            page: Number((section as HTMLElement).dataset.page),
            clientW: el.clientWidth,
            scrollW: el.scrollWidth,
            lost,
            heights,
            quickCells,
            columnPx:
              el.clientHeight -
              parseFloat(style.paddingTop) -
              parseFloat(style.paddingBottom),
          });
        });
        return out;
      })) as Array<{
        tag: number;
        page: number;
        clientW: number;
        scrollW: number;
        lost: number[];
        heights: number[];
        quickCells: number[];
        columnPx: number;
      }>;
      for (const r of res) {
        total += 1;
        const picked = pick(r.tag);
        const pages = paginateAnswerKey(picked);
        const ids = pages[r.page - 1]!.problems.map((p) => p.id);
        pageLog.push({
          test: r.tag,
          page: r.page,
          ids,
          lost: r.lost.map((index) => ids[index]!),
          heights: r.heights,
          quickCells: r.quickCells,
          columnPx: r.columnPx,
        });
        // 다단에서 높이를 넘긴 내용은 **가로로** 단을 더 만들고 그게 잘린다 — 잃은 해설이 있는 장을 센다.
        if (r.lost.length > 0) {
          clipped += 1;
          worst.push({
            test: r.tag,
            page: r.page,
            ratio: r.scrollW / r.clientW,
          });
        }
      }
    }
    worst.sort((a, b) => b.ratio - a.ratio);

    if (shotPath && worst.length > 0) {
      const w = worst[0]!;
      const picked = pick(w.test);
      const pages = paginateAnswerKey(picked);
      const target = pages[w.page - 1]!;
      const url = writeProbe(
        "probe-answerkey-shot.html",
        `<!doctype html><html><head><meta charset="utf-8">${styles}<style>body{margin:0}</style></head><body>${renderAnswerPage(picked, target.problems, w.page, target.startingNumber, pages.length, String(w.test))}</body></html>`,
      );
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      mkdirSync(path.dirname(shotPath), { recursive: true });
      await page.locator(".a4Page").screenshot({ path: shotPath });
      console.log(`→ ${shotPath}`);
    }
  } finally {
    await browser.close();
  }

  console.log(
    `정답지 ${total}장 중 해설이 잘린 장 ${clipped} (${((clipped * 100) / total).toFixed(1)}%)`,
  );
  console.log(
    `  그중 1쪽(빠른 정답 상자가 얹힌 장) ${worst.filter((w) => w.page === 1).length}장 / 1쪽 총 ${nTests}장`,
  );
  const lostItems = pageLog.reduce((n, p) => n + p.lost.length, 0);
  const items = pageLog.reduce((n, p) => n + p.ids.length, 0);
  console.log(
    `해설 ${items.toLocaleString()}건 중 지면 밖으로 밀린 것 ${lostItems.toLocaleString()} (${((lostItems * 100) / Math.max(1, items)).toFixed(2)}%)`,
  );

  const jsonPath = arg("--json");
  if (jsonPath) {
    mkdirSync(path.dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, JSON.stringify(pageLog), "utf8");
    console.log(`→ ${jsonPath}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
