import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ExamDraft } from "../../../scripts/import/exam-paper/audit-bank-fix";

const output = mkdtempSync(join(tmpdir(), "bank-fix-structure-"));
const cache = new Map<string, ExamDraft[]>();
function draft(school: string, n: number): ExamDraft {
  if (!cache.has(school)) {
    const file = join(output, `${school}.json`);
    execFileSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("scripts/import/exam-paper/build-exam-drafts.ts"),
        resolve(`scripts/import/exam-paper/exams/2025-${school}-3-2-mid`),
        file,
      ],
      { encoding: "utf8", stdio: "pipe" },
    );
    cache.set(school, JSON.parse(readFileSync(file, "utf8")));
  }
  const row = cache.get(school)!.find((d) => d.questionNumber === n);
  expect(row).toBeDefined();
  return row!;
}

function choices(d: ExamDraft): string[] {
  return d.content
    .split(/^\d\. /m)
    .slice(1)
    .map((s) => s.trim());
}

describe("기출 초안의 공통 지문과 보기 (실제 빌더)", () => {
  it("EX-03 덕원 8·9: 공유된 변과 두 각으로 높이·둘레의 답이 하나다", () => {
    const d8 = draft("deokwon", 8);
    const d9 = draft("deokwon", 9);
    for (const d of [d8, d9]) {
      const base = /\\overline\{BC\}=([\d]+)\+\\sqrt\{(\d+)\}/.exec(d.content);
      const b = /\\angle B=(\d+)/.exec(d.content);
      const c = /\\angle C=(\d+)/.exec(d.content);
      expect(base).not.toBeNull();
      expect(b).not.toBeNull();
      expect(c).not.toBeNull();
      const bc = Number(base![1]) + Math.sqrt(Number(base![2]));
      const height =
        bc /
        (1 / Math.tan((Number(b![1]) * Math.PI) / 180) +
          1 / Math.tan((Number(c![1]) * Math.PI) / 180));
      expect(height).toBeCloseTo(Math.sqrt(3));
      const values = choices(d8).map(
        (s) =>
          Number(s.match(/^\$(\d+)\$$/)?.[1]) ||
          Math.sqrt(Number(s.match(/\\sqrt\{(\d+)\}/)?.[1])),
      );
      expect(values.filter((v) => Math.abs(v - height) < 1e-8)).toHaveLength(1);
    }
    // S = 1 + sqrt(3) + 2 + sqrt(6); 지시한 근삿값을 사용한다.
    const perimeter = 3 + 1.7 + 1.4 * 1.7;
    const candidates = choices(d9)
      .map((s) => Number(s.replace(/\$/g, "")))
      .filter((a) => a < perimeter && perimeter < a + 1);
    expect(candidates).toEqual([7]);
    expect(draft("deokwon", 7).content).not.toContain(
      "\\overline{BC}=1+\\sqrt{3}",
    );
  });

  it("EX-11 새론: 원 성질 다섯은 필요한 17·18에 있고 정사면체 16에는 없다", () => {
    for (const n of [17, 18]) {
      expect(
        [...draft("saeron", n).content.matchAll(/\$\\circ\$/g)].length,
      ).toBeGreaterThanOrEqual(5);
      expect(draft("saeron", n).content).toContain("원의 중심을 지난다");
    }
    expect(draft("saeron", 16).content).not.toContain("원의 성질");
    const pc = Math.sqrt(55 + 3 ** 2) - 3;
    expect(Number(draft("saeron", 18).answer.replace(/\$/g, ""))).toBe(pc);
  });

  it("EX-04 성화 7: 300개의 원·현에서 성립하는 보기 하나가 정답 ⑤다", () => {
    const d = draft("seonghwa", 7);
    const options = choices(d).map((s) =>
      [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]),
    );
    expect(options).toHaveLength(5);
    let checked = 0;
    for (let distance = 1; distance <= 15; distance += 1) {
      for (let halfChord = 1; halfChord <= 20; halfChord += 1) {
        const radius = Math.hypot(distance, halfChord);
        const length = (s: string) =>
          ({ OM: distance, OB: radius, OA: radius, BM: halfChord })[
            s.match(/\\overline\{(\w+)\}/)?.[1] ?? ""
          ];
        const angle = (s: string) =>
          s.includes("OMB")
            ? 90
            : (Math.atan(distance / halfChord) * 180) / Math.PI;
        const correct = options.flatMap((o, i) =>
          o.length === 3 &&
          length(o[0]) === radius &&
          angle(o[1]) === 90 &&
          length(o[2]) === halfChord
            ? [i + 1]
            : [],
        );
        expect(correct).toEqual([5]);
        checked += 1;
      }
    }
    expect(checked).toBe(300);
    expect(d.answer).toBe("⑤");
  });
});
