# 시험지 집계용 실제 형식 — 승인 전 DB 초안

2026-10-18. **미적용**. schema.prisma·마이그레이션·공유 DB·생성 클라이언트를 변경하지 않았다.
원장님 승인 후 DB 먼저, 그 뒤 서버 reader/writer를 변경한다.

현재 `questionType`은 실제 형식이 아니다. `classifyFormat`은 본문 파서의 보기 수,
정답의 원문자 여부, questionType, problemType, familyKey를 함께 본다. strict v1
questionGroupKey는 제한된 객관식 증거만 제공한다. 형식을 임의로 추정해 저장하지 않는다.

제안하는 내부 칸(최종 이름·DDL·인덱스는 별도 검토):

- `actual_format`: multiple_choice / short_answer / descriptive / unknown. NULL은 아직 미계산.
- `actual_format_version`: 사용한 파서·형식 규칙의 버전.
- `actual_format_digest`: content, answer, questionType, problemType, familyKey 및 증거에 사용하는 questionGroupKey의 정규화된 digest.

저장자는 기존 TypeScript 정본 `classifyFormat`으로 계산하고 실제 원문/digest 일치를 검증한다.
해당 입력 중 하나라도 바뀌면 트리거가 세 칸을 원자적으로 무효화한다. 구버전 저장자도
이 무효화를 우회하지 못해야 한다. NULL·버전 불일치·digest 불일치는 기존 정확 판정으로
되돌아가며 unknown을 단답형/서술형으로 바꾸지 않는다. 공개 풀·출제 자격은 별도 기존 관문이다.

승인 후 검증 순서: 로컬 PGlite에서 트리거/NULL/변경/구버전 writer 검증 → 실제 데이터의
읽기 전용 원문/digest 대응 감사 → 승인된 백필 → grouped distinct question 집계의
전후 전수 대응 → 필요한 인덱스 EXPLAIN → 운영 반영. 정체 NULL은 행마다 한 문항,
family NULL/빈 값은 행마다 한 갈래, source/book/kind 합은 question의 합집합을 유지한다.

그전의 빠른 경로는 DB의 `COUNT(DISTINCT …)` · `GROUPING SETS`로 문항 합집합을
끝까지 세고 제품 응답에는 항목별 수를 반환한다. 내부 조회는 본문 판정이
필요한 ID만 먼저 모아 인덱스로 500건씩 읽으며, 쪽마다 전량을 다시 판정하지 않는다.
본문 없이 정해지는 형식 SQL은 기존
`questionFormatWithoutContent`에 증거 조합을 넣어 만든 결정 트리다. 독립된
새 판정 규칙이나 정답/해설 전송을 추가하지 않는다. 본문이 꼭 필요한 행만
500행씩 읽어 기존 파서로 판정하고 그 결과를 매개변수로 DB 합집합에 반영한다.
지원하지 않는 Prisma 조건은 기존 메타데이터 groupBy 경로로 돌아간다.
후보 목록은 같은 정체의 첫 등장 순서와 사용 가능한 실제 표현의 순서를 따로
계산한 뒤 요청한 쪽의 ID만 읽는다. 실제 문항과 형제 메타데이터는 그 뒤 읽는다.
로컬 PGlite에서 계산 비용이 커진 경로가 있으므로, 전송량 감소를 운영 응답시간
개선 수치로 바꿔 주장하지 않는다. 이 칸이 승인되기 전의 본문 판정 비용은 남는다.
계정 무관 서버 집계는 `question-bank-counts-v1` 이름 공간, TTL 15초, `BANK_COUNTS_EPOCH`
열쇠를 쓴다. 앱 Prisma를 통한 문항·자료·책·단원 변경은 프로세스 캐시를 비운다.
별도 프로세스/직접 SQL 적재 후에는 epoch를 바꾸거나 모든 프로세스의 TTL 만료를 기다린다.
최근 출제 제외 및 소유자·지점의 권한 결과를 공용 캐시에 넣지 않는다.
