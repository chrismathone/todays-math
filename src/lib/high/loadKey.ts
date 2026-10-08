/**
 * 고등 유형 엔진의 **적재 열쇠** — 문항류(`familyKey`) · 행(`externalId`) · 변형(`variantKey`).
 *
 * 열쇠를 «짓는 쪽»(적재기 `scripts/import/load-engine-problems.ts`)과 «읽는 쪽»(미적재 검사
 * `scripts/qa/checkUnloadedTypes.ts`)이 **이 파일의 짝**을 쓴다. 모양을 두 곳에 따로 적으면 넣고도 빚이
 * 안 줄어들거나(읽는 쪽이 못 읽음), 안 넣고도 빚이 사라진다(비슷한 키를 «나갔다»로 읽음) — 둘 다 조용하다.
 *
 * 꼴은 중등 유형의 규칙을 그대로 따른다(`high-engine-plan.md` §0-㉡):
 *
 * ```
 * 유형 키     공통수학1|항등식과 나머지정리|03            ← `과목|중단원|번호`, 색인 바이트 그대로
 * familyKey   high:공통수학1|항등식과 나머지정리|03
 * externalId  engine-high:공통수학1|항등식과 나머지정리|03|s20261008|v0|단답형
 * variantKey  high:공통수학1|항등식과 나머지정리|03|s20261008|v0
 * ```
 *
 * 🔴 읽기는 **정확한 키**다. 중등 유형 · 결합형의 미적재 검사는 `externalId.includes(key)` 로 묻는데,
 *    번호 `19` 는 확장 번호 `19A` 의 일부라 `…|19A` 만 실려도 `…|19` 가 «나갔다»로 읽힌다(등록부끼리 재면
 *    그런 쌍이 90 — `engine-judge-step01.md` §5). 고등은 처음부터 끝을 못 박아 읽는다.
 */

/** 출처 판정(`src/lib/problem/provenance.ts` 의 `ENGINE_PREFIX`)이 보는 표지 — 엔진 말고는 아무도 안 쓴다. */
export const HIGH_FAMILY_PREFIX = "high:";

/** 적재본의 `externalId` 앞머리. 되돌리기 · 제자리 갱신이 «우리가 넣은 행»을 이것으로 안다. */
export const HIGH_EXTERNAL_PREFIX = "engine-high:";

const QUESTION_TYPES = ["단답형", "객관식", "서술형"] as const;
export type HighQuestionType = (typeof QUESTION_TYPES)[number];

export type HighExternalIdParts = {
  typeKey: string;
  seed: number;
  variant: number;
  questionType: string;
};

/**
 * 유형 키가 열쇠에 실어도 되는 모양인가 — 아니면 까닭, 맞으면 `null`.
 *
 * `과목|중단원|번호` 세 토막이고 번호는 색인 번호(`03`) 또는 확장 번호(`12A`)다. 이 모양을 벗어난 키는
 * 꼬리 `|s…|v…|형식` 을 흉내 낼 수 있어 읽는 쪽이 다른 유형으로 읽는다.
 */
export function highTypeKeyFault(typeKey: string): string | null {
  const parts = typeKey.split("|");
  if (parts.length !== 3) return "`과목|중단원|번호` 세 토막이 아니다";
  const [book, minor, number] = parts as [string, string, string];
  if (book.trim() === "" || minor.trim() === "")
    return "과목 · 중단원이 비었다";
  if (book !== book.trim() || minor !== minor.trim())
    return "과목 · 중단원 앞뒤에 공백이 있다";
  if (!/^\d{2}[A-Z]?$/.test(number))
    return `번호가 색인 번호(03) · 확장 번호(12A) 꼴이 아니다: ${number}`;
  return null;
}

function assertTypeKey(typeKey: string): void {
  const fault = highTypeKeyFault(typeKey);
  if (fault)
    throw new Error(
      `고등 유형 키가 열쇠 모양이 아니다 — ${fault} (${typeKey})`,
    );
}

export function highFamilyKey(typeKey: string): string {
  assertTypeKey(typeKey);
  return `${HIGH_FAMILY_PREFIX}${typeKey}`;
}

export function highVariantKey(p: {
  typeKey: string;
  seed: number;
  variant: number;
}): string {
  assertTypeKey(p.typeKey);
  return `${HIGH_FAMILY_PREFIX}${p.typeKey}|s${p.seed}|v${p.variant}`;
}

export function highExternalId(p: HighExternalIdParts): string {
  assertTypeKey(p.typeKey);
  if (!Number.isInteger(p.seed) || p.seed < 0)
    throw new Error(`고등 열쇠의 씨앗은 0 이상의 정수다: ${p.seed}`);
  if (!Number.isInteger(p.variant) || p.variant < 0)
    throw new Error(`고등 열쇠의 변형 번호는 0 이상의 정수다: ${p.variant}`);
  if (!(QUESTION_TYPES as readonly string[]).includes(p.questionType))
    throw new Error(`고등 열쇠의 형식을 모른다: ${p.questionType}`);
  return `${HIGH_EXTERNAL_PREFIX}${p.typeKey}|s${p.seed}|v${p.variant}|${p.questionType}`;
}

const EXTERNAL_ID = new RegExp(
  `^${HIGH_EXTERNAL_PREFIX}(.+)\\|s(\\d+)\\|v(\\d+)\\|(${QUESTION_TYPES.join("|")})$`,
);

/**
 * `externalId` → 열쇠 토막. 고등 엔진이 지은 열쇠가 아니면 `null`.
 *
 * 앞머리 · 꼬리(`|s씨앗|v변형|형식`)를 **끝까지** 맞추고, 남은 몸통이 유형 키 모양일 때만 읽는다.
 * 그래서 `…|03A|s1|v0|단답형` 은 `…|03A` 로만 읽히고 `…|03` 으로는 안 읽힌다.
 */
export function parseHighExternalId(id: string): HighExternalIdParts | null {
  const m = EXTERNAL_ID.exec(id);
  if (!m) return null;
  const typeKey = m[1]!;
  if (highTypeKeyFault(typeKey) !== null) return null;
  return {
    typeKey,
    seed: Number(m[2]),
    variant: Number(m[3]),
    questionType: m[4]!,
  };
}
