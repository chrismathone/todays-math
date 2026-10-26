끝 — 가지 `chrismathone/topic-vocab-261020` · 커밋 `3817b1288afc945b3a5e9e923fa19b1c9f11d53e`

# 단원 분류표 새 판(큰분류ver.261020) 사용처 대조

2026-10-26. 기준 가지 `chrismathone/topic-vocab-261020`, 시작점 `a0129ae31`(origin/main). 전달본 `D:/시험지 한글화/docs/export/todays-math/04-단원분류표-261020.md`와 `drop-in/topic-vocab/topic_vocab.json`·`topic_vocab.py`·`test_topic_vocab.py`를 읽기 전용으로 대조했다. 이번 표는 **중등 ①을 `[중단원]`, 고등 ⅰ)를 `[소단원]`** 메타에 쓰는 대수회 어휘다. DB의 `Unit.chapter`·`Unit.section`, RPM 중단원, 화면의 단원 표시는 각각 다른 출처다.

## 1. 사용처 전수 목록과 판정

조사 범위는 이 가지에 추적된 `prisma`, `src`, `scripts`, `vendor/hwpx`, `.claude/skills`, `docs/planning`이다. 개수는 성격이 다른 자료를 합산하지 않기 위해 다음처럼 셌다. **옛 이름 후보**는 중1·중2의 15개정 표에는 있고 현행 표에는 없는 18개 항목을 따옴표 또는 RPM 키의 `|`로 둘러싼 문자열로 찾은 **파일 수**다. `유리수`·`순환소수`처럼 보통 문장에도 쓰이는 낱말이 있어, 수치는 자동 변경 대상 수가 아니다. 해당 사용처는 아래와 같이 문맥도 확인했다. 과거 보고서는 같은 조건으로 세기만 했다.

| 갈래 | 경로와 관찰한 수 | 판정 |
|---|---|---|
| (가) DB 원천 | `prisma/seed-data/units.ts`: 전체 `orderIndex` 1~735, 중등 130행(중1 52·중2 56·중3 22), 고등 245행(7과목). 옛 이름 후보 1파일. `prisma/schema.prisma`의 `Unit`, `Problem.unitId`, 진도 관계, `problemCode`가 연결됨 | **보류**. 머리 주석대로 eywa `MATH_CURRICULUM`의 장·차시 원문이다. 대수회 메타 어휘의 정본이 아니다. |
| (가) 진도·기록·개념 열쇠 | `src/lib/eywa/resolveProgress.ts`의 `grade||chapter||section`·느슨한 이름 검색, `src/lib/eywa/runSync.ts`·`managedRelations.ts`의 `unitId`, `src/lib/textbook/concepts.ts`와 `src/lib/textbook/server/conceptRows.ts`의 정확한 `blankSectionKey`, `scripts/qa/probe-eywa-resolve.ts`를 확인. 옛 이름 후보의 **진도 정본 직접 선언 0파일** | **보류/해당 없음**. DB 열쇠를 따라가므로 이름 치환은 진도·학생 기록·개념 묶음을 함께 바꾼다. 프로브의 표기는 eywa 원문 대조용이다. |
| (가) 교과서 이관·과목 매핑 | `src/lib/import/schoolTextbook/sourceMeta.ts`는 책의 번호·학기를 읽고, `dbRetryGeneration.ts`·`dbRetryReviewBinding.ts`는 DB `grade/chapter/section`·`unitId`를 사용한다. `src/lib/import/highSubjectAliases.ts`는 시험지 과목 별칭을 DB 고등 7과목에 연결한다. 옛 이름 후보 검색 1파일은 `scalarAnswerNotation.ts`의 정규식 속 일반 명사 `유리수`로, 단원명 선언은 **0파일** | **해당 없음**. 대수회 메타를 만드는 경로가 아니다. 시험 연도별 어휘 선택도 이 경로의 현재 역할이 아니다. |
| (나) 엔진·유형 색인 | `src/lib/middle/**`, `src/lib/examStudy/**`, `src/lib/high/**`, `scripts/middle/**`, `scripts/rpm/**`에서 옛 이름 후보 **54개 코드 파일**(JSON 제외). `scripts/rpm/rpm-type-catalog.json` 1파일에도 RPM 이름이 있다. `src/lib/high/generate.ts`는 `과목|RPM중단원|번호`, `src/lib/middle/types.ts`·`src/lib/high/types.ts`의 `unitSection`은 DB 차시 정확 일치임을 명시 | **해당 없음**. `m1Expr.ts`의 `문자의 사용과 식의 계산`, `m1Geo2.ts`의 `작도와 합동`, `examStudy/adapters.ts`·`legacyReinforcement.ts`의 키는 RPM 유형·기존 적재 식별자다. 대수회 표로 일괄 개명하면 조회가 끊긴다. |
| (다) 화면·지면의 직접 쓴 이름 | `src/app/**`, `src/components/**`에서 옛 이름 후보 **13파일**: `src/app/dev/**` 시안·고정 예시 12개, `src/components/exam-builder/SavedConditions.test.tsx` 시험 1개. 운영 화면은 `Unit.chapter`·`Unit.section`과 문항 데이터를 표시한다(`src/components/unified/TeachingOverview.tsx`, `src/components/unified/WorksheetEditor.tsx` 등) | **해당 없음**. 시안·시험의 예시는 DB/엔진 가상 값이다. 운영 화면에 대수회 표준명으로 직접 쓴 목록은 없다. |
| (라) HWPX 내보내기 | `src/components/unified/WorksheetEditor.tsx` → `src/lib/export/hwpxClient.ts` → `hwpxLayout.ts` → `hwpxServer.ts` → `scripts/hwpx/export_parts.py`·`writer.py`. `src/lib/export/**`, `scripts/hwpx/**`, `vendor/hwpx/**`에서 `[소단원]`·`[중단원]` 값 작성 또는 단원 어휘 조회 **0곳**. `HwpxPayloadSchema`는 제목·페이지·텍스트/수식/그림 배치를 받는다 | **반영할 자리 없음**. 현재 인쇄 DOM을 HWPX로 옮기며 문항별 메타를 새로 만들지 않는다. `vendor/hwpx/latex_to_hwpeq.py`는 수식 변환기다. |
| (라) 완료 문서 가져오기 | `scripts/vendor/testchanger/hwp_extract.py`는 사람이 이미 적은 `[소단원]`·`[중단원]`을 `_META_RE`로 **읽는 1파일**. `scripts/qa/survey-topic-coverage.py`는 완료 HWP의 태그 유무를 조사하는 **1파일**. `src/lib/math-insight/inference.ts`의 `[소단원]`은 개인정보 탐지용 마스킹 표기 | **해당 없음**. 어느 경로도 메타 값을 채우거나 표준 어휘로 교정하지 않는다. |
| (마) 스킬·살아 있는 계획 | `.claude/skills/middle-gen/SKILL.md`는 RPM `책|중단원|번호`와 `Unit.section`을 구별한다. `.claude/skills/elem-gen/SKILL.md`는 초등 소단원이라 이번 중·고 표 범위 밖이다. `docs/planning/tracks/high-engine-plan.md` §1-5~1-6의 정본은 RPM 색인과 DB 시드다. `docs/planning/**` 중 옛 이름 후보 **9파일**은 기존 엔진의 목록·사고 기록·인계 내용 | **해당 없음**. 현행 대수회 분류표 이름이라고 명시하고 관리하는 목록은 0곳이다. 날짜 붙은 측정·인계 절을 새 표로 덮어쓰지 않는다. |
| (바) 지난 산출물 | `docs/reports/**`, `scripts/qa/reports/**`, `docs/planning/tracks/reports/**`에서 옛 이름 후보 **749파일** | **해당 없음**. 당시 측정값·유형 키·적재 결과를 보존한다. |

## 2. 표 자체의 대조

전달 JSON의 표별 항목 수는 현행 고등 **207**(공통 수학1 27·공통수학2 34·대수 33·미적분1 25·확률과 통계 22·미적분2 35·기하 31), 현행 중등 **64**(중1 25·중2 25·중3 14), 15개정 고등 **145**, 15개정 중등 **51**이다. 중3 14개는 두 표가 순서까지 같다. 중1은 옛 17개 중 9개가 현행과 글자 그대로 같고, 중2는 옛 20개 중 10개가 같다. 새로 생기거나 더 잘게 갈린 항목이 있어 **옛 이름 하나를 새 이름 하나로 자동 치환할 수 없다**.

전달 조회 모듈의 연도 경계는 중1·고1 **2025**, 중2·고2 **2026**, 중3·고3 **2027**이다. 시험 연도를 모르면 현행 표를 본다. 중3은 현재도 15개정 내용이므로 두 중3 목록이 같다. 이 규칙은 실제 메타 작성 경로가 생길 때 적용할 것이며, 지금 DB·RPM 키에 소급 적용하지 않는다.

아래의 오른쪽은 같은 학년의 **가까운 현행 항목**이다. 한 행이 여러 항목으로 갈리거나 새 항목이 따로 늘었으므로 데이터 이관 규칙이 아니다.

| 학년 | 15개정 표에만 있는 이름 | 현행 표에서 맞대어 볼 이름 |
|---|---|---|
| 중1 | 문자의 사용과 식의 계산 | 문자의 사용 · 일차식과 그 계산 |
| 중1 | 일차방정식의 풀이 · 일차방정식의 활용 | 방정식과 그 해 · 일차방정식의 풀이와 활용 |
| 중1 | 좌표와 그래프 | 순서쌍과 좌표 · 그래프와 그 해석 |
| 중1 | 기본도형 | 점, 선, 면, 각 · 동위각과 엇각 |
| 중1 | 위치관계 | 점, 직선, 평면의 위치관계 |
| 중1 | 작도와 합동 | 삼각형의 작도 · 삼각형의 합동 |
| 중1 | 자료의 정리와 해석 | 대푯값 · 줄기와 잎 그림 · 도수분포표 · 히스토그램과 도수분포다각형 · 상대도수와 그 그래프 |
| 중2 | 유리수 · 순환소수 | 유리수의 소수 표현 · 순환소수의 분수 표현 |
| 중2 | 일차부등식 · 일차부등식의 활용 | 부등식의 해와 그 성질 · 일차부등식의 풀이와 활용 |
| 중2 | 연립일차방정식 · 연립일차방정식의 활용 | 미지수가 2개인 연립일차방정식 · 연립방정식의 풀이와 활용 |
| 중2 | 일차함수와 일차방정식의 관계 | 일차함수와 일차방정식 · 일차함수 그래프와 연립방정식 |
| 중2 | 이등변삼각형 | 이등변삼각형의 성질 |
| 중2 | 평행선과 선분의 길이의 비 | 평행선 사이의 선분의 길이의 비 |
| 중2 | 삼각형의 무게 중심 | 삼각형의 무게중심 |

현행 중2 표의 `지수법칙`·`함수의 뜻`·`직각삼각형의 합동조건`·`삼각형의 닮음 조건`처럼 옛 표의 독립 항목으로 대응되지 않는 이름도 있다. 고등은 과목 자체가 재편되었다. 옛 `수학1`/현행 `대수`는 **27/34**개, `수학2`/`미적분1`은 **21/24**개, `미적분`/`미적분2`는 **32/39**개가 글자 그대로 겹친다(분모는 옛 과목 항목 수). `확률과 통계`는 **20/21**, `기하`는 **18/27**개가 겹친다. 현행 `공통 수학1`·`공통수학2`에는 전달된 15개정 표의 직접 대응 과목이 없다. 과목을 한 번에 개명하는 근거로 이 숫자를 쓰지 않는다.

DB 시드의 중·고 장 번호 접두를 떼고 같은 학년·과목의 `chapter` 또는 `section`과 글자 그대로 맞춘 결과는 **현행 271항목 중 130항목**(중등 30/64, 고등 100/207)이다. 세부적으로 중1 8/25, 중2 12/25, 중3 10/14, 공통수학1 15/27, 공통수학2 18/34, 대수 11/33, 미적분1 11/25, 확률과 통계 16/22, 미적분2 13/35, 기하 16/31이다. 일치도 대수회 어휘가 DB의 출처라는 뜻은 아니다. 불일치는 대부분 **분류표의 중단원/소단원과 eywa 차시의 깊이가 다른 것**이며, 중1 DB `일차방정식의 풀이`와 중2 DB `순환소수`처럼 옛 표에만 있는 문자열도 실제로 남아 있다.

## 3. 반영·보류 결정

- **반영:** 없음. 현재 제품에는 대수회 표준 어휘로 문항 메타를 **작성**하는 경로도, 대수회 분류표라고 선언한 활성 목록도 없다. 따라서 `topic_vocab.json`과 조회 모듈을 들이지 않는다. 쓸 자리가 생기면 전달본의 **`topic_vocab.json` + `topic_vocab.py`** 두 파일을 근거로 해당 실행 언어의 조회 계약을 설계하면 된다. PDF 생성기 `build_topic_vocab.py`는 배포 조회에 필요하지 않다.
- **보류 — 원장님 결정:** DB `Unit.chapter`·`Unit.section`을 22개정 분류표 이름으로 바꿀지, eywa 원문과 어떤 관계를 둘지, 학생 진도·개념 묶음·문항 코드의 기존 열쇠를 어떻게 이관할지. 이 결정 없이 시드·DB·코드 중 한쪽만 바꾸지 않는다. 전달 문서 끝의 대수회 작업 규정 표준과 시험지 한글화 엔진이 다른 **9곳**도 참고만 했고 수정하지 않았다.
- **해당 없음:** RPM 유형 키·중단원, eywa 진도명, 교과서 이관의 DB 범위, 이미 만들어진 문항과 완료 HWP 메타, 개발 시안·시험 값, 날짜가 붙은 기획 절과 지난 측정 산출물. 이름이 우연히 같아도 출처가 다르다.

## 4. 변경 파일과 검증

변경 파일은 이 보고서 **1개**다. `prisma/**`, 학생 기록·개념 열쇠·문항 코드, 전달 원본 `D:/시험지 한글화/**`, 지난 보고서는 변경하지 않았다. 제품 코드를 바꾸지 않아 `npm run type-check`와 Vitest는 실행하지 않았다.

| 검사 | 결과 |
|---|---|
| 전달본 3파일을 `D:/tmp/topic-vocab-261020/test-copy/{core,data,tests}`에 복사하고 `python -B .../tests/test_topic_vocab.py` 실행 | **ALL OK**. 레벨, 현행/15개정·연도, 잘림·그림 글자·오타·개수 검사 모두 통과. 원본 폴더는 읽기만 했다. |
| HWPX 내보내기 경로의 `[소단원]`·`[중단원]` 및 어휘 조회 검색 | 값 작성 **0곳**. 완료 문서의 메타 읽기/조사 2파일과 구별했다. |
| `git diff --cached --check` | 통과. |
