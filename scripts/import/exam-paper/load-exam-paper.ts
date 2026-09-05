/**
 * 기출 1편(정화중 25-2-중간) 적재 — **드라이런이 기본**이다.
 *
 *   npx tsx --env-file=.env scripts/import/exam-paper/load-exam-paper.ts <작업폴더>            # 드라이런
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/exam-paper/load-exam-paper.ts <작업폴더> --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/exam-paper/load-exam-paper.ts <작업폴더> --revert --apply
 *
 * ## 문지기 셋
 *
 * ㉠ **AI 해설은 답이 맞을 때만 실린다.** 에이전트는 정답을 못 본 채 풀었다
 *    (`sol_ai/*.json`). 그 답이 원본 정답과 다르면 그 문항은 **해설 없이** 들어간다
 *    — 틀린 해설은 없는 해설보다 나쁘다(`apply-ai-solutions.ts` 와 같은 규율).
 * ㉡ **제품 렌더러로 본문·정답·해설을 실제로 그려 본다.** `.math-raw`·`#cc0000`·
 *    날 LaTeX 이 나오면 그 행은 안 넣는다.
 * ㉢ **소단원은 손으로 배정하되 `mapUnitHint` 와 대 본다.** 다르면 그 자리를 찍는다 —
 *    「내가 손으로 정했다」를 조용히 넘기지 않는다.
 * ㉣ **적재 직후 그 편의 `Exam` 을 세운다**(`syncExamMetadata`). 이게 없으면 문항만
 *    들어오고 **시험지가 없다** — 예상 점수 판독기(11)와 기출 대조가 이 편을 못 본다.
 *    `scripts/qa/audit-exam-wiring.ts` 가 이 자리를 감사한다 — 표시가 없으면 관문이 빨개진다.
 *
 * ## 되돌리기
 *
 * `exam-load-ledger.json` 에 넣은 id 를 적는다. `--revert` 는 그 파일만 보고 지운다.
 * 원장을 **DB 보다 먼저** 쓴다(2026-08-29 교훈 — 중간에 죽으면 되돌릴 수 없다).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { mapUnitHint } from "../../../src/lib/import/mapUnit";
import { syncExamMetadata } from "../../../src/lib/import/syncExamMetadata";
import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";

const DIR = process.argv[2];
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
if (!DIR) throw new Error("사용: <작업폴더> [--apply] [--revert]");
if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  throw new Error(
    "공유 DB 쓰기가 막혀 있다(D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
  );
}

const LEDGER = join(DIR, "exam-load-ledger.json");
/**
 * 이 편의 `Problem.examId`. **`Exam.externalExamId` 와 다르다** — 그쪽은
 * `syncExamMetadata` 가 제 규칙으로 짓는다. 여기서는 「초안이 한 편인가」 대조에만 쓴다.
 */
const EXAM_ID = "2025-jeonghwa-3-2-mid";
const prisma = new PrismaClient();

/**
 * 🔴 **소단원 배정 — 사람이 정했다.** 근거를 함께 적는다.
 *
 * HWP 가 주는 힌트는 넷뿐이다(`삼각비`·`삼각비의 활용`·`원과 직선`·`원주각`).
 * 그런데 우리 트리의 중3 소단원은 일곱이고, `mapUnitHint` 는 **가장 긴 이름**을 고르므로
 * `삼각비` → 「삼각비의 활용」, `원주각` → 「원주각의 활용」이 된다. 앞의 둘은 틀린다 —
 * 문1·3·4 는 활용이 아니라 뜻/값이다. 그래서 문항을 읽고 손으로 배정했다.
 *
 * ⚠️ 이 표는 **원장님 검토 대상**이다. 틀린 소단원은 진도 범위 출제에서 엉뚱한 문제로 섞인다.
 */
const UNIT_BY_NUMBER: Record<number, { section: string; why: string }> = {
  1: {
    section: "삼각비의 뜻",
    why: "직각삼각형에서 cos·sin 을 정의대로 읽는다(접기)",
  },
  2: { section: "삼각비의 활용", why: "넓이 공식 ½ab sin C" },
  3: { section: "삼각비의 값", why: "0°~90° 에서 sin·cos·tan 값의 대소" },
  4: {
    section: "삼각비의 값",
    why: "반지름 1 사분원 — 단위원에서 삼각비의 값",
  },
  5: { section: "삼각비의 활용", why: "수선의 발과 tan 으로 높이 구하기" },
  6: { section: "원의 접선", why: "원에 외접하는 사각형의 접선 길이" },
  7: { section: "원주각의 활용", why: "접선과 현이 이루는 각" },
  8: { section: "원주각의 활용", why: "원에 내접하는 다각형의 대각 성질" },
  9: { section: "삼각비의 활용", why: "삼각형에서 변의 길이 구하기" },
  10: { section: "원주각의 활용", why: "접선과 현이 이루는 각 + 호의 길이 비" },
  11: { section: "원의 접선", why: "한 점에서 그은 두 접선" },
  12: { section: "원주각의 활용", why: "접선과 현이 이루는 각 + 닮음" },
  13: { section: "원의 접선", why: "두 접선과 지름" },
  14: { section: "삼각비의 활용", why: "삼각형의 변 — 특수각 분해" },
  15: { section: "삼각비의 활용", why: "정사각형 안의 tan 값" },
  16: { section: "원주각", why: "일정한 원주각을 갖는 점의 자취" },
  17: { section: "삼각비의 활용", why: "삼각형 분해로 cos 75° 유도" },
  18: { section: "원주각", why: "반원에 대한 원주각은 직각" },
  19: { section: "원주각", why: "지름에 대한 원주각으로 직각삼각형 세기" },
};

/** 문항번호 → 그림 스펙 이름. 문19 는 두 장이라 옆으로 붙인다. */
const FIGURES: Record<number, string[]> = {
  1: ["q01"],
  2: ["q02"],
  4: ["q04"],
  5: ["q05"],
  6: ["q06"],
  7: ["q07"],
  8: ["q08"],
  9: ["q09"],
  10: ["q10"],
  11: ["q11"],
  12: ["q12"],
  13: ["q13"],
  14: ["q14"],
  15: ["q15"],
  16: ["q16"],
  17: ["q17"],
  18: ["q18"],
  19: ["q19a", "q19b"],
};

const VIEWBOX = /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/;

/** 여러 장을 **한 장으로** 잇는다 — `figureSvg` 는 컬럼이 하나뿐이다. */
function composeSvg(names: string[]): string {
  const parts = names.map((n) => {
    const raw = readFileSync(join(DIR, "svg", `${n}.svg`), "utf-8");
    const m = VIEWBOX.exec(raw);
    if (!m) throw new Error(`[중단] ${n}.svg 에 viewBox 가 없다`);
    const inner = raw
      .replace(/^[\s\S]*?<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      // 낱장의 흰 바탕은 이어 붙일 때 서로를 덮는다 — 뗀다.
      .replace(/<rect[^>]*fill="#ffffff"[^>]*\/>/g, "");
    return { w: Number(m[1]), h: Number(m[2]), inner };
  });
  if (parts.length === 1)
    return readFileSync(join(DIR, "svg", `${names[0]}.svg`), "utf-8");
  const gap = 24;
  const w = parts.reduce((s, p) => s + p.w, 0) + gap * (parts.length - 1);
  const h = Math.max(...parts.map((p) => p.h));
  let x = 0;
  const groups = parts.map((p) => {
    const g = `<g transform="translate(${x.toFixed(2)},${((h - p.h) / 2).toFixed(2)})">${p.inner}</g>`;
    x += p.w + gap;
    return g;
  });
  return (
    `<svg viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#ffffff" />` +
    groups.join("") +
    "</svg>"
  );
}

/** 지면에 날 것이 나가나 — **제품 렌더러**로 판정한다(규칙을 옮겨 적지 않는다). */
function renderFaults(text: string): string[] {
  if (!text) return [];
  const bad: string[] = [];
  if ((text.match(/\$/g)?.length ?? 0) % 2 !== 0) bad.push("$ 가 홀수다");
  const html = renderMathHtml(text);
  if (html.includes("math-raw")) bad.push("KaTeX 가 포기했다");
  if (html.includes("#cc0000")) bad.push("붉은 글씨");
  if (html.includes("katex-error")) bad.push("katex-error");
  const plain = html.replace(/<[^>]+>/g, "");
  const raw = plain.match(/\\[A-Za-z]{2,}/);
  if (raw) bad.push(`날 LaTeX ${raw[0]}`);
  return bad;
}

/** 답 표기 차이를 접는다 — ①↔1, `$`·공백. */
function normAnswer(s: string): string {
  let t = (s ?? "").trim();
  for (const set of ["①②③④⑤", "➀➁➂➃➄"]) {
    for (let i = 0; i < set.length; i += 1)
      t = t.split(set[i]!).join(String(i + 1));
  }
  return t.replace(/[$\s]/g, "");
}

interface Draft {
  externalId: string;
  source: string;
  difficulty: string;
  problemType: string;
  questionType: string;
  content: string;
  answer: string;
  solution: string | null;
  unitHint: string;
  questionNumber: number | null;
  score: number | null;
  sourceFile: string | null;
  school: string | null;
  subject: string | null;
  examId: string | null;
}

async function revert(): Promise<void> {
  if (!existsSync(LEDGER))
    throw new Error("[중단] 원장이 없다 — 되돌릴 것이 없다");
  const led = JSON.parse(readFileSync(LEDGER, "utf-8")) as { ids: string[] };
  console.log(`원장에 ${led.ids.length}행`);
  if (!APPLY) return console.log("드라이런 — --apply 를 붙여야 지운다");
  // 🔴 문항만 지우면 `exam_question.problem_id` 가 **죽은 uuid** 를 가리킨 채 남는다 —
  //    그 컬럼에는 FK 가 없어 DB 가 안 막아 준다. 그래서 편도 같이 지운다.
  //
  //    ⚠️ 편을 **`externalExamId` 상수로 찾으면 안 된다.** `syncExamMetadata` 는 제 규칙으로
  //    키를 짓는다(우리가 준 `2025-jeonghwa-3-2-mid` 가 아니라 `정화중|중3|중3|2025-2-중간`).
  //    처음에 그렇게 짰다가 **아무것도 안 지우면서 「지웠다」고 찍었다.**
  //    그러니 「우리 행이 실제로 걸려 있는 편」을 **링크에서** 찾는다.
  const links = await prisma.examQuestion.findMany({
    where: { problemId: { in: led.ids } },
    select: { examId: true },
  });
  const examIds = [...new Set(links.map((l) => l.examId))];
  // 그 편에 **우리 것 아닌 문항**이 하나라도 걸려 있으면 편은 안 지운다.
  const mine = new Set(led.ids);
  const keep = new Set<string>();
  for (const examId of examIds) {
    const all = await prisma.examQuestion.findMany({
      where: { examId },
      select: { problemId: true },
    });
    if (all.some((q) => q.problemId && !mine.has(q.problemId)))
      keep.add(examId);
  }
  const r = await prisma.problem.deleteMany({ where: { id: { in: led.ids } } });
  const drop = examIds.filter((id) => !keep.has(id));
  const e = await prisma.exam.deleteMany({ where: { id: { in: drop } } });
  console.log(
    `지웠다: 문항 ${r.count}행 · 시험지 ${e.count}편` +
      (keep.size > 0 ? ` · 남의 문항이 섞여 안 지운 편 ${keep.size}` : ""),
  );
  if (examIds.length === 0) {
    console.log(
      "⚠️ 이 행들에 걸린 시험지가 없다 — 배선 전에 넣은 회차일 수 있다",
    );
  }
}

async function main(): Promise<void> {
  if (REVERT) return revert();

  const drafts = JSON.parse(
    readFileSync(join(DIR, "drafts.json"), "utf-8"),
  ) as Draft[];

  // ── 단원 ────────────────────────────────────────────────────────────────
  const units = await prisma.unit.findMany({
    where: { grade: "중3" },
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const bySection = new Map(units.map((u) => [u.section, u]));
  console.log(`중3 소단원 ${units.length}개\n`);

  // ── 조립 ────────────────────────────────────────────────────────────────
  const ai = new Map<
    number,
    { answer: string; solution: string; note?: string }
  >();
  for (let n = 1; n <= 11; n += 1) {
    const p = join(DIR, "sol_ai", `q${String(n).padStart(2, "0")}.json`);
    if (existsSync(p)) ai.set(n, JSON.parse(readFileSync(p, "utf-8")));
  }

  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  let aiOk = 0;
  let aiBad = 0;
  let unitDiff = 0;

  for (const d of drafts) {
    const n = d.questionNumber!;
    const want = UNIT_BY_NUMBER[n];
    const unit = bySection.get(want.section);
    if (!unit) {
      skipped.push(`문${n}: 소단원 «${want.section}» 이 트리에 없다`);
      continue;
    }
    // 손 배정 ↔ 기계 배정 대조 (기계가 틀리는 자리를 눈에 보이게 남긴다)
    const auto = mapUnitHint(d.unitHint, units, "중3");
    const autoSection =
      auto.status === "mapped"
        ? (units.find((u) => u.id === auto.unitId)?.section ?? "?")
        : "미분류";
    if (autoSection !== want.section) {
      unitDiff += 1;
      console.log(
        `  문${String(n).padStart(2)} 단원: 손 «${want.section}» ← 기계 «${autoSection}» (힌트 «${d.unitHint}»)\n` +
          `        근거: ${want.why}`,
      );
    }

    // ── 해설 ──────────────────────────────────────────────────────────────
    let solution = d.solution;
    let solutionSource: "none" | "original" | "ai" = solution
      ? "original"
      : "none";
    const gen = ai.get(n);
    if (!solution && gen) {
      if (normAnswer(gen.answer) !== normAnswer(d.answer)) {
        aiBad += 1;
        console.log(
          `  🔴 문${n} AI 답 «${gen.answer}» ≠ 원본 «${d.answer}» — 해설을 안 넣는다` +
            (gen.note ? `\n        AI 메모: ${gen.note}` : ""),
        );
      } else {
        const faults = renderFaults(gen.solution);
        if (faults.length > 0) {
          aiBad += 1;
          console.log(
            `  🔴 문${n} AI 해설이 지면에서 깨진다: ${faults.join(" · ")}`,
          );
        } else {
          solution = gen.solution;
          solutionSource = "ai";
          aiOk += 1;
        }
      }
    }

    // ── 지면 검사 ─────────────────────────────────────────────────────────
    const faults = [
      ...renderFaults(d.content).map((f) => `본문: ${f}`),
      ...renderFaults(d.answer).map((f) => `정답: ${f}`),
      ...renderFaults(solution ?? "").map((f) => `해설: ${f}`),
    ];
    if (faults.length > 0) {
      skipped.push(`문${n}: ${faults.join(" · ")}`);
      continue;
    }

    rows.push({
      unitId: unit.id,
      source: "past_exam",
      difficulty: d.difficulty,
      problemType: d.problemType,
      questionType: d.questionType,
      content: d.content,
      answer: d.answer,
      solution,
      solutionSource,
      figureSvg: FIGURES[n] ? composeSvg(FIGURES[n]) : null,
      figureSource: FIGURES[n] ? "engine" : null,
      externalId: d.externalId,
      sourceFile: d.sourceFile,
      school: d.school,
      subject: d.subject,
      examId: d.examId,
      questionNumber: n,
      score: d.score,
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
    });
  }

  console.log(
    `\nAI 해설 채움 ${aiOk} · 막힘 ${aiBad} · 원본 해설 ${
      rows.filter((r) => r.solutionSource === "original").length
    }`,
  );
  console.log(`손↔기계 단원이 다른 자리 ${unitDiff}개 (위에 찍었다)`);
  console.log(`넣을 행 ${rows.length} · 뺀 행 ${skipped.length}`);
  for (const s of skipped) console.log(`  ⛔ ${s}`);
  console.log(
    `그림 붙은 행 ${rows.filter((r) => r.figureSvg).length} · ` +
      `해설 있는 행 ${rows.filter((r) => r.solution).length}`,
  );

  if (!APPLY) {
    console.log("\n드라이런이다 — 아무것도 안 넣었다.");
    writeFileSync(
      join(DIR, "load_rows.json"),
      JSON.stringify(rows, null, 1),
      "utf-8",
    );
    console.log(`넣을 행을 load_rows.json 에 적어 뒀다`);
    return;
  }

  // 이미 들어간 것이 있으면 멈춘다 — externalId 가 유일 키다.
  const dup = await prisma.problem.findMany({
    where: { externalId: { in: rows.map((r) => r.externalId as string) } },
    select: { externalId: true },
  });
  if (dup.length > 0) {
    throw new Error(
      `[중단] 이미 들어간 externalId 가 ${dup.length}개 있다: ${dup
        .slice(0, 3)
        .map((d) => d.externalId)
        .join(", ")}…`,
    );
  }

  const ids: string[] = [];
  // 🔴 원장을 **먼저** 연다 — 중간에 죽으면 되돌릴 근거가 없다(2026-08-29).
  writeFileSync(
    LEDGER,
    JSON.stringify({ ids, note: "적재 중" }, null, 1),
    "utf-8",
  );
  for (const row of rows) {
    // exam-wiring: 기출·배선됨 — 적재 직후 syncExamMetadata 로 그 편의 Exam 을 세운다
    const created = await prisma.problem.create({
      data: row as never,
      select: { id: true, problemCode: true, questionNumber: true },
    });
    ids.push(created.id);
    writeFileSync(LEDGER, JSON.stringify({ ids }, null, 1), "utf-8");
    console.log(`  넣음 문${created.questionNumber} → ${created.problemCode}`);
  }
  // 기출이 들어왔으면 **그 시험지도 함께 선다.** 문항만 넣으면 예상 점수 판독기(11)와
  // 기출 대조가 이 편을 못 본다 — `scripts/import/load-classified.ts` 와 같은 배선이다.
  const examIds = [...new Set(rows.map((r) => r.examId as string))];
  if (examIds.length !== 1 || examIds[0] !== EXAM_ID) {
    throw new Error(
      `[중단] 초안의 examId 가 «${examIds.join(", ")}» 인데 되돌리기 상수는 «${EXAM_ID}» 다 — ` +
        "둘이 갈리면 되돌리기가 엉뚱한 편을 지운다",
    );
  }
  const sync = await syncExamMetadata(prisma, examIds);
  console.log(`\n적재 ${ids.length}행 · 원장 ${LEDGER}`);
  console.log(
    `시험지 배선 — 새로 ${sync.inserted} · 갱신 ${sync.updated} · 못 세움 ${sync.invalid}` +
      (sync.unclassified.length > 0
        ? ` · 판단불가 ${sync.unclassified.map((u) => u.reason).join(", ")}`
        : "") +
      (sync.excluded.length > 0
        ? ` · 제외 ${sync.excluded.map((u) => u.reason).join(", ")}`
        : "") +
      (sync.collided.length > 0
        ? ` · 문항번호 충돌 ${sync.collided.map((u) => u.key).join(", ")}`
        : ""),
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
