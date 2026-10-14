import { z } from "zod";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ROUNDS,
  arithmeticSeedSchema,
} from "@/contracts/arithmetic.contract";
import type {
  ArithmeticSheetItem,
  ArithmeticSheetPayload,
} from "@/contracts/arithmeticSheet.contract";
import {
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
  type ArithmeticV2SheetItem,
  type ArithmeticV2SheetPayload,
} from "@/contracts/arithmeticV2.contract";
import { arithmeticDomainPairs } from "@/lib/arithmetic/domain";
import { parseArithmeticSelection } from "@/lib/arithmetic/constraints";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";
import { hashArithmeticLabel, mulberry32 } from "@/lib/arithmetic/prng";
import { renderArithmeticPrompt } from "@/lib/arithmetic/render";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import { verifyArithmeticSpec } from "@/lib/arithmetic/verify";
import { ArithmeticV2EngineError } from "@/lib/arithmetic-v2/errors";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2/registry";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";
import { arithmeticGeometrySnapshotForPrompts } from "@/lib/arithmetic-v2/geometry";

/** Orders are saved, one-based item.order values, never review display indexes. */
export type ArithmeticRegenerationTarget = { round: number; orders: number[] };
export type ArithmeticRegenerationResult<T> = {
  sheet: T;
  round: number;
  changedOrders: number[];
  unchangedOrders: number[];
};

export const arithmeticRegenerationRequestSchema = z.strictObject({
  sheet: z.unknown(),
  seed: arithmeticSeedSchema,
  target: z.strictObject({
    round: z.number().int().min(1).max(ARITHMETIC_MAX_ROUNDS),
    orders: z
      .array(z.number().int().min(1).max(ARITHMETIC_MAX_ITEMS_PER_ROUND))
      .min(1)
      .max(ARITHMETIC_MAX_ITEMS_PER_ROUND)
      .refine((orders) => new Set(orders).size === orders.length),
  }),
});

type Item = { order: number };
type Sheet<T extends Item> = { rounds: { round: number; items: T[] }[] };

/** Copy only replacement slots. Retained objects and all metadata keep their identity. */
export function mergeArithmeticRegeneration<T extends Item, S extends Sheet<T>>(
  sheet: S,
  roundNumber: number,
  replacements: readonly T[],
): S {
  if (!replacements.length) return sheet;
  const round = sheet.rounds.find((value) => value.round === roundNumber);
  const byOrder = new Map(replacements.map((item) => [item.order, item]));
  if (
    !round ||
    byOrder.size !== replacements.length ||
    replacements.some(
      (item) => !round.items.some((old) => old.order === item.order),
    )
  )
    throw new ArithmeticEngineError("order");
  return {
    ...sheet,
    rounds: sheet.rounds.map((value) =>
      value === round
        ? {
            ...value,
            items: value.items.map((item) => byOrder.get(item.order) ?? item),
          }
        : value,
    ),
  };
}

/** Each index is visited at most once, including for domains larger than 2^32. */
function* shuffledIndexes(size: number, label: string): Generator<number> {
  const random = mulberry32(hashArithmeticLabel(label));
  const swaps = new Map<number, number>();
  for (let remaining = size; remaining > 0; remaining -= 1) {
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

type Choice<T> = { key: string; item: T; cost: number };
type Edge = { to: number; reverse: number; capacity: number; cost: number };

/** Minimum-cost bipartite assignment: changing costs 0, retaining costs 1.
 * Reverse edges allow swaps/cycles and rescue overlapping constrained domains.
 * Unlike greedy selection this never reports exhaustion just because an earlier
 * selection took the only available alternative. At most 100 augmentations.
 */
function assign<T>(choices: Choice<T>[][]): T[] {
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
    if (!previous[sink]) throw new ArithmeticEngineError("duplicate");
    for (let node = sink; node !== source;) {
      const step = previous[node]!;
      step.edge.capacity -= 1;
      graph[node][step.edge.reverse].capacity += 1;
      node = step.node;
    }
  }
  return options.map(
    (row) => row.find((choice) => choice.edge.capacity === 0)!.item,
  );
}

function regenerate<T extends Item, S extends Sheet<T>>(
  sheet: S,
  target: ArithmeticRegenerationTarget,
  seed: string,
  identity: (item: T) => string,
  domain: (item: T) => { size: number; at: (index: number) => T },
): ArithmeticRegenerationResult<S> {
  const parsed = arithmeticRegenerationRequestSchema.safeParse({
    sheet,
    target,
    seed,
  });
  if (!parsed.success) throw new ArithmeticEngineError("schema");
  const round = sheet.rounds.find((value) => value.round === target.round);
  const orders = new Set(target.orders);
  if (
    !round ||
    target.orders.some(
      (order) => !round.items.some((item) => item.order === order),
    )
  )
    throw new ArithmeticEngineError("order");
  const selected = round.items.filter((item) => orders.has(item.order));
  const retained = new Set(
    round.items.filter((item) => !orders.has(item.order)).map(identity),
  );
  const choices = selected.map((item) => {
    const currentKey = identity(item);
    const candidates = new Map<string, Choice<T>>();
    const values = domain(item);
    for (const index of shuffledIndexes(
      values.size,
      `${seed}\n${target.round}\n${item.order}`,
    )) {
      const candidate = values.at(index);
      const key = identity(candidate);
      if (key === currentKey || retained.has(key) || candidates.has(key))
        continue;
      candidates.set(key, { key, item: candidate, cost: 0 });
      // N distinct alternatives suffice for N selected slots: the other N-1
      // slots cannot consume them all. Smaller domains are exhausted exactly.
      if (candidates.size === selected.length) break;
    }
    candidates.set(currentKey, { key: currentKey, item, cost: 1 });
    return [...candidates.values()];
  });
  const assigned = assign(choices);
  const changed = assigned.filter(
    (item, index) => identity(item) !== identity(selected[index]),
  );
  const changedOrders = changed.map((item) => item.order);
  return {
    sheet: mergeArithmeticRegeneration<T, S>(sheet, target.round, changed),
    round: target.round,
    changedOrders,
    unchangedOrders: selected
      .filter((item) => !changedOrders.includes(item.order))
      .map((item) => item.order),
  };
}

export function regenerateArithmeticItems(
  sheet: ArithmeticSheetPayload,
  target: ArithmeticRegenerationTarget,
  seed: string,
): ArithmeticRegenerationResult<ArithmeticSheetPayload> {
  reopenArithmeticSheet(sheet);
  const result = regenerate<ArithmeticSheetItem, ArithmeticSheetPayload>(
    sheet,
    target,
    seed,
    (item) =>
      JSON.stringify([
        item.prompt.notation,
        item.prompt.operator,
        ...item.prompt.operands,
      ]),
    (item) => {
      const pairs = arithmeticDomainPairs(
        parseArithmeticSelection(item.spec.skillId, item.spec.constraints),
      );
      return {
        size: pairs.length,
        at: (index) => {
          // The v1 snapshot contract ties every spec.seed to sheet.seed. The new
          // selection seed controls sampling only; retained provenance is intact.
          const spec = {
            ...item.spec,
            operands: [...pairs[index]] as [number, number],
          };
          const verified = verifyArithmeticSpec(spec);
          if (!verified.ok) throw new ArithmeticEngineError(verified.code);
          return {
            ...item,
            spec,
            prompt: renderArithmeticPrompt(spec),
            answer: verified.answer,
          };
        },
      };
    },
  );
  reopenArithmeticSheet(result.sheet);
  return result;
}

export function regenerateArithmeticV2Items(
  sheet: ArithmeticV2SheetPayload,
  target: ArithmeticRegenerationTarget,
  seed: string,
): ArithmeticRegenerationResult<ArithmeticV2SheetPayload> {
  reopenArithmeticV2Sheet(sheet);
  const result = regenerate<ArithmeticV2SheetItem, ArithmeticV2SheetPayload>(
    sheet,
    target,
    seed,
    (item) => arithmeticV2PromptIdentity(item.prompt),
    (item) => {
      const definition = getArithmeticV2Definition(item.typeId);
      return {
        size: definition.domainSize,
        at: (domainIndex) => {
          const parsed = arithmeticV2CandidateSchema.safeParse(
            definition.problemAt(domainIndex),
          );
          if (!parsed.success || !definition.verify(parsed.data))
            throw new ArithmeticV2EngineError("verification");
          return { ...item, ...parsed.data, domainIndex };
        },
      };
    },
  );
  if (result.changedOrders.length && result.sheet.figures?.version === 2) {
    result.sheet = {
      ...result.sheet,
      figures: arithmeticGeometrySnapshotForPrompts(
        result.sheet.rounds.flatMap((round) =>
          round.items.map((item) => item.prompt),
        ),
      ),
    };
  }
  reopenArithmeticV2Sheet(result.sheet);
  return result;
}

export function arithmeticRegenerationNotice(
  result: ArithmeticRegenerationResult<Sheet<Item>>,
): string {
  const offset = result.sheet.rounds
    .filter((round) => round.round < result.round)
    .reduce((sum, round) => sum + round.items.length, 0);
  const changed = result.changedOrders.length
    ? `${result.changedOrders.length}문항의 숫자를 바꿨습니다. 저장 전에는 현재 화면에만 보관됩니다.`
    : "숫자를 바꿀 수 있는 문항이 없습니다. 기존 문항을 유지했습니다.";
  return result.unchangedOrders.length
    ? `${changed} ${result.round}회차 ${result.unchangedOrders.map((order) => offset + order).join(", ")}번은 현재 조건과 다른 문항의 중복을 피하면서 바꿀 수 없어 유지했습니다.`
    : changed;
}
