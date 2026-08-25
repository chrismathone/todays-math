/**
 * 수업보고서를 **(반, 학생)** 으로 가른다 (원장님 지시 2026-08-25).
 *
 * ## 왜 반이 열쇠인가
 *
 * 원장님: *「한 학생이 2개의 진도를 동시에 나가게 되는 경우 반 구분을 잘해서 진도를
 * 당겨와야겠어. 지금 MS2A의 경우 본수업은 3-1을 진행중이고, 특강으로 3-2 진도를
 * 진행하는데 구분하지 않고 가져와서 3-2를 보고 있음.」* ·
 * *「학생이 여러 수업을 듣는경우 반별로 진도를 별개로 진행하기 때문에 잘 분리해서 봐야함.」*
 *
 * 예전에는 **학생 단위**로만 묶어 주반 하나에 몰아넣었다. 그러면 최신 보고서가
 * 이기므로 **특강 진도가 본수업을 덮는다.** 실측(2026-08-25): MS2A 학생들의 최근
 * 보고서가 `[특강]중3-2 개념 완성반`(08-25)이라 본수업(08-24)을 이겼고, 화면이
 * 3-2 진도를 보여 주고 있었다.
 *
 * ## 반이 안 적힌 보고서는 **버린다**
 *
 * 원장님: *「classid가 있는 보고서만 채택할것. 최근 수학 보고서는 전부 존재할것임.」*
 * 실측이 그 말을 뒷받침한다 — eywa 가 `class_id` 를 채우기 시작한 것이 2026-07 이고
 * 2026-08 은 **1,280건 중 1,280/1,341 = 95.4%** 가 채워져 있다(그 전은 전부 NULL).
 * 주반에 몰아넣는 폴백을 두면 바로 그 결함이 되살아나므로 **폴백을 두지 않는다.**
 *
 * 🔴 **버린 것은 반드시 센다.** 조용히 빠지면 요약이 「전부 가져왔다」로 읽힌다.
 */
import type { EywaReport } from "@/lib/eywa/syncPlan";

export interface GroupedReports {
  /** `${classId}|${studentId}` → 그 반에서 그 학생의 보고서. 진도 계획의 단위다. */
  byClassStudent: Map<string, EywaReport[]>;
  /** 학생 → 보고서. 「마지막 보고서」(D-64) 를 구할 때만 쓴다. */
  byStudent: Map<string, EywaReport[]>;
  /** 활성 수학반 명단 밖 학생의 보고서. */
  명단밖진도: number;
  명단밖학생: Set<string>;
  /** 반이 안 적힌 보고서 — 어느 반의 진도인지 알 수 없어 버린다. */
  반없는보고서: number;
  /** 범위 밖 반(특강·개별반 등)의 보고서. 반 이름 → 건수. */
  범위밖반보고서: Map<string, number>;
}

/**
 * @param rosterIds 범위 안 학생 id
 * @param allowed   범위 안 **반** id (`syncScope.ts`)
 * @param classNames 반 id → 이름 (버린 건수를 사람이 읽을 수 있게)
 */
export function groupReportsByClassStudent(
  reports: readonly EywaReport[],
  rosterIds: ReadonlySet<string>,
  allowed: ReadonlySet<string>,
  classNames: ReadonlyMap<string, string>,
): GroupedReports {
  const byClassStudent = new Map<string, EywaReport[]>();
  const byStudent = new Map<string, EywaReport[]>();
  const 명단밖학생 = new Set<string>();
  const 범위밖반보고서 = new Map<string, number>();
  let 명단밖진도 = 0;
  let 반없는보고서 = 0;

  for (const report of reports) {
    if (!rosterIds.has(report.studentId)) {
      명단밖진도 += 1;
      명단밖학생.add(report.studentId);
      continue;
    }
    if (!report.classId) {
      반없는보고서 += 1;
      continue;
    }
    if (!allowed.has(report.classId)) {
      const name = classNames.get(report.classId) ?? report.classId;
      범위밖반보고서.set(name, (범위밖반보고서.get(name) ?? 0) + 1);
      continue;
    }

    const forStudent = byStudent.get(report.studentId) ?? [];
    forStudent.push(report);
    byStudent.set(report.studentId, forStudent);

    // 구분자는 `|` — 둘 다 UUID 라 값 안에 나올 수 없다.
    const key = `${report.classId}|${report.studentId}`;
    const pair = byClassStudent.get(key) ?? [];
    pair.push(report);
    byClassStudent.set(key, pair);
  }

  return {
    byClassStudent,
    byStudent,
    명단밖진도,
    명단밖학생,
    반없는보고서,
    범위밖반보고서,
  };
}

/** `${classId}|${studentId}` 를 되돌린다. */
export function splitKey(key: string): {
  classId: string;
  studentId: string;
} {
  const at = key.indexOf("|");
  return { classId: key.slice(0, at), studentId: key.slice(at + 1) };
}
