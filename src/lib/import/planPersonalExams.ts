import { createHash } from "node:crypto";
import path from "node:path";

import {
  buildExamKey,
  parseExamFileName,
  parseFolderPeriod,
  type ExamLevelLabel,
  type ExamRoundLabel,
} from "./examIdentity";
import { HIGH_SUBJECT } from "./highSubjectAliases";

/** Filename inventory is evidence to inspect, never proof that extraction or review succeeded. */
export interface InventoryExam {
  school: string | null;
  level: string | null;
  year: number | null;
  grade: number | null;
  semester: number | null;
  exam: string | null;
  subject: string | null;
  path: string;
  notes?: string;
}

export interface InventoryFile extends InventoryExam {
  ext: string;
  filename: string;
  relative: string;
  kind: string;
  completed: boolean;
}

export interface PersonalExamInventory {
  groups: InventoryExam[];
  files: InventoryFile[];
}

export interface BankSnapshot {
  fetchedAt: string;
  units: Array<{ id: string; grade: string; chapter: string; section: string }>;
  problems: Array<{
    exam_id: string | null;
    source_file: string | null;
    school: string | null;
    subject: string | null;
    count: number;
  }>;
  exams: Array<{
    external_exam_id: string;
    school: string;
    level: string;
    grade: number;
    subject: string;
    subject_raw: string | null;
    year: number;
    semester: number;
    round: string;
    source_file: string | null;
    question_count: number;
  }>;
}

export interface PersonalExamJob {
  examId: string;
  canonicalKey: string | null;
  school: string | null;
  level: ExamLevelLabel | null;
  grade: number | null;
  year: number | null;
  semester: number | null;
  round: ExamRoundLabel | null;
  /** Alias from the existing audit table; per-question Unit assignment must confirm it. */
  curriculumSubjectHint: string | null;
  /** Original paper label, for Problem.subject. Middle-school papers use 수학. */
  problemSubject: string | null;
  subjectRaw: string | null;
  sourceFile: string;
  files: InventoryFile[];
  completedPairs: Array<{ pdf: string; hwp: string }>;
  selectedPair: { pdf: string; hwp: string } | null;
  selectedPdf: string | null;
  selectedHwp: string | null;
  status: "skipExisting" | "holdMetadata" | "readyForExtraction";
  holdReasons: string[];
  metadataCorrections: string[];
  inventoryGroupCount: number;
  existingExamIds: string[];
  existingQuestionCount: number;
}

export const PERSONAL_EXAM_METADATA_CONTRACT = {
  references: [
    "prisma/schema.prisma:756",
    "scripts/import/exam-paper/load-exam-paper.ts:473",
    "src/lib/import/examIdentity.ts:376",
    "src/contracts/difficulty.ts:27",
    "src/contracts/problem.contract.ts:47",
  ],
  problemFields: [
    "userId", "unitId", "source", "originProblemId", "difficulty", "problemType",
    "questionType", "content", "answer", "solution", "solutionSource", "figureSvg",
    "figureSource", "figureUrls", "figureDims", "figureSourceMm", "choiceFigureIndex",
    "externalId", "sourceFile", "school", "subject", "examId", "questionNumber", "score",
    "reviewStatus", "directUseAllowed", "pool", "familyKey",
  ],
  databaseAssignedFields: ["id", "problemCode", "createdAt", "updatedAt"],
  examFields: [
    "externalExamId", "school", "level", "grade", "subject", "subjectRaw", "year",
    "semester", "round", "totalScore", "questionCount", "sourceFile",
  ],
  examQuestionFields: [
    "number", "score", "qtype", "difficultyLabel", "topicRaw", "unitId", "answer",
    "hasFigure", "problemId",
  ],
  requirements: [
    "Extract only question content, choices, subquestions, figures and original metadata.",
    "Regenerate every answer and solution; solutionSource is ai after adoption/verification.",
    "Use actual bank Unit UUIDs and existing live family keys; document genuinely new families.",
    "Problem.subject preserves the paper label; Exam.subject comes from assigned Unit.grade.",
    "externalId is examId + '-' + original questionNumber; preserve existing IDs when skipping.",
    "Keep score and original topic/difficulty evidence; do not invent missing metadata.",
    "Validate all figure arrays in source order and render content, answer and solution.",
    "Apply existing review rules after verification; this manifest grants no approved status.",
    "Sync Exam/ExamQuestion after Problem import and keep an import/revert ledger.",
  ],
} as const;

function provisionalKey(x: InventoryExam): string {
  return JSON.stringify([x.school, x.level, x.grade, x.year, x.semester, x.exam, x.subject]);
}

function nfc(value: string): string {
  return value.normalize("NFC");
}

function stem(file: string): string {
  return nfc(path.win32.basename(file)).replace(/\.[^.]+$/, "");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueFiles(files: InventoryFile[]): InventoryFile[] {
  return [...new Map(files.map((f) => [nfc(f.path), f])).values()]
    .sort((a, b) => a.path.localeCompare(b.path));
}

function relativeSource(file: string, root: string): string {
  return nfc(path.win32.relative(root, file)).replace(/\\/g, "/");
}

function resolveGroup(group: InventoryExam, files: InventoryFile[], labels: Set<string>, root: string): PersonalExamJob {
  const file = parseExamFileName(group.path);
  const holdReasons: string[] = [];
  const metadataCorrections: string[] = [];
  if (!file) holdReasons.push("기존 examIdentity 파일명 파서로 학교·학년·시점을 확정하지 못함");
  const school = file?.school ?? group.school;
  const level: ExamLevelLabel | null = school?.endsWith("중") ? "중" : school?.endsWith("고") ? "고" : null;
  if (!level) holdReasons.push("학교급 확인 필요");
  const grade = file?.grade ?? group.grade;
  const year = file?.year ?? group.year;
  const semester = file?.semester ?? group.semester;
  const round = file?.round ?? (group.exam === "중간" || group.exam === "기말" ? group.exam : null);
  if (!grade || ![1, 2, 3].includes(grade)) holdReasons.push("학년 확인 필요");
  if (!year || year < 2025) holdReasons.push("실제 시험 연도가 2025 이상인지 확인 필요");
  if (!semester || ![1, 2].includes(semester) || !round) holdReasons.push("학기·회차 확인 필요");
  if (file) {
    for (const [field, left, right] of [
      ["학교", group.school, file.school], ["학년", group.grade, file.grade],
      ["연도", group.year, file.year], ["학기", group.semester, file.semester],
      ["회차", group.exam, file.round],
    ] as const) {
      if (left !== null && left !== right) holdReasons.push(`목록과 기존 파일명 파서의 ${field} 불일치: ${left} / ${right}`);
    }
    if (group.grade === null) metadataCorrections.push(`기존 파일명 파서로 학년 ${file.grade} 복구`);
    if (file.prepLabelled) holdReasons.push("파일명 대비 표기: 실제 시험 여부와 원본 문서 제목 확인 필요");
  }
  const folder = parseFolderPeriod(group.path);
  for (const [field, left, right] of [
    ["연도", folder.year, year], ["학기", folder.semester, semester], ["회차", folder.round, round],
  ] as const) {
    if (left !== null && left !== right) holdReasons.push(`파일명과 폴더의 ${field} 불일치: ${right} / ${left}; 문서 제목 확인 필요`);
  }
  for (const candidate of files.filter((f) => f.kind === "기출 시험지")) {
    const parsed = parseExamFileName(candidate.path);
    if (parsed && (parsed.school !== school || parsed.grade !== grade || parsed.year !== year || parsed.semester !== semester || parsed.round !== round)) {
      holdReasons.push(`묶인 원본의 파일명 메타데이터 불일치: ${candidate.filename}`);
    }
    const location = parseFolderPeriod(candidate.path);
    for (const [field, left, right] of [
      ["연도", location.year, year], ["학기", location.semester, semester], ["회차", location.round, round],
    ] as const) {
      if (left !== null && left !== right) holdReasons.push(`묶인 원본 폴더의 ${field} 불일치: ${right} / ${left}; 문서 제목 확인 필요`);
    }
  }
  const subjectRaw = file?.subjectRaw ?? null;
  const curriculumSubjectHint = level === "중" && grade ? `중${grade}` : subjectRaw ? HIGH_SUBJECT[subjectRaw] ?? null : null;
  if (!curriculumSubjectHint || !labels.has(curriculumSubjectHint)) holdReasons.push(`기존 교육과정 과목 매핑 확인 필요: ${subjectRaw ?? group.subject ?? "없음"}`);
  const canonicalKey = school && level && grade && year && semester && round && curriculumSubjectHint
    ? buildExamKey({ school, level, grade, subject: curriculumSubjectHint, year, semester, round }) : null;
  const identity = canonicalKey ?? provisionalKey(group);
  return {
    examId: `personal-${createHash("sha256").update(nfc(identity)).digest("hex").slice(0, 32)}`,
    canonicalKey, school, level, grade, year, semester, round, curriculumSubjectHint,
    problemSubject: subjectRaw ?? (level === "중" ? "수학" : null), subjectRaw,
    sourceFile: relativeSource(group.path, root), files: uniqueFiles(files),
    completedPairs: [], selectedPair: null, selectedPdf: null, selectedHwp: null,
    status: holdReasons.length ? "holdMetadata" : "readyForExtraction",
    holdReasons: unique(holdReasons), metadataCorrections, inventoryGroupCount: 1,
    existingExamIds: [], existingQuestionCount: 0,
  };
}

function chooseSources(job: PersonalExamJob): void {
  const papers = job.files.filter((f) => f.kind === "기출 시험지");
  const pdfs = papers.filter((f) => f.ext.toLowerCase() === "pdf");
  const hwps = papers.filter((f) => ["hwp", "hwpx"].includes(f.ext.toLowerCase()));
  const completed = pdfs.filter((f) => f.completed);
  const completedHwps = hwps.filter((f) => f.completed);
  job.completedPairs = completed.flatMap((pdf) => hwps.filter((hwp) => stem(hwp.path) === stem(pdf.path))
    .map((hwp) => ({ pdf: pdf.path, hwp: hwp.path })));
  if (job.completedPairs.length === 1) {
    job.selectedPair = job.completedPairs[0]!;
    job.selectedPdf = job.selectedPair.pdf;
    job.selectedHwp = job.selectedPair.hwp;
  } else if (job.completedPairs.length > 1) {
    job.holdReasons.push(`동일 stem의 완료 HWP/PDF 짝 ${job.completedPairs.length}개: 내용/바이트 대조 필요`);
  } else if (completed.length === 1) job.selectedPdf = completed[0]!.path;
  else if (completed.length > 1) job.holdReasons.push(`완료 PDF ${completed.length}개: 대표 원본 확인 필요`);
  else if (completedHwps.length === 1) job.selectedHwp = completedHwps[0]!.path;
  else if (completedHwps.length > 1) job.holdReasons.push(`완료 HWP ${completedHwps.length}개: 대표 원본 확인 필요`);
  else if (pdfs.length === 1) job.selectedPdf = pdfs[0]!.path;
  else if (pdfs.length > 1) job.holdReasons.push(`완료본 없는 PDF ${pdfs.length}개: 대표 원본 확인 필요`);
  else if (hwps.length === 1) job.selectedHwp = hwps[0]!.path;
  else if (hwps.length > 1) job.holdReasons.push(`HWP 전용 ${hwps.length}개: 대표 원본 확인 필요`);
  else job.holdReasons.push("원본 HWP/PDF 경로 없음");
}

/** Read-only planner. No database client, model call, COM or source-document operation. */
export function planPersonalExams(inventory: PersonalExamInventory, bank: BankSnapshot, sourceRoot = "N:/개인/기출") {
  const byInventory = new Map<string, InventoryFile[]>();
  for (const f of inventory.files) {
    const key = provisionalKey(f);
    const rows = byInventory.get(key) ?? [];
    rows.push(f);
    byInventory.set(key, rows);
  }
  const labels = new Set(bank.units.map((u) => u.grade));
  const grouped = new Map<string, PersonalExamJob>();
  for (const group of inventory.groups.filter((g) => g.year !== null && g.year >= 2025)) {
    const job = resolveGroup(group, byInventory.get(provisionalKey(group)) ?? [], labels, sourceRoot);
    const key = job.canonicalKey ?? job.examId;
    const previous = grouped.get(key);
    if (previous) {
      previous.files = uniqueFiles([...previous.files, ...job.files]);
      previous.holdReasons = unique([...previous.holdReasons, ...job.holdReasons]);
      previous.metadataCorrections = unique([...previous.metadataCorrections, ...job.metadataCorrections]);
      previous.inventoryGroupCount += 1;
      if (previous.problemSubject !== job.problemSubject) previous.holdReasons.push("동일 자연키에 원문 과목 표기가 다른 자료: 내용 대조 필요");
    } else grouped.set(key, job);
  }
  const jobs = [...grouped.values()].sort((a, b) => (a.canonicalKey ?? a.examId).localeCompare(b.canonicalKey ?? b.examId));
  for (const job of jobs) {
    chooseSources(job);
    const selectedSource = job.selectedPair?.pdf ?? job.selectedPdf ?? job.selectedHwp;
    if (selectedSource) job.sourceFile = relativeSource(selectedSource, sourceRoot);
    const existing = bank.exams.filter((e) => e.external_exam_id === job.canonicalKey);
    const paths = new Set(job.files.map((f) => relativeSource(f.path, sourceRoot).toLowerCase()));
    const problems = bank.problems.filter((p) => p.source_file && paths.has(nfc(p.source_file).replace(/\\/g, "/").toLowerCase()));
    job.existingExamIds = unique(problems.map((p) => p.exam_id).filter((id): id is string => !!id));
    if (existing.length && !job.existingExamIds.length) job.holdReasons.push("기존 Exam 자연키 일치하나 Problem.examId 연결을 확인하지 못함");
    if (job.existingExamIds.length === 1) job.examId = job.existingExamIds[0]!;
    else if (job.existingExamIds.length > 1) job.holdReasons.push("같은 원본 그룹에 기존 Problem.examId가 둘 이상 있음");
    job.existingQuestionCount = problems.reduce((sum, p) => sum + p.count, 0);
    job.holdReasons = unique(job.holdReasons);
    job.status = existing.length || problems.length ? "skipExisting" : job.holdReasons.length ? "holdMetadata" : "readyForExtraction";
  }
  const ids = new Set<string>();
  for (const job of jobs) {
    if (ids.has(job.examId)) throw new Error(`examId 충돌: ${job.examId}`);
    ids.add(job.examId);
  }
  return {
    minimumYear: 2025,
    bankSnapshotAt: bank.fetchedAt,
    sourceRoot,
    note: "Filename candidates only; content extraction, answer/solution regeneration, review and DB import are not completed.",
    summary: {
      inventoryGroups: inventory.groups.filter((g) => g.year !== null && g.year >= 2025).length,
      canonicalJobs: jobs.length,
      readyForExtraction: jobs.filter((j) => j.status === "readyForExtraction").length,
      holdMetadata: jobs.filter((j) => j.status === "holdMetadata").length,
      skipExisting: jobs.filter((j) => j.status === "skipExisting").length,
      existingQuestions: jobs.reduce((sum, j) => sum + j.existingQuestionCount, 0),
      selectedCompletedPairs: jobs.filter((j) => j.selectedPair).length,
    },
    metadataContract: PERSONAL_EXAM_METADATA_CONTRACT,
    jobs,
  };
}
