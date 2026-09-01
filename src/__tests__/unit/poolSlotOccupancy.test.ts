/**
 * **「이미 있다」는 「출제 풀에 이미 있다」여야 한다** (2026-09-01).
 *
 * ## 이 시험이 지키는 결함 (실측)
 *
 * 적재기의 DB 대조가 `familyKey` 로만 골라 **출제할 수 없는 행까지** 「이미 있다」로
 * 셌다. 초등에는 2026-08-24 옛 형식 **1,751행**이 `directUseAllowed=false` 로
 * 잠겨 있는데, 새 단답형이 그 잠긴 행과 발문·정답이 같아 **버려졌다.** 객관식은
 * 보기가 붙어 열쇠가 달라 살아남았다 — 그래서 **짝 없는 객관식 41행**이 생겼고,
 * 그 짝인 **단답형 41건은 아예 못 들어왔다.**
 *
 * 잃은 것을 세면 이렇다: 출제 풀은 그 문항을 **한 벌도** 못 가진다. 잠긴 행은
 * 출제가 안 되고, 새 행은 그 잠긴 행 때문에 안 들어왔다. 「중복을 막았다」가
 * 아니라 **「문항을 잃었다」**이다.
 *
 * ⚠️ 이 시험을 무디게 만드는 길은 하나다 — 잠금 상태를 안 보고 전량을 자리로
 *    세는 것으로 되돌리는 것. 그러면 ㉡ 과 ㉣ 가 빨개진다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { dedupeByVariant, occupiesPoolSlot } from "@/lib/engine/variants";

/**
 * **배선 가드** — 규칙이 옳아도 적재기가 안 쓰면 아무 일도 안 일어난다.
 *
 * 순수 함수 시험만 두면 `already.filter(occupiesPoolSlot)` 를 `already` 로
 * 되돌려도 **전부 초록**이다. 그러면 잠긴 행이 다시 자리를 차지해 문항이 조용히
 * 안 들어오고, 적재기의 「잠긴 행과 같아서 살린 것 N건」이 **0** 이 되는데
 * 0은 「깨끗」과 「못 셈」을 안 가른다.
 *
 * ⚠️ 낱말이 아니라 **구조**를 문다 — `occupiesPoolSlot` 이라는 이름은 import 줄에도
 *    있으므로 그것만 세면 2026-08-18 「LOOP 가 있나」와 같은 장식이 된다.
 */
const LOADER = readFileSync(
  join(process.cwd(), "scripts/import/load-engine-problems.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("출제 풀 자리를 차지하는가", () => {
  it("㉠ 승인 + 출제허용이면 자리를 차지한다", () => {
    expect(
      occupiesPoolSlot({ reviewStatus: "approved", directUseAllowed: true }),
    ).toBe(true);
  });

  it("🔴 ㉡ **출제 차단**된 행은 자리를 차지하지 않는다 (실측 1,751행이 그렇다)", () => {
    expect(
      occupiesPoolSlot({ reviewStatus: "approved", directUseAllowed: false }),
    ).toBe(false);
  });

  it("㉢ 승인 전(pending)·반려도 자리를 차지하지 않는다 — 출제가 못 쓴다 (D-22)", () => {
    expect(
      occupiesPoolSlot({ reviewStatus: "pending", directUseAllowed: true }),
    ).toBe(false);
    expect(
      occupiesPoolSlot({ reviewStatus: "rejected", directUseAllowed: true }),
    ).toBe(false);
  });

  it("🔴 ㉣ 잠긴 행과 겹친다고 새 변형을 버리면 안 된다 — 그러면 풀이 그 문항을 한 벌도 못 갖는다", () => {
    type Row = {
      variantKey: string;
      questionType: string;
      origin: string;
      key: string;
    };
    const rows: Row[] = [
      {
        variantKey: "v1",
        questionType: "단답형",
        origin: "문형 01",
        key: "$2$ m³는 몇 cm³?||$2000000$",
      },
      {
        variantKey: "v1",
        questionType: "객관식",
        origin: "문형 01",
        key: "$2$ m³는 몇 cm³? ① ② ③||③",
      },
    ];
    // DB 에 있는 것: 같은 발문인데 **잠긴** 옛 행 하나뿐이다.
    const db = [
      {
        key: "$2$ m³는 몇 cm³?||$2000000$",
        problemCode: "E60603-A01-003",
        reviewStatus: "approved",
        directUseAllowed: false,
      },
    ];
    const 자리 = new Map(
      db.filter(occupiesPoolSlot).map((p) => [p.key, p.problemCode]),
    );
    const got = dedupeByVariant(
      rows,
      (s) => s.key,
      (k) => 자리.get(k),
    );
    expect(got.dropped).toHaveLength(0);
    expect(got.kept.map((r) => r.questionType)).toEqual(["단답형", "객관식"]);
  });

  it("㉤ 살아 있는 행과 겹치면 여전히 버린다 — 가드를 끄는 게 아니다", () => {
    type Row = {
      variantKey: string;
      questionType: string;
      origin: string;
      key: string;
    };
    const rows: Row[] = [
      {
        variantKey: "v1",
        questionType: "단답형",
        origin: "문형 01",
        key: "같은 발문||$1$",
      },
      {
        variantKey: "v1",
        questionType: "객관식",
        origin: "문형 01",
        key: "같은 발문 ①②||①",
      },
    ];
    const db = [
      {
        key: "같은 발문||$1$",
        problemCode: "E60603-A02-001",
        reviewStatus: "approved",
        directUseAllowed: true,
      },
    ];
    const 자리 = new Map(
      db.filter(occupiesPoolSlot).map((p) => [p.key, p.problemCode]),
    );
    const got = dedupeByVariant(
      rows,
      (s) => s.key,
      (k) => 자리.get(k),
    );
    expect(got.kept).toHaveLength(0);
    expect(got.dropped[0]!.against).toBe("E60603-A02-001");
  });
});

describe("적재기가 그 규칙을 실제로 쓰는가 (배선)", () => {
  it("🔴 ㉥ DB 대조의 baseline 을 **자리를 차지하는 행**으로만 만든다", () => {
    expect(LOADER).toContain(
      "const occupying = already.filter(occupiesPoolSlot);",
    );
    expect(LOADER).toContain(
      "for (const p of occupying) seenInDb.set(keyOfDb(p), p.problemCode);",
    );
  });

  it("🔴 ㉦ baseline 을 `already` 전량으로 되돌리면 안 된다 — 그게 옛 결함이다", () => {
    // 옛 모양: `for (const p of already) seenInDb.set(...)`
    expect(LOADER).not.toMatch(
      /for \(const p of already\)\s*\n?\s*seenInDb\.set/,
    );
    // `seenInDb` 를 채우는 자리는 **한 곳**이어야 한다 — 두 곳이면 한쪽만 고쳐도 모른다.
    expect(LOADER.match(/seenInDb\.set\(/g) ?? []).toHaveLength(1);
  });

  it("㉧ 잠긴 행과 겹친 것을 **세어 찍는다** — 조용히 넣으면 아무도 못 본다", () => {
    expect(LOADER).toContain("const blockedKeys = new Map<string, string>();");
    expect(LOADER).toContain("잠긴 행");
  });
});
