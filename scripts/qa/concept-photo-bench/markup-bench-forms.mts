/**
 * 사진 위 첨삭(M1) 측정 — B(질문 · ○×) · C(빈칸 · 적용) 합성 학생지.
 * 제품의 gradeScanPage(markup) 를 그대로 부르고 모델만 구독 CLI 로 바꾼다 (markup-bench.mts 와 같은 방식).
 *
 *   npx tsx --conditions=react-server scripts/qa/concept-photo-bench/markup-bench-forms.mts <저장소 밖 폴더> [model] [effort] [rounds]
 *
 * 지면은 markup-cases.json 에 얼린 스냅숏이다(오늘의 은행으로 다시 만들지 않는다).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { ScanModel } from "@/lib/concept-blank/scan/model";
import type { ScanPage, ScanRead } from "@/contracts/conceptBlankScan.contract";
import type { ScanMarkupResult } from "@/contracts/conceptBlankScanMarkup.contract";
// @ts-expect-error — 측정 도구의 mjs
import { callClaude, requireSubscription, externalDirectory } from "./scan-cli.mjs";

type GradeModule = typeof import("@/lib/concept-blank/scan/grade");
// tsx 는 .ts 를 cjs 로 옮겨 이름 내보내기가 default 아래에 있을 수 있다.
const gradeModule = (await import("@/lib/concept-blank/scan/grade")) as GradeModule & {
  default?: GradeModule;
};
const gradeScanPage = gradeModule.gradeScanPage ?? gradeModule.default!.gradeScanPage;

type Sheet = {
  section: string;
  page: number;
  name: string;
  answers: Record<string, string | null>;
  expected: Record<string, string>;
};
const cases = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "markup-cases.json"), "utf8"),
) as { pages: Record<string, ScanPage[]>; sheets: Sheet[] };

const root = externalDirectory(process.argv[2]);
const model = process.argv[3] ?? "claude-opus-5-5";
const effort = process.argv[4] ?? "high";
const rounds = Number(process.argv[5] ?? 3);
mkdirSync(root, { recursive: true });

const auth = await requireSubscription(root);
const rows: unknown[] = [];
for (let round = 1; round <= rounds; round++)
  for (const sheet of cases.sheets) {
    const key = `${sheet.section}.p${sheet.page}.${sheet.name}.r${round}`;
    const file = path.join(root, `${key}.json`);
    if (existsSync(file)) {
      rows.push(JSON.parse(readFileSync(file, "utf8")));
      continue;
    }
    const page = cases.pages[sheet.section]!.find((p) => p.number === sheet.page)!;
    const readings: ScanRead[] = page.slots.map((s) => {
      const text = sheet.answers[s.id];
      return text
        ? { id: s.id, status: "read" as const, text }
        : { id: s.id, status: "blank" as const, text: "" };
    });
    let raw = "";
    const invoke: ScanModel = async (request) => {
      const c = await callClaude({
        model,
        effort,
        prompt: request.prompt,
        cwd: root,
        logFile: path.join(root, `${key}.call.json`),
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
      key,
      round,
      form: page.form,
      targets: page.targets.map((t, i) => ({
        target: t.id,
        kind: t.kind,
        answers: t.slotIds.map((id) => sheet.answers[id] ?? ""),
        expected: sheet.expected[t.id],
        actual: grades[i]!.label,
        reason: grades[i]!.reason,
        notes: markup.notes.filter((n) => n.targetId === t.id),
      })),
      dropped: markup.dropped,
      raw,
    };
    writeFileSync(file, JSON.stringify(record, null, 1));
    rows.push(record);
    console.log(`${key}: notes ${markup.notes.length}, dropped ${markup.dropped.length}`);
  }
writeFileSync(
  path.join(root, "summary-input.json"),
  JSON.stringify({ auth, model, effort, rounds, rows }, null, 1),
);
