# 구현 기록 — Claude · 근거 · 정책 · 공급 (plan-v03 승인 뒤 첫 조각)

2026-10-03 · 가지 `chrismathone/math-prereq-plan-claude-20261003` · 기준 main `39535841c`(합의와 계약 동결)를 이 가지에 병합한 위에서.

맡은 것: `src/lib/math-prerequisite/{versions,mapping,evidence,supply,policy}.ts` 와 그 시험 · 공급 관문 시험 · 이 기록.
손대지 않은 것: 계약(`src/contracts/mathPrerequisite.contract.ts`) · 기존 코스 · 탐험 · 경로 · 생성기 · 화면 · 그래프(CJS · JSON · MD) · DB · 패키지.

## 1. 첫 관문 — 공급 (`src/__tests__/unit/mathPrerequisiteSupplyGate.test.ts`) — **통과**

엔진 문항만(은행 후보 없음). 씨앗 0 ~ 199 는 엔진의 표본이지 운영 학생의 기록이 아니다.

| 검사 | 범위 | 결과 |
|---|---|---|
| 날 문항 | 소단원 4 × 연산 · 기본 · 응용 × 씨앗 200 = 2,400문항 | 그림 0 · `getCourseProblemInput(raw).mode` 가 전부 `number` · 정답 채점 2,400/2,400 · 값이 1 큰 오답 거절 2,400/2,400 |
| 실제 세션 | 소단원마다 `generateCourseSession(소단원, 씨앗, 날짜, 모드, [])` 200개 = 800세션 · 4,000문항 | 저장 스키마 통과 800/800 · 갈래 차례 [연산, 기본, 기본, 응용, 응용] · 학생 화면(`publicCourseSession`)의 입력이 전부 `number` · 그림 0 · 보기 넷이 서로 다르고 정답 하나 · 채점 불가 보기 0 · 오답 거절 |
| 세션 안 같은 본문 | 위 800세션 | `5-2-2-1` 0/200 · `5-2-2-2` 2/200 · `5-1-5-4` 2/200 · `5-1-5-3` 1/200 — 결함이 아니라 공급기가 거르는 대상 |

갈래별 서로 다른 본문 수(날 문항 200씨앗) — 보존 창(연산 31 · 기본 62 · 응용 62)을 모두 넘는다:

| 소단원 | 연산 | 기본 | 응용 |
|---|---|---|---|
| `5-2-2-1` (분수)×(자연수) | 70 | 141 | 189 |
| `5-2-2-2` (자연수)×(분수) | 69 | 129 | 123 |
| `5-1-5-4` 대분수의 뺄셈 | 197 | 196 | 132 |
| `5-1-5-3` 진분수의 뺄셈 | 137 | 200 | 157 |

가장 좁은 자리는 목표의 연산(70 · 69)이다. 소스에서 센 `fm221Calc` 의 상한은 76 이었다(v03 표결서 관찰 2).

## 2. 내보내는 것 — 정확한 꼴

### `versions.ts`

```ts
export const SCHEMA_VERSION = "1.1.0";
export const MAPPING_VERSION = 1;
export const POLICY_VERSION = 1;
export const PREREQUISITE_POLICY: Readonly<{
  sessionSize: 5; triggerSessions: 2; passIndependentCorrect: 4; failIndependentIncorrect: 2;
  evidenceWindowDays: 14; checkCooldownDays: 14; checksPerKstDay: 1; maxCheckSections: 2;
  depth: 1; supplyCandidates: 20;
}>;
export type PrerequisiteVersions = PrerequisiteContext["versions"];
export function prerequisiteVersions(graphContentHash: string): PrerequisiteVersions; // 계약 스키마로 parse
```

### `mapping.ts`

```ts
export const PILOT_TARGET_UNIT_ID = "E56-N04";
export const PILOT_CHECK_UNIT_ID = "E56-N03";
export const PILOT_TARGET_SECTION_IDS: readonly ["5-2-2-1", "5-2-2-2"];
export const PILOT_CHECK_SECTION_IDS: readonly ["5-1-5-4", "5-1-5-3"]; // 차례 고정
export const PILOT_SECTION_IDS; // 목표 둘 + 확인 둘
export function isPilotTarget(id: string): boolean;
export function isPilotCheck(id: string): boolean;
export function sectionUnitId(sectionId: string): "E56-N04" | "E56-N03" | null;
export function mappingInfo(unitId: string): {
  unitId; mappingStatus: "verified" | "unmapped"; supply: "available" | "unavailable";
  role: "target" | "check" | null; sectionIds: readonly string[]; partial: true;
};
export function targetForCourse(course: StoredCourse): string | null;      // nextLearning 과 같은 셈
export function pilotTargetForCourse(course: StoredCourse): "5-2-2-1" | "5-2-2-2" | null;
```

### `evidence.ts`

```ts
export const EVIDENCE_WINDOW_MS: number; // 14일
export function normalizeContent(content: string): string;           // CRLF/CR → LF, trim
export function retainedSessions(course): CourseSession[];           // 이력 + 현재, ID 중복 제거
export function completedSessions(course, sectionId?): CourseSession[]; // completedAt · startedAt · id 차례
export function currentPlanSessions(course, sectionId, now): CourseSession[]; // 지금 계획 저장 뒤 시작 · now 까지 끝남
export function newestObservedAt(course, sectionId): number;          // max(memories, learner.progress) 의 lastReviewedAt
export function exposedContents(course): Set<string>;                // 보존 세션 문항 + 최근 답안 100
export function sessionOutcome(course, session): {
  sessionId; sectionId; mode; completedAt;
  outcome: "passed" | "failed" | "inconclusive"; independentCorrect; independentIncorrect;
};
export function sectionEvidence(course, sectionId, now): PrerequisiteSectionEvidence; // 계약 그대로
export function pilotEvidence(course, now): PrerequisiteSectionEvidence[];            // 4개, 목표 → 확인 차례
```

판정 규칙: §6 그대로. 근거가 되는 세션은 **지금 계획을 저장한 뒤 시작**했고(저장 전에 시작해 저장 뒤에 끝난 세션도 뺀다) **`now` 까지 끝난** 것뿐이다(앞날에 찍힌 기록은 세지 않는다 — 루트 요청). 힌트는 답하기 전 것(`usedHint` · `hintedProblemIds`)만 본다 — 답한 뒤 연 풀이(`revealedProblemIds`)는 첫 풀이를 바꾸지 않는다. 상태 대응: 기록 없음 → `unassessed` · 마지막 활동이 14일 밖이거나 계획 저장 전 → `stale` · 기억 **또는 진도(`learner.progress`)**가 보존된 끝낸 세션보다 새것이거나 원천이 잘림 · 앞날 기록 → `inconclusive` + `outcome: "unknown"` + `sourceRetained: false` · 그 밖은 결과대로 `passed_recent` / `not_passed_recent` / `inconclusive`.

### `supply.ts`

```ts
export const SESSION_TIER_PATTERN: readonly ["연산", "기본", "기본", "응용", "응용"];
export type SessionGenerator = typeof generateCourseSession;
export function stableSeed(key: string): number; // FNV-1a 32비트
export function supplySafeSession(
  input: { sectionId: string; mode: "learn" | "review"; key: string; avoid: ReadonlySet<string>; now: Date },
  deps?: { generate?: SessionGenerator },
): { ok: true; seed: number; candidateIndex: number; problems: CourseProblem[] } | { ok: false; tried: number };
```

기존 `generateCourseSession` 을 **바꾸지 않고** 은행 `[]` 로 부른다. 후보 `k`(0 ~ 19)의 씨앗은 `stableSeed(key + "#" + k)`. 거르는 조건: 같은 소단원 · 모드 · 5문항 · 갈래 차례 · 그림 없음 · 서버 채점 · 학생 화면이 저장된 보기를 그대로 씀(`embeddedCourseAnswerChoices` 없음 · 인쇄 후보 없음) · 보기 넷 중 정답 하나 · 본문 다섯이 서로 다르고 `avoid` 밖 · 저장 스키마 통과. 돌려주는 `problems` 의 ID 는 생성기의 것(`소단원:씨앗:갈래`)이다 — 루트가 UUID 로 바꾼다.

### `policy.ts`

```ts
export interface PrerequisiteBudget { answered: number; goal: number }
export interface PrerequisiteSessionChoice {
  sectionId: string; mode: "learn" | "review"; seed: number; candidateIndex: number; problems: CourseProblem[];
}
export type PrerequisiteDecisionKind = "check" | "return" | "fallback" | "unavailable";
export interface PrerequisiteDecision {
  kind: PrerequisiteDecisionKind; targetSectionId: string; sectionId: string;
  mode: "learn" | "review" | null; reason: string; teacherReason: string;
  canStart: boolean; overridesLearnedToday: boolean; session: PrerequisiteSessionChoice | null;
}
export const PREREQUISITE_REASONS: Readonly<{ check; checkTeacher; return; returnTeacher;
  fallback; fallbackTeacher; unavailable; unavailableTeacher; held }>;
export function prerequisiteStep(
  course: StoredCourse, now: Date, enabled: boolean, effectiveBudget: PrerequisiteBudget,
  deps?: { generate?: SessionGenerator },
): PrerequisiteDecision | null;
export function heldCheckSections(course, now, enabled): { sectionIds: ("5-1-5-4" | "5-1-5-3")[]; reason: string | null };
```

| 결정 | 언제 | 세션 | 열쇠 |
|---|---|---|---|
| `null` | 꺼짐 · 계획 꺼짐 · 진행 중 세션(재도전 포함) · 남은 분량 < 5 · 목표가 시범 밖 · 발동 · 복귀 아님 · 오늘 확인함 · 두 범위 모두 유예 | — | — |
| `return` | 현재 세션이 끝난(재도전 포함) 확인 범위의 `review` · 지금 계획 저장 뒤 시작 · `now` 까지 끝남 | T `learn` · `overridesLearnedToday: true` | `return:<P 세션 ID>:<T>` |
| `check` | T 의 최근 끝낸 learn · review 둘(`currentPlanSessions`)이 모두 `failed` · 14일 안(경계 포함) · 기억 · 진도가 더 새것 아님 · 오늘(KST) 확인 범위 기억 없음 · 유예(14일) 끝난 첫 P | P `review` | `check:<마지막 실패 세션 ID>:<P>` |
| `fallback` | 위가 참인데 확인 범위의 안전한 세션이 20후보 안에 없음 | T `learn`(오늘 T 를 learn 했으면 `review`) | `fallback:<마지막 실패 세션 ID>:<T>` |
| `unavailable` | 복귀 · 대체 연습의 T 도 20후보 안에 없음 | 없음 · `canStart: false` · `mode: null` | — |

`heldCheckSections`: 켜짐 · 계획 켜짐 · 지금 목표가 시범 목표 · P 의 마지막 풀이가 지금 `configuredAt` 이상 · `now` 이하이고 14일 미만. 경계: 정확히 14일이면 풀린다(확인 유예와 같은 경계).

생성기는 복귀 조건이거나 (발동 · 하루 한도 통과 · 유예 끝난 범위 있음)일 때만 불린다.

## 3. 루트가 연결할 때 — 이 조각이 기대하는 것

1. **추천 사슬 두 곳.** `courseSummary` 는 이어 풀기 · 계획 · 하루 한도 다음, 만기 · `learnedToday` 앞에서 `prerequisiteStep(course, now, enabled, { answered: 오늘 답한 수, goal: 오늘 목표 })` 를 부른다. `expeditionCourseRecommendation` 은 열린 초등 미션 안에서 `{ answered: mission.answered, goal: mission.goal }` 로 부르고, 같은 탐험 단원 검사는 그대로 둔다(시범 넷은 모두 `g5-fractions` — 시험이 확인).
2. **`check` · `return` · `fallback` 은 `{ sectionId, mode, reason }` 추천**으로 내고, 시작 경로는 `decision.session.problems` 를 그대로 쓴다(ID 만 CAS 재시도 밖에서 잡은 UUID 로). 사전 검사와 시작이 같은 씨앗 · 같은 본문이다. `return` 의 `learn` 은 `learnedToday` 를 이 한 번만 넘는다.
3. **`unavailable`** 이면 새 세션을 내지 않는다. 이어 풀기는 그대로다. 학생 화면은 자동 시작을 멈추고 시작 단추를 이유와 함께 막는다(화면은 시안 선택 뒤).
4. **계약의 표시 맥락**(`prerequisiteContextSchema.kind` 는 `check | return | unavailable`)에 `fallback` 이 없다. 제안: `fallback` → `{ kind: "unavailable", sectionId: T, canStart: true, reason: PREREQUISITE_REASONS.fallback }`. 계약을 바꾸는 것은 루트의 일이다.
5. **만기 보류.** `heldCheckSections(...).sectionIds` 를 만기 목록에서 뺀다. 합의 기록대로 `summary.dueCount` 는 보류를 빼고 센다. 교사 근거의 `heldSectionIds` · `holdReason` 에는 이 함수의 값을 그대로 싣는다.
6. **교사 근거 DTO** = `{ source: "completed_elementary_course", configuredAt: course.plan?.configuredAt ?? null, versions: prerequisiteVersions(그래프 해시), sections: pilotEvidence(course, now), heldSectionIds, holdReason, context }`.
7. **스위치** `MATH_PREREQ_CHECK=on` 은 루트가 읽어 `enabled` 로 넘긴다. 이 조각은 환경변수를 읽지 않는다.

## 4. 시험

| 파일 | 수 | 무엇 |
|---|---|---|
| `mathPrerequisiteSupplyGate.test.ts` | 9 | 위 §1 |
| `mathPrerequisiteMapping.test.ts` | 7 | 범위 · 차례 · 탐험 단원 · 단원 정보(부분 확인 · 미지원) · `targetForCourse` 가 `courseSummary().currentSectionId` 와 같음 · 판 넷 |
| `mathPrerequisiteEvidence.test.ts` | 14 | 미측정 · 통과 · 실패 · 포기 · 재도전 · 힌트 · 자기채점 · 앞 세션과 세션 안 같은 본문 · 줄바꿈 정규화 · 계획 저장 전 · 저장 전에 시작해 뒤에 끝난 세션 · 14일 경계 · 기억이 더 새것 · 진도가 더 새것 · 앞날 기록 · 진행 중 · 이력 절단 · 학생 분리 · 본 본문 모음 |
| `mathPrerequisiteSupply.test.ts` | 7 | 씨앗 결정성 · 다섯 조건 · 같은 입력 같은 결과 · 본 본문 건너뜀 · 20후보 바닥 · 세션 안 같은 본문 · 그림 · 보기 결함 · 은행 0 |
| `mathPrerequisitePolicy.test.ts` | 23 | 한 번 실패 무발동(생성기 0회) · learn+review 둘 실패 발동 · 중간 통과 · 계획 재저장 · 14일 경계 · 앞날에 끝난 실패 · 진도가 더 새것 · 꺼짐 · 계획 꺼짐 · 시범 밖 · 남은 분량 4/5 · 진행 중 · KST 자정의 하루 한도 · 유예 13일 / 14일 / 둘 다 · 복귀(재도전 남음 · 보통 복습 뒤 · 목표 변경 · 계획 재저장 전의 P · 앞날에 끝난 P · 이력 절단) · 대체 연습 · 시작 불가 · 결정성 · 학생마다 다른 씨앗 · 조건 밖 100명 생성기 0회 · 보류와 풀림(계획 재저장 · 14일 · 두 목표 완료 · 꺼짐 · 앞날 기록은 보류 안 함) |

코스 기록은 손으로 짓지 않고 제품 전이(`setCoursePlan` · `startRecommendedCourse` · `submitCourseAttempt`)로 만든 뒤 `storedCourseSchema` 로 확인한다(`src/__tests__/helpers/mathPrerequisiteCourse.ts`). 저장 스키마가 막는 경우(힌트 · 자기채점 · 같은 본문)만 복제해 그 칸을 바꾼다.

변이 여섯을 넣어 시험이 무는지 보았다 — 포기를 오답으로 세기 · 하루 한도 빼기 · 피할 본문 빼기 · 앞날 기록 거르기 빼기 · 진도 무시 · 복귀의 계획 저장 경계 빼기. 여섯 다 시험이 빨개졌고(1 · 1 · 1 · 2 · 2 · 1개) 원본은 바이트 그대로 되돌렸다.

이웃 기존 시험: `kstDate` · `mathSrsElementaryCourse` · `mathSrsCourseServer` · `elementaryCourseProgress` · `mathExpeditionJourney` · `mathExplorersCurriculumBridge` 6파일 121개 통과. 프로젝트 전체 `tsc --noEmit` 오류 0. 새 파일 eslint 깨끗.

## 5. 한계 — 말하지 않는 것

- 문항류가 다르다고 말하지 않는다. «본문이 다르다»뿐이고, 비교 범위는 보존된 세션 30 + 현재 + 최근 답안 100 이다.
- 근거와 발동은 보존된 기록 안에서만 본다. 잘린 원천은 `unknown` 이다.
- 정책 수치(2세션 · 4 · 2 · 14일)는 잠정이다.
- 이 조각만으로는 학생에게 아무것도 바뀌지 않는다 — 루트가 연결하고 스위치를 켜야 한다. 브라우저 검증 · 화면 · 저장 호환 시험(옛 파서) · 경로 시험은 루트의 관문이다.
- `return` 의 문장은 plan-v03 §9 그대로다. 합의 기록이 Hi-fi 에서 «보통 복습 뒤에도 참인 문장»을 같이 보기로 했다.
