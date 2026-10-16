import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import {
  bankCheckResponseSchema,
  BANK_INELIGIBLE_LABEL,
} from "@/contracts/bankReadiness.contract";
import {
  bankSourceAvailabilitySchema,
  type BankSourceAvailability,
} from "@/contracts/bankSource.contract";
import type { UnitEntity } from "@/contracts/unit.contract";
import type { BankData, StudioProblem } from "@/components/unified/types";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import { familyIdOf } from "@/lib/generator/familyKey";
import type { ExamBuilderSource } from "./types";

export const MATH_EXAM_DIFFICULTIES = DIFFICULTY_LADDER;
export const MATH_EXAM_MAX_QUESTIONS = 100;

interface MathSourceOptions {
  initialUnits?: readonly UnitEntity[];
  initialUnitCounts?: Readonly<Record<string, number>>;
  /** Omit in the workspace to retain the existing production/development routing. */
  problemsUrl?: string;
  fetch?: typeof fetch;
  /** Same serialized conditions for counts, candidates and composition. */
  filters?: string;
  refreshAvailability?: boolean;
  onAvailability?: (value: BankSourceAvailability) => void;
}

/**
 * 답안 형식 — 서버가 `classifyFormat` 으로 판정해 실어 보낸 값(`questionType`)을 그대로 읽는다.
 * 판정이 안 된 문항은 «미분류»로 둔다(주관식으로 접지 않는다).
 */
const FORMAT_LABEL: Record<
  NonNullable<StudioProblem["questionType"]>,
  string
> = {
  "multiple-choice": "객관식",
  "short-answer": "단답형",
  descriptive: "서술형",
};
const FORMAT_ORDER = ["객관식", "단답형", "서술형", "미분류"] as const;
const formatOf = (item: StudioProblem) =>
  (item.questionType && FORMAT_LABEL[item.questionType]) || "미분류";

const tally = (values: readonly string[], order: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [
    ...order.filter((key) => counts.has(key)),
    ...[...counts.keys()].filter((key) => !order.includes(key)),
  ]
    .map((key) => `${key} ${counts.get(key)}`)
    .join(", ");
};

const unitKey = (unit: Pick<UnitEntity, "grade" | "chapter" | "section">) =>
  JSON.stringify([unit.grade, unit.chapter, unit.section]);

/** Native Studio rows are passed through intact, including figure and format evidence. */
export function createMathExamBuilderSource(
  options: MathSourceOptions = {},
): ExamBuilderSource<StudioProblem> {
  const scopeIds = new Map<string, string>();
  const endpoint = () => options.problemsUrl ?? getStudioEndpoints().problems;
  const scopeId = (item: StudioProblem) =>
    (item as StudioProblem & { unitId?: string }).unitId ??
    scopeIds.get(unitKey(item)) ??
    "";
  const localCrop = (item: StudioProblem) =>
    item.eligible === undefined &&
    Boolean(item.studioCrop || item.croppedImage || item.ocr);

  function toScopes(
    units: readonly UnitEntity[],
    counts?: Readonly<Record<string, number>>,
    countUnit?: string,
  ) {
    scopeIds.clear();
    return units.map((unit) => {
      scopeIds.set(unitKey(unit), unit.id);
      return {
        id: unit.id,
        label: unit.section,
        group: unit.grade,
        detail: unit.chapter,
        ...(counts && unit.id in counts
          ? { count: counts[unit.id], ...(countUnit ? { countUnit } : {}) }
          : {}),
      };
    });
  }
  const initialScopes =
    options.initialUnits && !options.refreshAvailability && !options.filters
      ? toScopes(options.initialUnits, options.initialUnitCounts)
      : undefined;

  async function request<T>(
    url: string,
    signal: AbortSignal,
    init?: RequestInit,
  ): Promise<T> {
    const response = await (options.fetch ?? fetch)(url, {
      ...init,
      signal,
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "문제은행을 불러오지 못했습니다.");
    return body as T;
  }

  function eligible(items: StudioProblem[]) {
    if (items.some((item) => item.eligible !== true))
      throw new Error(
        "출제할 수 없는 문항이 있습니다. 문항을 다시 선택해 주세요.",
      );
    if (new Set(items.map((item) => item.id)).size !== items.length)
      throw new Error("중복 문항이 있습니다. 문항을 다시 선택해 주세요.");
    return items;
  }

  return {
    requireScopeCounts: true,
    ...(initialScopes ? { initialScopes } : {}),
    async loadScopes(signal) {
      if (options.refreshAvailability || options.filters) {
        const params = new URLSearchParams(options.filters);
        params.set("view", "available");
        // D-111: a sheet takes one problem per family, so the gate is families.
        params.set("families", "1");
        const [inventory, curriculum] = await Promise.all([
          request<unknown>(`${endpoint()}/sources`, signal, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(Object.fromEntries(params)),
          }),
          options.initialUnits
            ? Promise.resolve({ units: options.initialUnits })
            : request<BankData>(`${endpoint()}?pageSize=1`, signal),
        ]);
        const available = bankSourceAvailabilitySchema.parse(inventory);
        if (!curriculum.units)
          throw new Error("단원 목록을 불러오지 못했습니다.");
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        options.onAvailability?.(available);
        // Never fall back to row counts: rows overstate what one sheet can hold.
        const families = available.facets?.unitFamilies;
        return toScopes(
          curriculum.units,
          families
            ? Object.fromEntries(
                curriculum.units.map((unit) => [
                  unit.id,
                  families[unit.id] ?? 0,
                ]),
              )
            : undefined,
          "갈래",
        );
      }
      if (options.initialUnits)
        return toScopes(options.initialUnits, options.initialUnitCounts);
      // The bank already returns the full ordered curriculum. Only one question
      // is fetched alongside it; no full-bank download or per-unit request.
      const data = await request<BankData>(`${endpoint()}?pageSize=1`, signal);
      if (!data.units) throw new Error("단원 목록을 불러오지 못했습니다.");
      return toScopes(data.units, data.unitCounts);
    },
    async list(input, signal) {
      if (!input.scopeIds.length) return { items: [], total: 0 };
      const params = new URLSearchParams(options.filters);
      params.set("unitIds", [...new Set(input.scopeIds)].join(","));
      params.set("page", String(input.page));
      params.set("pageSize", String(input.pageSize));
      if (input.difficulty) params.set("difficulty", input.difficulty);
      if (input.query.trim()) params.set("q", input.query.trim());
      if (input.excludeIds.length)
        params.set("excludeIds", [...new Set(input.excludeIds)].join(","));
      if (input.excludeFamiliesOf?.length)
        params.set(
          "excludeFamiliesOf",
          [...new Set(input.excludeFamiliesOf)].join(","),
        );
      const data =
        params.toString().length > 3000
          ? await request<BankData>(endpoint(), signal, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(Object.fromEntries(params)),
            })
          : await request<BankData>(`${endpoint()}?${params}`, signal);
      return {
        items: data.page === input.page ? eligible(data.problems) : [],
        total: data.total,
      };
    },
    async compose(allocations, signal) {
      const positive = allocations.filter(
        (allocation) => allocation.count !== 0,
      );
      if (!positive.length) return [];
      const data = await request<{ problems: StudioProblem[] }>(
        `${endpoint()}/random`,
        signal,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(options.filters ? { filters: options.filters } : {}),
            allocations: positive.map(({ scopeId, count }) => ({
              unitId: scopeId,
              count,
            })),
          }),
        },
      );
      return eligible(data.problems);
    },
    info(item) {
      return {
        id: item.id,
        scopeId: scopeId(item),
        familyId: familyIdOf({
          id: item.id,
          unitId: scopeId(item),
          familyKey: (item as StudioProblem & { familyKey?: string | null })
            .familyKey,
        }),
        scopeLabel: item.section,
        difficulty: item.difficulty,
        detail: [
          item.grade,
          item.chapter,
          item.problemCode,
          item.problemType,
          formatOf(item),
        ]
          .filter((value, index, all) => value && all.indexOf(value) === index)
          .join(" · "),
      };
    },
    summarize(items) {
      if (!items.length) return "";
      // Distinct scopes, not review groups (those split A → B → A into three).
      const scopes = new Set(items.map(scopeId).filter(Boolean));
      return [
        `단원 ${scopes.size}개`,
        `난이도 ${tally(
          items.map((item) => item.difficulty || "미지정"),
          DIFFICULTY_LADDER,
        )}`,
        `형식 ${tally(items.map(formatOf), FORMAT_ORDER)}`,
      ].join(" · ");
    },
    async prepareOutput(items, signal) {
      if (!items.length) return [];
      if (items.length > MATH_EXAM_MAX_QUESTIONS)
        throw new Error("한 번에 100문항까지 출력할 수 있습니다.");
      if (new Set(items.map((item) => item.id)).size !== items.length)
        throw new Error("중복 문항이 있습니다. 문항을 다시 선택해 주세요.");
      // Old saved drafts predate the eligibility field; the fresh server rows,
      // rather than a cached flag, decide whether they can still be printed.
      const bankItems = items.filter((item) => !localCrop(item));
      if (!bankItems.length) return items;
      const params = new URLSearchParams({
        ids: bankItems.map((item) => item.id).join(","),
        pageSize: String(bankItems.length),
      });
      const data = await request<BankData>(`${endpoint()}?${params}`, signal);
      const returned = new Set(
        data.problems
          .filter((item) => item.eligible === true)
          .map((item) => item.id),
      );
      if (bankItems.some((item) => !returned.has(item.id))) {
        const check = bankCheckResponseSchema.parse(
          await request<unknown>(`${endpoint()}/check`, signal, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ids: bankItems.map((item) => item.id) }),
          }),
        );
        const unavailable = check.items.filter(
          (item) => item.state !== "eligible",
        );
        if (unavailable.length)
          throw new Error(
            unavailable
              .map((item) => {
                const original = bankItems.find((row) => row.id === item.id);
                return `${original?.problemCode || "선택 문항"}: ${item.code ? BANK_INELIGIBLE_LABEL[item.code] : "문항을 찾을 수 없음"}`;
              })
              .join(" · "),
          );
      }
      const byId = new Map(
        eligible(data.problems).map((item) => [item.id, item]),
      );
      return items.map((item) => {
        if (localCrop(item)) return item;
        const current = byId.get(item.id);
        if (
          !current ||
          scopeId(current) !== scopeId(item) ||
          (typeof item.source === "string" && current.source !== item.source)
        )
          throw new Error(
            "삭제되었거나 출제 조건이 바뀐 문항이 있습니다. 문항을 다시 선택해 주세요.",
          );
        return current;
      });
    },
  };
}
