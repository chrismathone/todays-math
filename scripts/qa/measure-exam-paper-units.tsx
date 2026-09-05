/**
 * 기출 2단 지면의 **자**를 지면에서 뽑는다 (읽기 전용 · DB 는 SELECT 만).
 *
 *   npx tsx scripts/qa/measure-exam-paper-units.tsx
 *
 * 여기서 나오는 값이 곧 `printGeometry.ts` 의 `EXAM_MEASURED_PX` 다.
 * 지면 CSS(`PastPaper.module.css`)를 바꿨으면 **이 스크립트로 다시 뽑아** 상수를
 * 갱신할 것 — 손으로 고치지 말 것.
 *
 * ## 무엇을 재나
 *
 *  ㉠ **단 폭·높이** — 첫 장(머리말이 얹혀 좁다)과 이어지는 장 둘 다.
 *     ⚠️ 단 높이를 `.column` 의 `clientHeight` 로 재면 **내용에 따라 늘어난다**
 *        (`paperProbe` 가 이미 밟은 함정 (4)). 그래서 **문항을 하나도 안 넣고** 잰다 —
 *        빈 `.columns` 가 `flex:1` 로 차지하는 높이가 곧 쓸 수 있는 세로다.
 *  ㉡ **머리띠·여백** — 자가 본문과 무관하게 늘 더해야 하는 세로.
 *  ㉢ **문항 19개의 실제 높이** — 자를 채점할 «참»이다.
 *
 * ## 🔴 참이 제품 상수에서 오면 안 된다
 *
 * 문항 높이는 **잰 값**이지 `estimateProblemPx` 가 낸 값이 아니다. 자를 채점할 때
 * 이 둘을 견주는 것이 이 스크립트의 전부다 — 채점의 정답을 제품에서 가져오면
 * 제품이 틀릴수록 점수가 오른다(CLAUDE.md 2026-08-18).
 */
import { chromium } from "@playwright/test";

import { db } from "../../src/lib/db";
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
    },
  });
  if (rows.length === 0) {
    console.error(`${EXAM_ID} 문항이 DB 에 없다 — 측정 중단`);
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
  }));

  /**
   * 자의 «폭» 부분을 재려는 표본. `measure-paper-units.tsx` 와 **같은 모양**을 쓴다 —
   * 자습 값과 곧바로 견줄 수 있어야 「이 단이 얼마나 좁은가」가 숫자로 나온다.
   */
  const FIXTURES: ExamSlot[] = [
    { id: "plain-1line", number: 901, content: "가".repeat(20) },
    {
      id: "choices-one-col-20",
      number: 902,
      content: `다음 중 옳은 것은?\n1. ${"가".repeat(20)}\n2. ${"나".repeat(20)}\n3. ${"다".repeat(20)}\n4. ${"라".repeat(20)}\n5. ${"마".repeat(20)}`,
    },
    {
      id: "box-two-items-30",
      number: 903,
      content: `다음 <보기> 에서 옳은 것을 고르시오.\n<보기>\nㄱ. ${"가".repeat(30)}\nㄴ. ${"나".repeat(30)}`,
    },
  ];

  // ㉠ 빈 지면 두 장 — 단 높이는 «내용이 없을 때»가 참이다.
  // ㉡ 문항 **둘**을 한 단에 넣은 장 — 사이 여백은 `:last-child` 가 아닌 문항에만 있다.
  //    🔴 처음엔 이 장이 없어서 사이 여백이 **0.00px** 로 찍혔다. 모든 문항이
  //       제 단에 혼자였으니 전부 `:last-child` 였던 것이다. 그 0 을 자에 넣었으면
  //       단마다 문항이 한둘 더 들어간다고 세어 **겹쳐 찍혔다.**
  // ㉢ 문항 지면 — 한 문항씩 제 단에 혼자 넣어 서로 밀지 않게 한다.
  const pages = [
    renderExamPage("first", [[], []], 1),
    renderExamPage("continuation", [[], []], 2),
    renderExamPage(
      "continuation",
      [[renderExamItem(slots[0]!), renderExamItem(slots[1]!)], []],
      3,
    ),
    ...slots.map((s, i) =>
      renderExamPage("continuation", [[renderExamItem(s)], []], 4 + i),
    ),
    ...FIXTURES.map((s, i) =>
      renderExamPage(
        "continuation",
        [[renderExamItem(s)], []],
        4 + slots.length + i,
      ),
    ),
  ];

  const html = await examDocument(pages);
  const url = writeProbe("exam-units.html", html);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  await page.emulateMedia({ media: "print" }); // 함정 (2)
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(400);

  assertExamSane(await page.evaluate(EXAM_GUARD));

  const geom = await page.evaluate(`(() => {
    const pages = Array.from(document.querySelectorAll(".a4Page"));
    const read = (root) => {
      const cols = root.querySelector(".columns");
      const col = root.querySelector(".column");
      const cs = cols ? getComputedStyle(cols) : null;
      return {
        columnsHeight: cols ? cols.getBoundingClientRect().height : 0,
        columnWidth: col ? col.getBoundingClientRect().width : 0,
        gap: cs ? parseFloat(cs.columnGap) : 0,
      };
    };
    const first = read(pages[0]);
    const cont = read(pages[1]);
    const band = document.querySelector(".bandRow");
    const item = document.querySelector(".item");
    const text = document.querySelector(".problemText");
    const bandCs = band ? getComputedStyle(band) : null;
    const itemCs = item ? getComputedStyle(item) : null;
    // 사이 여백 — 한 단에 문항이 둘 이상인 지면에서, **마지막이 아닌** 문항의 값.
    const pair = Array.from(document.querySelectorAll('.column')).find(
      (c) => c.querySelectorAll('.item').length > 1,
    );
    const notLast = pair ? pair.querySelector('.item') : null;
    return {
      first, cont,
      bandHeight: band ? band.getBoundingClientRect().height : 0,
      bandMarginBottom: bandCs ? parseFloat(bandCs.marginBottom) : 0,
      itemGap: notLast ? parseFloat(getComputedStyle(notLast).marginBottom) : null,
      lastItemGap: itemCs ? parseFloat(itemCs.marginBottom) : null,
      lineHeight: text ? parseFloat(getComputedStyle(text).lineHeight) : 0,
      fontSize: text ? parseFloat(getComputedStyle(text).fontSize) : 0,
    };
  })()`);

  // 자의 «폭» 부분 — `measure-paper-units.tsx` 와 같은 자리를 같은 방식으로 잰다.
  const widths = (await page.evaluate(`(() => {
    const res = {};
    const pid = (id) => document.querySelector('[data-pid="' + id + '"]');
    const ruler = document.createElement("div");
    ruler.className = "problemText";
    ruler.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;width:max-content";
    ruler.textContent = "가";
    document.body.appendChild(ruler);
    res.unitPx = ruler.getBoundingClientRect().width / 2;  // 한글 한 글자 = 표시폭 2
    ruler.remove();

    const plainBody = pid("plain-1line").querySelector("[data-paper-view]");
    res.columnPx = plainBody.firstElementChild.getBoundingClientRect().width;

    const oneCol = pid("choices-one-col-20").querySelector("[data-paper-view]");
    const grid = Array.from(oneCol.firstElementChild.children).find((c) =>
      c.className.includes("mt-4"),
    );
    res.choiceTextPx = grid.children[0].lastElementChild.getBoundingClientRect().width;
    res.choiceGridTopPx = parseFloat(getComputedStyle(grid).marginTop);
    res.choiceRowGapPx = parseFloat(getComputedStyle(grid).rowGap);

    const box = pid("box-two-items-30").querySelector("[data-box-card]");
    const bs = getComputedStyle(box);
    res.boxItemPx = box.querySelector("[data-box-item]").getBoundingClientRect().width;
    let itemsPx = 0;
    box.querySelectorAll("[data-box-item]").forEach((el) => {
      itemsPx += el.getBoundingClientRect().height;
    });
    res.boxChromePx =
      box.getBoundingClientRect().height +
      parseFloat(bs.marginTop) +
      parseFloat(bs.marginBottom) -
      itemsPx;
    return res;
  })()`)) as Record<string, number>;

  const heights = (await page.evaluate(`(() => {
    return Array.from(document.querySelectorAll(".item"))
      .filter((el) => Number(el.getAttribute("data-number")) < 900)
      .map((el) => [
        el.getAttribute("data-number"),
        el.getBoundingClientRect().height,
      ]);
  })()`)) as [string, number][];

  await browser.close();

  const g = geom as {
    first: { columnsHeight: number; columnWidth: number; gap: number };
    cont: { columnsHeight: number; columnWidth: number; gap: number };
    bandHeight: number;
    bandMarginBottom: number;
    itemGap: number | null;
    lastItemGap: number | null;
    lineHeight: number;
    fontSize: number;
  };

  console.log("── 기출 2단 지면 실측 (인쇄 매체) ──");
  console.log(`  단 폭            ${g.cont.columnWidth.toFixed(2)}px`);
  console.log(`  단 사이          ${g.cont.gap.toFixed(2)}px`);
  console.log(`  첫 장 단 높이     ${g.first.columnsHeight.toFixed(2)}px`);
  console.log(`  이어지는 장 단    ${g.cont.columnsHeight.toFixed(2)}px`);
  console.log(
    `  머리띠           ${g.bandHeight.toFixed(2)}px + 아래 ${g.bandMarginBottom.toFixed(2)}px`,
  );
  if (g.itemGap === null)
    throw new Error(
      "사이 여백을 잴 자리가 없다(한 단에 문항이 둘인 지면). 0 으로 세면 겹쳐 찍힌다",
    );
  console.log(
    `  문항 사이 여백    ${g.itemGap.toFixed(2)}px (마지막 문항 뒤 ${(g.lastItemGap ?? -1).toFixed(2)}px)`,
  );
  console.log(
    `  본문 행높이       ${g.lineHeight.toFixed(4)}px (${g.fontSize}px)`,
  );
  const unit = widths.unitPx!;
  console.log(
    `\n  «자» — 셋이 서로 다르다 (1 표시단위 = ${unit.toFixed(3)}px)\n` +
      `    문항 열        ${widths.columnPx!.toFixed(1)}px = ${(widths.columnPx! / unit).toFixed(1)}단위  → problemColumn\n` +
      `    1열 보기 글자칸 ${widths.choiceTextPx!.toFixed(1)}px = ${(widths.choiceTextPx! / unit).toFixed(1)}단위  → choiceTextColumn\n` +
      `    상자 항목칸    ${widths.boxItemPx!.toFixed(1)}px = ${(widths.boxItemPx! / unit).toFixed(1)}단위  → boxItemColumn\n` +
      `    상자 chrome    ${widths.boxChromePx!.toFixed(1)}px → boxChrome\n` +
      `    보기 mt-4 ${widths.choiceGridTopPx}px · 행 간격 ${widths.choiceRowGapPx}px → choiceGridTop · choiceRowGap`,
  );
  console.log(
    `    머리띠 고정분   ${(g.bandHeight + g.bandMarginBottom).toFixed(2)}px → fixedChrome (자습의 문항번호+정답란 자리)`,
  );

  if (g.first.columnsHeight >= g.cont.columnsHeight)
    console.log(
      "  ⚠️ 첫 장이 이어지는 장보다 좁지 않다 — 머리말이 안 붙었을 수 있다",
    );

  console.log("\n── 문항 19개 실제 높이 ──");
  const byNumber = new Map(heights.map(([n, h]) => [Number(n), h]));
  const sorted = [...byNumber.entries()].sort((a, b) => a[0] - b[0]);
  for (const [n, h] of sorted) {
    const over = h > g.cont.columnsHeight ? "  ← 한 단보다 크다" : "";
    console.log(
      `  문 ${String(n).padStart(2)}  ${h.toFixed(1).padStart(7)}px${over}`,
    );
  }
  const total = sorted.reduce((s, [, h]) => s + h, 0);
  console.log(
    `\n  합계 ${total.toFixed(0)}px · 단 ${(total / g.cont.columnsHeight).toFixed(2)}칸분`,
  );
  if (sorted.length !== rows.length)
    console.log(
      `  ⚠️ 잰 문항이 ${sorted.length}개인데 DB 는 ${rows.length}개다 — 빠진 것을 세라`,
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
