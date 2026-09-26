import type { ConceptId, Difficulty } from "../types";

/**
 * 모바일 «한 걸음» 문항 (트랙 B1 · 2026-09-27).
 *
 * 폰에서는 문제 전체를 풀게 하지 않고 **그 개념의 핵심 한 단계**만 묻는다(원장님 결정 —
 * «이런 문제를 넣어 놓으면 모바일로 어떻게 풀라는 거야?»). 보기는 넷, 폰 2×2 칸에 들어가는 길이.
 *
 * 🔴 이 모양은 트랙 B2(채점·DTO)와 맞물린 **계약**이다 — 칸을 바꾸려면 B2 와 같이 바꾼다.
 */
export interface QuickItem {
  /** `"quick:<conceptId>:<모양이름>"` */
  templateId: string;
  conceptId: ConceptId;
  /** 1..5 — 한 걸음 안에서 수 크기·음수·분수로 오른다 */
  difficulty: Difficulty;
  /** 발문 + 식. `$…$` 수식. 320px 폭에서 두 줄 이내 */
  prompt: string;
  /** 정확히 4개, 이미 섞은 표시 순서. 각 보기는 `"$…$"` 한 덩이 */
  choices: string[];
  /** 0..3 */
  answerIndex: number;
  /** 1~2줄 */
  solution: string[];
  hint: string;
  /** 목표 풀이 시간(8~20) */
  expectedSeconds: number;
}

export { generateQuickItem } from "./generate";
