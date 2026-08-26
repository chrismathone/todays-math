/**
 * 문제은행 정렬 순서 (원장님 지시 2026-08-26) — 「1.학년 2.학기 3.단원순서 4.분류 5.번호」.
 *
 * 규칙은 `src/lib/problem/problemOrder.ts` **한 곳**에 있고, 서버 `orderBy` 와
 * 화면의 끼워넣기가 **같은 열쇠 목록**을 읽는다. 이 파일이 그 «한 곳»을 잠근다.
 */
import { describe, expect, it } from "vitest";

import {
  BANK_ORDER_KEYS,
  PROBLEM_BANK_ORDER_BY,
  compareProblemsForBank,
  problemOrderFields,
  sortProblemsForBank,
  type ProblemOrderFields,
} from "@/lib/problem/problemOrder";

/** 짧게 쓰려고. 단원 순서와 코드만 있으면 이 규칙은 전부 정해진다. */
function row(unitOrderIndex: number, problemCode: string): ProblemOrderFields {
  return { unitOrderIndex, problemCode };
}

const codesOf = (rows: ProblemOrderFields[]) => rows.map((r) => r.problemCode);

describe("문제은행 정렬 — 다섯 열쇠", () => {
  // 1·2·3 — 학년·학기·단원순서는 `Unit.orderIndex` **한 값**이 담는다 (D-27).
  //   실측 2026-08-26: 735단원 · orderIndex 1..735 · 중복 0 ·
  //   학년 16종이 orderIndex 위에서 **연속 구간 16개** · 학년 안에서 대단원도 끊기지 않는다.
  //   초등 대단원 이름이 `1-1`,`1-2`…`2-6` 이라 **학기가 그 순서에 이미 들어 있다**
  //   (중·고 교육과정 트리에는 학기 축 자체가 없다).
  //   근거: `npx tsx scripts/qa/probe-problem-order.ts units | chapters`
  it("단원이 다르면 단원 순서가 이긴다 — 코드가 앞서도 뒤 단원이면 뒤로 간다", () => {
    const rows = [row(362, "J10102-A01-001"), row(361, "J10101-Z99-999")];
    expect(codesOf(sortProblemsForBank(rows))).toEqual([
      "J10101-Z99-999",
      "J10102-A01-001",
    ]);
  });

  // 4 — 「분류」는 문항 코드의 `A01` 자리(문항류, D-105)다.
  it("같은 단원 안에서는 분류(A01→A02→A10) 오름차순이다", () => {
    const rows = [
      row(361, "J10101-A10-001"),
      row(361, "J10101-A02-001"),
      row(361, "J10101-A01-001"),
    ];
    expect(codesOf(sortProblemsForBank(rows))).toEqual([
      "J10101-A01-001",
      "J10101-A02-001",
      "J10101-A10-001",
    ]);
  });

  // 5 — 「번호」는 코드 끝의 `-001` (같은 문항류 안의 아류 번호).
  //
  // ⚠️ 코드는 **문자열**이라 정렬이 `-010` 을 `-002` 앞에 둘 수 있다. 여기서는
  //    아니다 — 계약이 번호를 `[0-9]{3}` **세 자리 고정**으로 못박아 제로패딩이라
  //    문자열 순서와 수 순서가 같다(실측: 일련번호 길이 분포 [3] 하나뿐).
  //
  // 🔴 오늘 DB 에는 10 이상인 아류가 **0건**이다(실측). 그래서 이 성질은 실데이터로는
  //    시험되지 않는다 — 「0건」은 «괜찮다»와 «못 센다»를 안 가른다. 합성 코드로 잰다.
  it("번호는 제로패딩이라 002 < 010 < 100 이다 (합성 코드 — 오늘 데이터엔 010 이상이 0건)", () => {
    const rows = [
      row(361, "J10101-A01-010"),
      row(361, "J10101-A01-100"),
      row(361, "J10101-A01-002"),
      row(361, "J10101-A01-009"),
    ];
    expect(codesOf(sortProblemsForBank(rows))).toEqual([
      "J10101-A01-002",
      "J10101-A01-009",
      "J10101-A01-010",
      "J10101-A01-100",
    ]);
  });

  it("분류가 먼저, 번호가 나중이다 — A01-002 가 A02-001 보다 앞선다", () => {
    const rows = [row(361, "J10101-A02-001"), row(361, "J10101-A01-002")];
    expect(codesOf(sortProblemsForBank(rows))).toEqual([
      "J10101-A01-002",
      "J10101-A02-001",
    ]);
  });

  // 원장님이 실제로 보신 화면(스크린샷 2026-08-26). 이 순서가 바로 서야 고친 것이다.
  it("원장님이 보신 그 뒤죽박죽(A10 A02 A05 …)을 A01…A10 으로 세운다", () => {
    const seen = [
      "J10101-A10-001",
      "J10101-A02-001",
      "J10101-A05-001",
      "J10101-A03-001",
      "J10101-A08-001",
      "J10101-A06-001",
      "J10101-A04-001",
      "J10101-A01-001",
      "J10101-A07-001",
      "J10101-A09-001",
    ];
    const sorted = sortProblemsForBank(seen.map((c) => row(361, c)));
    expect(codesOf(sorted)).toEqual([...seen].sort());
    expect(codesOf(sorted)[0]).toBe("J10101-A01-001");
    expect(codesOf(sorted).at(-1)).toBe("J10101-A10-001");
  });
});

describe("문제은행 정렬 — 조용히 사라지는 행이 없다", () => {
  // 🔴 옛 코드(`J10101-K7M2`, 무작위 4자)는 **분류·번호 자리가 없다**. 45,374건이
  //    그 형식인데 전부 격리 벽 밖(`pool != shared`)이라 은행에 **0건**이 보인다
  //    (실측 2026-08-26: `probe-problem-order.ts visible`).
  //    그래도 규칙은 정해 둔다 — 「코드 오름차순」한 규칙에 그대로 맡긴다.
  //    두 번째 규칙(예: 옛것은 무조건 뒤로)을 만들면 서버 `orderBy` 와 두 벌이 된다.
  it("옛 형식 코드가 섞여도 한 건도 사라지지 않고 순서가 결정적이다", () => {
    const rows = [
      row(361, "J10101-A01-001"),
      row(361, "J10101-K7M2"),
      row(361, "J10101-4PUN"),
      row(361, "J10101-A02-001"),
    ];
    const sorted = sortProblemsForBank(rows);
    expect(sorted).toHaveLength(4);
    expect(new Set(codesOf(sorted))).toEqual(new Set(codesOf(rows)));
    // 같은 입력을 뒤집어 넣어도 같은 답 — 결정적이어야 페이지가 안 겹친다.
    expect(codesOf(sortProblemsForBank([...rows].reverse()))).toEqual(
      codesOf(sorted),
    );
  });

  // 화면은 단원을 `unitById` 로 찾는다. 못 찾은 행을 버리면 **목록에서 사라진다**.
  it("단원을 못 찾은 행은 버리지 않고 맨 뒤로 보낸다", () => {
    const fields = problemOrderFields(
      { problemCode: "J10101-A01-001" },
      undefined,
    );
    expect(Number.isFinite(fields.unitOrderIndex)).toBe(false);
    const rows = [fields, row(700, "J30101-A01-001")];
    expect(codesOf(sortProblemsForBank(rows))).toEqual([
      "J30101-A01-001",
      "J10101-A01-001",
    ]);
    expect(sortProblemsForBank(rows)).toHaveLength(2);
  });
});

describe("문제은행 정렬 — 규칙이 «한 곳»이다", () => {
  /**
   * 서버가 Prisma 에 보내는 `orderBy` 와 화면이 쓰는 비교기는 **같은 열쇠 목록**
   * (`BANK_ORDER_KEYS`)에서 나온다. 한쪽만 바꾸면 이 시험이 빨개진다.
   */
  it("Prisma orderBy 는 열쇠 목록의 산출물이다 — 개수와 순서가 같다", () => {
    expect(PROBLEM_BANK_ORDER_BY).toEqual(BANK_ORDER_KEYS.map((k) => k.prisma));
    expect(PROBLEM_BANK_ORDER_BY).toEqual([
      { unit: { orderIndex: "asc" } },
      { problemCode: "asc" },
    ]);
  });

  /**
   * 열쇠마다 **그 열쇠만** 다른 두 행을 만들어, 비교기의 부호가 `orderBy` 에 적힌
   * 방향과 맞는지 본다. 비교기에서 열쇠를 하나 빼면 그 자리가 0 이 되어 빨개진다.
   */
  it("열쇠마다 비교기의 방향이 orderBy 에 적힌 방향과 같다", () => {
    const base = row(361, "J10101-A05-005");
    const bigger: ProblemOrderFields[] = [
      { ...base, unitOrderIndex: 362 },
      { ...base, problemCode: "J10101-A06-005" },
    ];
    expect(bigger).toHaveLength(BANK_ORDER_KEYS.length);
    BANK_ORDER_KEYS.forEach((key, i) => {
      const direction = Object.values(key.prisma).flatMap((v) =>
        typeof v === "string" ? [v] : Object.values(v),
      )[0];
      expect(direction).toBe("asc");
      // 오름차순이므로 «큰 쪽»은 언제나 뒤로 가야 한다.
      expect(compareProblemsForBank(base, bigger[i]!)).toBeLessThan(0);
      expect(compareProblemsForBank(bigger[i]!, base)).toBeGreaterThan(0);
    });
  });

  it("모든 열쇠가 같으면 0 이다 (전순서를 만드는 것은 problemCode 의 유일성)", () => {
    const a = row(361, "J10101-A01-001");
    expect(compareProblemsForBank(a, { ...a })).toBe(0);
  });
});

describe("문제은행 정렬 — 화면이 두 번째 규칙을 만들지 않는다", () => {
  /**
   * 서버가 페이지를 나누므로 **서버 순서가 참이다.** 화면이 따로 정렬하면 페이지
   * 경계에서 순서가 깨진다(1페이지 끝과 2페이지 처음이 어긋난다).
   *
   * 그래서 `ProblemBank` 안의 정렬은 **공유 비교기를 지나야만** 한다. 맨손
   * `.sort((a, b) => …)` 가 하나라도 들어오면 여기서 빨개진다.
   *
   * ⚠️ 낱말을 파일 전체에서 세지 않는다 — `.sort(` **호출마다** 그 인자가 공유
   *    비교기를 부르는지 본다(2026-08-18 「LOOP 가 있나」로 지킨 가드의 반대편).
   */
  it("ProblemBank 의 모든 .sort( 는 compareProblemsForBank 를 지난다", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      "src/components/problem/ProblemBank.tsx",
      "utf8",
    );

    const calls = [...source.matchAll(/\.sort\(/g)];
    expect(calls.length).toBeGreaterThan(0); // 없으면 이 가드가 아무것도 안 지킨다
    for (const call of calls) {
      // 호출 뒤 400자 안에 공유 비교기가 나와야 한다.
      const window = source.slice(call.index!, call.index! + 400);
      expect(window).toContain("compareProblemsForBank");
    }
    expect(source).toContain('from "@/lib/problem/problemOrder"');
  });
});
