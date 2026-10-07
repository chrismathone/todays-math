/** Read-only verification of content-bound, two-stage independent review evidence. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import { contentHash, type NormalizedProposal } from "./proposals";

type BlindVerdict = [string, "B" | "C", string, "pass" | "revise", string];
type KeyVerdict = [
  string,
  "pass" | "excluded" | "revise",
  "pass" | "excluded" | "revise",
  "pass" | "none" | "revise",
  string,
];
type Result = {
  inputHash: string;
  blind: BlindVerdict[];
  keyed: KeyVerdict[];
};
type ReviewPacket = { inputHash: string; rows: NormalizedProposal[] };
type ReviewMeta = { inputHash: string; provider: string; model: string };
export type IndependentEvidence = {
  id: string;
  contentHash: string;
  packet: string;
  inputHash: string;
  blindProvider: string;
  blindModel: string;
  keyProvider: string;
  keyModel: string;
  accepted: boolean;
  issues: string[];
};
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8")) as T;

/** No cached approvedIds, authored-draft verdict, or another row version is trusted. */
export function verifyIndependentRow(
  row: NormalizedProposal,
  blind: BlindVerdict[],
  keyed: KeyVerdict[],
): string[] {
  const issues: string[] = [];
  const expected = [
    ...("prompt" in row.B ? ["B"] : []),
    ...("sentence" in row.C ? ["C"] : []),
  ];
  const actual = blind.filter((verdict) => verdict[0] === row.id);
  if (
    actual.length !== expected.length ||
    expected.some(
      (form) => actual.filter((verdict) => verdict[1] === form).length !== 1,
    )
  )
    issues.push("실제로 보이는 형식별 독립 답변이 빠짐");
  for (const verdict of actual) {
    if (!expected.includes(verdict[1]))
      issues.push("제외한 형식의 답변이 섞임");
    if (
      verdict[3] !== "pass" ||
      verdict[4] !== "" ||
      typeof verdict[2] !== "string" ||
      !verdict[2].trim()
    )
      issues.push(
        `blind-${verdict[1]}: ${verdict[4] || "답 또는 통과 판정 없음"}`,
      );
  }
  const key = keyed.filter((verdict) => verdict[0] === row.id);
  if (key.length !== 1)
    issues.push("문항·참고 답·기준의 2차 검토가 한 건이 아님");
  else {
    const verdict = key[0]!;
    if (verdict[1] !== ("excluded" in row.B ? "excluded" : "pass"))
      issues.push("B의 실제 결정과 2차 판정이 다름");
    if (verdict[2] !== ("excluded" in row.C ? "excluded" : "pass"))
      issues.push("C의 실제 결정과 2차 판정이 다름");
    if (
      row.coreAfter
        ? verdict[3] !== "pass"
        : !["none", "pass"].includes(verdict[3])
    )
      issues.push("일반 설명 교정의 독립 검토가 통과하지 않음");
    if (verdict[4] !== "") issues.push(verdict[4]);
  }
  return issues;
}

/** Packet hashes, row hashes, exact ID/form coverage, provenance and raw outputs are required. */
export function readIndependentEvidence(directory: string): {
  evidence: IndependentEvidence[];
  invalidPackets: { packet: string; reason: string }[];
} {
  const evidence: IndependentEvidence[] = [];
  const invalidPackets: { packet: string; reason: string }[] = [];
  for (const file of readdirSync(directory)
    .filter((name) => name.endsWith("-result.json"))
    .sort()) {
    const packet = file.replace(/-result\.json$/, "");
    try {
      const packetEvidence: IndependentEvidence[] = [];
      const source = read<ReviewPacket>(
        resolve(directory, `${packet}-source.json`),
      );
      const result = read<Result>(resolve(directory, file));
      const blindMeta = read<ReviewMeta>(
        resolve(directory, `${packet}-blind-meta.json`),
      );
      const keyMeta = read<ReviewMeta>(
        resolve(directory, `${packet}-key-meta.json`),
      );
      if (
        contentHash(source.rows) !== source.inputHash ||
        [result, blindMeta, keyMeta].some(
          (value) => value.inputHash !== source.inputHash,
        )
      )
        throw new Error("코호트 입력 지문이 다릅니다.");
      for (const suffix of [
        "blind-raw.md",
        "key-raw.md",
        "blind-input.md",
        "key-input.md",
      ]) {
        if (!existsSync(resolve(directory, `${packet}-${suffix}`)))
          throw new Error(`원문 증거 없음: ${suffix}`);
      }
      if (
        ![blindMeta, keyMeta].every(
          (meta) =>
            meta.provider === "claude" &&
            ["opus", "sonnet"].includes(meta.model),
        )
      )
        throw new Error("독립 검토 모델의 실제 출처를 확인할 수 없습니다.");
      const ids = new Set(source.rows.map((row) => row.id));
      if (
        ids.size !== source.rows.length ||
        result.keyed.length !== ids.size ||
        new Set(result.keyed.map((row) => row[0])).size !== ids.size ||
        result.keyed.some((row) => !ids.has(row[0]))
      )
        throw new Error("2차 검토의 ID 목록이 정확히 일치하지 않습니다.");
      const expectedBlind = new Set(
        source.rows.flatMap((row) => [
          ...("prompt" in row.B ? [`${row.id}:B`] : []),
          ...("sentence" in row.C ? [`${row.id}:C`] : []),
        ]),
      );
      if (
        result.blind.length !== expectedBlind.size ||
        new Set(result.blind.map((row) => `${row[0]}:${row[1]}`)).size !==
          expectedBlind.size ||
        result.blind.some((row) => !expectedBlind.has(`${row[0]}:${row[1]}`))
      )
        throw new Error("1차 검토의 ID·형식 목록이 정확히 일치하지 않습니다.");
      for (const row of source.rows) {
        const { hash, ...fields } = row;
        if (contentHash(fields) !== hash)
          throw new Error(`문항 입력 지문 불일치: ${row.id}`);
        // Old malformed draft packets stay historical evidence and cannot approve a current valid row.
        if (
          "sentence" in row.C &&
          splitBlankSentence(row.C.sentence).filter(
            (piece) => piece.kind === "key",
          ).length !== row.C.acceptedAnswers.length
        )
          throw new Error(`C 빈칸·인정 답 대응 오류: ${row.id}`);
        const issues = verifyIndependentRow(row, result.blind, result.keyed);
        packetEvidence.push({
          id: row.id,
          contentHash: row.hash,
          packet,
          inputHash: source.inputHash,
          blindProvider: blindMeta.provider,
          blindModel: blindMeta.model,
          keyProvider: keyMeta.provider,
          keyModel: keyMeta.model,
          accepted: issues.length === 0,
          issues,
        });
      }
      evidence.push(...packetEvidence);
    } catch (error) {
      invalidPackets.push({
        packet,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { evidence, invalidPackets };
}
