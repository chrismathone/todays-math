/**
 * 학원 날짜(KST) 셈은 **한 곳** — `src/lib/kstDate.ts` (learn-screens 보고서 §7-6 · D-128 ⑷ 리드).
 *
 * 원장님 판 «오늘»(`adminService`) · 확인테스트 «오늘»(`daily-review`) · 학생 목록 «오늘»(`LectureList`) ·
 * 날짜 글자(`conceptFormat`)가 같은 «+9시간»을 네 곳에서 각자 적고 있었다. 한쪽만 고쳐지면 원장님 판과
 * 학생 목록의 «오늘»이 갈린다 — 그래서 셈을 한 곳에 두고, 다른 파일이 다시 적으면 이 시험이 운다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { KST_OFFSET_MS, kstDateOf } from "@/lib/kstDate";

describe("🔴 학원 날짜(KST) — 서버 시계의 UTC 자정이 아니다", () => {
  it("UTC 15:00 = KST 다음날 0시", () => {
    expect(kstDateOf(new Date("2026-09-15T14:59:59.999Z"))).toBe("2026-09-15");
    expect(kstDateOf(new Date("2026-09-15T15:00:00.000Z"))).toBe("2026-09-16");
  });

  it("+9시간 고정 — 서머타임이 없다(1월 · 7월이 같은 차) · 해 넘김", () => {
    expect(KST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
    expect(kstDateOf(new Date("2026-01-15T15:00:00.000Z"))).toBe("2026-01-16");
    expect(kstDateOf(new Date("2026-07-15T14:59:59.999Z"))).toBe("2026-07-15");
    expect(kstDateOf(new Date("2026-12-31T15:00:00.000Z"))).toBe("2027-01-01");
  });
});

const SRC = path.join(process.cwd(), "src");
const HOME = "src/lib/kstDate.ts";
/** «+9시간»을 손으로 적는 모양 — `9 * 3_600_000` · `9 * 3600000` · `9 * 60 * 60 * 1000` */
const NINE_HOURS = /\b9\s*\*\s*(?:3_?600_?000|60\s*\*\s*60\s*\*\s*1_?000)\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "__tests__" || entry.name === "generated"
        ? []
        : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe("🔴 KST 셈은 이 한 곳에만 — 다른 파일이 «+9시간»을 다시 적지 않는다", () => {
  it("모양 자체가 잡힌다 (이 검사가 눈먼 게 아니다)", () => {
    expect(readFileSync(path.join(process.cwd(), HOME), "utf8")).toMatch(
      NINE_HOURS,
    );
    expect("now.getTime() + 9 * 3_600_000").toMatch(NINE_HOURS);
    expect("9 * 60 * 60 * 1000").toMatch(NINE_HOURS);
  });

  it("src 아래 어디에도 없다(kstDate.ts 빼고 — 시험 파일은 보지 않는다)", () => {
    const hits = sourceFiles(SRC)
      .map((f) => path.relative(process.cwd(), f).split(path.sep).join("/"))
      .filter((f) => f !== HOME)
      .filter((f) => NINE_HOURS.test(readFileSync(f, "utf8")));
    expect(hits).toStrictEqual([]);
  });
});
