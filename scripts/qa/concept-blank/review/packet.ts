/**
 * 외부 전수 검토 묶음(저장소 밖)을 읽는다 — 의견 · 제안은 저장소에 싣지 않는다(검토 원문 10MB · 원장에는 줄과 지문만).
 * 자리: `D:\tmp\concept-blank-review\codex-review\issues.json`(리드가 풀어 둔다) — 다른 자리면 환경 변수 `CB_REVIEW_PACKET`.
 * 묶음이 없어도 원장 · 진행표 · 작업표는 돈다(의견 칸만 빈다).
 */
import { existsSync, readFileSync } from "node:fs";

export const PACKET_PATH =
  process.env.CB_REVIEW_PACKET ??
  "D:/tmp/concept-blank-review/codex-review/issues.json";

export type PacketIssue = {
  item_id: string;
  triage_bucket: string;
  teacher_comment: string;
  problem?: string | null;
  proposal: {
    scope: string;
    question: string | null;
    answer: string | null;
    explanation: string | null;
    group_question_guidance: string | null;
    group_answer_guidance: string | null;
  };
  independent_qa?: {
    verdict?: string;
    independentReason?: string;
    recommendedQuestion?: string;
    recommendedAnswer?: string;
  } | null;
};

export function readPacket(): Map<string, PacketIssue[]> | null {
  if (!existsSync(PACKET_PATH)) return null;
  const { issues } = JSON.parse(readFileSync(PACKET_PATH, "utf8")) as {
    issues: PacketIssue[];
  };
  const byId = new Map<string, PacketIssue[]>();
  for (const issue of issues)
    byId.set(issue.item_id, [...(byId.get(issue.item_id) ?? []), issue]);
  return byId;
}
