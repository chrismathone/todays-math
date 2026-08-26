# family_key 중복 금지 — 선택·배치 코드 조사 (회수본)

> 🔴 **이 문서는 codex 세션 스크롤백에서 되살린 것이다.**
> 2026-08-26 10:36 에 `family-dedupe-code-audit` 워크트리의 codex 가 읽기 전용 조사를
> 끝내고 **터미널에만** 답했다. 그 세션이 죽으며 스크롤백이 통째로 사라졌고,
> `~/.codex/sessions/2026/08/26/rollout-...01a03bb6...jsonl` 에서 되찾았다.
>
> **교훈**: 조사 결과를 채팅에만 남기면 창이 닫힐 때 같이 사라진다. 한 단위를
> 끝낼 때마다 파일 하나를 쓸 것 (CLAUDE.md 2026-08-21 항목).
>
> ⚠️ 아래 내용은 **검증되지 않았다** — 인용된 파일·함수·줄을 직접 열어 확인할 것.

읽기 전용 조사를 완료했습니다. 현행 코드에는 정확히 `composePaper`라는 함수는 없고, 일반 출제의 `selectProblems` 계열과 별도 예측 출제의 `composePredictedPaper` 계열이 있습니다.

핵심 결론은 `family_key` 중복 금지는 조회 자격인 `findEligibleProblems`의 `WHERE` 조건이 아니라, 여러 후보 중 시험지 한 장을 구성하는 `selectProblems`/`balanceDifficulty`와 `composePredictedPaper` 경계에서 강제해야 한다는 것입니다. `problemType` 판정·값 변환은 건드릴 필요가 없습니다.

## 1. 호출 흐름

일일·확인테스트:

```text
POST /api/tests/generate
→ generateDraftTest
→ resolveRange
→ findEligibleProblems + loadRecentProblemIds 병렬 조회
→ selectProblems
   → 최근 problemId/directUseAllowed 제외
   → seededShuffle
   → balanceDifficulty
      → 난이도별 선정·인접 난이도 대체
      → problemType·단원 사용 빈도 균형
   → arrangeByType
      → 같은 problemType 3연속 회피
   → avoidTightFirstSeats
      → 첫 장 좁은 자리 맞바꿈
→ 정원 미달이면 INSUFFICIENT_PROBLEMS
→ 정원이 차면 Test/TestProblem 트랜잭션 저장
```

문항 교체:

```text
PUT /api/tests/{id}/problems/{seq}
→ replaceTestProblemAtSeq
→ 현재 시험지 problemId + 최근 14일 problemId 제외
→ 원래 난이도 → 아래 인접 → 위 인접 순으로 한 문항 탐색
→ 없으면 INSUFFICIENT_PROBLEMS
```

예측 문제지:

```text
POST /api/tests/predicted
→ generatePredictedPaper
→ 문제은행 후보 조회
→ composePredictedPaper
   → 청사진 슬롯 생성
   → 전체 슬롯 정확 일치 1차
   → 남은 슬롯 완화 2차
   → 배점 100점 보정
→ persistPredictedPaper
   → unfilled가 하나라도 있으면 저장 거부
```

`composeRounds`는 예측 회차의 화면 응답을 조합할 뿐 문항 선정기가 아닙니다. `buildExamPaper`는 기출 이관용이고, `/dev/print-paper/pickPaperProblems`는 인쇄 검수 표본 전용이라 프로덕션 자동 출제 경계가 아닙니다.

## 2. 정확한 파일·함수·줄

| 역할 | 위치 |
|---|---|
| 일반 출제 API 입구 | [route.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/app/api/tests/generate/route.ts:16) |
| 전체 일반 출제 조립 | [generateDraftTest.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/tests/generateDraftTest.ts:28) |
| 후보·최근 이력 병렬 조회 | [generateDraftTest.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/tests/generateDraftTest.ts:115) |
| `selectProblems` 호출 | [generateDraftTest.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/tests/generateDraftTest.ts:122) |
| 출제 자격 공통 `WHERE` | [findEligibleProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/findEligibleProblems.ts:67) |
| 후보 조회·필드 선택 | [findEligibleProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/findEligibleProblems.ts:92) |
| 순수 선정 오케스트레이터 | [selectProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/selectProblems.ts:98) |
| 난이도·단원·유형 구성 선정 | [balanceDifficulty.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/balanceDifficulty.ts:200) |
| 후보 한 건의 우선순위 비교 | [balanceDifficulty.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/balanceDifficulty.ts:154) |
| 같은 유형 3연속 회피 | [selectProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/selectProblems.ts:201) |
| 마지막 첫 장 자리 맞바꿈 | [selectProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/selectProblems.ts:174) |
| 최근 14일 조회 | [recentProblemIds.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/tests/recentProblemIds.ts:19) |
| 일반 출제 부족 응답 | [generateDraftTest.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/tests/generateDraftTest.ts:130) |
| 문항 교체 | [replaceTestProblem.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/tests/replaceTestProblem.ts:37) |
| 예측 후보 조회·조립 호출 | [generatePredictedPaper.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/predictor/generatePredictedPaper.ts:314) |
| 예측 문제지 구성 | [composePredictedPaper.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/predictor/composePredictedPaper.ts:269) |
| 예측 정확/완화 2회 배정 | [composePredictedPaper.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/predictor/composePredictedPaper.ts:302) |
| 예측 결손 저장 거부 | [persistPredictedPaper.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/predictor/persistPredictedPaper.ts:96) |
| `familyKey` DB 의미·범위 | [schema.prisma](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/prisma/schema.prisma:455) |
| 가족의 DB 정체가 `(unitId, familyKey)`임 | [schema.prisma](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/prisma/schema.prisma:305) |

## 3. 현재 우선순위·fallback·부족 동작

일반 출제 자격은 다음 조건입니다.

- `pool='shared'`
- 지정된 `unitId`
- `reviewStatus='approved'` — D-22
- `directUseAllowed=true`
- `answer != "(정답 없음)"`
- 필요하면 특정 난이도

`problemType`은 자격 필터가 아닙니다. DB 값을 조회해 `ProblemType`으로 캐스팅할 뿐이며, 판정하거나 다시 분류하지 않습니다.

D-20은 사용자 소유의 모든 시험에서 UTC 날짜 기준 `[오늘-14일, 오늘]` 폐구간을 조회합니다. 반·학생·시험 상태를 따로 제한하지 않고 `problemId`만 제외합니다. 즉 같은 가족의 다른 아류는 현재 최근 중복으로 인식하지 않습니다.

선정 우선순위는 다음과 같습니다.

1. 난이도 사다리 순서 `연산 → 기본 → 응용 → 심화`
2. 해당 난이도 정확 후보
3. 후보 내부에서는:
   - 이어지는 장의 칸에 들어갈 가능성이 높은 문항
   - `현재 단원 사용량 + problemType 사용량`이 작은 문항
   - 동률이면 단원 사용량이 작은 문항
   - 다시 동률이면 시드 셔플 순서
4. 정확 난이도가 부족하면 인접 난이도:
   - 쉬운 쪽을 먼저
   - 그다음 어려운 쪽
   - 두 칸 이상 건너뛰지 않음
5. 대체 사실은 `substitutions`에 기록

`problemType` 균형은 목표 개수를 강제하는 quota가 아니라 사용 빈도를 낮추는 휴리스틱입니다. 지면 적합성이 유형 균형보다 우선합니다.

3연속 회피도 절대 금지가 아닙니다.

- `arrangeByType`은 직전 두 문항과 같은 유형을 우선 후보에서 뺍니다.
- 가능한 유형 중 남은 문항 수가 가장 많은 버킷을 선택합니다.
- 가능한 유형이 하나도 없으면 전체 남은 유형으로 fallback하므로 3연속을 허용합니다.
- 그 뒤 `avoidTightFirstSeats`가 첫 장의 최대 두 자리를 뒤 문항과 맞바꿉니다. 재배치 후 3연속을 다시 검사하지 않으므로 이 맞바꿈이 연속을 재도입할 가능성도 있습니다.

따라서 현행 의미는 “가능한 구성에서 3연속 회피”이지 “결과 불변식으로 3연속 금지”가 아닙니다.

부족 동작은 다음과 같습니다.

- `balanceDifficulty`는 정확+인접 대체로도 못 채운 난이도를 `shortfall`에 남깁니다.
- 최종 문항 수가 요청 수보다 작으면 `generateDraftTest`가 draft를 저장하지 않고 HTTP 422, `INSUFFICIENT_PROBLEMS`를 반환합니다.
- `available`은 최근 문제를 뺀 행 수입니다.
- 확인테스트의 AI 보충 대상은 범위 내 행 수가 가장 적은 단원이며, 동률이면 앞선 단원입니다.
- 현재는 행 수를 세므로 같은 `familyKey` 아류가 여러 개면 가용 수가 부풀려집니다.

예측 문제지는 별도입니다.

- 여기서 “유형”은 `problemType`이 아니라 `questionType`인 `객관식/단답형/서술형`입니다.
- 모든 슬롯을 정확 일치로 먼저 채운 후, 남은 슬롯을 완화합니다.
- 완화 비용은 `단원 4 > 난이도 2 > 유형 1`.
- 그다음 같은 학교 과거 재출제 문항, 출처 순위, `problemId` 순입니다.
- 난이도 fallback은 일반 출제처럼 인접 한 칸 제한이 아니라 비용 기반 완화입니다.
- 일부라도 채우면 composer는 `unfilled`를 담은 성공 결과를 내지만, 저장 계층이 `unfilled > 0`이면 거부합니다.
- 외부 응답은 422 `VALIDATION_ERROR/판단 불가`이며 `INSUFFICIENT_PROBLEMS` 코드를 쓰지 않습니다.

## 4. `family_key` 결합 지점과 주의점

현재 일반 출제는 `familyKey`를 아예 읽지 않습니다.

- `EligibleProblem`에 없음: [findEligibleProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/findEligibleProblems.ts:43)
- Prisma `select`에도 없음: [findEligibleProblems.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/findEligibleProblems.ts:99)
- `SelectableProblem`에도 없음: [balanceDifficulty.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/balanceDifficulty.ts:34)
- 중복 방지는 `selectedIds`만 사용: [balanceDifficulty.ts](/C:/Users/user/orca/workspaces/testautocreator/family-dedupe-code-audit/src/lib/generator/balanceDifficulty.ts:213)

예측 계열도 DB 전체 행은 읽지만 `toCandidate`와 `PaperCandidate`가 `familyKey`를 버리며, composer의 `used`는 `problemId`만 봅니다.

올바른 결합 경계는 다음과 같습니다.

1. `findEligibleProblems`는 `familyKey`를 후보 필드로 전달해야 합니다. 다만 `eligibleProblemsWhere`에서 가족을 제거하거나 Prisma `distinct`로 먼저 한 행만 남기는 것은 부적절합니다. 어느 아류를 선택할지는 난이도·지면·단원·유형 우선순위를 본 뒤 결정해야 합니다.

2. 실제 hard invariant는 `balanceDifficulty`가 유지하는 시험지 전체 상태에 두는 것이 맞습니다. 정확 난이도와 인접 fallback을 모두 가로지르는 하나의 `usedFamilyIdentities`가 필요합니다. 같은 가족의 두 번째 후보는 선택 후보에서 제외해야 합니다.

3. 가족의 DB 정체는 raw `familyKey` 하나가 아니라 `(unitId, familyKey)`입니다. `ProblemFamily`의 기본키가 이 복합키입니다. 엔진 키에 단원 정보가 들어가더라도 코드가 그 우연에 의존하면 안 됩니다.

4. `familyKey=null`을 모두 같은 가족으로 처리하면 안 됩니다. 새 행은 트리거가 `solo:<uuid>`를 채우지만 옛 행과 테스트 픽스처에는 null이 남습니다. 방어적으로 null은 `problemId` 기반의 독립 가족처럼 취급하는 것이 D-105의 “혼자 한 무리” 의미와 맞습니다.

5. 가족이 여러 난이도·`problemType`에 걸치지 않는다는 DB 제약은 없습니다. 단순한 선착순 가족 차단은 앞 난이도에서 고른 아류 때문에 뒤 난이도의 유일 후보를 막아 불필요한 부족을 만들 수 있습니다. 가족 중복을 hard constraint로 넣되, 정확/인접 우선순위를 깨지 않는 픽스처와 필요하면 가족 단위 매칭 검토가 필요합니다.

6. `available`과 확인테스트의 `thinnestUnitId`도 행 수가 아니라 최근 제외 후 고유 가족 수로 맞춰야 합니다. 그렇지 않으면 실제로는 5가족뿐인데 아류 50행을 보고 `available: 50`이라고 응답합니다. `shortfall.available`도 같은 주의가 필요합니다.

7. 문항 교체 경로도 별도 배선이 필요합니다. 현재 시험지의 다른 문항들이 가진 가족을 제외 집합으로 넘겨야 합니다. 교체 대상의 기존 가족까지 제외할지는 별도 정책입니다.
   - “완성된 시험지 안 중복 금지”만 뜻하면 교체 대상 가족은 다시 선택 가능
   - “교체했으면 숫자만 다른 같은 류도 금지”라면 기존 가족도 제외

8. `composePredictedPaper`에도 같은 hard constraint가 별도로 필요합니다. `PaperCandidate`/`toCandidate`에 가족 정보를 전달하고, 정확 일치 1차와 완화 2차가 공유하는 가족 사용 집합을 둬야 합니다. 일반 `selectProblems`만 고치면 예측 시험지는 계속 같은 가족 아류를 여러 개 선택할 수 있습니다.

9. D-20과는 범위를 구분해야 합니다. 이번 규칙이 “한 시험지 안 같은 가족 금지”라면 현재 최근 14일 `problemId` 제외는 그대로 둡니다. 최근 14일 동안 같은 가족의 다른 아류까지 금지하려는 것이라면 `loadRecentProblemIds`도 가족 단위 원장을 읽도록 확장해야 하는 별도 정책 변경입니다.

가족 중복은 `problemType`과 독립된 축입니다. 가족을 hard constraint로 거른 뒤에도 현재 `problemType` 사용 빈도 비교와 3연속 회피는 그대로 적용할 수 있으므로, 판정 기준 로직을 손댈 이유가 없습니다.

파일 수정·생성·커밋·DB 쓰기는 수행하지 않았고, 작업 트리는 깨끗한 상태입니다. 테스트도 쓰기 가능성을 피하기 위해 실행하지 않았습니다.
