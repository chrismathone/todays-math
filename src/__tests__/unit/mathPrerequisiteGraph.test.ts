// @vitest-environment node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import rawGraph from "../../../math_graph_2022.json";
import {
  mathCurriculumGraphSchema,
  type MathCurriculumGraph,
} from "@/contracts/mathPrerequisite.contract";
import {
  curriculumGraph,
  GRAPH_CONTENT_HASH,
  graphFilterOptions,
  graphUnitDetail,
  reviewCandidates,
  searchUnits,
  validateCurriculumGraph,
} from "@/lib/math-prerequisite/graph";

const cjs = createRequire(import.meta.url)(
  fileURLToPath(new URL("../../../math-graph.cjs", import.meta.url)),
) as {
  buildGraph: (overrides?: {
    unitData?: string;
    edgeData?: string;
  }) => MathCurriculumGraph;
  graphContentHash: (graph: object) => string;
  reviewCandidates: (
    target: string,
    mastered?: readonly string[],
    graph?: MathCurriculumGraph,
  ) => { id: string }[];
};
const clone = () => structuredClone(curriculumGraph());
const exclusions = [
  "경제 수학",
  "인공지능 수학",
  "직무 수학",
  "수학과 문화",
  "실용 통계",
  "수학과제 탐구",
  "전문 수학",
  "이산 수학",
  "고급 대수",
  "고급 미적분",
  "고급 기하",
];
const smallUnits = "E12-N01|수|세기\nE12-N02|덧셈|덧셈\nE12-N03|곱셈|곱셈";

describe("canonical math prerequisite graph", () => {
  it("agrees with the frozen strict contract and actual independent CLI build", () => {
    const graph = curriculumGraph();
    expect(mathCurriculumGraphSchema.parse(rawGraph)).toEqual(graph);
    expect(cjs.buildGraph()).toEqual(graph);
    expect(graph.validation).toEqual({
      unitCount: 100,
      topicCount: 356,
      prerequisiteEdgeCount: 186,
      supportEdgeCount: 2,
      containmentEdgeCount: 356,
      duplicateUnitIdCount: 0,
      danglingUnitEdgeCount: 0,
      prerequisiteCycleCount: 0,
    });
    expect(graph.edges).toHaveLength(544);
    expect(new Set(graph.units.map((unit) => unit.id)).size).toBe(100);
    expect(graph.topologicalOrder).toHaveLength(100);
  });

  it("retains exclusions, incomplete audit, unofficial unit inference and suggested middle grades", () => {
    const graph = curriculumGraph();
    for (const course of exclusions) {
      expect(graph.scope.excluded).toContain(course);
      expect(graph.units.some((unit) => unit.course === course)).toBe(false);
      expect(
        graph.courseRelations.some(
          (edge) => edge.from.includes(course) || edge.to.includes(course),
        ),
      ).toBe(false);
    }
    expect(graph.scope.excluded).toContain("직업계고 전문교과별 전공 수학");
    expect(graph.scope.excluded).toContain("학교별 인정 과목");
    for (const unit of graph.units) {
      expect(unit.needsCurriculumAudit).toBe(true);
      expect(unit.achievementStandardIds).toEqual([]);
      expect(unit.officialBasis).toBe("editorial_curriculum_summary");
      if (unit.schoolLevel === "middle") {
        expect(unit.gradeBand).toBe("중학교 1-3학년군");
        expect(unit.suggestedGrade).toBe(Number(unit.id[1]));
      }
    }
    for (const edge of graph.edges) {
      if (edge.relation !== "contains") {
        expect(edge.isOfficialEnrollmentRequirement).toBe(false);
        expect(edge.from).not.toContain(".t");
        expect(edge.to).not.toContain(".t");
      }
    }
    expect(graph.scope.topicPrerequisiteEdgesIncluded).toBe(false);
    expect(graphUnitDetail("M1-D01")?.unit.title).toBe("자료 정리와 대푯값");
  });

  it("hashes content and all metadata deterministically, ignoring only the hash property", () => {
    expect(GRAPH_CONTENT_HASH).toMatch(/^[a-f0-9]{64}$/);
    expect(cjs.graphContentHash(rawGraph)).toBe(GRAPH_CONTENT_HASH);
    expect(
      cjs.graphContentHash({ ...rawGraph, graphContentHash: "0".repeat(64) }),
    ).toBe(GRAPH_CONTENT_HASH);
    expect(
      cjs.graphContentHash(
        Object.fromEntries(Object.entries(rawGraph).reverse()),
      ),
    ).toBe(GRAPH_CONTENT_HASH);
    const changed = clone();
    changed.units[0].title += " (변경)";
    expect(cjs.graphContentHash(changed)).not.toBe(GRAPH_CONTENT_HASH);
    const metadata = clone();
    metadata.scope.note += " (변경)";
    expect(cjs.graphContentHash(metadata)).not.toBe(GRAPH_CONTENT_HASH);
    const course = clone();
    course.courseRelations[0].note += " (변경)";
    expect(cjs.graphContentHash(course)).not.toBe(GRAPH_CONTENT_HASH);
    expect(cjs.buildGraph()).toEqual(cjs.buildGraph());
  });

  it("keeps shared curriculum immutable while returning independent result lists", () => {
    expect(Object.isFrozen(curriculumGraph())).toBe(true);
    expect(Object.isFrozen(curriculumGraph().units[0].topics)).toBe(true);
    const rows = searchUnits();
    rows.pop();
    expect(searchUnits()).toHaveLength(100);
    const built = cjs.buildGraph();
    built.units[0].title = "changed by caller";
    expect(cjs.buildGraph().units[0].title).toBe("네 자리 이하의 수");
  });
});

describe("read-only graph lookup", () => {
  it("supports search across elements/IDs and combined school, grade, course and domain filters", () => {
    expect(
      searchUnits({ query: "  e56-n04  " }).map((unit) => unit.id),
    ).toEqual(["E56-N04"]);
    expect(
      searchUnits({
        query: "백분율",
        schoolLevel: "elementary",
        gradeBand: "초5-6",
        course: "수학",
        domain: "자료와 가능성",
      }).map((unit) => unit.id),
    ).toEqual(["E56-D01"]);
    expect(
      searchUnits({ query: "근의 공식", schoolLevel: "middle" }).map(
        (unit) => unit.id,
      ),
    ).toEqual(["M3-R02"]);
    expect(searchUnits({ course: "경제 수학" })).toEqual([]);
    expect(searchUnits({ query: "분수 곱셈", schoolLevel: "high" })).toEqual(
      [],
    );
    expect(searchUnits({ query: " " })).toHaveLength(100);
    const options = graphFilterOptions();
    expect(options.schoolLevels).toEqual(["elementary", "middle", "high"]);
    expect(options.gradeBands).toContain("중학교 1-3학년군");
    expect(options.courses).toContain("미적분Ⅱ");
    expect(options.courses).not.toContain("전문 수학");
  });

  it("returns ordered elements, incoming prerequisites, successors and both support directions with reasons", () => {
    const fractions = graphUnitDetail("E56-N04")!;
    expect(fractions.topics.map((topic) => topic.order)).toEqual([1, 2, 3]);
    expect(fractions.topics.map((topic) => topic.title)).toEqual(
      fractions.unit.topics,
    );
    expect(fractions.directPrerequisites.map(({ unit }) => unit.id)).toEqual([
      "E34-N04",
      "E56-N03",
    ]);
    expect(fractions.successors.map(({ unit }) => unit.id)).toContain("M1-N02");
    expect(
      fractions.directPrerequisites.every(
        ({ edge }) => edge.reason.length > 0 && edge.to === fractions.unit.id,
      ),
    ).toBe(true);
    const calculus = graphUnitDetail("H-CAL1-02")!;
    expect(calculus.incomingSupport.map(({ unit }) => unit.id)).toEqual([
      "H-ALG-02",
      "H-ALG-03",
    ]);
    expect(
      graphUnitDetail("H-ALG-02")?.outgoingSupport.map(({ unit }) => unit.id),
    ).toEqual(["H-CAL1-02"]);
    expect(
      calculus.courseRelations.some(
        (edge) => edge.from === "미적분Ⅰ" && edge.to === "미적분Ⅱ",
      ),
    ).toBe(true);
    expect(
      calculus.courseRelations.some((edge) => edge.to === "선택 수학 과목"),
    ).toBe(true);
    expect(graphUnitDetail("E12-N01")?.directPrerequisites).toEqual([]);
    expect(graphUnitDetail("missing")).toBeNull();
  });

  it("matches M3 target/mastered examples and stops one branch without inheriting mastery", () => {
    const all = reviewCandidates("M3-R02").map((unit) => unit.id);
    expect(all).toEqual(cjs.reviewCandidates("M3-R02").map((unit) => unit.id));
    expect(all).toEqual(
      expect.arrayContaining([
        "M3-R01",
        "M3-N01",
        "M1-R02",
        "M1-N02",
        "E56-N03",
      ]),
    );
    expect(all).not.toContain("M3-R02");
    const stopped = reviewCandidates("M3-R02", ["M1-N02"]).map(
      (unit) => unit.id,
    );
    expect(stopped).toEqual(
      cjs.reviewCandidates("M3-R02", ["M1-N02"]).map((unit) => unit.id),
    );
    expect(stopped).not.toContain("M1-N02");
    expect(stopped).not.toContain("E56-N03");
    expect(stopped).toContain("E12-N02"); // still reached through the separate expression branch
    expect(reviewCandidates("M3-R02", ["M3-R02"])).toEqual([]);
    expect(reviewCandidates("H-CAL1-02").map((unit) => unit.id)).not.toContain(
      "H-ALG-03",
    );
    expect(() => reviewCandidates("M3-R99")).toThrow(/알 수 없는 목표/);
    expect(() => reviewCandidates("M3-R02", ["M3-R99"])).toThrow(
      /알 수 없는 숙달/,
    );
  });
});

describe("standalone pure builder rejects corrupt authored inputs", () => {
  it.each([
    ["duplicate unit", `${smallUnits}\nE12-N01|다시|세기`, "", /중복 단원/],
    ["dangling", smallUnits, "E12-N02|E12-N99|P|이유", /존재하지 않는 ID/],
    ["self", smallUnits, "E12-N01|E12-N01|P|이유", /자기 자신/],
    [
      "cycle",
      smallUnits,
      "E12-N02|E12-N01|P|이유\nE12-N01|E12-N02|P|이유",
      /순환/,
    ],
    [
      "topic edge",
      smallUnits,
      "E12-N02|E12-N01.t01|P|이유",
      /존재하지 않는 ID/,
    ],
    [
      "duplicate edge",
      smallUnits,
      "E12-N02|E12-N01|P|이유\nE12-N02|E12-N01|P|이유",
      /중복 관계/,
    ],
    ["unknown relation", smallUnits, "E12-N02|E12-N01|T|이유", /관계 유형/],
    ["empty topic", "E12-N01|수|세기;", "", /빈 단원명 또는 학습 요소/],
    ["excluded ID", "H-ECO-01|경제 수학|경제", "", /알 수 없는 단원 ID/],
  ])("%s", (_label, unitData, edgeData, expected) => {
    expect(() =>
      cjs.buildGraph({
        unitData: unitData as string,
        edgeData: edgeData as string,
      }),
    ).toThrow(expected as RegExp);
  });

  it("traverses only explicit prerequisite unit edges and allows an alternative unmastered path", () => {
    const graph = cjs.buildGraph({
      unitData: smallUnits,
      edgeData: "E12-N02|E12-N01|P|이유\nE12-N03|E12-N02,E12-N01|P|이유",
    });
    expect(
      cjs
        .reviewCandidates("E12-N03", ["E12-N02"], graph)
        .map((unit) => unit.id),
    ).toEqual(["E12-N01"]);
    const support = cjs.buildGraph({
      unitData: smallUnits,
      edgeData: "E12-N03|E12-N01|S|도움",
    });
    expect(cjs.reviewCandidates("E12-N03", [], support)).toEqual([]);
    expect(support.validation.prerequisiteEdgeCount).toBe(0);
    expect(support.validation.containmentEdgeCount).toBe(3);
  });
});

describe("JSON loader validates actual structure, not declared zero counts", () => {
  const cases: [string, (graph: MathCurriculumGraph) => void, RegExp][] = [
    [
      "duplicate units",
      (g) => {
        g.units.push(structuredClone(g.units[0]));
      },
      /중복 단원/,
    ],
    [
      "not 100",
      (g) => {
        g.units.pop();
      },
      /100개/,
    ],
    [
      "duplicate topics",
      (g) => {
        g.topics.push(structuredClone(g.topics[0]));
      },
      /중복 학습 요소/,
    ],
    [
      "dangling edge",
      (g) => {
        g.edges[0].from = "E12-N99";
      },
      /없는 단원/,
    ],
    [
      "self edge",
      (g) => {
        g.edges[0].to = g.edges[0].from;
      },
      /자기 자신/,
    ],
    [
      "cycle",
      (g) => {
        g.edges.push({
          ...(g.edges[0] as Extract<
            MathCurriculumGraph["edges"][number],
            { relation: "prerequisite" | "support" }
          >),
          from: "E12-N02",
          to: "E12-N01",
        });
      },
      /순환/,
    ],
    [
      "duplicate edge",
      (g) => {
        g.edges.push(structuredClone(g.edges[0]));
      },
      /중복 관계/,
    ],
    [
      "topic order",
      (g) => {
        g.topics[0].order = 2;
      },
      /학습 요소/,
    ],
    [
      "topic array order",
      (g) => {
        g.topics.reverse();
      },
      /배열 순서/,
    ],
    [
      "wrong topic parent",
      (g) => {
        g.topics[0].parentId = "E12-N02";
      },
      /부모/,
    ],
    [
      "wrong topic title",
      (g) => {
        g.topics[0].title = "unmatched";
      },
      /학습 요소/,
    ],
    [
      "wrong contains parent",
      (g) => {
        g.edges.find((e) => e.relation === "contains")!.from = "E12-N02";
      },
      /포함 관계/,
    ],
    [
      "missing contains",
      (g) => {
        g.edges = g.edges.filter(
          (e) => e.relation !== "contains" || e.to !== "E12-N01.t01",
        );
      },
      /포함 관계 누락/,
    ],
    [
      "forged count",
      (g) => {
        g.validation.prerequisiteEdgeCount = 0;
      },
      /집계/,
    ],
    [
      "forged topo",
      (g) => {
        g.topologicalOrder.reverse();
      },
      /위상 순서/,
    ],
    [
      "excluded course",
      (g) => {
        g.units[0].course = "경제 수학";
      },
      /제외 과목 유입/,
    ],
    [
      "excluded relation",
      (g) => {
        g.courseRelations[0].from = "인공지능 수학";
      },
      /제외 과목 유입/,
    ],
    [
      "missing exclusion",
      (g) => {
        g.scope.excluded = g.scope.excluded.filter((c) => c !== "고급 기하");
      },
      /제외 과목 목록/,
    ],
    [
      "unknown course",
      (g) => {
        g.courseRelations[0].to = "없는 과목";
      },
      /없는 과목/,
    ],
    [
      "incorrect middle proposal",
      (g) => {
        g.units.find((u) => u.id === "M3-R02")!.suggestedGrade = 1;
      },
      /화면 배치/,
    ],
  ];
  it.each(cases)("rejects %s", (_label, mutate, expected) => {
    const graph = clone();
    mutate(graph);
    expect(() => validateCurriculumGraph(graph)).toThrow(expected);
  });

  it("strictly rejects implicit topic prerequisites, a completed audit and extra raw fields", () => {
    const topicEdge = clone();
    Object.assign(topicEdge.edges[0], { from: "E12-N01.t01" });
    expect(() => validateCurriculumGraph(topicEdge)).toThrow();
    expect(() =>
      validateCurriculumGraph({ ...clone(), graphVersion: "extra" }),
    ).toThrow();
    const audit = clone();
    Object.assign(audit.units[0], { needsCurriculumAudit: false });
    expect(() => validateCurriculumGraph(audit)).toThrow();
  });
});
