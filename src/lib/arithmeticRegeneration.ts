import { z } from "zod";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_SAVED_ROUNDS,
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
import {
  arithmeticShuffledIndexes,
  arithmeticRoundOverlapLimit,
  canonicalArithmeticDomain,
} from "@/lib/arithmetic/roundSelection";
import {
  assignArithmeticRegeneration,
  type ArithmeticRegenerationChoice,
} from "@/lib/arithmetic/regenerationSelection";
import { assertArithmeticSheetByteBudget } from "@/lib/arithmetic/byteBudget";
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
  unchangedReason?: "fixed-overlap" | "overlap-capacity";
  /** Changed slots whose new task was already one of the selected slots' tasks. */
  reorderedOrders?: number[];
  /** No selected slot had any task outside this round: a tiny preset is fully used. */
  exhausted?: boolean;
};

export const arithmeticRegenerationRequestSchema = z.strictObject({
  sheet: z.unknown(),
  seed: arithmeticSeedSchema,
  target: z.strictObject({
    round: z.number().int().min(1).max(ARITHMETIC_MAX_SAVED_ROUNDS),
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
  const others = sheet.rounds
    .filter((value) => value !== round)
    .map((value) => {
      const keys = new Set(value.items.map(identity));
      const fixed = [...retained].filter((key) => keys.has(key)).length;
      return {
        keys,
        allowance:
          arithmeticRoundOverlapLimit(round.items.length, value.items.length) -
          fixed,
      };
    });
  const unchanged = (
    unchangedReason: "fixed-overlap" | "overlap-capacity",
  ): ArithmeticRegenerationResult<S> => ({
    sheet,
    round: target.round,
    changedOrders: [],
    unchangedOrders: selected.map((item) => item.order),
    unchangedReason,
  });
  if (others.some((other) => other.allowance < 0))
    return unchanged("fixed-overlap");
  const selectedKeys = new Set(selected.map(identity));
  // Per selected slot: did its domain offer a task not already on this round?
  // Any early break below has seen N distinct non-current candidates, and at
  // most N-1 of them can belong to other selected slots, so the flag is exact.
  const fresh: boolean[] = [];
  const choices = (complete: boolean) =>
    selected.map((item, slot) => {
      const currentKey = identity(item);
      const candidates = new Map<string, ArithmeticRegenerationChoice<T>>();
      const values = domain(item);
      const counts = new Map<number, number>();
      fresh[slot] = false;
      for (const index of arithmeticShuffledIndexes(
        values.size,
        `${seed}\n${target.round}\n${item.order}`,
      )) {
        const candidate = values.at(index);
        const key = identity(candidate);
        if (key === currentKey || retained.has(key) || candidates.has(key))
          continue;
        if (!selectedKeys.has(key)) fresh[slot] = true;
        let mask = 0;
        others.forEach((other, i) => {
          if (other.keys.has(key)) mask |= 1 << i;
        });
        // N alternatives per fixed-membership class suffice for N selected slots.
        // Once N fresh alternatives exist, every slot can change without adding
        // any overlap. Huge indexed domains therefore stay lazy.
        const count = counts.get(mask) ?? 0;
        if (count < selected.length) {
          candidates.set(key, { key, item: candidate, cost: 0 });
          counts.set(mask, count + 1);
        }
        if (!complete && candidates.size === selected.length) break;
        if ((counts.get(0) ?? 0) === selected.length) break;
      }
      if ((counts.get(0) ?? 0) === selected.length) {
        // Every slot with N fresh alternatives can be assigned a changed task
        // unused by the other N-1 selected slots. Keeping overlap alternatives
        // would only inflate the flow graph (and retained candidate objects).
        return [...candidates.values()].filter((choice) =>
          others.every((other) => !other.keys.has(choice.key)),
        );
      }
      candidates.set(currentKey, { key: currentKey, item, cost: 1 });
      return [...candidates.values()];
    });
  // Most ordinary domains can change every slot from N seeded alternatives.
  // Only a non-optimal/failed result expands to the complete membership pools.
  // A full-change feasible result is already the global optimum.
  let assigned = assignArithmeticRegeneration(choices(false), others);
  if (
    !assigned ||
    assigned.some((item, i) => identity(item) === identity(selected[i]))
  )
    assigned = assignArithmeticRegeneration(choices(true), others);
  if (!assigned) return unchanged("overlap-capacity");
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
    reorderedOrders: changed
      .filter((item) => selectedKeys.has(identity(item)))
      .map((item) => item.order),
    exhausted: selected.every((_, slot) => !fresh[slot]),
  };
}

export function regenerateArithmeticItems(
  sheet: ArithmeticSheetPayload,
  target: ArithmeticRegenerationTarget,
  seed: string,
): ArithmeticRegenerationResult<ArithmeticSheetPayload> {
  reopenArithmeticSheet(sheet);
  const domains = new Map<string, ReturnType<typeof arithmeticDomainPairs>>();
  const verifiedByDomain = new Map<
    string,
    Map<number, Pick<ArithmeticSheetItem, "prompt" | "answer">>
  >();
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
      const key = canonicalArithmeticDomain([
        item.spec.skillId,
        item.spec.constraints,
      ]);
      let pairs = domains.get(key);
      if (!pairs) {
        pairs = arithmeticDomainPairs(
          parseArithmeticSelection(item.spec.skillId, item.spec.constraints),
        );
        domains.set(key, pairs);
      }
      const values = pairs;
      let verifiedPairs = verifiedByDomain.get(key);
      if (!verifiedPairs) {
        verifiedPairs = new Map();
        verifiedByDomain.set(key, verifiedPairs);
      }
      const templates = verifiedPairs;
      return {
        size: pairs.length,
        at: (index) => {
          // The v1 snapshot contract ties every spec.seed to sheet.seed. The new
          // selection seed controls sampling only; retained provenance is intact.
          const spec = {
            ...item.spec,
            operands: [...values[index]] as [number, number],
          };
          let template = templates.get(index);
          if (!template) {
            const verified = verifyArithmeticSpec(spec);
            if (!verified.ok) throw new ArithmeticEngineError(verified.code);
            template = {
              prompt: renderArithmeticPrompt(spec),
              answer: verified.answer,
            };
            templates.set(index, template);
          }
          return {
            ...item,
            spec,
            ...template,
          };
        },
      };
    },
  );
  if (result.changedOrders.length)
    assertArithmeticSheetByteBudget(result.sheet);
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
  if (result.changedOrders.length)
    assertArithmeticSheetByteBudget(result.sheet);
  reopenArithmeticV2Sheet(result.sheet);
  return result;
}

export function arithmeticRegenerationNotice(
  result: ArithmeticRegenerationResult<Sheet<Item>>,
): string {
  if (result.unchangedReason === "fixed-overlap")
    return "선택하지 않은 문항만으로 이미 다른 회차와 같은 문제가 20%를 넘습니다. 현재 선택으로는 제한을 맞출 수 없어 기존 문항을 유지했습니다. 겹치는 문항을 더 선택해 주세요.";
  if (result.unchangedReason === "overlap-capacity")
    return "선택한 문항의 가능한 문제로는 회차 사이의 같은 문제를 20% 이하로 맞출 수 없어 기존 문항을 유지했습니다. 선택 범위를 넓히거나 새 학습지의 유형과 문항 수를 조정해 주세요.";
  const offset = result.sheet.rounds
    .filter((round) => round.round < result.round)
    .reduce((sum, round) => sum + round.items.length, 0);
  const count = result.changedOrders.length;
  // A tiny preset («3 더하기 · 받아올림 있음» holds three expressions) can only
  // permute itself; calling that «new numbers» is what the owner read as broken.
  const reordered = count > 0 && result.reorderedOrders?.length === count;
  const exhausted = result.exhausted === true;
  const changed = count
    ? reordered
      ? `${count}문항은 선택한 문항끼리 자리만 바꿨습니다.${exhausted ? " 현재 조건에서 만들 수 있는 식을 모두 담고 있어 새 숫자는 없습니다." : ""} 저장 전에는 현재 화면에만 보관됩니다.`
      : `${count}문항의 숫자를 바꿨습니다. 저장 전에는 현재 화면에만 보관됩니다.`
    : exhausted
      ? "현재 조건에서 만들 수 있는 식을 모두 담고 있어 바꿀 숫자가 없습니다. 기존 문항을 유지했습니다."
      : "숫자를 바꿀 수 있는 문항이 없습니다. 기존 문항을 유지했습니다.";
  const guidance = exhausted ? " 조건을 넓히거나 문항 수를 줄여 주세요." : "";
  if (!result.unchangedOrders.length) return changed + guidance;
  const numbers = result.unchangedOrders
    .map((order) => offset + order)
    .join(", ");
  return exhausted
    ? `${changed} ${result.round}회차 ${numbers}번은 그대로입니다.${guidance}`
    : `${changed} ${result.round}회차 ${numbers}번은 현재 조건, 회차 안 중복 금지와 회차 사이 20% 제한을 지키면서 바꿀 수 없어 유지했습니다.`;
}
