/** Separate source grammar corrections; never part of B/C proposal normalization. */
import type {
  ConceptBlankBank,
  ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import { josaFaults } from "@/lib/elementary/rules";

export type ExamplePromptChange = {
  part: string;
  id: string;
  before: string;
  after: string;
  reason: string;
};

const opposite: Record<string, string> = {
  을: "를",
  를: "을",
  이: "가",
  가: "이",
  과: "와",
  와: "과",
  은: "는",
  는: "은",
  로: "으로",
  으로: "로",
};

/** Exactly one measured math-following particle may change; every other character stays. */
export function validateExampleParticleChange(
  before: string,
  after: string,
): void {
  const faults = josaFaults(before);
  if (faults.length !== 1 || josaFaults(after).length !== 0)
    throw new Error("예문 교정은 조사 결함 하나만 없애야 합니다.");
  const fault = faults[0]!;
  const match = fault.match(/^(\$[^$]*\$ ?)(으로|로|을|를|이|가|과|와|은|는)$/);
  if (!match) throw new Error("예문 조사 결함의 위치를 확인할 수 없습니다.");
  const position = before.indexOf(fault);
  const expected =
    before.slice(0, position) +
    match[1] +
    opposite[match[2]!] +
    before.slice(position + fault.length);
  if (position < 0 || after !== expected)
    throw new Error("예문 교정에 조사 이외의 문구나 수식 변경이 있습니다.");
}

/** Accept a strict array, bound to immutable original ID/part/prompt, in bank order. */
export function validateExamplePromptChanges(
  baseline: Readonly<Record<string, ConceptBlankBank>>,
  input: unknown = [],
): ExamplePromptChange[] {
  if (!Array.isArray(input)) throw new Error("예문 교정 배열이 없습니다.");
  const originals = Object.entries(baseline).flatMap(([part, bank]) =>
    bank.concepts.map((entry) => ({ part, entry })),
  );
  const byId = new Map(originals.map((row) => [row.entry.id, row]));
  if (byId.size !== originals.length)
    throw new Error("원천 예문 ID가 중복됩니다.");
  const seen = new Set<string>();
  const fields = ["part", "id", "before", "after", "reason"];
  const changes = input.map((value: unknown): ExamplePromptChange => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("예문 교정 행의 형식 오류");
    const row = value as Record<string, unknown>;
    if (
      Object.keys(row).length !== fields.length ||
      Object.keys(row).some((key) => !fields.includes(key)) ||
      fields.some(
        (key) => typeof row[key] !== "string" || !(row[key] as string).trim(),
      )
    )
      throw new Error("예문 교정은 part·id·before·after·reason만 필요합니다.");
    const change = row as ExamplePromptChange;
    if (seen.has(change.id)) throw new Error(`중복 예문 교정 ID: ${change.id}`);
    seen.add(change.id);
    const original = byId.get(change.id);
    if (
      !original ||
      original.part !== change.part ||
      original.entry.example?.prompt !== change.before
    )
      throw new Error(
        `예문 교정의 원천 ID·part·before가 다릅니다: ${change.id}`,
      );
    validateExampleParticleChange(change.before, change.after);
    return {
      part: change.part,
      id: change.id,
      before: change.before,
      after: change.after,
      reason: change.reason,
    };
  });
  const order = new Map(originals.map((row, index) => [row.entry.id, index]));
  return changes.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

/** Retain the answer and all non-prompt fields exactly. */
export function withExamplePromptChange(
  entry: ConceptEntry,
  change?: ExamplePromptChange,
): ConceptEntry {
  if (!change) return entry;
  if (entry.id !== change.id || entry.example?.prompt !== change.before)
    throw new Error(`후보 예문이 교정 기준과 다릅니다: ${change.id}`);
  return { ...entry, example: { ...entry.example, prompt: change.after } };
}
