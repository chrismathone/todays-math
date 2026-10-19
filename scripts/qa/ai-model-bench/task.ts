/**
 * 작업 하나의 꼴 — 표본 · 한 문항 실행 · 요약. 새 작업은 이 꼴로 `tasks/` 에 하나 더하고 `run.ts` 의 TASKS 에 건다.
 */
import type { Arm } from "./arms";
import type { Usage } from "./cost";
import type { Caller, CallResult } from "./providers";

export interface SampleOptions {
  n: number;
  seed: string;
  /** 작업마다 뜻이 다르다 — solution: all | high */
  filter?: string;
  /** 이 ID 들은 뽑지 않는다(앞 측정과 겹치지 않게) */
  excludeIds?: string[];
  /** 표본 파일(이미지 등)을 둘 폴더 */
  dir: string;
}

/** 한 번의 실행 기록 — 대체 경로를 탔으면 시간 · 사용량 · 비용은 두 호출의 합 */
export interface RunRecord {
  itemId: string;
  armId: string;
  ms: number;
  cost: number;
  usage: Usage;
  finish: CallResult["finish"];
  calls: number;
  usedFallback?: boolean;
  /** 사용량을 못 받아 최대 비용으로 센 몫(전체 cost에 포함). */
  uncertainCost?: number;
  error?: string;
  /** 작업별 채점 결과 */
  score: Record<string, unknown>;
  /** 사람이 볼 원문(응답 본문) */
  raw?: string;
}

export interface Task<Item extends { id: string }> {
  name: string;
  /** 사진을 받는 작업인가 — 사진을 못 받는 팔은 건너뛴다 */
  vision: boolean;
  sample(options: SampleOptions): Promise<Item[]>;
  /** 드라이런 어림용 — 모델에 보낼 지시문 */
  prompt(item: Item): string;
  /** 출력 토큰 어림(드라이런) */
  expectedOutputTokens: number;
  /** 팔 하나로 한 번 — `call` 은 비용을 세는 감싼 호출이다 */
  runOne(item: Item, arm: Arm, call: Caller): Promise<Omit<RunRecord, "itemId" | "armId" | "cost" | "usage" | "ms" | "calls">>;
  /** 대체 경로를 탈 결과인가(답이 비었다 · 잘렸다 · 형식이 깨졌다) */
  needsFallback(record: Pick<RunRecord, "finish" | "error" | "score">): boolean;
  /** 팔 하나의 기록들 → 표 한 줄 */
  summarize(records: RunRecord[]): Record<string, string | number>;
}
