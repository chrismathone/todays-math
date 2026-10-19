# 문항 형식 칸 코드 단계 — 독립 읽기 전용 위험 검토

작성일: 2026-10-19. 검토 대상: `/Users/pss/Desktop/creative/today-format-col`.
검토한 HEAD: `9d33e0cfbd4fe96a59c08d3c3bbe2d7a0ce5aab9`.
2~8절의 기존 동작·시험 평가는 이 HEAD와 검토 시작 시점 파일을 기준으로 한다. 검토 도중 원본에서 진행된 미커밋 구현은 9절에 별도 기록한다. 인용 행 번호는 해당 관찰 시점 기준으로 현재 작업 파일에서는 이동할 수 있다.

## 1. 결론과 검토 범위

**권장안은 저장값의 version·현재 입력 digest를 확인하는 공통 reader와, 앱의 명시적 writer 경로에서 실제 저장 후 세 칸만 채우는 공통 helper다. GET에서 지연 저장하거나 전역 Prisma 확장에 자동 후처리를 추가하는 안보다 동작 범위와 트랜잭션을 설명하기 쉽다.** 형식 판정·digest 계약은 기존 정본을 그대로 사용한다. 새로운 SQL 분류기를 만들 필요는 없다.

이번 작업은 기존 reader, parity 시험, DB 도구·트리거 및 앱 writer 경로의 **정적 검토**다. 코드·테스트·스키마를 변경하지 않았고 테스트, type-check, Prisma 명령, 앱/측정 스크립트를 실행하지 않았다. 공유 DB에는 읽기 접속도 하지 않았다. 하위 worker를 만들지 않았으며 생성 클라이언트는 파일을 읽어 확인하기만 했다. 보고서 외의 파일을 작성하지 않았다.

브리프의 “118,166행 채움, unknown 54, 대조 불일치 0”은 제공된 작업 전제다. 저장된 리드 적용 보고서에도 같은 수와 `completed=true`, PostgreSQL `17.6`이 있다. 이것을 이번 검토의 재측정 결과로 주장하지 않는다. DB 단계 보고서의 초기 “미적용” 설명과 이후 리드 적용 증거의 시점을 구별해야 한다.

소유 worktree `/Users/pss/orca/workspaces/today_/format-code-review`는 시작 및 보고서 작성 직전 `git status --short`가 비어 있었다. 원본 작업트리에서 처음 관찰한 변경은 미추적 브리프 한 파일뿐이었고, 종료 확인 시에는 진행 중인 구현 변경이 여러 파일에서 관찰되었다. 그 변경을 포함해 원본 작업트리를 건드리지 않았다.

### 우선 해결할 위험

| 우선순위 | 위험 | 구체적 제안 |
|---|---|---|
| 높음 | 대표 행의 순서로 정렬하거나 형식을 WHERE에 미리 넣으면 기존 페이지의 묶음 순서가 달라진다. | 묶음 첫 위치와 조건에 맞는 대표 위치를 따로 계산하고, 묶음 첫 위치로 페이지를 자른다. |
| 높음 | 저장값 존재/버전만 보고 신뢰하면 digest 불일치와 NULL 행을 놓친다. | 공통 validity 식과 `valid IS NOT TRUE` fallback을 모든 집계·페이지·후보에 적용한다. |
| 높음 | 원문 변경과 형식을 같은 UPDATE에 넣으면 트리거가 형식을 비운다. | 실제 저장 후 입력을 다시 읽고 별도 UPDATE로 세 칸만 채운다. 동일 트랜잭션과 원문 CAS를 사용한다. |
| 높음 | 공유 generated client에는 새 필드가 없다. | 생성하지 말고 제약을 보고한다. 진행하려면 좁은 typed raw SQL 경계를 사용한다. 타입 단언만으로 Prisma 필드를 추가하지 않는다. |
| 높음 | 현 parity 일부는 구 구현을 고정하고, 실측 일부는 실제 바이트 비교가 아니다. | 응답 계약은 유지하면서 구현 고정 assertion을 새 목표로 교체하고, 현재 기준 코드와의 원본 바이트 비교를 따로 한다. |
| 보통 | 저장용 Prisma UPDATE가 `updatedAt`을 바꾸면 본문이 그대로여도 선택 revision이 달라진다. | 캐시 갱신 SQL은 세 칸만 SET한다. 선택 revision과 응답에 내부 캐시 칸을 넣지 않는다. |

## 2. SQL 집계와 페이지에서 유지할 처리 순서

### 2.1 일반 문항 목록의 두 가지 순서

관찰 근거: [questionProjection.ts:105](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionProjection.ts:105), [questionCountSql.ts:311](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts:311), [unifiedPreview.ts:616](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedPreview.ts:616).

현행 동작은 다음 순서다.

1. 기존 공개 풀과 검색·단원·출처·검수·제외 조건으로 **행 범위**를 만든다. 계정의 최근 제외와 명시적 제외는 기존 question 확장 의미를 유지한다.
2. 그 범위의 모든 행에 기존 `orderBy`의 위치를 부여한다.
3. `questionId`로 묶는다. 묶음의 차례는 그 안의 **첫 행 위치**다.
4. 묶음 안에서 가용 여부와 실제 형식 조건을 모두 만족하는 첫 행을 대표로 선택한다. 만족 행이 없으면 그 묶음을 제외한다.
5. 남은 묶음을 3번의 차례로 정렬한 뒤 LIMIT/OFFSET한다. 전체 문항 수를 먼저 구하고 초과 페이지를 마지막 페이지로 보정한다.
6. 그 쪽의 실제 행 payload와 조건 범위에 맞는 형제 메타데이터를 읽는다. `IN(ids)` 조회 결과는 선택된 ID 순서로 되돌린다.

**필수 반례:** 정렬된 입력이 `A 객관식(position 1)`, `B 단답형(position 2)`, `A 단답형(position 3)`이고 단답형 필터를 골랐다면, 결과는 `A의 3번 행 → B의 2번 행`이다. 형식 WHERE를 먼저 적용하거나 대표 행의 코드/위치로 다시 정렬하면 `B → A`가 되어 1쪽·2쪽이 바뀐다. 첫 행이 잠겨 있고 뒤 형제가 가용인 반례도 따로 필요하다.

현재 `questionPageSql`의 `min(position)`과 조건부 `array_agg(... ORDER BY position)[1]`은 이 구분을 이미 표현한다. 저장 형식으로 바꿀 때 이 구조를 유지하는 편이 안전하다. `DISTINCT ON(question_id)`로 임의 대표를 먼저 정하거나 raw 행을 먼저 LIMIT하는 방식으로 단순화하지 않는다.

기본 정렬은 `unit.orderIndex → problemCode`다. 자료 필터가 있으면 `sourceMaterialId → questionNumber → 기본 정렬`이다. [resolveUnifiedBankQuery:300](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedPreview.ts:300), [problemOrder.ts:88](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/problemOrder.ts:88)의 정본을 따른다. NULL 번호의 위치, 동률, UUID/문자열 정렬도 기존 DB 정렬과 맞춘다. `MIN(id)`는 은행의 첫 대표를 뜻하지 않는다.

### 2.2 exact_ids와 검수 보기는 별도 의미가 있다

[unifiedPreview.ts:667](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedPreview.ts:667)의 `exactIds`는 실제 표현 ID를 보존한다. 형제가 두 행이면 응답에도 두 행이 남을 수 있지만 `total`은 distinct question 수다. 페이지 보정은 실제 ID 목록 길이를 사용한다. 일반 묶음 페이지 함수로 이 경로까지 바꾸면 잠긴 표현이 사라지거나 페이지 수가 줄어든다.

검수 상태를 지정한 목록은 잠김/미분류 표현을 살펴볼 수 있고, 기본 목록은 가용 표현만 고른다. 두 경우의 조건을 하나의 `eligible=true` WHERE로 합치지 않는다. `/api/problems?identity=question`의 기존 정렬·페이지도 별도 경로이므로 [route.ts:262](/Users/pss/Desktop/creative/today-format-col/src/app/api/problems/route.ts:262)까지 확인해야 한다.

### 2.3 수량은 차원마다 question 합집합을 다시 센다

관찰 근거: [questionCountBuckets.ts:35](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountBuckets.ts:35), [bankSourceQuestions.ts:143](/Users/pss/Desktop/creative/today-format-col/src/lib/bankSourceQuestions.ts:143).

권장 집계 의미는 다음과 같다.

- `held = COUNT(DISTINCT question_id)`.
- `available = COUNT(DISTINCT question_id) FILTER (WHERE 기존 자격 AND 알려진 실제 형식)`.
- 내부 `rowCount`는 가용 **표현 행 수**다. distinct question 수로 바꾸지 않는다.
- 전체·학년·단원·출처 그룹·책·자료 종류·자료는 각 범위에서 합집합을 다시 계산한다. 형식별 수나 자료별 수를 더해 상위 수를 만들지 않는다.
- 같은 question의 단답형과 객관식이 모두 가용이면 전체 available은 1, 두 형식별 available은 각각 1이다. `other` 그룹의 transformed/ai_generated도 개별 수의 합이 아닌 합집합이다.
- 관계가 없는 문항까지 보유 전체에서 빠지지 않도록, 책/자료용 조인을 전체 범위의 INNER JOIN으로 사용하지 않는다. 교과서 차원은 기존처럼 `source='school_textbook'`인 실제 행에 한정한다.
- 빈 입력에서도 전체 bucket은 `held=0, available=0, rowCount=0`이다. GROUP BY 결과가 0행이라는 이유로 전체 응답 키를 생략하지 않는다.

가용량 facet은 자기 축의 조건을 뺀 별도 범위다. 단원 facet은 `unitIds/unitFrom/unitTo`, 난이도 facet은 `difficulty`, 출처 facet은 `source/sourceGroup/books/materialKinds/materials`를 뺀다. [BANK_AVAILABILITY_AXES](/Users/pss/Desktop/creative/today-format-col/src/contracts/bankSource.contract.ts:253)를 그대로 사용한다. 단일 main WHERE로 모든 facet을 세면 선택 후 다른 선택지가 사라진다.

`formatAvailable`은 main 범위의 **형식 선택 전** 행으로 세 형식을 각각 센다. 나머지 main/facet 수에는 해당 형식 선택을 적용한다. `/sources`의 view 없는 출처 고르기는 원래 전역 수량이며 활성 목록 필터를 새로 적용하지 않는다. bootstrap의 전역 수량·단원/학년 메타데이터 범위도 현재 동작을 보존한다.

`GROUPING SETS`를 쓴다면 subtotal NULL과 실제 NULL 데이터를 `GROUPING(...)` 또는 명시적 axis로 구별한다. 단순 COALESCE로 두 NULL을 섞으면 raw family bucket과 상위 합계가 충돌한다. SQL count의 반환형도 주의한다. 기존 응답은 number이므로 실제 규모에 맞는 `::int` 또는 범위를 확인한 number 변환을 명시한다.

### 2.4 시험지 후보에는 목록용 중복 제거·페이지를 적용하지 않는다

[unifiedBankSelection.ts:227](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedBankSelection.ts:227), [동 파일:335](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedBankSelection.ts:335)는 전체 가용 표현 풀을 solver에 전달한다. 형식·단원·난이도·family 제약을 함께 풀기 때문이다. 후보를 question당 하나로 미리 접거나 LIMIT하면 가능한 객관식/단답형 조합을 잃는다.

저장 형식으로 **판정 비용**을 줄이되 후보의 실제 표현과 기존 풀 범위를 보존한다. `distinctFamilies=false`여도 question 중복은 금지한다. 선택 후 실제 행의 정체·family·형식 재검사와 409 처리([selectedProblems:151](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedBankSelection.ts:151))는 유지한다. 쪽 크기 이하 payload 원칙은 목록에 적용되고 solver 후보 전체를 읽지 말라는 뜻은 아니다.

## 3. questionGroupKey, NULL, unknown의 의미

### 3.1 question 정체와 MC 증거는 별도다

[questionIdentity.ts:2](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionIdentity.ts:2)의 현재 정체는 `questionGroupKey ?? 'row:' + id`다. 이에 대응하는 SQL은 다음 형태다.

```sql
COALESCE(p.question_group_key, 'row:' || p.id::text) COLLATE "C"
```

NULL 행은 각각 독립이다. `COUNT(DISTINCT question_group_key)`는 NULL 행을 누락하고, NULL을 하나의 공통 문자열로 바꾸면 서로 다른 문항을 합친다. family, 코드, 내용 해시를 question 정체의 대체물로 쓰지 않는다.

**관찰된 세부사항:** helper는 비NULL 키의 형식을 정체 판정에서 검증하지 않는다. 빈 문자열 `''`이나 미인식 문자열도 같은 문자열끼리는 묶인다. 반면 [questionFormat.ts:13](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionFormat.ts:13)의 본문 없는 MC 증거는 `^q:v1:[a-f0-9]{64}$`와 한글 `객관식` 조건을 요구한다. SQL 전환 중 `NULLIF(key,'')`, trim 또는 “strict v1만 정체” 정책을 추가하면 기존 fixture/reader와 다르다. 미인식 키 처리의 정책 개선은 이 성능 작업과 분리해야 한다.

strict 키는 모든 형제를 객관식으로 만들지 않으며 출제 자격도 보증하지 않는다. 정체는 공유해도 형식·잠김·검수·정답 상태는 실제 행마다 다르다. 새 형식 writer가 캐시를 채우려고 지워진 키를 복원해서는 안 된다. 키를 쓸 수 있는 주체는 기존 strict proof 경계를 계속 따른다.

### 3.2 DB의 unknown과 reader의 null을 분리한다

| 상태 | 저장값 사용 | fallback | 외부/기존 후보 의미 |
|---|---|---|---|
| 세 칸 NULL | 불가 | 기존 정본 판정 | 판정 결과에 따라 결정 |
| 형식·버전·digest가 유효하고 형식이 unknown | 가능 | 불필요 | `actualFormat=null`, available=false; 보유에는 포함 |
| 지원 버전 불일치 | 불가 | 기존 정본 판정 | fallback 결과 사용 |
| 현재 입력 digest 불일치 | 불가 | 기존 정본 판정 | fallback 결과 사용 |
| 부분 triple/알 수 없는 형식 값 | 불가 | 방어적 fallback 또는 명시적 오류 | 임의 단답/서술로 치환 금지 |

[questionProjection.ts:91](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionProjection.ts:91)는 분류기 unknown을 후보의 null로 바꾼다. DB의 unknown 문자열을 그대로 bucket 키나 API 형식 목록에 추가하지 않는다. unknown은 정상적인 판정 결과이며 재시도 실패·파서 예외와 다르다. unknown 54를 미계산 NULL 수나 fallback 수로 세지 않는다.

자격 SQL은 [problemEligibility.ts:32](/Users/pss/Desktop/creative/today-format-col/src/lib/problemEligibility.ts:32)를 따른다. 특히 정답이 빈 문자열인지까지 새로 검사해 자격 규칙을 확대하지 않는다. 현재 자격은 `MISSING_ANSWER` 센티널을 제외하며, 별도의 hasAnswer 필터와 의미가 다르다.

### 3.3 family 용량은 question 수와 또 다르다

[familyIdOf:48](/Users/pss/Desktop/creative/today-format-col/src/lib/generator/familyKey.ts:48)는 JS trim 뒤 `(unitId, canonicalFamilyKey)`를 사용한다. NULL·빈 값·공백뿐인 family는 **행마다** 독립이며, 승인된 단원별 alias도 적용한다. 동일 raw key를 전 단원에서 합치거나 `COUNT(DISTINCT family_key)`로 대체하면 안 된다.

현재 `unitFamilies = min(가용 canonical family 수, 가용 distinct question 수)`다([bankSourceQuestions.ts:194](/Users/pss/Desktop/creative/today-format-col/src/lib/bankSourceQuestions.ts:194)). raw family bucket과 canonical family 용량을 혼동하지 않는다. SQL의 단순 btrim은 JS trim과 모든 문자에서 같다고 가정할 수 없다. JS 식별자의 NUL 구분자를 PostgreSQL text에 그대로 옮기는 방법도 피한다.

단순한 대안은 SQL에서 unit·raw family별 가용 표현 수를 집계한 뒤 작은 메타데이터 결과에 기존 JS trim/alias resolver를 적용하는 것이다. 이름 있는 canonical family는 집합으로 합치고, trim 후 비어 있는 family는 가용 표현 행 수만큼 독립 용량을 더한 뒤 unit의 distinct question 수로 상한을 둔다. SQL로 alias까지 옮긴다면 기존 정본에서 만든 매개변수 매핑과 로컬 대응 시험이 필요하다.

## 4. digest/version 검증을 실제 빠른 경로에 넣는 방법

### 4.1 신뢰 조건을 한 곳에서 고정한다

정본은 [scripts/db/problem-actual-format.ts:30](/Users/pss/Desktop/creative/today-format-col/scripts/db/problem-actual-format.ts:30)의 버전 계산과 [동 파일:55](/Users/pss/Desktop/creative/today-format-col/scripts/db/problem-actual-format.ts:55)의 digest다.

```text
SHA256(UTF8(JSON.stringify([
  "problem-actual-format-input-v1",
  content, answer, questionType ?? null, problemType ?? null,
  familyKey, questionGroupKey ?? null
])))
```

정확한 원문·필드 순서·NULL·빈 문자열을 보존한다. trim, NFC/NFD 통합, CRLF/LF 통합, 답안 가공을 하지 않는다. 백필 보고 버전은 `format-v1:1c653f6c01b41e1c9e9a78edab82a2e3373923af6d6c88aa9f21233aafa0e42a`다. 이번 검토에서 버전 함수를 실행한 것은 아니다.

유효 조건은 지원 형식 값 + 지원 버전의 **정확한 일치** + 현재 여섯 입력으로 다시 계산한 digest의 정확한 일치다. “버전 문자열에 format-v1이 들어 있다”, digest 길이가 64다, 캐시 세 칸이 서로 있다, updatedAt이 같다 중 어느 것도 입력 대응 검증을 대신하지 않는다. hash 버전에는 신구 대소관계가 없으며 문자열 크기로 비교하지 않는다.

`valid`를 SQL의 nullable 식으로 만들었다면 미유효 행은 `WHERE valid IS NOT TRUE`로 찾는다. `WHERE NOT valid`만 쓰면 세 칸 NULL인 행의 UNKNOWN 논리값 때문에 fallback 대상이 누락될 수 있다. 정상 unknown은 유효 집합에 남겨야 한다.

### 4.2 본문을 Node로 전수 전송하지 않는 검증 후보

본문을 전수 SELECT해서 Node에서 digest를 확인하면 파서 호출은 줄어도 전송량 병목을 되살린다. 반대로 트리거만 믿고 digest 비교를 생략하면 브리프 조건을 충족하지 않는다.

**구체적 후보:** DB 스키마 변경 없이 SELECT 식에서 고정 순서 text 배열을 JSON으로 만든 뒤 UTF-8 SHA-256을 계산한다. 아래는 검토용 식이며 실행·대응 검증은 하지 않았다.

```sql
encode(
  sha256(convert_to(
    array_to_json(ARRAY[
      'problem-actual-format-input-v1'::text,
      p.content, p.answer, p.question_type, p.problem_type,
      p.family_key, p.question_group_key
    ])::text,
    'UTF8'
  )),
  'hex'
)
```

PostgreSQL 17은 `array_to_json`과 기본 `sha256(bytea)`·`convert_to`·`encode`를 제공한다. 새 pgcrypto 설치/함수 DDL은 이 안의 전제가 아니다. 이 사실만으로 JS 직렬화와 전체 입력 공간에서 동일함을 증명하지는 않는다. 적용 전 로컬 PGlite와 이후 리드의 허용된 읽기 전용 실측에서 반드시 대응을 검증한다. [PostgreSQL JSON 함수](https://www.postgresql.org/docs/17/functions-json.html), [바이너리·문자 인코딩/해시 함수](https://www.postgresql.org/docs/17/functions-binarystring.html).

JSON 객체나 `jsonb_build_array(...)::text`로 임의 교체하지 않는다. JSON 직렬화 공백과 NULL 생략 옵션은 digest를 바꿀 수 있다. 직렬화 뒤 공백을 정규식으로 제거하는 방식은 문자열 안의 원문까지 손상시킬 수 있다.

권장 조회 흐름은 다음과 같다.

1. 동일 `RepeatableRead` 스냅샷에서 필요한 범위의 validity를 구한다. 미유효 ID와 최소 판정 입력만 제한된 배치로 읽는다.
2. 미유효 행만 기존 `questionFormatWithoutContent`/필요시 `classifyFormat`으로 판정한다. 결과를 요청 내부 ID→형식 관계로 만든다. 결과 unknown도 명시적 값으로 보존한다.
3. 모든 SQL 집계와 페이지는 `유효 저장값 UNION 미유효 판정 결과`라는 같은 effective format을 사용한다. 저장값이 틀린 행을 원래 actual_format WHERE로 먼저 거르면 올바른 형식으로 복구할 기회를 잃는다.
4. 요청 중 동일 ID의 판정을 재사용하되, scope가 다른 facet에 필요한 미유효 ID도 포함한다. 내용·정답은 최종 쪽/선정 payload 외에 무조건 전수 전송하지 않는다.
5. 분류 예외, fallback 누락, 읽는 중 사라진 행을 정상 unknown으로 조용히 처리하지 않는다. 트랜잭션 일관성과 실패 처리를 명시한다.

현재 DB 인덱스가 있어도 digest 검증은 본문을 DB 내부에서 읽는 비용을 요구할 수 있다. 이는 본문 전송/파서 비용 제거와 별개다. 동일 넓은 범위의 hash를 facet마다 여러 번 계산하지 않도록 실제 실행 계획을 확인한다. 페이지 쿼리의 MATERIALIZED relation 등을 재사용할 수 있지만, 스키마 변경 없이 가능한 범위에서 먼저 단순하게 구현하고 실측한다. “fallback이 적다”만으로 수백 ms 달성을 확정하지 않는다.

### 4.3 버전을 요청마다 소스 파일에서 계산하지 않는다

현 `formatRuleVersion()`은 DB 운영 도구용이며 런타임 TS 파일을 filesystem에서 재귀적으로 읽는다. 이를 제품 요청 경로에서 매번 실행하거나 도구 전체를 서버에 import하는 방식은 피한다. 배포 산출물에 그 원본 TS 경로들이 있는지 확인되지 않았고 동기 I/O도 생긴다.

현재 검증된 버전 상수를 서버용 모듈에 두고, 로컬/CI 시험에서 운영 도구의 재계산 결과와 같음을 확인하는 방식이 단순하다. parser, 원문자·보기 규칙, 본문 없는 증거 정책이 바뀌면 버전도 바뀌어야 한다. 버전 해시는 주석·소스 이동 같은 비동작 변경에도 달라질 수 있으므로, 이번 작업에서 정본 파일을 불필요하게 옮기거나 import graph를 바꿔 전체 백필을 무효화하지 않는 편이 좋다.

입력 digest와 순수 판정 helper를 제품/운영 도구가 공유하도록 분리할 수 있지만 기존 digest 바이트와 버전 해시가 보존되는지 먼저 확인한다. `scripts/db/...`의 경로·fs·Prisma 운영 계약을 제품 writer의 의존성으로 통째로 끌어오는 것보다 순수 모듈과 운영용 버전 산출부를 구분하는 편이 안전하다.

## 5. actual_format writer 대안

### 5.1 확인된 제약과 실제 수정 지점

현재 앱의 실제 문항 생성·수정은 다음 네 곳이다.

- [수동 생성 route.ts:62](/Users/pss/Desktop/creative/today-format-col/src/app/api/problems/route.ts:62): `create`.
- [AI 생성 route.ts:74](/Users/pss/Desktop/creative/today-format-col/src/app/api/problems/generate/route.ts:74): `createManyAndReturn`.
- [변형 채택 route.ts:135](/Users/pss/Desktop/creative/today-format-col/src/app/api/problems/transform/adopt/route.ts:135): `createManyAndReturn`.
- [수정 route.ts:118](/Users/pss/Desktop/creative/today-format-col/src/app/api/problems/[id]/route.ts:118): 부분 `update`.

검수/승격 경로도 `tx.problem.update`를 사용하지만 형식 입력을 직접 바꾸지는 않는다. 그때 원래 NULL인 캐시를 수리할지 여부는 별도 선택이며 모든 검수 쓰기에 자동 파싱을 추가할 필요는 없다.

공유 `node_modules`는 `/Users/pss/Desktop/creative/today_/node_modules`의 기존 심볼릭 링크다. 그 안의 `.prisma/client/index.d.ts`와 `.prisma/client/schema.prisma`에서 `actualFormat`/`actual_format` 출현이 각각 **0건**이고 `questionGroupKey`는 존재했다. repo schema에는 세 칸이 있으나 현재 generated client에는 없다. 이는 실행 없이 파일을 읽어 확인한 제약이다. Prisma generate/설치로 우회하지 않는다.

**typed raw SQL은 이 제약을 우회하는 설계 대안이지 새 필드를 Prisma 모델 API에서 쓸 수 있게 만드는 방법이 아니다.** 타입 단언으로 `data.actualFormat` 또는 `select.actualFormat`을 강제하면 실제 클라이언트의 필드 인식 문제가 남는다. 브리프의 “클라이언트에 없으면 보고”에 따라 이 제약을 본 작업 보고서에 명시하고, raw 경계로 진행하는 경우에도 그 선택 근거를 남긴다.

### 5.2 같은 INSERT/UPDATE payload에 계산값을 넣는 안은 부족하다

[actual_format 트리거](/Users/pss/Desktop/creative/today-format-col/prisma/migrations/20261019120000_problem_actual_format/migration.sql:20)는 원문 입력이 바뀌면 새로 제출한 세 칸까지 NULL로 만든다. 입력 변경 UPDATE에 계산값을 같이 실어도 채워지지 않는다. 기존 DDL을 약화해 같은 UPDATE를 허용하는 것은 이번 범위 밖이며 구버전 writer 방어도 잃는다.

INSERT도 요청 데이터만 보고 계산하면 안전하지 않다. [problem_code_assign:187](/Users/pss/Desktop/creative/today-format-col/prisma/migrations/20260825020000_problem_family_code/migration.sql:187)는 familyKey를 trim하고, 없으면 `solo:<uuid>`를 만든다. familyKey는 digest 입력이다. 입력 요청의 null family로 만든 digest는 실제 저장된 family와 달라진다. UPDATE에서는 선행 정체 트리거가 solution/그림/단원 등의 변경으로 키를 지울 수도 있다. **모든 트리거를 거친 실제 저장값**으로 판정해야 한다.

### 5.3 권장: 명시적 앱 writer와 공통 후처리 helper

기본 구조는 `기존 권한·입력 검증 → 같은 tx의 기존 create/update → 실제 저장 입력 읽기 → 정본 판정 → 세 칸만 raw UPDATE → 최종 대응 확인 → commit`이다. 이미 트랜잭션인 경로에는 전달받은 `tx`를 사용한다. 전역 db로 다시 나가거나 tx 안에서 별도 전역 트랜잭션을 시작하지 않는다. AI 생성·그림 처리 등 오래 걸리는 작업은 tx 밖에 둔다.

helper는 다음 조건을 갖추면 된다.

1. 대상은 방금 생성/수정한 실제 ID다. 부분 PATCH와 오래된 accessible 객체를 합쳐 추정하지 말고, 현재 여섯 입력을 읽는다.
2. batch는 ID로 대응시킨다. 결과 배열과 요청 배열을 zip하지 않는다. 현재 route 주석과 달리 Prisma v6 문서는 `createManyAndReturn` 반환 순서를 보증하지 않는다. 후처리에서 기존 반환 배열 순서를 바꾸지 않고 `row.id` 기준으로 계산값을 연결하면 새 순서 가정을 추가하지 않을 수 있다. [Prisma v6 createManyAndReturn](https://www.prisma.io/docs/orm/v6/reference/prisma-client-reference#createmanyandreturn).
3. 동일 tx에서 원문 쓰기 잠금을 유지한 채 계산한다. 재사용 가능한 helper로 만들 경우, 별도 진입에서도 안전하도록 현재 입력 여섯 칸과 기존 triple을 NULL-safe CAS한다. ID만 WHERE에 넣어 늦게 계산된 캐시를 쓰지 않는다.
4. raw UPDATE의 SET은 actual_format·actual_format_version·actual_format_digest뿐이다. updated_at, question_group_key, family, 코드, 자격을 보존한다.
5. 반환 행 수만 보지 않고 최종 저장 triple과 입력 digest 대응을 확인한다. 계산 불일치나 SQL 실패는 같은 tx 전체를 rollback한다. 실데이터를 이미 commit한 뒤 후처리 오류를 HTTP 실패로 내보내 재시도 중복 생성을 유도하는 구조는 피한다.
6. 외부 버전의 유효한 비NULL 캐시를 원문 변경 없는 수리 과정에서 덮지 않는다. 새 원문 변경으로 NULL이 된 경우에는 이 코드 버전의 값을 채울 수 있으나, 다른 reader는 자기 버전과 다르면 fallback해야 한다.
7. raw 호출은 기존 Prisma read visibility/캐시 무효화 확장을 통과하지 않는다. 신뢰된 실제 ID와 기존 범위 조건을 명시하고, 성공 commit 후 기존 은행 캐시 무효화 계약을 연결한다. tx 중간의 무효화만으로 commit 이후 무효화까지 보장했다고 단정하지 않는다.

이미 [updateLockedRows:156](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:156)에 현재 입력 재독해·잠금·6입력/triple CAS·세 칸 SET·readback의 검증된 설계가 있다. 그 **원리**를 작은 제품 helper로 옮기는 것이 좋다. 운영자 전용 원장·재개·공유 쓰기 관문 전체를 앱 요청에 가져올 필요는 없다.

`updatedAt`은 [questionRevisionOf:58](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionSelection.ts:58)에 참여한다. 캐시만 Prisma update하면 자동 updatedAt 때문에 선택 revision이 바뀔 수 있다. 캐시 칸을 QUESTION_REVISION_SELECT에 추가하는 방법도 revision을 불필요하게 바꾼다. raw로 세 칸만 갱신하면 이 문제를 피할 수 있다. Prisma의 자동 시각은 ORM 레벨 동작이다. [Prisma v6 @updatedAt](https://www.prisma.io/docs/orm/v6/reference/prisma-schema-reference#updatedat).

### 5.4 다른 대안의 비교

| 대안 | 단순성·안전성 판단 |
|---|---|
| 각 route에서 계산 코드를 복사 | 짧아 보여도 digest·트리거 후 값·예외 처리가 네 벌이 된다. 공통 helper를 권장한다. |
| 전역 Prisma `$allOperations` 자동 후처리 | 기존 [db.ts 확장](/Users/pss/Desktop/creative/today-format-col/src/lib/db.ts:39)에 숨기면 내부 재귀, select/omit, 배치 count 반환, nested write, tx 사용 여부까지 고려해야 한다. 현재 네 writer를 직접 연결하는 안보다 범위가 크다. |
| GET에서 NULL을 만나면 지연 저장 | 조회 스냅샷의 쓰기 전환, 여러 동시 GET의 중복 채움, 잠금, 캐시 무효화, 실패 정책이 추가된다. 읽기 전용 실측의 DB 관문과도 충돌한다. 이번에는 권장하지 않는다. |
| 앱 writer에서 저장 후 채움 | 실제 ID와 tx 경계가 분명하다. 생성 클라이언트 없이 typed raw helper로 가능하며 GET을 읽기 전용으로 유지한다. 권장안이다. |

원문 저장은 성공시키고 캐시 실패만 best-effort로 남기는 정책을 택한다면 그것을 명시적으로 설계해야 한다. 실패한 SQL이 같은 tx를 중단시킨 상태에서 단순 catch 후 commit하려는 구조는 피한다. 이번 권장안은 먼저 원문+캐시의 같은 tx와 실패시 rollback으로 범위를 단순하게 고정하는 것이다.

직접 SQL 적재/운영 스크립트는 여전히 트리거로 NULL이 될 수 있다. 앱 helper가 모든 적재자를 포괄한다고 주장하지 않는다. 관련 08·schoolbook 문서에는 “적재 후 기존 actual-format 백필 도구로 재검증·채움, 직접 SQL 후 epoch/TTL 계약 적용” 안내를 추가할 수 있다. **이번 브리프의 공유 DB 쓰기 금지 상태에서 백필을 실제 실행하라는 뜻은 아니다.**

## 6. 기존 parity 시험이 보장하는 것과 빈칸

### 6.1 기존 시험별 평가

| 시험/도구 | 현재 보장 | 이번 전환에 필요한 보완 |
|---|---|---|
| [builderSpeedParity:76](/Users/pss/Desktop/creative/today-format-col/src/__tests__/api/builderSpeedParity.test.ts:76) | 10개 필터의 수량·후보 정체 스냅샷, picker/bootstrap, 계정 제외·캐시 무효화 | 130~165행은 raw SQL 미호출/무제한 메타데이터 1회라는 구 방식 고정이다. 응답 스냅샷은 보존하고 이 assertion은 새 목표에 맞게 변경한다. 166행 이후도 raw가 page 단 1회라는 가정을 재검토한다. |
| [questionBankProjection:127](/Users/pss/Desktop/creative/today-format-col/src/__tests__/api/questionBankProjection.test.ts:127) | 같은 구현의 uncached/cold/warm 바이트, 묶음 페이지, 잠긴 형제, exact_ids, revision, solver | 변경 전 구현과 변경 후 구현의 직접 바이트 비교는 아니다. 159~172, 405~415행의 scan 횟수 고정도 새 SQL 구현에서 의미 있는 비용 assertion으로 바꾼다. |
| [builderSpeedPgliteParity:39](/Users/pss/Desktop/creative/today-format-col/src/__tests__/api/builderSpeedPgliteParity.test.ts:39) | 실제 로컬 SQL 실행과 과거 reader의 폭넓은 필터 대응 | fixture/harness에 저장 triple과 snake_case view 매핑이 없다. 유효 저장값을 읽는 경로와 invalid digest 경로를 추가하지 않으면 새 경로 검증이 비어 있다. 265행의 raw는 page뿐이라는 조건도 이번 집계 목표와 다르다. |
| [problemActualFormatMigration:59](/Users/pss/Desktop/creative/today-format-col/src/__tests__/unit/problemActualFormatMigration.test.ts:59) | 실제 migration·정체 트리거 위의 무효화, NULL 전이, 권한, old writer, partial triple CHECK | DDL이 기존 reader를 안 바꾼다는 시험이며 새 reader/writer의 캐시 신뢰·후처리를 보장하지 않는다. |
| [problemActualFormatBackfill:17](/Users/pss/Desktop/creative/today-format-col/src/__tests__/unit/problemActualFormatBackfill.test.ts:17) | exact digest·증거 충돌·기존 백필의 locked reread/CAS/readback | JSON SQL digest 대응, 앱 네 경로, cache-only revision 보존, 지연 writer 경합은 별도 필요하다. |

[Prisma mock:3172](/Users/pss/Desktop/creative/today-format-col/src/mocks/prismaTestDouble.ts:3172)은 SQL 자체가 아니라 `questionCountRead` 메타데이터를 보고 JS로 page를 재현한다. SQL이 틀렸는데 mock만 맞는 경우가 가능하다. 새 raw count/digest 쿼리도 mock 구현만 추가한 상태를 SQL 검증 완료로 보지 않는다. 실제 SQL 실행은 PGlite에서 별도로 확인한다.

[builderSpeedPglite.ts:49](/Users/pss/Desktop/creative/today-format-col/src/__tests__/helpers/builderSpeedPglite.ts:49)의 snake_case mapped 목록에 실제 형식 세 칸을 추가하고, fixture의 동적 칼럼에도 저장 triple이 들어가야 한다. version/digest SELECT가 실패했을 때 조용히 구 경로로 돌아가 전체 suite가 통과하는 상황을 막기 위해 “유효 저장 행으로 실제 fast path가 실행됨”을 독립 assertion으로 둔다.

현재 PGlite 폭넓은 조합 fixture는 strict 모양 키와 보기가 없는 본문 같은 모순 입력도 의도적으로 포함한다. 그 fixture 전부를 `classifyFact`로 prime하면 `FORMAT_EVIDENCE_MISMATCH`가 나는 경우가 있다. 모순 증거를 정상 캐시로 억지 채우거나 검사 자체를 제거하지 말고, 유효 캐시 fixture와 legacy/fallback/증거 충돌 fixture를 나누어 목적을 명확히 한다.

### 6.2 최소 추가 검증 행렬

구현 담당자가 추가할 시험 제안이며 이번 검토에서는 작성·실행하지 않았다.

1. **신뢰/회피 행렬:** 세 정상 형식과 정상 unknown, 전체 NULL, version 불일치, digest 불일치, 방어용 partial triple. 저장 형식의 오판정이 fallback 후 다른 형식으로 바뀌는 경우와 unknown이 되는 경우를 모두 넣는다. count·page·candidate가 같은 결과를 내야 한다.
2. **빠른 경로의 음성 대조:** 전량 유효 fixture에서는 목록/집계 때문에 전수 본문이나 answer를 Node로 읽지 않는다. final page와 형제 revision payload의 본문 읽기는 허용한다. 정상 unknown은 반복 fallback하지 않는다. invalid 행 수에 비례해 최소 판정 입력만 읽는다.
3. **JSON 바이트 대응:** 여섯 입력을 하나씩 바꾸고 SQL/TS digest를 대조한다. NULL/빈 값, 공백, 탭, LF/CRLF, 따옴표, 역슬래시·LaTeX, 원문자, 한글, 결합문자/완성문자, emoji, U+2028/U+2029, 긴 본문을 포함한다. 파서가 같은 형식을 내더라도 원문이 달라지면 digest는 달라져야 한다.
4. **페이지 반례:** A-other/B-fit/A-fit, A-blocked/B-fit/A-fit, 동률 자료 번호, NULL 번호, 첫/둘째/마지막/초과/빈 페이지. 대표 ID, questionId, questionFormats 순서까지 대조한다.
5. **정체/합집합:** NULL 키 두 행, 빈 키/미인식 키의 현행 의미, 같은 question의 여러 형식·source/material/book, 서로 다른 unit의 같은 family, alias family, 공백 family. 단순 총계뿐 아니라 각 ID·각 bucket과 rowCount까지 확인한다.
6. **특수 조회:** exact_ids로 같은 question의 잠긴 표현 두 개, 검수 상태 조회의 unknown, 형식 선택 후 다른 formatAvailable 수, 자기 축 제외 facet, 전역 picker, 자료 정렬, bootstrap, 최근 계정 A/B, 명시적 제외, dev/운영 GET/POST.
7. **writer:** 실제 INSERT family 자동 부여, 부분 PATCH, solution/figure 변경으로 키 제거, 같은 값 저장, 정상 unknown 저장, 생성 batch 순서 뒤섞임, 캐시만 채웠을 때 updatedAt/revision 동일, 실패시 전체 rollback. stale 계산 후 원문 변경→늦은 캐시 쓰기가 현재 입력 CAS에 거절되는 시나리오도 넣는다.
8. **solver:** 각 형식 quota를 동시에 만족하는 형제 조합, family 제한 해제 후 question 유일성, 선택 후 내용 변경의 409. 목록용 SQL을 후보 풀에도 재사용해 표현이 유실되는 회귀를 막는다.

PGlite는 단일 연결 로컬 엔진이므로 실제 다중 연결 잠금 경쟁의 증명은 아니다. stale snapshot을 넣어 CAS 조건이 거절하는지 확인할 수는 있으며, 그 결과와 실제 경쟁 검증을 구분해서 보고한다.

## 7. 바이트 parity와 실측 도구의 구체적 주의점

### 7.1 기존 기준과 이번 기준을 구별한다

[.builder-speed-baseline/README](/Users/pss/Desktop/creative/today-format-col/.builder-speed-baseline/README.md:3)의 기준은 `27b66e0...`다. 이 과거 기준과 현재 reader의 의미 대응은 유지하되, 이번 변경의 “전”은 **이번 작업 시작 직전 현재 코드**여야 한다.

특히 [measure-bank-list-cache-live.ts:135](/Users/pss/Desktop/creative/today-format-col/scripts/qa/measure-bank-list-cache-live.ts:135)는 기준 unifiedPreview 파일 한 개만 꺼내고 그 파일의 `@/lib/problem/questionProjection` 같은 import는 현재 코드로 해석한다. 이번에 공통 reader를 바꾸면 전/후가 같은 새 reader를 호출할 수 있다. 변경하는 모든 reader 의존 경계를 현재 HEAD에서 고정하고 baseline 내부 참조를 그 고정본으로 돌려야 독립 대조가 된다. query helper가 바뀔 경우 그 부분도 같은 기준으로 관리한다. 정본 classifier가 공유된다는 점과 캐시 reader까지 공유되어 버리는 문제를 구분한다.

### 7.2 canonical hash는 원본 응답 바이트가 아니다

[measure-builder-speed-live.ts:88](/Users/pss/Desktop/creative/today-format-col/scripts/qa/measure-builder-speed-live.ts:88)는 객체 키를 정렬한 canonical hash를 비교한다. 또한 같은 path의 전/후가 별도 READ ONLY 트랜잭션에서 실행된다. 이 도구의 equal=true만으로 원본 바이트 일치 또는 동일 스냅샷 비교를 충족했다고 보고하면 안 된다.

반면 [measure-bank-list-cache-live.ts:183](/Users/pss/Desktop/creative/today-format-col/scripts/qa/measure-bank-list-cache-live.ts:183)는 정규화 없는 `Buffer.from(JSON.stringify(value))`를 같은 snapshot에서 비교한다. 이 방식과 DB READ ONLY 확인/모델 쓰기 차단을 재사용하고, availability/picker/bootstrap/다른 필터까지 확장하는 편이 좋다. 단, 앞 절의 baseline import 독립성과 캐시 초기화가 함께 해결되어야 한다. 이 비교는 서버 반환 JSON의 바이트이며 auth/HTTP/렌더를 포함한 전체 사용자 지연 측정은 아니다.

PGlite parity도 [244~249행](/Users/pss/Desktop/creative/today-format-col/src/__tests__/api/builderSpeedPgliteParity.test.ts:244)에서 과거 baseline과는 의미를 비교하고 현재 cold/warm끼리 바이트를 비교한다. 이번 요구의 전/후 원본 바이트 검증은 따로 추가한다.

### 7.3 기존의 미지정 순서를 새 계약처럼 단정하지 않는다

현재 summary의 grades/일부 object key, picker의 kinds 등에는 unordered findMany의 첫 등장 순서를 이어받는 부분이 있다([questionBankMetadata:783](/Users/pss/Desktop/creative/today-format-col/src/lib/unifiedPreview.ts:783), [source counts:315](/Users/pss/Desktop/creative/today-format-col/src/lib/bankSourceQuestions.ts:315)). SQL GROUP BY는 그 Map 삽입 순서를 보증하지 않는다. `toEqual`은 객체 키의 삽입 순서 차이를 잡지 못하지만 JSON 바이트는 달라진다. grades처럼 배열인 경우 사용자에게 보이는 순서도 달라질 수 있다.

고정 순서인 QUESTION_FORMATS, 난이도 ladder, source group, 책/자료의 기존 comparator와 객체 생성 순서는 그대로 재사용한다. 나머지는 이번 현재 baseline과 같은 snapshot의 실제 바이트를 먼저 대조한다. 차이가 나면 해당 순서의 호환 처리를 명시해야 한다. **새 정렬을 추가하거나 키를 정렬한 해시만 비교한 뒤 “바이트 동일”이라고 쓰면 안 된다.** 원래 SQL 읽기 자체가 unordered인 지점에 대해 장기적으로 모든 실행에서 동일한 바이트를 보증하려면 별도의 순서 계약 결정이 필요하다는 한계도 보고한다.

### 7.4 첫 호출과 캐시 영향을 분리한다

기존 live script는 버전별 loop 앞에서 캐시를 한 번 비우므로 뒤 경로는 앞 경로가 데운 summary/count를 재사용할 수 있다. 전량 첫 호출 3회를 주장하려면 **각 경로 × 각 전/후 sample 직전**에 앱 은행 캐시를 초기화한다. pool 연결이 이미 데워졌는지와 앱 캐시가 비었는지도 구분한다. 읽기 전용 제약 아래 DB buffer cache를 비우는 시도는 하지 않는다.

전/후와 각 sample의 원본 byte 길이·SHA-256·동일 여부, total/page, raw 집계/쪽 query 횟수, fallback 이유별 행 수, Node로 반환한 본문 행 수, 세 번의 시간과 중앙값을 남기면 된다. 한 raw query가 1행을 반환해도 DB에서 전량 hash/sort할 수 있으므로 반환량을 실행 비용과 혼동하지 않는다. 별도 계정의 최근 제외/권한 결과는 공용 캐시에 넣지 않는다.

## 8. 담당자에게 권장하는 완료 조건

1. 현재 generated client 필드 부재를 명시하고 생성 없이 쓸 SQL 경계를 좁게 정한다.
2. TS/SQL digest 바이트 대응과 현재 버전의 일치 검증을 먼저 붙인다. validity와 fallback 논리는 모든 reader에서 공유한다.
3. 저장 형식으로 SQL 집계와 기존 두 위치 기반 페이지를 전환한다. exact_ids·검수·facet·solver는 각각 기존 의미를 유지한다.
4. 네 앱 writer는 실제 저장 후 공통 helper를 연결하고, 같은 tx·세 칸만 갱신·원문 CAS·readback·commit 후 캐시 무효화를 검증한다. GET은 읽기 전용으로 유지한다.
5. 구 구현 방식을 고정하는 시험만 새 성능 목표로 바꾼다. 응답 snapshot/정체/revision/계정 분리 가드는 보존하고 새 캐시 경로의 음성 대조를 추가한다.
6. 구현 담당자가 관련 로컬 시험과 필요한 type-check/lint를 수행한다. 허용된 담당자의 공유 DB 읽기 전용 측정은 현재 baseline과 같은 snapshot에서 원본 바이트를 비교하고, 각 경로의 앱 캐시 없는 3회 값을 별도로 남긴다.

위 조건을 확인하기 전에는 DB 단계의 “대조 불일치 0”이나 기존 parity suite만으로 **새 캐시 reader와 앱 writer가 검증되었다고 결론 내리기 어렵다.** 이번 보고서는 구현 전 위험과 검증 제안이며 새 코드의 실행 승인이나 운영 검증 완료 보고가 아니다.

## 9. 종료 확인 때 새로 관찰된 진행 중 구현에 대한 보충

보고서 검증 중 원본 작업트리에 `actualFormat.ts`, `actualFormatProjection.ts`, SQL/reader 변경과 새 실측 도구가 생겼다. 다음은 그 시점의 관련 부분만 읽은 보충이며, 진행 중 diff 전체에 대한 완료 판정은 아니다. 이후 작성자가 수정했을 수 있다. 새 코드를 실행하거나 그 파일을 수정하지 않았다.

### 9.1 앞 절의 위험을 이미 반영한 부분

- [actualFormat.ts:6](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/actualFormat.ts:6)에 백필 버전 상수가 있고 TS digest도 기존 직렬화와 같은 필드 순서다. 파일 시스템을 읽는 버전 함수를 제품 요청에서 실행하지 않는다. 상수와 운영 도구 재계산의 일치 시험은 여전히 필요하다.
- [questionCountSql.ts:226](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts:226)는 필드별 `to_json` 직렬화와 쉼표 결합으로 SQL digest를 구성한다. 4절의 배열 방식과 다른 후보지만 원문 공백을 제거하는 위험한 방식은 아니다. 실제 TS/SQL 바이트 대응 시험을 통과해야 한다는 조건은 같다.
- [validity:237](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts:237)는 version·지원 값·현재 digest를 확인하고 전체 식에 `COALESCE(..., FALSE)`를 적용한다. 이 구조라면 그 결과에 대한 `NOT(valid)`가 NULL 행을 누락하는 4.1절 문제는 방어된다.
- [page SQL:354](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts:354)은 첫 묶음 위치와 조건부 대표를 분리하는 기존 구조를 유지한다.
- PGlite helper에는 새 triple의 기본 NULL과 snake_case view 매핑이 추가되었다. 따라서 6.1절 표의 “기존 harness에 매핑이 없다”는 지적은 초기 HEAD 기준이며, 새 diff에서는 이 선행 작업이 반영되었다. 기본 NULL fixture만으로 정상 저장 fast path가 검증되는 것은 아니다.
- [새 실측 도구:137](/Users/pss/Desktop/creative/today-format-col/scripts/qa/measure-question-format-column-live.ts:137)는 여러 reader 의존 파일을 baseline에서 고정하고, 같은 READ ONLY snapshot 안에서 원본 JSON 바이트를 비교하며, sample마다 은행 캐시를 비운다. 7절의 기존 도구 한계를 개선하는 방향이다. 실제 실행 결과는 이번 검토에서 확인하지 않았다. 최종 보고에는 문자열 `HEAD` 대신 시작 시 해석한 commit SHA도 남기는 편이 재현하기 좋다.

### 9.2 지연 저장안에 남은 핵심 위험

현재 [loadActualFormats:42](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/actualFormatProjection.ts:42)는 writable이고 세 칸이 모두 NULL이며 legacy/정본 판정이 같을 때 지연 저장 대상을 만든다. [50~55행](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/actualFormatProjection.ts:50)은 세 칸만 raw UPDATE하고 현재 digest와 NULL triple을 조건으로 건다. 이것은 입력 경합에 대한 안전장치이며 `updatedAt`도 건드리지 않는다. 비NULL의 다른 버전은 덮지 않는다.

그러나 **`transaction_read_only='off'`는 조회 요청에서 캐시 저장을 수행해도 실패하지 않는다는 보증이 아니다.** 제품 목록·availability의 기존 RepeatableRead 트랜잭션은 별도 READ ONLY 설정이 없으면 이 경로를 실행할 수 있다. 반면 [PGlite helper의 새 설정](/Users/pss/Desktop/creative/today-format-col/src/__tests__/helpers/builderSpeedPglite.ts:83)과 새 live 측정은 READ ONLY라 그 UPDATE를 건너뛴다. 그러므로 읽기 전용 parity/실측의 성공으로 운영에서 실행될 지연 writer까지 검증했다고 말할 수 없다.

구체적 시나리오는 두 GET이 같은 NULL 행을 snapshot에서 읽고, 한 GET이 캐시를 먼저 채운 뒤 다른 GET이 그 행을 UPDATE하려는 경우다. PostgreSQL RepeatableRead에서는 snapshot 이후 다른 거래가 갱신한 행의 UPDATE가 serialization failure로 중단될 수 있다. 현재 helper는 UPDATE 예외를 조회 결과와 분리하지 않으므로 새 NULL 행의 단순 조회가 동시성 때문에 실패할 수 있다. 이는 실행으로 재현한 버그 보고가 아니라 현재 코드와 격리 수준에 따른 위험 분석이다. [PostgreSQL 17 Repeatable Read](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-REPEATABLE-READ).

선택지는 두 가지다.

1. **권장:** 5절의 명시적 앱 writer helper로 채움을 옮겨 GET 안의 UPDATE를 제거한다. 기존 trigger와 reader fallback이 나머지 적재자/NULL을 안전하게 처리하도록 둔다.
2. 지연 저장을 유지한다면 READ ONLY/쓰기 허용 각각의 로컬 시험, 동시 채움/원문 변경 경합, SQL 실패 정책과 bounded retry를 추가한다. 같은 tx의 UPDATE 오류를 단순 catch한 뒤 나머지 읽기를 계속하는 것은 실패한 거래 상태 문제를 해결하지 못한다. 전체 거래 재시도 또는 읽기 거래 밖의 별도 best-effort CAS 중 하나를 명시적으로 설계해야 한다. 후자는 완료 전 비동기 작업의 수명·실패 처리까지 고려해야 해 단순성 이점이 줄어든다.

또한 `$executeRaw` 반환 수와 readback을 현재 코드가 확인하지 않는다. 이 helper의 true는 reader가 raw 경로를 사용했다는 의미로만 다루고 캐시 채움 성공으로 집계하지 않아야 한다. CAS 0행은 경쟁에 따른 정상 건너뜀일 수 있으므로, 쓰기 시도·실제 채움·건너뜀·실패를 구분하고 저장 성공을 주장할 때 최종 대응 증거를 남긴다.

### 9.3 순서와 비용의 추가 확인

새 [count SQL:305](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts:305)는 `row_number() OVER ()`와 `min(position)`으로 first-seen 순서를 유지하려 한다. 그 position 자체에 ORDER BY가 없으므로, 별도 Prisma baseline 스캔과 같은 순서를 보증하지는 않는다. 같은 snapshot이라도 조회 칼럼·조인·hash 조건에 따라 계획이 달라질 수 있다. 이는 7.3절의 미지정 순서 한계에 해당한다. 새 실측의 바이트 대응 결과로 현재 corpus의 일치 여부를 확인하되 일반적인 순서 보증으로 확대하지 않는다.

미유효 조회에서 validity가 WHERE와 여러 CASE에 반복되고, 그 뒤 집계·페이지에서도 digest를 다시 확인한다. 미유효 본문만 전송하는 점은 적절하지만 실제 hash 평가 횟수와 DB 내부 본문 읽기 비용은 별개다. NULL이 거의 없는 정상 corpus와 NULL/version mismatch가 많은 corpus를 나누어 측정해야 한다. 이 부분의 성능은 실행 근거 없이 빠르거나 느리다고 단정하지 않았다.
