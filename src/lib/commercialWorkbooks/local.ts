import type {
  WorkbookAssignment,
  WorkbookEditionDetail,
  WorkbookRosterClass,
  WorkbookWrongNote,
} from "@/contracts/commercialWorkbook.contract";
import { fail } from "./errors";
import { createCommercialWorkbookSource } from "./service";
import type { CommercialWorkbookSource } from "./source";
import type {
  WorkbookPolicy,
  WorkbookReceipt,
  WorkbookRun,
  WorkbookStore,
} from "./store";

export const COMMERCIAL_WORKBOOK_DEMO_ROSTER: WorkbookRosterClass[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "예시 수학반",
    students: [
      { id: "10000000-0000-4000-8000-000000000002", name: "예시 학생 가" },
      { id: "10000000-0000-4000-8000-000000000003", name: "예시 학생 나" },
    ],
  },
];
export interface LocalCommercialWorkbookOptions {
  seed?: boolean;
  roster?: WorkbookRosterClass[];
  policy?: WorkbookPolicy;
  actorId?: string;
  now?: () => string;
  newId?: () => string;
}
interface MemoryState {
  editions: Map<string, WorkbookEditionDetail>;
  assignments: Map<string, WorkbookAssignment>;
  notes: Map<string, WorkbookWrongNote>;
  receipts: Map<string, WorkbookReceipt>;
}
function memoryStore(state: MemoryState): WorkbookStore {
  return {
    listEditions: async () => [...state.editions.values()].reverse(),
    getEdition: async (id) => state.editions.get(id) ?? null,
    putEdition: async (value) => {
      state.editions.set(value.id, value);
    },
    listAssignments: async (after, limit = 21) => {
      const rows = [...state.assignments.values()].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );
      return rows
        .slice(after ? rows.findIndex((a) => a.id === after) + 1 : 0)
        .slice(0, limit);
    },
    getAssignment: async (id) => state.assignments.get(id) ?? null,
    insertAssignment: async (value) => {
      state.assignments.set(value.id, value);
    },
    appendGrade: async (assignmentId, studentId, event) => {
      const assignment = state.assignments.get(assignmentId)!;
      const target = assignment.targets.find((t) => t.studentId === studentId)!;
      target.revision = event.revision;
      target.history.push(event);
      for (const mark of event.marks) target.marks[mark.exerciseId] = mark.mark;
    },
    listNotes: async () => [...state.notes.values()].reverse(),
    getNote: async (id) => state.notes.get(id) ?? null,
    putNote: async (value) => {
      state.notes.set(value.id, value);
    },
    getReceipt: async (id) => state.receipts.get(id) ?? null,
    insertReceipt: async (value) => {
      state.receipts.set(value.requestId, value);
    },
  };
}
/** One source instance = one isolated demo, never localStorage or network. */
export function createLocalCommercialWorkbookSource(
  options: LocalCommercialWorkbookOptions = {},
): CommercialWorkbookSource {
  let state: MemoryState = {
    editions: new Map(),
    assignments: new Map(),
    notes: new Map(),
    receipts: new Map(),
  };
  const roster = structuredClone(
    options.roster ?? COMMERCIAL_WORKBOOK_DEMO_ROSTER,
  );
  const policy: WorkbookPolicy = options.policy ?? {
    assertTeacher: async () => {},
    listRoster: async () => structuredClone(roster),
    assertRoster: async (classId, studentIds) => {
      const cls = roster.find((c) => c.id === classId);
      if (
        !cls ||
        studentIds.some((id) => !cls.students.some((s) => s.id === id))
      )
        fail("SCOPE_CHANGED", "현재 담당 반·학생 범위를 확인해 주세요.");
      return {
        className: cls.name,
        students: cls.students.filter((s) => studentIds.includes(s.id)),
      };
    },
  };
  let queue: Promise<unknown> = Promise.resolve();
  const run: WorkbookRun = (write, work) => {
    const operation = queue.then(async () => {
      const draft = structuredClone(state);
      const raw = memoryStore(draft);
      // Repository reads return detached DTOs, matching JSON/SQL behavior.
      const store = Object.fromEntries(
        Object.entries(raw).map(([key, fn]) => [
          key,
          async (...args: unknown[]) =>
            structuredClone(
              await (fn as (...a: unknown[]) => Promise<unknown>)(...args),
            ),
        ]),
      ) as unknown as WorkbookStore;
      const result = await work({
        store,
        policy,
        actorId: options.actorId ?? "10000000-0000-4000-8000-000000000004",
        now: options.now ?? (() => new Date().toISOString()),
        newId: options.newId ?? (() => crypto.randomUUID()),
      });
      if (write) state = draft;
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  };
  const source = createCommercialWorkbookSource(run);
  const ready =
    options.seed === false
      ? Promise.resolve()
      : (async () => {
          const book = await source.createEdition({
            requestId: "demo-edition-001",
            metadata: {
              title: "직접 만든 연습 교재 · 예시",
              publisher: "직접 작성",
              grade: "초5",
              curriculum: "예시",
              edition: "데모 1판",
            },
            provenance: {
              kind: "teacher-authored",
              description:
                "화면 체험용으로 직접 작성한 가상 교재입니다. 실제 출판사 문항이나 정답을 포함하지 않습니다.",
            },
            exercises: ["6", "설명을 보고 교사가 확인", null, "3/4", "12"].map(
              (answerText, i) => ({
                address: {
                  volume: "본책",
                  section: "연습",
                  page: "10",
                  number: String(i + 1),
                  subpart: "",
                },
                key:
                  answerText === null
                    ? null
                    : {
                        answerText,
                        status: i === 1 ? "unreviewed" : "reviewed",
                      },
              }),
            ),
          });
          const cls = roster[0];
          if (!cls?.students.length) return;
          const assignment = await source.createAssignment({
            requestId: "demo-assignment-001",
            title: "예시 교재 확인 과제",
            editionId: book.id,
            expectedEditionRevision: book.revision,
            classId: cls.id,
            studentIds: cls.students.map((s) => s.id),
            exerciseIds: book.exercises.map((e) => e.id),
          });
          await source.saveMarks(assignment.id, {
            requestId: "demo-marks-001",
            studentId: cls.students[0].id,
            expectedRevision: 0,
            marks: [
              { exerciseId: book.exercises[0].id, mark: "correct" },
              { exerciseId: book.exercises[1].id, mark: "wrong" },
            ],
          });
        })();
  return Object.fromEntries(
    Object.entries(source).map(([key, fn]) => [
      key,
      async (...args: unknown[]) => {
        await ready;
        return (fn as (...a: unknown[]) => Promise<unknown>)(...args);
      },
    ]),
  ) as unknown as CommercialWorkbookSource;
}
