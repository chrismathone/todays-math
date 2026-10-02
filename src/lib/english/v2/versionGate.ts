/**
 * 오늘의 영어 — 형식 판 관문 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 🔴 왜 있나: 1판 경로는 모르는 칸을 **버리고** 저장한다(붙여넣기의 `coerceEnglishDraftShape`) — 2판이나 더 높은 판의 값이
 * 그 길로 들어오면 표적과 표적별 정답이 소리 없이 사라진 1판 세트가 된다. 여기서 그 값을 가려 거절한다.
 * 정상 1판 요청은 그대로 지난다(1판 저장을 멈추는 장치가 아니다).
 *
 * `schemaVersion` 은 **자료 형식의 판**이다. 세트의 `revision`(동시 수정 CAS)과 다른 칸이라 한 칸으로 합치지 않는다 —
 * 요청은 둘 다 맞아야 저장된다(판이 먼저 걸리고, 그다음 `revision`).
 *
 * 순수 함수다(서버 · 클라이언트 같이).
 */
import type { EnglishDraftIssue } from "@/contracts/english.contract";
import {
  ENGLISH_SCHEMA_VERSION_V1,
  ENGLISH_SCHEMA_VERSION_V2,
  ENGLISH_V2_ONLY_DOCUMENT_KEYS,
  ENGLISH_V2_ONLY_ITEM_KEYS,
} from "@/contracts/englishV2.contract";

export type EnglishVersionProbe =
  | { kind: "v1" }
  | { kind: "v2" }
  | { kind: "unsupported"; schemaVersion: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 값의 형식 판 — `schemaVersion` 칸만 본다. 칸이 없으면 1판(옛 payload 에는 이 칸이 없다).
 * 🔴 글자 «2» · 3 · null 같은 값을 가까운 판으로 맞추지 않는다 — 읽을 줄 모르는 판은 `unsupported`.
 */
export function probeEnglishSchemaVersion(value: unknown): EnglishVersionProbe {
  if (!isRecord(value))
    return { kind: "unsupported", schemaVersion: undefined };
  if (!Object.hasOwn(value, "schemaVersion")) return { kind: "v1" };
  const { schemaVersion } = value;
  if (schemaVersion === ENGLISH_SCHEMA_VERSION_V1) return { kind: "v1" };
  if (schemaVersion === ENGLISH_SCHEMA_VERSION_V2) return { kind: "v2" };
  return { kind: "unsupported", schemaVersion };
}

function itemMarkers(question: unknown, at: string): string[] {
  if (!isRecord(question)) return [];
  return ENGLISH_V2_ONLY_ITEM_KEYS.filter((key) =>
    Object.hasOwn(question, key),
  ).map((key) => `${at}.${key}`);
}

/**
 * 2판에만 있는 칸의 자리들 — 문서 바깥 칸과 `questions[]` 안 문항 칸.
 * AI 가 흔히 덧붙이는 낯선 칸(번호 · 난이도)은 2판 칸이 아니다 — 목록(`ENGLISH_V2_ONLY_*`)에 있는 것만 센다.
 */
export function englishV2Markers(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const markers: string[] = ENGLISH_V2_ONLY_DOCUMENT_KEYS.filter((key) =>
    Object.hasOwn(value, key),
  );
  if (Array.isArray(value.questions))
    value.questions.forEach((question, index) =>
      markers.push(...itemMarkers(question, `questions[${index}]`)),
    );
  return markers;
}

export const ENGLISH_VERSION_MESSAGES = {
  v2Payload:
    "이 저장 경로는 문항 형식 1판만 받습니다. 2판 문서는 여기서 저장할 수 없습니다.",
  unsupportedVersion:
    "문항 형식 1판만 받습니다. 알 수 없는 형식 판이라 저장하지 않았습니다.",
  v2Fields:
    "문항 형식 1판에 없는 칸(표적 · 표적별 정답 등 2판 칸)이 들어 있어 저장하지 않았습니다.",
  storedNotV1:
    "이 세트는 새 형식으로 저장돼 있어 이 화면에서 고칠 수 없습니다.",
} as const;

export type EnglishV1WriteGate =
  | { ok: true; body: unknown }
  | {
      ok: false;
      reason: "v2_payload" | "unsupported_version";
      /** 요청이 밝힌 판(없으면 undefined) */
      schemaVersion: unknown;
      /** 찾은 2판 칸의 자리 */
      markers: string[];
      message: string;
    };

/**
 * 1판 쓰기 요청의 관문. 지나면 1판 계약(`z.strictObject`)에 넘길 본문을 돌려준다 —
 * `schemaVersion: 1` 은 «1판으로 저장해 달라»는 표지라 그 칸만 떼어 넘긴다(뜻을 버리는 것이 아니다).
 * 객체가 아닌 본문은 판정하지 않는다 — 계약이 400 으로 거절한다.
 */
export function gateEnglishV1Write(body: unknown): EnglishV1WriteGate {
  if (!isRecord(body)) return { ok: true, body };
  const probe = probeEnglishSchemaVersion(body);
  const markers = englishV2Markers(body);
  if (probe.kind === "unsupported")
    return {
      ok: false,
      reason: "unsupported_version",
      schemaVersion: probe.schemaVersion,
      markers,
      message: ENGLISH_VERSION_MESSAGES.unsupportedVersion,
    };
  if (probe.kind === "v2")
    return {
      ok: false,
      reason: "v2_payload",
      schemaVersion: ENGLISH_SCHEMA_VERSION_V2,
      markers,
      message: ENGLISH_VERSION_MESSAGES.v2Payload,
    };
  if (markers.length > 0)
    return {
      ok: false,
      reason: "v2_payload",
      schemaVersion: body.schemaVersion,
      markers,
      message: ENGLISH_VERSION_MESSAGES.v2Fields,
    };
  if (!Object.hasOwn(body, "schemaVersion")) return { ok: true, body };
  const rest = { ...body };
  delete rest.schemaVersion;
  return { ok: true, body: rest };
}

/**
 * 1판 초안 검증기(`validateEnglishDraft`)가 맨 먼저 싣는 사유 — 세 길(붙여넣기 · 서버 AI · 저장 라우트)이 같은 줄을 낸다.
 * 걸리면 세트 단위 사유 한 줄이고, 그 초안의 다른 규칙은 재지 않는다(1판 규칙으로 잴 값이 아니다).
 */
export function englishV1PayloadIssues(value: unknown): EnglishDraftIssue[] {
  const gate = gateEnglishV1Write(value);
  return gate.ok ? [] : [{ question: null, message: gate.message }];
}

/**
 * 저장된 행의 판. 🔴 지금 표에는 `schema_version` 칸이 **없다**(SQL 초안만 있고 미적용) — 그래서 칸이 오면 그 값을,
 * 안 오면 문항 배열의 꼴(2판 칸의 유무)로 본다. 없는 칸을 2판으로 읽지 않는다.
 * 1판이 아닌 행은 1판 PUT 으로 덮어쓰지 않는다(표적이 든 본문을 1판 문항으로 갈아 끼우는 손실).
 */
export function storedEnglishSetVersion(row: {
  questions: unknown;
  schemaVersion?: unknown;
}): EnglishVersionProbe {
  if (row.schemaVersion !== undefined)
    return probeEnglishSchemaVersion({ schemaVersion: row.schemaVersion });
  return englishV2Markers({ questions: row.questions }).length > 0
    ? { kind: "v2" }
    : { kind: "v1" };
}
