/**
 * 오늘의 영어 2판 — 문서 검증기 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 계약(`englishV2.contract.ts`)은 모양만 잠근다. 여기서는 지문과 문항을 같이 보는 뜻을 본다:
 *   - 형식 판이 2인가(모르는 판 · 1판 값은 2판으로 읽지 않는다)
 *   - ID 가 문서에서 하나뿐인가(지문 · 문항 · 표적이 같은 ID 를 나눠 쓰지 않는다)
 *   - 문항이 가리키는 지문이 있고, 문항이 건 지문 개정이 지문의 개정과 같은가
 *   - 자리(span)가 지문 안이고, 서로게이트 쌍 가운데를 끊지 않고, `quote` 가 그 자리의 글자와 같은가
 *   - 한 문항 안에서 표적 자리가 겹치지 않는가
 *   - 표적마다 정답이 있고, 그 정답이 그 표적의 보기 가운데 하나인가
 *
 * 자리는 JS UTF-16 단위의 `[start, end)` 다 — `text.slice(start, end)` 와 같은 눈금. 지문 글을 다듬으면 자리가 밀리므로
 * 이 파일의 어떤 함수도 지문 글을 고치지 않는다. 지문이 개정되면 새 `sourceRevision` 이고, 옛 개정에 건 문항은
 * `stale_source_revision` 으로 막힌다 — 자리를 다시 잡고 재검토한 뒤에야 통과한다(그 문항에 딸린 평가도 무효다).
 *
 * 순수 함수다(서버 · 클라이언트 같이). 통과 ≠ 정답이 옳다 — 구조만 본다. 문법 · 의미 타당성은 교사 검토의 일이다.
 */
import type { z } from "zod";

import {
  ENGLISH_SCHEMA_VERSION_V2,
  englishV2DocumentSchema,
  type EnglishV2Document,
  type EnglishV2Item,
  type EnglishV2Passage,
  type EnglishV2Span,
} from "@/contracts/englishV2.contract";

import { normalizeEnglishText } from "../validate";
import { probeEnglishSchemaVersion } from "./versionGate";

export type EnglishV2IssueCode =
  | "invalid_json"
  | "unsupported_version"
  | "unknown_field"
  | "shape"
  | "target_answer_missing"
  | "duplicate_id"
  | "unknown_passage"
  | "stale_source_revision"
  | "span_out_of_bounds"
  | "span_splits_surrogate"
  | "span_quote_mismatch"
  | "span_blank"
  | "target_span_overlap"
  | "duplicate_alternative"
  | "answer_not_in_alternatives";

export interface EnglishV2Issue {
  code: EnglishV2IssueCode;
  /** 어디인가 — `items[0].targets[1].span` 꼴. 문서 전체면 빈 글 */
  path: string;
  message: string;
}

export type EnglishV2Verdict =
  | { ok: true; document: EnglishV2Document }
  | { ok: false; issues: EnglishV2Issue[] };

/** zod 경로 → `items[0].targets[1].answer` */
export function englishV2Path(path: readonly PropertyKey[]): string {
  let out = "";
  for (const part of path)
    out +=
      typeof part === "number"
        ? `[${part}]`
        : out
          ? `.${String(part)}`
          : String(part);
  return out;
}

function unsupportedVersion(value: unknown): EnglishV2Issue | null {
  const probe = probeEnglishSchemaVersion(value);
  if (probe.kind === "v2") return null;
  return {
    code: "unsupported_version",
    path: "schemaVersion",
    message:
      probe.kind === "v1"
        ? `문항 형식 ${ENGLISH_SCHEMA_VERSION_V2}판 문서가 아닙니다 (1판이거나 판 표지가 없습니다).`
        : `읽을 수 없는 형식 판입니다 (${JSON.stringify(probe.schemaVersion) ?? "없음"}). ${ENGLISH_SCHEMA_VERSION_V2}판만 읽습니다.`,
  };
}

/** 넣은 값에서 그 자리의 값 — 없으면 undefined */
function valueAt(value: unknown, path: readonly PropertyKey[]): unknown {
  let at: unknown = value;
  for (const part of path) {
    if (typeof at !== "object" || at === null) return undefined;
    at = (at as Record<PropertyKey, unknown>)[part];
  }
  return at;
}

/** 계약 실패 → 사유. 모르는 칸은 칸마다 한 줄, 표적의 빠진 정답은 그 표적을 짚는다 */
function shapeIssues(error: z.ZodError, value: unknown): EnglishV2Issue[] {
  const issues: EnglishV2Issue[] = [];
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys)
        issues.push({
          code: "unknown_field",
          path: englishV2Path([...issue.path, key]),
          message: `모르는 칸입니다: ${key}. 2판 계약에 없는 칸은 저장하지 않습니다.`,
        });
      continue;
    }
    const last = issue.path[issue.path.length - 1];
    const targetIndex = issue.path[issue.path.length - 2];
    const underTargets = issue.path[issue.path.length - 3] === "targets";
    // 빠졌거나 null 인 것만 «정답 없음»이다 — 모양이 틀린 정답(글자열 · 배열)은 shape 로 남긴다
    if (
      last === "answer" &&
      underTargets &&
      typeof targetIndex === "number" &&
      valueAt(value, issue.path) == null
    ) {
      issues.push({
        code: "target_answer_missing",
        path: englishV2Path(issue.path),
        message: `${targetIndex + 1}번 표적의 정답이 없습니다. 정답은 표적마다 하나씩 있어야 합니다.`,
      });
      continue;
    }
    issues.push({
      code: "shape",
      path: englishV2Path(issue.path),
      message: issue.message,
    });
  }
  return issues;
}

const isHighSurrogate = (unit: number) => unit >= 0xd800 && unit <= 0xdbff;
const isLowSurrogate = (unit: number) => unit >= 0xdc00 && unit <= 0xdfff;

/** `index` 가 서로게이트 쌍의 가운데(높은 쪽 뒤 · 낮은 쪽 앞)인가 */
function splitsSurrogate(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;
  return (
    isHighSurrogate(text.charCodeAt(index - 1)) &&
    isLowSurrogate(text.charCodeAt(index))
  );
}

/** 자리 하나를 지문에 대 본다 — 경계 → 서로게이트 → 인용 순서로, 앞에서 걸리면 뒤는 재지 않는다 */
function spanIssue(
  span: EnglishV2Span,
  text: string,
  path: string,
): EnglishV2Issue | null {
  if (span.start >= span.end || span.end > text.length)
    return {
      code: "span_out_of_bounds",
      path,
      message: `자리 [${span.start}, ${span.end})가 지문(${text.length}자) 밖이거나 비어 있습니다.`,
    };
  if (splitsSurrogate(text, span.start) || splitsSurrogate(text, span.end))
    return {
      code: "span_splits_surrogate",
      path,
      message: `자리 [${span.start}, ${span.end})가 한 글자(서로게이트 쌍)의 가운데를 끊습니다.`,
    };
  if (text.slice(span.start, span.end) !== span.quote)
    return {
      code: "span_quote_mismatch",
      path,
      message: `인용이 지문의 그 자리 [${span.start}, ${span.end}) 글자와 다릅니다.`,
    };
  return null;
}

/** 문서의 ID 를 한 장부에 적는다 — 종류가 달라도 같은 ID 는 한 번만 */
function claimId(
  seen: Map<string, string>,
  id: string,
  path: string,
  issues: EnglishV2Issue[],
): void {
  const first = seen.get(id);
  if (first !== undefined) {
    issues.push({
      code: "duplicate_id",
      path,
      message: `같은 ID 가 두 번 쓰였습니다 (처음: ${first}).`,
    });
    return;
  }
  seen.set(id, path);
}

function itemIssues(
  item: EnglishV2Item,
  at: string,
  passages: Map<string, EnglishV2Passage>,
  seen: Map<string, string>,
): EnglishV2Issue[] {
  const issues: EnglishV2Issue[] = [];
  claimId(seen, item.itemId, `${at}.itemId`, issues);
  item.targets.forEach((target, index) =>
    claimId(seen, target.targetId, `${at}.targets[${index}].targetId`, issues),
  );

  const passage = passages.get(item.passageId);
  if (!passage) {
    issues.push({
      code: "unknown_passage",
      path: `${at}.passageId`,
      message: "문항이 가리키는 지문이 문서에 없습니다.",
    });
    return issues;
  }
  if (item.sourceRevision !== passage.sourceRevision) {
    // 자리가 우연히 맞아도 믿지 않는다 — 다른 개정의 글에 건 자리다
    issues.push({
      code: "stale_source_revision",
      path: `${at}.sourceRevision`,
      message: `문항은 지문 개정 ${item.sourceRevision}에 걸려 있는데 지문은 개정 ${passage.sourceRevision}입니다. 자리를 다시 잡고 재검토해야 합니다.`,
    });
    return issues;
  }

  /** 자리가 멀쩡한 표적만 겹침을 잰다 */
  const placed: { start: number; end: number; index: number }[] = [];
  item.targets.forEach((target, index) => {
    const targetAt = `${at}.targets[${index}]`;
    const bad = spanIssue(target.span, passage.text, `${targetAt}.span`);
    if (bad) issues.push(bad);
    else if (target.span.quote.trim().length === 0)
      issues.push({
        code: "span_blank",
        path: `${targetAt}.span`,
        message: "표적 자리가 공백뿐입니다.",
      });
    else {
      const clash = placed.find(
        (other) =>
          target.span.start < other.end && other.start < target.span.end,
      );
      if (clash)
        issues.push({
          code: "target_span_overlap",
          path: `${targetAt}.span`,
          message: `표적 자리가 ${clash.index + 1}번 표적과 겹칩니다.`,
        });
      placed.push({ ...target.span, index });
    }

    const keys = new Set<string>();
    const texts = new Set<string>();
    target.alternatives.forEach((alternative, altIndex) => {
      const text = normalizeEnglishText(alternative.text);
      if (keys.has(alternative.alternativeId) || texts.has(text))
        issues.push({
          code: "duplicate_alternative",
          path: `${targetAt}.alternatives[${altIndex}]`,
          message: "같은 보기(열쇠 또는 글)가 두 번 있습니다.",
        });
      keys.add(alternative.alternativeId);
      texts.add(text);
    });
    if (!keys.has(target.answer.alternativeId))
      issues.push({
        code: "answer_not_in_alternatives",
        path: `${targetAt}.answer`,
        message: `${index + 1}번 표적의 정답(${target.answer.alternativeId})이 그 표적의 보기에 없습니다.`,
      });

    target.evidence.forEach((span, evidenceIndex) => {
      const badEvidence = spanIssue(
        span,
        passage.text,
        `${targetAt}.evidence[${evidenceIndex}]`,
      );
      if (badEvidence) issues.push(badEvidence);
    });
  });
  return issues;
}

/**
 * 2판 문서 하나를 판정한다. 결함은 다 모아서 돌려준다(문서 순서대로).
 * 형식 판이 2가 아니면 그 사유 하나만 낸다 — 다른 판의 값을 2판 규칙으로 재지 않는다.
 */
export function validateEnglishV2Document(value: unknown): EnglishV2Verdict {
  const version = unsupportedVersion(value);
  if (version) return { ok: false, issues: [version] };

  const parsed = englishV2DocumentSchema.safeParse(value);
  if (!parsed.success)
    return { ok: false, issues: shapeIssues(parsed.error, value) };
  const document = parsed.data;

  const issues: EnglishV2Issue[] = [];
  const seen = new Map<string, string>([[document.documentId, "documentId"]]);
  const passages = new Map<string, EnglishV2Passage>();
  document.passages.forEach((passage, index) => {
    claimId(seen, passage.passageId, `passages[${index}].passageId`, issues);
    if (!passages.has(passage.passageId))
      passages.set(passage.passageId, passage);
  });
  document.items.forEach((item, index) =>
    issues.push(...itemIssues(item, `items[${index}]`, passages, seen)),
  );
  return issues.length ? { ok: false, issues } : { ok: true, document };
}
