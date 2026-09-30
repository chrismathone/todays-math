import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { measurePages, openSet, type PageReport } from "./measure";

/**
 * 개념 백지 지면 — 인쇄 매체(브라우저 하나)로 장마다 A4 상자 · 넘침 · 빈 공간 · 줄맞춤을 잰다
 * (브리프 cb-paper «받아들임» · 원장님 2026-09-30 «A4 에 맞게 · 퀄리티 · 줄맞춤»). 자는 `measure.ts`.
 *
 * 표본 — fixture(시안 두 단원) · stress(계약 상한) · math(수식) · fuzz 8(시드 고정 무작위 길이) ·
 * **real-e4 · e5 · e6(main 의 실제 은행 한 학년 전부)** · **worst(실제 은행에서 가장 긴 것끼리)** · counts(문항 수 1 ~ 정원 + 1) ·
 * show(보고서 본보기 — 실제 은행 한 대단원).
 * 캡처는 장마다 `test-results/concept-blank-paper/<set>/…png`, 표는 `report-<set>.json`.
 * 실제 은행 세 벌은 장이 수백이라 걸린 장만 찍는다(`CB_SHOTS=all` 이면 모두).
 */
const OUT = path.join(process.cwd(), "test-results", "concept-blank-paper");

/** A4 한 장의 1/4 — 세로로 이보다 큰 빈 틈이 있으면 장이 빈 것이다. */
const QUARTER = 1123 / 4;

const SETS = [
  "fixture",
  "stress",
  "math",
  "worst",
  "counts",
  "show",
  "real-e4",
  "real-e5",
  "real-e6",
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((seed) => `fuzz&seed=${seed}`),
] as const;

/**
 * 빈 공간 1/4 을 **재기만 하고 막지 않는** 장 — 채점표의 마지막 장. 표는 줄이 늘어나지 않고 채점 안내 상자는
 * 장 아래에 붙어, 줄이 적으면 그 사이가 빈다(교사용 · 넘침 0 이 먼저 — 보고서 «못 한 것»).
 */
const mayBeEmpty = (r: PageReport) => r.part === "key" && r.last;

/**
 * 빈 틈의 한도 — 장의 1/4. 다만 **수식이 낱말 여섯에 하나꼴로 박힌 무작위 표본(fuzz)의 채점표**는 1/3 까지 본다:
 * 수식 줄의 높이 · 폭은 DOM 을 재지 않고 넉넉히 어림해(리드 조건 ⑴ · 넘침 0 이 먼저) 줄이 실제보다 덜 담긴다
 * (잰 값 최대 366px). 실제 은행 · 최악 조합 · 계약 상한 표본과 학생지는 모두 1/4 로 잠근다.
 */
const emptyLimit = (name: string, r: PageReport) =>
  name.startsWith("fuzz") && r.part === "key" ? 1123 / 3 : QUARTER;

for (const set of SETS) {
  const name = set.replace("&seed=", "-");
  test(`${name} — 인쇄 매체에서 장마다 A4 · 넘침 0 · 빈 공간 · 줄맞춤`, async ({
    page,
  }) => {
    await openSet(page, set);
    const reports = await measurePages(page);
    expect(reports.length).toBeGreaterThan(0);

    mkdirSync(path.join(OUT, name), { recursive: true });
    writeFileSync(
      path.join(OUT, `report-${name}.json`),
      JSON.stringify(reports, null, 2),
    );

    const overflow = reports.filter((r) => r.overflowPx > 0.5);
    const empty = reports.filter(
      (r) => r.emptyPx > emptyLimit(name, r) && !mayBeEmpty(r),
    );
    const all =
      process.env.CB_SHOTS === "all" ||
      !(name.startsWith("real-") || name.startsWith("fuzz"));
    const pages = page.locator("[data-print-page]");
    for (let i = 0; i < reports.length; i++) {
      const r = reports[i]!;
      if (!all && !overflow.includes(r) && !empty.includes(r)) continue;
      await pages.nth(i).screenshot({
        path: path.join(
          OUT,
          name,
          `${String(i + 1).padStart(3, "0")}-${r.part}-${r.form}-p${r.page}.png`,
        ),
      });
    }

    for (const r of reports) {
      const at = `${r.part} ${r.form} p${r.page}`;
      // ① A4 한 장 = 210×297mm(794×1123px) — 인쇄 매체에서 축소 없이. 안쪽 여백은 시험지 지면과 같은 값
      expect(Math.round(r.widthPx), at).toBe(794);
      expect(Math.round(r.heightPx), at).toBe(1123);
      expect(r.padding, at).toEqual(
        r.page === 1 ? [36, 50, 20, 50] : [24, 50, 20, 50],
      );
      // ④ 줄맞춤
      const a = r.align;
      expect(
        a.qnWidths.length,
        `${at} 번호 열 폭 ${a.qnWidths}`,
      ).toBeLessThanOrEqual(1);
      // 번호 열 — 지면 하나 안에서 한 값(두 자리까지 44 · 세 자리 52)
      if (a.qnWidths.length) expect([44, 52], at).toContain(a.qnWidths[0]);
      expect(a.qnLeftSpread, `${at} 번호 왼쪽 끝`).toBeLessThanOrEqual(0.5);
      expect(a.qnBaseline, `${at} 번호 · 첫 줄 기준선`).toBeLessThanOrEqual(
        0.5,
      );
      expect(
        a.rulePitch.every((p) => p === "30px"),
        `${at} 줄 간격 ${a.rulePitch}`,
      ).toBe(true);
      expect(a.zoneTop, `${at} A 좌우 윗선`).toBeLessThanOrEqual(0.5);
      expect(a.zoneBottom, `${at} A 오른쪽 칸 아랫변`).toBeLessThanOrEqual(0.5);
      expect(a.pairTop, `${at} 나란한 칸 윗선`).toBeLessThanOrEqual(0.5);
      expect(a.pairHeight, `${at} 나란한 칸 높이`).toBeLessThanOrEqual(0.5);
      if (r.part === "key") expect(a.keyCols, at).toEqual([44, 130]);
      if (a.blankDrop) {
        // 빈칸 밑줄 — 어느 글씨 크기에서도 기준선 아래 0.2em(한글 글자 아래 끝 바로 밑)
        expect(a.blankDrop[0], `${at} 빈칸 밑줄`).toBeGreaterThan(0.15);
        expect(a.blankDrop[1], `${at} 빈칸 밑줄`).toBeLessThan(0.25);
      }
      expect(a.katexBaseline, `${at} KaTeX 기준선`).toBeLessThanOrEqual(0.5);
    }
    // ② 넘침 0 — 빈 공간보다 먼저다
    expect(overflow, JSON.stringify(overflow, null, 2)).toEqual([]);
    // ③ 세로로 빈 틈이 장의 1/4 을 넘지 않는다
    expect(
      empty.map(
        (r) => `${r.part} ${r.form} p${r.page}: ${r.emptyPx}px (${r.emptyAt})`,
      ),
    ).toEqual([]);
  });
}
