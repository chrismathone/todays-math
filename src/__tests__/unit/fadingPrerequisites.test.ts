// @vitest-environment node
// 선수 개념의 안내(`prerequisites.ts`) — 실제 은행 · 카드 자료 · 교육과정 연결도로 돈다. 적혀 있는 연결만 읽는지 본다.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fadingPrerequisiteAdvisorySchema } from "@/contracts/fadingDaily.contract";
import { BLANK_SECTIONS } from "@/lib/concept-blank/sections";
import { fadingCatalog } from "@/lib/fading/catalog";
import {
  bridgeSectionOfKey,
  cardEvidence,
  courseEvidence,
  fadingConceptsBySection,
  fadingPrerequisiteBasis,
  fadingPrerequisiteCoverage,
  sectionKeyOfBridgeSection,
  sectionKeysOfExplorerUnit,
} from "@/lib/fading/prerequisites";
import {
  explorerCardForSection,
  middleEquationBankSections,
} from "@/lib/math-explorers/curriculumBridge";
import {
  definitionCards,
  definitionUnits,
  type DefinitionProgress,
  type DefinitionRecord,
} from "@/lib/math-explorers/definition-cards";
import { curriculumGraph } from "@/lib/math-prerequisite/graph";
import {
  PILOT_CHECK_SECTION_IDS,
  PILOT_SECTION_IDS,
  sectionUnitId,
} from "@/lib/math-prerequisite/mapping";
import { emptyCourseState } from "@/lib/math-srs/courseAutomation";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

const TODAY = "2026-10-07";
const NOW = new Date("2026-10-07T03:00:00.000Z");
const all = fadingCatalog();
const bySection = fadingConceptsBySection(all);
const sectionOf = new Map(all.map((concept) => [concept.id, concept.section]));
const basisOf = (
  target: Parameters<typeof fadingPrerequisiteBasis>[0],
  extra: Partial<Parameters<typeof fadingPrerequisiteBasis>[1]> = {},
) =>
  fadingPrerequisiteBasis(target, {
    concepts: bySection,
    today: TODAY,
    now: NOW,
    ...extra,
  });
const cardById = new Map(definitionCards.map((card) => [card.id, card]));
const progress = (
  over: Partial<DefinitionProgress> = {},
): DefinitionProgress => ({
  level: 2,
  due: "2026-10-20",
  lastDate: "2026-10-05",
  attemptedAt: "2026-10-05",
  missed: 0,
  lastRecall: "remembered",
  ...over,
});
const record = (cards: DefinitionRecord["cards"]): DefinitionRecord => ({
  runs: 1,
  cards,
  history: [],
});

describe("같은 교육과정 열쇠로만 잇는다", () => {
  it("초등 코스 소단원 230개가 전부 은행 소단원 열쇠와 한 줄씩 맞는다 — 거꾸로 읽어도 같다", () => {
    const keys = new Set(BLANK_SECTIONS.map((section) => section.key));
    expect(COURSE_SECTIONS).toHaveLength(230);
    for (const section of COURSE_SECTIONS) {
      const key = sectionKeyOfBridgeSection(section.id)!;
      expect(keys.has(key), section.id).toBe(true);
      expect(bridgeSectionOfKey(key)).toBe(section.id);
      expect(key.startsWith(`초${section.grade}::`)).toBe(true);
    }
    expect(
      new Set(COURSE_SECTIONS.map((s) => sectionKeyOfBridgeSection(s.id))).size,
    ).toBe(230);
  });

  it("중학은 탐험이 쓰는 중1 일차방정식 소단원 열 개만 이어진다 — 그 밖은 없다", () => {
    for (const label of middleEquationBankSections) {
      const key = sectionKeyOfBridgeSection(label)!;
      expect(key).toBe(`중1::3. 방정식::${label}`);
      expect(bridgeSectionOfKey(key)).toBe(label);
      expect(bySection.has(key), label).toBe(true);
    }
    const middle = [...bySection.keys()].filter((key) => key.startsWith("중"));
    expect(middle.filter((key) => bridgeSectionOfKey(key))).toHaveLength(10);
    // 이름이 비슷해도(없는 이름 · 다른 학년) 잇지 않는다.
    expect(sectionKeyOfBridgeSection("일차방정식")).toBeNull();
    expect(sectionKeyOfBridgeSection("9-9-9-9")).toBeNull();
    expect(
      bridgeSectionOfKey("중2::1. 유리수와 순환소수::유리수와 순환소수"),
    ).toBeNull();
  });

  it("탐험 단원의 소단원은 적혀 있는 것만 — 문제은행이 없는 단원은 비어 있다", () => {
    expect(sectionKeysOfExplorerUnit("g5-fractions")).toEqual(
      COURSE_SECTIONS.filter((s) =>
        ["5-1-4", "5-1-5", "5-2-2"].includes(s.chapterId),
      ).map((s) => sectionKeyOfBridgeSection(s.id)),
    );
    expect(sectionKeysOfExplorerUnit("g7-equation")).toHaveLength(10);
    expect(sectionKeysOfExplorerUnit("g6-proportion").length).toBeGreaterThan(
      0,
    );
    expect(sectionKeysOfExplorerUnit("factors")).toEqual([]);
    expect(sectionKeysOfExplorerUnit("no-such-unit")).toEqual([]);
  });
});

describe("연결은 적혀 있는 것뿐이다", () => {
  it("모든 소단원에서 — 카드 연결은 카드 자료의 선수 카드이고, 연결도 연결은 연결도의 간선이다", () => {
    const edges = new Set(
      curriculumGraph()
        .edges.filter((edge) => edge.relation === "prerequisite")
        .map((edge) => `${edge.from}>${edge.to}`),
    );
    let cardLinks = 0;
    let graphLinks = 0;
    for (const key of bySection.keys()) {
      const basis = basisOf({ sectionKey: key })!;
      const bridge = bridgeSectionOfKey(key);
      // 목표의 카드는 `curriculumBridge` 가 그 소단원에 달아 둔 카드 하나뿐이다.
      const ownCard = bridge ? explorerCardForSection(bridge) : null;
      expect(basis.target.cardIds).toEqual(ownCard ? [ownCard] : []);
      expect(basis.target.graphUnitId).toBe(
        basis.target.courseSectionId
          ? sectionUnitId(basis.target.courseSectionId)
          : null,
      );
      for (const link of basis.links) {
        if (link.via === "card-link") {
          cardLinks += 1;
          expect(cardById.get(ownCard!)!.prerequisites).toContain(
            link.prerequisite.cardId,
          );
          expect(link.reason).toBeNull();
        } else {
          graphLinks += 1;
          expect(
            edges.has(
              `${link.prerequisite.graphUnitId}>${basis.target.graphUnitId}`,
            ),
          ).toBe(true);
          expect(link.reason).toBeTruthy();
          expect(link.prerequisite.cardId).toBeNull();
        }
        // 개념은 그 선수의 소단원에 있는 것만 — 이어진 소단원이 없으면 개념도 없다.
        expect(link.mapping).toBe(
          link.prerequisite.sectionKeys.length ? "exact" : "unmapped",
        );
        for (const id of link.conceptIds)
          expect(link.prerequisite.sectionKeys).toContain(sectionOf.get(id));
        if (link.mapping === "unmapped") expect(link.conceptIds).toEqual([]);
        // 목표 자신의 소단원을 제 선수로 내지 않는다.
        expect(link.prerequisite.sectionKeys).not.toContain(key);
      }
      // «오늘의 기억» 기록의 근거를 채우면 계약의 꼴이다.
      fadingPrerequisiteAdvisorySchema.parse({
        ...basis,
        links: basis.links.map((link) => ({
          ...link,
          evidence: {
            ...link.evidence,
            fading: {
              status: "unknown",
              total: 0,
              rated: 0,
              weak: 0,
              stale: 0,
            },
          },
        })),
      });
    }
    expect(cardLinks).toBeGreaterThan(0);
    expect(graphLinks).toBeGreaterThan(0);
  });

  it("탐험 단원이 목표면 그 단원 카드들의 선수 카드 — 같은 단원 안의 차례는 선수로 치지 않는다", () => {
    for (const unit of definitionUnits) {
      const basis = basisOf({ explorerUnitId: unit.id })!;
      const own = definitionCards.filter((card) => card.unit === unit.id);
      expect(basis.target.cardIds).toEqual(own.map((card) => card.id));
      expect(basis.target.courseSectionId).toBeNull();
      const authored = new Set(own.flatMap((card) => card.prerequisites ?? []));
      const linked = basis.links.map((link) => link.prerequisite.cardId!);
      expect(new Set(linked).size).toBe(linked.length);
      for (const id of linked) {
        expect(authored.has(id)).toBe(true);
        expect(own.some((card) => card.id === id)).toBe(false);
      }
      expect(basis.links.every((link) => link.via === "card-link")).toBe(true);
    }
    expect(basisOf({ explorerUnitId: "no-such-unit" })).toBeNull();
    expect(basisOf({ courseSectionId: "9-9-9-9" })).toBeNull();
  });

  it("시범 목표 — 연결도의 직접 선수 둘 가운데 확인된 매핑이 닿는 하나만 개념까지 이어진다", () => {
    const basis = basisOf({ courseSectionId: "5-2-2-1" })!;
    expect(basis.target).toMatchObject({
      courseSectionId: "5-2-2-1",
      explorerUnitId: "g5-fractions",
      graphUnitId: "E56-N04",
      sectionKey: "초5::2-2 분수의 곱셈::2-2-1 (분수)×(자연수)의 계산",
    });
    expect(basis.coverage).toEqual({
      status: "partial",
      cardLinks: 0,
      graphEdges: 2,
    });
    const [unmapped, mapped] = basis.links;
    // 매핑이 없는 단원은 이름만 싣는다 — 소단원도 개념도 지어내지 않는다.
    expect(unmapped).toMatchObject({
      via: "graph-edge",
      mapping: "unmapped",
      conceptIds: [],
      prerequisite: {
        graphUnitId: "E34-N04",
        courseSectionIds: [],
        sectionKeys: [],
      },
      evidence: { card: { status: "unknown" }, course: { status: "unknown" } },
    });
    expect(mapped).toMatchObject({
      via: "graph-edge",
      mapping: "exact",
      prerequisite: {
        graphUnitId: "E56-N03",
        courseSectionIds: [...PILOT_CHECK_SECTION_IDS],
      },
      // 코스 기록을 안 줬다 — 확인된 시범 소단원이라 «기록 없음»이다(«알 수 없음»이 아니다).
      evidence: {
        card: { status: "unknown" },
        course: { status: "unassessed" },
      },
    });
    expect(mapped!.conceptIds.length).toBeGreaterThan(0);
    expect(mapped!.conceptIds).toEqual(
      PILOT_CHECK_SECTION_IDS.flatMap((id) =>
        bySection.get(sectionKeyOfBridgeSection(id)!)!.map((c) => c.id),
      ),
    );
  });
});

describe("근거 — 원천마다 따로, 선수 개념 자신의 기록만", () => {
  it("개념 카드의 기록: 기록 없음 · 틀렸거나 도움을 받음 · 복습일이 됨 · 최근", () => {
    expect(cardEvidence(undefined, "g3-place", TODAY)).toBe("unassessed");
    expect(cardEvidence(record({}), "g3-place", TODAY)).toBe("unassessed");
    const of = (over: Partial<DefinitionProgress>) =>
      cardEvidence(record({ "g3-place": progress(over) }), "g3-place", TODAY);
    expect(of({})).toBe("recent");
    expect(of({ due: TODAY })).toBe("stale");
    expect(of({ due: "2026-09-30" })).toBe("stale");
    expect(of({ missed: 1 })).toBe("weak");
    expect(of({ lastRecall: "retry" })).toBe("weak");
    // 도움을 받아 맞힌 것은 스스로 떠올린 것이 아니다.
    expect(of({ lastRecall: "supported" })).toBe("weak");
    // 틀린 기록은 복습일보다 먼저 본다.
    expect(of({ missed: 2, due: "2026-09-30" })).toBe("weak");
  });

  it("문제은행 코스의 기록: 확인된 시범 소단원만 판정한다 — 그 밖은 «알 수 없음»", () => {
    const course = emptyCourseState();
    expect(courseEvidence(course, ["3-1-1-2"], NOW)).toBe("unknown");
    expect(courseEvidence(course, [], NOW)).toBe("unknown");
    expect(courseEvidence(null, ["3-1-1-2"], NOW)).toBe("unknown");
    expect(courseEvidence(course, [...PILOT_CHECK_SECTION_IDS], NOW)).toBe(
      "unassessed",
    );
    expect(courseEvidence(null, [...PILOT_CHECK_SECTION_IDS], NOW)).toBe(
      "unassessed",
    );
    // 시범 밖의 소단원이 섞여도 시범 소단원만 본다.
    expect(courseEvidence(course, ["3-1-1-2", "5-1-5-4"], NOW)).toBe(
      "unassessed",
    );
  });

  it("안내에는 카드의 기록이 그 선수 카드에만 실린다 — 다른 카드의 기록으로 옮기지 않는다", () => {
    // 받아올림(g3-carry)의 선수 카드는 자릿값(g3-place)이다(카드 자료에 적혀 있다).
    const target = { courseSectionId: "3-1-1-2" };
    expect(explorerCardForSection("3-1-1-2")).toBe("g3-carry");
    const plain = basisOf(target)!;
    expect(plain.links.map((l) => l.prerequisite.cardId)).toEqual(["g3-place"]);
    expect(plain.links[0]!.evidence.card.status).toBe("unassessed");
    // 목표 카드를 틀렸다고 선수 카드가 약하다고 보지 않는다.
    const missedTarget = basisOf(target, {
      record: record({ "g3-carry": progress({ missed: 3 }) }),
    })!;
    expect(missedTarget.links[0]!.evidence.card.status).toBe("unassessed");
    const weak = basisOf(target, {
      record: record({ "g3-place": progress({ lastRecall: "retry" }) }),
    })!;
    expect(weak.links[0]!.evidence.card.status).toBe("weak");
    // 자릿값 카드는 어느 소단원에도 달려 있지 않다 — 개념까지 이어지지 않는다고 그대로 말한다.
    expect(plain.links[0]).toMatchObject({
      mapping: "unmapped",
      conceptIds: [],
    });
    expect(plain.coverage.status).toBe("partial");
  });
});

describe("어디까지 적혀 있는가 — 센 값", () => {
  it("은행 소단원 360 가운데 선수 연결이 적혀 있는 것은 117, 없는 것은 243 이다", () => {
    // 이 수가 바뀌면 카드 자료 · `curriculumBridge` · 시범 매핑 · 은행의 소단원 가운데 하나가 바뀐 것이다 — 지어낸 연결이 늘지 않았는지 본다.
    expect(fadingPrerequisiteCoverage(all)).toEqual({
      sections: 360,
      // 초등 230 + 중1 일차방정식 10.
      withBridgeSection: 240,
      withCard: 114,
      withCardLinks: 113,
      // 시범 소단원 넷(목표 둘 · 확인 둘).
      withGraphUnit: PILOT_SECTION_IDS.length,
      withGraphLinks: 4,
      mapped: 51,
      partial: 66,
      unknown: 243,
    });
  });

  it("중2 · 중3 과 중1 의 나머지는 전부 «알 수 없음»이다 — 선수가 없다는 뜻이 아니다", () => {
    for (const key of bySection.keys()) {
      if (!key.startsWith("중") || bridgeSectionOfKey(key)) continue;
      const basis = basisOf({ sectionKey: key })!;
      expect(basis.links, key).toEqual([]);
      expect(basis.coverage).toEqual({
        status: "unknown",
        cardLinks: 0,
        graphEdges: 0,
      });
      expect(basis.target).toMatchObject({
        sectionKey: key,
        courseSectionId: null,
        explorerUnitId: null,
        graphUnitId: null,
        cardIds: [],
      });
    }
  });
});
