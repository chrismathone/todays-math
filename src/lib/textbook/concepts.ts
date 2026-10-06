import "server-only";
import type {
  ConceptBlankForm,
  ConceptBlankPick,
} from "@/contracts/conceptBlank.contract";
import {
  textbookConceptSchema,
  type TextbookConcept,
  type TextbookConceptTarget,
  type TextbookFrozenEntry,
} from "@/contracts/textbookConcept.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { conceptSupportsForm } from "@/lib/concept-blank/questions";
import { getBlankSection } from "@/lib/concept-blank/sections";
import {
  EXACT_COMPOSITION_VERSION,
  EXACT_PARSER_VERSION,
  resolveBlankSections,
  selectionFromPicks,
} from "@/lib/concept-blank/exactPick";
import { composeFrozenTextbookBlank } from "@/lib/concept-blank/textbookPrint";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import { explorerCardForSection } from "@/lib/math-explorers/curriculumBridge";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { curriculumGraph } from "@/lib/math-prerequisite/graph";
import { canonicalHash, conceptContentHash } from "./hash.server";

const allEntries: TextbookFrozenEntry[] = [
  ...CONCEPT_BLANK_BANK.concepts.map((payload): TextbookFrozenEntry => ({
    entryKind: "concept",
    payload,
  })),
  ...CONCEPT_BLANK_BANK.ox.map((payload): TextbookFrozenEntry => ({
    entryKind: "ox",
    payload,
  })),
  ...CONCEPT_BLANK_BANK.apply.map((payload): TextbookFrozenEntry => ({
    entryKind: "apply",
    payload,
  })),
  ...CONCEPT_BLANK_BANK.figures.map((payload): TextbookFrozenEntry => ({
    entryKind: "figure",
    payload,
  })),
];
const entryById = new Map(
  allEntries.map((entry) => [`${entry.entryKind}:${entry.payload.id}`, entry]),
);
if (entryById.size !== allEntries.length)
  throw new Error("개념백지 항목 ID가 중복되었습니다.");

export function listConceptCatalog(
  options: {
    grade?: string;
    blankSectionKey?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  } = {},
) {
  const offset = options.cursor === undefined ? 0 : Number(options.cursor);
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new RangeError("잘못된 개념 목록 위치입니다.");
  const limit = Math.min(200, Math.max(1, options.limit ?? 100));
  const query = (options.query ?? "").trim().toLocaleLowerCase();
  const matching = allEntries.filter((entry) => {
    if (
      options.grade &&
      !entry.payload.section.startsWith(`${options.grade}::`)
    )
      return false;
    if (
      options.blankSectionKey &&
      entry.payload.section !== options.blankSectionKey
    )
      return false;
    const text =
      entry.entryKind === "concept"
        ? `${entry.payload.term} ${entry.payload.definition} ${entry.payload.bQuestion?.prompt ?? ""} ${entry.payload.clozeQuestion?.sentence ?? ""}`
        : entry.entryKind === "ox"
          ? entry.payload.statement
          : entry.payload.prompt;
    return (
      !query ||
      `${entry.payload.id} ${entry.payload.section} ${text}`
        .toLocaleLowerCase()
        .includes(query)
    );
  });
  return {
    entries: structuredClone(matching.slice(offset, offset + limit)),
    nextCursor:
      offset + limit < matching.length ? String(offset + limit) : null,
  };
}

function blankTarget(
  ref: TextbookConcept["blankItems"][number],
): TextbookFrozenEntry {
  const entry = entryById.get(`${ref.entryKind}:${ref.entryId}`);
  if (!entry || entry.payload.section !== ref.blankSectionKey)
    throw new Error(`개념백지 항목을 찾을 수 없습니다: ${ref.entryId}`);
  return entry;
}

export function resolveConceptTarget(target: TextbookConceptTarget) {
  const value =
    target.namespace === "explorer-card"
      ? definitionCards.find((card) => card.id === target.cardId)
      : target.namespace === "course-section"
        ? COURSE_SECTIONS.find(
            (section) => section.id === target.courseSectionId,
          )
        : curriculumGraph().units.find(
            (unit) => unit.id === target.graphUnitId,
          );
  if (!value) throw new Error("연결 대상 개념을 찾을 수 없습니다.");
  return value;
}

/** The existing bridge suggests a candidate; it never confirms equivalence or adds prerequisites. */
export function conceptCandidatesForSection(blankSectionKey: string) {
  const section = getBlankSection(blankSectionKey);
  if (!section) throw new Error("개념백지 소단원을 찾을 수 없습니다.");
  const course = COURSE_SECTIONS.find(
    (row) =>
      row.unit.grade === section.grade &&
      row.unit.chapter === section.chapter &&
      row.unit.section === section.title,
  );
  const cardId = explorerCardForSection(course?.id ?? section.title);
  const targets: TextbookConceptTarget[] = [];
  if (course)
    targets.push({ namespace: "course-section", courseSectionId: course.id });
  if (cardId) targets.push({ namespace: "explorer-card", cardId });
  return {
    targets,
    status: "candidate" as const,
    candidateRule: "bridge" as const,
  };
}

type Review = TextbookConcept["blankItems"][number]["review"];
export type ConceptReviewOptions = {
  prior?: TextbookConcept | null;
  reviewerId: string;
  now: string;
  confirmBlankEntryIds?: readonly string[];
  confirmLinkIds?: readonly string[];
};

/** The caller first authorizes a writable draft. Imported reviewer claims cannot grant approval. */
export function resolveReviewedConcept(
  input: TextbookConcept,
  options: ConceptReviewOptions,
): TextbookConcept {
  const concept = textbookConceptSchema.parse(input);
  const previous = options.prior;
  const sameBody =
    previous &&
    canonicalHash({
      body: previous.body,
      title: previous.title,
      kind: previous.kind,
    }) ===
      canonicalHash({
        body: concept.body,
        title: concept.title,
        kind: concept.kind,
      });
  const confirmBlank = new Set(options.confirmBlankEntryIds ?? []);
  const confirmLinks = new Set(options.confirmLinkIds ?? []);
  if (
    [...confirmBlank].some(
      (id) => !concept.blankItems.some((ref) => ref.entryId === id),
    ) ||
    [...confirmLinks].some(
      (id) => !concept.links.some((ref) => ref.linkId === id),
    )
  )
    throw new Error("확인할 연결이 원고에 없습니다.");
  function review(
    requested: Review,
    prior: Review | undefined,
    targetHash: string,
    confirm: boolean,
  ): Review {
    if (confirm)
      return {
        status: "confirmed",
        candidateRule: requested.candidateRule,
        targetHash,
        reviewedBy: options.reviewerId,
        reviewedAt: options.now,
      };
    if (requested.status === "rejected")
      return {
        status: "rejected",
        candidateRule: requested.candidateRule,
        targetHash,
        reviewedBy: options.reviewerId,
        reviewedAt: options.now,
      };
    if (
      sameBody &&
      requested.status === "confirmed" &&
      prior?.status === "confirmed" &&
      prior.targetHash === targetHash
    )
      return prior;
    return {
      status: "candidate",
      candidateRule: requested.candidateRule,
      targetHash,
      reviewedBy: null,
      reviewedAt: null,
    };
  }
  return textbookConceptSchema.parse({
    ...concept,
    frozen: null,
    blankItems: concept.blankItems.map((ref) => {
      const prior = previous?.blankItems.find(
        (row) =>
          row.blankSectionKey === ref.blankSectionKey &&
          row.entryId === ref.entryId &&
          row.entryKind === ref.entryKind,
      );
      return {
        ...ref,
        review: review(
          ref.review,
          prior?.review,
          canonicalHash(blankTarget(ref).payload),
          confirmBlank.has(ref.entryId),
        ),
      };
    }),
    links: concept.links.map((ref) => {
      const prior = previous?.links.find(
        (row) =>
          row.linkId === ref.linkId &&
          row.relation === ref.relation &&
          canonicalHash(row.target) === canonicalHash(ref.target),
      );
      return {
        ...ref,
        review: review(
          ref.review,
          prior?.review,
          canonicalHash(resolveConceptTarget(ref.target)),
          confirmLinks.has(ref.linkId),
        ),
      };
    }),
  });
}

function supports(entry: TextbookFrozenEntry, form: ConceptBlankForm): boolean {
  return entry.entryKind === "concept"
    ? form !== "figure"
    : entry.entryKind === "ox"
      ? form === "term"
      : entry.entryKind === "apply"
        ? form === "cloze"
        : form === "figure";
}

export function freezeTextbookConcept(
  input: TextbookConcept,
  selectedForms?: readonly ConceptBlankForm[],
): TextbookConcept {
  const concept = textbookConceptSchema.parse(input);
  if (
    concept.blankItems.some((ref) => ref.review.status === "candidate") ||
    concept.links.some((ref) => ref.review.status === "candidate")
  )
    throw new Error("개념 연결을 먼저 확인하거나 제외하세요.");
  const refs = concept.blankItems.filter(
    (ref) => ref.review.status === "confirmed",
  );
  if (!refs.length)
    throw new Error("발행 개념에 확인한 개념백지 항목이 없습니다.");
  const entries = refs.map((ref) => {
    const entry = blankTarget(ref);
    if (canonicalHash(entry.payload) !== ref.review.targetHash)
      throw new Error(`개념백지 내용이 확인 이후 바뀌었습니다: ${ref.entryId}`);
    return structuredClone(entry);
  });
  for (const link of concept.links.filter(
    (ref) => ref.review.status === "confirmed",
  )) {
    if (
      canonicalHash(resolveConceptTarget(link.target)) !==
      link.review.targetHash
    )
      throw new Error(`연결한 개념이 확인 이후 바뀌었습니다: ${link.linkId}`);
  }
  const forms: readonly ConceptBlankForm[] = selectedForms ??
    concept.blankForms ?? [
      "term",
      "cloze",
      ...(entries.some((entry) => entry.entryKind === "figure")
        ? ["figure" as const]
        : []),
    ];
  if (!forms.length || forms.length > 5 || new Set(forms).size !== forms.length)
    throw new Error("백지 형식을 중복 없이 선택하세요.");
  const sectionKeys = [
    ...new Set(entries.map((entry) => entry.payload.section)),
  ];
  const picks: ConceptBlankPick[] = [];
  for (const form of forms) {
    const completedSections = new Set<string>();
    let lastSection: string | null = null;
    for (const entry of entries) {
      if (!supports(entry, form)) continue;
      if (
        entry.entryKind === "concept" &&
        (form === "term" || form === "cloze") &&
        !conceptSupportsForm(entry.payload, form)
      )
        throw new Error(
          `이 개념은 선택한 백지 형식에서 제외되었습니다: ${entry.payload.id}. 해당 형식을 해제하거나 다른 항목을 선택하세요.`,
        );
      const section = entry.payload.section;
      if (section !== lastSection) {
        if (completedSections.has(section))
          throw new Error(
            "선택한 소단원 묶음이 떨어져 다시 등장합니다. 순서를 직접 정리하세요.",
          );
        if (lastSection) completedSections.add(lastSection);
        lastSection = section;
      }
      if (
        form === "recall" &&
        entry.entryKind === "concept" &&
        entry.payload.givenCase
      )
        throw new Error(
          `사례 항목은 완전 백지에 넣을 수 없습니다: ${entry.payload.id}`,
        );
      picks.push({
        blankSectionKey: section,
        entryKind: entry.entryKind,
        entryId: entry.payload.id,
        form,
        level: entry.payload.level,
      });
    }
  }
  const used = new Set(
    picks.map((pick) => `${pick.entryKind}:${pick.entryId}`),
  );
  if (
    entries.some((entry) => !used.has(`${entry.entryKind}:${entry.payload.id}`))
  )
    throw new Error("선택한 형식으로 표시할 수 없는 연결 항목이 있습니다.");
  // Existing constraints (including counts) apply to exact picks too. Never truncate excess.
  selectionFromPicks(picks);
  const frozenConcept = textbookConceptSchema.parse({
    ...concept,
    frozen: {
      contentHash: "0".repeat(64),
      parserVersion: EXACT_PARSER_VERSION,
      compositionVersion: EXACT_COMPOSITION_VERSION,
      mappingVersion: concept.mappingVersion,
      sections: resolveBlankSections(sectionKeys),
      entries,
      selection: picks,
      assetHashes: [],
    },
  });
  frozenConcept.frozen!.contentHash = conceptContentHash(frozenConcept);
  composeFrozenTextbookBlank(frozenConcept.frozen!);
  return frozenConcept;
}
