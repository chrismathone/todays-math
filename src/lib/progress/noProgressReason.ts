/**
 * 「진도가 없다」의 **이유**를 가른다 (2026-08-25).
 *
 * ## 왜 필요한가
 *
 * `generateDraftTest` 는 반 진도가 없으면 「진도가 기록되지 않았습니다.」 하나로 끝냈다.
 * 그런데 이 문장이 덮는 상태가 **둘**이고, 원장님이 할 일이 서로 다르다:
 *
 * ⑴ **정말 아무도 진도가 없다** → 진도를 입력해야 한다.
 * ⑵ **학생마다 진도가 다르다**(개별진도반) → 반 진도라는 것이 **없는 게 맞다.**
 *    eywa 동기화가 일부러 안 만든다(`deriveClassProgress` — 임의로 하나를 고르면
 *    뒤처진 학생이 못 푸는 시험지가 나간다). 원장님은 범위를 직접 고르거나
 *    개별 진도로 출제해야 한다.
 *
 * ⑵ 를 ⑴ 로 말하면 원장님은 **있는 진도를 다시 입력하러 간다.** 실제로 MS2A 가
 * 그 상태다 — 학생 10명이 단원 4개로 갈린다(상자그림 6 · 원주각 2 · 인수분해 1 ·
 * 일차함수 1). 「지표가 실패를 셀 수 있는 형태인가」의 화면판이다.
 *
 * ⚠️ 이 함수는 **실패 경로에서만** 부른다 — 정상 출제는 질의를 한 번도 더 하지 않는다.
 */

/** 필요한 만큼만 요구한다 — 시험이 가짜 db 를 쉽게 만들 수 있게. */
export interface ProgressLookup {
  progress: {
    findMany: (args: {
      where: { classId: string; studentId: { not: null }; retiredAt: null };
      select: {
        studentId: true;
        unitId: true;
        recordedAt: true;
        createdAt: true;
      };
      orderBy: Array<Record<string, "desc">>;
    }) => Promise<
      Array<{
        studentId: string | null;
        unitId: string;
        recordedAt: Date;
        createdAt: Date;
      }>
    >;
  };
}

export const NO_PROGRESS_AT_ALL = "진도가 기록되지 않았습니다.";

/** 학생마다 최신 단원이 갈릴 때의 문구. 무엇을 하면 되는지까지 적는다. */
export function divergedMessage(units: number, students: number): string {
  return (
    `이 반은 학생마다 진도가 다릅니다 — 학생 ${students}명이 단원 ${units}개로 갈립니다. ` +
    `반 진도가 없어 자동 범위를 낼 수 없습니다. 범위를 직접 고르거나 학생을 지정해 출제하십시오.`
  );
}

/**
 * 반 진도가 없을 때 **왜 없는지**를 한 문장으로 돌려준다.
 *
 * 학생 진도를 최신순으로 한 번 읽어 학생별 최신 단원의 가짓수를 센다.
 */
export async function noProgressReason(
  db: ProgressLookup,
  classId: string,
): Promise<string> {
  const rows = await db.progress.findMany({
    where: { retiredAt: null, classId, studentId: { not: null } },
    select: {
      studentId: true,
      unitId: true,
      recordedAt: true,
      createdAt: true,
    },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
  });
  if (rows.length === 0) return NO_PROGRESS_AT_ALL;

  // 최신순으로 왔으니 학생마다 **처음 만나는 행**이 그 학생의 최신이다.
  const latest = new Map<string, string>();
  for (const row of rows) {
    if (row.studentId === null) continue;
    if (!latest.has(row.studentId)) latest.set(row.studentId, row.unitId);
  }
  if (latest.size === 0) return NO_PROGRESS_AT_ALL;

  const units = new Set(latest.values());
  // 모두 같은데도 반 진도가 없다면 동기화가 아직 안 돈 것이다 — 그것도 그대로 말한다.
  if (units.size === 1)
    return (
      "학생 진도는 있는데 반 진도가 아직 만들어지지 않았습니다. " +
      "진도 동기화가 한 번 돌면 자동으로 채워집니다."
    );
  return divergedMessage(units.size, latest.size);
}
