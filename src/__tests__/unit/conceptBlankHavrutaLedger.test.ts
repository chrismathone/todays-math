/**
 * «개념을 묻는다» 처분 원장을 잠근다 — 26 §11(원장님 2026-10-03 «개념에 관한 백지 테스트 · 직접 설명하게 하는 것»).
 * 원장은 «수를 넣어 한 번 계산하면 끝나는 문항»의 목록이고 처분은 은행의 글에서 읽는다(고침 · 둠 · 뺌 · 남음).
 * 줄에 안 선 계산형이 새로 생기거나, 사례 카드를 그대로 두거나, 까닭 없이 빼면 빨갛다.
 */
import { describe, expect, it } from "vitest";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import {
  HAVRUTA_GRADES,
  havrutaFaults,
  havrutaStatus,
  isBareValue,
  queueOf,
  readHavruta,
  retiredCounts,
  retiredKey,
  type HavrutaLedger,
  type HavrutaRow,
} from "../../../scripts/qa/concept-blank/havruta/ledger";
import {
  indexBank,
  itemText,
  shaOf,
} from "../../../scripts/qa/concept-blank/review/ledger";

const index = indexBank(CONCEPT_BLANK_BANK);
const ledgers = HAVRUTA_GRADES.map(readHavruta);

describe("concept blank havruta ledger", () => {
  it.each(HAVRUTA_GRADES)("%s ledger has no faults", (grade) => {
    const ledger = readHavruta(grade);
    expect(ledger, `${grade} 원장이 없다`).not.toBeNull();
    const faults = havrutaFaults(ledger!, index);
    expect(faults.slice(0, 20), `흠 ${faults.length}`).toEqual([]);
    const stray = ledger!.rows.filter((r) => !r.id.startsWith(`${grade}-`));
    expect(stray.map((r) => r.id)).toEqual([]);
  });

  // «계산형을 새로 만들지 않는다» — 사례 카드와 값으로 답하는 적용은 원장에 선 것뿐이어야 한다.
  it("no case card or bare-value apply item lives outside the ledger", () => {
    const listed = new Set(
      ledgers.flatMap((l) => l?.rows ?? []).map((r) => r.id),
    );
    const cases = CONCEPT_BLANK_BANK.concepts
      .filter((c) => c.givenCase && !listed.has(c.id))
      .map((c) => c.id);
    const bare = CONCEPT_BLANK_BANK.apply
      .filter((a) => isBareValue(a.answer) && !listed.has(a.id))
      .map((a) => a.id);
    expect(cases.slice(0, 20), `원장 밖 사례 카드 ${cases.length}`).toEqual([]);
    expect(bare.slice(0, 20), `원장 밖 값 답 적용 ${bare.length}`).toEqual([]);
  });

  it("the status ruler says both yes and no", () => {
    const apply = CONCEPT_BLANK_BANK.apply.find((a) => isBareValue(a.answer))!;
    const told = CONCEPT_BLANK_BANK.apply.find(
      (a) => /\d/.test(a.answer) && !isBareValue(a.answer),
    )!;
    const ox = CONCEPT_BLANK_BANK.ox.find((o) => /\d/.test(o.statement))!;
    const plain = CONCEPT_BLANK_BANK.concepts.find((c) => !c.givenCase)!;
    const at = { section: "s", type: "apply" as const, level: "하" };
    const sha = (id: string) => shaOf(itemText(index.get(id)!));
    const row = (id: string, queue: HavrutaRow["queue"]): HavrutaRow => ({
      id,
      queue,
      sha: sha(id),
      at,
    });
    const stale = { sha: "000000000000" };

    // calc — 글이 그대로면 남음, 까닭을 적으면 둠. 글이 바뀌어도 답이 값뿐이면 남음(까닭을 적어야 둠), 설명이면 고침.
    expect(havrutaStatus(row(apply.id, "calc"), index)).toBe("남음");
    expect(
      havrutaStatus({ ...row(apply.id, "calc"), kept: "범위 관계" }, index),
    ).toBe("둠");
    expect(havrutaStatus({ ...row(apply.id, "calc"), ...stale }, index)).toBe(
      "남음",
    );
    expect(havrutaStatus({ ...row(told.id, "calc"), ...stale }, index)).toBe(
      "고침",
    );
    // num — 글이 바뀌면 고침, 그대로면 «봤다»(빈 글)로 닫을 수 있다.
    expect(havrutaStatus(row(ox.id, "num"), index)).toBe("남음");
    expect(havrutaStatus({ ...row(ox.id, "num"), kept: "" }, index)).toBe("둠");
    expect(havrutaStatus({ ...row(ox.id, "num"), ...stale }, index)).toBe(
      "고침",
    );
    // case — 글이 바뀌고 사례 표지가 없어야 고침. 사례가 아닌 카드에 대면(표지가 이미 없다) 글이 바뀐 것만으로 고침.
    expect(havrutaStatus(row(plain.id, "case"), index)).toBe("남음");
    expect(havrutaStatus({ ...row(plain.id, "case"), ...stale }, index)).toBe(
      "고침",
    );
    // 뺌
    const gone = { id: "e3-0-0-0-xa999", queue: "calc" as const, sha: "0", at };
    expect(havrutaStatus(gone, index)).toBe("뺌");

    const ledger = (rows: HavrutaRow[], complete = false): HavrutaLedger => ({
      name: "x",
      complete,
      rows,
    });
    expect(havrutaFaults(ledger([gone]), index)).toHaveLength(1);
    expect(
      havrutaFaults(ledger([{ ...gone, gone: "쓸 개념이 없다" }]), index),
    ).toEqual([]);
    expect(
      havrutaFaults(
        ledger([{ ...row(apply.id, "calc"), gone: "쓸 개념이 없다" }]),
        index,
      ),
    ).toHaveLength(1);
    expect(
      havrutaFaults(
        ledger([{ ...row(plain.id, "case"), kept: "그대로" }]),
        index,
      ),
    ).toHaveLength(1);
    expect(
      havrutaFaults(ledger([{ ...row(apply.id, "calc"), kept: "" }]), index),
    ).toHaveLength(1);
    expect(
      havrutaFaults(ledger([row(apply.id, "calc")], true), index),
    ).toHaveLength(1);
    expect(havrutaFaults(ledger([row(apply.id, "calc")]), index)).toEqual([]);
    expect(
      havrutaFaults(ledger([row(ox.id, "num"), row(ox.id, "num")]), index),
    ).toHaveLength(1);

    // 뺀 문항이 비운 칸은 까닭이 있는 줄만 센다
    const counts = retiredCounts(CONCEPT_BLANK_BANK, [
      ledger([gone, { ...gone, id: "e3-0-0-0-xa998", gone: "쓸 개념이 없다" }]),
    ]);
    expect(counts.get(retiredKey("s", "apply", "하"))).toBe(1);
  });

  it("the queue rulers say both yes and no", () => {
    expect(isBareValue("$124$개")).toBe(true);
    expect(isBareValue("$14\\,\\mathrm{cm}$, $21\\,\\mathrm{cm}$")).toBe(true);
    expect(isBareValue("$15$바퀴")).toBe(true);
    expect(isBareValue("십의 자리")).toBe(false);
    expect(
      isBareValue("$2$는 백의 자리에 쓴다 — 십의 묶음 $24$개이기 때문이다"),
    ).toBe(false);
    const concept = CONCEPT_BLANK_BANK.concepts.find((c) => !c.givenCase)!;
    expect(queueOf({ type: "concepts", item: concept })).toBeNull();
    expect(
      queueOf({ type: "concepts", item: { ...concept, givenCase: true } }),
    ).toBe("case");
    const [apply] = CONCEPT_BLANK_BANK.apply;
    expect(
      queueOf({ type: "apply", item: { ...apply!, answer: "$3$배" } }),
    ).toBe("calc");
    expect(
      queueOf({ type: "apply", item: { ...apply!, answer: "길다" } }),
    ).toBeNull();
    const [ox] = CONCEPT_BLANK_BANK.ox;
    expect(
      queueOf({
        type: "ox",
        item: { ...ox!, statement: "원주는 지름의 $3$배보다 길다." },
      }),
    ).toBe("num");
    expect(
      queueOf({
        type: "ox",
        item: { ...ox!, statement: "원주는 지름보다 길다." },
      }),
    ).toBeNull();
  });
});
