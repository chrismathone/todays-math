import { hashArithmeticLabel, mulberry32, shuffleArithmetic } from "./prng";

/** Stable constraint-cache/seed key; task identity is deliberately separate. */
export function canonicalArithmeticDomain(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(canonicalArithmeticDomain).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalArithmeticDomain(record[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export const arithmeticRoundOverlapLimit = (left: number, right: number) =>
  Math.floor(Math.min(left, right) / 5);

export type ArithmeticSelectionCandidate<T> = { key: string; value: T };
export type ArithmeticSelectionDomain<T> = {
  /** Stable domain identity, independent of the requested round. */
  id: string;
  /** A seeded iterator of the complete finite domain, without random retries. */
  candidates: () => Iterable<ArithmeticSelectionCandidate<T>>;
};
export type ArithmeticSelectionAllocation = { domain: string; count: number };

export class ArithmeticRoundSelectionError extends Error {
  constructor(
    readonly reason: "within-round" | "between-rounds",
    readonly allocation?: {
      round: number;
      domain: string;
      requested: number;
      available: number;
    },
  ) {
    super(reason);
  }
}

/** Lazy sparse Fisher-Yates, including domains larger than 2^32. */
export function* arithmeticShuffledIndexes(size: number, label: string) {
  const random = mulberry32(hashArithmeticLabel(label));
  const swaps = new Map<number, number>();
  for (let remaining = size; remaining > 0; remaining--) {
    const unit =
      (Math.floor(random() * 0x200000) * 0x100000000 +
        Math.floor(random() * 0x100000000)) /
      0x20000000000000;
    const position = Math.floor(unit * remaining);
    const index = swaps.get(position) ?? position;
    swaps.set(position, swaps.get(remaining - 1) ?? remaining - 1);
    swaps.delete(remaining - 1);
    yield index;
  }
}

/** Capacitated domain-to-identity matching. No slot-by-candidate edge graph:
 * ordinary 2,000-item domains need only 2,000 candidates and assignments. */
function distinctMatching(
  pools: readonly string[][],
  demands: readonly number[],
  failure?: (domain: number, available: number) => void,
) {
  const owner = new Map<string, number>();
  const assigned = pools.map(() => new Set<string>());
  function augment(domain: number, seen: Set<number>): boolean {
    if (seen.has(domain)) return false;
    seen.add(domain);
    // Prefer a free identity before moving another domain's existing assignment.
    for (const key of pools[domain]) {
      if (owner.has(key)) continue;
      owner.set(key, domain);
      assigned[domain].add(key);
      return true;
    }
    for (const key of pools[domain]) {
      const previous = owner.get(key)!;
      if (previous === domain || !augment(previous, seen)) continue;
      assigned[previous].delete(key);
      assigned[domain].add(key);
      owner.set(key, domain);
      return true;
    }
    return false;
  }
  const order = pools
    .map((_, i) => i)
    .sort(
      (a, b) => pools[a].length - demands[a] - (pools[b].length - demands[b]),
    );
  for (const domain of order)
    for (let n = 0; n < demands[domain]; n++)
      if (!augment(domain, new Set())) {
        failure?.(domain, assigned[domain].size);
        return null;
      }
  return assigned.map((keys) => [...keys]);
}

type Group = { round: number; domain: number; need: number; keys: string[] };

/** Exact finite fallback. Identities with identical domain eligibility and
 * identical round membership are interchangeable. Branch once per such class,
 * not once per permutation of its identities. Failed class-count states are
 * memoized; neither retries nor a time limit can produce a capacity verdict. */
function overlapMatching(
  pools: readonly string[][],
  groups: Group[],
  lengths: number[],
) {
  const eligibility = new Map<string, number[]>();
  pools.forEach((pool, d) =>
    pool.forEach((key) => {
      const list = eligibility.get(key) ?? [];
      list.push(d);
      eligibility.set(key, list);
    }),
  );
  const classes = new Map<string, string>();
  for (const [key, domains] of eligibility) classes.set(key, domains.join(","));
  const masks = new Map<string, number>();
  const shared = lengths.map(() => lengths.map(() => 0));
  const caps = lengths.map((a) =>
    lengths.map((b) => arithmeticRoundOverlapLimit(a, b)),
  );
  const result = groups.map(() => [] as string[]);

  // Necessary pigeonhole bounds for every subset of rounds. Connected domain
  // components are disjoint task universes, so their forced overlaps add.
  const parent = pools.map((_, i) => i);
  function root(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  for (const domains of eligibility.values())
    for (const d of domains) parent[root(d)] = root(domains[0]);
  const universes = new Map<number, Set<string>>();
  pools.forEach((pool, d) => {
    const component = root(d);
    const keys = universes.get(component) ?? new Set<string>();
    pool.forEach((key) => keys.add(key));
    universes.set(component, keys);
  });
  const demand = [...universes].map(([component, keys]) => ({
    size: keys.size,
    rounds: lengths.map((_, r) =>
      groups
        .filter((g) => g.round === r && root(g.domain) === component)
        .reduce((sum, g) => sum + g.need, 0),
    ),
  }));
  for (let subset = 1; subset < 2 ** lengths.length; subset++) {
    const rounds = lengths.map((_, i) => i).filter((i) => subset & (1 << i));
    let minimum = 0;
    let allowance = 0;
    for (const { size, rounds: counts } of demand) {
      if (rounds.some((r) => counts[r] > size)) return null;
      const total = rounds.reduce((sum, r) => sum + counts[r], 0);
      if (!size) {
        if (total) return null;
        else continue;
      }
      const q = Math.floor(total / size);
      minimum += (size * q * (q - 1)) / 2 + (total % size) * q;
    }
    rounds.forEach((r, i) =>
      rounds.slice(i + 1).forEach((s) => {
        allowance += caps[r][s];
      }),
    );
    if (minimum > allowance) return null;
  }

  function available(key: string, round: number) {
    const mask = masks.get(key) ?? 0;
    if (mask & (1 << round)) return false;
    for (let r = 0; r < lengths.length; r++)
      if (mask & (1 << r) && shared[round][r] >= caps[round][r]) return false;
    return true;
  }
  const failed = new Set<string>();
  function visit(left: number): boolean {
    if (!left) return true;
    let chosen = -1;
    let slack = Infinity;
    let options: string[] = [];
    for (const [i, group] of groups.entries()) {
      if (!group.need) continue;
      const keys = pools[group.domain].filter((key) =>
        available(key, group.round),
      );
      if (keys.length < group.need) return false;
      if (
        keys.length - group.need < slack ||
        (keys.length - group.need === slack &&
          group.need > (groups[chosen]?.need ?? 0))
      ) {
        slack = keys.length - group.need;
        chosen = i;
        options = keys;
      }
    }
    const group = groups[chosen];
    const representatives = new Map<string, string>();
    for (const key of options) {
      const signature = `${classes.get(key)}:${masks.get(key) ?? 0}`;
      if (!representatives.has(signature)) representatives.set(signature, key);
    }
    const choices = [...representatives.values()].sort((a, b) => {
      const score = (key: string) => {
        const mask = masks.get(key) ?? 0;
        return lengths.reduce(
          (sum, _, r) =>
            sum + (mask & (1 << r) ? 1 + shared[group.round][r] : 0),
          0,
        );
      };
      return score(a) - score(b);
    });
    let state: string | undefined;
    if (choices.length > 1) {
      const counts = new Map<string, number>();
      for (const [key, signature] of classes) {
        const bucket = `${signature}:${masks.get(key) ?? 0}`;
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
      }
      state = JSON.stringify([groups.map((g) => g.need), [...counts].sort()]);
      if (failed.has(state)) return false;
    }
    for (const key of choices) {
      const oldMask = masks.get(key) ?? 0;
      masks.set(key, oldMask | (1 << group.round));
      for (let r = 0; r < lengths.length; r++)
        if (oldMask & (1 << r)) {
          shared[group.round][r]++;
          shared[r][group.round]++;
        }
      group.need--;
      result[chosen].push(key);
      if (visit(left - 1)) return true;
      result[chosen].pop();
      group.need++;
      masks.set(key, oldMask);
      for (let r = 0; r < lengths.length; r++)
        if (oldMask & (1 << r)) {
          shared[group.round][r]--;
          shared[r][group.round]--;
        }
    }
    if (state) failed.add(state);
    return false;
  }
  return visit(lengths.reduce((a, b) => a + b, 0)) ? result : null;
}

/** New-writer policy only. Saved snapshot readers must not call this function.
 * Each candidate pool starts at its total demand. On a failed distinct match,
 * expand only deficient connected domain components to N distinct tasks
 * (N = total slots), or exhaust a small domain. Other components already admit
 * globally distinct assignments in their current, disjoint candidate pools.
 * N is complete: replace any out-of-pool task by a pool task unused by the other
 * N-1 slots. This preserves every constraint and can only reduce pair overlap. */
export function selectArithmeticRounds<T>(
  rounds: readonly (readonly ArithmeticSelectionAllocation[])[],
  domains: readonly ArithmeticSelectionDomain<T>[],
  seed: string,
): T[][][] {
  const indexes = new Map(domains.map((domain, i) => [domain.id, i]));
  const lengths = rounds.map((round) =>
    round.reduce((sum, a) => sum + a.count, 0),
  );
  const total = lengths.reduce((a, b) => a + b, 0);
  const demands = domains.map((domain) =>
    rounds
      .flat()
      .filter((a) => a.domain === domain.id)
      .reduce((sum, a) => sum + a.count, 0),
  );
  const iterators = domains.map((domain) =>
    domain.candidates()[Symbol.iterator](),
  );
  const candidates = domains.map(() => new Map<string, T>());
  function load(d: number, count: number) {
    while (candidates[d].size < count) {
      const next = iterators[d].next();
      if (next.done) break;
      if (!candidates[d].has(next.value.key))
        candidates[d].set(next.value.key, next.value.value);
    }
  }
  domains.forEach((_, d) => load(d, demands[d]));
  let pools = candidates.map((values) => [...values.keys()]);
  let distinct = distinctMatching(pools, demands);
  if (!distinct) {
    const expanded = new Set<number>();
    for (;;) {
      const parent = domains.map((_, d) => d);
      const root = (d: number): number => {
        while (parent[d] !== d) {
          parent[d] = parent[parent[d]];
          d = parent[d];
        }
        return d;
      };
      const first = new Map<string, number>();
      pools.forEach((pool, d) =>
        pool.forEach((key) => {
          const other = first.get(key);
          if (other === undefined) first.set(key, d);
          else parent[root(d)] = root(other);
        }),
      );
      const components = new Map<number, number[]>();
      domains.forEach((_, d) => {
        const key = root(d);
        const list = components.get(key) ?? [];
        list.push(d);
        components.set(key, list);
      });
      let changed = false;
      for (const component of components.values()) {
        if (
          distinctMatching(
            component.map((d) => pools[d]),
            component.map((d) => demands[d]),
          )
        )
          continue;
        for (const d of component) {
          if (expanded.has(d)) continue;
          expanded.add(d);
          load(d, total);
          changed = true;
        }
      }
      if (!changed) break;
      // Expansion can connect previously separate domains; recheck components.
      pools = candidates.map((values) => [...values.keys()]);
    }
    distinct = distinctMatching(pools, demands);
  }
  const groups: Group[] = [];
  rounds.forEach((round, r) => {
    const counts = new Map<number, number>();
    round.forEach((a) => {
      const d = indexes.get(a.domain)!;
      counts.set(d, (counts.get(d) ?? 0) + a.count);
    });
    for (const [domain, need] of counts)
      groups.push({ round: r, domain, need, keys: [] });
  });
  if (distinct) {
    const offsets = domains.map(() => 0);
    for (const g of groups) {
      g.keys = distinct[g.domain].slice(
        offsets[g.domain],
        offsets[g.domain] + g.need,
      );
      offsets[g.domain] += g.need;
    }
  } else {
    // Distinguish an impossible individual round from a between-round limit.
    for (let r = 0; r < rounds.length; r++) {
      const demand = domains.map(
        (_, d) =>
          groups.find((g) => g.round === r && g.domain === d)?.need ?? 0,
      );
      let detail: ArithmeticRoundSelectionError["allocation"];
      if (
        !distinctMatching(pools, demand, (d, available) => {
          detail = {
            round: r,
            domain: domains[d].id,
            requested: demand[d],
            available,
          };
        })
      )
        throw new ArithmeticRoundSelectionError("within-round", detail);
    }
    const selected = overlapMatching(pools, groups, lengths);
    if (!selected) throw new ArithmeticRoundSelectionError("between-rounds");
    groups.forEach((g, i) => {
      g.keys = selected[i];
    });
  }
  return rounds.map((round, r) => {
    const offsets = domains.map(() => 0);
    return round.map((allocation, a) => {
      const d = indexes.get(allocation.domain)!;
      const group = groups.find((g) => g.round === r && g.domain === d)!;
      const keys = group.keys.slice(offsets[d], offsets[d] + allocation.count);
      offsets[d] += allocation.count;
      return shuffleArithmetic(
        keys.map((key) => candidates[d].get(key)!),
        mulberry32(hashArithmeticLabel(`${seed}\norder\n${r}\n${a}`)),
      );
    });
  });
}
