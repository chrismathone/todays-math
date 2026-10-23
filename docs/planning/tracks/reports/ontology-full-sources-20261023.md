# 전원천 source adapter · identity · RDF 공급 납품 — 2026-10-23

전체 모집단 54,839 source records와 59,900 source assertions를 유지하여 40개 finite source family를 제품 계약·수집기·고정 자산·Node 런타임 reader로 연결했다. 공개 적격은 51,319개 개체와 56,049개 관계, quarantine은 3,520개 원천 레코드다. 이 숫자는 서로 다른 표현·생성 family·운영 계약을 포함하므로 **문항 수로 합산하지 않는다**.

기준 원천은 `34742b2f02456930d911e60a69ee020ccee56d64`; 본인 inventory 보고 `ontology-full-inventory-20261023.md`와 외부 `inventory/`를 보존했다. 구현 checkpoint는 `5799e4527` → `c28dc11b4` → `dc18fd2c0` → `852bb348b` → `68d994c32` → `1ac7e1905` → `6d0a5d1308a4f040fc39fe5a1b8d200580dad724`다. GOAL/ACCEPTANCE/lead-consult-decisions와 repo 절대규칙을 읽었으며 제품 UI, formal contract/TTL/OWL/SHACL 엔진, actions/Prisma/migration, package/lock/env/shared dependencies를 수정하지 않았다. 공유 DB/API/브라우저/서버/build/push/유료 모델 호출은 0이다.

## 고정 계약과 소비 경로

- `src/contracts/mathOntologySource.contract.ts`: namespace/nativeId/scope/sourceVersion, 원천·라벨·참조 좌표와 hash, provenance/distribution/판, 20개 관계 predicate, candidate/partial 상태, 명시적 unknown/actualInstances=null의 strict 계약.
- `src/lib/math-ontology/ids.ts`: 정확한 UTF-8 native ID를 trim/정규화 없이 namespace+scope로 보존한다. stable IRI와 `:version:<sha256>`을 분리하며 원래 native ID도 별도 필드에 남긴다. label/title 일치로 sameAs·교육적 선수를 만들지 않는다. 원래 독립 ID가 없는 script turn만 source key·presentation identity hash와 동일 signature 발생 순서를 synthetic coordinate ID로 쓰고 native source.key와 원래 export pointer를 보존한다.
- `scripts/ontology/census/collect.ts`, `inputs.ts`, `cli.ts`: 실제 repo finite registry와 14 assessment JSON을 읽는다. generator 실행·DB 조회 없이 추출하며 native cache 선로딩, 프로세스 내 재수집, read-port와 실제 파일의 byte 불일치, 중간 변경, 중복·누락·고아 참조를 거절한다. 코드 좌표는 파일 hash + 실제 module export/JSON pointer이며 TS 문장의 줄 번호라고 주장하지 않는다.
- `sources/assembler.ts`, `correspondence.ts`, `relationMatrix.ts`: 고정 입력 hash, 40 family 분모, 20 relation 분모, 실제 9,119 assessment→동일 native definition→source section→chapter 경로를 검사한다. raw administrative hash와 공개 projection hash를 분리한다.
- `sources/partitions.ts`, `catalog.ts`, `scripts/ontology/census/writePartitions.ts`: independently pinned manifest/압축·원시 byte hash를 검증하고 namespace + stable IRI SHA-256 첫 hex(16 bucket)로 읽는다. 모든 원래 focus는 한 번 primary로 등록되며 관계 양 끝 entity metadata만 dependency로 반복한다. 런타임은 전체 89MB administrative JSON을 조립하지 않는다.
- `sources/server.ts`: 실제 기존 account/menu/route/branch/class/grant/enrollment 정책을 사용하는 Prisma read composition을 별도 server surface로 제공한다. `readMathOntologyDatabaseSourcesInTransaction`과 동일 tx WeakMap receipt 검사, 별도 repeatable-read wrapper의 현재 권한 재검사를 구현했다. 공유 DB에서 실제 실행하지는 않았다.

## 모집단·적격 전수 표

각 family의 등록률은 기대 분모 대비 100%다. quarantine은 누락이 아니라 reference census로 남긴다. 아래 전수 표와 `ontology/source-manifests/expected-adapter-coverage.v1.json`은 **offline admin용**이며 숨겨진 분모를 teacher/student 응답·모델 입력에 반환하면 안 된다. 화면용 집계는 허용된 projection의 개체만 센다.

| Namespace | 기대 | 등록 | 공개 적격 | Quarantine | 모집단 종류 |
|---|---:|---:|---:|---:|---|
| algebra-srs-concept | 6 | 6 | 6 | 0 | structural |
| arithmetic-skill | 7 | 7 | 7 | 0 | finite-family |
| arithmetic-v2-type | 737 | 737 | 737 | 0 | finite-family |
| bank-apply | 4400 | 4400 | 4400 | 0 | materialized-source-record |
| bank-assessment | 9119 | 9119 | 9119 | 0 | materialized-source-record |
| bank-definition | 9119 | 9119 | 9119 | 0 | materialized-source-record |
| bank-figure | 246 | 246 | 246 | 0 | materialized-source-record |
| bank-ox | 6947 | 6947 | 6947 | 0 | materialized-source-record |
| course-section | 230 | 230 | 230 | 0 | structural |
| curriculum-chapter | 117 | 117 | 117 | 0 | structural |
| curriculum-grade | 16 | 16 | 16 | 0 | structural |
| curriculum-section | 735 | 735 | 735 | 0 | structural |
| elementary-combo | 1 | 1 | 1 | 0 | finite-family |
| elementary-form | 2499 | 2499 | 2499 | 0 | finite-family |
| exam-study-family | 4220 | 4220 | 4220 | 0 | finite-family |
| exam-study-requirement | 50 | 50 | 50 | 0 | structural |
| explorer-card | 230 | 230 | 230 | 0 | structural |
| explorer-unit | 46 | 46 | 46 | 0 | structural |
| fading-group | 2040 | 2040 | 2040 | 0 | structural |
| graph-course | 13 | 13 | 13 | 0 | structural |
| graph-topic | 356 | 356 | 356 | 0 | structural |
| graph-unit | 100 | 100 | 100 | 0 | structural |
| high-hold | 2 | 2 | 2 | 0 | finite-family |
| high-type | 168 | 168 | 168 | 0 | finite-family |
| import-replay | 29 | 29 | 0 | 29 | structural |
| lab-source | 6 | 6 | 0 | 6 | structural |
| lab-unit | 71 | 71 | 71 | 0 | structural |
| middle-type | 1517 | 1517 | 1517 | 0 | finite-family |
| native-descriptive-definition | 6 | 6 | 6 | 0 | finite-family |
| official-source | 1 | 1 | 1 | 0 | structural |
| official-standard | 435 | 435 | 435 | 0 | structural |
| operational-model | 31 | 31 | 31 | 0 | contract-only |
| rpm-index-type | 1220 | 1220 | 0 | 1220 | materialized-source-record |
| rpm-source | 8 | 8 | 0 | 8 | structural |
| source-exam | 52 | 52 | 0 | 52 | structural |
| source-exam-question | 1049 | 1049 | 0 | 1049 | materialized-source-record |
| textbook-reference-source | 14 | 14 | 0 | 14 | structural |
| textbook-reference-term | 844 | 844 | 0 | 844 | materialized-source-record |
| textbook-script | 360 | 360 | 360 | 0 | materialized-source-record |
| textbook-script-turn | 7792 | 7792 | 7494 | 298 | materialized-source-record |

native bank 9,119와 assessment 9,119는 같은 source ID의 다른 표현이다. course 230, explorer 230, fading 2,040, generator families와 materialized questions 역시 별도 모집단이다. DB Problem·학생·진도·교재의 실제 행 수와 UUID 모집단은 **조회하지 않아 unknown**이다.

## 학년·과목별 분모와 원천 연결

assessment의 grade 필드가 있다고 꾸미지 않았다. 아래 학년은 assessment의 명시된 native ID 대응 관계를 definition으로 따라가서 얻는다. course는 native 숫자 grade를 보존하고 표에서만 초등 이름으로 표시한다. 2015/2022는 grade로 추정하지 않는다.

| 원래 학년/과목 | Source sections | General definitions | Assessment IDs | Course sections | Assessment→definition→section→chapter |
|---|---:|---:|---:|---:|---|
| 초1 | 57 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 초2 | 73 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 초3 | 56 | 1178 | 1178 | 56 | 1178/1178 |
| 초4 | 62 | 1601 | 1601 | 62 | 1601/1601 |
| 초5 | 56 | 1430 | 1430 | 56 | 1430/1430 |
| 초6 | 56 | 1191 | 1191 | 56 | 1191/1191 |
| 중1 | 52 | 1558 | 1558 | 0 | 1558/1558 |
| 중2 | 56 | 1534 | 1534 | 0 | 1534/1534 |
| 중3 | 22 | 627 | 627 | 0 | 627/627 |
| 공통수학1 | 53 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 공통수학2 | 50 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 기하 | 27 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 대수 | 38 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 미적분1 | 28 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 미적분2 | 29 | 0 | 0 | 0 | 해당 bank 모집단 없음 |
| 확률과 통계 | 20 | 0 | 0 | 0 | 해당 bank 모집단 없음 |

총 source sections 735 / chapters 117 / grade-course keys 16; bank 지원 학년 7개에서 9,119/9,119 경로가 확인된다. 초1·초2와 고등 과목의 native section 카탈로그 존재가 해당 bank 내용·student course 공급의 존재를 뜻하지 않는다. Explorer 46 units/230 cards와 fading 2,040 groups는 자체 namespace 및 원래 ID로 보존했고 course/explorer 간 추가 대응은 검수 상태를 유지한다.

기존 graph는 초등·중등·고등 편집 데이터 100 units + 356 topics이며 repo scope가 제외한 진로/융합/전문 과목까지 완전하다고 주장하지 않는다. 공식 성취기준 mapping은 0/456이다. **이전 inventory의 courseRelations 6건을 전부 sequence라고 쓴 부분을 정정한다:** 실제는 courseSequence 3, alternativeTrack 1, recommendedFoundation 1, recommendedBeforeOrConcurrent 1이다. 10개 listed course와 3개 복합 course expression도 Course/CourseExpression으로 분리했다.

## 관계·출처·판·교육적 검수 경계

20개 실제 predicate는 `relationMatrix.ts`의 단일 표로 formal vocabulary IRI, query 위치, publication gate, proof witness에 대응한다. source-owned 구조(partOf/assessesDefinition/cardInUnit/projectsSourceSection 등)와 교육적 후보를 분리한다. orderedBefore는 서비스/차시 순서이며 교육적 선수로 해석하지 않는다. authoredPrerequisiteRecommendation 369, graph editorialPrerequisite 186 및 editorialSupport 2는 authored inference/candidate/unpublished다. course advice 6건도 구조 관계로 승격하지 않는다. 100 unit/356 topic 추가 교육 mapping은 생성하지 않았다.

기존 4개 course mapping은 partial=true와 source-marked-verified만 보존한다. 이는 공식 기준 검수를 뜻하지 않는다. coversSourceSection 240와 representativeCard 114도 authored mapping candidate다. exact/alias/related textbook reference 표시는 native relation ID와 원천 좌표에 보존하며 sameAs로 바꾸지 않는다.

공식 HWP는 외부 원문 SHA-256 `aab8eed59ecf244223d04afad75f4cf5ac5085fadcfc3cf52c2f6d54ddfc7856`로 확인한 파일에서 codes 435 / occurrences 629를 추출했다. `official-2022-codes.json`에는 원문 paragraph/offset/hash, source hash, extractor/parser version/hash만 들어간다. raw PARA_TEXT와 flow code 집합/개수 대조를 통과하고 Roman Ⅰ/Ⅱ를 보존한다. 원문 전체·공식 prose·무근거 concept mapping을 Git에 추가하지 않았다. `scripts/ontology/import/officialCodes.py`로 재생성한다.

원천 선언을 따라 edition 2022는 1,252개(편집 graph 469 + 공식 source/code 436 + 명시적 RPM 347), unknown은 53,587개다. 2022라는 선언은 해당 원천의 판 정보이며 공식 학습 mapping 승인과 다르다. 확인된 2015 레코드는 이 census에 없고 파일명/학년/외부 ID로 자동 채우지 않았다.

마지막 정책 감사에서 lab source 6개와 imported replay 29개를 quarantine으로 보완했다. 전체 모집단은 그대로이며 71개의 lab→private source 관계는 공개 graph에서 제외됐다. native lab 71개는 자체 구조 metadata만 공급한다. 최종 quarantine breakdown은 external coverage contract에 있으며 unknown/imported provenance 또는 licenseStatus=unknown의 공개 적격 레코드는 0개다. 3,520개 quarantine stable identity와 실제 공개 자산의 overlap도 0이다. 원문·정답·이미지·학생 정보는 source RDF 계약의 허용 필드가 아니다.

## 실제 크기·런타임 자산

최종 source projection hash는 `sha256:52597f5f6437aff2418d3189399e1aac261149bea17994a352d62fbfebaee554`이고 manifest byte pin은 `sha256:051e9816980e7d656ff76cac4b66c93cbee1f43bab2815f758e08d5ee80f7ed3`다. 제품 경로는 `ontology/source-manifests/public-v1/52597f5f6437aff2418d3189399e1aac261149bea17994a352d62fbfebaee554/manifest.json`다. fixture pin은 test-only이며 release 활성화나 게시 승인이 아니다.

- primary source population: 51,319 entities + 56,049 assertions = 107,368 foci.
- 419 dependency-closed shards / 16 assertion indexes / 실제 byte 검증 artifact 854개.
- 반복 dependency 포함 RDF 3,148,195 quads, raw 1,397,282,551 bytes, gzip 35,637,073 bytes; semantic JSON gzip 24,502,416 bytes.
- 최대 RDF shard raw 15,153,410 bytes; read cap raw 64MiB / compressed 16MiB. 실제 manifest는 각 파일의 hash·크기를 별도로 봉인한다.
- 실제 primary subject만 센 고유 RDF는 2,082,727 quads / UTF-8 922,346,773 bytes다. 원래 focus와 dependency 반복을 문항/개체 수로 중복 합산하지 않는다.
- 최초 단일 RDF 측정은 약 915MB/3.59GB RSS여서 요청 시 전체 조립 방식을 배제했다. 최종 native census 재추출은 22.86초/peak RSS 2,989,604,864 bytes; 전체 sealed package byte/RDF/endpoint 검사는 14.35초/723,304,448 bytes였다. 이들은 offline 검증이다. 정책 shard build는 CPU 251.40초/동시 작업 중 wall 865.14초/3,903,815,680 bytes였고 wall에는 host contention이 포함돼 배포 latency로 쓰지 않는다.

## 실제 학생·운영 source port

`readMathOntologyDatabaseSourcesInTransaction(tx,input)`은 fresh actor session/account/menu, branch/class 소유·관리·managed grant revision/lease, 현재 재적을 확인한 뒤에만 minimal selected rows를 읽는다. studentSrsState reader floor를 그대로 사용하고 unknown reader fields를 거절한다. 누락 상태를 만들거나 reset/upsert하지 않는다. Unit UUID는 실제 source triple 또는 명시된 plan/progress ID로 조회하며 동명이인·다중 대응을 임의 findFirst로 합치지 않는다. 문제는 기존 eligibility와 visibility wall을 재사용하고 minimal source metadata만 요청한다.

`snapshotDigest`는 observation asOf를 포함하며 sourceWatermarks는 선택된 source rows만 따른다. observation asOf와 권한 wall clock을 분리했고 wrapper는 양쪽 권한 검사에서 fresh Date를 사용한다. 조회 중 lease가 끝나는 반례가 거절된다. Ops는 같은 tx의 실제 object receipt를 검사한 뒤 durable evidence snapshot/승인/CAS/쓰기 계약을 구성한다; 이 source worker는 action/운영 쓰기를 소유하지 않는다.

retained course 첫 답은 실제 기존 sessionOutcome 규칙으로 독립 첫 풀이를 판정하고 힌트/자기채점/포기/기출 본문 재노출/미완료/계획 이전/미래/재시도를 분리한다. follow-up/retry를 첫 풀이에 합산하지 않는다. observedAfter는 strict 이후만 허용한다. course-section/explorer-card/explorer-unit/fading-group의 정확한 native namespace+ID+stable IRI를 공급하고 approved release versionOf 경로로 연결하도록 했다. 모르는 native ID는 unknown이며 임의 mapping을 만들지 않는다. explorer/fading 요약은 날짜·자기평가·retained replay의 한계를 표시한다. 30 retained course sessions/100 recent attempts/90 returned explorer days/400 fading days 제한과 불완전 이력을 명시하며 baseline·장기 학습효과라고 부르지 않는다.

`readNativeDefinitionEvidenceInTransaction`은 **global teacher native source** 권한을 확인하고 학생 조회 없이 최대 6건/24KiB의 term+definition만 읽는다. approved source revision의 definitionTextHash·term과 현재 native module 문장을 정확히 대조한다. assessment/B·cloze/OX/apply/example 정답, 교재/사설시험 원문, 학생 원문은 packet에 포함되지 않는다. 공개 graph에는 definition 본문을 전수 복사하지 않았다.

### Native definition evidence 최종 체크리스트

- ID: bank-definition/global/nativeId와 stable/version IRI를 고정 manifest에서 찾으며 label 검색으로 다른 개념을 동일시하지 않는다.
- 대응: 현재 native module의 term과 definition SHA-256이 approved source projection의 term·definitionTextHash와 같아야 한다. stale/변조된 판은 거절한다.
- 권한: 실제 sessionVersion·계정 승인/정지·managed lease·SRS 메뉴/teacher route 정책을 현재 시각에 확인한다. source asOf나 학생 학습 날짜를 인증 시계로 쓰지 않는다. server-only clock/pins를 모델·브라우저 입력으로 받지 않는다.
- 최소 노출: native 자체저작 일반 정의 최대 6건/24KiB이며 학생 조회 0, assessment/example/정답/교재/학생 원문 필드 0이다.
- 권한 범위: evidence read는 publication·교육적 사실 승인·학생 기록 변경을 허가하지 않는다. 정식 GraphRAG tool/승인·쓰기 통합은 formal/Ops가 이 server port를 소비한다.

## 검증·재현

37 tests / 12 files, maxWorkers=3을 통과했다. actual source package fixture에서 assessment→definition→section→chapter를 고정 source shards로 읽으며 full census assembly를 호출하지 않는다. 해당 fixture는 자산 누락 RED→실제 제품 자산 GREEN을 남겼다. actual SHACL에서 sourceKind를 native metadata가 덮던 RED를 찾아 core discriminator와 nativeSourceKind를 분리했고 모든 reserved identity/provenance key를 방어했다. 이전 source eligibility의 107,474 foci SHACL GREEN은 **이전 판** 기록이며 최종 107,368 foci SHACL/OWL은 formal worker가 최종 pin으로 독립 검증·통합한다.

scope foreign-row / same-file private row·byte 변경 / private file 추가에도 공개 bytes·IDs·versions·counts 불변, 중복·누락·고아 참조·hash 재선언·동명 native ID/namespace 충돌·판 추정·unknown license·private publication·실제 byte tamper를 검사했다. 실제 read-port/file mismatch, preloaded native cache, same-process 재수집은 external failpoint receipts로 거절을 확인했다. synthetic Prisma delegate fixture에서는 기존 실제 policy 함수와 authorization parity·same-tx identity·current lease expiry·reader rejection·no PII/no writer를 검증했다. 실제 DB end-to-end로 과장하지 않는다.

ES2017 실제 repo target에 맞춘 strict TypeScript, 관련 Next TypeScript lint, git diff check를 통과했다. worktree에 deps가 없어 기존 shared package를 읽기만 하는 외부 runner/config로 검증했고 hook 대신 같은 검사를 직접 실행했다; package/env/shared node_modules는 바꾸지 않았다.

외부 evidence root: `/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/sources-product/`.

- `sealed-census.json`, `sealed-admin/`: 현재 source input 3,037개와 40/20 분모·실제 구조 대응·metadata snapshot. payload pin `sha256:aff399b78170317bf2dbfa18d58eeb941882653f715290cbacc66fa9598224b8`.
- `source-file-hashes.json`: 파일별 실제 SHA-256/byte size. 원래 `inventory/`도 보존.
- `source-coverage-contract.json`, `grade-denominators.json`: 리드가 바로 소비할 전체 JSON; 제약·unknown·생성 family/실 instance를 구분.
- `sealed-package-verification.json`, `sealed-eligibility-audit.json`, `sealed-primary-rdf-measurement.json`: 854 artifact의 byte/RDF rendering, primary/dependency/global endpoint, quarantine 비간섭의 실제 검증.
- `GREEN-policy-final.txt`, `types-policy-final.txt`, `lint-policy-final.txt`, `RED-runtime-package.txt`, `failpoint-*.json`: 검사 로그와 RED/negative evidence.
- `sealed-replay.json` / measurement: 새 프로세스 read-only 재추출의 byte 동일성 검사. 제품 README에 정확한 고정 pin과 재현 명령을 적었다.

남은 범위는 source 등록에서 삭제하지 않았다. 초1·초2/고등의 bank/student-course 공급, curriculum 판 미확인, 435 codes→기존 node 공식 대응, 186 교육적 선수 승인, graph 제외 과목, 불완전 retained 이력, 실제 DB UUID/행 수/권한 end-to-end, formal global OWL·전수 SHACL·실제 닫힌 SPARQL/proof/runtime 통합은 각각 unknown 또는 별도 검증 단계다. source 계약은 이를 unknown/candidate/quarantine으로 드러내며 4개 시범이나 readonly 조회만을 정식 온톨로지의 완료로 선언하지 않는다.
