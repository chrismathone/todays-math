/**
 * 개념 백지 전수 검토(2026-10-02)의 처분 원장을 잠근다 — 26 §10.
 * 원장은 «다시 봐야 하는 문항»의 목록이고 처분은 은행의 글에서 읽는다(고침 · 둠 · 뺌 · 남음).
 * «끝»이라고 적은 학년에 남은 줄이 있거나, 외부 검토 문항을 까닭 없이 두면 빨갛다.
 */
import { describe, expect, it } from "vitest";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import {
  hasNumberKeyword,
  indexBank,
  itemText,
  keywordsInsideTerm,
  ledgerFaults,
  readLedger,
  REVIEW_GRADES,
  rowStatus,
  shaOf,
  type Ledger,
} from "../../../scripts/qa/concept-blank/review/ledger";

const index = indexBank(CONCEPT_BLANK_BANK);
const NAMES = [...REVIEW_GRADES, "figures"];

describe("concept blank review ledger", () => {
  it.each(NAMES)("%s ledger has no faults", (name) => {
    const ledger = readLedger(name);
    expect(ledger, `${name} 원장이 없다`).not.toBeNull();
    const faults = ledgerFaults(ledger!, index);
    expect(faults.slice(0, 20), `흠 ${faults.length}`).toEqual([]);
  });

  it.each(REVIEW_GRADES)("%s ledger holds only its own grade", (grade) => {
    const stray = readLedger(grade)!.rows.filter(
      (r) => !r.id.startsWith(`${grade}-`),
    );
    expect(stray.map((r) => r.id)).toEqual([]);
  });

  it("the ledger ruler says both yes and no", () => {
    const [first] = CONCEPT_BLANK_BANK.apply;
    const sha = shaOf(itemText({ type: "apply", item: first! }));
    const ledger = (rows: Ledger["rows"], complete = false): Ledger => ({
      name: "x",
      complete,
      rows,
    });
    const row = { id: first!.id, queues: ["packet:condition_or_wording"], sha };
    expect(rowStatus(row, index)).toBe("남음");
    expect(rowStatus({ ...row, sha: "000000000000" }, index)).toBe("고침");
    expect(rowStatus({ ...row, kept: "교과서 관행" }, index)).toBe("둠");
    expect(rowStatus({ ...row, id: "e3-0-0-0-a999" }, index)).toBe("뺌");
    // 끝났다는 원장에 남은 줄 · 까닭 없는 둠 · 다시 써야 하는 줄의 둠 · 두 번 적힌 문항
    expect(ledgerFaults(ledger([row], true), index)).toHaveLength(1);
    expect(ledgerFaults(ledger([row], false), index)).toEqual([]);
    expect(ledgerFaults(ledger([{ ...row, kept: "" }]), index)).toHaveLength(1);
    expect(
      ledgerFaults(ledger([{ ...row, queues: ["num"], kept: "" }]), index),
    ).toEqual([]);
    expect(
      ledgerFaults(
        ledger([{ ...row, queues: ["rewrite"], kept: "그대로 둔다" }]),
        index,
      ),
    ).toHaveLength(1);
    expect(ledgerFaults(ledger([row, row]), index)).toHaveLength(1);
  });

  it("the queue rulers say both yes and no", () => {
    expect(hasNumberKeyword("$4$의 $0.3$배는 {$1.2$}이다.")).toBe(true);
    expect(hasNumberKeyword("$10$개를 {윗자리}로 올린다.")).toBe(false);
    expect(
      keywordsInsideTerm("세로셈", "위아래로 적는 방법을 {세로셈}이라 한다."),
    ).toBe(true);
    expect(
      keywordsInsideTerm(
        "세로셈",
        "{자리에 맞추어} 위아래로 적는 방법을 {세로셈}이라 한다.",
      ),
    ).toBe(false);
  });
});
