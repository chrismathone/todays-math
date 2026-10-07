/** Verify direct-reading records against each worker's documented fingerprint domain. */
import {
  contentHash,
  type ProposalRecord,
  type NormalizedProposal,
} from "./proposals";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";

export type EditorialScope = "e3e4" | "e5e6" | "middle";
const FIELDS: Record<EditorialScope, string[]> = {
  e3e4: [
    "bDecision",
    "bPrompt",
    "bAnswer",
    "bRequiredIdeas",
    "cDecision",
    "cStudentSentence",
    "cSlotAnswers",
    "coreAfter",
  ],
  e5e6: [
    "id",
    "bDecision",
    "cDecision",
    "bQuestion",
    "clozeQuestion",
    "coreAfter",
    "learningRole",
    "questionExclusions",
    "requiredDiagramPaths",
  ],
  middle: [
    "bDecision",
    "bPrompt",
    "bAnswer",
    "bRequiredIdeas",
    "cDecision",
    "cMarkedSentence",
    "cAcceptedAnswers",
    "coreAfter",
  ],
};

/** Mirrors Python json.dumps(sort_keys=True, ensure_ascii=False) for these JSON-only records. */
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sorted(record[key])]),
    );
  }
  return value;
}

export function workerFingerprint(
  scope: EditorialScope,
  row: ProposalRecord,
): string {
  const fields = Object.fromEntries(
    FIELDS[scope].map((key) => [
      key,
      scope === "middle" ? row[key] : (row[key] ?? null),
    ]),
  );
  return contentHash(scope === "middle" ? fields : sorted(fields));
}

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
export function editorialRows(data: unknown): ProposalRecord[] {
  const rows = Array.isArray(data) ? data : (data as { rows?: unknown })?.rows;
  if (!Array.isArray(rows)) throw new Error("최종 직접 읽기 장부가 없습니다.");
  const ids = new Set<string>();
  return rows.map((value: unknown) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new Error("최종 직접 읽기 행의 형식 오류");
    const row = value as ProposalRecord;
    if (!text(row.id) || ids.has(row.id))
      throw new Error("최종 직접 읽기 ID 누락 또는 중복");
    ids.add(row.id);
    return row;
  });
}

/** A current fingerprint records reading; it is not independent or student-efficacy approval. */
export function verifyEditorialRow(
  scope: EditorialScope,
  raw: ProposalRecord,
  proposal: NormalizedProposal,
  ledger: ProposalRecord | undefined,
): string[] {
  const issues: string[] = [];
  const fingerprint = workerFingerprint(scope, raw);
  if (fingerprint !== raw.proposalFingerprint)
    issues.push("작성자가 기록한 문항 지문과 실제 필드가 다름");
  if (!ledger) return [...issues, "이 ID의 최종 직접 읽기 기록 없음"];
  if (ledger.id !== raw.id || ledger.sourceIndex !== raw.sourceIndex)
    issues.push("최종 읽기 ID·원천 순서 불일치");
  const recorded =
    scope === "e5e6"
      ? ledger.proposalFingerprintReviewed
      : ledger.proposalFingerprint;
  if (recorded !== fingerprint)
    issues.push("최종 읽기 후 질문·답·기준·일반 설명이 바뀜");
  if (!text(raw.learningRole) || ledger.learningRole !== raw.learningRole)
    issues.push("현재 학습 역할과 직접 읽기 기록이 다름");
  if ("prompt" in proposal.B) {
    const rawIdeas = Array.isArray(raw.bRequiredIdeas)
      ? raw.bRequiredIdeas.map((idea) =>
          typeof idea === "string" ? { anyOf: [idea] } : idea,
        )
      : raw.bRequiredIdeas;
    if (
      proposal.B.prompt !== raw.bPrompt ||
      proposal.B.answer !== raw.bAnswer ||
      contentHash(proposal.B.requiredIdeas) !== contentHash(rawIdeas)
    )
      issues.push("읽은 B 질문·답·기준과 실제 assembled 문항이 다름");
  }
  if (scope === "e3e4") {
    if (
      ledger.verdict !== "retain-planning-proposal" ||
      !text(ledger.bReason) ||
      !text(ledger.cReason) ||
      !Array.isArray(ledger.issues) ||
      ledger.issues.length
    )
      issues.push("최종 직접 읽기에 미해결 수정 또는 이유 누락");
    if (!text(ledger.reader) || !ledger.reader.includes("Codex direct"))
      issues.push("직접 읽기 출처 불명");
    if (
      ledger.bDecision !== raw.bDecision ||
      ledger.cDecision !== raw.cDecision
    )
      issues.push("형식 결정과 직접 읽기 기록 불일치");
    if ("sentence" in proposal.C) {
      const pieces = splitBlankSentence(proposal.C.sentence);
      const masked = pieces
        .map((piece) => (piece.kind === "key" ? "□" : piece.text))
        .join("");
      const keys = pieces
        .filter((piece) => piece.kind === "key")
        .map((piece) => piece.text);
      if (!text(raw.cStudentSentence) || !Array.isArray(raw.cSlotAnswers))
        issues.push("직접 읽은 C 학생 문장·빈칸 키가 없음");
      else {
        const slots = raw.cSlotAnswers as {
          expected?: unknown;
          equivalents?: unknown;
        }[];
        if (
          raw.cStudentSentence !== masked ||
          slots.length !== keys.length ||
          slots.some(
            (slot, index) =>
              slot.expected !== keys[index] || !Array.isArray(slot.equivalents),
          )
        )
          issues.push("읽은 C 학생 문장·키와 적용 문장이 다름");
        else {
          const accepted = slots.map((slot) => [
            ...new Set([slot.expected, ...(slot.equivalents as unknown[])]),
          ]);
          if (contentHash(accepted) !== contentHash(proposal.C.acceptedAnswers))
            issues.push("읽은 C 동치 답과 실제 인정 답 배열이 다름");
        }
      }
    }
  } else if (scope === "e5e6") {
    if (
      ledger.bVerdict !== "adopt" ||
      ledger.cVerdict !== "adopt" ||
      !text(ledger.reason) ||
      !text(ledger.inputEvidence) ||
      !text(ledger.recordedAfterDirectReading)
    )
      issues.push("최종 실제 물음의 개별 채택 또는 읽기 증거 누락");
    if (
      ledger.bSourceDecision !== raw.bDecision ||
      ledger.cSourceDecision !== raw.cDecision
    )
      issues.push("형식 결정과 직접 읽기 기록 불일치");
  } else {
    // Some middle-scope records use "exclude" to adopt a form-specific exclusion.
    // It is a settled editorial decision only when the actual authoring decision agrees.
    const adopted = (form: "b" | "c") =>
      ledger[`${form}Verdict`] === "keep" ||
      (raw[`${form}Decision`] === "exclude" &&
        ledger[`${form}Verdict`] === "exclude");
    if (
      !adopted("b") ||
      !adopted("c") ||
      !text(ledger.bReason) ||
      !text(ledger.cReason) ||
      !text(ledger.reader) ||
      !ledger.reader.includes("Codex") ||
      !text(ledger.readAt)
    )
      issues.push("최종 질문·답·기준을 직접 읽고 남긴 개별 채택 기록 없음");
    if ("sentence" in proposal.C && raw.cMarkedSentence !== proposal.C.sentence)
      issues.push("읽은 C 표지 문장과 적용 문장이 다름");
    if (
      "sentence" in proposal.C &&
      contentHash(raw.cAcceptedAnswers) !==
        contentHash(proposal.C.acceptedAnswers)
    )
      issues.push("읽은 C 동치 답과 적용 인정 답이 다름");
  }
  return issues;
}
