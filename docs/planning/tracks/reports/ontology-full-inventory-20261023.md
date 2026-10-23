# 정식 온톨로지 적용 준비 — 전원천 inventory

2026-10-23 · 기준 `34742b2f02456930d911e60a69ee020ccee56d64` · 독립 조사 worker.

정식 적용의 분모는 **시드 735차시와 아래의 모든 서로 다른 콘텐츠·운영 모집단**이다. 네 소단원/읽기 전용 시범은 현존 연결의 작은 부분일 뿐 완료 범위가 아니다. 이 보고서는 전체 격차를 계약 설계에 넘기는 준비 조사이며 RDF/OWL·SHACL·앱 연결·교육 검증·배포의 완료 보고가 아니다.

외부 evidence: `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory/` (이하 `inventory/`). 원문·상세 행·재현 도구는 이 폴더만 사용했다. Git 변경은 이 보고서 하나다. 시작 HEAD 일치 및 clean을 확인하고 AGENTS.md, CLAUDE.md 절대규칙과 GOAL.md 전문을 읽었다. 제품 코드, 공유 의존성, env, DB, API, 브라우저, 서버, build, push를 변경하거나 실행하지 않았다. 모델 호출 0.

## 1. 측정 방법과 납품 경계

- `snapshot.cjs`: 실제 저장소 TS 모듈을 기존 외부 TypeScript/Zod로 읽어 은행 조립·assessment 부착·고정 fading 묶음·실효 explorer 카드·문항 등록부를 열거했다. 스키마를 대역으로 바꾸지 않았다. DB/서버 모듈은 실행하지 않았다. 문항을 무작위 생성하거나 모델에 보내지 않았다.
- `census.py`: 추적 원천 파일과 실행 모듈 전체 폐쇄를 합쳐 **3,122파일의 경로·바이트·SHA256**을 `files.json`에 기록했다. 그중 JSON **1,116파일**의 구조·행 분모는 `structured-files.json`에 있다. 수정/삭제/적재 원장은 현 DB 모집단에서 분리했다.
- `nodes.json`: 22개 이름공간, **34,020개 원천 레코드**. `relations.json`: **33,221개 관측 assertion**. 별도 파일에 용어 출처 844행, RPM 색인 1,220행, 기출 원천 1,049행, lab 71행, 공식 코드 435개를 추가했다. 서로 겹치는 엔진/어댑터·문항 표현을 독립 문항 수로 합산하지 않는다. **외부 inventory 등록과 제품 온톨로지 게시를 동일시하지 않는다.**
- `verification.json`: **51개 검사 통과**. 별도 임시 evidence 디렉터리에서 재실행하여 주요 20개 JSON의 바이트 동일성을 확인했다. 원천 해시 폐쇄, 학년 분모, ID 충돌/단절, 공식 코드 파서의 누락도 검사했다. `verification-failures.json`에는 조사 도구의 중간 실패와 수정 근거를 보존했다.
- 검사는 원천·구조·재현성에 한정한다. Zod/수기 DAG 검사를 SHACL/OWL 추론이라 부르지 않는다. 학생 기록·DB 재고·검수 승인 행의 실제 분모는 조회하지 않았으므로 **unknown/null**이다.

## 2. 전 학년·과목 분모

시드 `prisma/seed-data/units.ts`는 **16개 학년/과목 키, 117대단원, 735차시**다. 초1~중3은 학년, 고등은 과목이다. 원천 주석은 eywa 이관·수동 검산 및 고등 과목 배열 결정을 설명한다. `orderIndex`는 서비스 진도 순서이며 공식 교육적 선수 관계가 아니다. 시드 자체에는 curriculum edition이나 공식 성취기준 ID가 없다.

표의 정의는 일반 `definition`, assessment는 그 정의 ID에 별도로 붙는 B/C 문항이다. 엔진 차시는 초등 form 및 중·고등 type의 **같은 학년+정확한 차시명** 연결 수다. 연산 v2/시험학습 family를 포함해 범위를 드러내며 이들을 같은 문항 수로 합산하지 않는다.

| 학년/과목   | 시드차시 | 정의 |   OX | 적용 | 그림 | fading묶음 | explorer카드 | course차시 | 대본차시 | 기존엔진차시 | 연산v2유형 | 시험학습family |
| ----------- | -------: | ---: | ---: | ---: | ---: | ---------: | -----------: | ---------: | -------: | -----------: | ---------: | -------------: |
| 초1         |       57 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |         18 |              0 |
| 초2         |       73 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |         33 |              0 |
| 초3         |       56 | 1178 |  967 |  708 |   22 |        293 |           30 |         56 |       56 |           56 |         70 |            589 |
| 초4         |       62 | 1601 | 1267 |  845 |   33 |        361 |           30 |         62 |       62 |           62 |         48 |            673 |
| 초5         |       56 | 1430 |  876 |  606 |   23 |        319 |           30 |         56 |       56 |           56 |         83 |            633 |
| 초6         |       56 | 1191 |  878 |  649 |   27 |        291 |           30 |         56 |       56 |           56 |         52 |            607 |
| 중1         |       52 | 1558 | 1491 |  643 |   47 |        312 |           40 |          0 |       52 |           52 |        155 |            588 |
| 중2         |       56 | 1534 | 1048 |  650 |   58 |        332 |           35 |          0 |       56 |           56 |        171 |            638 |
| 중3         |       22 |  627 |  420 |  299 |   36 |        132 |           35 |          0 |       22 |           22 |        107 |            316 |
| 공통수학1   |       53 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |           51 |          0 |            168 |
| 공통수학2   |       50 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |          0 |              8 |
| 대수        |       38 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |          0 |              0 |
| 미적분1     |       28 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |          0 |              0 |
| 확률과 통계 |       20 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |          0 |              0 |
| 기하        |       27 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |          0 |              0 |
| 미적분2     |       29 |    0 |    0 |    0 |    0 |          0 |            0 |          0 |        0 |            0 |          0 |              0 |

정의·은행·수업 대본의 지원 차시는 **초3~중3 360/735 (48.98%)**다. 이 360차시 내 일반 정의 원천 연결은 360/360이고 은행 20,712행 모두 시드 차시에 연결된다. 초1~2 130차시와 고등 245차시, 합계 **375차시는 이 은행·대본 모집단 밖**이다. 그러나 초1·2에도 연산 v2가 있고 공통수학1의 기존 엔진과 공통수학2의 시험학습 family도 존재하므로 이를 제품 전체 미지원으로 읽으면 안 된다. 정확한 누락 ID는 `gaps.json`, 학년별 분모/연결은 `coverage.json`이다.

기존 초등 엔진 form 2,499개(230차시), 중학 type 1,517개(130차시), 고등 type 168개(공통수학1 51/53차시)다. 등록 type의 시드 차시 미일치 0. 고등 보류 2개는 별도이며 등록과 혼합하지 않았다. 원형 서술형 definition 6개, 초등 결합 definition 1개도 별도 식별했다. 연산 v1은 7 skill, v2는 737 type이다. 시험학습은 4,220 family/50 requirement이며 기존 엔진 adapter가 포함되므로 family 합계가 독립 문항 총량은 아니다. 기본 중1 대수 SRS의 6개 concept도 explorer 카드와 다른 이름공간이다. 실제 DB 문항 수·출제 가능 재고·난도 검증률은 측정하지 않았다.

## 3. assessment 14 JSON과 일반 개념을 분리

`src/lib/concept-blank/bank/assessments/*.json`을 각각 직접 읽었다. `.data.js`는 같은 JSON을 import하는 wrapper이고 추가 모집단이 아니다. 일반 정의는 14개 bank 모듈의 `concepts`; B형/빈칸 문항은 assessment이다.

| 파일 stem | 키 수 | B 문항 | B 제외(null) | cloze 문항 | cloze 제외(null) |
| --------- | ----: | -----: | -----------: | ---------: | ---------------: |
| e3        |   194 |    175 |           19 |        187 |                7 |
| e3-plus   |   984 |    795 |          189 |        956 |               28 |
| e4        |   145 |    134 |           11 |        143 |                2 |
| e4-plus   |  1456 |   1130 |          326 |       1425 |               31 |
| e5        |   197 |    185 |           12 |        193 |                4 |
| e5-plus   |  1233 |    831 |          402 |       1147 |               86 |
| e6        |   196 |    192 |            4 |        192 |                4 |
| e6-plus   |   995 |    779 |          216 |        841 |              154 |
| m1        |   362 |    355 |            7 |        360 |                2 |
| m1-plus   |  1196 |   1061 |          135 |       1161 |               35 |
| m2        |   386 |    375 |           11 |        379 |                7 |
| m2-plus   |  1148 |    858 |          290 |       1079 |               69 |
| m3        |   177 |    174 |            3 |        175 |                2 |
| m3-plus   |   450 |    424 |           26 |        445 |                5 |

합계 **9,119키**, B 문항 7,468/제외 1,651, cloze 문항 8,683/제외 436. 모든 정의 ID와 assessment 키가 정확히 일치하고 누락·고아·중복 ID는 각각 0이다. 제외는 누락이 아니라 `questionExclusions`를 갖는 표현별 정책이다. B/C 예제를 일반 정의와 동치로 만들거나 일반 정의를 덮어쓰면 안 된다.

은행은 정의 9,119 + OX 6,947 + 적용 4,400 + 그림 246 = **20,712개**, 각 genre의 고정 ID/원래 순서가 보존된다. 동일 정의 문자열 16묶음(33행), 동일 용어 문자열 313묶음(702행)이 있다. 이는 삭제·병합 근거가 아니다. 반복 용어/문장은 단원·난이도·출처가 다르며 `sameAs`나 문항 중복으로 자동 승격하지 않는다. 원문별 목록은 `snapshot.json.checks`.

## 4. 기존 도메인 graph의 실제 범위·근거 상태

`math_graph_2022.json`은 schema `1.1.0`; **편집 단원 100개 + topic 356개**다.

| 학교급               | 단원 | topic |
| -------------------- | ---: | ----: |
| 초등(초1~6의 학년군) |   36 |   129 |
| 중등(1~3학년군)      |   26 |    96 |
| 고등(과목 단위)      |   38 |   131 |

고등 38단원은 공통수학1/2 각6, 기본수학1/2 각4, 대수4, 미적분Ⅰ4, 미적분Ⅱ3, 확률과 통계4, 기하3이다. 기본수학1/2는 현 735차시 시드에 없다. 그래프는 경제 수학·인공지능 수학·직무 수학·수학과 문화·실용 통계·수학과제 탐구·전문 수학·이산 수학·고급 대수·고급 미적분·고급 기하·직업계고 전공 수학·학교별 인정 과목을 제외한다고 명시한다. 이 제외를 모든 수학 원천의 완료 범위로 옮기지 않는다.

| 관계               |  수 | 원천 상태                                     | 교육적 해석                              |
| ------------------ | --: | --------------------------------------------- | ---------------------------------------- |
| unit prerequisite  | 186 | `pedagogical_inference` / `strong_inference`  | 편집 추론; 공식 선수/공식 이수 요건 아님 |
| support            |   2 | `pedagogical_inference` / `support_inference` | 지원 관계; 필수 선수로 강화 금지         |
| contains           | 356 | structural                                    | 단원-topic 계층; 선수 아님               |
| course_sequence    |   6 | 별도 `courseRelations`                        | 과목 순서; 개념 선수 아님                |
| topic prerequisite |   0 | 범위에 없다고 명시                            | 선수 없음이 아니라 아직 기술 안 됨       |

재계산한 prerequisite 순환 0, graph 고아 0, 동일 relation tuple 중복 0, 단원 degree-zero 0이다. **단절이 없다는 것은 공식 연결이 검증됐다는 뜻이 아니다.** 선수 간선은 초→초55, 초→중21, 중→중32, 중→고43, 고→고32, 초→고3이다. 저장된 `validation` 수치를 단순 인용하지 않고 자체 DAG 계산과 제품 validator 양쪽으로 확인했다.

단원 100/100이 `needsCurriculumAudit: true`; **456개 노드 모두 `achievementStandardIds: []`**다. 공식 성취기준 연결은 **0/456**, 공식 교육적 선수 근거가 확인된 간선은 **0/186**이며 186개는 편집 추론으로만 유지한다. graph에 교육부 원문 URL이 하나 있다고 개별 노드/간선이 공식 근거를 얻는 것은 아니다. 원천의 544간선과 6과목관계에는 native `id`가 없다. inventory 관계 ID는 원천좌표·tuple 해시의 임시 assertion ID다. 게시용 영속 관계 ID/개정 이력은 후속 설계 대상이다.

## 5. course·explorer·fading의 실제 연결 가능/불가

| 연결                                  | 정확한 분모·연결                    | 남은 범위/주의                                            |
| ------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| assessment ↔ 일반 정의                | 9,119/9,119                         | 같은 entry ID, 표현별 제외 보존                           |
| 모든 bank item → 시드차시             | 20,712/20,712                       | 정확한 section triple; DB Unit UUID는 아님                |
| course → 시드                         | 230/230                             | 초3~6만; course ID는 학년+차시코드                        |
| fading group → 명제                   | 2,040묶음에 정의 9,119개가 각각 1회 | 누락/중복/고아0; 그룹ID와 정의ID가 같은 문자열이어도 별개 |
| bank차시 → explorer unit              | 240/360                             | 초등230 + 중1 일차방정식10; 나머지120 unknown             |
| bank차시 → 대표 card                  | 114/360                             | 81개 고유 카드; 나머지246은 대표카드 매핑 없음            |
| explorer card → 교재 용어 출처        | 214/230                             | exact/alias/related를 구분; 16카드 미연결                 |
| graph unit → course                   | 2/100 unit, 4/230 course차시        | `E56-N03/N04`의 부분 확인만; 98unit/226차시 미매핑        |
| graph topic → 시드/은행               | 확인된 직접 매핑 0/356              | 단원 연결을 topic에 일괄 복사 금지                        |
| graph node → 공식기준                 | 0/456                               | 공식 코드435는 별도 원천으로 추출됨                       |
| 기출 원천 질문 → 명시 unit assignment | 82/1,049                            | import 단계의 dict; 실제 DB FK 검증 아님                  |
| repo → 실제 DB 학습 사건/계획         | unknown                             | 이 조사에서 DB 조회 안 함                                 |

`curriculumBridge.ts`의 초등 대응은 사람이 적은 chapter/section override이고 중1 10차시는 같은 시드의 유일한 차시명을 통해 연결한다. 제목 유사도 일반 규칙이 아니다. 탐험의 다른 중등 카드가 있어도 매핑을 상상해 채우지 않았다. `math-prerequisite/mapping.ts`의 네 소단원은 전체 대상 축소의 근거가 아니라 현 연결률의 증거다.

explorer는 **46unit/230card**, 카드 prerequisite 추천 **369개**다. dangling prerequisite 0. 카드 추천은 공식 교육적 선수로 검증된 것이 아니며, 단원 내부 카드 순서와 교차 단원 추천을 운영에서 어떻게 필터하는지는 `fading/prerequisites.ts`의 existing rule을 따라야 한다. 카드의 효과적인 내용은 source card에 correction을 적용한 `definitionCards`; 원천 카드와 보정 이력은 구분한다.

fading은 별도 record·고정 묶음표·content fingerprint가 있는 독립 도메인이다. 문장 수정 시 그룹 ID를 재생성하거나 학생 기록을 카드/코스로 옮기면 안 된다. explorer 활동 follow-up, course followUps, fading minute relearn과 장기 FSRS, expedition credit을 서로 대체해서는 안 된다. AGENTS.md의 reader floor를 기존 write 경로 그대로 보존해야 한다.

## 6. 문항·교재·출처·판/라이선스

- `docs/reference/concept-terms/`: **14개 교재 추출 목록/844개 용어 행**. 큐브 초3~6 각학기 8목록, 개념원리 중1~3 각학기 6목록. 원본 경로·쪽수·추출시각·추출기·sentenceRef를 보존했다. 원본 MD5는 3/14기록에만 있다. 원문 sentenceStore는 저장소 밖을 가리키며 이 조사에서 그 원문 파일의 존재/해시/사용권을 확인하지 않았다.
- 위 용어→카드 연결은 **369행**: exact196, alias19, related154; 연결된 고유 카드214. 한 용어 행이 두 카드에 연결되는 경우도 보존했다. 추출·편집 match 표시는 사람 승인·학습효과 검증이나 OWL 동치가 아니다. 행의 key는 source 문서와 함께 이름공간화해야 한다.
- RPM 색인은 중등 **873type/6권**, 고등 **347type/2과목(공통1 170·공통2 177)**, 총1,220행. 원본 파일명·page·minor·number·판 표기를 보존했다. 중학 실행 registry는 색인873키 전부와 추가644키를 포함한 1,517개다(`engine-rpm-connectability.json`). 자체 보강/확대가 있으므로 1,517을 873으로 나누어 구현률이라 부르면 안 된다. 고등168 등록+2보류는 공통1색인170에 대응하고 공통2색인177의 실행 registry는 따로 없다(시험학습 native family8은 다른 모집단).
- 수업 대본 **360개/7,792turn**: bank-concept4,766, bank-example894, bank-ox784, authored-example1,050, v15 298. script-level 일반 정의 참조1,657개가 모두 현재 은행에 존재한다. `source-ledger.json`은 사람 editor가 없고 AI/코드 검토임을 명시한다. 원천 연결과 교육/사람 승인을 분리한다. `reference-v15.json`의 4파일/24쪽 레거시 계보도 유지한다.
- lab은 **71개 초등 단원**과 6개 source entry를 별도 보유한다(`lab-index.json`). 시드의 735차시와 단위가 다르고, 미적용 활동을 모두 구현된 문항으로 세지 않았다.
- 기출 import `exam.json` **52개**, 현재 `body.json.questions` **1,049행**을 exam native ID + 문항번호로 열거했다. 같은 자료의 sol/pieces/in/fixed/conv 파일은 처리 단계이지 새 문항이 아니다. 이 합계는 실제 DB의 Exam/Problem 재고가 아니며 제외·삭제·갱신·활성화 상태를 증명하지 않는다.
- 승인 replay는 **29entry**(plan18/pinned11), plan selected external IDs108 + pinned external IDs11 = **119식별자**다. 계획 밖 적재도 원래 externalId와 source를 보존해야 한다. 실제 행 존재 여부는 DB 미조회다.
- `SourceBook.externalKey`는 curriculum/publisher/grade/author, `SourceMaterial.externalKey`는 원본 경로 기반 키다. 출판사별 교재 단원번호는 우리 차시코드가 아니다. `parseSourceBook`의 2022 기본값은 parser 입력 정책이지 원본 판 실증이 아니다.
- 원천 파일 경로/교육과정 판 표기와 라이선스는 서로 다르다. 조사한 교재 추출/RPM/기출 기록에 **개별 사용권 허락/라이선스 증명은 없다**. 이를 public-domain으로 채우지 않는다. `config/testchanger-engine.json`은 외부 엔진 release0.1.26, commit `d95a6bee593832c6907d7e9b458e06ea65b5c7d9`, `sourceLicense: not-declared`를 명시한다. 이 문장은 그 기록의 관측이며 전체 법적 사용권 판단이 아니다.

## 7. 공식 2022 원문 추가 조사

코디네이터가 교육부 게시글의 실제 첨부를 확보한 뒤 전달한 원바이트를 기존 비GUI HWP 파서로 읽었다. 이 worker는 외부 다운로드/API/브라우저를 사용하지 않았다.

- 원문: `sources/moe-2022-math-annex8.hwp`, 2,094,592바이트, SHA256 `aab8eed59ecf244223d04afad75f4cf5ac5085fadcfc3cf52c2f6d54ddfc7856`.
- 출처: [교육부 2022 개정 교육과정 고시 게시글](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&search=). 취득 URL/압축 원바이트 해시는 리드의 `sources/download-receipt.json`, HWP 해시는 `sources/math-source-receipt.json`에 있다.
- 기존 `scripts/qa/textbook-verify/hwp5_flow.py`와 외부 기존 venv를 재사용했다. GUI/COM/새 의존성 설치 0. **3,952문단에서 고유 성취기준 형태 코드435개/629회 출현**을 추출했다. HWP raw PARA_TEXT 레코드와 문단 흐름 두 경로의 집합/출현 수가 같고 숫자로 시작하는 대괄호 표지 중 미포착은 0이다. 미적Ⅰ/Ⅱ 원래 로마자도 유지한다.
- 학년군/과목 코드 분모: 초1~2 `2수`29, 초3~4 `4수`47, 초5~6 `6수`45, 중 `9수`60; 고등254. 고등의 개별 코드 접두 분모는 `official-extraction.json.byPrefix`에 있다. 원문 전체435를 현재 graph의 지원 범위만 남겨 축소하지 않았다.
- 코드 목록/모든 출현 문단좌표는 `official-standard-index.json`, 문단 원문은 외부 `official-paragraphs.json`에만 있다. **추출 성공은 원문 정독·개별 기준 정의 확정·노드 대응·선수 검증이 아니다.** 같은 코드가 기준표와 해설에 반복되므로 629회를 서로 다른 기준으로 세지 않는다.
- 원문은 **2022 고시 원본 판**이다. 2015판 원문은 이 Task에서 확보/추출하지 않았다. 현 학년별 적용 판·시행일은 검증하지 않았다. 코디네이터가 혼재를 지적했으므로 학생 학년/수업 연도/과목/교육과정 판을 독립 context로 유지하고 2022 파일이 있다는 이유로 전 학생에 일괄 적용하지 않는다.

## 8. 운영 개체/사건·계획의 경계

`operational-model-contracts.json`에 수학/학생 운영 관련 **31개 Prisma 모델**의 ID·unique·relation 계약을 실었다. `rowCount`는 전부 null이다. 주요 식별 규칙은 다음과 같다.

- DB `Unit.id`는 UUID다. 시드 triple/순서나 problemCodePrefix로 실제 UUID를 대체할 수 없다.
- `Problem.id`/`externalId`/`originProblemId`/`unitId`/`sourceMaterialId`/`familyKey`/sourceFile/figure lineage는 별도 축이다. 같은 본문은 같은 문항의 증거가 아니며 갱신 전후 수치/그림/씨앗을 보존해야 한다.
- `StudentSrsState`는 studentId + revision CAS + version1 payload이고 course/explorers/fading/expedition/guide 등 optional 도메인을 따로 가진다. 실제 학생 payload나 개인정보를 읽지 않았다. 계획/이벤트 온톨로지는 원래 도메인 키와 request/session/seed/content key를 추적하되 기존 저장 계약을 교체하지 않는다.
- `ProgressPlan`은 class/student/시작Unit/날짜/요일 단위의 운영 계획이다. 배열 order와 교육적 선수는 별개이고 teacher plan 우선 정책을 유지한다.
- `TextbookConcept`는 `(editionId, conceptKey)` 복합 ID와 mappingVersion/revision/derivedFrom/frozen을 가진다. `textbookConceptLinkSchema`의 relation은 same/covers-part/related, review는 candidate/confirmed/rejected이며 confirmed에는 reviewer/time/targetHash가 필요하다. **이 확인 기록의 실제 분모/존재는 DB를 조회해야 알 수 있다.**
- 현 선택 대상 catalog는 explorer-card230 + course-section230 + graph-unit100 = **560항목**의 원천을 가진다. 은행정의9,119·fading2,040·topic356·공식코드435는 그 3종 선택 namespace에 직접 포함되지 않는다. 선택 가능과 확정된 연결을 혼동하지 않는다.

정확한 live 총량/UUID 매핑이 필요한 후속 단계는 리드 승인 범위의 DB 집계/키 export다. 요구할 최소 범위는 Unit triple↔UUID, Problem/source/eligibility 집계와 lineage 키, SourceBook/Material의 판·출처·license, 교재 edition/concept/link review 집계, 도메인별 학생 사건·계획 개수다. 학생 원문/식별 payload를 모델에 보낼 필요는 없다. 이 Task에서 DB 조회를 요청하거나 수행하지 않았다.

## 9. 권장 adapter와 ID 손실 금지

기계 판 계약은 `adapter-contract.json`, 연결 판정표는 `connectability.json`, 누락 전체 ID는 `gaps.json`이다. 리드가 RDF/OWL/SHACL 계약을 만들 때 즉시 쓸 원천 레코드/근거좌표다. 이 파일들이 그 의미 엔진 자체는 아니다.

1. 모든 ID는 `(namespace, nativeId)`로 보존한다. 원문 Unicode/로마자, 빈 번호·RETIRED/null 위치, 원래 순서를 다시 번호 매겨 잃지 않는다. reference-term key는 source 문서와 묶는다. form ID는 차시 안에서만 유일하다.
2. 시드 adapter는 학년/과목→chapter→section과 순서만, 은행 adapter는 정의/문항/표현별 제외만, fading adapter는 고정 containsProposition만 낸다. 동일 문자열을 동치로 잇지 않는다.
3. explorer adapter는 실효 내용과 수정 계보, bridge·추천 선수를 관측 상태로 유지한다. graph adapter는 prerequisite/support/contains/course_sequence의 predicate를 분리하고 official/observed/inferred/proposed/approved/unknown을 섞지 않는다.
4. source adapter는 원본 byte hash/경로/쪽수/판/허락 상태, 파생 도구/입력 해시를 독립 노드/주장으로 보존한다. schemaVersion·contentHash·parserVersion·mappingVersion·policyVersion·판/시행 context를 하나의 version 문자열로 합치지 않는다.
5. 공식 adapter는 먼저435코드와 원문좌표를 등록하고 대응은 독립 검토 가능한 proposal로 둔다. graph456노드에 기준을 제목으로 자동 할당하지 않는다. source URL 하나만으로 공식 선수 간선을 만들지 않는다.
6. 운영 adapter는 기존 UUID·branch/student 권한·CAS/idempotency·reader floor와 기존 action을 호출하는 경계를 지킨다. inventory/AI 제안이 학생 계획·FSRS·채점·기록 쓰기의 승인이 될 수 없다.
7. assertion 영속 ID와 개정/폐기/승인 이력은 게시 전에 별도로 정한다. `relations.json`의 hash ID는 원천 발생좌표용이므로 production identity로 그대로 확정하지 않는다. 추론 결과에는 원근거·규칙·엔진판·승인 상태가 필요하다.
8. 현재 비어 있는 링크는 unknown이다. 공식 관계 검수0을 “선수 없음”, DB 미조회null을 “재고0”, 출처 경로를 “라이선스 허락”으로 바꾸지 않는다.

## 10. 리드에게 남기는 전체 gap

- 시드 전체735차시의 공식 교육과정 판/성취기준 대응; 현재 graph456노드의 공식기준 매핑0 및 교육적 선수186개 전체의 출처·검수·승인.
- graph98unit/356topic의 기존 코스/원천 미연결, 은행120차시의 explorer unit 미연결 및246차시의 대표카드 미연결. 정확한 목록은 `gaps.json`이며 누락을 임의 관계로 채우지 않았다.
- 초1~2/고등375차시의 은행·대본 공백 및 고등 시드245차시 대 기존 엔진 공통1 51차시/공통2 별도 native family8의 편중. 다른 과목과 기본수학의 모집단 차이를 유지한다.
- 2015 원문·각 판의 실제 적용 context, 공식435코드의 노드 등록/대응 검수, 출처별 원문 해시·라이선스/허락 및 편집·사람 승인 레코드.
- 실제 DB 문항/출처/교재판/학습사건/계획의 정확 분모와 UUID 대응. 저장소의 이관/삭제/보정 원장은 현 DB의 스냅샷이 아니다.
- 실제 RDF/OWL 엔진·추론 프로파일·SHACL shapes/리포트·다중 홉 근거 조회·권한·승인 action·감사/결과 feedback·전원천 파이프라인·앱 연결·독립 반례 검수·통합/운영 검증은 리드의 구현/통합 범위에 남는다. 이 조사를 정식 적용의 완료나 경량v2 재완료로 보고하지 않는다.

## 11. 재현 명령

기준 commit checkout에서 실행한다. 이 작업트리는 의존성이 없으므로 **기존 외부 node_modules를 읽기만** 했다. 설치·symlink·env 변경은 없다. `snapshot.cjs`는 경로 인자를 받고 CJS transpile/alias resolution만 수행한다. 기존 공유 의존성의 TypeScript/Zod 판과 package 해시는 `execution.json`에 있다. 공식 parser Python은 별도 기존 venv3.12.15이다.

```sh
node /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory/snapshot.cjs /Users/pss/orca/workspaces/today_/ontology-full-inventory-20261023 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory /Users/pss/Desktop/creative/today_/node_modules
python3 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory/census.py /Users/pss/orca/workspaces/today_/ontology-full-inventory-20261023 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory
/Users/pss/Desktop/creative/display-survey/textbook-verify/.venv/bin/python -B /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory/extract_official.py /Users/pss/orca/workspaces/today_/ontology-full-inventory-20261023 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/sources/moe-2022-math-annex8.hwp
python3 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory/finalize.py /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory
python3 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory/verify.py /Users/pss/orca/workspaces/today_/ontology-full-inventory-20261023 /Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/inventory /Users/pss/Desktop/creative/today_/node_modules
```

현재 검사 결과와 파일별 SHA256은 외부 evidence에 있다. source-declared graphContentHash는 `80f599e064e428f56f63ef06d89ede24d71319521b2c93ff97a3126212f17554`이며 실제 파일 바이트 SHA256은 `files.json`의 별도 항목이다. 리드가 이 보고서 커밋을 통합한 뒤에도 재현은 위 기준 SHA의 source 입력으로 수행해야 한다.
