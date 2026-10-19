import type {
  ClassEntity,
  ProgressEntity,
  ProgressSuggestion,
} from "@/contracts/class.contract";
import {
  canOutputFrom,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import type { WeeklyMetrics } from "@/contracts/metrics.contract";
import type { TestEntity } from "@/contracts/test.contract";
import type { UnitEntity } from "@/contracts/unit.contract";
import { fetchClasses } from "@/lib/class/classApi";

export type ReadStatus = "loading" | "ready" | "error" | "unavailable";
export type MainDashboardData = {
  classes: ClassEntity[];
  tests: TestEntity[];
  progressByClass: Record<string, ProgressEntity | null>;
  suggestByClass: Record<string, ProgressSuggestion | null>;
  units: UnitEntity[];
  metrics: WeeklyMetrics | null;
  progressStatusByClass?: Record<string, ReadStatus>;
  testsStatus?: ReadStatus;
  metricsStatus?: ReadStatus;
};

async function loadContracts() {
  const [test, unit, metrics] = await Promise.all([
    import("@/contracts/test.contract"),
    import("@/contracts/unit.contract"),
    import("@/contracts/metrics.contract"),
  ]);
  return {
    testListResponseSchema: test.testListResponseSchema,
    unitListResponseSchema: unit.unitListResponseSchema,
    metricsResponseSchema: metrics.metricsResponseSchema,
  };
}

async function read(path: string, signal?: AbortSignal): Promise<Response> {
  const deadline = AbortSignal.timeout(20_000);
  return fetch(path, {
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
}

async function parseOk<T>(
  res: Response,
  parse: (json: unknown) => T,
): Promise<T> {
  if (!res.ok) throw new Error("목록을 불러오지 못했습니다");
  return parse(await res.json());
}

/** Each class is an independent read. Failure never erases the other classes. */
export async function loadClassProgress(classId: string, signal?: AbortSignal) {
  const { progressResponseSchema, progressSuggestResponseSchema } =
    await import("@/contracts/class.contract");
  const response = await read(`/api/progress?classId=${classId}`, signal);
  if (response.status !== 204 && response.status !== 404) {
    const body = await parseOk(response, (json) =>
      progressResponseSchema.parse(json),
    );
    return { progress: body.data, suggestion: null };
  }
  try {
    const hint = await read(`/api/progress/suggest?classId=${classId}`, signal);
    if (!hint.ok) return { progress: null, suggestion: null };
    const body = progressSuggestResponseSchema.parse(await hint.json());
    return { progress: null, suggestion: body.data };
  } catch {
    if (signal?.aborted) throw signal.reason;
    return { progress: null, suggestion: null };
  }
}

export async function loadMainDashboard(
  options: {
    allowedMenus?: readonly WorkspaceMenu[];
    signal?: AbortSignal;
    onPartial?: (data: MainDashboardData) => void;
  } = {},
): Promise<MainDashboardData> {
  const { signal, onPartial, allowedMenus } = options;
  const canExport = allowedMenus === undefined || canOutputFrom(allowedMenus);
  const canSeeMetrics =
    allowedMenus === undefined || allowedMenus.includes("home");
  const [classes, unitsRes, contracts] = await Promise.all([
    fetchClasses({ signal }),
    read("/api/units", signal),
    loadContracts(),
  ]);
  const unitsBody = await parseOk(unitsRes, (json) =>
    contracts.unitListResponseSchema.parse(json),
  );
  let data: MainDashboardData = {
    classes,
    units: unitsBody.data,
    tests: [],
    metrics: null,
    progressByClass: {},
    suggestByClass: {},
    progressStatusByClass: Object.fromEntries(
      classes.map((cls) => [cls.id, "loading"]),
    ),
    testsStatus: canExport ? "loading" : "unavailable",
    metricsStatus: canSeeMetrics ? "loading" : "unavailable",
  };
  const publish = () => {
    if (!signal?.aborted) onPartial?.(data);
  };
  publish(); // First paint does not wait for per-class requests.

  const testsTask = !canExport
    ? Promise.resolve()
    : (async () => {
        try {
          const body = await parseOk(
            await read("/api/tests?page=1&pageSize=100", signal),
            (json) => contracts.testListResponseSchema.parse(json),
          );
          data = { ...data, tests: body.data, testsStatus: "ready" };
        } catch {
          data = { ...data, testsStatus: "error" };
        }
        publish();
      })();
  const metricsTask = !canSeeMetrics
    ? Promise.resolve()
    : (async () => {
        try {
          const body = await parseOk(
            await read("/api/metrics", signal),
            (json) => contracts.metricsResponseSchema.parse(json),
          );
          data = { ...data, metrics: body.data, metricsStatus: "ready" };
        } catch {
          data = { ...data, metricsStatus: "error" };
        }
        publish();
      })();
  let cursor = 0;
  const progressWorker = async () => {
    while (cursor < classes.length && !signal?.aborted) {
      const cls = classes[cursor++];
      try {
        const result = await loadClassProgress(cls.id, signal);
        data = {
          ...data,
          progressByClass: {
            ...data.progressByClass,
            [cls.id]: result.progress,
          },
          suggestByClass: {
            ...data.suggestByClass,
            [cls.id]: result.suggestion,
          },
          progressStatusByClass: {
            ...data.progressStatusByClass,
            [cls.id]: "ready",
          },
        };
      } catch {
        data = {
          ...data,
          progressStatusByClass: {
            ...data.progressStatusByClass,
            [cls.id]: "error",
          },
        };
      }
      publish();
    }
  };
  await Promise.all([
    testsTask,
    metricsTask,
    ...Array.from({ length: Math.min(6, classes.length) }, progressWorker),
  ]);
  if (signal?.aborted) throw signal.reason;
  return data;
}
