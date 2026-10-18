# 수학 문항과 출제 형식 — UI/API 최소 변경안

2026-10-18 · 읽기 전용 조사 · 기준 `1d84a0a933e439acba941498472a420b184e9095`

**권고:** 은행은 같은 수학 과제를 한 카드·한 문항으로 세고, 담기/구성 때 사용할 **실제 저장 표현**을 선택한다. `problemId`와 문항류(`familyKey`)를 유지하면서 형식 형제를 잇는 별도 `questionId` 읽기 계약을 둔다. 원문의 근거·설명·증명 요구가 달라진 서술형 과제는 독립 문항으로 남길 수 있다. **Root의 통합 방향은 후속 메시지로 수신했고 Claude 승인은 대기 중이며, 이 문서는 구현 승인이 아니다.**

조사 중 제품 코드·DB·설정·은행 데이터를 변경하지 않았다. 이 문서와 짝 JSON만 작성한다. 실계정·실DB·브라우저 런타임·제품 테스트는 실행하지 않았다.

## 1. 확인한 기준과 증거의 한계

- [DESIGN.md](../../../../../DESIGN.md) 전체 461행과 [메뉴 적용표](../../../../design/workspace-ui-rules-20261008.md) 전체 155행을 읽었다. 현재 Math 작업실, `Workroom.module.css`, D안의 **범위 설정 → 문항 검토 → 양식 구성·출력**을 유지한다. 셸·학생 화면·연산 생성기·인쇄 지면의 재설계는 범위 밖이다.
- 이 작업 트리에는 `node_modules`가 없어 동일 기준 main의 설치본 `/Users/pss/Desktop/creative/today_/node_modules/next/dist/docs/`를 읽었다. `01-app/01-getting-started/15-route-handlers.md` 전체와 `05-server-and-client-components.md`의 사용 기준·서버/클라이언트 경계를 확인했다. 요청별 권한·개인 이력은 서버에 두고 기존 no-store/비동기 route params를 유지한다. 새 Next API를 가정한 구현은 하지 않았다.
- [기존 감사 README](../../../../reports/math-type-audit-20261018/README.md), [수량](../../../../reports/math-type-audit-20261018/capacity.md), [분류](../../../../reports/math-type-audit-20261018/taxonomy.md), [엔진](../../../../reports/math-type-audit-20261018/engine-comparison.md)을 대조했다. 이 감사는 **2026-10-18 13:58 KST, 소스 cd067a49a, 보유 118,020행/출제 가능 115,575행**의 관측이다. 현 기준에서 다시 DB를 센 수가 아니다.
- 기존 감사의 서술형 **84/360차시·226행**도 당시 저장 분류다. 진짜 서술형 과제의 전수 품질 인증이나 현재 가용 문항 수로 사용하지 않는다.

## 2. 현재 동작에서 수정이 필요한 지점

| 관측한 구현 | 영향과 최소 수정 방향 |
| --- | --- |
| 실제 작업실 `bank`는 `UnifiedWorkspace.tsx:1723`의 `MathExamBuilder`. `BankView`는 `LegacyUnifiedWorkspace`와 개발 참조에 남음. 별도 `/problems`는 `ProblemBank`. | 현행 제작기부터 바꾼다. 별도 은행/바구니도 같은 계약을 사용해야 사용자에게 행 수가 다시 보이지 않는다. legacy 화면을 현행 기본 진입이라고 보고하지 않는다. |
| `unifiedPreview.ts:421`은 필터 후 `Problem` 행을 페이지 처리하며 `total`, bootstrap의 학년/차시 수 역시 행 수. `/api/problems`도 행 단위. | **그룹화 후 정렬·수량·페이지 처리**해야 한다. 받은 한 페이지에서 형제만 숨기는 방식은 총수·다음 페이지·카드 누락을 고치지 못한다. |
| `bankSourceCounts.ts`와 `bankSourceAvailability.ts`의 `held/available`은 행 수. 별도의 `unitFamilies`는 `(unitId,familyKey)` 수. | 보유 문항·출제 가능한 문항·한 장 구성 가능 수를 각각 정확히 센다. 형식별 가능 수는 서로 겹치므로 합산하지 않는다. |
| `unifiedBankSelection.ts:206`의 구성은 기본 한 문항류당 한 행. `distinctFamilies:false`는 행별로 바뀜. | 이 토글을 꺼도 **같은 문항의 형식 형제는 한 장에 하나**다. 토글은 숫자가 다른 같은 문항류의 여러 문항을 허용하는 것뿐이다. |
| `unifiedBankSelection.ts:393`의 `assignFormats`는 먼저 뽑은 문항류·난이도에서 다른 형식의 행을 고름. | 같은 문항류의 다른 숫자까지 형식 변경으로 선택할 수 있다. 반대로 필요한 형식이 있는 다른 후보를 처음 추첨에서 놓쳐 부족할 수도 있다. `questionId`를 먼저 정하고 그 안의 실제 표현을 선택하며, 부족 판정은 전체 적격 후보에 대한 동일 계획기로 확인한다. |
| Studio `questionType`는 `multiple-choice/short-answer/descriptive`; `questionTypeRaw`는 원래 한글 값. `classifyFormat`은 보기·답·원래 분류를 사용함. | 화면에서 raw/파생 값을 혼용하거나 `problemType='서술형'`으로 답안 형식을 판단하지 않는다. 새 선택 계약만 `multiple_choice/short_answer/descriptive` 3종으로 통일하고 기존 필드는 그대로 둔다. |
| 기존 `format` 필터는 단답형·서술형만 허용. 객관식/unknown을 보내면 400. 형식 필터가 있으면 가용량의 `facets:null`. | 기존 필터에 객관식을 몰래 추가하지 않는다. 새 문항 보기의 `availableFormat` 필터를 명시적으로 정의한다. `facets:null`은 확인 전이며 0으로 표시하지 않는다. |
| `recentProblemIds.ts`와 `resolveUnifiedBankQuery`는 최근 사용 **problemId**만 제외. | 단답형을 쓴 뒤 객관식 형제로 같은 문항이 다시 나올 수 있다. 최근 ID → questionId → 모든 형식 형제로 확장한다. 문항류 전체를 14일 제외하는 것으로 넓히지 않는다. |
| Studio 담기는 `StudioProblem[]`, 서버 바구니는 `/api/basket`의 `problemId` unique. | 두 곳 모두 별도 수정 필요. 대표 카드 하나가 적격이어도 선택한 형식의 행이 잠겼으면 담을 수 없다. |
| 저장 조건 v1은 난이도·범위·최근·문항류 규칙만 저장. `ExamBuilder.tsx:354`는 형식과 객관식 우선 순서를 현재 값으로 유지. | 이번 최소안은 이 의미를 유지하고 저장 창에 “형식·배치 순서는 저장하지 않음”을 표시한다. 형식까지 저장한다고 주장하려면 별도 v2 + v1 reader를 승인받아야 한다. |
| `mathSource.prepareOutput`은 현재 은행 행을 다시 받아 반환. `contentOf`는 publication/textbook snapshot이 있는 경우 고정 내용을 우선함. | 모든 저장 시험지가 이미 불변이라고 가정하면 안 된다. 새 정체 연결만으로 저장 문항을 대표 행/새 형식으로 재해석하지 않는다. 고정본·저장 payload와 편집 중 새 출제를 구분한다. |

주요 근거: [Math source](../../../../../src/components/exam-builder/mathSource.ts), [선택기](../../../../../src/lib/unifiedBankSelection.ts), [조회](../../../../../src/lib/unifiedPreview.ts), [형식 판정](../../../../../src/lib/problem/provenance.ts), [저장 내용 읽기](../../../../../src/lib/tests/testProblemContent.ts).

## 3. 문항 정체와 서술형 경계

| 축 | 의미 | 보존/용도 |
| --- | --- | --- |
| `problemId` | 본문·보기·답·해설·그림을 가진 기존 실제 행 | 기존 코드·신고·검토·학생 답·시험 연결의 열쇠. 변경·삭제·재부여 금지. |
| `questionId` (신규 읽기 값) | 같은 수치·조건·구할 대상·수학 과제를 수행하는 문항. 검증된 형식 형제를 연결 | 은행 카드/문항 수, 한 장 내 같은 문항 제한, 최근 형식 형제 제외. opaque string이며 화면에서 해시/코드로 조립하지 않음. |
| `familyId` (현행 유지) | `(unitId,familyKey)`로 표현하는 더 넓은 문항류 | 기존 한 문항류당 1개 정책. 하나의 류에 숫자가 다른 여러 questionId가 있을 수 있음. |
| `format` | 객관식·단답형·서술형의 답안 표현 | 선택한 실제 행의 판정값. 주관식은 단답형/서술형의 상위 설명이며 네 번째 형식이 아님. |

동일한 수치 과제의 객관식과 단답형은 한 문항이다. 다른 숫자·다른 조건은 같은 문항류라도 별개 문항이다. 객관식 보기가 조건 자체인 판단/모두 고르기 과제는 보기를 없애서 같다고 판정하지 않는다. 실제 근거·오류 설명·증명과 그 채점 기준을 요구하는 과제는 계산 답만 묻는 문항과 분리할 수 있다. 단순한 “풀이 과정을 쓰시오” 덧붙임은 새 문항/서술형 재고를 만들 근거가 아니다.

[expandEngine.ts](../../../../../src/lib/engine/expandEngine.ts)는 이미 단답·객관 2종만 펼치고 가짜 서술형 파생을 금지한다. [nativeDescriptive 계약](../../../../../src/contracts/nativeDescriptive.contract.ts)은 `differentAction`, 모범 답, 기준별 배점·허용 풀이·오류를 별도로 갖는다. 이 구조를 질적 근거로 참고하되, namespace 또는 단어 하나만으로 전 은행을 자동 승인하지 않는다. 기존 미검토/판단 보류 행은 원 ID로 보존하고 새 형식 가능 배지에 임의 승격하지 않는다.

데이터 담당자는 기존 엔진 `variantKey`/외부 ID·실제 본문/정답/그림/보기 조건으로 연결을 검증한다. importer의 `variantKey`가 모든 저장 행에 이미 영속되어 있다고 가정하지 않는다. 데이터 구조·매핑 저장 위치는 정체 담당자의 계획을 따른다. 이 UI안은 새 DB 테이블이나 전역 문항류 병합을 요구하지 않는다.

## 4. 최소 사용자 흐름

### A. 찾기: 한 문항·한 카드

기존 검색·학년·차시·출처 선택과 카드 본문을 유지한다. 결과는 **“검색 결과 N문항”**이다. 카드에는 출처/현재 단원/기존 문항 코드와 **“가능 형식: 객관식 · 단답형”**을 보여 준다. 형식 배지는 비조작 표시이며 기존 `--src-*` 형식 배지 의미를 따른다. 실제 서술형 과제는 해당 본문과 함께 독립 카드에 표시할 수 있다.

카드 본문의 기본 미리보기는 서버가 지정한 **실제 한 행**이다. 코드 검색은 형제 행 코드를 넣어도 그 문항 카드로 찾아가며 찾은 표현을 미리 본다. 다른 표현의 코드/출처는 상세에서 볼 수 있다. 화면이 표준 발문을 만들거나 모든 보기/그림을 지워 합성하지 않는다.

형식 검색은 **“사용 가능한 형식”**으로 라벨링하고, 그 형식을 낼 수 있는 문항을 찾는 존재 조건이다. 발문 속 단어를 형식 근거로 쓰지 않는다. 형식 필터와 출제 때의 형식 할당은 다른 조작이다.

### B. 담기: 실제 사용할 형식 선택

가능한 형식이 하나면 “단답형만 가능”처럼 표시하고 그 실제 행을 담는다. 둘 이상이면 `담기`에서 짧은 `출제 형식` 선택 창을 연다. native radio로 선택하고 **해당 표현의 실제 본문/보기**를 미리 본 뒤 `이 형식으로 담기`를 누른다. 닫으면 선택 전 상태를 유지한다. 이 단계가 출제를 준비하는 시점이며, 탐색 목록을 형식별 두 카드로 나누지 않는다.

지원하지 않는 형식은 “서술형 없음”, 보유했으나 잠긴 표현은 “객관식 · 출제 잠금(사유 미기록)”, 아직 판정하지 못한 경우는 “형식 확인 전”으로 구분한다. 장애/로딩을 0개나 없음으로 바꾸지 않는다. 부모 문항에 적격 형식이 있어도 선택한 표현의 검수·잠금·정답 조건을 각각 검사한다.

이미 담긴 같은 questionId는 `담김`이다. 다른 형식을 선택하면 `형식 변경`으로 **같은 자리의 실제 problemId/본문/답/해설/그림을 함께 교체**한다. 담은 수와 순서는 유지한다. `questionType` 글자만 바꾸거나 객관식의 번호 답을 단답형 답으로 재사용하지 않는다.

### C. 자동 구성과 검토

기존 구성 조건의 **객관식 / 단답형 / 서술형** 할당을 그대로 사용한다. `–`/누락은 지정 없음, `0`은 내지 않음이다. 모든 칸을 정하면 합이 총 문항 수와 같아야 하며 일부만 정하면 나머지 자리는 미지정 형식이 받는다. UI에서 자동 재분배하지 않는다.

서버는 범위·난이도·최근 제외·문항류 제한·형식 할당을 모두 만족하는 **문항과 표현의 쌍**을 선택한다. 같은 questionId는 한 번만 사용한다. `같은 문항류는 1문항만`을 꺼도 이 규칙은 유지한다. 형식/행이 많은 문항이 추첨 확률까지 부풀지 않도록 문항 단위를 먼저 사용한다.

검토 화면은 한 행에 한 문항이며, 메타 줄에 `출제 형식: 객관식`과 `형식 변경`을 둔다. 형식 변경은 현재 문항 안에서만 일어난다. **`새 문항 교체`는 현재 questionId의 모든 형식 형제를 제외**한다. 기존 “같은 문항류” 후보 층은 숫자가 다른 문항을 제안할 수 있으며 형식 변경과 구분한다. 다른 자리와 같은 questionId가 되는 추가/교체/되돌리기도 막는다.

형식을 바꿔 할당이 어긋나면 `객관식 3/4 · 단답형 5/4`처럼 실제/요청을 표시하고, 교사가 조건을 바꾸거나 다시 구성하도록 한다. 화면에서 다른 문제를 몰래 바꾸어 수를 맞추지 않는다.

### D. 부족과 출력

부족은 **“서술형 요청 3문항 · 구성 1문항 · 2문항 부족”**처럼 형식별로 알린다. 적격 표현 없음·최근 출제 제외·문항류 제한·범위/난이도 조합 부족을 서버가 확인한 만큼만 구분한다. 서술형이 0이면 “이 조건에는 출제 가능한 서술형이 없습니다.”라고 한다. 다른 형식으로 채우거나 생성 완료를 가용 재고로 세지 않는다.

랜덤/구성의 읽기 응답은 부분 후보를 검토하게 할 수 있다. 명시한 형식/총수에 부족이 남으면 출력과 저장 실행을 막고 **조건 수정**, **다시 구성**, **실제 N문항으로 조건 변경** 중 지원되는 행동을 제공한다. 마지막 행동은 교사가 눌러 새 의도를 확정한 경우에만 사용한다. 시험을 생성하는 쓰기 API는 422로 끝내며 불완전한 draft를 만들지 않는다.

마지막 단계의 기존 WorksheetEditor·6개 양식·풀이 공간·A4·학생용/교사용 답 노출을 유지한다. 출력 직전 선택된 **실제 행/형식/개정**을 재검증한다. 변경/잠금이면 해당 자리의 사유와 `다시 확인`을 제공하고 현재 제목·순서·서식을 보존한다. 다른 형식의 대체 성공으로 처리하지 않는다.

## 5. 일일/일괄 출제와 최근 형제 제외

- `GenerateSetup`의 기존 설정 끝에 접힌 `출제 형식` 3칸을 추가한다. 새 페이지/단계를 만들지 않는다. `/api/tests/generate`에는 동일 의미의 선택적 `formats`를 전달한다. 미지정 호출은 기존 지정 없음 정책을 유지하되 문항 중복/형제 최근 제외를 적용한다. 형식 요청이 있으면 인접 난이도 보충을 하더라도 **요청 형식을 바꾸지 않는다**.
- `DailyReviewSection`은 학생별 기존 생성 호출을 유지한다. 범위/필요 수가 같은 그룹별로 접힌 형식 설정을 두고 해당 요청에만 전달한다. 서로 다른 필요 문항 수에 한 절대 할당을 무조건 복사하지 않는다. 성공/실패를 학생별로 유지하고 생성 실패 학생만 재시도한다.
- 아침 자동출제는 같은 서버 선택기를 사용한다. 이번 최소안에서 새 반 기본 형식 설정/새 일정 저장 화면은 만들지 않는다. 무인 자동출제는 미지정 형식 정책을 사용한다. 반별 영속 형식 할당까지 원하는 경우는 Root 계획에서 별도 범위로 결정해야 한다.
- 최근 제외가 켜진 모든 자동/후보/교체/가용량 경로는 **최근 행의 questionId 전체 형식**을 제외한다. 반 소유자/시험 소유자 기준과 기존 날짜 창(14일, testDate)을 유지한다. 같은 문항류의 다른 숫자까지 제외하지 않는다.
- 기존 수동 `/api/basket/test`는 D-20을 적용하지 않는 계약이다. 최소 호환안은 옛 요청의 뜻을 유지하고, 새 문항 보기에서 사용하는 UI는 `recent:true`를 명시한다. 시험지 만들기의 기존 최근 제외 끄기는 명시적으로 유지할 수 있다. **모든 수동 호출까지 최근 재사용을 금지할지는 Root/Claude의 정책 승인 항목**이며 몰래 변경하지 않는다. 어느 경우든 최근 제외가 켜져 있으면 형식만 바꿔 우회할 수 없다.
- 현재 daily-review의 `capacity`는 최근 이력을 뺀 보장치가 아닌 범위 상한이다. 새 형식 설정을 한 그룹에는 동일 계획의 가용 수를 다시 확인한다. 개별 학생·소유자·이력을 확인하지 않은 수를 “출제 보장”이라고 표시하지 않는다. 30일 `내 출제` 순위와 14일 중복 제외를 혼용하지 않는다.

## 6. 엔드포인트/소비자 지도

아래는 해당 화면군의 공개 경로다. `/api/dev/unified/problems/**`는 Studio와 같은 핵심 함수를 사용하는 개발 짝이며 운영에서 열지 않는다. **build 전용 새 API는 없고 `/random`의 allocations 요청이 구성 API**다. 경로별 상세 소유 파일은 짝 JSON에도 기록했다.

| 용도 | 현재 경로·계약/실제 구현 | 변경 경계 |
| --- | --- | --- |
| 기본 메타/수량 | 서버 `loadUnifiedBankBootstrap`; `unifiedPreview.ts` | 새 보기로 받기 전 행 기반 `initialData.total/unitCounts/grades`를 문항 수로 표시하지 않음. |
| 제작기 목록·추가·교체 카드 | `GET/POST /api/studio/problems`; `BankData`, `resolve/loadUnifiedBank` | 새 보기에서 question 단위 총수/페이지와 실제 미리보기 제공. POST는 긴 조건을 위한 읽기. |
| 실제 행 상세 | `GET /api/studio/problems/{id}` | id는 계속 problemId. 새 보기의 선택 표현 상세/형식 변경에 사용. |
| 전체 출처 수 | `GET /api/studio/problems/sources` | 기본은 전역 행 재고. 새 보기에서는 question 수로 명시; 다른 필터와 무관한 의미는 유지. |
| 조건별 가용량/범위 상한 | `GET/POST …/sources?view=available[&families=1]`; `BankSourceAvailability` | 새 보기의 held/available/questions/capacity 축을 목록·선택기와 일치. |
| 책→자료 수 | `GET/POST …/sources?view=materials&books=…`; `BankSourceMaterials` | 문항 중복 제거·선택 형식 자격을 같은 함수로 집계. 자료 20행/880px 유지. |
| 난이도별 랜덤 담기 | `POST …/problems/random {counts,filters,excludeIds}` | 문항 중복/선택된 questionId 제외. 옛 형식 파생/행 가중 추첨 금지. |
| 범위별 build | 같은 `POST …/random {allocations,formats,difficulty,recent,distinctFamilies,…}` | 문항+표현 선택, 실제/요청/부족을 구조화. distinctFamilies=false도 question unique. |
| 출력 전 자격 | `POST …/problems/check {ids}`; `bankReadiness.ts` | 옛 요청 유지. 새 selection 요청은 questionId/format/개정도 검증. |
| 지정 복습 변형 | `POST …/problems/textbook-slots {sourceIds}` | 원문 problemId/지정 1·2 슬롯 유지. question 그룹으로 슬롯을 축약하지 않음. |
| 내 출제 순위 | `POST …/problems/labels`; `usageLabels/*` | v1 problemId별 기록 유지. 새 question 보기만 형제의 **서로 다른 시험 ID 합집합**으로 순위 계산; 단순 횟수 합 금지. 30일/최소 근거/개인 범위 유지. |
| 별도 은행 목록/상세 | `GET /api/problems`; `GET /api/problems/{id}`; `problem.contract.ts` | 조회 v1 그대로, 화면은 새 보기 사용. 상세·수정·신고는 실제 행 id로 계속 이동. |
| 저작/검토 | `POST /api/problems`, `PATCH/DELETE /{id}`, `PATCH /{id}/review-status`, `POST /{id}/review`, `POST /{id}/reports`; `GET /api/review/queue` | 검토는 표현별 상태가 달라 실제 행 단위를 유지. 검수 잔량은 “검토할 표현 N건” 등 대상 명시. 카드 대표를 승인했다고 형제 승인 금지. |
| AI 제작/변형 | `POST /api/problems/generate`, `/transform`, `/transform/adopt`; `problem.contract.ts` | 새 항목은 pending. 생성 문항 수와 형식 행 수를 구분; 채택/승인 전 가능 배지 금지. 이 조사에서 AI 호출 없음. |
| 계정 바구니 | `GET/POST/DELETE /api/basket`; `basket.contract.ts`, `readBasket` | 실제 problemId 저장 유지; 새 보기에서는 question 단위 카드/서버 total/spread. 중복 형제 교정은 명시적 쓰기만. |
| 담은 것 출제 | `POST /api/basket/test {classId,studentId?,testDate}` | 기존 범위 자동 산출·순서·트랜잭션·성공 시 비우기 유지. 새 요청에서 형식/최근/중복/개정 검사. |
| 일일/확인 범위 | `GET /api/units`; `GET /api/tests/default-range`; `GET /api/tests/daily-review` | 단원·진도 계획 유지. 가용량은 같은 question/format 선택 규칙으로 산출. |
| 일일/확인 생성 | `POST /api/tests/generate`; `generateDraftTest`, `selectProblems`, `draftCapacity` | 선택적 formats, question unique, 최근 형제 제외. 기존 반/지점 권한·한도 30 유지. |
| 아침 자동출제 | `GET /api/tests/auto-draft/cron`; `runAutoDraft` | 같은 서버 선택기 사용. cron 권한/일정·초안까지만 생성 유지. |
| 시험 이력/검토/교체 | `GET /api/tests`, `GET /api/tests/{id}`, `PUT /{id}/problems/{seq}` | 이력은 저장 문항 수/실제 ID/순서 유지. draft 교체만 새 후보 규칙 사용; 선택 형식을 보존할 수 없으면 명시적 실패. |
| 확정/인쇄/채점 | `POST /tests/{id}/confirm`, `POST /print`, `GET/POST /grade`, `GET /results`, `POST /submit` (모두 `/api` 아래) | 은행 그룹화로 저장본·답·문항 번호·학생 연결을 재작성하지 않음. |
| 저장 오답 복습 | `POST /api/tests/{id}/retry`; `planTestRetry` | 원문 ID/지정 쌍을 유지. 같은 question의 형식 형제를 새 연습으로 착각하지 않도록 일반 후보 경계 점검. |
| 개인 저장 작업/이력 | `GET /api/library/documents`, `GET/PUT/PATCH/POST/DELETE /{documentId}` | 저장 payload의 실제 문제/답/형식/그림/양식 유지. 목록은 문서 수이지 은행 문항 수가 아님. |
| 출제 조건 저장 | `GET/POST /api/studio/exam-conditions`, `PATCH/DELETE /{conditionId}` | v1의 형식 미저장 의미를 명시. 새 형식 저장은 별도 버전 승인 필요. |
| 반 배포/이력 | `GET/POST /api/exam-publications`, `DELETE /{id}/classes/{classId}` | frozen payload/해시·배포 당시 표현 보존. 새 작성본만 question 중복 검사. |
| 인접 소비자 | `POST /api/tests/predicted`, `GET /api/exam/rounds`, `GET /api/exam/rounds/{id}` | 별도 예측/이력 UI는 이번에 재설계하지 않음. 공통 후보/저장 연결을 바꾸면 data 담당이 회귀 영향 확인. |

`/api/studio/overview`는 반/학생 현황 수이며 문제은행 재고가 아니다. 이 수를 이번 작업에 묶어 수정하지 않는다.

## 7. 데이터 담당자와 합의할 최소 계약

아래 이름은 **제안**이다. Root/정체 담당자가 합의한 단일 계약 파일로 고정한 뒤 병렬 구현한다. 화면이 원문을 비교하거나 equivalence를 판단하지 않는다.

**코디네이터 후속 결정(2026-10-18 15:15 KST):** 통합 계획은 nullable `questionGroupKey`와 연결 근거를 남기는 backfill, 편집 시 연결을 해제하는 trigger를 채택한다. UI는 전 경로에서 `identity=question`을 명시하고 row detail/저장본을 유지한다. 전달 메타는 `BankProblem`의 선택적 `questionId`/`questionFormats` 및 `countUnit=question`을 우선하며 core 담당자가 최종 타입을 고정한다. 아래 DTO는 요구 경계를 설명하는 예시이고 이 결정의 필드명을 덮어쓰지 않는다.

```ts
type QuestionFormat = "multiple_choice" | "short_answer" | "descriptive";
type QuestionRepresentation = {
  problemId: string;             // 기존 UUID, 기존 detail/edit/report 키
  format: QuestionFormat | null; // null은 미분류, 주관식 기본값 아님
  revision: string;              // 서버 발급 불투명 값
  state: "available" | "blocked" | "unverified";
  reasonCode: string | null;     // 기존 자격 사유 재사용, 확인한 사유만
};
type QuestionCard = {
  questionId: string;            // 형식 형제를 연결, stable, UI가 만들지 않음
  familyId: string;              // 현행 문항류 축
  preview: BankProblem;          // 실제 한 행, id를 canonical 값으로 바꾸지 않음
  representations: QuestionRepresentation[];
};
type QuestionSelection = {
  questionId: string;
  problemId: string;
  format: QuestionFormat;
  revision: string;
};
type QuestionList = {
  version: 2;
  countUnit: "question";
  queryKey: string;              // 응답 조건 일치 확인
  questions: QuestionCard[];
  total: number;
  page: number;
  pageSize: number;
};
type FormatQuotaResult = {
  format: QuestionFormat;
  requested: number;
  actual: number;
}; // compose의 selections와 함께 반환, UI는 requested-actual로 부족 표시
```

한 형식에 여러 실제 행/출처가 있으면 서버가 현재 필터·권한에 맞는 선택 후보를 지정한다. `missing`은 해당 형식 항목이 없다는 뜻이고, `blocked`와 구분한다. “가능 형식”은 `state=available`인 실제 표현에서만 만든다. 카드 미리보기의 적격 상태를 형제에 복사하지 않는다. 미분류 행은 검토에서 보존하고 새 할당을 충족했다고 세지 않는다.

선택 시 기존 `GET /…/problems/{problemId}`로 실제 본문을 읽고 응답의 정체/형식/개정과 비교한다. 출력/생성 서버가 다시 검사하므로 브라우저의 선택만 믿지 않는다. 기존 `BankProblem`의 선택적 `questionId`/`questionFormats`를 UI adapter가 전달하되 **`StudioProblem.id`는 계속 실제 problemId**다. 선택 개정의 정확한 필드 위치는 core 계약에서 고정한다. 수입/잘라낸 로컬 문항과 영어는 이 메타 없이 현 계약을 유지한다.

### 수량의 공통 정의

비형식 필터 F와 현재 권한을 만족하는 보유 실제 행을 V(F), 그중 `problemEligibleWhere`를 만족하고 새 보기에서 실제 형식을 확인한 행에서 최근 제외가 켜졌다면 최근 questionId를 뺀 집합을 E(F)라 한다. 기존 자격은 있으나 형식이 확인되지 않은 행은 “형식 확인 전”으로 보유에 남기고 새 보기의 형식별 출제 가능 수에 넣지 않는다. 이 추가 경계는 기존 v1의 분류/자격 데이터를 수정하지 않는다.

- `heldQuestions = |questionId(V(F))|`, `availableQuestions = |questionId(E(F))|`이며 available ≤ held.
- 기본 은행 목록 total은 같은 F의 `availableQuestions`와 같다. 검수 상태를 명시한 점검 목록은 보유/검수 범위임을 별도로 라벨링한다.
- `formatAvailable[f] = |questionId({r ∈ E(F): format(r)=f})|`. 한 문항이 여러 칸에 있으므로 세 칸의 합은 total이 아니다.
- `availableFormat=f`는 위 조건을 만족하는 문항을 찾는 존재 필터다. 카드에는 같은 비형식 F 안에서 확인한 모든 형식을 보여 주며 실제 출제 형식은 별도로 명시 선택한다. 이 뜻은 list/count/compose에서 동일하게 해석한다.
- 선택된 questionId는 모든 표현이 추가 후보에서 빠진다. 교체는 해당 자리를 비운 후 다른 자리의 questionId를 제외한다. `familyOf`의 “새 문항” 후보에서는 교체 대상 questionId도 제외한다.
- 문항류 제한을 끄면 범위 상한은 distinct question 수다. 켜면 현 family 규칙을 추가한 구성 상한이다. 난이도/형식 할당까지 적용한 `capacity`는 **동일 계획기**의 결과다. 일반 `unitFamilies`를 특정 할당의 성공 보장으로 쓰지 않는다.
- facets는 기존처럼 자기 축만 뺀 조건을 명시한다. 여러 출처에 걸친 동일 questionId가 있다면 출처별 합도 전역 총수가 아닐 수 있다. 합집합으로 센다. 이전 “축별 합=행 수” 검사를 그대로 가져오지 않는다.
- 글로벌 출처 수는 전역 범위, 자료/차시/형식 가용 수는 해당 조건 범위다. 응답에는 `countUnit:"question"`, 버전, 적용 조건 식별값을 넣어 비동기 응답이 다른 조건의 수를 덮지 않게 한다. 못 센 칸은 null이며 0이 아니다.

### 하위 호환과 바구니

권고 전환 방식은 `identity=question`의 명시적 새 보기다. list/source/basket는 이 요청에서만 `version:2`와 새 question 계약을 반환한다. 파라미터 없는 v1 읽기 응답·기존 요청 형식·정렬·생략 시 기본은 유지한다. 같은 문항 형제의 새 시험 중복을 허용하던 쓰기는 의도적으로 차단하며 이를 호환 변경 기록에 남긴다. `view=available/materials`는 source 용도로 계속 사용한다. strict query/body와 POST 긴 조건 reader는 새 옵션을 명시적으로 허용해야 한다. 임의 필드를 붙여 옛 strict 응답을 깨지 않는다.

새 UI의 목록·bootstrap·출처·가용량·담기·구성은 한 배포에서 모두 새 보기를 사용한다. 새 보기 실패 시 행 수를 문항 수로 fallback하지 않고 재확인 상태를 제공한다. GET/POST list, 운영/dev 짝의 동등성을 함께 유지한다. 전환 여부는 한 기능 게이트/배포 경계로 묶되 운영 활성화는 Root 승인 뒤에 한다.

계정 바구니는 최소한 기존 실제 `problemId` 저장을 유지할 수 있다. 같은 questionId를 두 번 새로 담는 것은 서버가 직렬화/트랜잭션으로 차단한다. 같은 ID 재담기는 멱등이고, 다른 형식이 이미 있으면 기존 것을 조용히 바꾸지 않고 `이미 담김/형식 변경 필요`를 반환한다. 명시적 `PATCH /api/basket`의 `{fromProblemId, selection}` 요청으로 표현 변경과 기존 `orderIndex` 보존을 한 번에 처리하는 안을 권고한다. DELETE 후 POST 두 번으로 대체하지 않는다.

기존 바구니에 형제가 둘 이상 있으면 **GET에서 쓰지 않는다**. 새 보기는 한 카드와 `형식 선택 충돌`을 보여 주고, 교사가 유지할 표현을 선택하면 명시적 변경 요청에서 형제를 정리한다. v1은 실제 저장 항목/total을 계속 반환한다. 어느 생성 경로로 호출해도 해소되지 않은 같은 문항 형제 중복을 새 시험으로 만들지 않고 422로 알린다. 새 보기의 total/spread는 한 카드 한 선택을 서버가 세며, 충돌 그룹은 선택 미정으로 표시해 난이도 분포를 추정하지 않는다.

`/api/basket/test`의 새 보기 요청은 정확한 selection 목록/개정과 recent 의도를 받아 저장 바구니와 대조한다. 바구니 전체에 대한 선택을 검증하고 성공한 트랜잭션에서만 시험 생성·번호 부여·바구니 비우기를 한다. 다른 기기의 변경/부적격 표현/형식 부족이면 기존 바구니를 보존한다. 기존 classId/studentId 권한과 범위 산출을 유지한다.

## 8. 저장 시험지와 이력의 보존

새 문항 정체는 기존 `Problem.id`, code, `TestProblem.problemId`, 학생 답/채점 기록, 교과서 원문·변형 슬롯, publication/snapshot ID를 바꾸지 않는다. 현재 은행에서 형식이 없어져도 과거 저장 payload를 다른 표현으로 대체하지 않는다.

불변 publication/textbook snapshot은 기존 검증·해시·원본 표시를 그대로 사용한다. 개인 저장 payload도 저장 당시 본문·보기·답·해설·그림·형식·순서·양식으로 복원한다. live Problem에 연결한 옛 TEST는 이미 전체 불변 capture가 아니므로, **이번 관계 매핑만으로 원본을 바꾸지 않는 것**을 최소 보존선으로 삼고 전 시험의 소급 스냅샷화를 완료했다고 주장하지 않는다. 기존 저장 문항 내용의 실질 수정/삭제는 별도 승인 없이는 하지 않는다.

저장본에 과거 형식 형제가 함께 있으면 그 문항 수·출력은 저장 당시 그대로 둔다. “저장된 문항 N개 · 같은 문항의 형식 포함”으로 설명할 수 있다. 새 규칙으로 편집하려면 **사본으로 새 시험지 만들기**에서 교사가 유지 형식을 선택한다. 열기/인쇄가 자동 병합·형식 선택·학생 연결 재작성을 일으키면 안 된다.

`내 출제` question 집계는 기존 기록을 수정하지 않고 같은 questionId의 **서로 다른 시험 ID**를 합쳐 읽는다. 30일/confirmed·printed/소유 계정/근거 부족 정책을 유지한다. v1 problemId 통계와 새 question 통계의 단위를 각각 표시한다. 조회 자체가 사용 이력을 만들지 않는다.

## 9. 병렬 구현을 위한 파일 소유권

이 조사에서는 아래 제품 파일을 수정하지 않았다. Root 계획/Claude 승인 뒤의 분할 제안이며, **동일 파일을 둘이 수정하지 않는다.**

| 담당 | 소유할 파일/범위 | 인계할 인터페이스 |
| --- | --- | --- |
| 정체·데이터 담당 | 새 `src/contracts/questionFormats.contract.ts`(제안명), 새 정체/조회 모듈, `problem.contract.ts`, `bankSource.contract.ts`, `basket.contract.ts`, `bankReadiness.contract.ts`, `test.contract.ts`, `usageLabels.contract.ts`; `unifiedPreview.ts`, `unifiedBankSelection.ts`, `bankSource*`, `bankReadiness.ts`, `basket/*`, `tests/*`, `generator/*`, `usageLabels/*`, 관련 api route/서버 bootstrap | question 카드·선택·수량·계획 부족 계약, 기존 problemId→questionId 읽기/최근 확장, 명시적 형식 변경/검증. 신규 API 타입과 합성 fixture를 UI 담당에 먼저 고정 전달. |
| UI 담당 | `exam-builder/{MathExamBuilder,ExamBuilder,QuestionPicker,ReplaceDialog,ComposeConditions,SavedConditions,mathSource,types}`와 해당 CSS; `unified/{types,BankView,BankBasket,BankRandomPanel,BankSourcePicker,bankSourcePick}` 중 실제 영향 지점; `problem/{ProblemBank,ProblemCard,BasketBar,BasketPanel}`, `lib/problem/{problemApi,basketApi}`; `test/{GenerateSetup,useGenerateSetup,useTestReview}`; `main/DailyReviewSection` | API에서 온 identity/availability만 표시. 제안 신규 `QuestionFormatPicker`는 기존 dialog와 토큰 사용. generic ExamBuilder hook은 선택적으로 추가해 영어가 그대로 작동하게 함. |
| Root 통합 담당 | `UnifiedWorkspace.tsx`의 bank 선택/복구 경계와 서버 초기 데이터 전달, 신규 기능 전환, 저장본/출력 모드 분기, 통합 계획·승인 | 셸 CSS 변경 없이 question 중복 guard/실제 problemId 유지. 바구니·저장본 정책 및 endpoint 버전 최종 결정. 데이터/UI 작업의 이 파일 소유권 충돌 방지. |
| 검증 분담 | 데이터 담당: API/단위 검사; UI 담당: picker·card·builder·daily 컴포넌트 검사/개발 fixture; Root: 승인 후 통합 브라우저 점검 | 별도 전체 suite는 이 조사 범위 밖. 기존 테스트 파일을 수정할 경우 소유 담당을 따른다. |

이번 최소 변경에서 `Workroom.module.css`, legacy `Workspace.module.css`, 학생 라우트, 인쇄 renderer/전역 CSS, 연산 유형 카드/조합 수, 예측 대시보드의 새 레이아웃은 소유하지 않는다. 서술형 새 내용 제작·AI 채점/의미 판단 통합도 하지 않는다.

## 10. 구현 승인 전 합의와 인수 조건

Root 계획과 Claude 검토에서 고정할 것은 (1) 안정적인 questionId 연결 근거/판단 보류 처리, (2) 새 보기/바구니 변경 계약, (3) 수동 경로의 recent 기본값, (4) 저장본 보존 모드다. 후속 Root 메시지는 (1)의 nullable key/근거 backfill/편집 무효화 방향, (3)의 **기존 기본 유지·새 설정에서만 명시**, (4)의 **원본 출력 유지·새 편집에서 형제 선택으로 해소**를 지정했다. core 최종 타입과 Claude 승인을 받은 뒤 데이터 계약 작업과 fixture 기반 UI 작업을 병렬 진행할 수 있다. 전역 유형 통합이나 전면 재설계를 선행 조건으로 만들지 않는다.

인수 시나리오는 짝 JSON의 합성 사례를 사용한다. 원문/사적 로그를 이 보고서로 복사하지 않는다.

1. 같은 과제의 객관/단답 두 행은 1카드·1문항, 숫자가 다른 같은 family는 별개 문항. 진짜 근거 설명 과제는 별개 카드이고, 끝말만 바꾼 가짜 서술형을 가능 형식으로 추가하지 않음.
2. available 단답과 locked 객관이 있는 문항은 1문항·단답만 가능. 객관 선택은 차단. 목록/출처/자료/차시/랜덤이 같은 적격 실제 표현 집합을 사용.
3. 12문항씩 여러 페이지에 형식 형제가 걸쳐 있어도 카드 중복/누락·잘못된 total 없음. 코드 검색은 실제 표현을 찾고 선택/수정은 실제 ID 사용.
4. family 제한을 끈 상태에서도 같은 questionId 두 형식을 한 장에 넣지 못함. 형식 변경은 자리/문항 수를 유지하고 본문·답·그림이 함께 바뀜. 교체는 형식 변경을 새 문제로 제안하지 않음.
5. 최근 단답 사용 후 객관 형제는 후보/가용량/랜덤/자동/교체에서 제외. 같은 family의 다른 숫자는 해당 규칙상 허용. owner와 날짜 경계는 기존 검사 유지.
6. 특정 형식 요청에 다른 형식으로 메우지 않음. 전체 후보에는 가능한 해가 있는데 임의의 선추첨 때문에 부족으로 끝내지 않음. 지정 없음·0·합 오류·형식×난이도×범위 충돌을 검사.
7. 바구니 동시 재담기/형식 변경/다른 기기 수정, 과거 형제 중복, 출력 직전 잠금/개정 변경에서 선택/순서/입력 보존. GET은 정리 쓰기를 하지 않음.
8. 저장 시험지·publication·교과서 snapshot의 실제 ID/문항 내용/형식/답/학생 연결/출력은 그대로. 구 버전 payload와 로컬 crop·영어가 읽힘. source 슬롯 1·2는 그대로.
9. native radio·라벨·44px 조작·초점 복귀·실패 role=alert·수량 aria-live를 확인. 기존 860/420px 제작기 분기와 880px 모달, 390/320px·짧은 높이·긴 수식에서 마지막 행동에 접근. 배지는 조작처럼 그리지 않음.

이 조사에서 수행한 검증은 문서/경로·소스 근거·JSON 구문·git diff 범위의 일관성 검사뿐이다. 제품 구현/운영 활성화/DB 변경은 남아 있으며 별도 승인 뒤에 진행한다.
