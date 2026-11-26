/**
 * 사진 위 첨삭(M1) 측정 — 제품의 gradeScanPage(markup) 를 그대로 부르고, 모델만 구독 CLI 로 바꾼다.
 * 계획: docs/planning/cb-scan-markup-plan-20261126.md §4 M1 · §6.2.
 *
 *   npx tsx --conditions=react-server scripts/qa/concept-photo-bench/markup-bench.mts <저장소 밖 출력 폴더> [model] [effort] [rounds]
 *
 * 표본은 semantic-cases.json 의 현재 은행 B 다섯 문항 · 합성 답 36개(사람 사진 아님).
 * API 과금은 쓰지 않는다(requireSubscription). 구조화 출력이 없으므로 제품 운영과 같지 않다 — 그 차이는 보고서에 적는다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
type GradeModule = typeof import("@/lib/concept-blank/scan/grade");
// tsx 는 .ts 를 cjs 로 옮겨 이름 내보내기가 default 아래에 있을 수 있다.
const gradeModule = (await import("@/lib/concept-blank/scan/grade")) as GradeModule & { default?: GradeModule };
const gradeScanPage = gradeModule.gradeScanPage ?? gradeModule.default!.gradeScanPage;
import type { ScanModel } from "@/lib/concept-blank/scan/model";
import type { ScanPage, ScanRead } from "@/contracts/conceptBlankScan.contract";
import type { ScanMarkupResult } from "@/contracts/conceptBlankScanMarkup.contract";
// @ts-expect-error — 측정 도구의 mjs
import { callClaude, requireSubscription, externalDirectory } from "./scan-cli.mjs";

type Variant = [category: string, answer: string, expected: string];
const here = import.meta.dirname;
const suite = JSON.parse(readFileSync(path.join(here, "semantic-cases.json"), "utf8"))
  .currentBankSuite as { groups: { grade: string; bankId: string; variants: Variant[] }[] };

const root = externalDirectory(process.argv[2]);
const model = process.argv[3] ?? "claude-opus-5-5";
const effort = process.argv[4] ?? "high";
const rounds = Number(process.argv[5] ?? 1);
mkdirSync(root, { recursive: true });

function pageFor(g: (typeof suite.groups)[number]) {
  const raw = readFileSync(
    path.resolve(here, `../../../src/lib/concept-blank/bank/assessments/${g.grade}.json`),
    "utf8",
  );
  const q = JSON.parse(raw)[g.bankId].bQuestion;
  const page: ScanPage = {
    number: 1,
    form: "term",
    questions: g.variants.map((_, i) => ({
      id: `q${i + 1}`,
      number: i + 1,
      sourceId: g.bankId,
      prompt: q.prompt,
    })),
    slots: g.variants.map((_, i) => ({
      id: `q${i + 1}.answer`,
      questionId: `q${i + 1}`,
      kind: "answer" as const,
      label: "답",
    })),
    targets: g.variants.map((_, i) => ({
      id: `q${i + 1}.t`,
      questionId: `q${i + 1}`,
      kind: "concept" as const,
      slotIds: [`q${i + 1}.answer`],
      referenceAnswer: q.answer,
      requiredIdeas: q.requiredIdeas,
    })),
  };
  const readings: ScanRead[] = g.variants.map(([category, answer], i) => ({
    id: `q${i + 1}.answer`,
    status: !answer ? "blank" : category === "unreadable" ? "unreadable" : "read",
    text: !answer || category === "unreadable" ? "" : answer,
  }));
  return { page, readings, ideas: q.requiredIdeas as { anyOf: string[] }[] };
}

async function main() {
  const auth = await requireSubscription(root);
  const rows: unknown[] = [];
  for (let round = 1; round <= rounds; round++)
    for (const g of suite.groups) {
      const file = path.join(root, `${g.bankId}.r${round}.json`);
      if (existsSync(file)) {
        rows.push(JSON.parse(readFileSync(file, "utf8")));
        continue;
      }
      const { page, readings, ideas } = pageFor(g);
      let raw = "";
      const invoke: ScanModel = async (request) => {
        const c = await callClaude({
          model,
          effort,
          prompt: request.prompt,
          cwd: root,
          logFile: path.join(root, `${g.bankId}.r${round}.call.json`),
        });
        raw = c.text;
        return c.text;
      };
      let markup: ScanMarkupResult = { notes: [], dropped: [] };
      const grades = await gradeScanPage(
        { page, readings, corrections: [], markup: { onNotes: (r) => void (markup = r) } },
        invoke,
      );
      const record = {
        bankId: g.bankId,
        round,
        cases: g.variants.map(([category, answer, expected], i) => ({
          target: `q${i + 1}.t`,
          category,
          answer,
          expected,
          actual: grades[i]!.label,
          reason: grades[i]!.reason,
          notes: markup.notes.filter((n) => n.targetId === `q${i + 1}.t`),
        })),
        dropped: markup.dropped,
        ideas,
        raw,
      };
      writeFileSync(file, JSON.stringify(record, null, 1));
      rows.push(record);
      console.log(`${g.bankId} r${round}: notes ${markup.notes.length}, dropped ${markup.dropped.length}`);
    }
  writeFileSync(path.join(root, "summary-input.json"), JSON.stringify({ auth, model, effort, rounds, rows }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
