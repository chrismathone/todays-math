import { z } from "zod";
import { courseLearnerSchema, courseRecord } from "./progress";
import type { CourseStore } from "./types";

export const COURSE_STORAGE_KEY = "todaymath-elementary-course-v1";

const MAX_SERIALIZED_LENGTH = 4_000_000;
const CORRUPT_WARNING =
  "저장된 초등 학습 기록을 읽을 수 없어 임시 학습으로 시작합니다. 기존 기록은 덮어쓰지 않습니다.";
const UNSUPPORTED_WARNING =
  "다른 버전의 초등 학습 기록이 있습니다. 기존 기록을 보호하기 위해 저장하지 않습니다.";
const UNAVAILABLE_WARNING =
  "이 환경에서는 초등 학습 기록을 저장할 수 없습니다. 창을 닫으면 이번 학습 기록이 사라질 수 있습니다.";
const INVALID_WARNING =
  "초등 학습 기록의 형식이 올바르지 않아 저장하지 않았습니다. 기존 기록은 유지됩니다.";

const learnerId = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (value) =>
      !["__proto__", "prototype", "constructor"].includes(value) &&
      !/[\u0000-\u001f\u007f]/.test(value),
  );
const storeSchema = z.strictObject({
  version: z.literal(1),
  learners: courseRecord(learnerId, courseLearnerSchema).refine(
    (learners) => Object.keys(learners).length <= 12,
  ),
});

function emptyStore(): CourseStore {
  return { version: 1, learners: {} };
}

function resolveStorage(storage?: Storage): Storage | null {
  return (
    storage ?? (typeof window === "undefined" ? null : window.localStorage)
  );
}

function parseStore(raw: string): {
  store: CourseStore | null;
  warning: string | null;
} {
  try {
    if (raw.length > MAX_SERIALIZED_LENGTH)
      return { store: null, warning: CORRUPT_WARNING };
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      "version" in value &&
      value.version !== 1
    )
      return { store: null, warning: UNSUPPORTED_WARNING };
    const parsed = storeSchema.safeParse(value);
    return parsed.success
      ? { store: parsed.data as CourseStore, warning: null }
      : { store: null, warning: CORRUPT_WARNING };
  } catch {
    return { store: null, warning: CORRUPT_WARNING };
  }
}

export function loadCourseStore(storage?: Storage): {
  store: CourseStore;
  warning: string | null;
} {
  try {
    const target = resolveStorage(storage);
    if (!target) return { store: emptyStore(), warning: UNAVAILABLE_WARNING };
    const raw = target.getItem(COURSE_STORAGE_KEY);
    if (raw === null) return { store: emptyStore(), warning: null };
    const result = parseStore(raw);
    return { store: result.store ?? emptyStore(), warning: result.warning };
  } catch {
    return { store: emptyStore(), warning: UNAVAILABLE_WARNING };
  }
}

export function saveCourseStore(
  store: CourseStore,
  storage?: Storage,
): { ok: boolean; warning: string | null } {
  try {
    if (!storeSchema.safeParse(store).success)
      return { ok: false, warning: INVALID_WARNING };
    const target = resolveStorage(storage);
    if (!target) return { ok: false, warning: UNAVAILABLE_WARNING };
    const previous = target.getItem(COURSE_STORAGE_KEY);
    if (previous !== null) {
      const parsed = parseStore(previous);
      if (!parsed.store) return { ok: false, warning: parsed.warning };
    }
    const serialized = JSON.stringify(store);
    if (serialized.length > MAX_SERIALIZED_LENGTH)
      return {
        ok: false,
        warning:
          "초등 학습 기록이 저장 한도를 초과했습니다. 이전 기록은 유지됩니다.",
      };
    target.setItem(COURSE_STORAGE_KEY, serialized);
    return { ok: true, warning: null };
  } catch (error) {
    const name =
      error && typeof error === "object" && "name" in error ? error.name : "";
    return {
      ok: false,
      warning:
        name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
          ? "브라우저 저장 공간이 부족해 이번 변경을 저장하지 못했습니다. 이전 기록은 유지됩니다."
          : UNAVAILABLE_WARNING,
    };
  }
}
