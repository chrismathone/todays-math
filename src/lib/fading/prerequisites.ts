import { CONCEPT_BLANK_LEVELS } from "@/contracts/conceptBlank.contract";
import type {
  FadingEvidenceStatus,
  FadingPrerequisiteAdvisory,
} from "@/contracts/fadingDaily.contract";
import { BLANK_SECTIONS, sectionKeyOf } from "@/lib/concept-blank/sections";
import {
  bankSectionsForExplorerUnit,
  explorerCardForSection,
  explorerUnitForSection,
  middleEquationBankSections,
} from "@/lib/math-explorers/curriculumBridge";
import {
  definitionCards,
  definitionEffectiveDue,
  definitionUnits,
  type DefinitionRecord,
} from "@/lib/math-explorers/definition-cards";
import { sectionEvidence } from "@/lib/math-prerequisite/evidence";
import { graphUnitDetail } from "@/lib/math-prerequisite/graph";
import { mappingInfo, sectionUnitId } from "@/lib/math-prerequisite/mapping";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import {
  COURSE_SECTIONS,
  getCourseSection,
} from "@/lib/math-srs/elementary/catalog";
import type { FadingConcept } from "./concepts";
import type { FadingPrerequisiteBasis } from "./explorerDaily";

/**
 * 선수 개념의 안내 — **적혀 있는 연결만** 읽는다. 새로 잇는 것이 없다.
 *
 * 쓰는 연결은 넷이고 전부 사람이 적어 둔 것이다:
 *   1. 코스 소단원 ↔ 은행 소단원 열쇠 — 같은 교육과정 시드의 같은 줄(`COURSE_SECTIONS` 의 `unit`). 글자를 견주어 찾는 것이 아니다.
 *   2. 소단원 → 개념 카드(`explorerCardForSection`) · 탐험 단원 → 소단원(`bankSectionsForExplorerUnit`) — `curriculumBridge.ts`.
 *   3. 개념 카드 → 선수 카드(`prerequisites`) — 카드 자료에 적힌 권고다. 진단이 아니다.
 *   4. 교육과정 연결도의 단원 간선 — 확인된 시범 매핑(`math-prerequisite/mapping.ts`)이 닿는 단원만.
 *
 * 🔴 제목이 비슷하다고 잇지 않는다. 이어진 것이 없으면 `unmapped` · `unknown` 으로 남긴다 — 선수가 없다는 뜻이 아니다.
 * 🔴 이름 공간(개념 카드 230장 · 은행 개념 2,040묶음 · 코스 소단원 · 연결도 단원)을 서로 바꾸지 않는다 — 소단원의 열쇠로만 만난다.
 *    카드의 기록을 개념의 기록으로 옮기지 않고, 근거는 원천마다 따로 싣는다.
 * 🔴 근거는 선수 개념 **자신의** 기록이다. 오늘 배우는 것에서 틀렸다고 선수가 빠졌다고 보지 않는다.
 */

/** 무엇의 선수를 묻는가 — 코스 소단원(초등 문제은행 날) · 탐험 단원(개념 날) · 은행 소단원 열쇠(«오늘의 기억»만 쓸 때). */
export type FadingPrerequisiteTarget =
  | { courseSectionId: string }
  | { explorerUnitId: string }
  | { sectionKey: string };

const courseKey = (id: string): string | null => {
  const section = getCourseSection(id);
  return section
    ? sectionKeyOf(
        section.unit.grade,
        section.unit.chapter,
        section.unit.section,
      )
    : null;
};
const courseByKey = new Map(
  COURSE_SECTIONS.map((section) => [courseKey(section.id)!, section.id]),
);
// 중1 일차방정식의 은행 소단원 — 탐험이 쓰는 이름표가 같은 시드의 차시 이름 그대로일 때만(중1 안에서 하나뿐인 이름).
const middleLabels = new Set<string>(middleEquationBankSections);
const middleKeyByLabel = new Map<string, string>();
for (const section of BLANK_SECTIONS)
  if (section.grade === "중1" && middleLabels.has(section.title)) {
    if (middleKeyByLabel.has(section.title))
      middleKeyByLabel.set(section.title, "");
    else middleKeyByLabel.set(section.title, section.key);
  }
const middleLabelByKey = new Map(
  [...middleKeyByLabel]
    .filter(([, key]) => key)
    .map(([label, key]) => [key, label]),
);

/** 탐험이 쓰는 소단원 이름(초등은 코스 소단원 id · 중1 은 이름표) → 은행 소단원 열쇠. 이어진 것이 없으면 `null`. */
export function sectionKeyOfBridgeSection(sectionId: string): string | null {
  return courseKey(sectionId) ?? (middleKeyByLabel.get(sectionId) || null);
}
/** 은행 소단원 열쇠 → 탐험이 쓰는 소단원 이름. */
export function bridgeSectionOfKey(key: string): string | null {
  return courseByKey.get(key) ?? middleLabelByKey.get(key) ?? null;
}

const bridgeSections = [
  ...COURSE_SECTIONS.map((section) => section.id),
  ...middleEquationBankSections,
];
/** 개념 카드 → 그 카드가 달린 소단원들(`explorerCardForSection` 을 거꾸로 읽은 것 — 차례는 교육과정 차례). */
const cardSections = new Map<string, string[]>();
for (const sectionId of bridgeSections) {
  const cardId = explorerCardForSection(sectionId);
  if (cardId)
    cardSections.set(cardId, [...(cardSections.get(cardId) ?? []), sectionId]);
}
const cardById = new Map(definitionCards.map((card) => [card.id, card]));

/** 개념 카드(옛 탐험)의 기록이 말하는 것 — 틀렸거나 도움을 받았으면 `weak`(도움을 받은 것은 스스로 떠올린 것이 아니다). */
export function cardEvidence(
  record: DefinitionRecord | undefined,
  cardId: string,
  today: string,
): FadingEvidenceStatus {
  const progress = record?.cards[cardId];
  if (!progress) return "unassessed";
  if (
    progress.missed > 0 ||
    progress.lastRecall === "retry" ||
    progress.lastRecall === "supported"
  )
    return "weak";
  return definitionEffectiveDue(cardId, progress) <= today ? "stale" : "recent";
}

/**
 * 문제은행 코스의 기록이 말하는 것 — 확인된 시범 소단원만 판정한다(`sectionEvidence` 의 규칙 그대로). 그 밖의 소단원은 `unknown`.
 * 소단원이 여럿이면: 하나라도 최근에 못 넘었으면 `weak`, 아니면 하나라도 오래됐으면 `stale`, 전부 최근에 넘었으면 `recent`,
 * 전부 기록이 없으면 `unassessed`, 섞였거나 판정을 미뤘으면 `unknown`.
 */
export function courseEvidence(
  course: StoredCourse | null | undefined,
  courseSectionIds: readonly string[],
  now: Date,
): FadingEvidenceStatus {
  const pilot = courseSectionIds.filter((id) => sectionUnitId(id) !== null);
  if (!pilot.length) return "unknown";
  if (!course) return "unassessed";
  const statuses = pilot.map((id) => sectionEvidence(course, id, now).status);
  if (statuses.includes("not_passed_recent")) return "weak";
  if (statuses.includes("stale")) return "stale";
  if (statuses.every((status) => status === "passed_recent")) return "recent";
  if (statuses.every((status) => status === "unassessed")) return "unassessed";
  return "unknown";
}

type Resolved = FadingPrerequisiteAdvisory["target"];

function resolve(target: FadingPrerequisiteTarget): Resolved | null {
  if ("explorerUnitId" in target) {
    const unit = definitionUnits.find((u) => u.id === target.explorerUnitId);
    if (!unit) return null;
    return {
      title: unit.title,
      explorerUnitId: unit.id,
      courseSectionId: null,
      sectionKey: null,
      graphUnitId: null,
      cardIds: definitionCards
        .filter((card) => card.unit === unit.id)
        .map((card) => card.id),
    };
  }
  const bridge =
    "courseSectionId" in target
      ? target.courseSectionId
      : bridgeSectionOfKey(target.sectionKey);
  const sectionKey =
    "sectionKey" in target
      ? target.sectionKey
      : sectionKeyOfBridgeSection(target.courseSectionId);
  const course = bridge ? getCourseSection(bridge) : undefined;
  if ("courseSectionId" in target && !course) return null;
  const cardId = bridge ? explorerCardForSection(bridge) : null;
  return {
    title: course?.title ?? sectionKey?.split("::")[2] ?? "",
    explorerUnitId: bridge ? explorerUnitForSection(bridge) : null,
    courseSectionId: course?.id ?? null,
    sectionKey,
    graphUnitId: course ? sectionUnitId(course.id) : null,
    cardIds: cardId ? [cardId] : [],
  };
}

const levelOrder = (concept: FadingConcept) =>
  CONCEPT_BLANK_LEVELS.indexOf(concept.level);

/** 은행 소단원 열쇠 → 그 소단원의 개념(하 → 중 → 상 · 은행 차례). */
export function fadingConceptsBySection(
  concepts: Iterable<FadingConcept>,
): Map<string, FadingConcept[]> {
  const bySection = new Map<string, FadingConcept[]>();
  for (const concept of concepts)
    bySection.set(concept.section, [
      ...(bySection.get(concept.section) ?? []),
      concept,
    ]);
  for (const list of bySection.values())
    list.sort((a, b) => levelOrder(a) - levelOrder(b) || a.ordinal - b.ordinal);
  return bySection;
}

/**
 * 목표의 선수 연결과, 선수마다의 근거(개념 카드 · 문제은행 코스). «오늘의 기억» 기록의 근거는 계획을 지을 때 채운다(`buildFadingDailyPlan`).
 * 목표를 알아볼 수 없으면 `null`. 적혀 있는 연결이 없으면 `links` 가 비고 `coverage.status` 가 `unknown` 이다.
 * 깊이는 하나다 — 선수의 선수로 내려가지 않는다(`PREREQUISITE_POLICY.depth`).
 */
export function fadingPrerequisiteBasis(
  target: FadingPrerequisiteTarget,
  input: {
    /** 은행의 개념 — 여러 번 부를 때는 `fadingConceptsBySection` 으로 한 번 묶은 것을 줘도 된다. */
    concepts: Iterable<FadingConcept> | ReadonlyMap<string, FadingConcept[]>;
    today: string;
    now: Date;
    /** 개념 카드(옛 탐험)의 기록. */
    record?: DefinitionRecord;
    /** 문제은행 코스의 기록. */
    course?: StoredCourse | null;
  },
): FadingPrerequisiteBasis | null {
  const resolved = resolve(target);
  if (!resolved) return null;
  const bySection =
    input.concepts instanceof Map
      ? (input.concepts as ReadonlyMap<string, FadingConcept[]>)
      : fadingConceptsBySection(input.concepts as Iterable<FadingConcept>);
  const conceptIdsOf = (keys: readonly string[]) =>
    keys.flatMap((key) => (bySection.get(key) ?? []).map((c) => c.id));
  const links: FadingPrerequisiteBasis["links"] = [];

  // 개념 카드에 적힌 선수 카드 — 목표 카드끼리의 연결(같은 단원 안의 차례)은 선수로 치지 않는다.
  const own = new Set(resolved.cardIds);
  const seen = new Set<string>();
  for (const cardId of resolved.cardIds)
    for (const prerequisiteId of cardById.get(cardId)?.prerequisites ?? []) {
      const card = cardById.get(prerequisiteId);
      if (!card || own.has(card.id) || seen.has(card.id)) continue;
      seen.add(card.id);
      const sections = cardSections.get(card.id) ?? [];
      const sectionKeys = sections
        .map(sectionKeyOfBridgeSection)
        .filter((key): key is string => !!key && key !== resolved.sectionKey);
      const courseSectionIds = sections.filter((id) => !!getCourseSection(id));
      links.push({
        via: "card-link",
        reason: null,
        prerequisite: {
          title: card.name,
          cardId: card.id,
          graphUnitId: null,
          courseSectionIds,
          sectionKeys,
        },
        mapping: sectionKeys.length ? "exact" : "unmapped",
        evidence: {
          card: { status: cardEvidence(input.record, card.id, input.today) },
          course: {
            status: courseEvidence(input.course, courseSectionIds, input.now),
          },
        },
        conceptIds: conceptIdsOf(sectionKeys),
      });
    }

  // 연결도의 단원 간선 — 목표가 확인된 매핑이 닿는 단원일 때만, 직접 선수만.
  const detail = resolved.graphUnitId
    ? graphUnitDetail(resolved.graphUnitId)
    : null;
  for (const { unit, edge } of detail?.directPrerequisites ?? []) {
    const mapping = mappingInfo(unit.id);
    const courseSectionIds =
      mapping.mappingStatus === "verified" ? [...mapping.sectionIds] : [];
    const sectionKeys = courseSectionIds
      .map(sectionKeyOfBridgeSection)
      .filter((key): key is string => !!key);
    links.push({
      via: "graph-edge",
      reason: edge.reason,
      prerequisite: {
        title: unit.title,
        cardId: null,
        graphUnitId: unit.id,
        courseSectionIds,
        sectionKeys,
      },
      mapping: sectionKeys.length ? "exact" : "unmapped",
      evidence: {
        card: { status: "unknown" },
        course: {
          status: courseEvidence(input.course, courseSectionIds, input.now),
        },
      },
      conceptIds: conceptIdsOf(sectionKeys),
    });
  }

  const mapped = links.filter((link) => link.mapping === "exact").length;
  return {
    target: resolved,
    coverage: {
      status: !links.length
        ? "unknown"
        : mapped === links.length
          ? "mapped"
          : "partial",
      cardLinks: links.filter((link) => link.via === "card-link").length,
      graphEdges: links.filter((link) => link.via === "graph-edge").length,
    },
    links,
  };
}

/** 탐험 단원의 은행 소단원 열쇠들(적혀 있는 차례) — 오늘 진도의 새 개념을 찾을 때 쓴다. 이어진 것이 없으면 비어 있다. */
export function sectionKeysOfExplorerUnit(unitId: string): string[] {
  return bankSectionsForExplorerUnit(unitId)
    .map(sectionKeyOfBridgeSection)
    .filter((key): key is string => !!key);
}

/**
 * 은행 소단원 전체에서 선수 연결이 어디까지 적혀 있는가 — 센 값이다(지어낸 연결이 없다는 것을 숫자로 보인다).
 * `unknown` 은 적혀 있는 선수 연결이 하나도 없는 소단원의 수다.
 */
export function fadingPrerequisiteCoverage(concepts: Iterable<FadingConcept>) {
  const bySection = fadingConceptsBySection(concepts);
  const keys = [...bySection.keys()];
  const today = "1970-01-01";
  const now = new Date(0);
  const counts = {
    sections: keys.length,
    withBridgeSection: 0,
    withCard: 0,
    withCardLinks: 0,
    withGraphUnit: 0,
    withGraphLinks: 0,
    mapped: 0,
    partial: 0,
    unknown: 0,
  };
  for (const key of keys) {
    if (bridgeSectionOfKey(key)) counts.withBridgeSection += 1;
    const basis = fadingPrerequisiteBasis(
      { sectionKey: key },
      { concepts: bySection, today, now },
    )!;
    if (basis.target.cardIds.length) counts.withCard += 1;
    if (basis.target.graphUnitId) counts.withGraphUnit += 1;
    if (basis.coverage.cardLinks) counts.withCardLinks += 1;
    if (basis.coverage.graphEdges) counts.withGraphLinks += 1;
    counts[basis.coverage.status] += 1;
  }
  return counts;
}
