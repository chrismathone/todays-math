import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import type { UnitEntity } from "@/contracts/unit.contract";
import type { BankData, StudioProblem } from "@/components/unified/types";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import type { ExamBuilderSource } from "./types";

export const MATH_EXAM_DIFFICULTIES = DIFFICULTY_LADDER;
export const MATH_EXAM_MAX_QUESTIONS = 100;

interface MathSourceOptions {
  initialUnits?: readonly UnitEntity[];
  /** Omit in the workspace to retain the existing production/development routing. */
  problemsUrl?: string;
  fetch?: typeof fetch;
}

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

  function toScopes(units: readonly UnitEntity[]) {
    scopeIds.clear();
    return units.map((unit) => {
      scopeIds.set(unitKey(unit), unit.id);
      return {
        id: unit.id,
        label: unit.section,
        group: unit.grade,
        detail: unit.chapter,
      };
    });
  }
  if (options.initialUnits) toScopes(options.initialUnits);

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
    async loadScopes(signal) {
      if (options.initialUnits) return toScopes(options.initialUnits);
      // The bank already returns the full ordered curriculum. Only one question
      // is fetched alongside it; no full-bank download or per-unit request.
      const data = await request<BankData>(`${endpoint()}?pageSize=1`, signal);
      if (!data.units) throw new Error("단원 목록을 불러오지 못했습니다.");
      return toScopes(data.units);
    },
    async list(input, signal) {
      if (!input.scopeIds.length) return { items: [], total: 0 };
      const params = new URLSearchParams({
        unitIds: [...new Set(input.scopeIds)].join(","),
        page: String(input.page),
        pageSize: String(input.pageSize),
      });
      if (input.difficulty) params.set("difficulty", input.difficulty);
      if (input.query.trim()) params.set("q", input.query.trim());
      if (input.excludeIds.length)
        params.set("excludeIds", [...new Set(input.excludeIds)].join(","));
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
        scopeLabel: item.section,
        difficulty: item.difficulty,
        detail: [item.grade, item.chapter, item.problemCode]
          .filter(Boolean)
          .join(" · "),
      };
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
      const byId = new Map(
        eligible(data.problems).map((item) => [item.id, item]),
      );
      return items.map((item) => {
        if (localCrop(item)) return item;
        const current = byId.get(item.id);
        if (!current || scopeId(current) !== scopeId(item))
          throw new Error(
            "삭제되었거나 출제 조건이 바뀐 문항이 있습니다. 문항을 다시 선택해 주세요.",
          );
        return current;
      });
    },
  };
}
