import type { z } from "zod";
import type {
  FadingAction,
  FadingCatalog,
  FadingState,
  fadingConceptResponseSchema,
} from "@/contracts/fadingApi.contract";

/**
 * 화면이 «오늘의 기억»의 자료를 얻는 길 — 넷이고, 학생 API 의 네 길과 꼴이 같다 (`docs/planning/srs-overhaul-20261006.md` §14).
 *
 * 화면은 이 꼴만 안다. 뒤에 서는 것은 둘이다 — 학생 API 를 부르는 것(화면 쪽이 짓는다)과, 서버 없이 같은 규칙으로 도는
 * `createLocalFadingSource`(`local.ts` — 작업실의 미리 보기 · 측정용 화면). 같은 화면이 둘 다에서 돈다.
 */

/** 개념 하나 — 내용(답 포함 · 칩 재료)과 내 상태(고르지 않았으면 `null`). */
export type FadingConceptDetail = z.infer<
  typeof fadingConceptResponseSchema
>["data"];

/** 실패의 갈래 — 학생 API 의 오류 코드 그대로. `OFFLINE` 은 응답을 못 받은 것(연결 끊김)이다. */
export type FadingSourceErrorCode =
  | "CONFLICT"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "OFFLINE"
  | "UNKNOWN";

/**
 * 길이 실패했다. `CONFLICT`(409)는 «지금은 할 수 없는 일»이다 — 다른 번호의 풀이 · 건너뛴 단계 · 덜 채운 단계 · 복습일 전의 풀이 열기.
 * 아무것도 바뀌지 않았으니 화면은 `state()` 를 다시 읽어 맞춘다. 문구는 서버가 낸 것을 그대로 싣는다.
 */
export class FadingSourceError extends Error {
  constructor(
    readonly code: FadingSourceErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FadingSourceError";
  }
}

export type FadingSource = {
  /** 홈 · 통계 · 풀이가 읽는 상태 — 풀이가 열려 있으면 그 개념의 내용이 같이 온다. */
  state(): Promise<FadingState>;
  /** 행동 하나 → 같은 꼴의 상태. */
  act(action: FadingAction): Promise<FadingState>;
  /** 개념 목록(학년 하나) — 학년을 안 주면 그 학생에게 맞는 학년. */
  catalog(grade?: string): Promise<FadingCatalog>;
  /** 개념 하나 — 읽기와, 복습일 전의 연습(연습은 아무것도 보내지 않는다). */
  concept(id: string): Promise<FadingConceptDetail>;
};

/**
 * 번호 하나(UUID v4) — 평가 요청의 번호(`rate` 의 `requestId`)를 화면이 지을 때 쓴다.
 * `crypto.randomUUID` 는 보안 맥락(https · localhost)에서만 있다 — 없으면(교실의 폰이 내부 주소로 붙었을 때) 난수로 같은 꼴을 짓는다.
 */
export function newFadingId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = [...b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
