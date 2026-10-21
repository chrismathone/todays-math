// 3일차 탐험 시작이 만든 학생 기록이 계약의 어느 칸에서 막히는지 — 저장하지 않는다(읽기만).
import { randomUUID } from "node:crypto";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { db } from "@/lib/db";
import {
  planExpedition,
  updateExpedition,
} from "@/lib/math-explorers/expedition";
import {
  expeditionInitialCourseRecommendation,
  expeditionInitialPrerequisiteDecision,
  startExpedition,
} from "@/lib/math-explorers/expeditionStart";
import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";
import {
  updateDailyJourney,
  storedDailyJourneySchema,
} from "@/lib/math-srs/dailyJourney";
import { storedCourseSchema } from "@/lib/math-srs/courseAutomation";
import { storedExplorerSchema } from "@/contracts/mathExplorers.contract";
import { storedExpeditionSchema } from "@/contracts/mathExpedition.contract";
import { parseSrsState } from "@/lib/math-srs/serverState";

async function main() {
  if (!process.env.DATABASE_URL?.includes("127.0.0.1:54335"))
    throw new Error("local only");
  const days = Number(process.argv[2] ?? 2);
  const now = new Date(Date.now() + days * 86_400_000);
  const student = await db.student.findFirst({ where: { name: "검수학생" } });
  const { state } = await readSrsState(student!.id);
  const plan = planExpedition(state, student!.id, now);
  console.log(
    "plan",
    plan.kind,
    plan.route,
    plan.unitId,
    plan.title,
    plan.goal,
  );
  const rec =
    plan.kind === "elementary"
      ? expeditionInitialCourseRecommendation(state, plan, now)
      : null;
  const pre = expeditionInitialPrerequisiteDecision(state, plan, now);
  console.log("rec", rec, "pre", pre ? pre.kind : null);
  const candidates =
    rec && rec.mode !== "resume" && !pre
      ? await loadCourseBankCandidates(rec.sectionId)
      : [];
  let next;
  try {
    next = startExpedition(
      state,
      student!.id,
      now,
      randomUUID(),
      12345,
      () => randomUUID(),
      rec ? { sectionId: rec.sectionId, candidates } : null,
    );
  } catch (e) {
    console.log("start threw", (e as Error).message);
    return;
  }
  const merged = updateExpedition(
    state,
    updateDailyJourney(state, next),
    now,
    {},
  );
  console.log(
    "course.plan",
    JSON.stringify(merged.course?.plan),
    "session?",
    !!merged.course?.learner.session,
    "before course?",
    !!state.course,
  );
  for (const [name, schema, value] of [
    ["course", storedCourseSchema, merged.course],
    ["dailyJourney", storedDailyJourneySchema, merged.dailyJourney],
    ["explorers", storedExplorerSchema, merged.explorers],
    ["expedition", storedExpeditionSchema, merged.expedition],
  ] as const) {
    if (value === undefined) continue;
    const r = (
      schema as {
        safeParse: (v: unknown) => {
          success: boolean;
          error?: { issues: unknown[] };
        };
      }
    ).safeParse(value);
    console.log(
      name,
      r.success
        ? "ok"
        : JSON.stringify(r.error!.issues.slice(0, 5)).slice(0, 1500),
    );
  }
  try {
    parseSrsState(merged);
    console.log("whole ok");
  } catch (e) {
    console.log("whole fails", (e as Error).message);
  }
  await db.$disconnect();
}
main();
