import type {
  ClassEntity,
  ProgressEntity,
  ProgressSuggestion,
} from "@/contracts/class.contract";
import type { WeeklyMetrics } from "@/contracts/metrics.contract";
import type { TestEntity } from "@/contracts/test.contract";
import type { UnitEntity } from "@/contracts/unit.contract";

export type MainDashboardData = {
  classes: ClassEntity[];
  tests: TestEntity[];
  progressByClass: Record<string, ProgressEntity | null>;
  /**
   * 반 진도가 **없는** 반의 시작점 제안 — 「차시이동」 화살표가 죽지 않게 한다.
   * 🔴 제안은 진도가 아니다. 저장된 것이 아니라 «여기서부터 보라»는 힌트다.
   */
  suggestByClass: Record<string, ProgressSuggestion | null>;
  units: UnitEntity[];
  metrics: WeeklyMetrics;
};

async function loadContracts() {
  const [cls, test, unit, metrics] = await Promise.all([
    import("@/contracts/class.contract"),
    import("@/contracts/test.contract"),
    import("@/contracts/unit.contract"),
    import("@/contracts/metrics.contract"),
  ]);
  return {
    classListResponseSchema: cls.classListResponseSchema,
    progressResponseSchema: cls.progressResponseSchema,
    progressSuggestResponseSchema: cls.progressSuggestResponseSchema,
    testListResponseSchema: test.testListResponseSchema,
    unitListResponseSchema: unit.unitListResponseSchema,
    metricsResponseSchema: metrics.metricsResponseSchema,
  };
}

async function parseOk<T>(
  res: Response,
  parse: (json: unknown) => T,
): Promise<T> {
  if (!res.ok) {
    throw new Error("목록을 불러오지 못했습니다");
  }
  return parse(await res.json());
}

export async function loadMainDashboard(): Promise<MainDashboardData> {
  // 네 개의 응답과 **동시에** 계약 스키마를 불러온다 (성능 수리 C-1).
  // 정적 import 면 zod + 계약 모듈(279KB)이 메인 화면 초기 번들에 실려 첫 페인트를
  // 막는데, 검증은 응답이 온 뒤에나 쓰인다. 검증 자체는 하나도 줄이지 않는다.
  const [classesRes, testsRes, unitsRes, metricsRes, contracts] =
    await Promise.all([
      fetch("/api/classes?page=1&pageSize=100"),
      fetch("/api/tests?page=1&pageSize=100"),
      fetch("/api/units"),
      fetch("/api/metrics"),
      loadContracts(),
    ]);
  const {
    classListResponseSchema,
    progressResponseSchema,
    progressSuggestResponseSchema,
    testListResponseSchema,
    unitListResponseSchema,
    metricsResponseSchema,
  } = contracts;

  const classesBody = await parseOk(classesRes, (json) =>
    classListResponseSchema.parse(json),
  );
  const testsBody = await parseOk(testsRes, (json) =>
    testListResponseSchema.parse(json),
  );
  const unitsBody = await parseOk(unitsRes, (json) =>
    unitListResponseSchema.parse(json),
  );
  const metricsBody = await parseOk(metricsRes, (json) =>
    metricsResponseSchema.parse(json),
  );

  const progressEntries = await Promise.all(
    classesBody.data.map(async (cls) => {
      const res = await fetch(`/api/progress?classId=${cls.id}`);
      if (res.status === 204 || res.status === 404) {
        // 반 진도가 없으면 **시작점만** 물어본다 — 없으면 차시이동이 죽는다.
        // 실패해도 화면 전체를 죽이지 않는다(제안은 있으면 좋은 것이지 필수가 아니다).
        try {
          const hint = await fetch(`/api/progress/suggest?classId=${cls.id}`);
          if (!hint.ok) return [cls.id, null, null] as const;
          const body = progressSuggestResponseSchema.parse(await hint.json());
          return [cls.id, null, body.data] as const;
        } catch {
          return [cls.id, null, null] as const;
        }
      }
      if (!res.ok) throw new Error("진도를 불러오지 못했습니다");
      const body = progressResponseSchema.parse(await res.json());
      return [cls.id, body.data, null] as const;
    }),
  );

  return {
    classes: classesBody.data,
    tests: testsBody.data,
    progressByClass: Object.fromEntries(
      progressEntries.map(([id, progress]) => [id, progress]),
    ),
    suggestByClass: Object.fromEntries(
      progressEntries.map(([id, , suggest]) => [id, suggest]),
    ),
    units: unitsBody.data,
    metrics: metricsBody.data,
  };
}
