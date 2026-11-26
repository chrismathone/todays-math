import "server-only";
import type {
  ScanCorrection,
  ScanGrade,
  ScanPage,
  ScanRead,
} from "@/contracts/conceptBlankScan.contract";
import {
  SCAN_MARKUP_MAX_NOTES_PER_TARGET,
  scanMarkupNoteSchema,
  type ScanMarkupNote,
  type ScanMarkupResult,
} from "@/contracts/conceptBlankScanMarkup.contract";

const MARKED_LABELS = new Set<ScanGrade["label"]>(["partial", "incorrect"]);

/** 같은 뜻의 글을 같게 비교한다: NFC · 공백 한 칸. 글자를 고치거나 추측하지 않는다. */
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
function occurrences(haystack: string, needle: string) {
  let count = 0;
  for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + 1))
    count++;
  return count;
}

/**
 * 모델이 낸 첨삭 가운데 «그려도 되는 것»만 남긴다 (계획 §3.1 · §6.2 4).
 * 판정은 건드리지 않는다. 버린 것은 까닭과 함께 돌려준다.
 */
export function validateScanMarkupNotes(input: {
  page: ScanPage;
  grades: readonly ScanGrade[];
  readings: readonly ScanRead[];
  corrections: readonly ScanCorrection[];
  /** 이번 호출에서 모델이 판정한 표적 — 결정적 판정(빈 답·교사 확인)에는 첨삭을 달지 않는다 */
  modelTargets: readonly string[];
  rows: readonly unknown[];
}): ScanMarkupResult {
  const targets = new Map(input.page.targets.map((t) => [t.id, t]));
  const grades = new Map(input.grades.map((g) => [g.id, g]));
  const readings = new Map(input.readings.map((r) => [r.id, r]));
  const corrected = new Set(input.corrections.map((c) => c.slotId));
  const modelTargets = new Set(input.modelTargets);
  const notes: ScanMarkupNote[] = [];
  const dropped: ScanMarkupResult["dropped"] = [];
  const seen = new Set<string>();
  const perTarget = new Map<string, number>();

  input.rows.forEach((row, index) => {
    const drop = (reason: ScanMarkupResult["dropped"][number]["reason"]) =>
      dropped.push({ index, reason });
    const parsed = scanMarkupNoteSchema.safeParse(row);
    if (!parsed.success) return drop("malformed");
    const n = parsed.data;
    const target = targets.get(n.targetId);
    if (!target) return drop("unknown-target");
    if (!modelTargets.has(target.id)) return drop("not-model-graded");
    const grade = grades.get(target.id);
    if (!grade || !MARKED_LABELS.has(grade.label) || grade.directlyEntered)
      return drop("label-not-marked");
    if (!target.slotIds.includes(n.slotId)) return drop("slot-not-in-target");
    if (corrected.has(n.slotId)) return drop("direct-entry");
    const reading = readings.get(n.slotId);
    if (!reading || reading.status !== "read") return drop("reading-not-read");
    const text = norm(reading.text),
      quote = norm(n.quote);
    const count = occurrences(text, quote);
    if (count === 0) return drop("quote-not-found");
    if (count > 1) return drop("quote-not-unique");
    const key = [n.targetId, n.slotId, n.kind, quote].join("\u0000");
    if (seen.has(key)) return drop("duplicate");
    const used = perTarget.get(target.id) ?? 0;
    if (used >= SCAN_MARKUP_MAX_NOTES_PER_TARGET) return drop("too-many");
    seen.add(key);
    perTarget.set(target.id, used + 1);
    notes.push({ ...n, quote });
  });
  return { notes, dropped };
}
