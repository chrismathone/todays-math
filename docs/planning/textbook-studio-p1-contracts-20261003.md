# 교재 제작 P1 계약·연결 명세 — 검토 초안

2026-10-03. 제품 코드는 아직 작성하지 않았다. 이 문서는 계획 v03의 행동을 파일·인터페이스·검증 단위로 고정하는 후속 검토안이다. 실제 세 모델 표결 전 구현 정본으로 사용하지 않는다.

## 파일과 의존 방향

| 소유 파일 | 공개 책임 |
| --- | --- |
| `src/contracts/textbookExchange.contract.ts` | 사용자 지시서 03의 교사용 교환 형식과 모든 명시적 확장. 전부 strict Zod, TS 타입은 infer |
| `src/contracts/textbook.contract.ts` | 교사 API 요청/응답, CAS/idempotency, 검수 issue·작업 상태 |
| `src/contracts/textbookConcept.contract.ts` | namespace 참조, 개념 원고·연결·고정 내용·활동 기록. 기존 ConceptKind/은행 항목 스키마를 재사용 |
| `src/contracts/textbookStudent.contract.ts` | 정답 없는 지면/백지와 권한 있는 QR 해설 응답을 각각 allowlist 정의. 교환 형식 전체를 재사용하지 않음 |
| `src/lib/textbook/canonical.ts` | 순수 JSON canonical 문자열·UTF-8 바이트·manifest projection. Node import 없음 |
| `src/lib/textbook/hash.server.ts`, `hash.browser.ts` | 같은 바이트의 Node SHA-256/Web Crypto SHA-256. 서버 모듈은 server-only |
| `src/lib/textbook/references.ts` | 누락/중복/범위/순서/자산의 교환 형식 참조 검증 |
| `src/lib/textbook/snapshotFromProblem.ts` | 원본 DB 행과 고정 자산 → 유일한 무손실 ProblemSnapshot 캡처 |
| `src/lib/textbook/snapshotToPrintable.ts` | 고정 snapshot → 기존 지면이 받는 표시 모델. 해시 입력과 분리 |
| `src/lib/tests/testProblemContent.ts` | `contentOf(testProblem)` — snapshot이 있으면 인쇄·채점·내보내기 모두 같은 고정 내용을 읽음 |
| `src/lib/textbook/concepts.ts` | 실제 개념백지/보정된 탐험 목록 조회·검수 후보·고정 내용 구성·변경 비교 |
| `src/lib/textbook/access.ts` | 소유/명시 공유/메뉴/현재 학생·반·지점/배정/발행 상태의 공통 판정 |
| `src/lib/textbook/publish/*` | reserve/step/finalize. renderer/DB 저장 어댑터에 의존하며 클라이언트 PDF를 정본으로 받지 않음 |
| `src/components/textbook/paper/*` + `src/lib/textbook/layout/*` | 미리보기/서버 PDF/오프라인 HTML이 공유하는 렌더와 측정 |

교재가 기존 은행·탐험·진도 모듈을 참조한다. 기존 은행과 탐험이 교재의 저장 계층을 import하지 않는다. 역방향 «이 개념이 실린 교재»는 화면 통합과 별도 조회 API에서 해결한다. React 코드와 교육과정 정본을 섞지 않는다.

## 교환 형식과 버전

지시서 03 §4의 `AssetRef/FigureRef/ProblemPayload/ProblemSnapshot/TextbookItem/TextbookConfig/ManuscriptBlock/Section/UnitManuscript/QrTarget/ProblemVideoBinding/PagePlacement/TextbookExchange` 필드 의미를 유지한다. `schemaVersion`은 `injaewon.textbook.exchange.v1`이다. 다음 명시적 선택 확장만 허용하고 그 외 필드는 오류다.

- `canonicalizationVersion?: 'injaewon.textbook.c14n.v1'` — 이전 파일은 가져오기 검토 대상으로 받고 발행 전 서버 정본에 명시한다.
- `conceptIntegration?: { version: 'injaewon.textbook.concepts.v1'; concepts: TextbookConcept[] }` — 없는 기존 패키지는 구조적으로 열 수 있지만 연결된 개념으로 인증하지 않는다. 개념 블록 발행에는 해당 확장이 필요하다.
- 문항의 `conceptKeys?: string[]`; `videoRequired?: boolean` override. 기존 문항의 학습 단계와 문제 형식·난도는 서로 다른 값이다.
- `ManuscriptBlock`에 `{blockId,kind:'concept',conceptKey}` 및 개념용으로 검증되는 `concept-recall` 참조 확장을 추가한다. 연결은 블록마다 복제하지 않고 판본 내 개념 행에 둔다.
- `ProblemSnapshot.rawSource`에 원본 `figureUrls/figureDims/figureSourceMm/choiceFigureIndex/figureSvg`와 허용된 source metadata를 명시한다. 잘못된 원본 배열도 보존하고 렌더 가능한 해석 및 오류와 구분한다. 실제 측정 자산 치수는 `AssetRef`의 값이다. rawSource는 payload contentHash 밖, 판본 manifest 안이다.
- 개념 QR은 별도 `conceptQrTargets` 명시적 확장이다. problem QR의 itemId 자리에 개념 ID를 넣지 않는다.

단원 키는 판본 내 유일하다. 구획 키는 **(unitKey, sectionKey)** 안에서 해석한다. 교환 문항과 블록의 참조는 이 두 키를 사용한다. 서버 내부 구획은 UUID `sectionId`로 API에 노출해 같은 이름의 준비학습 구획끼리 충돌하지 않게 한다. 문항의 `orderIndex`와 블록의 실제 참조 순서가 충돌하면 발행 오류다. 서로 다른 item이 같은 snapshot을 쓰는 반복 배치는 허용하고 item별 QR을 발급한다.

## 개념 및 백지

`TextbookConcept`의 정체는 `(editionId, conceptKey)`다. 개념 row가 초안의 연결과 발행 후 고정 내용을 보관한다. 별도 중복 개념 snapshot 표를 만들지 않고 발행 시 동일 행을 트리거로 잠근다. 교재 원고 개념과 외부 참조는 동치 ID가 아니다.

- `conceptKey, unitKey, sectionKey|null, title, kind, unitId|null`
- `body: {goal, prerequisites:string[], definition, conditions|null, examples:string[], counterexamples:string[], misconceptions:string[], explainPrompt|null}` — 사람에게 보이는 원고, prerequisites는 글이며 그래프 간선이 아니다.
- `blankItems: [{sectionKey,entryKind:'concept'|'ox'|'apply'|'figure',entryId,review}]` — 배열 순서 유지. 같은 대상 중복 거부.
- `links: [{linkId,target,relation:'same'|'covers-part'|'related',review}]` — target은 explorer-card/cardId, course-section/sectionId, graph-unit/graphUnitId. DB unitId는 별도 FK.
- `review: {status:'candidate'|'confirmed'|'rejected',candidateRule:'unit-triple'|'bridge'|'manual',reviewedBy|null,reviewedAt|null,targetHash|null}` — confirmed 필드는 서버가 채운다. 타 계정 패키지의 확인자 주장을 현 계정의 승인으로 취급하지 않는다.
- `mappingVersion, derivedFromConceptKey|null, frozen|null` — frozen은 실제 선택된 은행 entry의 전체 payload와 순서·출처·선택 형식·내용 해시. 발행 원고·자산과 함께 manifest에 들어간다.

기존 개념백지 selection에 선택적 `pick`을 추가한다. 각 갈래의 정확한 항목 ID와 순서를 포함하고 해당 section/level/form과의 참조를 검증한다. 없으면 기존 compose 동작과 저장본/지면 코드가 그대로다. 있으면 임의 stock 상위 n개로 대체하지 않는다. `pick`이 있는 선택의 지면 코드는 별도 버전으로 정확히 왕복하거나 명확히 미제공한다. 기존 코드로 다른 선택을 부호화하지 않는다. 정확한 schema 형태는 기존 selection을 읽고 가장 작은 하위 호환 확장으로 확정한다.

학생의 백지 활동은 `textbook_concept_attempt`에 저장한다. `attemptId/requestId/studentId/editionId/conceptKey/frozenHash/form/channel/response/submittedAt/revision`과 교사의 `reviewStatus/reviewedBy/reviewedAt/note`를 구분한다. channel은 `student-text` 또는 `teacher-observed`. 새 제출은 새 attempt며 원 응답을 덮어쓰지 않는다. 교사 확인은 expectedRevision으로 충돌을 검사한다. 응답은 교재 데이터·학생 숙달 정본과 별도다. 학생 백지는 서버에서 answers/why/hidden keywords/교사 메모를 제거한 문항 모델로 만든다. 키워드 빈칸을 CSS로 가리는 것은 허용하지 않는다.

## 해시와 원문

호환·학습 문맥의 추가 고정 사항:

- 선택 확장과 `conceptKeys`가 없던 패키지에는 파싱 시 기본 빈 배열/null을 삽입하지 않는다. 읽기 전용 보관본은 원래 바이트/manifest를 유지한다. 새 reader의 과거 파일 호환과 옛 strict reader의 새 확장 지원은 다르다. 후자는 명시적 지원 없으면 오류다.
- exact `pick` 지면은 이번 범위에서 기존 60자 지면 코드를 찍지 않는다. 정확한 선택은 패키지/서버 기록에 남으며 이전 코드로 축약하지 않는다. frozen에는 선택 section 라벨·순서 및 파서/조합 버전도 포함한다. 과거 지면을 구성할 때 현재 `getBlankSection`의 이름·존재 여부에 의존하지 않는 resolved section 입력을 둔다.
- `givenCase`가 recall에 맞지 않거나 형식/난이도와 pick이 충돌하면 누락시키지 않고 오류를 낸다. 개념의 일치가 필요한 문항 연결은 교재 item의 검수된 `conceptKeys`로만 표시한다. 현재 `Problem.unitId`나 courseBank의 가공 결과로 exact 개념을 증명하지 않는다.
- 복습 시작 응답은 `started | resumed | deferred | unavailable`을 구분한다. 현재 엔진의 repair가 여러 카드 구성을 요구하는 경우 단일 카드 복습을 했다고 표시하지 않는다. 기록에 없는 카드는 `unavailable`, 기존 미완료 미션은 `resumed/deferred` 안내이며 요청 없는 GET은 학습 상태를 변경하지 않는다.
- 학생 텍스트는 학생 삭제 시 기존 학생 활동 삭제 수명에 맞춰 삭제하고, 학생 응답을 인쇄 판본 불변 blob이나 교사 교환 패키지에 넣지 않는다. 임의의 자동 만료/보상/숙달 전환은 추가하지 않는다.
- 교사 `parseConceptBlankView` 기본값은 정답을 포함할 수 있고 `loadGradeBank`는 답을 가진 은행을 읽는다. 새 학생 경로가 교사 인쇄 URL에 query만 바꾸거나 은행 전체를 번들에 싣는 방식은 금지한다.

`canonicalJson(value)`는 검증한 JSON만 받는다. 객체 key는 UTF-16 code unit 순서로 정렬하여 직접 문자열을 구성하고 배열 순서는 보존한다. JSON.stringify의 정수형 key 재배열에 의존하지 않는다. 문자열 escaping/숫자 표기는 ECMAScript JSON 규칙이며 NFC 변환·공백 정리·줄바꿈 변환을 하지 않는다. UTF-8, BOM 없음, 끝 개행 없음. undefined/NaN/Infinity/sparse array/중복 key/유효하지 않은 UTF-8·고립 surrogate/음의 0을 입력에서 거부한다. parser와 Zod를 거친 뒤 canonical 함수를 호출한다.

- `contentHash`: ProblemPayload 전체. assetId와 figure 순서/choiceIndex/sourceWidthMm 포함. metadata/rawSource/id/time/page/QR/URL 제외.
- `conceptContentHash`: 고정 원고 body 및 ordered entry payload와 순서·자산 byte hash·mapping version의 명시적 projection. 표시명만 남기고 정의/정답을 빼지 않음.
- `manifestHash`: config, editionId/label, units 원고, **스냅샷 전체 불변 출처/메타데이터/rawSource/payload/hash**, items, 개념 전체 고정 연결/내용, 자산 id/mime/sha256/실측치수, QR 대상/url, pageMap, renderer/template/canonicalization version. asset packagePath는 포장 위치라 제외하며 별도 package 파일 manifest로 검증. exportedAt/publishedAt/status/revision/manifestHash 자체와 mutable video 상태/URL은 제외. schemaVersion 포함.
- artifact hash: 실제 PDF/HTML/ZIP 바이트. 원문 hash와 서로 대체하지 않음. 파일 목록 manifest는 경로·크기·sha256을 포함.

최소 고정 vector: key 순서만 변경 동일, 그림 배열/답/해설/choiceIndex/물리폭 변경 상이, NFC/NFD·CRLF/LF 상이, 원 source ID/code 변경 content 동일·manifest 상이, packagePath 변경 content/edition manifest 동일·package manifest 상이, assetId 재발급 content 상이, mutable video 변경 edition manifest 동일, 다른 ID의 같은 payload 자동 병합 없음, 개념 entry 정의/순서·검수 hash 변경 manifest 상이. 테스트 기대 digest는 별도 독립 Node 계산과 비교한다.

## 교사와 학생 API

teacher prefix `/api/textbook`, student prefix `/api/learn/textbook`. Next params는 Promise다. 모든 handler는 공통 auth/에러 기록과 no-store 정책을 사용한다. routeAccess 패턴에는 지원되는 `{id}` 토큰만 사용한다. 입력 requestId UUID와 작업별 bodyHash를 저장해 같은 요청/다른 본문 재사용을 409로 막는다. 오류는 `{code,message,issues?}` 기존 응답 관례에 맞춘다.

| 경로 | 동작·계약 |
| --- | --- |
| `/books` GET/POST | 범위 내 목록 / title·config로 새 초안 생성 |
| `/books/{id}` PATCH | 목록 제목·공유·보관; 실제 원고 제목은 edition config |
| `/books/{id}/editions` POST | 빈 초안 또는 기존판 복제. 한 활성 초안 |
| `/editions/{id}` GET/PATCH | 요약/config/outline 및 structureRevision CAS |
| `/editions/{id}/sections/{id}` GET/PUT/DELETE | 구획 read/save, expectedRevision + body, 응답에 구획 revision과 판본 aggregateRevision |
| `/editions/{id}/items` POST | source Test 또는 ordered Problem IDs 캡처. 같은 입력 순서·제외 사유 유지 |
| `/editions/{id}/items/{id}` PATCH | 학습 단계/풀이선/영상 정책/검수된 conceptKeys |
| `/editions/{id}/items/{id}/diff,recapture,link,register` | 현재 원문 비교 / 새 snapshot / 후보 확인 / 기존 등록·검수 정책으로 신규 등록 |
| `/editions/{id}/concepts` GET/POST | 원고 개념 목록/추가 |
| `/editions/{id}/concepts/{id}` GET/PUT | 개념 원고와 exact refs, revision CAS |
| `/editions/{id}/concepts/{id}/blank` GET | 교사 권한의 frozen/current selection·정확한 sheets + 출처 |
| `/concepts/catalog,lookup` GET | 실제 은행 항목 검색 / 접근 가능한 교재의 역방향 참조 |
| `/editions/{id}/publish/preflight,reserve,steps/next,finalize` POST | 읽기 검수 / revision+requestId 예약 / requestId로 서버 작업 / requestId로 확정 |
| `/editions/{id}/publish/{id}` GET | 서버 작업 상태/진단/검증한 산출물 참조 |
| `/editions/{id}/export` GET | 조각 조회. published 원 manifest 검증 |
| `/imports` POST 및 chunks | `archive` 보관본/`copy` 새 원고 명시. 누락 없이 validate, 복사시 ID map |
| `/uploads/{sha256}` PUT, `/uploads/{sha256}/complete` POST | 1MB 이하 조각, 최종 바이트/hash/MIME 확인 |
| `/editions/{id}/assets/{id}`, `/artifacts/{id}` GET | 허용한 판본 관계 검사 뒤 byte range |
| `/videos`, `/snapshots/{id}/bindings`, `/bindings/{id}` | 실제 영상 등록·검수·게시·중지 |
| `/editions/{id}/assignments` GET/POST/DELETE | class XOR student, 명시 범위, 시작/만료/회수 |
| `/editions/{id}/reissue` POST | snapshot 연결을 가진 새 Test 생성, requestId/selected itemIds/class scope |
| `/students/{id}/concept-evidence` GET | 권한 있는 학생의 백지 확인/탐험/시험 관측을 출처별 병렬 표시 |
| `/concept-attempts/{id}/review` PUT | 교사 관찰/확인, expectedRevision |
| `/q/{slug}` page, `/api/learn/textbook/q/{id}` GET | QR 배정 확인·문제/개념 DTO·허용 영상/글 해설 |
| `/api/learn/textbook/editions/{id}/concepts/{id}` GET | 배정된 판본 개념/답 없는 백지/기존 복습 접근 상태 |
| 같은 경로 `/attempts` POST | 본문 requestId/form/response, studentId는 세션에서만 |
| 같은 경로 `/review` POST | 본문 requestId만. 서버가 검수된 연결·기존 복습 자격·진행 중 미션 검사, 기존 엔진으로 실제 활동 시작 또는 안내 |

학생에게 임의 cardId/학생ID를 받아 연결 범위를 넓히지 않는다. `/learn` 진입 문맥은 edition/concept reference를 서버에서 해석하며 안전한 내부 복귀 경로만 허용한다. 기존 학생 첫 비밀번호 변경 동선까지 이어진다. 교사와 학생이 같은 QR을 열 때 세션 종류에 맞는 화면을 제공하고 로그인 루프를 만들지 않는다.

## 저장·발행 경계

Claude architecture v02의 17개 전용 표와 통합 v03의 개념/활동 2개 표를 기반으로 실제 FK/CHECK/trigger를 검증한다. section은 UUID PK + unique(edition,unit_key,section_key). source 원본 삭제 시 nullable snapshot.problem_id만 바뀔 수 있고 immutable sourceRef는 남는다. 교재 child들은 동일 edition/owner와 자산 접근 범위를 증명해야 하며 UUID 존재 검사만으로 통과하지 않는다.

개념/구획/item 저장은 각 CAS와 판본 aggregate revision을 같은 트랜잭션에서 올린다. 발행은 고정 aggregateRevision. 예약 QR은 불변 대상·학생 비공개. 작업 lease는 CAS로 잡고 결과 바이트 저장 후 작업 완료를 기록한다. finalize 입력에서 pageMap/PDF hash/통과 flags를 받지 않는다. 서버의 검증 완료 작업만 결합하고 revision을 다시 확인해 부모 published 전환을 마지막에 한다. 실패 재시도는 기존 요청 결과를 사용한다.

TestProblem nullable snapshot_id는 별도 additive migration. 스냅샷이 없는 기존 시험지 동작은 그대로다. `snapshotId`가 있는데 관계가 없거나 source problemId가 다르면 오류로 닫는다. 필드별 null-coalescing으로 live 본문/해설/그림을 섞지 않는다. 시험지에서 같은 problemId의 두 배치를 구분할 응답 계약은 현재 없으므로 교재 내 반복 배치는 허용하되 **시험지 재출제에서 중복 problemId 선택은 이유를 알리고 거절**한다. 이를 몰래 한 문제로 줄이지 않는다.

실제 내용 독자는 `loadTestProblemItems/serializeTestProblemItem`, `tests/[id]/print`의 `toPrintProblem`, `submitTestResult`, `gradeSheet.loadProblems/saveGradingMarks`, `replaceTestProblemAtSeq`다. `generateDraftTest`는 공통 serializer의 관계 타입만 맞춘다. `dev/retry-wire`의 직접 본문 읽기도 가드 대상이다. PDF/HWPX writer는 DB를 읽지 않으므로 진입부에서 snapshot 렌더 모델과 고정 자산 바이트를 전달한다. 캡처 학년·단원 표시·난도·원본 배점을 명시적 메타데이터로 보존하고 `tp.score`의 시험지 배점 우선 규칙을 유지한다. `achievement/load.ts`의 성적 분석에서도 snapshot 시험지는 해당 메타데이터를 사용해야 교사 요약에 최신 은행 정보가 섞이지 않는다.

`/api/tests/{id}/submit`는 현재 교사 세션의 학생 응답 입력 경로다. 새 디지털 학생 시험 제출 API가 이미 있는 것처럼 표시하지 않는다. 교재의 문제 풀이 결과는 이 기존 채점과 실제 SRS 활동에서 읽으며, 백지 텍스트 응답만 별도 학생 경로로 추가한다. 학생 응답/수업 기록 삭제 정책과 발행본 불변 보존 정책은 별도이며 학생 개인 응답은 교환 패키지에 포함하지 않는다.

## 의존성 후보와 검증

2026-10-03 npm registry 확인: `qrcode@1.5.4`, `jsqr@1.4.0`, `fflate@0.8.3`, `pdf-lib@1.17.1`; 격리 SQL 시험 `@electric-sql/pglite@0.5.8` 개발 의존성. 설치 전 의존·배포 번들 경계를 확인하고 실제 추가시 exact version을 고정한다. 현재 설치한 것은 없다. 기존 `pdfjs-dist`/`puppeteer-core`/KaTeX/로컬 Pretendard를 재사용한다.

공식 근거: [QR 생성](https://github.com/soldair/node-qrcode), [QR 픽셀 디코드](https://github.com/cozmo/jsQR), [ZIP 스트리밍](https://github.com/101arrowz/fflate), [PDF 페이지 병합](https://pdf-lib.js.org/docs/api/classes/pdfdocument), [격리 Postgres](https://pglite.dev/docs/). 전체 ZIP을 무제한 unzipSync하는 경로는 만들지 않는다. 파일 수·압축/실제 누적 해제 바이트·경로·중복 이름·CRC/sha256·MIME를 검증한다. QR은 생성 SVG 자체가 아니라 PDF를 래스터화한 픽셀에서 각 배치 위치를 전수 읽는다.

P1 완료는 strict 계약과 독립 hash/ref vectors, 기존 selection 호환 벡터, 공유 import 방향, migration 설계에 대한 세 모델의 명시적 승인이다. P2 구현 완료나 운영 적용으로 표시하지 않는다.
