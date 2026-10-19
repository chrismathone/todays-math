/**
 * 실행기 — 표본 × 팔을 돌리며 비용을 세고, 상한에 닿으면 멈추고, 대체 경로를 처리한다.
 * 호출(`caller`)을 주입받아 실호출 없이 시험한다.
 */
import { armById, KEY_NAMES, type Arm } from "./arms";
import { Budget, BudgetExceeded, costOf, estimateTokens, maximumTextCallCost, ZERO_USAGE, type Usage } from "./cost";
import type { Caller } from "./providers";
import type { RunRecord, Task } from "./task";

export interface BenchOptions {
  arms: Arm[];
  budget: Budget;
  caller: Caller;
  /** 동시에 부르는 수(팔마다) */
  concurrency?: number;
  /** 실호출일 때 — 서버 키가 없는 팔은 부르지 않고 건너뛴다(대체 팔의 키도 본다) */
  requireKeys?: boolean;
  /** 텍스트 실측: 추정 평균 대신 각 호출의 최대 입력·출력 비용을 미리 확보한다. */
  strictBudget?: boolean;
  onRecord?: (record: RunRecord) => void;
}

export interface BenchResult {
  records: RunRecord[];
  stopped?: string;
  skippedArms: { id: string; reason: string }[];
}

/** 드라이런 — 호출 없이 팔마다 예상 비용(입력은 지시문 길이로, 출력은 작업의 어림) */
export function estimate<Item extends { id: string }>(task: Task<Item>, items: Item[], arms: Arm[]) {
  return arms.map((arm) => {
    const usage = items.reduce<Usage>(
      (u, item) => ({
        input: u.input + estimateTokens(task.prompt(item)) + (task.vision ? 1500 : 0),
        cachedInput: 0,
        output: u.output + task.expectedOutputTokens,
      }),
      { ...ZERO_USAGE },
    );
    return { arm: arm.id, calls: items.length, usage, cost: costOf(arm, usage) };
  });
}

export async function runBench<Item extends { id: string }>(
  task: Task<Item>,
  items: Item[],
  { arms, budget, caller, concurrency = 3, requireKeys = false, strictBudget = false, onRecord }: BenchOptions,
): Promise<BenchResult> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("concurrency는 1 이상의 정수여야 합니다.");
  if (strictBudget && task.vision) throw new Error("strict-budget은 텍스트 작업에만 사용할 수 있습니다.");
  const records: RunRecord[] = [];
  const skippedArms: BenchResult["skippedArms"] = [];
  let stopped: string | undefined;

  for (const arm of arms) {
    if (task.vision && !arm.vision) {
      skippedArms.push({ id: arm.id, reason: "사진을 받지 못하는 모델" });
      continue;
    }
    const missing = [arm, ...(arm.fallback ? [armById(arm.fallback)] : [])].find(
      (a) => requireKeys && Boolean(KEY_NAMES[a.vendor]) && !process.env[KEY_NAMES[a.vendor]]?.trim(),
    );
    if (missing) {
      skippedArms.push({ id: arm.id, reason: `${KEY_NAMES[missing.vendor]} 없음` });
      continue;
    }
    const perCall = estimate(task, items.slice(0, 1), [arm])[0]!.cost;
    let next = 0;
    let seen = 0;
    const worker = async () => {
      while (!stopped && next < items.length) {
        const item = items[next++]!;
        try {
          // 동시에 날아가는 호출 몫까지 미리 잡는다 — 한 건 값은 어림과 지금까지 실제로 본 최댓값 가운데 큰 쪽
          const unit = Math.max(perCall, seen);
          if (!strictBudget) budget.check(unit * Math.min(concurrency, items.length));
          const result = await runWithFallback(task, item, arm, caller, budget, unit, strictBudget);
          if (result.record) {
            seen = Math.max(seen, result.record.cost);
            records.push(result.record);
            onRecord?.(result.record);
          }
          if (result.stopped) stopped = result.stopped;
        } catch (error) {
          if (error instanceof BudgetExceeded) stopped = error.message;
          else throw error;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    if (stopped) break;
  }
  return { records, stopped, skippedArms };
}

async function runWithFallback<Item extends { id: string }>(
  task: Task<Item>,
  item: Item,
  arm: Arm,
  caller: Caller,
  budget: Budget,
  perCall: number,
  strictBudget: boolean,
): Promise<{ record?: RunRecord; stopped?: string }> {
  const once = async (target: Arm) => {
    let usage: Usage = { ...ZERO_USAGE };
    let cost = 0;
    let ms = 0;
    let calls = 0;
    let stopReason: string | undefined;
    let uncertainCost = 0;
    // 비용을 세는 감싼 호출 — 작업이 여러 번 불러도(보강 호출) 다 센다
    const counted: Caller = async (a, input) => {
      let settle: ((actual?: number) => void) | undefined;
      let maximum = 0;
      try {
        if (strictBudget) {
          if (stopReason || budget.uncertain > 0) {
            stopReason ??= "사용량을 확인하지 못한 호출이 있어 추가 호출을 중단합니다.";
            throw new Error(stopReason);
          }
          if (input.imageDataUrl) throw new Error("strict-budget은 이미지 호출을 받지 않습니다.");
          maximum = maximumTextCallCost(a, input.prompt);
          settle = budget.reserve(maximum);
        }
      } catch (error) {
        if (error instanceof BudgetExceeded) stopReason = error.message;
        throw error;
      }
      const started = Date.now();
      calls++;
      let out;
      try {
        out = await caller(a, input);
      } catch (error) {
        // 사용량이 없는 네트워크 실패도 최대 비용을 소비한 것으로 잡고 계속 쓰지 않는다.
        settle?.();
        if (strictBudget) {
          cost += maximum;
          uncertainCost += maximum;
          ms += Date.now() - started;
          stopReason = "응답 사용량을 확인하지 못해 최대 비용으로 정산하고 중단합니다.";
          throw new Error(stopReason);
        }
        throw error;
      }
      if (strictBudget && (out.usageReported === false ||
        ![out.usage.input, out.usage.cachedInput, out.usage.output].every((n) => Number.isFinite(n) && n >= 0) ||
        out.usage.cachedInput > out.usage.input)) {
        settle?.();
        cost += maximum;
        uncertainCost += maximum;
        ms += out.ms;
        stopReason = "공급자의 사용량이 없거나 잘못되어 최대 비용으로 정산하고 중단합니다.";
        throw new Error(stopReason);
      }
      const c = costOf(a, out.usage);
      if (settle) settle(c);
      else budget.add(c);
      cost += c;
      ms += out.ms;
      if (strictBudget && c > maximum + Number.EPSILON)
        stopReason = "공급자 비용이 확보한 최대 비용을 넘어 추가 호출을 중단합니다.";
      usage = {
        input: usage.input + out.usage.input,
        cachedInput: usage.cachedInput + out.usage.cachedInput,
        output: usage.output + out.usage.output,
        reasoning: (usage.reasoning ?? 0) + (out.usage.reasoning ?? 0),
      };
      return out;
    };
    let result;
    try {
      result = await task.runOne(item, target, counted);
    } catch (error) {
      if (!stopReason) throw error;
      result = { finish: "other" as const, error: stopReason, score: { match: "empty" } };
    }
    // 파서가 오류를 잡아도 중단을 전달하고 이미 유료 호출한 결과·비용은 보존한다.
    return { ...result, usage, cost, ms, calls, uncertainCost, stopReason };
  };

  const { stopReason: firstStop, ...first } = await once(arm);
  let record: RunRecord = { itemId: item.id, armId: arm.id, ...first };
  if (firstStop) return { record: first.calls ? record : undefined, stopped: firstStop };
  let stopped: string | undefined;
  if (arm.fallback && task.needsFallback(first)) {
    if (!strictBudget) {
      try { budget.check(perCall); }
      catch (error) {
        if (error instanceof BudgetExceeded) return { record, stopped: error.message };
        throw error;
      }
    }
    const { stopReason, ...second } = await once(armById(arm.fallback));
    stopped = stopReason;
    if (stopped && !second.calls) return { record, stopped };
    record = {
      itemId: item.id,
      armId: arm.id,
      ...second,
      ms: first.ms + second.ms,
      cost: first.cost + second.cost,
      calls: first.calls + second.calls,
      usage: {
        input: first.usage.input + second.usage.input,
        cachedInput: first.usage.cachedInput + second.usage.cachedInput,
        output: first.usage.output + second.usage.output,
      },
      usedFallback: true,
      uncertainCost: first.uncertainCost + second.uncertainCost,
    };
  }
  return { record, stopped };
}

/** 표 — 팔마다 한 줄 */
export function table<Item extends { id: string }>(task: Task<Item>, records: RunRecord[], arms: Arm[]) {
  const rows = arms
    .map((arm) => ({ arm, recs: records.filter((r) => r.armId === arm.id) }))
    .filter((x) => x.recs.length)
    .map(({ arm, recs }) => ({ 팔: arm.id, ...task.summarize(recs) }));
  if (!rows.length) return "(기록 없음)";
  const cols = Object.keys(rows[0]!);
  return [
    `| ${cols.join(" | ")} |`,
    `|${cols.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${cols.map((c) => String((r as Record<string, unknown>)[c])).join(" | ")} |`),
  ].join("\n");
}
