// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/arum-math-sam-geometry-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/arum-math-sam-geometry-2022-v1.coverage.json";

const parsed = workbookCreateEditionSchema.parse({ requestId: "arum-geometry-full-source-review", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
// Independent source header and blue-number-outline inventory, visually checked on all 112 PDF pages.
const chapterTitles = ["포물선", "타원", "쌍곡선", "이차곡선의 접선", "공간도형", "공간좌표", "벡터의 연산", "벡터의 성분", "벡터의 내적", "직선의 방정식", "평면과 구의 방정식"];
const conceptCounts = [4, 3, 6, 7, 7, 8, 8, 11, 7, 6, 5];
const exampleCounts = [19, 14, 19, 11, 19, 24, 21, 26, 19, 21, 20];
const sectionPages = ["013", "015", "028", "041", "042", "052", "066", "067", "086", "100", "101", "126", "141", "142", "168", "179", "180", "202", "213", "214", "238", "250", "252", "276", "291", "292", "308", "326", "327", "342", "357", "358", "372"];
const sectionKinds = ["개념확인", "유제", "연습문제"];
const at = (chapter: number, kind: string, number: string) => parsed.exercises.find(r => r.address.section === `${String(chapter).padStart(2, "0")}. ${chapterTitles[chapter - 1]} / ${kind}` && r.address.number === number)!;

describe("Math Sam geometry complete printed solution scope", () => {
  it("strictly parses, keeps all unique addresses, and exactly roundtrips TSV", () => {
    const tsv = readFileSync(new URL("../../../data/commercial-workbooks/arum-math-sam-geometry-2022-v1.tsv", import.meta.url), "utf8");
    expect(parseWorkbookImport(tsv)).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(571);
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
  });

  it("matches all 33 independently inventoried address sequences without inventing individual pages", () => {
    const expected = chapterTitles.flatMap((title, c) => sectionKinds.flatMap((kind, t) => Array.from({ length: [conceptCounts[c], exampleCounts[c], 26][t] }, (_, n) => ({
      volume: "본문", section: `${String(c + 1).padStart(2, "0")}. ${title} / ${kind}`,
      page: `단원 시작 ${sectionPages[c * 3 + t]}`, number: t === 0 ? String(n + 1) : `${c + 1}-${n + 1}`, subpart: "",
    }))));
    expect(parsed.exercises.map(r => r.address)).toEqual(expected);
    expect(coverage.pageGroups).toHaveLength(33);
    expect(coverage.independentInventory).toMatchObject({ candidateNumberOutlines: 577, excludedNonNumberGlyphs: 6, confirmedPrintedNumberOutlines: 571 });
    expect(coverage.scope.individualExercisePagesConfirmed).toBe(false);
    for (const s of [pack.label, pack.coverage, pack.provenance.description, coverage.scope.pageAddressPolicy]) expect(s).toContain("단원 시작 쪽 참조 · 개별 문항 쪽 미확인");
  });

  it("retains exactly ten diagram or proof addresses and a complete exclusion ledger", () => {
    const missing: [number, string, string][] = [[1,"유제","1-1"],[1,"유제","1-12"],[1,"유제","1-18"],[2,"유제","2-3"],[3,"개념확인","3"],[3,"유제","3-1"],[6,"개념확인","1"],[7,"개념확인","3"],[9,"개념확인","3"],[9,"연습문제","9-8"]];
    expect(parsed.exercises.filter(r => !r.key).map(r => r.address)).toEqual(missing.map(([c,t,n]) => at(c,t,n).address));
    expect(coverage.nullKeyLedger.map(r => r.address)).toEqual(parsed.exercises.filter(r => !r.key).map(r => r.address));
    expect(coverage.nullKeyLedger.every(r => r.registered && r.key === null)).toBe(true);
    expect(coverage.nullKeyLedger.filter(r => r.reason === "diagram")).toHaveLength(8);
    expect(coverage.nullKeyLedger.filter(r => r.reason === "proof")).toHaveLength(2);
    expect(coverage.counts).toMatchObject({ exercises: 571, reviewedKeys: 561, nullKeys: 10, unreviewedKeys: 0, omittedInScopeAddresses: 0 });
  });

  it("preserves radicals, units, vectors, signs and answers continuing to later PDF pages", () => {
    const finals = [[1,"23",12],[2,"4sqrt(3)/3",22],[3,"9/4",33],[4,"4sqrt(3)",42],[5,"6",53],[6,"10sqrt(30)/3",64],[7,"90",73],[8,"ㄱ, ㄴ",83],[9,"M=0, m=-27/8",93],[10,"sqrt(5)",103],[11,"6",112]] as const;
    for (const [c, answerText, sourcePage] of finals) expect(at(c,"연습문제",`${c}-26`).key).toEqual({ answerText, status: "reviewed", sourcePage });
    expect(at(2,"연습문제","2-4").key?.answerText).toBe("30sqrt(3) cm");
    expect(at(3,"유제","3-8").key?.answerText).toBe("4 km");
    expect(at(7,"연습문제","7-5").key?.answerText).toBe("-(3/4)vec(a)+(1/4)vec(b)");
    expect(at(5,"연습문제","5-3").key?.answerText).toBe("②");
  });

  it("checks counts, numeric and choice formats across every chapter without treating OCR as verification", () => {
    const byPage: Record<string, number> = {}, byChapter: Record<string, number> = {};
    for (const r of parsed.exercises) {
      const c = r.address.section.split(" / ")[0]; byChapter[c] = (byChapter[c] ?? 0) + 1;
      if (!r.key) continue;
      const s = r.key.answerText;
      expect(r.key.status).toBe("reviewed");
      expect(s).not.toMatch(/[\u0000-\u001F\uFFFD⑥⑦⑧⑨⑩]|풀이 참조|\/0(?:\D|$)/);
      expect((s.match(/\(/g) ?? []).length).toBe((s.match(/\)/g) ?? []).length);
      expect(r.key.sourcePage).toBeGreaterThanOrEqual(2); expect(r.key.sourcePage).toBeLessThanOrEqual(112);
      byPage[r.key.sourcePage!] = (byPage[r.key.sourcePage!] ?? 0) + 1;
    }
    expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage); expect(byChapter).toEqual(coverage.counts.byChapter);
    expect(Object.values(byChapter)).toEqual([49,43,51,44,52,58,55,63,52,53,51]);
    expect(parsed.exercises.filter(r => r.key && /^[①②③④⑤]$/.test(r.key.answerText))).toHaveLength(1);
    expect(coverage.numericChoiceChecks).toMatchObject({ eligible: 221, tokenPresent: 218, ocrUnmatchedVisuallyReconciled: 3, unresolved: 0 });
    expect(coverage.numericChoiceChecks.limitation).toContain("no automated final-answer equivalence");
  });

  it("freezes official provenance, all source pages and headers while leaving unknown edition metadata unknown", () => {
    expect(coverage.source).toMatchObject({ sourceRelativePath: "secondary/files/arumpdf3.pdf", pageCount: 112, byteCount: 26328444, sha256: "bd81b51c1486c2e6d3dc2d12e6f369cfb3d0a2a29901da7d9d0fa79ab4a8ff6f" });
    expect(coverage.source.reviewedSectionHeaders).toHaveLength(33);
    for (const r of [...coverage.source.reviewedSectionHeaders, ...coverage.source.reviewedImageFiles]) expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(coverage.scope.sourcePdfPagesVisuallyReviewed).toEqual(Array.from({ length: 112 }, (_, i) => i + 1));
    expect(coverage.source.reviewedImageFiles.filter(r => /full-\d{3}\.png$/.test(r.path))).toHaveLength(112);
    expect(parsed.metadata.edition).toContain("연도·판쇄·ISBN 미확인"); expect(parsed.metadata).not.toHaveProperty("isbn");
    expect(parsed.metadata.curriculum).toBe("2022 교육과정");
    expect(parsed.provenance.reference).toBe("http://www.a-ssam.co.kr/bbs/board.php?bo_table=table37&wr_id=303");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
  });
});
