/**
 * 개별 진도에서 **반 진도**를 유도한다 (원장님 확정 2026-08-25).
 *
 * ## 왜 필요한가
 *
 * 원장님: *「에이와에 반 진도는 없어. 개별 진도만 존재할뿐.」* 그런데 우리 쪽에서
 * 진도를 **읽는 자리는 세 곳**이고 셋 다 반 진도(`studentId: null`)만 본다:
 *   · `GET /api/progress`  · `GET /api/tests/default-range`  · `generateDraftTest`
 * 그래서 동기화가 개별 진도를 아무리 채워도 화면은 「어제 진도가 비어 있습니다」였고
 * 출제는 404 였다.
 *
 * 읽는 쪽 셋을 각각 고치면 **규칙이 세 벌**이 된다 — 한쪽만 고치면 갈라지고,
 * 갈라진 것은 아무도 못 본다(이 저장소가 여러 번 겪은 자리). 그래서 **쓰는 쪽에서
 * 한 번** 유도한다.
 *
 * ## 언제 유도하나 — 단체진도반일 때만
 *
 * 원장님: *「이 반은 전부 진도가 같으면 오히려 테스트하기에 합리적이네. 하지만
 * 개별진도반도 존재하긴해.」*
 *
 * 그래서 **모든 학생의 최신 단원이 하나로 모일 때만** 반 진도를 만든다. 갈리면
 * 만들지 않고 «갈렸다»고 보고한다 — 그 반은 개별진도반이고, 임의로 하나를 고르면
 * 뒤처진 학생이 못 푸는 시험지가 나간다. **못 가르는 것은 만들지 않는 쪽으로 둔다.**
 *
 * ## 🔴 `eywaReportId` 를 왜 반 id 로 쓰나
 *
 * 동기화는 매 실행 `eywaReportId IS NOT NULL` 인 진도를 **전부 지우고 다시 쓴다.**
 * 유도한 반 행도 그 청소에 들어가야 낡은 행이 안 쌓인다 — 그래서 NULL 로 둘 수 없다
 * (NULL 은 스키마 주석대로 「화면에서 직접 기록」이라 원장님 손 입력과 섞인다).
 *
 * 컬럼이 `@db.Uuid` 라 `class:xxx` 같은 표식은 못 넣는다. 그래서 **그 반의 eywa
 * 반 id**(UUID)를 그대로 쓴다 — 뜻도 맞고(이 행은 그 반에서 유도했다), 매 실행
 * 같은 값이라 지우고 다시 쓰기가 멱등이다.
 *
 * ⚠️ `@@unique([eywaReportId, unitId])` 라 **수업보고서 id 와 겹치면 실쓰기가 죽는다.**
 *    확률은 사실상 0이지만 조용히 틀리는 것보다 멈추는 게 낫다 —
 *    `assertNoIdCollision` 이 겹침을 먼저 잡는다.
 */

/** 유도의 입력 — 이미 만들어 둔 «학생 진도 행» 그대로. */
export interface StudentProgressRow {
  eywaReportId: string;
  unitId: string;
  classId: string;
  studentId: string;
  recordedAt: Date;
  createdAt: Date;
}

/** 우리 `classId` → 그 반의 **eywa 반 id**(유도 행의 표식이 된다). */
export type ClassIdToEywa = ReadonlyMap<string, string>;

export interface DerivedClassProgress {
  /** 실제로 만들 반 진도 행(`studentId` 는 null). */
  rows: Array<Omit<StudentProgressRow, "studentId"> & { studentId: null }>;
  /** 학생마다 최신 단원이 갈려 **만들지 않은** 반. 개별진도반으로 봐야 한다. */
  diverged: Array<{ classId: string; units: number; students: number }>;
}

/** 한 학생의 «최신» 진도 — 기록일이 같으면 나중에 적은 것. */
function latestOf(rows: StudentProgressRow[]): StudentProgressRow {
  return rows.reduce((best, row) => {
    if (row.recordedAt.getTime() !== best.recordedAt.getTime())
      return row.recordedAt > best.recordedAt ? row : best;
    return row.createdAt > best.createdAt ? row : best;
  });
}

/**
 * 반마다 학생들의 최신 단원이 하나로 모이면 반 진도 행을 만든다.
 *
 * 진도가 **한 건도 없는 반**은 만들지 않는다 — 「모두 같다」가 공허참이 되어
 * 없는 진도를 지어내면 안 된다.
 */
export function deriveClassProgress(
  studentRows: readonly StudentProgressRow[],
  classToEywa: ClassIdToEywa,
): DerivedClassProgress {
  const byClass = new Map<string, Map<string, StudentProgressRow[]>>();
  for (const row of studentRows) {
    const students = byClass.get(row.classId) ?? new Map();
    const list = students.get(row.studentId) ?? [];
    list.push(row);
    students.set(row.studentId, list);
    byClass.set(row.classId, students);
  }

  const rows: DerivedClassProgress["rows"] = [];
  const diverged: DerivedClassProgress["diverged"] = [];

  for (const [classId, students] of byClass) {
    const latests = [...students.values()].map(latestOf);
    if (latests.length === 0) continue;

    const units = new Set(latests.map((r) => r.unitId));
    if (units.size !== 1) {
      diverged.push({ classId, units: units.size, students: latests.length });
      continue;
    }

    const eywaClassId = classToEywa.get(classId);
    // 표식을 못 만들면 유도하지 않는다 — 청소되지 않는 행을 남기느니 없는 게 낫다.
    if (!eywaClassId) continue;

    const newest = latestOf(latests);
    rows.push({
      eywaReportId: eywaClassId,
      unitId: newest.unitId,
      classId,
      studentId: null,
      recordedAt: newest.recordedAt,
      createdAt: newest.createdAt,
    });
  }

  return { rows, diverged };
}

/**
 * 유도 행의 표식(eywa 반 id)이 **수업보고서 id 와 겹치는가**.
 *
 * 겹치면 `@@unique([eywaReportId, unitId])` 때문에 실쓰기가 죽거나 — 더 나쁘게 —
 * 같은 단원이면 한 행이 다른 행을 밀어낸다. 그러니 **쓰기 전에** 잡는다.
 */
export function assertNoIdCollision(
  studentRows: readonly StudentProgressRow[],
  derived: DerivedClassProgress["rows"],
): void {
  const reportIds = new Set(studentRows.map((r) => r.eywaReportId));
  const clash = derived.filter((r) => reportIds.has(r.eywaReportId));
  if (clash.length === 0) return;
  throw new Error(
    `유도한 반 진도의 표식이 수업보고서 id 와 겹친다 (${clash.length}건: ` +
      `${clash.map((c) => c.eywaReportId).join(", ")}). ` +
      `표식을 다른 값으로 바꾸기 전에는 쓰지 않는다 — 겹치면 한 행이 다른 행을 밀어낸다.`,
  );
}
