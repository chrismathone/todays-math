import type {
  ActivityDef,
  ActivityKind,
  ActivityRecord,
  AwardKind,
  CourseRecord,
  LabEvent,
  LabSave,
} from "./types";

export const LAB_SAVE_KEY = "todays-math-lab-v1";

const INDEPENDENT_KINDS: ActivityKind[] = [
  "apply",
  "error-hunt",
  "rhythm",
  "explain",
];

export function emptySave(): LabSave {
  return {
    v: 1,
    sound: false,
    reducedMotion: false,
    combo: 0,
    xp: 0,
    earned: [],
    courses: {},
    events: [],
  };
}

export function parseSave(raw: unknown): LabSave {
  const base = emptySave();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<LabSave>;
  if (s.v !== 1) return base;
  return {
    ...base,
    sound: Boolean(s.sound),
    reducedMotion: Boolean(s.reducedMotion),
    combo: Number(s.combo) || 0,
    xp: Number(s.xp) || 0,
    earned: Array.isArray(s.earned)
      ? s.earned.filter((x) => typeof x === "string")
      : [],
    courses: s.courses && typeof s.courses === "object" ? s.courses : {},
    events: Array.isArray(s.events) ? s.events.slice(-400) : [],
  };
}

export function loadSave(): LabSave {
  if (typeof window === "undefined") return emptySave();
  try {
    return parseSave(JSON.parse(localStorage.getItem(LAB_SAVE_KEY) ?? "null"));
  } catch {
    return emptySave();
  }
}

export function writeSave(save: LabSave) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAB_SAVE_KEY, JSON.stringify(save));
}

export function courseRecord(save: LabSave, courseId: string): CourseRecord {
  return save.courses[courseId] ?? { index: 0, activities: {} };
}

export function activityRecord(
  course: CourseRecord,
  activityId: string,
): ActivityRecord {
  return (
    course.activities[activityId] ?? {
      started: false,
      attempts: 0,
      wrongs: 0,
      hints: 0,
      independent: false,
      completed: false,
    }
  );
}

function awardKey(courseId: string, activityId: string, kind: AwardKind) {
  return `${courseId}:${activityId}:${kind}`;
}

export function startActivity(
  save: LabSave,
  courseId: string,
  activity: ActivityDef,
): LabSave {
  const course = courseRecord(save, courseId);
  const rec = activityRecord(course, activity.id);
  rec.started = true;
  course.activities[activity.id] = rec;
  save.courses[courseId] = course;
  const event: LabEvent = {
    at: Date.now(),
    courseId,
    activityId: activity.id,
    type: rec.attempts === 0 ? "start" : "resume",
    firstAttempt: rec.attempts === 0,
    usedHint: rec.hints > 0,
  };
  save.events.push(event);
  return save;
}

/** 도움을 한 번 쓴 기록. 순수 함수다 — 훅이 아니라서 이름이 `use` 로 시작하면 안 된다(rules-of-hooks). */
export function recordHint(
  save: LabSave,
  courseId: string,
  activityId: string,
): LabSave {
  const course = courseRecord(save, courseId);
  const rec = activityRecord(course, activityId);
  rec.hints += 1;
  rec.independent = false;
  course.activities[activityId] = rec;
  save.courses[courseId] = course;
  save.combo = 0;
  save.events.push({
    at: Date.now(),
    courseId,
    activityId,
    type: "hint",
    firstAttempt: rec.attempts === 0,
    usedHint: true,
  });
  return save;
}

export function applyAttempt(
  save: LabSave,
  courseId: string,
  activity: ActivityDef,
  ok: boolean,
  observe: boolean,
): { save: LabSave; xpDelta: number; awards: AwardKind[] } {
  const course = courseRecord(save, courseId);
  const rec = activityRecord(course, activity.id);
  const firstAttempt = rec.attempts === 0;
  rec.attempts += 1;
  if (!ok) rec.wrongs += 1;
  const awards: AwardKind[] = [];
  let xpDelta = 0;

  const grant = (kind: AwardKind, xp: number) => {
    const key = awardKey(courseId, activity.id, kind);
    if (save.earned.includes(key)) return;
    save.earned.push(key);
    save.xp += xp;
    xpDelta += xp;
    awards.push(kind);
  };

  if (ok) {
    if (observe) {
      rec.observeAt ??= Date.now();
      grant("observe", 10);
    }
    rec.correctAt ??= Date.now();
    rec.completed = true;
    grant("correct", 20);
    const independent =
      firstAttempt &&
      rec.hints === 0 &&
      INDEPENDENT_KINDS.includes(activity.kind);
    if (independent) {
      rec.independent = true;
      grant("independent", 0);
    }
    save.combo += 1;
  } else {
    save.combo = 0;
  }

  course.activities[activity.id] = rec;
  save.courses[courseId] = course;
  save.events.push({
    at: Date.now(),
    courseId,
    activityId: activity.id,
    type: "attempt",
    ok,
    firstAttempt,
    usedHint: rec.hints > 0,
  });
  return { save, xpDelta, awards };
}

export function setCourseIndex(
  save: LabSave,
  courseId: string,
  index: number,
): LabSave {
  const course = courseRecord(save, courseId);
  course.index = Math.max(0, index);
  save.courses[courseId] = course;
  return save;
}

export function courseCompleteCount(
  save: LabSave,
  activityIds: string[],
  courseId: string,
) {
  const course = courseRecord(save, courseId);
  return activityIds.filter((id) => course.activities[id]?.completed).length;
}
