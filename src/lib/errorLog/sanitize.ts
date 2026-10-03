/**
 * 오류 기록에 싣기 전에 거른다 — 비밀 값을 빼고, 길이를 자른다.
 *
 * 열쇠 이름 규칙은 `src/lib/audit.ts` 의 SECRET_KEY 결을 따르되, 감사 기록과 달리 `content`·`payload` 는
 * **거르지 않는다** — 오류 기록은 «무엇이 왜 안 됐나»를 재현하는 재료라 모델 응답·사양이 있어야 한다
 * (원장님 2026-09-22 «최대한 자세하게»). 요청 본문 자체는 처음부터 싣지 않는다(`withErrorLog.ts`).
 */

export const REDACTED = "[걸러냄]";

/**
 * 비밀 값을 담는 열쇠. `token` 은 **끝에 올 때만**(csrfToken·accessToken·token) — `maxOutputTokens`
 * 같은 «토큰 수»는 비밀이 아니고, 지우면 패치 재료를 잃는다.
 */
const SECRET_KEY =
  /password|passwd|secret|cookie|authorization|credential|signature|api[-_]?key|token$|csrf|^session|^code$|^state$|verifier|^ticket$|^assertion$/i;

export const isSecretKey = (key: string) => SECRET_KEY.test(key);

const VALUE_PATTERNS: [RegExp, string][] = [
  [/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi, `$1 ${REDACTED}`],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, REDACTED],
  [/\bAIza[0-9A-Za-z_-]{20,}/g, REDACTED],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, REDACTED],
  // DB 접속 문자열 — 비밀번호 칸만
  [
    /\b(postgres(?:ql)?|mysql|redis):\/\/([^:/@\s]+):[^@\s]+@/gi,
    `$1://$2:${REDACTED}@`,
  ],
];

let envSecrets: string[] | undefined;
/** 서버 환경변수의 비밀 값(키·시크릿·토큰·비밀번호) — 원문 어딘가에 되비친 것을 지운다. */
function secretEnvValues(): string[] {
  if (envSecrets && process.env.NODE_ENV === "production") return envSecrets;
  envSecrets = Object.entries(process.env)
    .filter(
      ([name, value]) =>
        /KEY|SECRET|TOKEN|PASSWORD/i.test(name) &&
        typeof value === "string" &&
        value.trim().length >= 12,
    )
    .map(([, value]) => value!.trim())
    .sort((a, b) => b.length - a.length);
  return envSecrets;
}

/** 글 속의 비밀 값을 지운다(열쇠 이름을 모르는 원문 — 스택·상류 응답·모델 출력). */
export function scrubText(text: string): string {
  let out = text;
  for (const secret of secretEnvValues())
    if (out.includes(secret)) out = out.split(secret).join(REDACTED);
  for (const [pattern, replacement] of VALUE_PATTERNS)
    out = out.replace(pattern, replacement);
  return out;
}

/** 길이를 자르고, 잘랐다는 것과 원래 길이를 끝에 남긴다. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const tail = `…(자름 — 원래 ${text.length}자)`;
  return text.slice(0, Math.max(0, max - tail.length)) + tail;
}

/**
 * 객체를 훑어 비밀 열쇠의 값은 가리고, 글은 `scrubText` 로 거른다.
 * 깊이·배열 길이에 상한을 둔다 — 순환 참조·거대한 배열이 기록 한 줄을 삼키지 않게.
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? String(value) : value;
  }
  if (depth > 12) return "[깊음]";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value.slice(0, 200).map((item) => redactSecrets(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "function" || item === undefined) continue;
    out[key] = isSecretKey(key) ? REDACTED : redactSecrets(item, depth + 1);
  }
  return out;
}

const byteLength = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value) ?? "").length;

function shrinkStrings(value: unknown, max: number): unknown {
  if (typeof value === "string") return truncate(value, max);
  if (Array.isArray(value))
    return value.map((item) => shrinkStrings(item, max));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        shrinkStrings(item, max),
      ]),
    );
  return value;
}

/**
 * JSON 으로 싣는 값을 바이트 상한 안에 넣는다 — 긴 글부터 단계적으로 자르고, 그래도 넘치면
 * 앞부분 미리보기만 남긴다(잘린 채로라도 «무엇이 있었나»는 보이게).
 */
export function clampJson(value: unknown, maxBytes: number): unknown {
  let out = value;
  if (byteLength(out) <= maxBytes) return out;
  for (const max of [8000, 2000, 500, 120]) {
    out = shrinkStrings(value, max);
    if (byteLength(out) <= maxBytes) return out;
  }
  const text = JSON.stringify(value) ?? "";
  return {
    truncated: true,
    bytes: byteLength(value),
    preview: truncate(text, Math.floor(maxBytes / 4)),
  };
}
