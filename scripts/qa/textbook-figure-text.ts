/**
 * **교과서 행의 그림 글 고침 묶음** (D-164 ③④ · 2단계) — 위치 표현 «오른쪽 그림 → 다음 그림» · 그림 자리 `[그림:n]`.
 * 공유 DB 는 **읽기만** 한다(읽기 전용 거래). 쓰기는 리드가 이 묶음을 `apply-row-repairs.ts` 로 한다.
 *
 *   npx tsx --env-file=<.env> scripts/qa/textbook-figure-text.ts <결정.json> <내보낼 폴더> --twins <excluded-twins.json>
 *
 * 결정(사람이 그림을 열어 정한 것 — 다시 만들 수 없다)은 `docs/planning/tracks/reports/problem-display-decisions-20261021/
 * textbook-figure-text-decisions.json`. 🔴 적용 직전에 이 CLI 를 **다시** 돌려 지금 값으로 관문을 다시 지난 새 묶음을 쓴다 —
 * 보기 그림 연결(`choice_figure_index`)은 행 수리 도구가 대조하지 못하는 칸이다(그림 주소는 자리 행만 같은 값으로 대조한다).
 *
 * 내보내는 것: `textbook-figure-text.json`(행 고침 묶음 — `{ id, code, reasons, before: { content }, after: { content } }`)
 * · `textbook-figure-text.summary.md` · `textbook-figure-text.held.json`(규칙 · 관문이 안 바꾼 행과 까닭)
 * · `textbook-figure-text.render.json`(렌더 대조 입력 — `TEXTBOOK_FIGURE_TEXT=<이 파일> npx vitest run textbookFigureTextBundle`).
 *
 * 🔴 관문(하나라도 걸리면 그 행은 묶음에서 빠지고 «held» 에 까닭이 남는다):
 *   ① 보이는 글자가 «위치 표현을 바꾼 앞 본문»과 같다(`sameVisibleText` — 자리 줄은 번호를 캡션으로 옮길 뿐)
 *   ② 제품의 쓰기 검사 `checkFigureSlotsForWrite` 가 빈 배열(은행 지면 · 교재 지면에서 자리가 다 선다)
 *   ③ 그림이 붙은 행만(그림 없는 행의 «오른쪽 그림»은 가리킬 것이 없다 — 안 바꾼다)
 * 제외 대조(겹치면 멈춘다): 기출 쌍둥이(`excluded-twins.json` 의 외부 ID) · 기출(`past_exam` — 보호 82행 · 경산여19 포함)과 같은
 * 시험 열쇠 · 외부 ID `exam-…` · 그 행들에서 `origin_problem_id` 로 이어진 조상 · 자손.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { checkFigureSlotsForWrite } from "../../src/lib/textbook/render/slotCut";
import {
  applyPosition,
  placeSlots,
  sameVisibleText,
  type PositionOverride,
  type SlotDecision,
} from "./textbookFigureTextCore";

type Row = {
  id: string;
  code: string;
  ext: string | null;
  exam: string | null;
  origin: string | null;
  source: string;
  content: string;
  figure_urls: string[];
  choice_figure_index: (number | null)[] | null;
  has_svg: boolean;
  direct_use_allowed: boolean;
};
type Decisions = {
  position: { overrides: PositionOverride[] };
  slots: SlotDecision[];
};

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : undefined;
}

async function main(): Promise<void> {
  const [decisionsFile, outDir] = process.argv.slice(2);
  const twinsFile = arg("--twins");
  if (!decisionsFile || !outDir || !twinsFile)
    throw new Error(
      "사용: textbook-figure-text.ts <결정.json> <내보낼 폴더> --twins <excluded-twins.json>",
    );
  const decisions = JSON.parse(
    readFileSync(decisionsFile, "utf8"),
  ) as Decisions;
  const overrides = new Map(
    decisions.position.overrides.map((o) => [o.code, o]),
  );
  const slots = new Map(decisions.slots.map((s) => [s.code, s]));
  const twins = new Set(
    (
      JSON.parse(readFileSync(twinsFile, "utf8")).excluded as {
        twinExternalId: string;
      }[]
    ).map((t) => t.twinExternalId),
  );

  const p = new PrismaClient();
  const { rows, lineage } = await p.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const rows = await tx.$queryRawUnsafe<Row[]>(
      `SELECT id::text id, problem_code code, external_id ext, exam_id exam, origin_problem_id::text origin, source::text source,
              content, figure_urls, choice_figure_index, figure_svg IS NOT NULL AS has_svg, direct_use_allowed
         FROM problem WHERE source = 'school_textbook' AND pool = 'shared' ORDER BY problem_code`,
    );
    const lineage = await tx.$queryRawUnsafe<
      {
        id: string;
        ext: string | null;
        origin: string | null;
        source: string;
        exam: string | null;
      }[]
    >(
      `SELECT id::text id, external_id ext, origin_problem_id::text origin, source::text source, exam_id exam FROM problem`,
    );
    return { rows, lineage };
  });
  await p.$disconnect();

  // 제외 집합 — 기출 쌍둥이 · 기출 · 기출과 같은 시험 열쇠 · 외부 ID «exam-» 와 그 계보 전부
  const byId = new Map(lineage.map((r) => [r.id, r]));
  const kids = new Map<string, string[]>();
  for (const r of lineage)
    if (r.origin) kids.set(r.origin, [...(kids.get(r.origin) ?? []), r.id]);
  const pastExams = new Set(
    lineage
      .filter((r) => r.source === "past_exam" && r.exam)
      .map((r) => r.exam!),
  );
  const excluded = new Set<string>();
  const walk = (id: string) => {
    if (excluded.has(id)) return;
    excluded.add(id);
    const r = byId.get(id);
    if (r?.origin) walk(r.origin);
    for (const k of kids.get(id) ?? []) walk(k);
  };
  for (const r of lineage)
    if (
      (r.ext && (twins.has(r.ext) || r.ext.startsWith("exam-"))) ||
      r.source === "past_exam" ||
      (r.exam && pastExams.has(r.exam))
    )
      walk(r.id);

  const bundle: {
    id: string;
    code: string;
    reasons: string[];
    before: { content: string; figureUrls?: string[] };
    after: { content: string; figureUrls?: string[] };
  }[] = [];
  /** 렌더 대조의 입력 — 그림 주소 · 보기 짝 · 자리 결정 · «위치 표현만 바꾼» 본문(`textbookFigureTextBundle.test.tsx`). */
  const renderInput: {
    code: string;
    figureUrls: string[];
    choiceFigureIndex: (number | null)[] | null;
    before: string;
    positioned: string;
    after: string;
    edits: { from: string; to: string }[];
    decision: SlotDecision | null;
  }[] = [];
  const held: { code: string; why: string }[] = [];
  const counts = {
    position: 0,
    positionEdits: 0,
    label: 0,
    desc: 0,
    perSubq: 0,
  };
  const seenSlots = new Set<string>();
  for (const row of rows) {
    const figureCount = row.figure_urls.length;
    const decision = slots.get(row.code);
    if (decision) seenSlots.add(row.code);
    if (figureCount === 0 && !row.has_svg) {
      if (decision)
        held.push({ code: row.code, why: "그림이 없는 행에 자리 결정이 있다" });
      else if (applyPosition(row.content, overrides.get(row.code)).edits.length)
        held.push({
          code: row.code,
          why: "그림이 없는 행의 위치 표현 — 가리킬 그림이 없어 안 바꾼다",
        });
      continue;
    }
    const positioned = applyPosition(row.content, overrides.get(row.code));
    if (positioned.held && positioned.edits.length === 0 && !decision) {
      held.push({ code: row.code, why: positioned.held });
      continue;
    }
    const reasons: string[] = [];
    if (positioned.edits.length)
      reasons.push(
        `위치 표현 ${positioned.edits.map((e) => `«${e.from.trim()}»→«${e.to.trim()}»`).join(" · ")}`,
      );
    /** 자리를 넣은 본문 — 못 넣으면(까닭은 «held») null 이고 그 행은 위치 표현만 고친다. */
    const slotted = (() => {
      if (!decision) return null;
      const placed = placeSlots(positioned.content, decision);
      const why =
        "why" in placed
          ? placed.why
          : !sameVisibleText(positioned.content, placed.content)
            ? "보이는 글자가 달라진다"
            : checkFigureSlotsForWrite(
                placed.content,
                figureCount,
                row.choice_figure_index,
              ).join(" · ");
      if (why || "why" in placed) {
        held.push({ code: row.code, why: `자리는 빼고 위치 표현만 — ${why}` });
        return null;
      }
      return placed.content;
    })();
    const after = slotted ?? positioned.content;
    if (slotted)
      reasons.push(
        `그림 자리(${decision!.kind}) ${decision!.mapping.map((m) => `그림${m.figure}→${m.number}`).join(" · ")} — ${decision!.evidence}`,
      );
    if (after === row.content) continue;
    const gate = checkFigureSlotsForWrite(
      after,
      figureCount,
      row.choice_figure_index,
    );
    if (gate.length) {
      held.push({ code: row.code, why: `쓰기 검사: ${gate.join(" · ")}` });
      continue;
    }
    if (excluded.has(row.id))
      throw new Error(`제외 대조에 걸렸다 — ${row.code} (${row.id})`);
    // 관문을 다 지난 행만 센다
    if (positioned.edits.length) {
      counts.position += 1;
      counts.positionEdits += positioned.edits.length;
    }
    if (slotted) counts[decision!.kind] += 1;
    // 자리 행은 그림 주소도 앞뒤 같은 값으로 싣는다 — 쓰는 순간 그림이 바뀌었으면(차례 · 교체) 자리 번호가 다른 그림을 가리키니
    // 대조(compare-and-set)에서 걸러야 한다(Codex 2단계 검토). 도구는 같은 값의 그림 주소만 받는다.
    const figures = slotted ? { figureUrls: row.figure_urls } : {};
    bundle.push({
      id: row.id,
      code: row.code,
      reasons,
      before: { content: row.content, ...figures },
      after: { content: after, ...figures },
    });
    renderInput.push({
      code: row.code,
      figureUrls: row.figure_urls,
      choiceFigureIndex: row.choice_figure_index,
      before: row.content,
      positioned: positioned.content,
      after,
      edits: positioned.edits.map((e) => ({ from: e.from, to: e.to })),
      decision: slotted ? decision! : null,
    });
  }
  for (const code of slots.keys())
    if (!seenSlots.has(code))
      held.push({ code, why: "자리 결정의 행이 공유 DB 교과서에 없다" });

  mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, "textbook-figure-text");
  writeFileSync(`${base}.json`, JSON.stringify(bundle, null, 1));
  writeFileSync(`${base}.held.json`, JSON.stringify(held, null, 1));
  writeFileSync(`${base}.render.json`, JSON.stringify(renderInput));
  const lockedTouched = bundle.filter(
    (b) => !rows.find((r) => r.id === b.id)!.direct_use_allowed,
  ).length;
  const summary = [
    `# 교과서 그림 글 고침 묶음 (D-164 ③④ · 2단계) — ${new Date().toISOString()}`,
    "",
    `- 읽은 교과서 행 ${rows.length} · 묶음 ${bundle.length}행(그중 잠긴 행 ${lockedTouched}) · 안 바꾼 행(«held») ${held.length}`,
    `- 위치 표현을 바꾼 행 ${counts.position}(바꾼 곳 ${counts.positionEdits}) · 그림 자리 — 번호 캡션(④) ${counts.label} · 설명 뒤(③) ${counts.desc} · 소문항마다(③) ${counts.perSubq}`,
    `- 관문: 보이는 글자 같음 · \`checkFigureSlotsForWrite\` 빈 배열 — 둘 다 통과한 행만 묶음에 넣었다`,
    `- 제외 대조: 기출 쌍둥이 ${twins.size} · 기출 계보 포함 제외 집합 ${excluded.size}행 — 묶음과 겹침 **0**`,
    `- 🔴 적용 직전에 이 CLI 를 다시 돌려 새 묶음으로 쓴다 — 보기 그림 연결(\`choice_figure_index\`)은 행 수리 도구가 대조하지 못한다. 다시 돌린 뒤 적용까지 그 행들에 다른 쓰기가 없어야 한다(그림 주소는 자리 행 ${counts.label + counts.desc + counts.perSubq} 을 같은 값으로 대조한다)`,
    `- 적용 뒤 바꾼 행은 DB 트리거가 실제 형식 칸을 비운다 — 형식 채우기(backfill)를 돌린다`,
    "",
    "## 안 바꾼 행(까닭별)",
    ...Object.entries(
      held.reduce<Record<string, number>>((m, h) => {
        const key = h.why.replace(/«[^»]*»/g, "«…»").slice(0, 60);
        m[key] = (m[key] ?? 0) + 1;
        return m;
      }, {}),
    ).map(([why, n]) => `- ${n} — ${why}`),
  ].join("\n");
  writeFileSync(`${base}.summary.md`, `${summary}\n`);
  console.log(summary);
}

main().catch((e) => {
  console.error(
    `TEXTBOOK_FIGURE_TEXT_FAILED: ${e instanceof Error ? e.message : String(e)}`,
  );
  process.exitCode = 1;
});
