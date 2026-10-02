/**
 * 선수 확인 시범의 판과 정책 수치 — plan-v03 §4 · §6 · §7 (MPR-20261003-01).
 *
 * 판은 넷이고 따로 오른다: 그래프 형식(`SCHEMA_VERSION`) · 그래프 내용(해시 — 부르는 쪽이 넣는다) ·
 * 매핑(`MAPPING_VERSION`) · 정책(`POLICY_VERSION`). 학생 기록에는 저장하지 않고 파생 DTO 에만 싣는다.
 * 아래 수치는 운영 자료로 맞춘 값이 아니라 **잠정 정책**이다 — 바꾸면 `POLICY_VERSION` 을 올린다.
 */
import {
  prerequisiteVersionsSchema,
  type PrerequisiteContext,
} from "@/contracts/mathPrerequisite.contract";

export const SCHEMA_VERSION = "1.1.0" as const;
export const MAPPING_VERSION = 1 as const;
export const POLICY_VERSION = 1 as const;

export const PREREQUISITE_POLICY = Object.freeze({
  /** 기존 코스 세션의 문항 수 — 새 세션은 이만큼 남았을 때만 낸다 */
  sessionSize: 5,
  /** 목표의 최근 끝낸 learn · review 세션 몇 개가 모두 실패해야 발동하나 */
  triggerSessions: 2,
  /** 한 세션의 서로 다른 본문 스스로 맞음 이 수 이상 → passed */
  passIndependentCorrect: 4,
  /** 한 세션의 서로 다른 본문 서버 채점 오답 이 수 이상 → failed */
  failIndependentIncorrect: 2,
  /** 근거 · 발동이 보는 기간(첫 풀이를 끝낸 때부터, 경계 포함) */
  evidenceWindowDays: 14,
  /** 같은 확인 범위를 다시 내기까지(마지막 풀이부터) — 발급 제한이지 숙달이 아니다 */
  checkCooldownDays: 14,
  checksPerKstDay: 1,
  maxCheckSections: 2,
  /** 직접 선수만 — 선수의 선수로 내려가지 않는다 */
  depth: 1,
  /** 상태에서 뽑는 결정적 세션 후보 수 */
  supplyCandidates: 20,
});

export type PrerequisiteVersions = PrerequisiteContext["versions"];

/** 계약의 모양으로만 낸다. 내용 해시는 그래프를 읽는 쪽(루트)이 넣는다. */
export function prerequisiteVersions(
  graphContentHash: string,
): PrerequisiteVersions {
  return prerequisiteVersionsSchema.parse({
    graphSchemaVersion: SCHEMA_VERSION,
    graphContentHash,
    mappingVersion: MAPPING_VERSION,
    policyVersion: POLICY_VERSION,
  });
}
