/**
 * 「그림 없이 **배치가 정해지는가**」 판정 (원장님 지적 2026-08-25).
 *
 * ## 기대값이 어디서 오는가
 *
 * ⑴ **눈금(대조군)** — 발문 문자열을 **테스트에 리터럴로** 박는다. 살아 있는 DB 를
 *    보면 엔진이 그 발문을 고치는 순간 양성 대조군이 조용히 사라지고, 그러면
 *    재현율을 영영 못 잰다(CLAUDE.md 2026-08-23 난이도 사다리와 같은 자리).
 *    문자열은 `probe-figure-dependent.ts` 가 **정본**으로 들고 있고 여기서 그것을
 *    읽는다 — 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
 *
 * ⑵ **분모 수치** — 커밋된 스냅숏(`reports/figure-dependent-snapshot.json`)에서
 *    온다. **살아 있는 공유 DB 를 쓰지 않는다**: D-31 공유 풀은 다른 트랙이 같은
 *    순간에도 고치고 있고(2026-08-25 「모두고르시오」가 보기 ⑤를 붙이는 것을
 *    실측했다 — 2행 편집·3행 교체), 그러면 **남의 작업이 내 시험을 빨갛게 만든다.**
 *    스냅숏은 그날의 분모를 밀봉한 것이고, 오늘의 분모는 도구가 따로 찍는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  NEGATIVE_FIXTURES,
  POSITIVE_FIXTURES,
  runSelfTest,
} from "../../../scripts/qa/probe-figure-dependent";
import { REVIEWED_ARRANGEMENT } from "../../../scripts/qa/reviewedArrangement";
import {
  classifyArrangement,
  sharedVertexShapes,
} from "@/lib/figure/arrangementRule";
import { classifyFigure } from "@/lib/figure/missingFigureRule";

type Snapshot = {
  기준일: string;
  분모: number;
  그림있음: number;
  그림없음: number;
  그림없음_판정: Record<string, number>;
  그림있음_판정: Record<string, number>;
  배치미정_행: number;
  배치미정_갈래: number;
  목록: { code: string; fam: string; verdict: string; content: string }[];
};
const snap: Snapshot = JSON.parse(
  readFileSync(
    path.join(
      process.cwd(),
      "scripts/qa/reports/figure-dependent-snapshot.json",
    ),
    "utf8",
  ),
);

describe("배치 판정 — 눈금", () => {
  it("양성 대조군은 전부 «배치미정» 이다", () => {
    for (const f of POSITIVE_FIXTURES) {
      expect(classifyArrangement(f.content), f.why).toBe("배치미정");
    }
    expect(POSITIVE_FIXTURES.length).toBeGreaterThanOrEqual(3);
  });

  it("음성 대조군은 하나도 «배치미정» 이 아니다 — 지어냄을 셀 수 있어야 한다", () => {
    for (const f of NEGATIVE_FIXTURES) {
      expect(classifyArrangement(f.content), f.why).not.toBe("배치미정");
    }
    expect(NEGATIVE_FIXTURES.length).toBeGreaterThanOrEqual(5);
  });

  it("도구의 눈금 함수가 그 둘을 실제로 돌린다 — 도구와 시험이 한 곳을 본다", () => {
    const { ok, lines } = runSelfTest();
    expect(lines).toHaveLength(
      POSITIVE_FIXTURES.length + NEGATIVE_FIXTURES.length,
    );
    expect(ok).toBe(true);
  });
});

describe("배치 판정 — 기존 규칙이 못 보던 자리", () => {
  it("`classifyFigure` 는 양성 대조군을 전부 «미분류» 로 흘린다", () => {
    // 이 시험이 빨개지면 두 규칙 중 하나가 상대의 자리를 먹은 것이다.
    // 새 축이 왜 필요한지가 여기 적혀 있다 — 이 단언이 그 근거다.
    for (const f of POSITIVE_FIXTURES) {
      expect(classifyFigure(f.content), f.why).toBe("미분류");
    }
  });
});

describe("배치 판정 — 열쇠", () => {
  it("꼭짓점 이름을 나눠 쓰는 도형이 둘 이상이면 얽힘으로 본다", () => {
    expect(
      sharedVertexShapes("두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고"),
    ).toEqual(expect.arrayContaining(["ABCD", "BCFE"]));
  });

  it("도형이 하나뿐이면 얽힘이 아니다 — 그 자체로 배치가 정해진다", () => {
    expect(
      sharedVertexShapes("직각삼각형 $ABC$에서 $\\overline{AB}=20$"),
    ).toEqual([]);
  });

  it("수식 명령을 먼저 지운다 — `\\square AEFD` 의 라벨을 놓치면 안 된다", () => {
    // `\square` 를 안 지우면 `AEFD` 앞의 백슬래시 낱말이 붙어 라벨을 못 뽑는다.
    expect(
      sharedVertexShapes("$\\square AEFD$는 정사각형이고 $\\square ABCD$이다"),
    ).toEqual(expect.arrayContaining(["AEFD", "ABCD"]));
  });

  it("«배치미정» 은 «못 푼다» 가 아니다 — 묻는 값이 배치와 무관할 수 있다", () => {
    // 어느 귀퉁이를 잘라도 둘레는 같다. 그 판단은 코드가 못 하므로 사람이 한다.
    const c =
      "가로가 $15$ cm, 세로가 $8$ cm인 직사각형 모양 종이의 한 귀퉁이에서 가로가 $4$ cm, 세로가 $3$ cm인 직사각형을 잘라 냈습니다. 남은 도형의 둘레는 몇 cm입니까?";
    expect(classifyArrangement(c)).toBe("배치미정");
    expect(
      REVIEWED_ARRANGEMENT["elem:초5|1-6-1 정다각형과 사각형의 둘레|심화"],
    ).toMatch(/^멀쩡/);
  });
});

describe("배치 판정 — 스냅숏 분모 (2026-08-25)", () => {
  it("스냅숏의 분모가 그날 실측 그대로다", () => {
    expect(snap.기준일).toBe("2026-08-25");
    expect(snap.분모).toBe(2410);
    expect(snap.그림있음).toBe(521);
    expect(snap.그림없음).toBe(1889);
    expect(snap.분모).toBe(snap.그림있음 + snap.그림없음);
  });

  it("판정 갈래가 분모를 남김없이 덮는다 — 조용히 버려지는 행이 없다", () => {
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(snap.그림없음_판정)).toBe(snap.그림없음);
    expect(sum(snap.그림있음_판정)).toBe(snap.그림있음);
  });

  it("그림 없는 1,889행 중 «배치미정» 은 114행 / 41갈래다", () => {
    expect(snap.그림없음_판정["배치미정"]).toBe(114);
    expect(snap.배치미정_행).toBe(114);
    expect(snap.배치미정_갈래).toBe(41);
  });

  it("규칙을 스냅숏에 다시 대면 그날의 판정이 그대로 나온다", () => {
    // 스냅숏은 발문 원문을 담는다. 규칙을 고치면 여기서 갈라진다 —
    // 「고치기 전에 확인한 표본부터 다시 보라」(CLAUDE.md 2026-08-18)를 코드로 옮긴 것.
    const drift = snap.목록.filter(
      (r) => classifyArrangement(r.content) !== r.verdict,
    );
    expect(drift.map((r) => r.code)).toEqual([]);
  });
});

describe("배치 판정 — 사람이 본 원장", () => {
  it("목록에 뜬 갈래는 전부 원장에 판정이 적혀 있다", () => {
    const missing = [...new Set(snap.목록.map((r) => r.fam))].filter(
      (f) => !REVIEWED_ARRANGEMENT[f],
    );
    expect(missing).toEqual([]);
  });

  it("«결함» 판정은 두 갈래뿐이고, 둘 다 중3 이차방정식의 활용이다", () => {
    const bad = Object.entries(REVIEWED_ARRANGEMENT)
      .filter(([, v]) => v.startsWith("결함"))
      .map(([k]) => k)
      .sort();
    expect(bad).toEqual([
      "mid:3-1|이차방정식의 활용|13",
      "mid:3-1|이차방정식의 활용|15",
    ]);
  });

  it("원장님이 짚으신 문항이 «결함» 쪽에 들어 있다", () => {
    const row = snap.목록.find((r) => r.code === "J30303-A08-002");
    expect(row, "J30303-A08-002 가 목록에 없다").toBeDefined();
    expect(REVIEWED_ARRANGEMENT[row!.fam]).toMatch(/^결함/);
  });

  it("결함으로 잠긴 행은 3행뿐이다 — 「43이 433」이 되지 않게 분모를 못 박는다", () => {
    const bad = snap.목록.filter((r) =>
      REVIEWED_ARRANGEMENT[r.fam]?.startsWith("결함"),
    );
    expect(bad.map((r) => r.code).sort()).toEqual([
      "J30303-A06-001",
      "J30303-A08-001",
      "J30303-A08-002",
    ]);
  });
});
