/**
 * Opt-in regeneration artifacts. This module makes no model or database calls.
 * Mathematical verification is supplied by a separate solver/reviewer, never
 * inferred from formatting, agreement with an original answer, or a hash.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";
import { loadExamConfig } from "./examConfig";
import { graphFigureFields } from "./graphChoiceFigures";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = resolve(MODULE_DIR, "../../..");
const MANIFEST = "regeneration-manifest.json";
const RESULTS = "regeneration-results.json";
const sha256 = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const sourceFileSchema = z.object({
  file: z.string().min(1),
  digest: digestSchema,
});
const manifestSchema = z.object({
  version: z.literal(1),
  sourceDigest: digestSchema,
  blindPayloadDigest: digestSchema,
  sourceFiles: z.array(sourceFileSchema).min(3),
  questionNumbers: z.array(z.number().int().positive()).min(1),
  blindDir: z.string().min(1),
  grade: z.string().min(1),
});
const candidateSchema = z.object({
  answer: z.string().trim().min(1),
  solution: z.string().trim().min(1),
  solverId: z.string().trim().min(1),
});
const verificationSchema = z.object({
  status: z.enum(["pending", "rejected", "verified"]),
  sourceDigest: digestSchema,
  candidateDigest: digestSchema,
  method: z.literal("independent-solve"),
  verifierId: z.string().trim().min(1),
  independentAnswer: z.string().trim(),
  checks: z.object({
    answerCorrect: z.boolean(),
    solutionCorrect: z.boolean(),
    sourceFaithful: z.boolean(),
    curriculumAppropriate: z.boolean(),
  }),
  evidence: z.string().trim().min(1),
});

export type RegenerationCandidate = z.infer<typeof candidateSchema>;
type Verification = z.infer<typeof verificationSchema>;
type Manifest = z.infer<typeof manifestSchema>;
interface Draft {
  questionNumber: number;
  questionType: string;
  content: string;
  hasFigure?: boolean;
  score?: number | null;
}
interface SourceFigure {
  number: number;
  file: string;
  widthMm: number;
  px: number[];
  kind?: string;
}
interface ResultQuestion {
  n: number;
  status: "pending" | "rejected" | "verified";
  reason?: string;
  candidate?: RegenerationCandidate;
  verification?: Verification;
}
interface MiddleSchoolRules {
  forbiddenMethods: { name: string; pattern: string }[];
  forbiddenShapes: { name: string; pattern: string }[];
}
function middleSchoolRules(): MiddleSchoolRules {
  return JSON.parse(
    readFileSync(join(MODULE_DIR, "solver_rules.json"), "utf8"),
  ) as MiddleSchoolRules;
}
export interface RegenerationResult {
  version: 1;
  sourceDigest: string;
  status: "pending" | "verified";
  questions: ResultQuestion[];
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}
function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}
function inside(parent: string, path: string): boolean {
  const rel = relative(parent, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
function physicalPath(path: string): string {
  return existsSync(path)
    ? realpathSync(path)
    : join(physicalPath(dirname(path)), relative(dirname(path), path));
}
function sourcePath(examDir: string, file: string): string {
  const path = resolve(examDir, file);
  if (
    !inside(resolve(examDir), path) ||
    !inside(physicalPath(examDir), physicalPath(path))
  )
    throw new Error(`unsafe source path: ${file}`);
  return path;
}
function readDrafts(examDir: string): Draft[] {
  const drafts = z
    .array(
      z.object({
        questionNumber: z.number().int().positive(),
        questionType: z.string().min(1),
        content: z.string().min(1),
        hasFigure: z.boolean().optional(),
        score: z.number().nullable().optional(),
      }),
    )
    .min(1)
    .parse(readJson(join(examDir, "drafts.json")));
  if (new Set(drafts.map((d) => d.questionNumber)).size !== drafts.length)
    throw new Error("duplicate question numbers");
  return drafts;
}
function readFigures(examDir: string): SourceFigure[] {
  return z
    .object({
      figures: z.array(
        z.object({
          number: z.number().int().positive(),
          file: z.string().min(1),
          widthMm: z.number().positive(),
          px: z.array(z.number().positive()).length(2),
          kind: z.string().optional(),
        }),
      ),
    })
    .parse(readJson(join(examDir, "figures/index.json"))).figures;
}
function fingerprintSource(examDir: string, figures: SourceFigure[]) {
  const files = [
    ...new Set([
      "exam.json",
      "drafts.json",
      "figures/index.json",
      ...figures.map((f) => `figures/${f.file}`),
    ]),
  ].sort();
  const sourceFiles = files.map((file) => {
    const path = sourcePath(examDir, file);
    if (file === "exam.json") {
      // Units are assigned after extraction/solving in the existing workflow.
      // Only that assignment table is excluded; identity, grade, repairs and
      // graph mappings stay bound. The loader checks current units/families.
      const config = { ...(readJson(path) as Record<string, unknown>) };
      delete config.units;
      return { file, digest: sha256(JSON.stringify(config)) };
    }
    return { file, digest: sha256(readFileSync(path)) };
  });
  return { sourceFiles, sourceDigest: sha256(JSON.stringify(sourceFiles)) };
}
function assertCurrentSource(examDir: string, manifest: Manifest): Draft[] {
  const current = fingerprintSource(examDir, readFigures(examDir));
  if (
    current.sourceDigest !== manifest.sourceDigest ||
    JSON.stringify(current.sourceFiles) !== JSON.stringify(manifest.sourceFiles)
  )
    throw new Error(
      "source changed since regeneration preparation; prepare a new run",
    );
  if (loadExamConfig(examDir, { requireUnits: false }).grade !== manifest.grade)
    throw new Error("source grade differs from regeneration manifest");
  const drafts = readDrafts(examDir);
  if (
    JSON.stringify(drafts.map((d) => d.questionNumber)) !==
    JSON.stringify(manifest.questionNumbers)
  )
    throw new Error("source question coverage changed");
  return drafts;
}

function assertBlindInput(examDir: string, manifest: Manifest): void {
  if (
    sha256(
      JSON.stringify(readJson(join(manifest.blindDir, "problems.json"))),
    ) !== manifest.blindPayloadDigest
  )
    throw new Error("blind source problem payload changed; prepare a new run");
  for (const figure of readFigures(examDir)) {
    const original = readFileSync(
      sourcePath(examDir, `figures/${figure.file}`),
    );
    const blind = readFileSync(
      sourcePath(join(manifest.blindDir, "fig"), figure.file),
    );
    if (!original.equals(blind))
      throw new Error(`blind source figure changed: ${figure.file}`);
  }
}

export function candidateFingerprint(candidate: RegenerationCandidate): string {
  return sha256(JSON.stringify(candidateSchema.parse(candidate)));
}

/** Copy original figures and prepare every question, with original answer fields omitted. */
export function prepareRegeneration(
  examDir: string,
  blindDir: string,
): Manifest {
  examDir = resolve(examDir);
  blindDir = resolve(blindDir);
  if (
    inside(physicalPath(REPOSITORY), physicalPath(blindDir)) ||
    inside(physicalPath(examDir), physicalPath(blindDir)) ||
    inside(physicalPath(blindDir), physicalPath(REPOSITORY)) ||
    inside(physicalPath(blindDir), physicalPath(examDir))
  )
    throw new Error(
      "blind problem folder must be outside the repository and source exam folder",
    );
  const cfg = loadExamConfig(examDir, { requireUnits: false });
  const drafts = readDrafts(examDir);
  const figures = readFigures(examDir);
  const numbers = new Set(drafts.map((d) => d.questionNumber));
  if (figures.some((f) => !numbers.has(f.number)))
    throw new Error("figure belongs to an unknown question");
  for (const d of drafts) {
    if (d.hasFigure && !figures.some((f) => f.number === d.questionNumber))
      throw new Error(`question ${d.questionNumber}: missing original figure`);
    if (/\[(?:정답|해설)\]|(?:^|\n)\s*(?:정답|해설)\s*[:：]/u.test(d.content))
      throw new Error(
        `question ${d.questionNumber}: original answer or solution leaked into content`,
      );
  }
  const source = fingerprintSource(examDir, figures);
  const existingPayload = join(blindDir, "problems.json");
  if (
    existsSync(existingPayload) &&
    z.object({ sourceDigest: digestSchema }).parse(readJson(existingPayload))
      .sourceDigest !== source.sourceDigest
  )
    throw new Error(
      "blind folder contains another source run; use a new folder",
    );
  for (const folder of ["fig", "out", "verify"])
    mkdirSync(join(blindDir, folder), { recursive: true });
  const problems = drafts.map((d) => {
    const sourceFigures = figures.filter((f) => f.number === d.questionNumber);
    const choiceIndices = graphFigureFields(
      cfg.graphChoices?.[d.questionNumber],
      sourceFigures,
    ).choiceFigureIndex;
    const mine = sourceFigures.map((f, index) => {
      const path = sourcePath(join(blindDir, "fig"), f.file);
      mkdirSync(dirname(path), { recursive: true });
      copyFileSync(sourcePath(examDir, `figures/${f.file}`), path);
      return {
        path,
        widthMm: f.widthMm,
        px: f.px,
        kind: f.kind ?? "fig",
        choice: choiceIndices?.[index] ?? null,
      };
    });
    const filename = `q${String(d.questionNumber).padStart(2, "0")}.json`;
    return {
      n: d.questionNumber,
      questionType: d.questionType,
      content: d.content,
      score: d.score ?? null,
      figures: mine,
      out: join(blindDir, "out", filename),
      verificationOut: join(blindDir, "verify", filename),
    };
  });
  const payload = {
    version: 1,
    sourceDigest: source.sourceDigest,
    exam: {
      examId: cfg.examId,
      school: cfg.school,
      grade: cfg.grade,
      subject: cfg.subject,
    },
    problems,
  };
  const manifest: Manifest = {
    version: 1,
    ...source,
    blindPayloadDigest: sha256(JSON.stringify(payload)),
    questionNumbers: drafts.map((d) => d.questionNumber),
    blindDir,
    grade: cfg.grade,
  };
  writeJson(existingPayload, payload);
  writeFileSync(
    join(blindDir, "BRIEF.md"),
    [
      "문제의 발문·보기·원본 그림을 보고 모든 문항을 독립적으로 풀어 정답과 한국어 해설을 작성한다.",
      `학년/과목: ${cfg.grade} / ${cfg.subject}. 이 교육과정에서 배운 방법을 사용한다.`,
      "객관식 정답은 원문자(복수 정답이면 원문자들을 붙여서), 서술형·단답형 정답은 실제 답(소문항별 답 포함)으로 쓴다. 수식은 $...$ 안의 KaTeX로 쓴다.",
      ...(cfg.grade.startsWith("중")
        ? [
            "중학교 과정에서 금지되는 방법: " +
              middleSchoolRules()
                .forbiddenMethods.map((m) => m.name)
                .join(", "),
          ]
        : []),
      "각 out 파일에는 {answer, solution, solverId}를 쓴다. solverId는 이 독립 풀이 세션 식별자다.",
      "그림을 반드시 열어 보고 표·그래프의 값을 빠짐없이 확인한다. 원본에 없는 값은 추측하지 않는다.",
      "figures.choice가 0이면 발문 그림, 1~5이면 해당 객관식 보기 그림이다. null이면 별도 보기 배정이 없다.",
      "확인할 수 없으면 답을 지어내지 않고 {answer: '', solution: '', solverId, note: '사유'}로 남긴다.",
      "이 폴더 밖의 파일·저장소·원본 정답은 읽지 않는다. 웹 검색을 사용하지 않는다.",
      "독립 검산은 별도 세션이 담당한다. 풀이자가 verify 파일을 작성하지 않는다.",
    ].join("\n") + "\n",
    "utf8",
  );
  writeJson(join(examDir, MANIFEST), manifest);
  // Preparing a run invalidates any earlier approval, even when the source is unchanged.
  writeJson(join(examDir, RESULTS), {
    version: 1,
    sourceDigest: source.sourceDigest,
    status: "pending",
    questions: drafts.map((d) => ({
      n: d.questionNumber,
      status: "pending",
      reason: "awaiting independent solution and verification",
    })),
  });
  return manifest;
}

function candidateIssues(
  candidate: RegenerationCandidate,
  verification: Verification,
  manifest: Manifest,
  draft: Draft,
): string[] {
  const faults: string[] = [];
  if (verification.status !== "verified")
    faults.push(`verification ${verification.status}`);
  if (verification.verifierId === candidate.solverId)
    faults.push("verification must come from an independent session");
  if (verification.sourceDigest !== manifest.sourceDigest)
    faults.push("verification source digest differs");
  if (verification.candidateDigest !== candidateFingerprint(candidate))
    faults.push("verification candidate digest differs");
  if (Object.values(verification.checks).some((ok) => !ok))
    faults.push("independent verification correctness check failed");
  if (!verification.independentAnswer)
    faults.push("independently computed answer is missing");
  const normalize = (s: string) =>
    s
      .replace(/[①-⑤]/g, (ch) => String("①②③④⑤".indexOf(ch) + 1))
      .replace(/[$\s]/g, "");
  if (normalize(verification.independentAnswer) !== normalize(candidate.answer))
    faults.push("independently computed answer differs");
  if (draft.questionType === "객관식" && !/^[①-⑤]+$/.test(candidate.answer))
    faults.push("multiple choice answer must be a circled choice");
  for (const [label, text] of [
    ["answer", candidate.answer],
    ["solution", candidate.solution],
  ]) {
    if (/[\u0000-\u0008\u000b-\u001f\ue000-\uf8ff]/u.test(text))
      faults.push(`${label}: control or source font residue`);
    if ((text.match(/\$/g)?.length ?? 0) % 2)
      faults.push(`${label}: unmatched math delimiter`);
    const html = renderMathHtml(text);
    if (/math-raw|#cc0000|katex-error/.test(html))
      faults.push(`${label}: rendered math defect`);
    if (/\\[A-Za-z]{2,}/.test(html.replace(/<[^>]+>/g, "")))
      faults.push(`${label}: unrendered LaTeX command`);
  }
  // Existing solver rules are middle school rules, not universal method bans.
  if (manifest.grade.startsWith("중")) {
    const rules = middleSchoolRules();
    for (const method of [...rules.forbiddenMethods, ...rules.forbiddenShapes])
      if (new RegExp(method.pattern).test(candidate.solution))
        faults.push(`middle school method restriction: ${method.name}`);
  }
  return faults;
}

/** Supply a separate verifier the source problem and generated candidate, without original answers. */
export function prepareVerificationPack(examDir: string): string {
  const manifest = manifestSchema.parse(readJson(join(examDir, MANIFEST)));
  assertCurrentSource(examDir, manifest);
  assertBlindInput(examDir, manifest);
  const payload = z
    .object({
      problems: z.array(z.object({ n: z.number().int() }).passthrough()),
    })
    .parse(readJson(join(manifest.blindDir, "problems.json")));
  const problems = payload.problems.map((p) => {
    const filename = `q${String(p.n).padStart(2, "0")}.json`;
    const file = join(manifest.blindDir, "out", filename);
    const candidate = existsSync(file)
      ? candidateSchema.safeParse(readJson(file))
      : null;
    return {
      ...p,
      sourceDigest: manifest.sourceDigest,
      candidate: candidate?.success ? candidate.data : null,
      candidateDigest: candidate?.success
        ? candidateFingerprint(candidate.data)
        : null,
    };
  });
  const out = join(manifest.blindDir, "verification-problems.json");
  writeJson(out, { version: 1, grade: manifest.grade, problems });
  writeFileSync(
    join(manifest.blindDir, "VERIFY-BRIEF.md"),
    [
      "풀이자와 별도 세션에서 문제와 원본 그림을 먼저 독립적으로 풀고 후보 정답과 해설을 검산한다.",
      "원본 정답·해설은 열람하지 않는다. 그림·표·그래프를 열어 보고 값과 풀이 단계 근거를 확인한다.",
      "verificationOut마다 다음 계약을 기록한다. 확인하지 못한 검사는 true로 표시하지 않는다.",
      "{status: 'verified'|'rejected'|'pending', sourceDigest, candidateDigest, method: 'independent-solve',",
      " verifierId: '풀이자와 다른 검산 세션 식별자', independentAnswer: '별도로 계산한 답',",
      " checks: {answerCorrect: boolean, solutionCorrect: boolean, sourceFaithful: boolean, curriculumAppropriate: boolean}, evidence: '독립 계산과 단계별 검산 근거'}",
      "candidateDigest/sourceDigest는 입력에 주어진 값을 그대로 기록한다. 후보가 없거나 근거가 모자라면 pending으로 둔다.",
      "이 검산 기록은 외부 검산자의 보고이며, 해시 일치나 형식 검사만으로 검산 완료를 선언할 수 없다.",
    ].join("\n") + "\n",
    "utf8",
  );
  return out;
}

/** Consume existing external verification reports; missing or unresolved reports remain held. */
export function collectRegeneration(examDir: string): RegenerationResult {
  const manifest = manifestSchema.parse(readJson(join(examDir, MANIFEST)));
  const drafts = assertCurrentSource(examDir, manifest);
  assertBlindInput(examDir, manifest);
  const questions: ResultQuestion[] = drafts.map((draft) => {
    const n = draft.questionNumber;
    const filename = `q${String(n).padStart(2, "0")}.json`;
    const candidateFile = join(manifest.blindDir, "out", filename);
    const verificationFile = join(manifest.blindDir, "verify", filename);
    if (!existsSync(candidateFile) || !existsSync(verificationFile))
      return {
        n,
        status: "pending",
        reason: "missing candidate or independent verification",
      };
    try {
      const candidate = candidateSchema.parse(readJson(candidateFile));
      const verification = verificationSchema.parse(readJson(verificationFile));
      const faults = candidateIssues(candidate, verification, manifest, draft);
      if (faults.length)
        return {
          n,
          status: verification.status === "pending" ? "pending" : "rejected",
          reason: faults.join("; "),
        };
      return { n, status: "verified", candidate, verification };
    } catch (error) {
      return {
        n,
        status: "pending",
        reason: `invalid or unresolved regeneration artifact: ${String(error)}`,
      };
    }
  });
  const result: RegenerationResult = {
    version: 1,
    sourceDigest: manifest.sourceDigest,
    status: questions.every((q) => q.status === "verified")
      ? "verified"
      : "pending",
    questions,
  };
  writeJson(join(examDir, RESULTS), result);
  return result;
}

/** Fail closed before loading: every source question needs a current, verified new answer AND solution. */
export function readVerifiedRegeneration(
  examDir: string,
): Map<number, RegenerationCandidate> {
  const manifest = manifestSchema.parse(readJson(join(examDir, MANIFEST)));
  const drafts = assertCurrentSource(examDir, manifest);
  const result = z
    .object({
      version: z.literal(1),
      sourceDigest: digestSchema,
      status: z.literal("verified"),
      questions: z.array(
        z.object({
          n: z.number().int().positive(),
          status: z.literal("verified"),
          candidate: candidateSchema,
          verification: verificationSchema,
        }),
      ),
    })
    .safeParse(readJson(join(examDir, RESULTS)));
  if (!result.success)
    throw new Error(
      "regeneration pending or invalid: every question must be independently verified",
    );
  if (result.data.sourceDigest !== manifest.sourceDigest)
    throw new Error("regeneration source digest differs");
  const questions = result.data.questions;
  if (
    questions.length !== drafts.length ||
    new Set(questions.map((q) => q.n)).size !== drafts.length
  )
    throw new Error("regeneration question coverage differs");
  const by = new Map(questions.map((q) => [q.n, q]));
  const out = new Map<number, RegenerationCandidate>();
  for (const draft of drafts) {
    const q = by.get(draft.questionNumber);
    if (!q)
      throw new Error(`regeneration question ${draft.questionNumber} missing`);
    const faults = candidateIssues(
      q.candidate,
      q.verification,
      manifest,
      draft,
    );
    if (faults.length)
      throw new Error(`regeneration question ${q.n}: ${faults.join("; ")}`);
    out.set(q.n, q.candidate);
  }
  return out;
}
