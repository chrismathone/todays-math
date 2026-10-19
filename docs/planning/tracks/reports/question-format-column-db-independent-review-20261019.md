# 문항 형식 DB 단계 독립 읽기 전용 검토

검토일: 2026-10-19(KST). 대상: `/Users/pss/Desktop/creative/today-format-col`.

결론: 형식 저장은 **행별 원문 입력에 대응하는 파생 결과**로 다뤄야 한다. 적용 전 가장 중요한 관문은 ① strict 키의 제한된 증거와 원문 분류의 대응, ② 기존 정체 트리거까지 포함한 무효화 순서, ③ 여섯 입력과 기존 결과를 확인하는 백필 CAS, ④ 충돌·실패·재개 분모 보존, ⑤ 동일 스냅샷의 행별 분류 및 distinct-question 집계 대조다. 아래는 작성 중인 리드 구현에 대한 결함 확정이나 적용 승인이 아니라, 현재 코드에서 독립적으로 도출한 구현·검증 조건이다.

이 검토는 파일 정적 분석만 수행했다. DB 연결·질의·쓰기, PGlite 실행, 설치, 테스트 실행, Prisma 명령, Git 변경 명령, 추가 에이전트 실행을 하지 않았다. 작업트리와 공유 `node_modules`를 수정하지 않았고 산출물은 이 파일 하나다. PostgreSQL의 트리거·격리·CHECK 의미는 공식 문서로 확인했다. 운영 DB의 서버 버전, 현재 카탈로그, 실제 행수, 분류 분포, 불일치 수, 실행 계획과 성능은 **미확인**이다. 브리프의 118,166행 및 약 2초는 인용된 배경이며 이번 검토의 실측값이 아니다.

## 1. 검토 기준과 현재 구현

직접 읽은 요청 파일:

- [DB 단계 브리프](/Users/pss/Desktop/creative/today-format-col/docs/planning/tracks/brief-question-format-column-db-codex.md)
- [DB 초안](/Users/pss/Desktop/creative/today-format-col/prisma/drafts/20261018-builder-question-format.md)
- [provenance.ts](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/provenance.ts)
- [questionFormat.ts](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionFormat.ts)
- [questionProjection.ts](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionProjection.ts)
- [questionCountBuckets.ts](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountBuckets.ts)
- [questionCountSql.ts](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts)
- [schema.prisma](/Users/pss/Desktop/creative/today-format-col/prisma/schema.prisma)

증거 추적을 위해 `questionPairProof.ts`, `questionIdentity.ts`, `questionCountProjection.ts`, 실제 정체 DDL, 기존 백필·수리 도구, 자격·출처·family·정렬·캐시 구현과 관련 테스트도 읽었다. 기존 테스트는 증거의 범위를 확인하기 위해 읽었으며 실행하지 않았다.

현재 코드와 초안의 설명은 구분해야 한다. `questionCountProjection.ts:12–45`는 R2에서 복구한 메타데이터/본문 읽기 뒤 `questionBucketsFromRows`로 센다. 현재 `questionCountSql.ts:315–377`은 별도의 후보 페이지 SQL이다. 초안 26행 이하의 `GROUPING SETS` 설명을 곧바로 현행 집계 구현이라고 간주하면 잘못된 대조 대상을 고르게 된다. `questionProjection.ts:66–93`도 모든 행에 항상 본문 파서를 호출하지 않고, 빠른 판정이 NULL인 행만 본문을 읽는다.

새 칸·트리거·인덱스만 추가하는 DB 단계에서는 현행 독자가 새 칸을 사용하지 않는다. 따라서 이 단계의 목표는 안전한 저장 기반과 대응 검증이며, DB 변경만으로 제품 응답시간이 줄었다고 보고할 근거는 없다.

## 2. 분류 입력 전체와 digest 계약

`provenance.ts:132–147,247–288,360–374`와 `questionFormat.ts:13–23`에서 확인한 입력은 다음과 같다.

| 입력 | 실제 사용 | 빠뜨리기 쉬운 조건 |
|---|---|---|
| `content` | `parseProblemContent(content).choices.length` | 줄바꿈, 수식 마스킹, 원문 정규화, inline 보기 보정, 빈 보기 제거·중복 제거가 개입한다. 보기 마커 정규식 하나로 대체할 수 없다. |
| `answer` | `ANSWER_CIRCLED_CLASS`의 원문자가 **어디든 포함**되는지 | `^[①-⑤]$`가 아니다. `➀`, `❶`, `⓵`, 21–50 등의 계열도 포함한다. 숫자 `1`과 원문자 `①`는 다르다. |
| `questionType` | `단답형`·`서술형`의 명시값과 빈 값 여부 | `객관식`만 적혀 있다고 객관식이 되지 않는다. NULL·빈 문자열과 공백 문자열도 무조건 같지 않다. |
| `problemType` | `!questionType && problemType === '서술형'` | `questionType`과 다른 축이다. 명시 형식 및 엔진 분기의 우선순위 뒤에서만 작동한다. |
| `familyKey` | 원문이 `elem:`·`mid:`로 시작하는지 | 분류 함수는 trim·family 별칭 정규화를 하지 않는다. `' mid:x'`와 `'mid:x'`를 합치면 판정이 바뀔 수 있다. |
| `questionGroupKey` | strict v1 키 + `questionType === '객관식'`인 빠른 증거 경로 | 원문 분류 자체의 다섯 입력에는 없지만 이 경로를 저장에 쓰면 반드시 digest·CAS·무효화에 포함한다. |

현재 분류 순서는 다음과 같다. 주석의 요약보다 함수 본문의 우선순위가 정확한 계약이다.

1. 파서 보기 수가 2 이상이고 정답에 원문자가 있으면 `multiple_choice`다. 이 경우 명시 `단답형`·`서술형`도 앞 규칙을 이기지 못한다.
2. 보기 0개이고 정답에 원문자가 없으면 명시 `단답형` → 명시 `서술형` → 엔진 family → 빈 `questionType` + `problemType='서술형'` → `unknown` 순서다.
3. 나머지 어긋난 조합에서도 명시 `단답형`·`서술형`은 각각 살아남는다. 그 외는 `unknown`이다. 엔진 family를 모든 조합의 단답형 근거로 확대하면 안 된다.

`questionFormatWithoutContent`가 반환하는 NULL은 **본문 없이는 결정 불가**다. 반면 반환값 `unknown`은 **본문을 봐도 이 증거로는 unknown**이라는 확정 결과다. NULL과 `unknown`을 같은 미처리 상태로 다루면 불필요한 재계산이나 잘못된 승격이 생긴다.

`parseProblemContent.ts:456–482`에는 `normalizeMathgenText`, 수식 구간 정규화와 보기 보정이 연결된다. 정답 원문자 목록은 `math/circledNumber.ts:42–78`, 엔진 접두사는 `provenance.ts:169–176`이 정본이다. **규칙 버전은 최상위 함수뿐 아니라 이러한 의존 규칙, strict 증거 정책 및 digest 직렬화 계약의 변경도 구분해야 한다.** 같은 입력 digest라도 파서가 달라지면 결과가 달라질 수 있다.

권장 digest 조건:

- 고정 필드 순서·고정 직렬화·UTF-8·해시 알고리즘을 명시하고, 여섯 입력을 동일한 행/스냅샷에서 읽어 계산한다. DB에 없는 옵셔널 값을 임의로 누락하지 않는다.
- '정규화'는 직렬화의 결정성을 뜻하도록 제한한다. 원문을 무조건 trim, NFKC 변환, 공백 병합하거나 보기 수만 해시하지 않는다. NULL/빈 문자열 구별을 보존하는 편이 트리거의 실제 변경 감지와 대응하기 쉽다.
- SHA-256이라면 형식·길이를 명시한다. 형식값·버전·digest의 세 칸은 동일 계산의 한 묶음이다.
- 기존 결과 칸 자체는 입력 digest에 넣지 않는다. 자기 값을 바꿀 때 digest가 다시 달라지는 순환을 만들면 재개 판단이 깨진다.
- 원문 없이 정해지는 행도 '판정에 이번에는 필요 없었다'는 이유로 입력을 빼지 않는다. 초안은 원문 및 증거 입력 전체에 대응하는 digest를 요구한다.
- 형식과 무관한 출처·책·단원·검수 상태를 새 형식의 의미로 합치지 않는다. 다만 이들이 **기존 정체 트리거를 통해 키를 지우면**, 여섯째 입력이 간접 변경된 것이다.

## 3. strict questionGroupKey가 증명하는 것과 못 하는 것

근거: `questionPairProof.ts:68–150`, `questionFormat.ts:8–23`, `supabase/migrations/20261018063016_question_group_identity.sql:1–3,59–87`.

현재 빠른 경로는 정확히 `/^q:v1:[a-f0-9]{64}$/`와 `questionType === '객관식'`일 때 `classifyFormatWithChoices(5, row)`를 호출한다. 키만으로 무조건 객관식을 반환하는 함수가 아니다. 정답에 원문자가 없으면 여전히 `unknown`이 될 수 있다.

strict proof는 아무 객관식의 일반 인증이 아니다. 지원되는 엔진 externalId 문법의 동일 tuple, 서로 다른 ID 두 행, 단답/객관식 한 쌍, 동일한 지정 메타데이터·해설·그림, 정확한 stem+개행+①~⑤ 꼬리, 한 글자의 정답 번호와 실제 선택지/단답 정답의 대응을 확인하는 **충분조건**이다. 네이티브 객관식·서술형 형제나 대수적으로 동치인 답을 모두 증명하지 않는다.

특히 키 해시는 `questionPairProof.ts:145`에서 **external tuple**로 만든다. content/answer의 해시가 아니다. 정규식 일치도 실제 proof가 수행됐다는 암호학적 검증이 아니다. 증거의 유효성은 보호된 키 작성 경로와 입력 변경 시 무효화에 의존한다. 이 전제를 생략하고 '64자리 해시가 있으니 원문까지 검증됨'이라고 쓰면 안 된다.

필수 구분:

- `q:v1:` strict 키, 형식이 다른 미래 버전, 대문자 hex·공백·손상 키, NULL은 빠른 증거로서 다르게 처리한다. `startsWith('q:')`로 확대하지 않는다.
- 같은 키의 다른 표현이 객관식이라는 이유로 이 행을 객관식으로 채우지 않는다. 저장은 행별 실제 표현의 형식이다.
- group key가 NULL이 됐다고 원문 분류를 무조건 `unknown`으로 저장하지 않는다. 기존 파서로 돌아가면 객관식일 수도 있다.
- 정체 트리거는 바뀐 **해당 행**의 키를 지운다. 남아 있는 형제가 당장 두 행 쌍을 이루지 않는다는 것만으로 기존 증거를 자동 폐기하는 정책도 현행 계약에 없다. 반대로 남은 형제의 키를 편집된 행에 복사해서는 안 된다.
- 백필은 보유한 키를 소비할 뿐, proof 없이 새 키를 생성하거나 키·family·externalId를 보정하는 작업이 아니다.

대조에는 세 값을 분리해 남기는 편이 안전하다: **원문 정본 `classifyFormat(row)` / 현행 유효 판정 `questionFormatWithoutContent(row) ?? classifyFormat(row)` / 저장 예정값**. 유효하게 남은 strict 증거에서는 이들이 대응하는지 확인하되, 어긋남을 무시하고 빠른 값을 우선 저장해서 '불일치 0'으로 만들지 않는다. 반대로 정본만 계산한 뒤 현행 빠른 경로와의 차이를 생략해서도 안 된다. 불일치 ID·증거·원문 digest를 별도 보고하고 원인을 판정해야 한다.

## 4. 트리거·CHECK·구버전 호환성

### 4.1 간접 무효화와 실행 순서 — 높은 우선순위

기존 정체 트리거는 content/answer/family/problemType/questionType 외에도 unit/source/difficulty/origin/sourceMaterial/solution/그림/externalId 변경 시 `NEW.question_group_key := NULL`로 만든다(정체 DDL 66–78행).

재현해야 할 핵심 상황은 다음과 같다.

1. strict 키와 새 결과 세 칸이 모두 채워진 행이 있다.
2. 구버전 앱이 `solution`만 UPDATE한다.
3. 정체 트리거는 키를 NULL로 지운다.
4. 새 트리거가 먼저 실행됐거나 `UPDATE OF content, answer, question_type, problem_type, family_key, question_group_key`로만 달렸다면, SQL SET 목록에 키가 없어 그 변화를 놓칠 수 있다.
5. 결과 세 칸이 남으면 digest와 현재 증거가 어긋난다. SQL 집계가 비NULL 형식만 믿으면 오래된 값을 사용한다.

PostgreSQL은 같은 종류·이벤트의 트리거를 이름 순서로 실행하고, `UPDATE OF`는 다른 BEFORE 트리거가 바꾼 칸을 SET 대상처럼 취급하지 않는다. [공식 CREATE TRIGGER 문서](https://www.postgresql.org/docs/current/sql-createtrigger.html)

권장안은 기존 정체 무효화가 끝난 뒤의 NEW를 보는 `BEFORE UPDATE FOR EACH ROW` 트리거에서 여섯 입력을 `ROW(OLD...) IS DISTINCT FROM ROW(NEW...)`로 비교하는 것이다. 이름만 우연히 나중이게 하지 말고 실제 기존 트리거와의 순서·의존성을 문서화하고 로컬 시험으로 고정한다. 더 넓은 정체 입력 집합을 직접 비교하는 설계도 가능하지만, 중복 의존 목록이 뒤처지지 않을 보장이 필요하다. 단순히 `problem_actual_format...`이라는 이름을 붙이면 `problem_question_group_invalidate`보다 먼저 실행될 수 있다.

입력 한 칸이라도 실제 바뀌면 새 형식·버전·digest를 **모두 NULL로** 만든다. 같은 UPDATE에서 작성자가 결과도 제출했어도 무효화를 우선해야 '구버전 writer 우회 불가'를 지킨다. 이후 새 원문에 대해 별도 계산/쓰기한다. 무관한 변경, 동일값 대입 및 결과 세 칸만 갱신하는 백필은 유지되어야 한다. 무조건 모든 UPDATE에서 초기화하면 백필 자체가 성공하지 못한다.

### 4.2 무효화 시험에서 빠뜨리지 않을 항목

| 상황 | 기대 결과 |
|---|---|
| content·answer·questionType·problemType·familyKey·group key 각각 변경 | 결과 세 칸 동시 NULL |
| NULL→값, 값→NULL, NULL↔빈 문자열 | 비교가 NULL 때문에 UNKNOWN으로 빠지지 않음 |
| group key만 변경/제거/재부여 | 이전 형식 캐시 무효화 |
| 해설·그림·unit·source·difficulty·externalId 등 정체 입력 변경, 기존 키가 있음 | 기존 트리거의 키 제거 이후 결과 세 칸도 NULL |
| 위의 간접 입력 변경, 기존 키가 이미 NULL임 | 다섯 원문 입력에 변화가 없다면 형식 결과는 유지 가능; 과도한 무효화 여부를 의도대로 시험 |
| reviewStatus·pool·directUseAllowed만 변경 | 형식 결과 유지, 자격·보유량은 현재 상태로 별도 계산 |
| 동일 입력값 재대입, 타 행만 변경 | 해당 행 결과가 불필요하게 지워지지 않음 |
| 원문 변경과 오래된 결과를 같은 UPDATE로 제출 | 결과 세 칸 모두 NULL |
| 구버전 INSERT(새 칸 생략), 구버전 UPDATE(새 칸 모름) | 정상 동작; 새 INSERT는 세 칸 NULL, 입력 UPDATE는 무효화 |
| INSERT ON CONFLICT DO UPDATE | INSERT/UPDATE 양 경로의 의도와 결과 확인 |

DB 트리거가 TypeScript 파서 결과를 검증하는 것은 아니다. 형식·버전·digest 세 칸만 위조해 쓰는 경로와 새 INSERT에 임의 결과를 실어 보내는 경로는 무효화만으로 막히지 않는다. 보호된 서버 writer/운영자 경계와 컬럼 권한을 유지해야 한다. `anon`/`authenticated`의 기존 열 단위 쓰기 권한을 테이블 전체 GRANT로 되돌리지 않는다. RLS나 기존 자격·격리 트리거도 완화하지 않는다. 실제 권한 카탈로그는 이번에 확인하지 않았다.

### 4.3 NULL·unknown·유효한 묶음

초안대로 세 칸 모두 NULL 허용·기본값 없음이 안전한 출발점이다. `unknown`은 계산 완료된 합법 값이며 `short_answer` 등의 기본값을 두면 안 된다. 형식 CHECK는 정확한 네 값만 허용한다.

형식 CHECK 하나만으로는 `형식 있음 + 버전 없음` 등의 부분 결과를 막지 못한다. CHECK는 식이 NULL이어도 통과하므로, 묶음 제약을 넣는다면 '전부 NULL 또는 전부 비NULL'을 `IS NULL`/`IS NOT NULL`로 명시해야 한다. 구 버전 결과는 저장 자체를 막기보다 reader가 버전 불일치로 탈락시켜 다시 계산할 수 있어야 한다. digest 길이·문법 및 버전 타입의 검증도 별도로 정한다. [공식 CHECK 문서](https://www.postgresql.org/docs/current/ddl-constraints.html)

향후 reader의 신뢰 조건은 `format != NULL` 하나가 아니다. **세 칸 존재 + 지원 규칙 버전 + 현재 입력 digest 대응**이 맞아야 한다. NULL·부분 결과·버전 불일치·digest 불일치는 정본으로 돌아가고, 유효한 `unknown`은 그대로 unknown이다. 단순 `COALESCE(p.actual_format, fallback)`만으로는 버전/digest 불일치를 처리하지 못한다.

### 4.4 칸 추가만으로도 달라지는 기존 전체 행 도구

- `scripts/import/question-group-backfill.ts:90–93,137–139,297–318`은 `to_jsonb(p)`에서 group key만 제외해 digest/CAS를 만든다. 새 칸이 NULL인 단계에서도 전체 JSON 모양이 달라진다. **DDL 전에 준비한 기존 정체 백필 manifest는 그대로 재사용할 수 없다.** 새 형식 백필 후에도 바뀐 전체 행에 맞춰 재준비해야 한다.
- `scripts/import/protected-question-maintenance.ts:56–65,205–223`은 수리 후 expected row에서 group key만 NULL로 바꾸고 전체 행 readback을 대조한다. 이미 새 세 칸이 채워진 행의 원문을 수리하면 새 트리거가 세 칸을 지우지만 expected row에는 예전 값이 남으므로, 현재 코드로는 readback 오류가 날 가능성이 구체적으로 보인다. **기존 수리 도구의 '채워진 행' 호환성도 별도 시험/운영 순서 조정이 필요하다.** 빈 새 칸만 있는 DDL 직후 시험으로 이를 통과했다고 할 수 없다.
- `questionSelection.ts:11–35,58–63`은 `updatedAt`을 revision에 포함한다. 결과 세 칸만 채우면서 `updated_at`까지 바꾸면 본문이 그대로인 기존 담기 선택이 409를 낼 수 있다. 백필은 허용된 세 칸만 쓰고 원문·키·코드·자격·updated_at을 보존하는 것이 맞다. Prisma의 자동 `@updatedAt` 경로를 그대로 쓰는지 확인해야 한다.

이는 일반 reader의 무중단 여부와 별개다. DB 단계의 '운영 코드가 깨지지 않음' 보고에는 적용 전/칸 추가 후/일부 채움 후/입력 변경 후를 구분해야 한다.

## 5. 백필 CAS·동시 변경·재시도·재개

### 5.1 계산과 UPDATE 사이를 보호하는 조건

트리거만으로 SELECT→계산→UPDATE 사이의 경합은 막을 수 없다. A가 old content로 계산한 뒤 B가 원문을 변경해 트리거가 NULL로 지워도, A가 ID만 조건으로 결과를 쓰면 오래된 형식이 다시 채워진다.

필수 CAS는 다음 의미여야 한다.

- ID 일치, 읽었던 여섯 원문/증거 입력의 **현재 값과의 NULL-safe 일치**, 그리고 읽었던 기존 결과 세 칸의 일치 또는 명시된 덮어쓰기 정책을 UPDATE 조건에 둔다.
- 저장된 `actual_format_digest`와의 비교만으로 현재 입력을 확인했다고 보지 않는다. 원문 변경 뒤 NULL인 칸을 기준으로 삼으면 방어가 되지 않는다. `updated_at`도 직접 SQL 변경까지 포괄하는 원문 CAS를 대신하지 못한다.
- 원문 전체를 조건으로 비교하거나, DB에서 재계산하는 digest가 TS 직렬화와 정확히 같음을 검증한 대안을 쓴다. '컬럼을 `||`로 이어 해시'하면 NULL·구분자·타입 경계가 달라질 수 있다.
- 결과 세 칸만 SET한다. 원문을 스냅샷 값으로 다시 SET하면 타인의 수정을 되돌릴 수 있다.
- 이미 다른 실행이 새 규칙으로 채운 결과를 옛 규칙 실행이 덮어쓰지 않는다. 결과 묶음 CAS와 규칙 버전 정책이 이 경합을 다뤄야 한다.
- UPDATE의 반환 ID뿐 아니라 최종 결과 세 칸/입력 대응을 확인한다. 트리거가 지운 행을 'affected 1'만 보고 완료 처리하지 않는다.

PostgreSQL Read Committed의 UPDATE는 대기한 동시 수정이 커밋되면 갱신된 행에서 WHERE를 재평가한다. 이 동작을 활용하려면 원문 조건이 **실제 UPDATE WHERE**에 들어 있어야 한다. 앞서 별도로 SELECT해 맞았다는 확인만으로는 부족하다. [공식 격리 문서](https://www.postgresql.org/docs/current/transaction-iso.html)

직렬화 오류·교착·잠금 시간초과 시에는 짧은 트랜잭션을 새로 열어 읽기/계산부터 다시 시도한다. 같은 오래된 계산값을 재전송하지 않는다. 정렬된 ID 순서로 잠그고 계산 때문에 전수 행 잠금을 오래 유지하지 않는다. 행이 삭제되거나 대상 범위를 벗어난 경우도 CAS 충돌/제외로 분모에 기록한다.

### 5.2 재개와 실패 표시의 함정

- `WHERE actual_format IS NULL OFFSET n`처럼 처리에 따라 줄어드는 집합에 OFFSET을 올리면 행을 건너뛴다. 안정된 keyset이나 고정 대상 ID 원장을 사용한다.
- ID 커서만 저장하면 이미 지나간 행이 다시 NULL이 되는 경우를 놓친다. UUID는 삽입 시간 순서가 아니므로, 뒤늦게 들어온 더 작은 UUID도 놓칠 수 있다. 시작 시점 대상 집합과 완료 후 재스캔/다음 실행의 책임을 명시한다.
- 미계산 NULL뿐 아니라 오래된 버전·부분 결과·입력 digest 불일치가 재계산 대상이다. 유효한 `unknown`은 다시 채울 NULL과 다르다.
- CAS 0행은 성공이 아니다. 최신 입력을 다시 읽어 재계산하거나 충돌 원장에 남긴다. 커서가 충돌 행을 영구히 지나가게 하지 않는다.
- 배치 일부 실패 시 어느 행까지 커밋됐는지 모르는 상태를 성공으로 기록하지 않는다. 원장을 먼저 기록하고, 커밋 결과가 불명확하면 현재 입력+결과 묶음을 읽어 대조해 복구한다.
- 프로세스가 커밋 직후 영수증 기록 전에 죽는 경우를 포함한다. 재시작 시 이미 정확히 채워진 행은 '이미 유효'로 인정할 수 있지만 다른 실행/다른 입력의 결과를 자기 성공으로 재해석하지 않는다.
- `18-qa-playbook.md:303–317`은 실패 시 시도 횟수 기록, 3회 실패 후 포기, 성공 시 실패 표시 해제, 최종 포기 수 별도 보고를 요구한다. 충돌·일시 실패·영구 오류를 구분하고 재시도는 유한하게 한다.
- 분모를 `검사 대상 = 이미 유효 + 실제 성공 + 충돌/다음 재시도 + 삭제/범위 제외 + 최종 실패`처럼 배타적으로 보존한다. 계획 수·읽은 수·고유 ID 수·분류 수·쓰기 성공 수·실패 수가 설명 없이 줄어들면 완료가 아니다.
- 파서 예외나 필수 입력 누락은 정상 `unknown`으로 삼키지 않는다. unknown 수와 실패 수를 별도 보고한다. 재개 파일의 규칙 버전·digest 계약·코드 지문이 달라지면 이전 계산값을 그대로 적용하지 않는다.
- 배치의 ID 중복과 바인딩 수/본문 크기를 제한한다. 배열 순서로 결과를 zip하지 않고 ID로 대응시켜야 원문과 다른 행의 digest를 붙이는 실수를 피할 수 있다.

### 5.3 드라이런과 적용 경계

기본 드라이런은 SELECT만 수행하는 경로여야 한다. UPDATE 후 ROLLBACK은 읽기 전용 드라이런을 대신하지 못한다. 적용은 `ALLOW_SHARED_IMPORT=1`과 명시적 `--apply`가 모두 있어야 열리고, revert 등의 쓰기 분기도 같은 경계를 지난다. 이번 독립 검토자는 드라이런도 DB 접근이므로 실행하지 않았다.

DB 먼저인 만큼 **새 칸이 아직 없는 DB에서도 드라이런/집계 대응 검토가 가능한지** 확인해야 한다. 기존 입력만 읽어 저장 예정값을 메모리에서 만들 수 있다. 무조건 새 칸을 SELECT하거나 새 Prisma client를 요구하면 DDL 전 독립 검증이 막힌다. 칸 존재 여부는 명시적 읽기 전용 preflight로 판단하고 미적용/일부 적용/완료를 혼동하지 않는다.

원문, 정답, 비밀 환경값을 일반 로그에 쏟지 않는다. 총계와 ID·입력 digest·불일치 이유는 구분해 기록하고, 원문 대조 표본이 필요하면 별도의 검토 자료로 제한한다. 예상 쓰기 시간은 읽기·파서 시간과 분리하며 실제 쓰기를 안 한 추정임을 표시한다.

## 6. '백필로 센 수 = 현행 전수 판정 수'의 정확한 범위

### 6.1 같은 스냅샷과 독립 대조

실제 데이터 대조는 하나의 Repeatable Read 읽기 전용 스냅샷이나 거기서 얻은 고정 입력 자료로 수행해야 한다. 원문·메타데이터·정체·자격·unit·material/book 관계 모두가 대응해야 한다. 단순히 '한 트랜잭션'이라고 해도 기본 Read Committed라면 여러 SELECT가 다른 상태를 볼 수 있다. [공식 격리 문서](https://www.postgresql.org/docs/current/transaction-iso.html)

현행 `bankSourceQuestions.ts:115–262,279–365`도 RepeatableRead로 원문과 여러 facet을 맞춘다. 검토용 양쪽 집계가 서로 다른 시각의 HTTP 캐시/별도 DB 질의에서 나온 수라면 불일치 원인이 코드인지 동시 변경인지 가를 수 없다.

필수 증거는 다음 두 층이다.

1. 모든 대상 ID에서 원문 digest와 저장 예정 형식이 맞는지 비교한다. **행별 불일치 0**을 확인한다. 형식별 총계만 같으면 서로 반대 방향으로 오분류된 행이 상쇄될 수 있다.
2. 그 고정 입력에 대해 현행 reader의 정체·자격·합집합 의미와 저장 예정값을 소비하는 집계를 각각 적용해 모든 비교 키의 결과를 대조한다. 양쪽에 같은 새 변환 함수를 넣고 같은 결과가 나왔다는 것만으로 기존 동작과의 대응을 입증하지 않는다.

실제 적용 뒤에는 저장된 세 칸과 그 시점의 실제 원문을 다시 읽어 검증해야 한다. 적용 전 드라이런은 '예정값 대조'이지 DB readback 검증이 아니다. 새 규칙으로 생긴 NULL/불일치/동시 변경 수까지 보고해야 한다.

### 6.2 question 정체·형식·자격

- 정체는 `questionGroupKey ?? ('row:' + id)`다(`questionIdentity.ts:1–18`, `questionCountSql.ts:354`). NULL 정체끼리 묶거나 `COUNT(DISTINCT question_group_key)`만 쓰면 독립 레거시 행이 빠진다.
- 빈 문자열·손상 키는 빠른 **형식 증거**로 인정되지 않지만, 현행 정체 함수의 `??`는 빈 문자열을 NULL로 바꾸지 않는다. 분류 증거 검증과 정체를 혼동해 조용히 키를 정리하면 현행 집계와 달라진다. 발견 시 별도 보고한다.
- 같은 question에 단답/객관식 표현이 둘 다 있으면 전체 문항 수는 1이고 각 형식 가용량에는 각각 1이 들어갈 수 있다. **형식별 수의 합이 전체와 같아야 한다는 검증은 틀리다.**
- 같은 행에서 형식 조건과 자격 조건을 모두 만족해야 '가용'이다. 한 형제에만 객관식 형식이 있고 다른 형제만 출제 자격을 갖췄다는 식으로 서로의 조건을 빌릴 수 없다.
- `questionProjection.ts:91–99`는 분류 `unknown`을 API의 `actualFormat: null`로 바꾸고 available=false로 만든다. 새 DB의 `unknown` 문자열을 그대로 공용 bucket 키로 넘기면 현행 응답에 없는 unknown facet이 생길 수 있다. 미계산 DB NULL과 API 표현 NULL도 별개다.
- 보유 held는 해당 범위의 문항 합집합이며 unknown/잠금도 포함할 수 있다. available은 알려진 형식과 `problemIneligibleCode(row) === null`을 함께 충족한 question 합집합이다.
- 출제 자격은 shared·approved·directUseAllowed·`answer !== MISSING_ANSWER`다(`problemEligibility.ts:32–43,83–90`). 빈 정답을 추가로 차단하는 새 규칙, private 공개, unknown 승격을 이번 형식 백필에 끼워 넣지 않는다.

### 6.3 범위·출처·family·응답 전체

대조 키는 적어도 `all`, 세 형식, unit, grade, difficulty, source group, material, book, `(book, kind)`와 필요한 family 용량이다. 각 키의 held/available을 모두 비교하고, 현재 코드가 사용하는 `rowCount`도 별도 구분한다. `questionCountBuckets.ts:104–115`의 rowCount는 가용 실제 표현 행수여서 distinct-question 수와 같지 않다.

- source는 provenance 라벨 추정이 아니라 `BANK_SOURCE_GROUP_SOURCES`를 따른다. 현행 engine은 `source='manual'` 전체, other는 transformed와 ai_generated의 합집합이다(`bankSource.contract.ts:21–46`).
- 출처·자료·책·종류의 상위 수량은 하위 숫자의 단순 덧셈 대신 question ID의 합집합으로 센다. 자료 없는 교과서 행은 교과서 합에 남되 책/종류에 억지 배정하지 않는다. 관계 없는 행이 JOIN 때문에 전체 보유량에서 사라지지 않아야 한다.
- grade는 scope의 `unit.grade`와 책 목록의 `source_book.grade`를 목적에 맞게 구분한다. material kind/grade의 빈 문자열을 truthy 검사로 NULL처럼 버리면 기존 JS bucket과 달라질 수 있다.
- facet은 자기 축만 해제한 범위에서 계산한다. 선택 형식이 있어도 `formatAvailable`은 `mainAll`에서 세 형식을 각각 센다(`bankSourceQuestions.ts:143–152,209–214`). 단일 WHERE의 전체 수만 비교해서는 출처 고르기 대응이 입증되지 않는다.
- family 용량은 question 정체와 다른 축이다. `familyIdOf`는 단원+trim된 canonical family 별칭을 쓰며, NULL·빈 값·공백 family는 행별 `solo:id`다(`generator/familyKey.ts:48–51`). 이 정규화를 형식 분류용 raw familyKey에 역으로 적용하면 안 된다.
- unitFamilies는 가용 행의 family 합집합이고 가용 question 수로 상한을 둔다(`bankSourceQuestions.ts:194–227`). 원문 raw `(unit,family)` GROUP BY만으로 대체하면 별칭·blank family에서 달라진다.
- 미존재/0 bucket, key NULL, 빈 key, subtotal NULL을 구분한다. 향후 GROUPING SETS를 쓰면 subtotal 판별에 GROUPING 표식을 사용하고 NULL 의미를 임의 치환하지 않는다.
- 최근 출제·명시적 제외는 같은 question의 표현 전체를 제외하되 family 전체 제외와 구분한다. 관련 계정/지점 의존 결과를 공용 캐시에 섞지 않는다. 기본·범위·출처·형식뿐 아니라 이 제외 경로의 표본도 대조한다.

페이지는 그룹의 첫 등장 위치로 순서를 정하고, 대표 행은 조건을 만족하는 첫 표현으로 따로 고른다(`questionProjection.ts:104–118`, `questionCountSql.ts:311–360`). 형식·자격을 먼저 전역 필터해 그 뒤 그룹 순서를 새로 만들거나 먼저 행 LIMIT를 걸면 페이지 경계가 달라질 수 있다. 수량이 같아도 대표 ID·정렬·첫/중간/끝 페이지의 중복·누락이 달라질 수 있으므로 로컬 회귀 자료에 포함해야 한다.

API 대조는 cache 우회를 명시한다. `bankReadCache.ts:4–5,22–37`의 namespace/epoch/15초 TTL 때문에 별도 프로세스의 직접 쓰기 직후 HTTP 비교는 오래된 수를 볼 수 있다. 실제 적용 뒤에는 epoch 교체 또는 모든 관련 프로세스 캐시 수렴을 확인하는 기존 운영 계약을 따른다.

## 7. 마이그레이션·인덱스에서 놓치기 쉬운 조건

### 7.1 DDL과 배포 순서

- 새 칸은 nullable, 기본값 없음이며 기존 enum·필수 칸·기존 쓰기 입력을 바꾸지 않는다. SQL의 snake_case 이름과 schema의 `@map`·nullable·타입·인덱스 이름을 수동으로 맞춘다.
- **기존 정체 DDL은 `prisma/migrations`가 아니라 `supabase/migrations/20261018063016_question_group_identity.sql`에 있다.** 요청된 새 파일은 Prisma migration이다. 새 migration이 키 칸/정체 트리거 존재를 전제로 하면, Prisma 이력만 올린 빈 DB/테스트 DB에서도 성립하는지 의존성을 명시해야 한다. 미니 fixture에 미리 키를 만들어 둔 시험만으로 전체 migration 체인을 증명할 수 없다. 이미 적용된 이력을 임의 수정하거나 중복 DDL로 덮어서는 안 된다.
- 운영 테이블·정체 트리거·격리·권한 선행 조건이 예상과 다르면 조용히 일부만 적용하지 말고 실패시켜야 한다. `IF NOT EXISTS`는 다른 타입·다른 정의를 검증하지 않는다.
- DDL의 잠금 시간·문장 시간 제한과 실패 시 원자성을 정한다. '기존 SELECT 결과를 바꾸지 않음'과 '잠금 대기가 전혀 없음'은 다른 주장이다.
- 칸·트리거 설치 → 실제 카탈로그/기존 앱 호환성 확인 → 원문/digest 감사·집계 대응 → 승인된 백필 → 저장값 readback/집계 재대조 → reader/writer 전환 순서를 구분한다. 이번 독립 검토는 이 중 어떤 DB 단계도 실행하지 않았다.
- 공유 심볼릭 링크인 node_modules에서 Prisma 생성/설치/format을 실행해 배포 단계 문제를 우회하지 않는다. 기존 generated client가 모르는 칸은 필요한 운영자 SQL과 타입 경계를 명확히 처리한다.

### 7.2 인덱스의 목표 질의와 EXPLAIN

단독 `actual_format` 인덱스를 만들었다는 것만으로 집계/페이지가 빨라진다고 볼 수 없다. 네 값의 선택도, shared 풀·unit·sourceMaterial 범위, eligibility 및 유효 버전 조건, distinct 정체와 정렬을 같이 봐야 한다.

검토할 후보 조합은 다음과 같다. **이 표는 확정 DDL 권고가 아니라 EXPLAIN 비교 대상**이다.

| 질의 | 검토할 열/기존 구조 | 주의점 |
|---|---|---|
| unit 내 형식·가용량 | `(unit_id, actual_format, question_group_key)` 및 shared/자격 범위의 후보 | held에는 unknown/미계산 fallback도 남아야 한다. 가용 전용 부분 인덱스로 전체 보유를 대신하지 않는다. |
| 자료 내 형식/쪽 | `(source_material_id, actual_format, question_number, problem_code)` 계열 | 자료 우선 정렬이 실제 쓰이는 경로와 맞는지, 형식 무필터 때도 유효한지 확인한다. |
| 기본 은행 순서 | `Unit.orderIndex` JOIN + `problem_code` | 현재 정렬은 최신순이 아니다. schema 969행의 created_at 인덱스 주석만 보고 새 페이지 인덱스를 고르면 안 된다. `problemOrder.ts:88–95`와 `unifiedPreview.ts:300–306`이 현재 계약이다. |
| 전체·출처 집계 | pool/source/format + 정체·관계 열 | 전체 스캔이 더 나을 수 있다. 관계 JOIN 및 distinct 비용까지 설명한다. |
| 재개/미계산 스캔 | id와 NULL/구 버전 후보 | NULL 전용 부분 인덱스 하나가 digest 불일치까지 찾아 주지는 않는다. |

현재 SQL은 `COALESCE(question_group_key, 'row:' || id) COLLATE "C"`로 그룹 정체를 만든다. 원래 키 인덱스만으로 이 표현식의 집계·정렬 비용이 모두 사라진다고 주장하지 않는다. 현재 where compiler는 enum을 `::text`로 읽기도 하므로 인덱스/부분 조건과 실제 표현식의 대응도 확인해야 한다(`questionCountSql.ts:93–100`). 본문·정답 같은 큰 텍스트를 무조건 INCLUDE해 덮개 인덱스로 만드는 것은 피하고 필요한 열만 비교한다.

EXPLAIN 근거는 실제 실행될 SQL·바인딩·행 분포·통계 상태를 함께 남겨야 한다. 최소한 NULL만 있는 설치 직후/채워진 분포, 전체·좁은 unit·자료·선택 형식·무필터, held/available, 첫/후반 페이지를 구분한다. 로컬 복제 자료에서 ANALYZE 후 비교하는 계획은 로컬 증거이며 운영 계획/시간으로 바꿔 쓰지 않는다. shared DB에서 쓰기 질의를 EXPLAIN ANALYZE해 검증해서는 안 된다.

인덱스 생성 방식의 락·트랜잭션 제약도 선택해 기록한다. 일반 생성과 CONCURRENTLY를 상황 설명 없이 섞지 않고, 이번 DB 단계에 승인된 적용 절차 안에서 해결한다. 결과 칸을 갱신하는 백필의 인덱스 유지 비용·WAL·재시도 비용까지 고려하고, 118,166행 전수의 TS 처리 시간만으로 쓰기 시간을 확정하지 않는다.

## 8. 리드의 완료 증거에 포함할 최소 관문

- [ ] 여섯 입력 목록, 고정 digest 직렬화, 전체 파서/증거 정책의 규칙 버전이 문서·스크립트·트리거에서 일치한다.
- [ ] strict 키를 proof 없는 새 분류 규칙으로 확대하지 않고, 원문 정본·현행 유효 판정·저장 예정값의 행별 대응을 확인한다.
- [ ] 로컬에서 기존 정체 트리거와 새 트리거를 함께 적용해 직접·간접 입력 변경, 순서, NULL 전이, 같은 값, 결과만 갱신을 시험한다.
- [ ] nullable/CHECK/부분 결과 정책, 구버전 INSERT/UPDATE와 filled-row 수리 도구·revision 보존을 확인한다.
- [ ] 백필 UPDATE가 현재 여섯 입력 및 기존 결과를 CAS하고, 0행/트리거 무효화를 성공으로 세지 않는다.
- [ ] 동시 변경, 커서 뒤쪽 재무효화, 커밋 직후 중단, 재시도 3회·최종 실패·재개가 분모를 보존한다.
- [ ] 공유 DB의 읽기 전용 고정 스냅샷에서 예정값의 행별 비교 및 범위/출처/형식/관계별 distinct-question 대조가 0이며, 미검증 범위를 별도로 밝힌다.
- [ ] 실제 백필 적용 후 readback과 재대조가 필요한 후속 단계임을 드라이런 보고와 구별한다.
- [ ] 인덱스 계획은 현행 정렬·정체·가용 조건에 대응하고 로컬/운영 증거와 예상/실측을 구별한다.
- [ ] 기존 supabase 정체 DDL과 새 Prisma migration의 선행 관계를 명시하고 공유 generated client를 수정하지 않는다.

## 9. 검토 지문

리드 작업트리 HEAD 관찰값: `b353aff927677b475ff167137214898879ac27c5` (`2026-10-19T12:10:01+09:00`). 작성 중 작업트리는 바뀔 수 있으므로 이 보고는 아래 파일 바이트를 기준으로 한다. 지문 기록 시각: `2026-10-19T13:18:23.844993+09:00`.

```text
1107909bba6bee5e4c76e1413d0ccd20f634870f401d73ff4028203a1b2167d5  docs/planning/tracks/brief-question-format-column-db-codex.md
67b21a39993e3f758ba142ac70cf7ef612ec3a6a3f7c67edbd6c3fc718ebb699  prisma/drafts/20261018-builder-question-format.md
c94ac0e0ee3520d5c78e97c42a49501443518d13d17dab3cc116cb68d5fe3a18  src/lib/problem/provenance.ts
cbe9cdd3825a6f6174433941819279b4201a81da24cd5716d8d213cbe40fa700  src/lib/problem/questionFormat.ts
32bc0a4841f4a41c5e62386b6bb0c386a148cee58b967aab01260a8ee5c5c9b2  src/lib/problem/questionProjection.ts
1f1181c78ecca9f0d48abe2ced0ca063a520553125691ba712de790cd69c825e  src/lib/problem/questionCountBuckets.ts
89b63ddcd64e9e4cb5f4d806caa52ea1ad46e8142951ba5b8fbbee071df7d4bd  src/lib/problem/questionCountSql.ts
aa55a9735f65c1271312249a1ebe7785db121cc9372ce744b4f1a616c03e14ec  prisma/schema.prisma
```

운영 원문/digest 실측, 실제 DDL 실행·카탈로그 감사, 로컬 PGlite 결과, 백필 드라이런, 실제 집계 불일치 0 및 EXPLAIN은 리드가 별도로 확보해야 할 증거다. 이 정적 검토에서 그 결과를 대신 주장하지 않는다.
