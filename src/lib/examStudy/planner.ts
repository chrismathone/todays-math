import type {
  ExamStudyFamily,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";

export interface StudyQuota {
  id: StudyRequirementId;
  weight: number;
  requested: number;
}

/** Every selected demand gets a minimum opportunity, even when count is too small. */
export function allocateStudyQuotas(
  requirements: readonly { id: StudyRequirementId; weight: number }[],
  count: number,
): StudyQuota[] {
  const quotas = requirements.map((r) => ({ ...r, requested: 1 }));
  const remaining = Math.max(0, count - quotas.length);
  const total = quotas.reduce((s, r) => s + r.weight, 0);
  if (!total) return quotas;
  let spent = 0;
  const shares = quotas.map((r, i) => {
    const exact = (remaining * r.weight) / total;
    const integral = Math.floor(exact);
    r.requested += integral;
    spent += integral;
    return { i, remainder: exact - integral };
  });
  shares.sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let i = 0; i < remaining - spent; i++) quotas[shares[i]!.i]!.requested++;
  return quotas;
}

export interface PlanningCandidate {
  family: ExamStudyFamily;
  full: readonly StudyRequirementId[];
  digest: string;
  key: string;
}

interface Edge {
  to: number;
  reverse: number;
  capacity: number;
  original: number;
}

/**
 * Integral max flow plans ALL demand quotas together. Augmenting paths can move a
 * flexible family to another demand instead of starving a specialized family.
 * Candidate identities have already been conservatively deduplicated.
 */
export function planFullCandidates<T extends PlanningCandidate>(
  pool: readonly T[],
  quotas: readonly StudyQuota[],
  count: number,
  familyCap: (family: ExamStudyFamily) => number,
): T[] {
  if (!quotas.length || !pool.length) return [];
  const families = [
    ...new Map(pool.map((c) => [c.family.id, c.family])).values(),
  ];
  const source = 0,
    familyStart = 1,
    candidateStart = familyStart + families.length,
    requirementStart = candidateStart + pool.length,
    sink = requirementStart + quotas.length;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  const add = (from: number, to: number, capacity: number): Edge => {
    const edge = {
      to,
      reverse: graph[to]!.length,
      capacity,
      original: capacity,
    };
    graph[from]!.push(edge);
    graph[to]!.push({
      to: from,
      reverse: graph[from]!.length - 1,
      capacity: 0,
      original: 0,
    });
    return edge;
  };
  const familyIndex = new Map(families.map((f, i) => [f.id, familyStart + i]));
  families.forEach((f) => add(source, familyIndex.get(f.id)!, familyCap(f)));
  const chosenEdges: Edge[] = [];
  pool.forEach((candidate, i) => {
    chosenEdges.push(
      add(familyIndex.get(candidate.family.id)!, candidateStart + i, 1),
    );
    quotas.forEach((quota, j) => {
      if (candidate.full.includes(quota.id))
        add(candidateStart + i, requirementStart + j, 1);
    });
  });
  quotas.forEach((q, j) => add(requirementStart + j, sink, q.requested));
  let flow = 0;
  while (flow < count) {
    const previous: ({ node: number; edge: number } | undefined)[] = Array(
      graph.length,
    );
    const queue = [source];
    const visited = new Set([source]);
    for (let at = 0; at < queue.length && !visited.has(sink); at++) {
      const node = queue[at]!;
      graph[node]!.forEach((edge, i) => {
        if (edge.capacity > 0 && !visited.has(edge.to)) {
          visited.add(edge.to);
          previous[edge.to] = { node, edge: i };
          queue.push(edge.to);
        }
      });
    }
    if (!previous[sink]) break;
    for (let node = sink; node !== source;) {
      const parent = previous[node]!;
      const edge = graph[parent.node]![parent.edge]!;
      edge.capacity--;
      graph[node]![edge.reverse]!.capacity++;
      node = parent.node;
    }
    flow++;
  }
  return pool.filter((_, i) => chosenEdges[i]!.capacity === 0);
}
