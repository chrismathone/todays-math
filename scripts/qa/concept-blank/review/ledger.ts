/**
 * 개념 백지 전수 검토(2026-10-02)의 처분 원장 — 26 §10 · 브리프 `docs/planning/tracks/briefs/cb-review.md`.
 *
 * 원장 한 줄 = 다시 봐야 하는 문항 하나. 줄마다 «왜 줄에 섰나»(`queues`)와 검토 시점 글의 지문(`sha`)을 싣는다.
 * 처분은 글에서 읽는다 — 글이 바뀌었으면 «고침», 그대로 두기로 했으면 `kept` 에 까닭, 은행에서 뺐으면 «뺌», 아니면 «남음».
 * 🔴 «고침»은 «글이 달라졌다»까지만 말한다(옳게 고쳤다는 뜻이 아니다 — 옳은지는 검산 · 형식별 읽기 · 리드 표본이 본다).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  blankKeywords,
  type ConceptBlankBank,
} from "../../../../src/contracts/conceptBlank.contract";
import { keywordsInsideTerm } from "../../../../src/lib/concept-blank/audit";

export const REVIEW_GRADES = [
  "e3",
  "e4",
  "e5",
  "e6",
  "m1",
  "m2",
  "m3",
] as const;
export type ReviewGrade = (typeof REVIEW_GRADES)[number];

export const LEDGER_DIR = join(__dirname, "ledger");
export const ledgerPath = (name: string) => join(LEDGER_DIR, `${name}.json`);

/**
 * 줄에 선 까닭.
 * - `packet:<분류>` — 외부 전수 검토가 의견을 단 문항(분류는 그 검토의 것).
 * - `num` — 핵심어에 숫자가 든 개념: «용어만 보고 굵은 핵심어를 하나로 정할 수 있나»(합의 안건 2).
 * - `copy` — 핵심어가 전부 용어 안에 든 개념: 굵은 글이 용어뿐이라 «용어 → 뜻»의 채점 기준이 비어 있다(안건 12).
 * - `example` — 예가 달린 개념: 개념 지도는 용어와 예 물음만 찍는다. 예 물음만 보고 풀 수 있나(안건 5).
 * - `rewrite` — 꼭 다시 써야 하는 것(초3 처음 은행의 예 56개 — 적용 문항을 옮긴 것, 안건 10). `kept` 로 닫을 수 없다.
 */
export type LedgerRow = {
  id: string;
  queues: string[];
  /** 검토 시점(커밋 13e9c330a) 글의 지문. */
  sha: string;
  /** 고치지 않기로 한 까닭 — 외부 검토 문항은 한 줄 까닭이 있어야 한다. 훑는 줄(`num` · `copy` · `example`)뿐이면 빈 글이어도 된다. */
  kept?: string;
};
export type Ledger = { name: string; complete: boolean; rows: LedgerRow[] };

export type BankItem =
  | { type: "concepts"; item: ConceptBlankBank["concepts"][number] }
  | { type: "ox"; item: ConceptBlankBank["ox"][number] }
  | { type: "apply"; item: ConceptBlankBank["apply"][number] }
  | { type: "figures"; item: ConceptBlankBank["figures"][number] };

/** 문항의 «글» — 지면에 찍히거나 채점에 쓰이는 칸만. 난이도 · 갈래 · 소단원은 넣지 않는다(이번 검토가 안 바꾸는 칸). */
export function itemText(entry: BankItem): string {
  switch (entry.type) {
    case "concepts": {
      const c = entry.item;
      return [
        c.term,
        c.definition,
        c.example?.prompt ?? "",
        c.example?.answer ?? "",
        // 사례 표지를 단 것도 «고침»이다 — 검토 시점에는 표지가 없었으니 그때의 지문은 그대로다.
        ...(c.givenCase ? ["사례"] : []),
      ].join("\n");
    }
    case "ox":
      return [
        entry.item.statement,
        String(entry.item.answer),
        entry.item.why,
      ].join("\n");
    case "apply":
      return [entry.item.prompt, entry.item.answer].join("\n");
    case "figures": {
      const f = entry.item;
      return [
        f.prompt,
        f.viewBox,
        f.svg,
        JSON.stringify(f.tags),
        JSON.stringify(f.lines),
      ].join("\n");
    }
  }
}

export const shaOf = (text: string) =>
  createHash("sha1").update(text, "utf8").digest("hex").slice(0, 12);

export function indexBank(bank: ConceptBlankBank): Map<string, BankItem> {
  const index = new Map<string, BankItem>();
  for (const item of bank.concepts)
    index.set(item.id, { type: "concepts", item });
  for (const item of bank.ox) index.set(item.id, { type: "ox", item });
  for (const item of bank.apply) index.set(item.id, { type: "apply", item });
  for (const item of bank.figures)
    index.set(item.id, { type: "figures", item });
  return index;
}

export type RowStatus = "고침" | "둠" | "뺌" | "남음";

export function rowStatus(
  row: LedgerRow,
  index: Map<string, BankItem>,
): RowStatus {
  const entry = index.get(row.id);
  if (!entry) return "뺌";
  if (shaOf(itemText(entry)) !== row.sha) return "고침";
  return row.kept === undefined ? "남음" : "둠";
}

/** 훑는 줄 — 문항마다 까닭을 적지 않아도 «봤다»로 닫을 수 있다. */
export const SCREEN_QUEUES = ["num", "copy", "example"] as const;
export const isScreenOnly = (row: LedgerRow) =>
  row.queues.every((q) => (SCREEN_QUEUES as readonly string[]).includes(q));

/** 원장의 흠 — 시험과 진행표가 같이 쓴다. */
export function ledgerFaults(
  ledger: Ledger,
  index: Map<string, BankItem>,
): string[] {
  const faults: string[] = [];
  const seen = new Set<string>();
  for (const row of ledger.rows) {
    if (seen.has(row.id)) faults.push(`${row.id}: 원장에 두 번`);
    seen.add(row.id);
    const status = rowStatus(row, index);
    if (status === "둠" && row.queues.includes("rewrite"))
      faults.push(
        `${row.id}: 다시 써야 하는 줄(rewrite)은 «둠»으로 닫을 수 없다`,
      );
    if (
      status === "둠" &&
      !isScreenOnly(row) &&
      (row.kept ?? "").trim().length < 4
    )
      faults.push(
        `${row.id}: 외부 검토 문항을 두려면 까닭 한 줄이 있어야 한다`,
      );
    if (ledger.complete && status === "남음")
      faults.push(`${row.id}: 끝났다는 원장에 남은 줄`);
  }
  return faults;
}

export function readLedger(name: string): Ledger | null {
  const file = ledgerPath(name);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as Ledger)
    : null;
}

/** 한 줄에 한 문항 — 트랙이 서로 다른 줄을 고쳐도 병합이 부딪히지 않게. */
export function writeLedger(ledger: Ledger): void {
  const rows = ledger.rows
    .map((row) => `    ${JSON.stringify(row)}`)
    .join(",\n");
  writeFileSync(
    ledgerPath(ledger.name),
    `{\n  "name": ${JSON.stringify(ledger.name)},\n  "complete": ${ledger.complete},\n  "rows": [\n${rows}\n  ]\n}\n`,
  );
}

/** 핵심어에 숫자가 든 개념인가(`num`). */
export const hasNumberKeyword = (definition: string) =>
  blankKeywords(definition).some((k) => /\d/.test(k));

/** 핵심어가 전부 용어 안에 든 개념인가(`copy`) — 자는 제품 쪽에 있다(채점 안내도 같이 쓴다). */
export { keywordsInsideTerm };

export const gradeOfId = (id: string) => id.slice(0, 2) as ReviewGrade;
