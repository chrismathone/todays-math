export type ArithmeticRegenerationChoice<T> = {
  key: string;
  item: T;
  cost: number;
};
type Edge = { to: number; reverse: number; capacity: number; cost: number };

/** Minimum-cost bipartite assignment: changing costs 0, retaining costs 1.
 * Reverse edges allow swaps/cycles and rescue overlapping constrained domains.
 * Unlike greedy selection this never reports exhaustion just because an earlier
 * selection took the only available alternative. At most 200 augmentations.
 */
function assign<T>(
  choices: ArithmeticRegenerationChoice<T>[][],
): { items: T[]; keys: string[]; cost: number } | null {
  const keys = new Map<string, number>();
  for (const row of choices)
    for (const choice of row)
      if (!keys.has(choice.key)) keys.set(choice.key, keys.size);
  const source = 0;
  const firstPrompt = 1 + choices.length;
  const sink = firstPrompt + keys.size;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  function edge(from: number, to: number, cost: number) {
    const forward: Edge = { to, reverse: graph[to].length, capacity: 1, cost };
    graph[to].push({
      to: from,
      reverse: graph[from].length,
      capacity: 0,
      cost: -cost,
    });
    graph[from].push(forward);
    return forward;
  }
  const options = choices.map((row, index) => {
    edge(source, index + 1, 0);
    return row.map((choice) => ({
      item: choice.item,
      key: choice.key,
      cost: choice.cost,
      edge: edge(index + 1, firstPrompt + keys.get(choice.key)!, choice.cost),
    }));
  });
  for (const index of keys.values()) edge(firstPrompt + index, sink, 0);
  for (let flow = 0; flow < choices.length; flow += 1) {
    const distance = Array<number>(graph.length).fill(Infinity);
    const previous = Array<{ node: number; edge: Edge } | undefined>(
      graph.length,
    );
    const queued = Array<boolean>(graph.length).fill(false);
    const queue = [source];
    distance[source] = 0;
    queued[source] = true;
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      queued[node] = false;
      for (const next of graph[node]) {
        if (
          next.capacity === 0 ||
          distance[next.to] <= distance[node] + next.cost
        )
          continue;
        distance[next.to] = distance[node] + next.cost;
        previous[next.to] = { node, edge: next };
        if (!queued[next.to]) {
          queue.push(next.to);
          queued[next.to] = true;
        }
      }
    }
    if (!previous[sink]) return null;
    for (let node = sink; node !== source;) {
      const step = previous[node]!;
      step.edge.capacity -= 1;
      graph[node][step.edge.reverse].capacity += 1;
      node = step.node;
    }
  }
  const selected = options.map((row) =>
    row.find((choice) => choice.edge.capacity === 0)!,
  );
  return {
    items: selected.map((choice) => choice.item),
    keys: selected.map((choice) => choice.key),
    cost: selected.reduce((sum, choice) => sum + choice.cost, 0),
  };
}

/** Min-cost matching is the fast relaxation (0 = changed, 1 = retained).
 * If its optimum violates a fixed-round budget b, every valid assignment must
 * omit at least one of b+1 offending identities. Branch on those exclusions.
 * This is complete and maximizes changes; failed/visited bans are memoized.
 * No retry cap converts a feasible assignment into a capacity error. */
export function assignArithmeticRegeneration<T>(
  choices: ArithmeticRegenerationChoice<T>[][],
  constraints: readonly { keys: ReadonlySet<string>; allowance: number }[],
): T[] | null {
  let best: ReturnType<typeof assign<T>> = null;
  const seen = new Set<string>();
  const prohibited = new Set<string>();
  for (const constraint of constraints)
    if (constraint.allowance === 0)
      for (const key of constraint.keys) prohibited.add(key);
  function visit(banned: Set<string>) {
    const state = JSON.stringify([...banned].sort());
    if (seen.has(state)) return;
    seen.add(state);
    const selected = assign(
      choices.map((row) => row.filter((choice) => !banned.has(choice.key))),
    );
    if (!selected || (best && selected.cost >= best.cost)) return;
    const violation = constraints
      .map((constraint) => ({
        allowance: constraint.allowance,
        keys: selected.keys.filter((key) => constraint.keys.has(key)),
      }))
      .filter((constraint) => constraint.keys.length > constraint.allowance)
      .sort((a, b) => a.allowance - b.allowance)[0];
    if (!violation) {
      best = selected;
      return;
    }
    for (const key of violation.keys.slice(0, violation.allowance + 1)) {
      visit(new Set([...banned, key]));
      if (best?.cost === 0) return;
    }
  }
  visit(prohibited);
  return (best as ReturnType<typeof assign<T>>)?.items ?? null;
}
