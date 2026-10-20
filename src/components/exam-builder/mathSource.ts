import {
  assertQuestionFormat,
  questionIdentity,
  requireQuestionRead,
  selectedQuestionFormat,
} from "@/lib/problem/questionSelectionClient";
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
import {
  unifiedBankBootstrapSchema,
  unifiedBankCurriculumSchema,
  unifiedBankScopeCountsSchema,
} from "@/contracts/unifiedBankBootstrap.contract";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import { familyIdOf } from "@/lib/generator/familyKey";
import { DUPLICATE_EXCLUSION_DAYS } from "@/lib/tests/constants";
import { SOURCE_LABEL } from "@/components/problem/labels";
import type { ExamBuilderSource } from "./types";

export const MATH_EXAM_DIFFICULTIES = DIFFICULTY_LADDER;
export const MATH_EXAM_MAX_QUESTIONS = 100;
export type MathAvailabilityCache = Map<
  string,
  { expires: number; pending: Promise<unknown> }
>;

interface MathSourceOptions {
  /** Production S2: navigation and counts are requested only as needed. */
  deferScopes?: boolean;
  initialUnits?: readonly UnitEntity[];
  initialUnitCounts?: Readonly<Record<string, number>>;
  initialCountUnit?: "question";
  /** Omit in the workspace to retain the existing production/development routing. */
  problemsUrl?: string;
  fetch?: typeof fetch;
  /** Same serialized conditions for counts, candidates and composition. */
  filters?: string;
  refreshAvailability?: boolean;
  onAvailability?: (value: BankSourceAvailability) => void;
  /**
   * D-111 «같은 문항류는 1개만» — 기본 켜짐(원장님 2026-10-16 · 끌 수 있음). 끄면 출제 가능 수는 문항 수,
   * 추가 · 교체 후보는 같은 문항류를 빼지 않고, 구성도 행 단위로 뽑는다.
   */
  distinctFamilies?: boolean;
  /** Component-local, shared across family-rule changes. No owner data crosses components. */
  availabilityCache?: MathAvailabilityCache;
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
const SCOPE_CHANGED_MESSAGE =
  "문항의 단원이나 출처가 바뀌었습니다. 현재 문항은 유지했습니다. 다시 선택해 주세요.";

/** Native Studio rows are passed through intact, including figure and format evidence. */
export function createMathExamBuilderSource(
  options: MathSourceOptions = {},
): ExamBuilderSource<StudioProblem> {
  const scopeIds = new Map<string, string>();
  const unitsById = new Map<string, UnitEntity>();
  let curriculumUnits = options.initialUnits;
  const distinct = options.distinctFamilies !== false;
  const endpoint = () => options.problemsUrl ?? getStudioEndpoints().problems;
  const scopeId = (item: StudioProblem) =>
    (item as StudioProblem & { unitId?: string }).unitId ??
    scopeIds.get(unitKey(item)) ??
    "";
  const localCrop = (item: StudioProblem) =>
    item.eligible === undefined &&
    Boolean(item.studioCrop || item.croppedImage || item.ocr);

  function rememberUnits(units: readonly UnitEntity[]) {
    for (const unit of units) {
      scopeIds.set(unitKey(unit), unit.id);
      unitsById.set(unit.id, unit);
    }
  }

  function toScopes(
    units: readonly UnitEntity[],
    counts?: Readonly<Record<string, number>>,
    countUnit?: string,
  ) {
    rememberUnits(units);
    return units.map((unit) => ({
      id: unit.id,
      label: unit.section,
      group: unit.grade,
      detail: unit.chapter,
      ...(counts && unit.id in counts
        ? { count: counts[unit.id], ...(countUnit ? { countUnit } : {}) }
        : {}),
    }));
  }
  const initialScopes = options.initialUnits
    ? toScopes(
        options.initialUnits,
        options.initialCountUnit === "question" &&
          !options.refreshAvailability &&
          !options.filters
          ? options.initialUnitCounts
          : undefined,
      )
    : undefined;

  async function request<T>(
    url: string,
    signal: AbortSignal | undefined,
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
      throw Object.assign(
        new Error(
          (typeof body.error === "string" ? body.error : body.error?.message) ||
            "문제은행을 불러오지 못했습니다.",
        ),
        { status: response.status },
      );
    return body as T;
  }

  async function loadCurriculum(signal: AbortSignal) {
    const units =
      curriculumUnits ??
      unifiedBankBootstrapSchema.parse(
        await request<unknown>(
          `${endpoint()}?identity=question&view=bootstrap`,
          signal,
        ),
      ).units;
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    curriculumUnits = units;
    rememberUnits(units);
    return { units };
  }

  async function navigation(
    selection: Record<string, string>,
    signal: AbortSignal,
  ) {
    const legacyParams = new URLSearchParams({
      identity: "question",
      view: "curriculum",
      ...selection,
    });
    // Only the new grade/chapter reader asks for inventory. Legacy strict
    // readers and saved-lesson restoration retain their metadata-only contract.
    const withAvailability = !selection.unitIds && !selection.chapter;
    const params = withAvailability
      ? new URLSearchParams(options.filters)
      : new URLSearchParams();
    legacyParams.forEach((value, key) => params.set(key, value));
    if (withAvailability) params.set("availability", "1");
    let response: unknown;
    try {
      response =
        params.toString().length > 3000
          ? await request<unknown>(endpoint(), signal, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(Object.fromEntries(params)),
            })
          : await request<unknown>(`${endpoint()}?${params}`, signal);
    } catch (cause) {
      // Old servers reject the opt-in query. Read labels only; missing counts
      // stay unknown rather than authorizing an empty branch or inventing zero.
      if (
        !withAvailability ||
        !(cause instanceof Error) ||
        !("status" in cause) ||
        cause.status !== 400
      )
        throw cause;
      response = await request<unknown>(
        `${endpoint()}?${legacyParams}`,
        signal,
      );
    }
    const value = unifiedBankCurriculumSchema.parse(response);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    rememberUnits(value.units);
    return value;
  }

  async function restoreCurriculum(
    items: readonly StudioProblem[],
    signal: AbortSignal,
  ) {
    const bankItems = items.filter((item) => !localCrop(item));
    const ids = [...new Set(bankItems.map(scopeId).filter(Boolean))];
    const missingIds = ids.filter((id) => !unitsById.has(id));
    const paths = new Map<string, { grade: string; chapter: string }>();
    for (const item of bankItems)
      if (!scopeId(item) && item.grade && item.chapter)
        paths.set(JSON.stringify([item.grade, item.chapter]), {
          grade: item.grade,
          chapter: item.chapter,
        });
    const loaded = await Promise.all([
      ...(missingIds.length
        ? [navigation({ unitIds: missingIds.join(",") }, signal)]
        : []),
      ...[...paths.values()].map((path) => navigation(path, signal)),
    ]);
    const units = new Map(
      [
        ...ids.flatMap((id) => (unitsById.has(id) ? [unitsById.get(id)!] : [])),
        ...loaded.flatMap((value) => value.units),
      ].map((unit) => [unit.id, unit]),
    );
    return toScopes([...units.values()]);
  }

  async function demandScopes(
    ids: readonly string[],
    recent: boolean,
    signal: AbortSignal,
  ) {
    if (!ids.length) return [];
    const params = new URLSearchParams(options.filters);
    params.set("identity", "question");
    params.set("view", "scope-counts");
    params.set("unitIds", [...new Set(ids)].sort().join(","));
    params.set("families", "1");
    if (recent) params.set("recent", "1");
    const key = `${endpoint()}:${params}`;
    const cached = options.availabilityCache?.get(key);
    let pending =
      cached && cached.expires > Date.now() ? cached.pending : undefined;
    if (!pending) {
      pending = request<unknown>(
        `${endpoint()}/sources`,
        options.availabilityCache ? undefined : signal,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.fromEntries(params)),
        },
      ).then((value) => unifiedBankScopeCountsSchema.parse(value));
      if (options.availabilityCache) {
        const entry = { expires: Infinity, pending };
        if (options.availabilityCache.size >= 8)
          options.availabilityCache.delete(
            options.availabilityCache.keys().next().value!,
          );
        options.availabilityCache.set(key, entry);
        const cache = options.availabilityCache;
        pending.then(
          () => {
            entry.expires = Date.now() + 15000;
          },
          () => {
            if (cache.get(key) === entry) cache.delete(key);
          },
        );
      }
    }
    const missingIds = ids.filter((id) => !unitsById.has(id));
    const [inventory] = await Promise.all([
      pending,
      missingIds.length
        ? navigation({ unitIds: missingIds.join(",") }, signal)
        : undefined,
    ]);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const counts = unifiedBankScopeCountsSchema.parse(inventory);
    requireQuestionRead(counts);
    return toScopes(
      ids.flatMap((id) => (unitsById.has(id) ? [unitsById.get(id)!] : [])),
      Object.fromEntries(
        ids.map((id) => [
          id,
          (distinct ? counts.unitFamilies : counts.unitCounts)[id] ?? 0,
        ]),
      ),
      distinct ? "갈래" : undefined,
    );
  }

  function eligible(items: StudioProblem[]) {
    if (
      items.some(
        (item) =>
          item.eligible !== true ||
          (item.questionFormats && !selectedQuestionFormat(item)),
      )
    )
      throw new Error(
        "출제할 수 없는 문항이 있습니다. 문항을 다시 선택해 주세요.",
      );
    if (new Set(items.map(questionIdentity)).size !== items.length)
      throw new Error("중복 문항이 있습니다. 문항을 다시 선택해 주세요.");
    return items;
  }

  return {
    requireScopeCounts: true,
    ...(options.deferScopes
      ? {
          scopeNavigation: {
            groups: async (signal: AbortSignal) => {
              const value = await navigation({}, signal);
              return value.grades.map((label) => ({
                label,
                count: value.gradeCounts?.[label],
              }));
            },
            details: async (group: string, signal: AbortSignal) => {
              const value = await navigation({ grade: group }, signal);
              return value.chapters.map((label) => ({
                label,
                count: value.chapterCounts?.[label],
              }));
            },
            lessons: async (
              group: string,
              detail: string,
              signal: AbortSignal,
            ) =>
              toScopes(
                (await navigation({ grade: group, chapter: detail }, signal))
                  .units,
              ),
            restore: restoreCurriculum,
          },
        }
      : {}),
    questionFormats: {
      options: (item) => item.questionFormats ?? [],
      async load(item, option, signal) {
        const params = new URLSearchParams({
          identity: "question",
          view: "page",
          ids: option.problemId,
          pageSize: "1",
        });
        const data = await request<BankData>(`${endpoint()}?${params}`, signal);
        requireQuestionRead(data);
        const actual = data.problems.find((row) => row.id === option.problemId);
        if (!actual)
          throw new Error(
            "선택한 실제 표현을 찾지 못했습니다. 기존 선택은 유지됩니다.",
          );
        return assertQuestionFormat(item, option, eligible([actual])[0]);
      },
    },
    // W4 «구성 조건» — 난이도 의도는 우리 사다리, 최근 출제 빼기는 D-20 의 14일 그대로.
    conditions: {
      ladder: DIFFICULTY_LADDER,
      recentDays: DUPLICATE_EXCLUSION_DAYS,
    },
    compareReplace: true,
    ...(initialScopes ? { initialScopes } : {}),
    async loadScopes(signal, scopeOptions) {
      if (options.deferScopes)
        return demandScopes(
          scopeOptions?.scopeIds ?? [],
          scopeOptions?.excludeRecent === true,
          signal,
        );
      const recent = scopeOptions?.excludeRecent === true;
      const params = new URLSearchParams(options.filters);
      params.set("identity", "question");
      params.set("view", "available");
      // 최근 출제 빼기 — 계정의 시험지는 서버가 찾는다(id 목록을 싣지 않는다).
      if (recent) params.set("recent", "1");
      // D-111: a sheet takes one problem per family, so the gate is families.
      params.set("families", "1");
      const inventoryKey = `${endpoint()}:${params}`;
      const readInventory = async () => {
        const value = bankSourceAvailabilitySchema.parse(
          await request<unknown>(
            `${endpoint()}/sources`,
            options.availabilityCache ? undefined : signal,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(Object.fromEntries(params)),
            },
          ),
        );
        requireQuestionRead(value);
        return value;
      };
      const cached = options.availabilityCache?.get(inventoryKey);
      let pending =
        cached && cached.expires > Date.now() ? cached.pending : undefined;
      if (!pending) {
        pending = readInventory();
        if (options.availabilityCache) {
          const entry = { expires: Infinity, pending };
          if (options.availabilityCache.size >= 8)
            options.availabilityCache.delete(
              options.availabilityCache.keys().next().value!,
            );
          options.availabilityCache.set(inventoryKey, entry);
          const cache = options.availabilityCache;
          pending.then(
            () => {
              entry.expires = Date.now() + 15000;
            },
            () => {
              if (cache.get(inventoryKey) === entry) cache.delete(inventoryKey);
            },
          );
        }
      }
      const [inventory, curriculum] = await Promise.all([
        pending,
        loadCurriculum(signal),
      ]);
      const available = bankSourceAvailabilitySchema.parse(inventory);
      requireQuestionRead(available);
      if (!curriculum.units)
        throw new Error("단원 목록을 불러오지 못했습니다.");
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      options.onAvailability?.(available);
      if (!distinct)
        return toScopes(
          curriculum.units,
          available.facets
            ? Object.fromEntries(
                curriculum.units.map((unit) => [
                  unit.id,
                  available.facets!.units[unit.id]?.available ?? 0,
                ]),
              )
            : undefined,
        );
      // Never fall back to row counts: rows overstate what one sheet can hold.
      const families = available.facets?.unitFamilies;
      return toScopes(
        curriculum.units,
        families
          ? Object.fromEntries(
              curriculum.units.map((unit) => [unit.id, families[unit.id] ?? 0]),
            )
          : undefined,
        "갈래",
      );
    },
    async list(input, signal) {
      if (!input.scopeIds.length) return { items: [], total: 0 };
      const params = new URLSearchParams(options.filters);
      params.set("identity", "question");
      params.set("unitIds", [...new Set(input.scopeIds)].join(","));
      params.set("view", "page");
      params.set("page", String(input.page));
      params.set("pageSize", String(input.pageSize));
      if (input.difficulty) params.set("difficulty", input.difficulty);
      if (input.query.trim()) params.set("q", input.query.trim());
      if (input.excludeIds.length)
        params.set("excludeIds", [...new Set(input.excludeIds)].join(","));
      if (distinct && input.excludeFamiliesOf?.length)
        params.set(
          "excludeFamiliesOf",
          [...new Set(input.excludeFamiliesOf)].join(","),
        );
      if (input.excludeRecent) params.set("recent", "1");
      // 같은 문항류 층(W3) — 형제는 그 문항류 자체라 «1문항만»을 꺼도 물을 수 있다.
      if (input.familyOf) params.set("familyOf", input.familyOf);
      const data =
        params.toString().length > 3000
          ? await request<BankData>(endpoint(), signal, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(Object.fromEntries(params)),
            })
          : await request<BankData>(`${endpoint()}?${params}`, signal);
      requireQuestionRead(data);
      return {
        items: data.page === input.page ? eligible(data.problems) : [],
        total: data.total,
      };
    },
    async compose(allocations, signal, composeOptions) {
      const positive = allocations.filter(
        (allocation) => allocation.count !== 0,
      );
      if (!positive.length) return [];
      const data = await request<{
        countUnit?: "question";
        status?: "complete" | "insufficient" | "search_limit";
        problems: StudioProblem[];
        difficulty?: { tier: string; requested: number; actual: number }[];
        formats?: { format: string; requested: number; actual: number }[];
      }>(`${endpoint()}/random`, signal, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identity: "question",
          ...(options.filters ? { filters: options.filters } : {}),
          ...(distinct ? {} : { distinctFamilies: false }),
          ...(composeOptions?.excludeRecent ? { recent: true } : {}),
          ...(composeOptions?.difficulty
            ? { difficulty: composeOptions.difficulty }
            : {}),
          ...(composeOptions?.formats
            ? { formats: composeOptions.formats }
            : {}),
          ...(composeOptions?.excludeIds?.length
            ? { excludeIds: composeOptions.excludeIds }
            : {}),
          allocations: positive.map(({ scopeId, count }) => ({
            unitId: scopeId,
            count,
          })),
        }),
      });
      requireQuestionRead(data);
      if (data.status === "search_limit")
        throw new Error(
          "조건에 맞는 구성을 끝까지 확인하지 못했습니다. 재고 부족이 확정된 결과는 아닙니다. 현재 문항과 입력은 유지했습니다.",
        );
      const items = eligible(data.problems);
      if (!data.difficulty && !data.formats) return items;
      return {
        items,
        notes: [
          ...(data.difficulty ?? [])
            .filter((tier) => tier.actual < tier.requested)
            .map(
              (tier) =>
                `${tier.tier} ${tier.requested}문항 중 ${tier.actual}문항만 구성했습니다 — 다른 난이도로 채우지 않았습니다.`,
            ),
          ...(data.formats ?? [])
            .filter((row) => row.actual < row.requested)
            .map(
              (row) =>
                `${row.format} ${row.requested}문항 중 ${row.actual}문항만 구성했습니다 — 다른 형식으로 채우지 않았습니다.`,
            ),
        ],
      };
    },
    info(item) {
      return {
        id: item.id,
        questionId: item.questionId,
        scopeId: scopeId(item),
        familyId: !distinct
          ? undefined
          : familyIdOf({
              id: item.id,
              unitId: scopeId(item),
              familyKey: (item as StudioProblem & { familyKey?: string | null })
                .familyKey,
            }),
        scopeLabel: item.section,
        difficulty: item.difficulty,
        format: formatOf(item),
        origin:
          typeof item.source === "string" && item.source in SOURCE_LABEL
            ? SOURCE_LABEL[item.source as keyof typeof SOURCE_LABEL]
            : undefined,
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
    async resolveIdentity(items, signal) {
      const bankItems = items.filter((item) => !localCrop(item));
      if (!bankItems.length) return items;
      const params = new URLSearchParams({
        identity: "question",
        view: "page",
        ids: bankItems.map((item) => item.id).join(","),
        pageSize: String(bankItems.length),
      });
      const data = await request<BankData>(`${endpoint()}?${params}`, signal);
      requireQuestionRead(data);
      const byId = new Map(data.problems.map((item) => [item.id, item]));
      if (bankItems.some((item) => !byId.get(item.id)?.questionId))
        throw new Error(
          "저장된 실제 문항의 현재 연결을 확인하지 못했습니다. 입력은 유지했습니다.",
        );
      return items.map((item) => {
        const current = byId.get(item.id);
        if (
          current &&
          !item.questionId &&
          [
            "content",
            "answer",
            "solution",
            "figureSvg",
            "figureUrls",
            "figureDims",
            "figureSourceMm",
            "choiceFigureIndex",
          ].some(
            (key) =>
              JSON.stringify(item[key as keyof StudioProblem] ?? null) !==
              JSON.stringify(current[key as keyof StudioProblem] ?? null),
          )
        )
          throw new Error(
            "저장 당시와 현재 내용이 다른 문항이 있습니다. 저장본은 유지했습니다. 새 편집에서 문항을 다시 선택해 주세요.",
          );
        return !current || item.questionId
          ? item
          : {
              ...item,
              questionId: current.questionId,
              questionFormats: current.questionFormats,
            };
      });
    },
    async prepareOutput(items, signal) {
      if (!items.length) return [];
      if (items.length > MATH_EXAM_MAX_QUESTIONS)
        throw new Error("한 번에 100문항까지 출력할 수 있습니다.");
      if (new Set(items.map(questionIdentity)).size !== items.length)
        throw new Error("중복 문항이 있습니다. 문항을 다시 선택해 주세요.");
      // Old saved drafts predate the eligibility field; the fresh server rows,
      // rather than a cached flag, decide whether they can still be printed.
      const bankItems = items.filter((item) => !localCrop(item));
      if (!bankItems.length) return items;
      // Save validation also uses a fresh source without calling loadScopes first.
      // Resolve legacy labels here before comparing them with the current bank row.
      if (bankItems.some((item) => !scopeId(item)))
        await restoreCurriculum(bankItems, signal);
      if (bankItems.some((item) => !scopeId(item)))
        throw new Error(SCOPE_CHANGED_MESSAGE);
      if (
        bankItems.some(
          (item) => item.questionFormats && !selectedQuestionFormat(item),
        )
      )
        throw new Error(
          "출제할 실제 형식을 확인하지 못했습니다. 문항을 다시 선택해 주세요.",
        );
      const check = bankCheckResponseSchema.parse(
        await request<unknown>(`${endpoint()}/check`, signal, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ids: bankItems.map((item) => item.id),
            ...(bankItems.every((item) => selectedQuestionFormat(item))
              ? {
                  selections: bankItems.map((item) =>
                    selectedQuestionFormat(item)!,
                  ),
                }
              : {}),
          }),
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
      if (
        bankItems.some((original) => {
          const current = check.items.find((row) => row.id === original.id);
          return (
            !current ||
            (scopeId(original) && current.unitId !== scopeId(original)) ||
            (typeof original.source === "string" &&
              current.source !== original.source)
          );
        })
      )
        throw new Error(SCOPE_CHANGED_MESSAGE);
      // Validation never refreshes a saved payload into today's content. A chosen
      // representation is kept whole; revision conflicts require an explicit choice.
      return items;
    },
  };
}
