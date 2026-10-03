import { describe, expect, it } from "vitest";

import { planPersonalExams, type BankSnapshot, type InventoryExam, type InventoryFile } from "@/lib/import/planPersonalExams";

const root = "N:/개인/기출";
const bank: BankSnapshot = {
  fetchedAt: "2026-10-03T00:00:00Z",
  units: ["중3", "공통수학1", "대수", "확률과 통계"].map((grade) => ({ id: grade, grade, chapter: "", section: "" })),
  exams: [], problems: [],
};

function group(overrides: Partial<InventoryExam> = {}): InventoryExam {
  return { school: "강동중", level: "중학교", year: 2025, grade: 3, semester: 2, exam: "중간", subject: "수학",
    path: `${root}/2025 기출모음/2025년 2학기 중간고사 모음/pdf/중3/[강동중][3][25-2-중간][신사고] (완료).PDF`, ...overrides };
}

function file(g: InventoryExam, ext = "pdf", overrides: Partial<InventoryFile> = {}): InventoryFile {
  const p = g.path.replace(/\.[^.]+$/, `.${ext}`);
  return { ...g, path: p, ext, filename: p.split("/").pop()!, relative: p.slice(root.length + 1), kind: "기출 시험지", completed: true, ...overrides };
}

describe("personal exam planning", () => {
  it("pairs matching completed HWP/PDF once and excludes answer files from source selection", () => {
    const g = group(); const pdf = file(g); const hwp = file(g, "hwp");
    const result = planPersonalExams({ groups: [g], files: [pdf, hwp, pdf, file(g, "pdf", { path: `${root}/풀이.pdf`, kind: "답안·풀이 자료" })] }, bank);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({ canonicalKey: "강동중|중3|중3|2025-2-중간", problemSubject: "수학", curriculumSubjectHint: "중3", selectedPair: { pdf: pdf.path, hwp: hwp.path }, status: "readyForExtraction" });
    expect(result.jobs[0]!.files).toHaveLength(3);
  });

  it("keeps two same-grade same-period high-school subjects as distinct jobs and stable IDs", () => {
    const g = group({ school: "강동고", level: "고등학교", grade: 2, semester: 1, subject: "수학Ⅰ", path: `${root}/[강동고][2][수1][25-1-중간][천재] (완료).PDF` });
    const g2 = { ...g, subject: "확률과 통계", path: g.path.replace("[수1]", "[확통]") };
    const a = planPersonalExams({ groups: [g, g2], files: [file(g), file(g2)] }, bank);
    const b = planPersonalExams({ groups: [g2, g], files: [file(g2), file(g)] }, bank);
    expect(a.jobs).toHaveLength(2);
    expect(new Set(a.jobs.map((j) => j.examId)).size).toBe(2);
    expect(a.jobs.map((j) => j.examId)).toEqual(b.jobs.map((j) => j.examId));
    expect(a.jobs.find((j) => j.curriculumSubjectHint === "대수")?.problemSubject).toBe("수1");
  });

  it("preserves existing IDs and counts for skipExisting instead of creating duplicates", () => {
    const g = group(); const pdf = file(g);
    const result = planPersonalExams({ groups: [g], files: [pdf] }, { ...bank,
      exams: [{ external_exam_id: "강동중|중3|중3|2025-2-중간", school: "강동중", level: "중", grade: 3, subject: "중3", subject_raw: null, year: 2025, semester: 2, round: "중간", source_file: pdf.relative, question_count: 21 }],
      problems: [{ exam_id: "2025-gangdong-3-2-mid", source_file: pdf.relative, school: "강동중", subject: "수학", count: 21 }],
    });
    expect(result.jobs[0]).toMatchObject({ status: "skipExisting", examId: "2025-gangdong-3-2-mid", existingQuestionCount: 21 });
  });

  it("holds conflicting filename/folder dates and filters pre-2025 papers", () => {
    const g = group({ year: 2026, path: group().path.replace("25-2-중간", "26-1-중간"), semester: 1 });
    const old = group({ year: 2024, path: group().path.replace("25-2-중간", "24-2-중간") });
    const result = planPersonalExams({ groups: [g, old], files: [file(g), file(old)] }, bank);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]!.status).toBe("holdMetadata");
    expect(result.jobs[0]!.holdReasons.join(" ")).toContain("연도 불일치");
    expect(result.jobs[0]!.holdReasons.join(" ")).toContain("학기 불일치");
  });

  it("recovers nested-bracket grade using the existing parser without guessing missing grades", () => {
    const g = group({ school: "김해제일고", level: "고등학교", grade: null, semester: 1, subject: "공통수학1", path: `${root}/[김해제일고][[1][공수1][25-1-중간][김해](원본).pdf` });
    const missing = group({ school: "효성여고", level: "고등학교", grade: null, semester: 1, subject: "기하", path: `${root}/[효성여고][기하][25-1-기말].pdf` });
    const jobs = planPersonalExams({ groups: [g, missing], files: [file(g, "pdf", { completed: false }), file(missing)] }, bank).jobs;
    expect(jobs.find((j) => j.school === "김해제일고")).toMatchObject({ grade: 1, status: "readyForExtraction" });
    expect(jobs.find((j) => j.school === "효성여고")).toMatchObject({ grade: null, canonicalKey: null, status: "holdMetadata" });
  });

  it("holds unsupported subjects and multiple exact pairs without silently selecting a source", () => {
    const g = group({ school: "강동고", level: "고등학교", subject: "경제수학", path: `${root}/[강동고][2][경제수학][25-2-중간][천재] (완료).PDF` });
    const normal = group();
    const pdf = file(normal); const hwp = file(normal, "hwp");
    const jobs = planPersonalExams({ groups: [g, normal], files: [file(g), pdf, hwp, { ...hwp, path: hwp.path.replace(root, `${root}/복사`) }] }, bank).jobs;
    expect(jobs.find((j) => j.school === "강동고")).toMatchObject({ curriculumSubjectHint: null, status: "holdMetadata" });
    expect(jobs.find((j) => j.school === "강동중")).toMatchObject({ selectedPair: null, status: "holdMetadata" });
  });

  it("checks conflicting evidence in every paper copy even when the preferred completed pair agrees", () => {
    const g = group(); const pdf = file(g); const hwp = file(g, "hwp");
    const misplaced = file(g, "pdf", { path: `${root}/2024 기출모음/${pdf.filename}`, completed: false });
    const job = planPersonalExams({ groups: [g], files: [pdf, hwp, misplaced] }, bank).jobs[0]!;
    expect(job.selectedPair).toEqual({ pdf: pdf.path, hwp: hwp.path });
    expect(job.status).toBe("holdMetadata");
    expect(job.holdReasons.join(" ")).toContain("묶인 원본 폴더의 연도 불일치");
  });

  it("uses a unique completed HWP when unfinished PDF copies are ambiguous", () => {
    const g = group(); const hwp = file(g, "hwp");
    const pdf = file(g, "pdf", { completed: false });
    const job = planPersonalExams({ groups: [g], files: [hwp, pdf, { ...pdf, path: `${root}/복사/${pdf.filename}` }] }, bank).jobs[0]!;
    expect(job).toMatchObject({ selectedHwp: hwp.path, selectedPdf: null, selectedPair: null, status: "readyForExtraction" });
  });

  it("resolves duplicate completed pairs only when both formats have matching SHA256 and byte counts", () => {
    const g = group(); const pdf = file(g); const hwp = file(g, "hwp");
    const pdf2 = { ...pdf, path: `${root}/복사/${pdf.filename}` };
    const hwp2 = { ...hwp, path: `${root}/복사/${hwp.filename}` };
    const inventory = { groups: [g], files: [pdf, hwp, pdf2, hwp2] };
    const hashes = { fetchedAt: "2026-10-03T00:00:00Z", files: inventory.files.map((f) => ({ path: f.path, bytes: f.ext === "pdf" ? 100 : 200, sha256: (f.ext === "pdf" ? "a" : "b").repeat(64) })) };
    const job = planPersonalExams(inventory, bank, root, hashes).jobs[0]!;
    expect(job.status).toBe("readyForExtraction");
    expect(job.selectedPair).not.toBeNull();
    expect(job.completedPairs).toHaveLength(4);
    expect(job.files).toHaveLength(4);
    expect(job.metadataCorrections.join(" ")).toContain("SHA256");

    hashes.files[2]!.sha256 = "c".repeat(64);
    const different = planPersonalExams(inventory, bank, root, hashes).jobs[0]!;
    expect(different).toMatchObject({ status: "holdMetadata", selectedPair: null });
    expect(different.holdReasons.join(" ")).toContain("짝 2개");
  });

  it("keeps unhashed source copies ambiguous and rejects contradictory hash evidence", () => {
    const g = group(); const pdf = file(g); const hwp = file(g, "hwp");
    const hwp2 = { ...hwp, path: `${root}/복사/${hwp.filename}` };
    const inventory = { groups: [g], files: [pdf, hwp, hwp2] };
    const hashes = { fetchedAt: "2026-10-03T00:00:00Z", files: [{ path: hwp.path, bytes: 10, sha256: "a".repeat(64) }] };
    expect(planPersonalExams(inventory, bank, root, hashes).jobs[0]).toMatchObject({ status: "holdMetadata", selectedPair: null });
    hashes.files.push({ path: hwp.path, bytes: 10, sha256: "b".repeat(64) });
    expect(() => planPersonalExams(inventory, bank, root, hashes)).toThrow("상충하는 원본 해시");
  });
});
