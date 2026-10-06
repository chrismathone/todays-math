import {
  storedFadingSchema,
  type StoredFading,
} from "@/contracts/fading.contract";
import {
  fadingTeacherDashboardSchema,
  fadingTeacherStudentSchema,
  type FadingTeacherDashboard,
  type FadingTeacherStudent,
} from "@/contracts/fadingTeacher.contract";
import { fadingConceptDigest, type FadingConcept } from "@/lib/fading/concepts";
import { fadingDateOf, fadingDayOfDate } from "@/lib/fading/schedule";
import { emptyFading, pickFadingConcept } from "@/lib/fading/state";
import {
  FADING_IDLE_FLAG_DAYS,
  FADING_NOT_STARTED_GRACE_DAYS,
  FADING_OVERDUE_FLAG_DAYS,
  FADING_OVERDUE_FLAG_CONCEPTS,
  FADING_TEACHER_POLICY,
  fadingTeacherConcepts,
  fadingTeacherSummary,
} from "@/lib/fading/teacher";
import { teacherWireKey } from "./wireKey";

/** Wire 전용. 저장 기록을 만든 뒤 제품 함수로 계산한다. 요약 숫자·사유를 직접 적지 않는다. */
export type TeacherWireFixture = {
  dashboard: FadingTeacherDashboard;
  details: Record<string, FadingTeacherStudent>;
};
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const TODAY = "2026-10-06";
type Profile =
  "active" | "no-account" | "not-started" | "overdue" | "idle" | "both";

function buildRecord(
  concepts: readonly FadingConcept[],
  profile: Profile,
): StoredFading {
  const ago = (n: number) => fadingDateOf(fadingDayOfDate(TODAY) - n);
  if (profile === "no-account") return emptyFading();
  if (profile === "not-started") {
    return concepts
      .slice(0, 2)
      .reduce(
        (record, c) => pickFadingConcept(record, c.id, ago(4)),
        emptyFading(),
      );
  }
  const idle = profile === "idle" || profile === "both";
  const late = profile === "overdue" || profile === "both";
  const lastOn = idle ? ago(FADING_IDLE_FLAG_DAYS + 1) : TODAY;
  const selected = concepts.slice(
    0,
    Math.max(4, FADING_OVERDUE_FLAG_CONCEPTS + 1),
  );
  const record = emptyFading();
  for (const [i, c] of selected.entries()) {
    if (i === selected.length - 1) {
      record.concepts[c.id] = pickFadingConcept(
        emptyFading(),
        c.id,
        ago(15),
      ).concepts[c.id]!;
      continue;
    }
    const dueOn = late ? ago(FADING_OVERDUE_FLAG_DAYS + i) : ago(-2 - i);
    record.concepts[c.id] = {
      step: i === 0 ? 2 : i === 1 ? 3 : 4,
      stability: 4 + i,
      difficulty: 5,
      reviewedOn: ago(12),
      dueOn,
      digest: fadingConceptDigest(c),
      reviews: 2,
      lapses: i === 0 ? 1 : 0,
      addedOn: ago(15),
    };
  }
  record.days = [
    { date: ago(12), reviews: 3, passed: 2, fresh: 3 },
    { date: lastOn, reviews: 3, passed: 3, fresh: 0 },
  ];
  record.streak = { current: 1, best: 3, lastOn };
  return storedFadingSchema.parse(record);
}

/** 개념 내용은 서버에서 받아 계산에만 쓰고, 반환에는 이름·상태만 남긴다. */
export function buildTeacherWireFixture(
  catalog: readonly FadingConcept[],
): TeacherWireFixture {
  if (catalog.length < 4)
    throw new Error("Wire 표본을 만들 개념이 부족합니다.");
  const classes = [
    { id: uuid(100), name: "준비반" },
    { id: uuid(101), name: "개별반" },
    { id: uuid(102), name: "중1 정규반" },
    { id: uuid(103), name: "상태 확인반" },
  ];
  const names = [
    "김하윤",
    "이도윤",
    "박서연",
    "최지우",
    "정민준",
    "강수아",
    "윤지호",
    "임유나",
    "한시우",
    "오예린",
  ];
  const profiles: Profile[] = [
    "active",
    "overdue",
    "no-account",
    "not-started",
    "idle",
    "both",
  ];
  const concepts = new Map(catalog.map((c) => [c.id, c]));
  const known = new Set(concepts.keys());
  const students: FadingTeacherDashboard["students"] = [];
  const details: TeacherWireFixture["details"] = {};
  const add = (
    n: number,
    name: string,
    classIndex: number,
    profile: Profile,
  ) => {
    const cls = classes[classIndex]!;
    const account = {
      hasAccount: profile !== "no-account",
      createdOn: fadingDateOf(
        fadingDayOfDate(TODAY) - FADING_NOT_STARTED_GRACE_DAYS - 1,
      ),
    };
    const record = storedFadingSchema.parse(buildRecord(catalog, profile));
    const summary = fadingTeacherSummary(record, TODAY, account, known);
    const row = {
      id: uuid(n),
      name,
      classId: cls.id,
      className: cls.name,
      classGrade: "중1",
      hasAccount: account.hasAccount,
      summary,
    };
    students.push(row);
    details[teacherWireKey(row.id, cls.id)] = fadingTeacherStudentSchema.parse({
      today: TODAY,
      policy: FADING_TEACHER_POLICY,
      student: {
        id: row.id,
        name,
        classId: cls.id,
        className: cls.name,
        hasAccount: row.hasAccount,
      },
      summary,
      concepts: fadingTeacherConcepts(record, concepts, TODAY),
      days: record.days,
    });
  };
  add(1, names[0]!, 1, "active");
  for (let i = 0; i < 30; i += 1) {
    const name =
      i < names.length ? names[i]! : `학생 ${String(i + 1).padStart(2, "0")}`;
    add(i + 1, name, 2, profiles[i % profiles.length]!);
  }
  ["no-account", "not-started", "overdue", "idle"].forEach((profile, i) => {
    add(
      31 + i,
      ["김서준", "이하은", "박지안", "최서우"][i]!,
      3,
      profile as Profile,
    );
  });
  return {
    dashboard: fadingTeacherDashboardSchema.parse({
      today: TODAY,
      policy: FADING_TEACHER_POLICY,
      management: { canOpen: true, branchId: uuid(200), branchRole: "owner" },
      classes,
      students,
    }),
    details,
  };
}
