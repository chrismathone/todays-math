/**
 * «개념을 묻는다» 처분 원장(2026-10-03) — 26 §11 · 브리프 `docs/planning/tracks/briefs/cb-havruta.md`.
 *
 * 원장님: «말 그대로 개념 백지이므로 개념에 관한 백지 테스트가 되어야 함 · 목적은 학생에게 이 개념을 얼마나 이해하는가
 * 하브루타 수업을 하는 것 — 직접 설명하게 하는 것». 은행에는 수를 넣어 한 번 계산하면 끝나는 문항이 많다. 그 문항을 줄 세운다.
 *
 * 원장 한 줄 = 다시 봐야 하는 문항 하나. 처분은 **은행의 글에서 읽는다**(전수 검토 원장 `../review/ledger.ts` 와 같은 방식).
 * 🔴 «고침»은 «글이 달라졌고 줄에 선 까닭이 사라졌다»까지만 말한다 — 개념 물음으로 잘 바꿨는지는 검산과 리드 표본이 본다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ConceptBlankBank } from "../../../../src/contracts/conceptBlank.contract";
import { type BankItem, itemText, shaOf } from "../review/ledger";

export const HAVRUTA_GRADES = [
  "e3",
  "e4",
  "e5",
  "e6",
  "m1",
  "m2",
  "m3",
] as const;
export type HavrutaGrade = (typeof HAVRUTA_GRADES)[number];

export const HAVRUTA_DIR = join(__dirname, "ledger");
export const havrutaPath = (name: string) => join(HAVRUTA_DIR, `${name}.json`);

/**
 * 줄에 선 까닭.
 * - `case` — 사례 표지(`givenCase`)가 달린 개념 카드: 특정한 수로 한 번 계산해 보인 장. **보편 진술로 다시 쓰거나 뺀다**(둘 수 없다).
 * - `calc` — 답에 수가 든 적용 문항. 개념을 써서 판단 · 설명하는 물음으로 다시 쓴다. 고친 뒤에도 답이 값뿐이면(`isBareValue`)
 *   «남음»이다 — 근거를 붙여 말로 쓴다. 까닭을 적고 둘 수 있는 것은 **수 자체가 개념**일 때뿐이다(직각 $90^\circ$ · 단위 환산).
 * - `num` — 문장에 수가 든 ○×. 참 · 거짓을 가르는 것이 계산 결과면 다시 쓰고, 개념이면 훑고 둔다(까닭 없이 닫을 수 있다).
 */
export type HavrutaQueue = "case" | "calc" | "num";

export type HavrutaRow = {
  id: string;
  queue: HavrutaQueue;
  /** 줄을 세운 시점(커밋 763caff59) 글의 지문. */
  sha: string;
  /** 그때의 자리 — 문항을 빼면 은행에서 사라지므로 «어느 칸이 비었나»를 여기서 읽는다. */
  at: { section: string; type: "concepts" | "ox" | "apply"; level: string };
  /** 고치지 않기로 한 까닭(`calc` 는 한 줄 까닭이 있어야 한다 · `num` 은 빈 글이어도 된다 · `case` 는 둘 수 없다). */
  kept?: string;
  /** 뺀 까닭 — «쓸 개념이 없다»를 한 줄로. 은행에서 사라진 줄은 이것이 있어야 한다. */
  gone?: string;
};
export type HavrutaLedger = {
  name: string;
  complete: boolean;
  rows: HavrutaRow[];
};

/** 수식(`$…$`) 밖에 남는 한글 글자 수 — 단위 · 세는 말(개 · 명 · 바퀴)뿐인지, 말로 한 설명인지 가른다. */
const hangulOutsideMath = (text: string) =>
  (text.replace(/\$[^$]*\$/g, "").match(/[가-힣]/g) ?? []).length;

/**
 * 답이 «값뿐»인가 — 수가 들었고 수식 밖의 말이 다섯 글자 이하(«$124$개» · «$3$, $4$» · «$15$바퀴»).
 * 설명으로 답하는 문항은 말이 길다(«$2$는 백의 자리에 쓴다 — 십의 묶음 $24$개이기 때문»).
 */
export const isBareValue = (answer: string) =>
  /\d/.test(answer) && hangulOutsideMath(answer) <= 5;

/** 줄에 서는가 — 씨앗과 «새로 만들지 않는다» 시험이 같이 쓴다. */
export function queueOf(entry: BankItem): HavrutaQueue | null {
  if (entry.type === "concepts") return entry.item.givenCase ? "case" : null;
  if (entry.type === "apply")
    return /\d/.test(entry.item.answer) ? "calc" : null;
  if (entry.type === "ox")
    return /\d/.test(entry.item.statement) ? "num" : null;
  return null;
}

export type HavrutaStatus = "고침" | "둠" | "뺌" | "남음";

export function havrutaStatus(
  row: HavrutaRow,
  index: Map<string, BankItem>,
): HavrutaStatus {
  const entry = index.get(row.id);
  if (!entry) return "뺌";
  const changed = shaOf(itemText(entry)) !== row.sha;
  if (row.queue === "case") {
    const marked = entry.type === "concepts" && entry.item.givenCase === true;
    return changed && !marked ? "고침" : "남음";
  }
  if (row.queue === "calc") {
    const bare = entry.type === "apply" && isBareValue(entry.item.answer);
    if (changed && !bare) return "고침";
    return row.kept === undefined ? "남음" : "둠";
  }
  if (changed) return "고침";
  return row.kept === undefined ? "남음" : "둠";
}

/** 원장의 흠 — 시험과 진행표가 같이 쓴다. */
export function havrutaFaults(
  ledger: HavrutaLedger,
  index: Map<string, BankItem>,
): string[] {
  const faults: string[] = [];
  const seen = new Set<string>();
  for (const row of ledger.rows) {
    if (seen.has(row.id)) faults.push(`${row.id}: 원장에 두 번`);
    seen.add(row.id);
    const status = havrutaStatus(row, index);
    if (status === "뺌" && (row.gone ?? "").trim().length < 4)
      faults.push(`${row.id}: 뺀 문항은 까닭 한 줄(gone)이 있어야 한다`);
    if (status !== "뺌" && row.gone !== undefined)
      faults.push(`${row.id}: 은행에 있는 문항에 뺀 까닭(gone)이 적혀 있다`);
    if (row.queue === "case" && row.kept !== undefined)
      faults.push(
        `${row.id}: 사례 카드는 둘 수 없다 — 보편 진술로 다시 쓰거나 뺀다`,
      );
    if (
      status === "둠" &&
      row.queue === "calc" &&
      (row.kept ?? "").trim().length < 4
    )
      faults.push(
        `${row.id}: 값으로 답하는 적용을 두려면 «수 자체가 개념»이라는 까닭이 있어야 한다`,
      );
    if (ledger.complete && status === "남음")
      faults.push(`${row.id}: 끝났다는 원장에 남은 줄`);
  }
  return faults;
}

export function readHavruta(name: string): HavrutaLedger | null {
  const file = havrutaPath(name);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as HavrutaLedger)
    : null;
}

/** 한 줄에 한 문항 — 트랙이 서로 다른 줄을 고쳐도 병합이 부딪히지 않게. */
export function writeHavruta(ledger: HavrutaLedger): void {
  const rows = ledger.rows
    .map((row) => `    ${JSON.stringify(row)}`)
    .join(",\n");
  writeFileSync(
    havrutaPath(ledger.name),
    `{\n  "name": ${JSON.stringify(ledger.name)},\n  "complete": ${ledger.complete},\n  "rows": [\n${rows}\n  ]\n}\n`,
  );
}

/**
 * 뺀 문항이 비운 칸 — `소단원 열쇠 · 칸 · 난이도` 마다 몇 장을 뺐나. «소단원마다 10개씩» 시험이 이만큼을 봐준다
 * (원장님 2026-10-03 «정말 추가할 만한 게 없으면 그렇게 해»).
 */
export function retiredCounts(
  bank: ConceptBlankBank,
  ledgers: readonly (HavrutaLedger | null)[] = HAVRUTA_GRADES.map(readHavruta),
): Map<string, number> {
  const alive = new Set(
    [...bank.concepts, ...bank.ox, ...bank.apply].map((x) => x.id),
  );
  const counts = new Map<string, number>();
  for (const ledger of ledgers)
    for (const row of ledger?.rows ?? []) {
      if (alive.has(row.id) || (row.gone ?? "").trim().length < 4) continue;
      const key = retiredKey(row.at.section, row.at.type, row.at.level);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  return counts;
}
export const retiredKey = (section: string, type: string, level: string) =>
  [section, type, level].join(" | ");

export const gradeOfId = (id: string) => id.slice(0, 2) as HavrutaGrade;
