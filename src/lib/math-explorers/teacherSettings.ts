import type { ExplorerSettingsInput } from "@/contracts/mathExplorerSettings.contract";
import { kstDateOf } from "@/lib/kstDate";
import {
  SrsConflict,
  SrsUnavailable,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { definitionCourseGrade, definitionUnits } from "./definition-cards";
import { applyExplorerAction, ExplorerActionInvalid } from "./engine";
import {
  expeditionMissionOpen,
  initialOwnedExplorer,
  unfinishedExpeditionSource,
} from "./expedition";

export function explorerSettingsLocked(state: StoredSrsState, now: Date) {
  return (
    expeditionMissionOpen(state) ||
    !!unfinishedExpeditionSource(state, now) ||
    !!(
      state.explorers?.profile.definitions?.session &&
      !state.explorers.profile.definitions.session.done
    )
  );
}
function owned(state: StoredSrsState, studentId: string, now: Date) {
  const explorer = initialOwnedExplorer(state, studentId, now);
  if (explorer.profile.id !== studentId)
    throw new SrsUnavailable("저장된 개념 탐험 기록을 확인해야 합니다.");
  return explorer;
}
export function explorerSettingsDto(
  state: StoredSrsState,
  revision: number,
  studentId: string,
  now: Date,
) {
  const explorer = owned(state, studentId, now);
  return {
    studentId,
    revision,
    courseGrade: definitionCourseGrade(explorer.profile),
    goalUnitId: explorer.profile.definitions?.goalUnitId ?? null,
    locked: explorerSettingsLocked(state, now),
    units: definitionUnits.map(({ id, grade, title }) => ({
      id,
      grade,
      title,
    })),
  };
}

/** Use the student actions; retain cards, sessions, rewards and all SRS records. */
export function applyExplorerTeacherSettings(
  state: StoredSrsState,
  studentId: string,
  input: ExplorerSettingsInput,
  now: Date,
  requestIds: [string, string],
): StoredSrsState {
  const explorer = owned(state, studentId, now);
  if (explorerSettingsLocked(state, now))
    throw new SrsConflict(
      "시작한 오늘의 학습과 오답 복습을 마친 뒤 목표를 바꿔 주세요.",
    );
  const unit = definitionUnits.find(
    (u) => u.id === input.goalUnitId && u.grade === input.courseGrade,
  );
  if (!unit)
    throw new ExplorerActionInvalid("선택한 학년의 목표 단원을 골라 주세요.");
  if (
    definitionCourseGrade(explorer.profile) === input.courseGrade &&
    explorer.profile.definitions?.goalUnitId === unit.id
  )
    return state;
  const course = applyExplorerAction(
    explorer,
    { type: "course", grade: input.courseGrade },
    kstDateOf(now),
    requestIds[0],
  );
  const goal = applyExplorerAction(
    course.state,
    { type: "goal", unitId: unit.id },
    kstDateOf(now),
    requestIds[1],
  );
  return { ...state, explorers: goal.state };
}
