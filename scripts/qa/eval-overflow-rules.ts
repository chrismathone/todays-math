/**
 * 넘침 **경고 규칙**을 실측 높이와 대조한다 — 재현율·헛것을 한계값별로 훑는다.
 *
 * 왜 따로 있나: 지면을 Chromium 으로 그리는 데 전수 30분이 걸린다. 그런데 판정만
 * 고치는 동안 **지면은 한 글자도 안 바뀐다.** 그래서 높이는 한 번만 재서 파일로 두고
 * (`measure-print-overflow.tsx --json`), 규칙은 여기서 몇 번이고 다시 채점한다.
 *
 *   npx tsx scripts/qa/measure-print-overflow.tsx --json .measure/cont.json
 *   npx tsx scripts/qa/measure-print-overflow.tsx --first-page --json .measure/first.json
 *   npx tsx scripts/qa/eval-overflow-rules.ts --heights .measure/cont.json
 *   npx tsx scripts/qa/eval-overflow-rules.ts --heights .measure/first.json --first-page
 *   npx tsx scripts/qa/eval-overflow-rules.ts --sweep 10,12,14,16,18,20,22,24,26
 *
 * `--dims-file` 은 DB 에 적재하기 **전에** 「치수를 알면 얼마나 좋아지는가」를 미리
 * 재는 자리다(`extract-figure-dimensions.ts` 산출물). 공유 DB 를 건드리기 전에
 * 이득이 실제로 있는지부터 확인한다. `--no-dims` 는 반대쪽 — 전부 «모른다»로 본다.
 *
 * ⚠️ **지면 배치를 바꾸는 수리(예: `displayWidth` → `fitsTwoColumns` → 보기 열 수)를
 *    한 뒤에는 캐시가 거짓이 된다.** 그때는 다시 재야 한다. 이 스크립트는 캐시 파일의
 *    문항 수가 DB 와 어긋나면 멈춘다.
 *
 * ⚠️ 채점기가 제품과 갈라지면 «세는 쪽과 고치는 쪽이 같이 눈이 먼다»(CLAUDE.md
 *    2026-08-18). 그래서 제품 상수값에서 이 스크립트의 판정과
 *    제품의 자리 판단(`assessSeat`)이 **한 건도 다르지 않은지** 매 실행 검산한다.
 */
import { readFileSync } from "node:fs";

import {
  assertHeightCacheFresh,
  measuredRowsHash,
} from "./heightCacheManifest";

import { PrismaClient } from "@prisma/client";

import type { TestPrintProblem } from "../../src/components/print/types";
import { displayWidth, fitsTwoColumns } from "../../src/lib/math/displayWidth";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";
import { JASEUP_MEASURED_PX } from "../../src/lib/printGeometry";
import {
  OVERFLOW_MARGIN_PX,
  OVERFLOW_WIDTH_LIMIT,
  assessSeat,
  estimateFigureBlockPx,
  parseFigureDimensions,
} from "../../src/lib/printOverflow";

const prisma = new PrismaClient();

/**
 * **수리 전 «자»를 얼려 둔 사본** (2026-08-18 이전 `estimateProblemLines`).
 * 그림을 0줄로 세고, 문항 열·보기·상자를 전부 59단위로 보고, 문항번호·정답란·
 * 보기 그리드 여백을 안 센다. 여기 손대지 말 것 — 전후 비교의 기준선이다.
 */
function legacyLines(content: string): number {
  const LEGACY_UNITS = 59;
  const LEGACY_BOX_CHROME = 2;
  const lineOf = (text: string) => {
    const width = displayWidth(text);
    return width <= 0 ? 0 : Math.ceil(width / LEGACY_UNITS);
  };
  const { question, choices } = parseProblemContent(content);
  let lines = 0;
  let plain: string[] = [];
  let box: string[] | null = null;
  const flushPlain = () => {
    for (const part of plain) lines += Math.max(1, lineOf(part));
    plain = [];
  };
  const flushBox = () => {
    if (box === null) return;
    const paras = box
      .join("\n")
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
    const header = paras[0] ?? "";
    const items = paras.slice(1);
    const cols = Number(header.match(/(\d+)\s*[>〉】］\]]/)?.[1] ?? 1);
    const headerless = header.startsWith("<나열");
    lines += LEGACY_BOX_CHROME + (headerless ? 0 : 1);
    if (headerless) items.unshift(header.replace(/^<나열\d?>\s*/, ""));
    lines +=
      cols >= 2
        ? Math.ceil(items.length / cols)
        : items.reduce((sum, item) => sum + Math.max(1, lineOf(item)), 0);
    box = null;
  };
  for (const raw of question.split(/\r?\n/)) {
    const trimmed = raw.trimStart();
    if (trimmed.startsWith(">")) {
      flushPlain();
      if (box === null) box = [];
      box.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }
    flushBox();
    if (trimmed) plain.push(trimmed);
  }
  flushPlain();
  flushBox();
  if (choices.length > 0)
    lines += fitsTwoColumns(choices)
      ? Math.ceil(choices.length / 2)
      : choices.reduce((sum, c) => sum + Math.max(1, lineOf(c)), 0);
  return lines;
}

interface Height {
  pid: string;
  availPx: number;
  neededPx: number;
  figurePx: number;
  choicePx: number;
  boxPx: number;
}

interface Row {
  id: string;
  content: string;
  figureUrls: string[];
  figureDims: number[] | null;
  /**
   * 그림 원본 지면 물리 폭(mm). 제품 지면은 이걸로 폭을 못 박으므로 **채점도 같이 봐야
   * 한다** — 안 보면 판정만 «모른다»로 재서 지면과 갈린다(2026-08-20).
   */
  figureSourceMm: number[] | null;
  /** 보기 그림의 짝 — 알면 지면이 달라진다. 측정기 · 지문과 같이 본다(2026-10-03 B1). */
  choiceFigureIndex: number[] | null;
  solution: string | null;
  questionType: string | null;
  /** 엔진 SVG 그림 — 측정기 · 판정 · 지문이 같이 본다(D-164 ② — 측정기가 이제 그린다). */
  figureSvg: string | null;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** 한계값 하나로 채점한 결과. */
interface Score {
  warned: number;
  hit: number;
  falseAlarm: number;
  missed: number;
}

function score(rows: Array<{ overflows: boolean; warned: boolean }>): Score {
  let warned = 0;
  let hit = 0;
  let falseAlarm = 0;
  let missed = 0;
  for (const r of rows) {
    if (r.warned) warned += 1;
    if (r.overflows && r.warned) hit += 1;
    if (!r.overflows && r.warned) falseAlarm += 1;
    if (r.overflows && !r.warned) missed += 1;
  }
  return { warned, hit, falseAlarm, missed };
}

async function main() {
  const heightsPath = arg("--heights") ?? ".measure/cont.json";
  const firstPage = process.argv.includes("--first-page");
  const sweep = (arg("--sweep") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  /**
   * 그림 치수의 출처. 기본은 DB 컬럼이고, `--dims-file` 이면 추출 파일에서 가져온다
   * (적재 전 이득 측정). `--no-dims` 는 전부 «모른다»로 두는 반대편 대조군이다.
   */
  const dimsFile = arg("--dims-file");
  const noDims = process.argv.includes("--no-dims");
  const fileDims: Record<string, [number, number]> = dimsFile
    ? (JSON.parse(readFileSync(dimsFile, "utf8")) as Record<
        string,
        [number, number]
      >)
    : {};

  const heights = JSON.parse(readFileSync(heightsPath, "utf8")) as Height[];
  const rows = (await prisma
    .$queryRawUnsafe(
      `SELECT id, content, figure_urls AS "figureUrls", figure_dims AS "figureDims",
              figure_source_mm AS "figureSourceMm",
              choice_figure_index AS "choiceFigureIndex", solution,
              question_type AS "questionType", figure_svg AS "figureSvg"
       FROM problem ORDER BY id`,
    )
    .catch(
      async () =>
        // figure_dims 컬럼이 아직 없는 시점에도 돌아야 한다 (마이그레이션 전 측정).
        (await prisma.$queryRawUnsafe(
          `SELECT id, content, figure_urls AS "figureUrls", NULL::int[] AS "figureDims",
                NULL::double precision[] AS "figureSourceMm",
                NULL::int[] AS "choiceFigureIndex", solution,
                question_type AS "questionType", NULL::text AS "figureSvg"
         FROM problem ORDER BY id`,
        )) as Row[],
    )) as Row[];

  /** 이 문항의 그림 치수 평탄 배열 — 출처 선택을 한 곳에 모은다. */
  const flatDimsFor = (row: Row): number[] | undefined => {
    if (noDims) return undefined;
    if (!dimsFile) return row.figureDims ?? undefined;
    const pairs = row.figureUrls.map((url) => fileDims[url]);
    if (pairs.some((p) => !p)) return undefined; // 한 장이라도 모르면 통째로 모른다
    return pairs.flatMap((p) => p!);
  };

  /**
   * 그림의 **물리 폭(mm)**. 제품 지면은 이걸로 폭을 못 박으므로 자도 같이 봐야 한다.
   * `--no-dims`(전부 «모른다»로 보기)일 때는 mm 도 «모른다» — 안 그러면 그 팔이
   * 반쪽만 모르는 상태가 되어 무엇을 재는지 알 수 없다.
   */
  const sourceMmFor = (row: Row): number[] | undefined =>
    noDims ? undefined : (row.figureSourceMm ?? undefined);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const missingRows = heights.filter((h) => !byId.has(h.pid)).length;
  if (missingRows > 0)
    throw new Error(
      `캐시에 있는 문항 ${missingRows}건이 DB 에 없다 — 캐시가 낡았다. 다시 재라.`,
    );

  /**
   * **«넘쳤는가»의 참은 캐시가 실측한 칸(`availPx`)이다.** 예전에는 제품 상수
   * (`JASEUP_MEASURED_PX.continuationSlot`)로 갈랐는데, 그 상수는 한계값을
   * 유도하는 바로 그 값이라 **참과 규칙이 같이 움직였다** — 484 를 600 으로
   * 망가뜨리면 「실측 넘침 2,726 → 715 · 재현율 96.1% → 97.1%」로 **성적이 올랐다**
   * (적대적 리뷰 ④ E). 지금은 상수가 지면과 어긋나면 아래에서 멈춘다.
   */
  const slots = [...new Set(heights.map((h) => h.availPx))];
  if (slots.length !== 1)
    throw new Error(
      `캐시의 문항 칸이 ${slots.length}가지다(${slots.slice(0, 5).join(", ")}) — 캐시가 섞였다.`,
    );
  const slot = slots[0]!;
  const constant = firstPage
    ? JASEUP_MEASURED_PX.firstPageSlot
    : JASEUP_MEASURED_PX.continuationSlot;
  if (slot !== constant)
    throw new Error(
      `실측 문항 칸 ${slot}px 과 제품 상수 ${constant}px 이 다르다 — 한계값이 지면과 어긋난 값에서 유도되고 있다.
` +
        `캐시가 ${firstPage ? "첫 장" : "이어지는 장"} 것이 맞는지 먼저 보고, 맞다면 JASEUP_MEASURED_PX 를 고쳐라.`,
    );

  /**
   * 캐시가 **지금 지면**을 보고 잰 것인지 지문으로 대조한다. 없거나 어긋나면 멈춘다 —
   * 예전에는 문항 수만 보고 조용히 통과해서, `fitsTwoColumns` 를 바꾼 뒤에도
   * 같은 캐시로 「재현율 95.2%」를 찍었다(적대적 리뷰 ④ F).
   */
  assertHeightCacheFresh(heightsPath, {
    kind: firstPage ? "first" : "continuation",
    rows: heights.length,
    /**
     * ⚠️ **행을 통째로 넘긴다.** 예전에는 여기서 컬럼을 골라 담았는데, 지문에
     *    `figureDims`·`figureSourceMm` 이 늘어난 것을 이쪽이 몰라서 **재자마자
     *    「캐시가 낡았다」**로 멈췄다(2026-08-20). 지문이 무엇을 보는지는
     *    `heightCacheManifest` 한 곳이 정한다 — 부르는 쪽이 옮겨 적지 않는다.
     */
    rowsHash: measuredRowsHash(rows),
    slotPx: slot,
  });
  const dimsSource = noDims
    ? "없음(전부 모른다)"
    : (dimsFile ?? "DB figure_dims");
  console.log(
    `캐시 ${heightsPath} · ${heights.length.toLocaleString()}건 · 문항 칸 ${slot}px · 치수 ${dimsSource}`,
  );

  /* ── 자 검산 ① 그림 모형이 실측 그림 높이와 맞는가 ───────────────────────── */
  const figureErrors: number[] = [];
  let withDims = 0;
  for (const h of heights) {
    const row = byId.get(h.pid)!;
    if (row.figureUrls.length === 0) continue;
    /**
     * ⚠️ **mm 를 같이 넘긴다.** 안 넘기면 이 검산만 «픽셀로 그린 지면»을 모형화하고
     *    실측은 «mm 로 그린 지면»이라, 있지도 않은 편차가 나온다 — 2026-08-20 에
     *    실제로 중앙 +47.8px 이 찍혔다. mm 를 넘기면 남는 것은 `mt-3` 마진뿐이다.
     */
    const dims = parseFigureDimensions(
      row.figureUrls.length,
      flatDimsFor(row),
      sourceMmFor(row),
    );
    if (dims.some((d) => d === null)) continue;
    withDims += 1;
    // 실측 rect 는 `mt-3` 마진을 뺀 값이다 — 모형에서도 빼고 견준다.
    figureErrors.push(
      estimateFigureBlockPx(dims) -
        JASEUP_MEASURED_PX.figureBlockTop -
        h.figurePx,
    );
  }
  if (withDims > 0) {
    const sorted = [...figureErrors].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.floor(sorted.length * p)]!;
    console.log(
      `\n그림 모형 검산 — 치수를 아는 ${withDims.toLocaleString()}건\n` +
        `  오차(모형−실측) p05 ${q(0.05).toFixed(1)}px · 중앙 ${q(0.5).toFixed(1)}px · p95 ${q(0.95).toFixed(1)}px\n` +
        `  |오차| ≤ 2px ${((100 * figureErrors.filter((e) => Math.abs(e) <= 2).length) / figureErrors.length).toFixed(1)}%`,
    );
  } else {
    console.log("\n그림 모형 검산 — 치수가 적재되지 않았다(전부 «모른다»).");
  }

  /**
   * 채점할 문항 — 제품 인쇄 경로가 판정에 넘기는 칸을 **전부** 넘긴다(그림 mm · 보기 그림 짝 · 엔진 SVG).
   * 🔴 2026-10-21(D-164 ②): 높이 모형 검산이 `estimateProblemPx(본문, 치수)` 만 불러 엔진 SVG 그림을 0 으로 셌다 —
   *    측정기가 SVG 를 그리게 된 뒤 «20px 넘게 과소 17.8%»가 나왔는데, 제품의 자는 SVG 를 센다(과소 1.0%).
   */
  const problemOf = (row: Row): TestPrintProblem => {
    const flat = flatDimsFor(row);
    // ⚠️ mm 를 같이 넘긴다 — 제품 지면이 폭을 mm 로 못 박기 때문이다.
    const sourceMm = sourceMmFor(row);
    return {
      id: row.id,
      orderIndex: 0,
      content: row.content ?? "",
      answer: "",
      solution: row.solution,
      figureUrls: row.figureUrls,
      figureDims: flat,
      figureSourceMm: sourceMm,
      choiceFigureIndex: noDims
        ? undefined
        : (row.choiceFigureIndex ?? undefined),
      figureSvg: row.figureSvg,
    };
  };

  /* ── 자 검산 ③ 문항 전체 높이 모형이 실측과 얼마나 맞는가 ────────────────── */
  {
    const err = heights
      .map(
        (h) =>
          assessSeat(problemOf(byId.get(h.pid)!), h.availPx).px - h.neededPx,
      )
      .sort((a, b) => a - b);
    const q = (p: number) => err[Math.floor(err.length * p)]!;
    const within = err.filter((e) => Math.abs(e) <= 20).length / err.length;
    // 과소평가가 곧 «놓침»이다 — 정확도보다 이쪽을 본다.
    const under = err.filter((e) => e < -20).length / err.length;
    console.log(
      `
문항 높이 모형 검산 — 오차(모형−실측)
` +
        `  p05 ${q(0.05).toFixed(0)}px · 중앙 ${q(0.5).toFixed(0)}px · p95 ${q(0.95).toFixed(0)}px
` +
        `  |오차| <= 20px ${(within * 100).toFixed(1)}% · 20px 넘게 **과소** ${(under * 100).toFixed(1)}%`,
    );
  }

  /* ── 채점 ────────────────────────────────────────────────────────────────── */
  const graded = heights.map((h) => {
    const row = byId.get(h.pid)!;
    const content = row.content ?? "";
    /**
     * 판정의 본체는 **자리 하나의 판단**(`assessSeat`)이다 — 분할(`packProblems`)이 짝을 지을지와 경고(`assessOverflowRisk`)가
     * 둘 다 이것을 부른다. 캐시가 잰 칸(`availPx` — 둘이 앉은 칸)에서 그대로 부르면 «둘이 앉았을 때 넘치는가»를 제품 그대로 묻는다.
     *
     * 🔴 2026-10-21(D-164 ②) 전에는 `assessOverflowRisk([채움, 채움, 문항, 채움])` 의 경고로 채점했다. 분할이 높이를 보게 된
     *    뒤로 «둘이 앉기엔 높다»는 문항은 장을 **혼자** 쓰고(칸 997px), 경고는 그 칸에서 나온다 — 캐시의 484px 넘침과
     *    맞댈 수 없어 측정기가 «재현율 0.2%»를, 이 채점기가 «제품과 115건 다르다»를 냈다(둘 다 지면 탓이 아니다).
     * ⚠️ «놓침»(경고 없음)과 «겹쳐 찍힘»은 다르다 — 분할은 `tooTall` 만 보고 혼자 앉히므로, 장수 규칙(`manyFigures`)으로
     *    경고만 받은 문항은 둘이 앉아 넘칠 수 있다. 겹쳐 찍힘은 `paired`(혼자 안 앉힘)로 따로 센다.
     */
    const seat = assessSeat(problemOf(row), h.availPx);
    return {
      pid: h.pid,
      overflows: h.neededPx > h.availPx,
      excess: h.neededPx - h.availPx,
      width: displayWidth(content),
      // 판정의 본체 — 2026-08-20 부터 줄 수가 아니라 이 px 를 칸과 견준다.
      px: seat.px,
      slot: h.availPx,
      lines: seat.lines,
      legacyLines: legacyLines(content),
      figures: row.figureUrls.length,
      // 장수 규칙은 **치수를 모를 때만** 켜진다 — 제품과 같은 조건이어야 한다.
      countRule: seat.manyFigures,
      product: seat.risky,
      paired: !seat.tooTall,
    };
  });

  /**
   * 제품 규칙의 거울 — 「추정 높이가 칸에서 여유 안쪽까지 왔는가」. 훑는 손잡이도
   * 줄 수 한계가 아니라 **여유(px)** 다. 제품이 그것으로 판정하기 때문이다.
   */
  const warnedAt = (marginPx: number) => (g: (typeof graded)[number]) =>
    g.px > g.slot - marginPx || g.countRule;

  /** 제품이 실제로 쓰는 여유. 채점기가 다른 값을 쓰면 아래 검산에서 걸린다. */
  const productMargin = OVERFLOW_MARGIN_PX;

  /* ── 자 검산 ② 채점기가 제품과 한 건도 다르지 않은가 ─────────────────────── */
  const drift = graded.filter((g) => warnedAt(productMargin)(g) !== g.product);
  if (drift.length > 0)
    throw new Error(
      `채점기가 제품과 ${drift.length}건 다르다 — 규칙을 옮겨 적었다는 뜻이다. 예: ${drift[0]!.pid}`,
    );
  console.log("채점기 ↔ 제품 일치 확인 (0건 불일치)");

  const over = graded.filter((g) => g.overflows).length;
  const report = (label: string, s: Score) =>
    console.log(
      `  ${label.padEnd(12)} 경고 ${String(s.warned).padStart(6)}` +
        ` 맞음 ${String(s.hit).padStart(5)}` +
        ` 헛것 ${String(s.falseAlarm).padStart(5)}` +
        ` 놓침 ${String(s.missed).padStart(5)}` +
        ` 재현율 ${((100 * s.hit) / Math.max(1, over)).toFixed(1)}%` +
        ` 정밀도 ${((100 * s.hit) / Math.max(1, s.warned)).toFixed(1)}%`,
    );

  console.log(
    `\n실측 넘침 ${over.toLocaleString()} (${((over * 100) / graded.length).toFixed(2)}%)`,
  );
  console.log("현행 제품 규칙");
  report(
    `여유 ${productMargin}px`,
    score(graded.map((g) => ({ overflows: g.overflows, warned: g.product }))),
  );
  console.log(
    `  겹쳐 찍힘(넘치는데 둘이 앉힘) ${graded.filter((g) => g.overflows && g.paired).length}`,
  );

  /**
   * 수리 **전** 규칙을 그대로 재현해 같은 캐시로 채점한다 — 전후를 추정하지 않으려고.
   * 예전 규칙: `폭 > 530` · `줄 수(그림 0줄·59단위·고정 chrome 0) > 14` ·
   * `그림 장수 >= 2`, 장 구분 없음.
   *
   * ⚠️ 자는 **얼린 사본**(`legacyLines`)을 쓴다. 제품 함수를 그대로 부르면 자를
   *    고칠 때마다 «수리 전» 숫자가 같이 움직여 전후 비교가 무의미해진다.
   */
  console.log("수리 전 규칙 (그림 0줄 · 한계 14 · 장 구분 없음)");
  report(
    "한계 14",
    score(
      graded.map((g) => ({
        overflows: g.overflows,
        warned:
          g.width > OVERFLOW_WIDTH_LIMIT ||
          g.legacyLines > 14 ||
          g.figures >= 2,
      })),
    ),
  );

  if (sweep.length > 0) {
    console.log(
      "\n여유(px) 훑기 — 「칸에서 이만큼 안쪽이면 경고」 (장수 규칙은 그대로)",
    );
    for (const margin of sweep) {
      const w = warnedAt(margin);
      report(
        `여유 ${margin}px`,
        score(graded.map((g) => ({ overflows: g.overflows, warned: w(g) }))),
      );
    }
  }

  /* ── 규칙별 기여 — «이 규칙이 없으면 무엇을 놓치나» ─────────────────────── */
  const margin = Number(arg("--at") ?? productMargin);
  const byRule = (g: (typeof graded)[number]) => ({
    height: g.px > g.slot - margin,
    count: g.countRule,
  });
  console.log(`
규칙별 기여 (여유 ${margin}px)`);
  for (const name of ["height", "count"] as const) {
    const only = graded.filter((g) => {
      const r = byRule(g);
      return r[name] && !Object.entries(r).some(([k, v]) => k !== name && v);
    });
    const alone = only.filter((g) => g.overflows).length;
    console.log(
      `  ${name.padEnd(6)} 이 규칙만 걸리는 문항 ${String(only.length).padStart(5)}` +
        ` — 그중 실제 넘침 ${String(alone).padStart(5)}` +
        ` (${((100 * alone) / Math.max(1, only.length)).toFixed(1)}%)`,
    );
  }

  const missed = graded
    .filter((g) => g.overflows && !g.product)
    .sort((a, b) => b.excess - a.excess);
  console.log(`\n놓친 표본 — 넘친 양이 큰 순 (${missed.length}건)`);
  for (const m of missed.slice(0, 10))
    console.log(
      `· ${m.pid} 넘침 ${m.excess.toFixed(0)}px 추정 ${m.lines}줄 폭 ${m.width} 그림 ${m.figures}`,
    );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
