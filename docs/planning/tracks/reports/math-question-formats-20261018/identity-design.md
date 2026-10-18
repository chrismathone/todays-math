# 수학 은행 문항 정체·형식 — READ-ONLY 설계 조사

- 조사 기준: `1d84a0a93` (2026-10-18). 이 작업은 **설계 조사만** 수행했다. 애플리케이션·생성기·DB·API·학생 기록을 변경하지 않았고, DB에 접속하지 않았다.
- 입력: `/Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-type-audit-20261018/{snapshot.jsonl,units.json,snapshot-meta.json}`. JSONL을 행 단위로 읽었으며 원본을 복사·수정하지 않았다.
- 스냅샷 생성 기준은 `cd067a49a90283749ea9f525073a4a469eef54bd`, SHA-256은 `daf90c9a97e0630bb8be372e873187603f1fdbf5a201de18c009e266f7cfbac3`이다. 그 시점과 조사 HEAD 사이에는 관련 런타임 구현 변경이 없고 감사 문서·감사 스크립트만 추가됐다.
- 관련 Next 문서는 이 작업 트리에 `node_modules`가 없어 기준 작업 트리의 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`에서 읽었다. 요청 의존 GET은 기본 캐시되지 않으며, 이번 제안에서도 계정별 recent 결과를 전역 캐시하지 않는다.
- 수치·재현 알고리즘·호출자 목록은 [identity-design.json](identity-design.json)에 함께 담았다. 구현 계획 확정과 Claude 승인은 coordinator의 후속 작업이다.

## 1. 한 가지 권고

**검증된 형제에만 공통 `Problem.questionGroupKey`를 적는 nullable 컬럼·조회 인덱스·편집 무효화 트리거를 추가하고, 한 서버 projection으로 목록·수량·출제를 통일하는 안을 권고한다.** 실제 저장 단위는 현재 `Problem.id`와 형식별 행을 그대로 유지한다. 다른 숫자 변형을 묶는 `familyKey`와 같은 문항의 객관/단답을 묶는 `questionGroupKey`를 별개의 축으로 둔다.

이 선택은 스키마 없는 방법이 논리적으로 불가능해서가 아니다. 외부 키로 후보를 찾은 뒤 현재 발문·정답·해설·그림을 전량 대조하는 schema-free projection도 정확하게 만들 수 있다. 그러나 기본 가용량의 현재 구현은 좁은 `groupBy`인데, 엄격한 full-parser를 자격 후보 전량에 적용하면 비교 필드의 값만 **245,923,338 bytes**이며 그중 SVG가 **169,299,750 bytes**다. 따라서 이를 기본 조회의 영구적인 실행 경로로 삼는 것은 권하지 않는다. 외부 키 정규식만 쓰는 빠른 방법이나 수정 검증 없는 정적 manifest는 권하지 않는다.

권고안의 최소 범위는 다음과 같다.

1. 최초 proof/backfill과 이후 생성 시점에만 두 형식의 실제 내용을 검증한다. 확인된 쌍에만 공통 키를 적고, 나머지는 `NULL`로 둔다. 런타임 논리 키는 `questionGroupKey ?? row:<id>`다.
2. 정체에 영향을 주는 컬럼이 실제로 수정되면 DB `BEFORE UPDATE` 트리거가 **수정된 행의 키를 NULL로 지운다**. 앱의 Prisma 경로뿐 아니라 옛 코드·직접 SQL·정비 스크립트에도 적용한다. 다른 형제의 키가 남아도 혼자이므로 1개이고, 수정된 행은 별개로 세어 잘못 합쳐지지 않는다.
3. 목록·가용량·출처 재고·출제 후보가 같은 현재 gate와 projection을 사용한다. 기본 projection은 작은 메타데이터만 읽고, 최종 페이지/출제에 선택된 실제 행만 본문을 읽는다. 형식 판정이 본문을 필요로 하는 경우는 현재 `findProblemIdsByFormat`의 후보 좁히기를 유지한다.
4. 출제 시 그룹 안에서 **실제로 존재하고 현재 조건을 통과한 형식의 행**을 선택한다. 저장·인쇄·채점·학생 응답은 선택된 기존 `Problem.id`를 사용한다. 공통 키를 UUID 자리에 넣지 않는다.
5. 한 시험지에서 같은 논리 문항은 항상 한 번만 쓴다. `distinctFamilies=false`는 서로 다른 숫자 변형을 허용하는 선택이지, 같은 문항의 객관/단답 두 행을 허용하는 선택이 아니다.

실제 컬럼·트리거·backfill·API 구현은 승인 이후의 작업이다. 이 보고서는 그 변경을 실행하지 않는다.

## 2. 전량 분모와 증명 가능한 투영

| 대상 | 물리 행 | 엄격히 검증된 쌍에 따른 감소 | 논리 문항 투영 |
|---|---:|---:|---:|
| 공용 보유 전체 | 118,020 | 47,746 | **70,274** |
| 출제 가능 (`eligible` 원본 값) | 115,575 | 47,733 | **67,842** |

- 물리 ID와 문항 코드는 각각 118,020개이며 중복은 0개다. 전 행의 `pool=shared`다. **DB 행 삭제 수는 0**이다.
- 검증된 쌍 47,746개 + 나머지 단독 행 22,528개 = 70,274개다. 검증된 쌍 중 양쪽 출제 가능은 47,733개, 양쪽 불가는 13개이며 한쪽만 가능한 검증 쌍은 없다.
- 허용 문법으로 파싱되는 엔진 행은 99,223개, 외부 키 후보 그룹은 51,475개다. 이 중 객관/단답 후보 쌍은 47,748개이며 **2쌍은 증명이 부족해 합치지 않았다**. 외부 키만으로 합치면 보유 70,272·가용 67,841이 되어 엄격한 투영과 다르다.
- 검증 쌍은 초등 25,658 / 중등 22,016 / 결합형 72개다. 출제 가능 감소는 각각 25,658 / 22,003 / 72개다.
- 가용 논리 문항 67,842와 기본 D-111의 가용 **문항류 15,878**은 다른 수다. 전체 비어 있지 않은 `(unitId, trim(familyKey))`는 16,367개다. 기본 출제 상한을 67,842개로 바꾸면 안 된다.

| 학년/과목 | 보유 행 | 논리 보유 | 가용 행 | 논리 가용 |
|---|---:|---:|---:|---:|
| 초3 | 12,695 | 6,721 | 12,695 | 6,721 |
| 초4 | 13,651 | 7,296 | 13,651 | 7,296 |
| 초5 | 15,029 | 8,266 | 14,148 | 7,385 |
| 초6 | 14,545 | 7,979 | 13,675 | 7,109 |
| 중1 | 23,893 | 15,376 | 23,656 | 15,151 |
| 중2 | 23,582 | 13,822 | 23,375 | 13,616 |
| 중3 | 7,958 | 4,147 | 7,857 | 4,046 |
| 공통수학1 | 2,417 | 2,417 | 2,376 | 2,376 |
| 공통수학2 | 797 | 797 | 763 | 763 |
| 대수 | 1,925 | 1,925 | 1,910 | 1,910 |
| 미적분1 | 702 | 702 | 680 | 680 |
| 확률과 통계 | 589 | 589 | 561 | 561 |
| 기하 | 237 | 237 | 228 | 228 |

이것은 **현재 불변 스냅샷에 대한 보수적 투영**이다. 앞서 승인된 오류 14행 수정, 유형 정리, 추가 42행의 원본/원장 검토를 반영한 미래 분모가 아니다. Coordinator는 이후 `tri222Pick`까지 포함해 수정 검토 대상을 **17행/5 family**로 확장했다고 전달했다(이 worker의 별도 원문 검증 결과가 아님). 의미상 모든 중복을 찾았다는 주장도 아니다. 단원별 결과는 JSON의 `perUnit`에 있으며 입력은 735개 단원, 문항이 있는 단원만 그 결과에 나타난다.

### 보류한 두 후보

| 외부 키 후보 | 기존 코드 | 보류 근거 |
|---|---|---|
| `engine-elem:초6\|1-6 직육면체의 겉넓이와 부피\|1-6-1 직육면체의 겉넓이 구하는 방법\|f08\|{형식}\|s20271926` | `E60601-A12-023` / `E60601-A12-024` | 발문·정답 보기·해설은 같으나 `figureSvg` 원문이 다름. 양쪽 가용. |
| `engine-mid:1-2\|원과 부채꼴\|18\|s20260827\|v3\|{형식}` | `J10605-A10-007` / `J10605-A10-008` | `π` 대 `1π` 정답/해설 표기와 SVG가 다름. 객관식은 잠겨 있음. |

둘째는 수학적으로 같은 값처럼 보이지만 이번 검사는 표기를 대수적으로 정규화하지 않았다. SVG가 단순 표시 수정인지도 원문 증명 없이 단정하지 않았다. 보류는 신규 오류 확정이나 수정 지시가 아니다.

## 3. 안전한 같은 문항 판정

### 서로 다른 네 정체

| 정체 | 뜻 | 보존/사용 |
|---|---|---|
| `Problem.id`, `problemCode` | 실제로 보고·저장·채점했던 형식별 행 | 영구 보존. 코드 재발급·행 삭제·FK 치환 금지. |
| `questionGroupKey` (제안) | 같은 수치·조건·그림·물음을 공유하는 증명된 형식 표현 | 은행에서 한 문항으로 세고 한 형식을 선택하는 단위. |
| `(unitId, familyKey)` | 같은 문항류의 다른 수치 변형까지 포함 | D-111 기본 한 시험지 한 류 제한에 그대로 사용. |
| `externalId` / `originProblemId` / 원본 참조 | 생성·재이관 멱등성 / 변형의 부모 / 자료 출처 | 근거로 사용하되 그 자체를 같은 문항이라고 보지 않음. |

### 현재 증명 가능한 생성 계약

- [load-engine-problems.ts:202](../../../../../scripts/import/load-engine-problems.ts#L202)는 이미 `variantKey`를 한 변형의 두 형식 묶음으로 정의한다. 다만 이 값은 `Problem`에 저장되지 않는다.
- 초등 외부 키: `engine-elem:<grade>|<chapter>|<section>|f<form>|<단답형·객관식>|s<seed>` (351행).
- 중등 외부 키: `engine-mid:<entry.key>|s<seed>|v<variant>|<단답형·객관식>` (424행).
- 결합형 외부 키: `engine-mid-combo:<def.id>|s<seed>|v<variant>|<단답형·객관식>` (495행).
- [expandEngine.ts](../../../../../src/lib/engine/expandEngine.ts)는 같은 stem에서 단답·객관을 만든다. [deriveFormats.ts:234](../../../../../src/lib/engine/deriveFormats.ts#L234)의 `withChoices`는 발문 뒤에 ①~⑤를 덧붙이고 정답을 그중 번호로 바꾼다. 나머지 stem 값은 복사한다.
- `familyKey`만 같거나 씨앗 숫자만 같다고 묶지 않는다. namespace·소단원·문형/유형·seed·variant를 모두 보존한다. 초등의 chapter도 외부 키에서 유지한다. 서로 다른 seed의 문장이 우연히 같아도 이번 묶음 대상이 아니다.

### proof 조건 (모두 충족)

1. 위 세 namespace의 **전체 문자열 문법**에 맞는 외부 키이고, 형식 부분만 다른 정확한 단답 1행·객관 1행이다. suffix와 저장 `questionType`도 맞아야 한다. 알 수 없는 문법은 `row:<id>`다.
2. `unitId`, `source`, `familyKey`, `difficulty`, `problemType`, `originProblemId`, `sourceMaterialId`가 같아야 한다.
3. 객관 본문은 단답 본문의 끝 공백을 제거한 글 뒤에 **정확히 다섯 줄 ①~⑤**를 붙인 구조이고, 단답 본문과 그 prefix가 같아야 한다. 일반 OCR 파서의 문장/꼬리 중복 제거 결과를 동일성 증거로 쓰지 않는다.
4. 객관 정답은 단일 ①~⑤이며 그 보기를 읽은 값과 단답 정답의 trim 값이 정확히 같아야 한다. 단답 정답은 보기 번호가 아니다.
5. 해설은 정확히 같아야 한다. 도형은 `figureSvg`, `figureUrls`, `figureDims`, `figureSourceMm`, `choiceFigureIndex`, `figureSource`의 전체 값이 같아야 한다. 해시를 쓸 때는 원본 값에 대응하는 digest인지 검증한다.
6. 승인/잠금/공개 상태는 정체와 별도로 **각 행에** 적용한다. 한 표현의 자격으로 다른 표현의 잠금을 해제하지 않는다.

강한 충분조건이어서 일부 같은 문항을 남겨 둘 수 있다. 의미 유사도·숫자 skeleton·같은 정답·같은 문항번호·같은 원본 부모·`solo:` 접두사는 병합 근거가 아니다. 교과서 원본과 `tb-retry-v1:<origin>:1/2`는 다른 문제이고, 두 retry 슬롯도 서로 다른 변형이다. 옛 초등 `engine-elem:...|<갈래>|s<seed>` 1,751행은 위 형식 문법에 없으므로 그대로 단독이다.

## 4. 원래 객관식과 진짜 서술형

- `expandFamily`는 **보기가 있고 정답이 보기 번호인 원래 객관식**을 한 객관식으로 그대로 반환한다. 잘라 낸 발문만으로 문제가 성립한다는 보장이 없다. “옳지 않은 것 / 나머지 넷과 다른 것 / 모두 고르기”는 보기 자체가 조건이다.
- [middle/judge/contract.ts](../../../../../src/lib/middle/judge/contract.ts)의 `engine-mid-judge` 180행은 이 부류다. 현재 단답 형제가 없으며 형식 선택에서 “단답 지원”이라고 표시하지 않는다. 위 문법의 객관 단독 그룹 246개 역시 짝이 없다는 관측일 뿐, 전부 원래 객관식이라고 확정하지 않는다.
- “보기 중 …은 모두 몇 개인가”는 보기가 세는 자료이고 정답이 실제 개수일 수 있다. `answerIsChoiceNumber`와 `classifyFormat`의 현재 구분을 유지한다. 보기 존재만으로 객관식이라고 하거나 보기 삭제로 단답을 만들지 않는다.
- `expandEngine.ts`는 단답의 끝맺음만 바꾼 서술형 파생을 명시적으로 금지한다. 이번 설계에서도 `asDescriptive`를 출제 형식 변환에 사용하지 않는다.
- 현재 `questionType=서술형`은 307행(가용 277)이며, 원본 계열 265 / textbook retry 30 / `engine-native-desc` 12행이다. [nativeDescriptive20261018.ts](../../../../../src/lib/engine/nativeDescriptive20261018.ts)의 12행은 복수 물음·모범답·rubric을 처음부터 만드는 별도 생성 계약이다. 단답과 합치지 않는다. 나머지 295행의 서술 품질을 이번 조사에서 인증한 것은 아니다.
- 따라서 화면은 `주관식`을 하나의 변환 버튼으로 제공하지 않고 `단답형`·`서술형`을 구분한다. 저장된 형제가 없으면 해당 형식은 선택 불가다.

## 5. 권고 schema와 변경 안전장치

- nullable `questionGroupKey` 하나와 키 조회 인덱스를 추가한다. 키는 예를 들어 `q:v1:<증명된 external tuple의 SHA-256>`처럼 namespace를 가진 불투명 문자열로 만들고, 충돌 검사를 manifest에서 수행한다. fallback `row:<uuid>`와 구분한다. `externalId`를 고쳐 쓰거나 형식 suffix를 지우지 않는다.
- `@@index([unitId, questionGroupKey])` 및 직접 형제 조회용 키 인덱스를 검토한다. 최종 인덱스는 실제 쿼리 `EXPLAIN`으로 결정한다. `questionGroupKey + questionType` 전역 UNIQUE는 넣지 않는다. 알 수 없는 원본·여러 표현을 성급히 제한할 수 있다.
- 무효화 대상: 위 proof의 본문·정답·해설·도형 6필드·메타데이터 7필드와 `externalId`, `questionType`. `IS DISTINCT FROM`으로 실제 값 변경을 확인한다. `updatedAt`·검수·잠금·pool 변경만으로는 키를 지우지 않는다. 공개/자격은 매 요청 gate가 다시 판정한다.
- 트리거는 정체 컬럼 수정과 키 재설정을 같은 UPDATE에 실어도 **NULL로 무효화**한다. 내용 변경 뒤 별도 proof를 거쳐서만 키를 다시 준다. DELETE 후 남은 형제 한 행은 정상적인 단독 그룹이다. INSERT는 NULL 기본값으로 시작한다.
- backfill은 현재 두 행을 같은 트랜잭션에서 다시 읽고, proof와 현재 값/시각을 확인해 **둘 다** 키만 갱신한다. 한쪽이라도 달라지면 두 갱신을 롤백한다. 현재 snapshot manifest를 그대로 DB에 적용하지 않는다.
- 키만 backfill하며 기존 `updatedAt`·본문·코드·자격을 바꾸지 않는다. Prisma `@updatedAt` 자동 변경으로 95,492행의 원본 revision을 흔들지 않도록 관리 SQL의 실제 SET 열과 readback을 검토한다. 현재 migration 조사에는 `problem.updated_at`을 자동 갱신하는 범용 DB 트리거가 보이지 않았지만 실행 전 실제 schema 확인이 필요하다.
- 기존 `problem_code_freeze`, `registered_problem_outer_wall` 및 relation guard와 함께 시험한다. raw SQL은 `db.ts`의 Prisma 가시성 extension을 우회하므로 `problemVisibleWhere`/자격을 빠뜨리지 않는 전용 서버 경계를 사용한다. 바깥벽의 등록 행이나 기록을 이 backfill 명목으로 해제하지 않는다.
- 새 엔진 적재기는 현재 `variantKey`를 후보 생성에 사용하되, 실제 pair proof 후 키를 설정한다. `verified-engine-batch`, refresh/QA 스크립트가 내용을 고치면 자동 무효화되고 승인된 재검증이 키를 회복한다. AI 생성·수동 등록·변형은 source 증명이 없으면 단독이다.
- 기존 코드가 새 컬럼을 모르는 것은 읽기 호환이다. 그러나 옛 은행 화면은 행 단위 수량을 계속 보이므로 런타임 cutover는 관련 caller를 함께 올려야 한다. 과거 시험·학생 기록은 변환하지 않는다.

## 6. 한 projection으로 목록·수량·필터를 맞추는 법

개념적으로 아래 관계를 한 서버 모듈(`questionProjection`, 제안)이 소유한다.

```text
rowKey(r) = r.questionGroupKey ?? ('row:' + r.id)
matchingRows(F, gate) = 한 실제 행이 gate와 모든 행 필터 F 및 classifyFormat을 함께 통과한 집합
blockedQuestions = rowKey(명시 excludeIds ∪ 해당 계정/기간 recentIds)
questions(F, gate) = matchingRows를 rowKey로 묶은 뒤 blockedQuestions와 선택적 family 제외를 적용
```

- **묶은 뒤 페이지를 자른다.** 페이지의 행을 받은 뒤 UI에서 dedupe하거나 `skip/take` 뒤에 접지 않는다. `total`, 페이지 수, 페이지 항목은 같은 그룹 집합에서 나온다.
- 기본 가용량, 목록 total, 단원별 가용량은 논리 문항 수다. 기본 D-111 선택 상한은 별도 `familyCapacity`이며, `distinctFamilies=false`일 때만 논리 문항 수가 그 상한이다. 물리 행 수가 필요하면 `표현 수`라는 별도 단위를 사용한다.
- 검색·출처·자료·그림·해설·정답·난이도·형식은 **같은 실제 행**에 AND로 적용한다. 단답의 검색 일치와 객관의 형식 일치를 서로 빌려 합격시키지 않는다. `availableFormats(Q,F)`는 F와 자격을 함께 통과한 멤버에서만 구한다.
- 코드 완전 일치 검색은 입력한 실제 코드 행을 preview 기본값으로 유지하고, 그룹에 다른 코드가 있음을 설명할 수 있다. 코드가 그룹 대표 코드로 치환되면 보고서의 지목 대상이 달라진다.
- 명시 `ids`는 저장본 복원·검수용 정확 행 조회다. 이 모드는 요청한 ID를 다른 형제로 바꾸지 않는다. 그룹 목록 계약과 구분하고, 같은 그룹의 두 ID를 보낸 정확 조회가 두 행을 돌려줘도 재고 수량으로 사용하지 않는다.
- 그룹 차례는 현재 은행 정렬(`createdAt desc, id desc`)에 대응하는 고정 anchor를 그룹의 공개 멤버 중 정한다. 자료 선택 시 자료→자료 내 번호→anchor 차례를 유지한다. 동률 보조 키에 논리 키를 포함하고 format 변경으로 anchor를 새로 뽑지 않는다. anchor는 표시/선택될 실제 행과 별개다.
- `unitCounts`/grades/bootstrap의 무필터 수와 조건별 facets는 모두 논리 단위로 바꾸되 **각각의 기존 범위**를 명시한다. `bankSourceCounts`는 전역 재고이고 `bankSourceAvailability`는 현재 조건이다. 조건별 facets는 기존 axis를 뺀 조건 해석을 유지한다.
- 형식별 가용량은 서로 겹친다. 같은 한 문항이 객관·단답 양쪽 가용량에 한 번씩 속하므로 **형식 수의 합을 전체 수로 쓰지 않는다**. 다른 축도 그룹 내 값이 다를 수 있게 확장된다면 같은 주의가 필요하다.
- 현재 format 필터는 의도적으로 `short_answer`/`descriptive`만 허용한다. 새 grouped 계약에서 객관 선택을 지원하려면 `multiple_choice`도 `classifyFormat`과 같은 정확한 분류로 지원해야 한다. `questionType` 문자열만 비교해서 분류를 복제하지 않는다. unknown은 조용히 서술형으로 넣지 않는다.
- 한 요청의 후보·count·facets·page는 같은 read transaction/context를 공유하고 요청 안에서만 중복 조회를 memo한다. 별도 요청 사이에는 revision 또는 최종 재검증으로 변경을 알린다. 조립/형식 교체 직전 선택된 모든 실제 행의 자격·key·조건을 다시 확인하고 달라지면 409/재조회한다.
- 새 응답은 `version/countUnit=question`, `questionKey`, 실제 `selectedVariant.id`, 검증된 `variants`/`availableFormats`를 명시하는 별도 grouped schema를 둔다. `BankProblem.id`에 가짜 대표 UUID를 넣거나 기존 strict row 응답에 설명 없이 의미를 바꾸지 않는다. 운영/dev 라우트와 구형 은행 소비자는 같은 cutover에서 adapter를 전환한다.

메타데이터 projection을 한 번 읽어 그룹·필터·facet·page를 계산하는 것이 초기 구현의 단순한 방법이다. 메타데이터도 전량이면 O(N)이므로 성능 검증을 생략하지 않는다. DB `COUNT(DISTINCT COALESCE(key, row-id))`/그룹 pagination으로 내리는 것은 같은 projection 의미를 유지하는 후속 최적화다. 단순 Prisma `groupBy([key])`는 그룹 수만큼 응답하므로 추가 컬럼만으로 모든 aggregate가 저절로 저비용이 되지는 않는다.

## 7. 출제·형식 선택에서 꼭 바꿀 경계

현재 `unifiedBankSelection.assignFormats`(393행)는 뽑힌 행의 `(family, unit, difficulty)`를 형제로 본다. **같은 문항류의 다른 seed/variant도 형식 교체 후보가 된다.** 형식만 바꾸려다 숫자 문제가 바뀌는 경로다. 또한 `distinctFamilies=false`이면 family를 `row:id`로 만들어 기존 방식으로는 형식 형제가 연결되지 않는다.

새 구성에서는 다음 세 층을 따로 유지한다.

1. 교육적 제한: 가족 중복을 막을지 (`familyKey`, 기존 D-111 기본 on).
2. 내용 선택: 어떤 논리 문항을 낼지 (`questionKey`, 항상 중복 금지).
3. 표현 선택: **그 논리 문항 안에서** 어느 실제 형식 행을 낼지.

문항 검토의 형식 선택은 선택된 실제 행 전체(본문·정답·해설·그림·코드)를 교체하되 자리·문항 수·다른 자리·설정은 보존한다. 확정/인쇄/채점 기록에 이 동작을 소급 적용하지 않는다. 지원되지 않는 형식을 누르면 새 객관식 오답이나 서술형 발문을 즉석 생성하지 않는다.

기존 난이도·형식 수량 의도도 유지한다. 구성은 단원/난이도/형식/선택적 family 제한을 동시에 만족하는 실제 선택 결과를 증거로 반환해야 한다. 형식 없는 문항을 먼저 무작위로 뽑은 후 형식을 배정하다 모자랐다는 이유만으로 전체 재고 부족을 단정하면 안 된다. 다시 선택할 여지가 있는 작은 반례로 검증하고, 탐색 예산을 쓴 경우에는 증명된 재고 부족과 구분한다.

## 8. caller별 파일맵·경계

| 경로 | 현재 역할/관측 | 적용 또는 보존 경계 |
|---|---|---|
| `prisma/schema.prisma` Problem:809, TestProblem:1239, BasketItem:1280, ProblemAnswer:1356, TextbookProblemSnapshot:1993 | 형식별 행·불변 코드·기존 FK | 새 nullable key/index만 추가. 기존 PK/FK/코드·snapshot source ID 보존. 새 invalidation migration은 별도 승인. |
| `scripts/import/load-engine-problems.ts` 199/351/424/495, `verified-engine-batch.ts` 130 | variantKey/외부 키 문법·검증 적재 | 외부 키와 두 형식 행 유지. 저장 직전 실제 pair proof·키 부여 배선. |
| `src/lib/engine/{expandEngine,deriveFormats,variants}.ts` | 형식 파생·변형 차이·그림 포함 dedupe | 형식과 숫자 변형 구분 유지. `dedupeByVariant`를 질문 정체 전체 판정으로 확장하지 않음. |
| `src/lib/middle/judge/contract.ts`, `engine/nativeDescriptive20261018.ts` | 원래 객관/원래 서술 계약 | 단독 유지. 가짜 형제 생성 금지. |
| `src/contracts/{problem,bankSource}.contract.ts`, `components/unified/types.ts` | row list/2종 format 필터/BankData | 새 grouped schema·명시 단위·MC 정확 필터·선택된 실제 행 계약. 기존 ID detail schema 유지. |
| `src/lib/unifiedPreview.ts` resolve:82, select:265, metadata:353, list:421 | 필터/최근 제외/row count·skip·take | 공통 question projection·그룹 선 pagination. `externalId`를 공개하지 않아도 server key 전달 가능. |
| `src/app/api/studio/problems/route.ts`, `api/dev/unified/problems/route.ts` | GET/POST 읽기 wrapper | 같은 grouped loader/버전. 인증·메뉴 gate 유지. POST라고 저장 작업으로 바꾸지 않음. |
| `src/lib/problem/{provenance,formatQuery}.ts` | 정확 형식 판정·본문이 필요한 후보 읽기 | 기존 분류를 SSOT로 유지. 새 MC predicate·SQL/JS 동치 검사. 5,000 ID batching 유지. |
| `src/lib/{bankSourceRoute,bankSourceCounts,bankSourceAvailability}.ts`, 양쪽 `problems/sources` routes | 전역 재고·조건별 held/available·단원 family 상한 | 논리 수로 전환, 전역/조건 범위 보존, `familyCapacity` 별도. 모든 gate를 같은 projection에 적용. |
| `src/lib/unifiedBankSelection.ts` compose:206 / assignFormats:393 / select:519 | random/단원 할당/형식·난이도 의도 | Q를 먼저 확정하고 그 Q의 형식만 선택. family off에도 Q 중복 금지. 전체 조건을 통과한 행만 사용. |
| 양쪽 `problems/random/route.ts` | 위 두 random 요청 모양의 wrapper | 구형 difficulty-only random과 allocations 모두 적용. recent context 없는 조용한 우회 금지. |
| `components/exam-builder/{mathSource,MathExamBuilder,ExamBuilder,QuestionPicker,ReplaceDialog,ComposeConditions,conditionsPlan}.tsx/.ts` | 범위 상한·목록·추가/교체·형식 수량 | source info에 physical ID/Q key/family ID 분리. 선택·제거·재구성의 Q 중복 검사, 같은 Q 형식 교체 UI. 다른 영어 source 계약은 유지. |
| `components/unified/{BankView,BankRandomPanel,BankBasket,LegacyUnifiedWorkspace,UnifiedWorkspace,WorkspacePage}.tsx` | 구형 은행/담기/새 builder/bootstrap | 구형 화면도 grouped adapter 사용. 체크·전체 선택·담은 수는 Q 단위, 실제 담긴 행 ID는 유지. bootstrap의 단위도 함께 변경. |
| `src/app/api/problems/route.ts`, `lib/problem/problemApi.ts`, `components/problem/{ProblemBank,ProblemCard,BasketBar}.tsx` | 별도 `/problems` 은행·행 count/페이지 | 이 경로를 빠뜨리지 않음. grouped 목록 adapter를 쓰거나 명시적인 ‘형식 표현 관리’ 모드로 분리. 검수는 실제 ID로 유지. |
| `src/app/api/problems/[id]/**`, `api/studio/problems/[id]/route.ts` | 정확 행·신고·검수·갱신 | ID 요청을 다른 형제로 redirect하지 않음. 편집 시 DB key invalidation 검증. |
| `src/lib/{problemEligibility,problemPool,problemVisibility,db}.ts` | 자격·공개·바깥벽 | 규칙 복제/완화 금지. grouping이 locked/private 멤버를 승격하지 않음. |
| `src/app/api/basket/{route,test/route}.ts`, `lib/basket/readBasket.ts` | row ID unique 담기·시험지 생성 | 새 담기/출제에 Q 중복 검사. 기존 바구니에 두 형제가 있으면 설명하고 선택받으며 조용히 삭제하지 않음. 기존 시험지는 재작성하지 않음. |
| `src/lib/bankReadiness.ts`, 양쪽 `problems/check` routes | 저장 전 현재 자격 재조회 | 선택된 실제 행의 Q key/형식/조건도 확인. 멤버가 바뀌면 충돌 응답. |
| `src/lib/findEligibleProblems.ts` count:81 / find:89 | 자동 출제 후보·행 count | 후보에 Q key·실제 형식 근거 추가. 재고용 count와 한 시험지 family 상한 구분. |
| `src/lib/generator/{selectProblems,balanceDifficulty,familyKey}.ts`, `tests/draftCapacity.ts` | 일일 출제·한 류 제한·현재 family capacity | D-111 유지, recent/exclude는 Q 단위로 먼저 확장. `loadCapacityRows`도 동일한 필드/제외 적용. |
| `src/lib/tests/{generateDraftTest,runAutoDraft,replaceTestProblem}.ts` | 자동 초안/교체·부족 보고 | 미사용 Q·선택적 family 제한·최근 조건을 같은 후보에 적용. 기존 저장된 problemId·snapshotId 처리 유지. |
| `src/lib/tests/recentProblemIds.ts`, `bankQueryContext.ts`, `generator/excludeRecent.ts`, `daily/teachableBoundary.ts` | 14일/계정 이력·경계 존재 검사 | 기간·계정은 유지, 기록 ID를 현재 Q로 해석해 양 형식 제외. 다른 seed는 제외하지 않음. teachable 존재 검사는 의미 동일. |
| `src/lib/tests/{planTestRetry,retryCandidates}.ts`, `generator/{planRetry,textbookSlots}.ts` | 오답의 같은 family 변형·교과서 지정 슬롯 1/2 | 틀린 문항의 다른 형식을 ‘새 변형’으로 세지 않음. 교과서 두 슬롯·source/parent/slot 검증·foldedWrong 유지. D-20을 원래 안 쓰는 retry에 새 기간 제한을 넣지 않음. |
| `src/lib/predictor/{generatePredictedPaper,composePredictedPaper}.ts`, `contracts/scoreNormalizer.contract.ts` | 예측 출제 후보·used problemId만 검사 | used Q 중복 방지 추가. slot qtype은 실제 형식으로 맞춤. 기출 관측/학교·시점/배점 근거는 합쳐 쓰지 않음. |
| `src/lib/usageLabels/{load,assemble,rank}.ts`, 양쪽 `problems/labels` routes | 개인 30일 내 출제·현재는 행별 사용 수/순위 | 새 그룹 카드의 수는 Q별 `Set<testId>` 합집합으로 계산. 같은 시험에 두 형식이 있던 과거 기록을 두 번 세지 않음. 개인/기간/최소표본 규칙 유지. old physical 라벨과 단위 구분. |
| `src/lib/tests/{testProblemContent,loadTestProblems}.ts`, `serializers.ts`, `print/toPrintProblem.ts`, `examPublication/server.ts` | 저장/불변 snapshot/출판·인쇄·채점 | 선택된 실제 ID/코드/형식/답·그림을 그대로 사용. 과거 contentOf의 snapshot 검증과 exact ID 동치 보존. |
| `src/lib/math-srs/courseBank.ts` | 단답 numeric/self-contained 후보, 최대 200 | 이미 단답만 읽음. 임의 MC 선택으로 학생 연습을 바꾸지 않음. 학생 SRS·탐험·FSRS 기록 domain 및 `/learn` 흐름은 이번 범위 밖. |
| `components/unified/draftStore.ts` 및 저장 문서 복원 | row ID와 실제 payload의 기존 초안 | 새 선택의 Q 중복은 막되 기존 저장본의 두 형식을 자동 삭제/ID 정규화하지 않음. 옛 문서도 읽고 명시적 재구성 시에만 새 규칙 적용. |

같은 family 조회(`familyOf`)는 다른 Q의 숫자 변형을 찾는 행동으로 유지하고 대상 Q의 형식 형제는 ‘새 문제 교체’ 목록에서 제외한다. 형식만 바꾸는 행동은 별도 같은-Q 선택이다. `excludeFamiliesOf`와 `excludeIds`는 이 때문에 합칠 수 없다.

## 9. schema-free 평가

**가능한 범위:** 현재 외부 키 규약과 unique index는 정확한 상대 외부 키를 재구성해 한두 행을 찾는 데 충분하다. 스키마 없이도 `current candidates → strict proof → group → count/page → selected actual row`를 모든 caller가 공유하면 논리적으로 일관된다. 요청 내에서 같은 현재 행을 읽으면 수정된 형식도 잘못 합치지 않는다.

**불충분한 주장:** `externalId @unique`가 있으므로 `regexp_replace(externalId, format, '')` 전체 집계도 index-only라는 주장은 성립하지 않는다. 기존 index는 그 표현식에 대한 index가 아니다. `(unitId,familyKey)` index는 질문이 아니라 문항류다. 정규식만으로 묶은 두 보류 쌍은 실제 오집계 반례다.

**비용/정확성 대안:** SQL CTE에서 외부 키 조인과 실제 내용 비교를 하면 본문 전송량을 줄일 수 있지만, DB는 여전히 본문/해설/SVG를 읽고 비교하며 현재 Prisma 필터·format parser와 SQL의 동치 검증이 새로 필요하다. 정적 proof manifest는 현재 내용을 다시 확인하지 않으면 stale하며, `updatedAt`만 믿으면 raw SQL 수정과 삭제/재삽입까지 포괄한다고 보장할 수 없다. 전역 캐시로 count와 page를 다른 판으로 만드는 것도 해결이 아니다.

따라서 이 보고서의 **단일 권고는 §1/5의 persisted key + DB 무효화**다. schema-free full-parser는 승인 전 offline 참조 구현/전량 oracle로만 남기는 것이 맞다. schema 변경을 승인하지 않는 결정이 내려지면 정확한 full-parser를 대안으로 선택할 수 있으나, 기본 가용량 성능 기준을 통과하기 전 운영 전환하지 않는다.

## 10. 검증 계획과 남은 승인 경계

이번 실행은 전량 스트리밍 집계·해시/분모 대조만 했다. 애플리케이션 full suite나 API/DB 테스트는 실행하지 않았다. 아래는 승인 후 필요한 표적 검증이다.

1. **pure identity/projection:** 이번 47,746쌍과 2개 보류를 oracle로 고정한다. namespace/단원/seed/variant/답 보기/해설/도형 각각을 하나씩 다르게 한 반례, 원래 MC의 조건 보기, 개수 답 보기, native 서술, null/잘못된 외부 키, 교과서 retry 슬롯을 시험한다. 숫자 skeleton이나 같은 정답만으로 통과하는 변이를 잡는다.
2. **DB invalidation:** 복제 DB에서 migration과 트리거를 시험한다. 앱/old Prisma/raw SQL 각각의 정체 필드 변경은 NULL이 되고, review/pool/잠금만 변경하면 키가 남아야 한다. key와 본문 동시 UPDATE 우회·키-only backfill의 updatedAt 보존·삭제·동시 편집 시 pair backfill 전체 rollback·바깥벽/코드 freeze와의 순서를 검증한다. 해시만 저장하고 내용 변경을 놓치는 변이를 잡는다.
3. **caller parity:** `unifiedBankFilters/Availability/Source`, `problemFormatQuery/Filter`, `BankView`, `ProblemBank`, `mathSource/ExamBuilder`, `basket`, `draftCapacity`, `selectProblems`, `retry`, `composePredictedPaper`, `usageLabels`의 해당 테스트만 확장한다. total=모든 페이지의 unique Q 수, 앞뒤 페이지 무중복, 필터+최근+형식 교체+family on/off 일치를 검증한다. format facet 합이 union과 다름도 명시적으로 시험한다.
4. **구성 반례:** 한 family에 SA-only Q1과 MC/SA Q2가 있을 때 Q1 선택 후 MC 의도로 Q2를 ‘형식 형제’라고 바꾸면 실패해야 한다. 형식 수량을 채울 수 있는 다른 Q가 있는데 무작위 초기 선택 때문에 부족을 확정하는 경로도 시험한다. family off에서 같은 Q의 두 형식은 여전히 한 자리다.
5. **기록 보존:** migration 전후 기존 PK·코드·외부 키·source/parent·TestProblem/ProblemAnswer/snapshot hash·학생 기록의 값과 행 수를 비교한다. 새 출제의 MC는 번호 답, 단답은 실제 값이 선택된 실제 ID와 일치해야 한다. 옛 문서/시험의 두 형식을 조용히 접지 않는다. 개인 usage 합산은 testId 합집합이고 과거 시험·채점 행은 그대로여야 한다.
6. **성능:** 같은 환경에서 현행 기본 `groupBy`와 새 key projection을 무필터·학년·단원·자료·검색·단답·객관·서술·recent·family on/off로 비교한다. cold/warm p50/p95, DB `EXPLAIN (ANALYZE, BUFFERS)`, 네트워크 bytes, 조회 수, process peak RSS를 기록한다. 전량 118,020/115,575와 결과 70,274/67,842가 맞는지 함께 확인한다. 1/5 동시 요청, 100문항 선택, 32,767개 이상의 형식 파티션/최근 ID를 포함한다. ID IN은 기존 5,000 배치 또는 UUID array parameter로 제한한다.
7. **권고 rollout 기준(계획 승인 때 확정):** 기본 list/available의 warm p95 1.5초·cold 3초 이내, 동시 5요청에서 타임아웃 없음, worker peak RSS 256MiB 이내, 페이지 응답의 native 본문은 pageSize/선택 수(최대100) 수준을 목표로 한다. 현재 측정한 API SLA가 아니라 제안 기준이다. 부족하면 query aggregation/index를 수정하고 측정하며 정확한 proof를 외부 키만으로 완화하지 않는다.

스냅샷 원본 크기는 316,617,775 bytes(약 302MiB)다. 가용 후보의 compact `formatQuery` 메타데이터 객체를 전량 읽는 가정은 20,058,580 bytes, 본문 원문은 20,950,968 bytes다. strict proof의 245,923,338 bytes는 **필드 값만의 합**이라 JSON property/driver 복사/ORM 메모리와 잠긴 형제 추가 조회를 제외한 하한이다. 현재 기본 `groupBy`가 이 바이트를 전송한다는 뜻이 아니며, schema-free 최적화를 모두 구현해도 이 양을 매번 그대로 전송해야 한다는 하한 증명도 아니다. payload 절벽의 규모를 보이는 full-read 비용 모델이며 실제 DB/API 시간은 미측정이다.

후속 순서는 사용자 승인 조건을 유지한다: **Claude 계획 승인 → 오류 수정(원래 14행, coordinator의 최신 확장 검토 17행/5 family) 및 합의된 원본 변경 검증 → 유형/문항 정체 정리 → 새 기준의 실제 부족량 재계산 → 필요한 만큼만 보강**. 추가 42행의 누락된 statementForms 기준은 coordinator가 별도로 원본/원장과 함께 다룬다. 이번 수치로 보강량을 확정하거나 현재 branch의 내용을 production에 적용하지 않는다.


## 11. 구현자가 그대로 사용할 계약 제안

키 결정은 임의 선택으로 남기지 않는다. 외부 ID를 아래 JSON의 전체 일치 parser로 읽어 다음 문자열 배열을 만든다. 숫자 필드도 원래 문자열 그대로 유지해 leading zero/부호 정규화로 다른 키를 합치지 않는다.

```text
초등: ["math-question-v1", unitId, "engine-elem", grade, chapter, section, formId, seed]
중등: ["math-question-v1", unitId, "engine-mid", entryKey, seed, variant]
결합: ["math-question-v1", unitId, "engine-mid-combo", definitionId, seed, variant]
questionGroupKey = "q:v1:" + hex(sha256(UTF8(JSON.stringify(tuple))))
```

형식은 tuple에서만 빠진다. `unitId`를 포함하므로 단원 이동 뒤에는 proof와 새 키 부여가 필요하다. 현재 스냅샷 투영의 group 수는 이 결정으로 변하지 않는다. 구현 시 전체 proof manifest에서 `key → tuple → member IDs`의 유일성을 검증한다. 원래 객관·native 서술·이관·retry·알 수 없는 외부 ID에는 이 키를 추측하지 않는다.

권장 helper 경계(새 파일명은 제안):

| helper | 입력 → 결과/책임 |
|---|---|
| `parseFormatSiblingExternalId` (`lib/problem/questionIdentity.ts`, pure) | 문자열 → 위 세 parser의 원문 tuple + format 또는 null. 부분 일치/일반 suffix 제거 금지. |
| `proveFormatSiblingPair` (같은 pure 모듈) | 현재 두 실제 행과 전체 proof 필드 → `{ok, key, reasons}`. SQL/DB import 없음. |
| `questionKeyOf` (client-safe pure) | `{id, questionGroupKey}` → 저장 key 또는 `row:<id>`. familyKey를 읽지 않음. |
| `reconcileQuestionGroups` (`lib/problem/questionIdentity.server.ts`) | 승인된 실제 ID/외부 ID 목록 + transaction → 두 행 현재 proof, compare-and-set 키-only 갱신, 불일치 목록. API가 임의 key를 받지 않음. |
| `resolveQuestionProjection` (`lib/problem/questionProjection.server.ts`) | 기존 `resolveUnifiedBankQuery` 결과 + `held/eligible/inspection` gate + request-scoped tx/context → 그룹 메타데이터/총수/가용 format/family 상한. 정체 proof는 반복하지 않고 invalidation된 NULL은 단독으로 처리. |
| `loadQuestionPage` (같은 server 모듈) | projection + 정렬/page → 그룹 먼저 page, 선택될 native ID만 bounded hydration, 실제 코드·그림·답 유지. |
| `loadQuestionVariants` (같은 server 모듈) | Q key + 현재 F/gate → 같은 Q이면서 모든 조건을 통과한 실제 행. family 조회와 구분. |
| `excludedQuestionKeys` (같은 server 모듈) | recent/명시 제외의 기존 ID들 → 현재 rowKey 집합. 계정/기간 결정은 기존 helper에서 유지. |
| `validateSelectedVariant` (같은 server 모듈) | Q key + 실제 ID + requested format + F/gate → 현재 일치한 native row 또는 conflict. save/format switch/출제 직전 공통 확인. |

writer 변경 범위도 한정한다. `load-engine-problems.ts`와 `verified-engine-batch.ts`는 **새 pair 부여**를 이 helper에 배선한다. `refresh-engine-content.ts`, `refresh-engine-figures.ts`, `regen-engine-figures.ts`, `fill-missing-figures.ts`와 승인된 정비 스크립트는 기존 수정 후 NULL 상태를 받아들이고, 형제를 함께 고쳐 실제 readback proof가 통과한 경우에만 `reconcileQuestionGroups`를 호출한다. 트리거가 있으므로 모든 과거 스크립트를 새 코드로 대체해야만 안전해지는 설계는 아니다. 수동/AI 등록·변형 채택·교과서 적재는 NULL 기본값으로 안전하며 새로운 의미 유사도 그룹화를 추가하지 않는다. 일반 내용 편집 라우트는 키를 사용자 입력으로 받지 않고, 편집 성공 응답에서 현재 key/fallback을 다시 읽는다.

집계 인터페이스의 반환 단위는 `heldQuestions`, `availableQuestions`, `familyCapacity`, 필요시 `representationRows`처럼 명시한다. 공개 응답 호환 이름을 유지해야 하면 새 version/countUnit에서 그 의미를 잠근다. 운영과 dev, source count와 bootstrap, 구형 `/problems`까지 같은 helper를 사용해야 cutover 완료다.
