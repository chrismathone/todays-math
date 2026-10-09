/** Explicit, reviewable recovery patches. This module never grants eligibility. */
import { createHash } from "node:crypto";
import type { Problem } from "@prisma/client";
import katex from "katex";
import { z } from "zod";

import { deriveQuestionType } from "@/lib/ai/questionType";
import { tokenizeMath } from "@/lib/math/segments";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { figureSvgViewBox } from "@/lib/figure/figureSvgFrame";
import { checkPaperRender } from "@/lib/testchanger/mathRenderQa";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  choiceIndexOf,
  countMarkers,
  figureChoiceNote,
} from "./figurePlacement";

export const recoveryCandidateSchema = z.object({
  problemCode: z.string().min(1),
  kind: z.enum(["correction", "rewrite", "unchanged", "blocked"]),
  content: z.string(),
  answer: z.string(),
  solution: z.string().nullable(),
  figureUrls: z.array(z.string()),
  figureSvg: z.string().nullable().optional(),
  questionType: z.enum(["객관식", "단답형", "서술형"]).optional(),
  notes: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v.join("\n") : v)),
  validation: z.object({ math: z.string(), visual: z.string() }),
  remainingIssues: z.array(z.string()),
});
export type RecoveryCandidate = z.infer<typeof recoveryCandidateSchema>;
export type RecoverySnapshot = Omit<Problem, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
export interface RecoveryAsset {
  sha256: string;
  width: number;
  height: number;
}

const fields = [
  "id",
  "problemCode",
  "externalId",
  "unitId",
  "source",
  "originProblemId",
  "difficulty",
  "problemType",
  "questionType",
  "content",
  "answer",
  "solution",
  "solutionSource",
  "figureSvg",
  "figureSource",
  "figureUrls",
  "figureDims",
  "figureSourceMm",
  "choiceFigureIndex",
  "reviewStatus",
  "directUseAllowed",
  "pool",
  "familyKey",
  "sourceMaterialId",
  "updatedAt",
] as const;

/** Includes eligibility, provenance, image metadata and update time, not just text. */
export function recoveryFingerprint(row: RecoverySnapshot | Problem): string {
  return createHash("sha256")
    .update(JSON.stringify(fields.map((field) => row[field])))
    .digest("hex");
}

export function recoveryDraftIssues(candidate: RecoveryCandidate): string[] {
  const issues = [...candidate.remainingIssues];
  if (!candidate.content.trim()) issues.push("발문이 비어 있다");
  if (!candidate.answer.trim() || candidate.answer === MISSING_ANSWER)
    issues.push("정답이 없다");
  if (!candidate.solution?.trim()) issues.push("해설이 없다");
  if (!candidate.validation.math.trim() || !candidate.validation.visual.trim())
    issues.push("검증 근거가 없다");
  for (const field of ["content", "answer", "solution"] as const) {
    const value = candidate[field] ?? "";
    const paper = checkPaperRender(value);
    if (!paper.safe) issues.push(`${field}: 운영 지면 ${paper.why.join(", ")}`);
    // Some app paths repair this, but Markdown export can read it as one invalid formula.
    if (/(?<!\$)\$[^$\n]+\$\$[^$\n]+\$(?!\$)/.test(value))
      issues.push(`${field}: 인접한 인라인 수식 구분자`);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
      issues.push(`${field}: 제어문자`);
    for (const segment of tokenizeMath(value)) {
      if (segment.type === "text") {
        if (/(?<!\\)\$/.test(segment.value))
          issues.push(`${field}: 닫히지 않은 수식`);
        if (
          /\\(?:frac|sqrt|parallel|overline|angle|times|leq|geq)\b/.test(
            segment.value,
          )
        )
          issues.push(`${field}: 수식 밖 명령`);
        continue;
      }
      try {
        katex.renderToString(segment.value, {
          throwOnError: true,
          strict: false,
          trust: false,
        });
      } catch {
        issues.push(`${field}: 수식 렌더 오류 ${segment.value.slice(0, 90)}`);
      }
      if (/\\(?:d?frac|sqrt)\s*\{\s*\}/.test(segment.value))
        issues.push(`${field}: 비어 있는 분수 또는 근호`);
    }
  }
  if (candidate.figureSvg) {
    if (candidate.figureUrls.length || !figureSvgViewBox(candidate.figureSvg))
      issues.push("인라인 도형은 단독 그림이며 유효한 viewBox가 필요하다");
    const tags = [...candidate.figureSvg.matchAll(/<\/?\s*([\w:-]+)/g)].map(
      (match) => match[1]!,
    );
    const allowed = new Set([
      "svg",
      "g",
      "path",
      "line",
      "polyline",
      "polygon",
      "circle",
      "ellipse",
      "rect",
      "text",
      "tspan",
      "title",
      "desc",
      "defs",
      "marker",
      "clipPath",
    ]);
    if (
      tags.some((tag) => !allowed.has(tag)) ||
      /<!|<\?|\bon\w+\s*=|\b(?:href|src)\s*=|url\(\s*[^#]/i.test(
        candidate.figureSvg,
      )
    )
      issues.push("인라인 도형에 허용되지 않는 태그 또는 외부 참조가 있다");
    if (choiceIndexOf(candidate.content)?.some((index) => index !== 0))
      issues.push("인라인 도형은 발문 그림에만 쓴다");
  }
  if (
    countMarkers(candidate.content) !==
    candidate.figureUrls.length + (candidate.figureSvg ? 1 : 0)
  )
    issues.push("그림 표지와 파일 수 불일치");
  const note = figureChoiceNote(
    candidate.content,
    candidate.figureUrls.length,
    choiceIndexOf(candidate.content),
  );
  if (note) issues.push(note);
  const associations = choiceIndexOf(candidate.content) ?? [];
  if (
    parseProblemContent(candidate.content).choices.some(
      (choice, index) =>
        countMarkers(choice) > 0 && !associations.includes(index + 1),
    )
  )
    issues.push("발문 그림 표지가 보기 안으로 흘러 들어갔다");
  return [...new Set(issues)];
}

export function recoveryContent(
  candidate: Pick<
    RecoveryCandidate,
    "content" | "answer" | "solution" | "figureUrls" | "figureSvg"
  >,
) {
  return {
    content: candidate.content,
    answer: candidate.answer,
    solution: candidate.solution,
    figureUrls: candidate.figureUrls,
    figureSvg: candidate.figureSvg ?? null,
  };
}

export function prepareRecovery(
  before: RecoverySnapshot,
  candidate: RecoveryCandidate,
  assets: ReadonlyMap<string, RecoveryAsset>,
) {
  if (candidate.problemCode !== before.problemCode)
    throw new Error("복구 대상 번호 불일치");
  if (
    before.source !== "school_textbook" ||
    before.directUseAllowed ||
    before.pool !== "shared"
  )
    throw new Error("잠긴 공용 교과서 문항만 복구한다");
  if (before.figureSvg)
    throw new Error("기존 인라인 그림은 별도 검토가 필요하다");
  if (candidate.kind === "blocked")
    throw new Error("미해결 문항은 적용하지 않는다");
  if (
    candidate.kind === "unchanged" &&
    JSON.stringify(recoveryContent(candidate)) !==
      JSON.stringify(recoveryContent({ ...candidate, ...before }))
  )
    throw new Error("변경 없음으로 표시한 문항의 내용이 바뀌었다");
  const issues = recoveryDraftIssues(candidate);
  if (issues.length) throw new Error(issues.join(" / "));
  const figureAssets = candidate.figureUrls.map((url) => {
    const asset = assets.get(url);
    if (
      !asset ||
      !Number.isInteger(asset.width) ||
      !Number.isInteger(asset.height) ||
      asset.width <= 0 ||
      asset.height <= 0
    )
      throw new Error(`그림 검증 또는 치수 누락: ${url}`);
    return asset;
  });
  const widths = candidate.figureUrls.map((url) => {
    const at = before.figureUrls.indexOf(url);
    return at >= 0 && before.figureSourceMm.length === before.figureUrls.length
      ? before.figureSourceMm[at]
      : undefined;
  });
  const rewrite = candidate.kind === "rewrite";
  const solutionChanged = candidate.solution !== before.solution;
  const questionType =
    candidate.questionType ??
    (rewrite
      ? deriveQuestionType({
          content: candidate.content,
          answer: candidate.answer,
          problemType: before.problemType,
        })
      : before.questionType);
  const after = {
    ...recoveryContent(candidate),
    questionType,
    solutionSource: solutionChanged ? ("ai" as const) : before.solutionSource,
    figureSource: candidate.figureSvg
      ? "engine"
      : candidate.figureUrls.length
        ? candidate.figureUrls.every((url) => before.figureUrls.includes(url))
          ? before.figureSource
          : "image"
        : null,
    figureDims: figureAssets.flatMap((asset) => [asset.width, asset.height]),
    figureSourceMm: widths.every(
      (width) => typeof width === "number" && width > 0,
    )
      ? (widths as number[])
      : [],
    choiceFigureIndex: candidate.figureSvg
      ? []
      : (choiceIndexOf(candidate.content) ?? []),
    directUseAllowed: false as const,
    reviewStatus: rewrite ? ("pending" as const) : before.reviewStatus,
  };
  const draftDigest = createHash("sha256")
    .update(
      JSON.stringify({
        after,
        assets: figureAssets.map((asset) => asset.sha256),
      }),
    )
    .digest("hex");
  return {
    problemCode: before.problemCode,
    originId: before.id,
    identity: {
      unitId: before.unitId,
      familyKey: before.familyKey,
      difficulty: before.difficulty,
      problemType: before.problemType,
      pool: before.pool,
      ...(rewrite
        ? { source: "transformed" as const, originProblemId: before.id }
        : {
            id: before.id,
            source: before.source,
            originProblemId: before.originProblemId,
            externalId: before.externalId,
            sourceMaterialId: before.sourceMaterialId,
          }),
    },
    kind: candidate.kind,
    beforeFingerprint: recoveryFingerprint(before),
    draftDigest,
    externalId: `textbook-recovery:20261009:${before.id}:${draftDigest.slice(0, 16)}`,
    after,
    assets: Object.fromEntries(
      candidate.figureUrls.map((url, at) => [url, figureAssets[at]!]),
    ),
    notes: candidate.notes,
    validation: candidate.validation,
  };
}
export type PreparedRecovery = ReturnType<typeof prepareRecovery>;

/** A retry may recognize exactly our prior write, but never a later human edit. */
export function matchesRecoveredRow(
  row: Problem,
  patch: PreparedRecovery,
): boolean {
  return Object.entries({ ...patch.identity, ...patch.after }).every(
    ([key, value]) =>
      JSON.stringify(row[key as keyof Problem]) === JSON.stringify(value),
  );
}
