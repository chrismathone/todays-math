# DB 교과서 원문당 두 변형 — 범위 정정

사용자는 2026-10-11 기존 DB 교과서 원문을 입력으로 작업하도록 명시했다.
원본 Q/E/G 재추출은 이번 변형 생성의 선행 조건이 아니다.
사용 가능 원문 11,826개 중 완료한 893쌍을 보존하고 나머지 10,933개를 진행한다.
기존 475개 보류 원문과 79개 복구 변형의 사람 검수 조건은 유지한다.

공유 타입은 `src/lib/import/schoolTextbook/dbRetry.types.ts`에 둔다.
출처/부모/단원/familyKey는 DB 원문 그대로, 슬롯 키는 기존 `tb-retry-v1:<UUID>:1|2`다.
새 행의 처음 상태는 pending/직접 사용 불가다. 기존 원문·학생 기록·완료 쌍을 수정하지 않는다.
추론 모델의 독립 풀이 검토와 결정적 검산은 서로 다른 근거 종류로 기록한다.
Jev는 같은 학습 목표와 문제 완결성을 판정하며, 그 확률만으로 수학 정답을 승인하지 않는다.

## A · 일괄 생성과 재개

소유: 새 `src/lib/import/schoolTextbook/dbRetryGeneration.ts`, 새
`scripts/import/textbook/db-retry-20261011/**`(review/figure 파일 제외), 해당 단위 테스트와 보고서.

기존 DeepSeek 변형 생성/프롬프트/정규화를 유지한다. 텍스트 문제는 기존 pro 모델을 사용한다.
그림은 DB 그림을 제공해야 한다. 원본을 못 본 채 그림 조건을 만들지 않는다.
통신 기록에 토큰 사용량·지연·모델을 남기되 키/DB URL/이미지 base64는 콘솔에 내지 않는다.
기본 드라이런, 실행 시 bounded limit/concurrency, 원문별 원자적 저장, 기존 행 덮어쓰기 금지,
체크포인트/재개/실패 사유와 소유한 삽입 UUID 영수증을 구현한다.
승격은 검토+지면+저장 지문을 대조한 별도 단계다. 생성기의 재현 값만으로 승인하지 않는다.

## B · 독립 풀이와 의미 검토

소유: 새 `src/lib/import/schoolTextbook/dbRetryReview.ts`, 관련 테스트, 검토 보고서.

`reviewDbRetryPair(origin, candidates, sourceFigures, candidateFigures, options?)`
→ `Promise<DbRetryPairReview>`.
`options`는 테스트용 의존성 주입을 지원한다. TypeSafe skill과 현재 API/Noul 문서를 읽는다.
검산 요청에는 원문/두 변형의 본문·문항 형식·그림만 보낸다. 저장 답/후보 답/해설은 숨긴다.
세 문제의 독립 답을 각각 대조하고 미상/조건 누락/복수 해 누락은 불통과로 남긴다.
각 변형의 같은 학습 목표/풀이 수준/완결성을 TypeSafe typed judgment로 점검한다.
기본 임계값은 정책이며 성능 보증이 아니다. 정상/오답/다른 단원/누락 그림 반례를 확인한다.
출력 지문은 후보 전체 및 그림 바이트에 묶이며 원문 또는 후보 변경 후 재사용하지 않는다.
API/모델은 현재 문서 및 설치된 타입으로 확인한다. credentials는 서버에만 둔다.

## C · DB 그림 읽기와 새 그림

소유: 새 `src/lib/import/schoolTextbook/dbRetryFigures.ts`, 관련 테스트, 그림 보고서.

`loadDbRetryFigures(source, options?)` → `Promise<DbRetryFigures>`.
`renderDbRetryFigure(spec, content)` → SVG와 generated figures를 포함한 결과.
`figuresFromDbRetrySvg(svg)` → `Promise<DbRetryFigures>`.
이미지는 DB의 inline SVG/figureUrls와 기존 CDN manifest/public assets에서 읽는다.
원래 순서/choiceFigureIndex를 보존하고 실제 읽은 바이트 지문을 보관한다.
로컬 경로/허용 CDN만 읽고, 다른 호스트·경로 탈출·누락 파일을 숨기지 않는다.
기존 SVG 엔진을 strict 모드로 쓰며 지어낸 spec/누락 치수는 거부한다.
SVG→PNG는 검산 모델에 그림을 제공하기 위한 렌더링이다. 원본 래스터를 숫자만 바꿔 재사용하지 않는다.
DeepSeek 공식 문서에 현재 `deepseek-flash`는 이미지 입력을 지원한다.
필요한 그림이 없으면 text-only 성공으로 바꾸지 않는다.

각 작업자는 실제 공유 DB에 쓰거나 전체 유료 묶음을 실행하지 않는다.
root가 통합 후 소규모 실제 생성/검토/지면 검사를 확인하고 같은 절차로 누락 목록을 진행한다.
Orca 작업트리 cleanup 전 node_modules junction을 비재귀로 해제해 main 의존성을 보존한다.
