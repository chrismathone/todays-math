import canonicalGraph from "../../../math_graph_2022.json";
import {
  mathCurriculumGraphSchema,
  type MathCurriculumGraph,
  type MathGraphUnit,
  type MathGraphUnitEdge,
} from "@/contracts/mathPrerequisite.contract";

const EXCLUDED_COURSES = [
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
  "직업계고 전문교과별 전공 수학",
  "학교별 인정 과목",
];
const courseKey = (course: string) => course.replace(/\s/g, "");
const excluded = new Set(EXCLUDED_COURSES.map(courseKey));

function fail(message: string): never {
  throw new Error(`수학 교육과정 그래프 오류: ${message}`);
}

/** Validate authored structure; no topic prerequisites or student judgments are inferred. */
export function validateCurriculumGraph(input: unknown): MathCurriculumGraph {
  const graph = mathCurriculumGraphSchema.parse(input);
  const units = new Map(graph.units.map((unit) => [unit.id, unit]));
  if (units.size !== graph.units.length) fail("중복 단원 ID");
  if (units.size !== 100) fail("편집 단원은 정확히 100개여야 합니다.");
  if (
    EXCLUDED_COURSES.some(
      (course) =>
        !graph.scope.excluded.some(
          (value) => courseKey(value) === courseKey(course),
        ),
    )
  )
    fail("제외 과목 목록 누락");
  if (graph.scope.included.some((course) => excluded.has(courseKey(course))))
    fail("포함 범위에 제외 과목 유입");
  for (const unit of graph.units) {
    if (excluded.has(courseKey(unit.course))) fail("제외 과목 유입");
    if (
      (unit.id.startsWith("E") && unit.schoolLevel !== "elementary") ||
      (unit.id.startsWith("M") && unit.schoolLevel !== "middle") ||
      (unit.id.startsWith("H") && unit.schoolLevel !== "high")
    )
      fail("단원 ID와 학교급 불일치");
    if (
      unit.schoolLevel === "middle"
        ? unit.suggestedGrade !== Number(unit.id[1]) ||
          unit.gradeBand !== "중학교 1-3학년군"
        : unit.suggestedGrade !== null
    )
      fail("중학교 화면 배치 제안과 공식 학년군 구분 오류");
  }

  const topics = new Map(graph.topics.map((topic) => [topic.id, topic]));
  if (topics.size !== graph.topics.length) fail("중복 학습 요소 ID");
  const expectedTopicIds = graph.units.flatMap((unit) =>
    unit.topics.map((title, index) => {
      const order = index + 1;
      const id = `${unit.id}.t${String(order).padStart(2, "0")}`;
      const topic = topics.get(id);
      if (
        !topic ||
        topic.parentId !== unit.id ||
        topic.title !== title ||
        topic.order !== order ||
        topic.schoolLevel !== unit.schoolLevel ||
        topic.gradeBand !== unit.gradeBand ||
        topic.course !== unit.course ||
        topic.domain !== unit.domain
      )
        fail("학습 요소의 부모·표시 순서·메타데이터 불일치");
      return id;
    }),
  );
  if (
    expectedTopicIds.length !== graph.topics.length ||
    expectedTopicIds.some((id, index) => graph.topics[index].id !== id)
  )
    fail("학습 요소의 누락·추가·배열 순서 불일치");

  const edgeKeys = new Set<string>();
  const contained = new Set<string>();
  const prerequisites: MathGraphUnitEdge[] = [];
  let supportCount = 0;
  for (const edge of graph.edges) {
    const key = `${edge.relation}|${edge.from}|${edge.to}`;
    if (edgeKeys.has(key)) fail("중복 관계");
    edgeKeys.add(key);
    if (edge.relation === "contains") {
      const topic = topics.get(edge.to);
      if (!units.has(edge.from) || !topic || topic.parentId !== edge.from)
        fail("포함 관계의 끝점·부모 불일치");
      contained.add(edge.to);
    } else {
      if (!units.has(edge.from) || !units.has(edge.to))
        fail("없는 단원 관계 끝점");
      if (edge.from === edge.to) fail("자기 자신을 연결한 단원 관계");
      if (edge.relation === "prerequisite") prerequisites.push(edge);
      else supportCount++;
    }
  }
  if (contained.size !== topics.size) fail("학습 요소 포함 관계 누락");

  const indegree = new Map(graph.units.map((unit) => [unit.id, 0]));
  const successors = new Map(
    graph.units.map((unit) => [unit.id, [] as string[]]),
  );
  for (const edge of prerequisites) {
    indegree.set(edge.to, indegree.get(edge.to)! + 1);
    successors.get(edge.from)!.push(edge.to);
  }
  const order = graph.units
    .filter((unit) => indegree.get(unit.id) === 0)
    .map((unit) => unit.id);
  for (let index = 0; index < order.length; index++) {
    for (const successor of successors.get(order[index])!) {
      indegree.set(successor, indegree.get(successor)! - 1);
      if (indegree.get(successor) === 0) order.push(successor);
    }
  }
  if (order.length !== units.size) fail("선수 관계 순환");
  if (
    order.length !== graph.topologicalOrder.length ||
    order.some((id, index) => graph.topologicalOrder[index] !== id)
  )
    fail("위상 순서 불일치");

  const counts: MathCurriculumGraph["validation"] = {
    unitCount: units.size,
    topicCount: topics.size,
    prerequisiteEdgeCount: prerequisites.length,
    supportEdgeCount: supportCount,
    containmentEdgeCount: contained.size,
    duplicateUnitIdCount: 0,
    danglingUnitEdgeCount: 0,
    prerequisiteCycleCount: 0,
  };
  for (const key of Object.keys(counts) as (keyof typeof counts)[])
    if (graph.validation[key] !== counts[key]) fail(`집계 불일치: ${key}`);

  const courses = new Set(graph.units.map((unit) => unit.course));
  for (const relation of graph.courseRelations) {
    for (const entity of [relation.from, relation.to]) {
      const members = entity.split("+");
      if (members.some((course) => excluded.has(courseKey(course))))
        fail("과목 관계에 제외 과목 유입");
      if (
        entity !== "선택 수학 과목" &&
        members.some((course) => !courses.has(course))
      )
        fail("없는 과목 관계 끝점");
    }
  }
  return graph;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// Static, validated, immutable curriculum only; browser-safe (no Node/CLI imports).
const graph = freeze(validateCurriculumGraph(canonicalGraph));
const unitById = new Map(graph.units.map((unit) => [unit.id, unit]));
export const GRAPH_CONTENT_HASH: string = graph.graphContentHash;
export function curriculumGraph(): MathCurriculumGraph {
  return graph;
}

export interface MathGraphFilter {
  query?: string;
  schoolLevel?: MathGraphUnit["schoolLevel"];
  gradeBand?: string;
  course?: string;
  domain?: string;
}

/** Filters combine with AND; whitespace-separated search words also combine with AND. */
export function searchUnits(filter: MathGraphFilter = {}): MathGraphUnit[] {
  const words = (filter.query ?? "")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .split(/\s+/)
    .filter(Boolean);
  return graph.units.filter((unit) => {
    if (
      (filter.schoolLevel && unit.schoolLevel !== filter.schoolLevel) ||
      (filter.gradeBand && unit.gradeBand !== filter.gradeBand) ||
      (filter.course && unit.course !== filter.course) ||
      (filter.domain && unit.domain !== filter.domain)
    )
      return false;
    const text = [
      unit.id,
      unit.title,
      unit.schoolLevel,
      unit.gradeBand,
      unit.course,
      unit.courseGroup,
      unit.domain,
      ...unit.topics,
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    return words.every((word) => text.includes(word));
  });
}

export function graphFilterOptions() {
  return {
    schoolLevels: [...new Set(graph.units.map((unit) => unit.schoolLevel))],
    gradeBands: [...new Set(graph.units.map((unit) => unit.gradeBand))],
    courses: [...new Set(graph.units.map((unit) => unit.course))],
    domains: [...new Set(graph.units.map((unit) => unit.domain))],
  };
}

export interface MathGraphRelatedUnit {
  unit: MathGraphUnit;
  edge: MathGraphUnitEdge;
}
export interface MathGraphUnitDetail {
  unit: MathGraphUnit;
  topics: MathCurriculumGraph["topics"];
  directPrerequisites: MathGraphRelatedUnit[];
  successors: MathGraphRelatedUnit[];
  incomingSupport: MathGraphRelatedUnit[];
  outgoingSupport: MathGraphRelatedUnit[];
  courseRelations: MathCurriculumGraph["courseRelations"];
}

export function graphUnitDetail(id: string): MathGraphUnitDetail | null {
  const unit = unitById.get(id);
  if (!unit) return null;
  const related = (
    relation: MathGraphUnitEdge["relation"],
    incoming: boolean,
  ) =>
    graph.edges.flatMap((edge): MathGraphRelatedUnit[] => {
      if (edge.relation !== relation || (incoming ? edge.to : edge.from) !== id)
        return [];
      return [{ unit: unitById.get(incoming ? edge.from : edge.to)!, edge }];
    });
  const involvesCourse = (entity: string) =>
    entity.split("+").includes(unit.course) ||
    (entity === "선택 수학 과목" &&
      ["일반 선택", "진로 선택"].includes(unit.courseGroup));
  return {
    unit,
    topics: graph.topics.filter((topic) => topic.parentId === id),
    directPrerequisites: related("prerequisite", true),
    successors: related("prerequisite", false),
    incomingSupport: related("support", true),
    outgoingSupport: related("support", false),
    courseRelations: graph.courseRelations.filter(
      (edge) => involvesCourse(edge.from) || involvesCourse(edge.to),
    ),
  };
}

/** Teacher review candidates only. This function must not drive student auto-assignment. */
export function reviewCandidates(
  targetId: string,
  masteredIds: readonly string[] = [],
): MathGraphUnit[] {
  if (!unitById.has(targetId)) fail(`알 수 없는 목표 단원: ${targetId}`);
  for (const id of masteredIds)
    if (!unitById.has(id)) fail(`알 수 없는 숙달 단원: ${id}`);
  const mastered = new Set(masteredIds);
  if (mastered.has(targetId)) return [];
  const incoming = new Map(
    graph.units.map((unit) => [unit.id, [] as string[]]),
  );
  for (const edge of graph.edges)
    if (edge.relation === "prerequisite")
      incoming.get(edge.to)!.push(edge.from);
  const candidates = new Set<string>();
  function visit(id: string) {
    for (const parent of incoming.get(id)!) {
      if (mastered.has(parent) || candidates.has(parent)) continue;
      candidates.add(parent);
      visit(parent);
    }
  }
  visit(targetId);
  return graph.topologicalOrder
    .filter((id) => candidates.has(id))
    .map((id) => unitById.get(id)!);
}
