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
- `ProblemSnapshot.rawSource`에 원본 `figureUrls/figureDims/figureSourceMm/choiceFigureIndex` 배열과 원본 SVG 바이트 자산 참조(`figureSvgAssetId`)를 명시한다. 잘못된 원본 배열도 보존하고 렌더 가능한 해석 및 오류와 구분한다. 실제 측정 자산 치수는 `AssetRef`의 값이다. `sourceMetadata`는 캡처 당시 unitId·단원명·학년·난도·원본 배점을 보존한다. rawSource/sourceMetadata는 payload contentHash 밖이고 별도 snapshotHash로 결합한다.
- 개념 QR은 별도 `conceptQrTargets` 명시적 확장이다. problem QR의 itemId 자리에 개념 ID를 넣지 않는다.
- `Section`에 `teacherAnswer?: string` — 구획 정답 메모(2026-10-04 추가, 관리자 사용성 후속 T01). 교사만 보는 구획 단위 자유 글이며 문항 정답 `ProblemPayload.answer`와 다른 것이다. 글이 있을 때만 키를 두고, 빈 글·공백뿐인 글·`null`·파싱 기본값은 허용하지 않는다. 키가 없는 구획은 이 확장을 더하기 전과 같은 바이트로 직렬화되어 기존 판본의 manifestHash가 그대로다. 값이 있으면 `units` 원고의 일부로 manifestHash에 들어간다. 저장은 기존 `textbook_section.content` JSONB의 형제 키이며 새 칸·migration은 없다. 교사용 구획 read/write·409의 `serverSection`·판본 복제·교사용 교환 형식(내보내기·가져오기)에 실린다. 학생용 렌더 모델·학생 PDF/HTML·배정/학습/QR 응답에는 싣지 않고, 서버 해설 PDF에도 조판하지 않는다(지면 변경 없음). 옛 strict reader는 이 키가 든 패키지를 거절한다.

단원 키는 판본 내 유일하다. 구획 키는 **(unitKey, sectionKey)** 안에서 해석한다. 교환 문항과 블록의 참조는 이 두 키를 사용한다. 서버 내부 구획은 UUID `sectionId`로 API에 노출해 같은 이름의 준비학습 구획끼리 충돌하지 않게 한다. 문항의 `orderIndex`와 블록의 실제 참조 순서가 충돌하면 발행 오류다. 서로 다른 item이 같은 snapshot을 쓰는 반복 배치는 허용하고 item별 QR을 발급한다.

## 개념 및 백지

`TextbookConcept`의 정체는 `(editionId, conceptKey)`다. 개념 row가 초안의 연결과 발행 후 고정 내용을 보관한다. 별도 중복 개념 snapshot 표를 만들지 않고 발행 시 동일 행을 트리거로 잠근다. 교재 원고 개념과 외부 참조는 동치 ID가 아니다.

- `conceptKey, unitKey, sectionKey|null, title, kind, unitId|null`
- `body: {goal, prerequisites:string[], definition, conditions|null, examples:string[], counterexamples:string[], misconceptions:string[], explainPrompt|null}` — 사람에게 보이는 원고, prerequisites는 글이며 그래프 간선이 아니다.
- `blankItems: [{blankSectionKey,entryKind:'concept'|'ox'|'apply'|'figure',entryId,review}]` — 배열 순서 유지. 같은 대상 중복 거부. blankSectionKey는 은행의 학년::대단원::소단원이며 교재 sectionKey와 다르다.
- `links: [{linkId,target,relation:'same'|'covers-part'|'related',review}]` — target은 explorer-card/cardId, course-section/courseSectionId, graph-unit/graphUnitId. DB unitId는 별도 FK. 교재의 sectionId는 구획 UUID만 뜻한다.
- `review: {status:'candidate'|'confirmed'|'rejected',candidateRule:'unit-triple'|'bridge'|'manual',reviewedBy|null,reviewedAt|null,targetHash|null}` — confirmed 필드는 서버가 채운다. 타 계정 패키지의 확인자 주장을 현 계정의 승인으로 취급하지 않는다.
- `mappingVersion, derivedFromConceptKey|null, frozen|null` — frozen은 실제 선택된 은행 entry의 전체 payload와 순서·출처·선택 형식·내용 해시. 발행 원고·자산과 함께 manifest에 들어간다.

기존 개념백지 strict selection에 선택적 `pick: Array<{blankSectionKey, entryKind:'concept'|'ox'|'apply'|'figure', entryId, form:'recall'|'term'|'cloze'|'map'|'figure', level:'하'|'중'|'상'}>`을 추가한다. blankSectionKey는 기존 sectionKeySchema, entryId는 기존 은행 ID 스키마다. 전체 1~2000개, 같은 `(form,entryKind,entryId)` 중복은 오류다. 같은 개념을 서로 다른 형식으로 고르는 것은 허용한다. 그룹(form,blankSectionKey)은 첫 등장 순서, 그룹 안은 pick 순서로 조판하고 그룹이 떨어져 재등장하면 순서 충돌 오류다. 형식별 counts/extras는 정확한 pick 개수와 일치해야 한다. concept은 recall/term/cloze/map, ox는 term extras, apply는 cloze extras, figure는 figure만 가능하다. source section/level이 실제 항목과 같아야 하며 recall의 givenCase는 거절한다. 없으면 기존 compose 동작과 저장본/지면 코드가 그대로다. 있으면 알 수 없는 ID·불일치를 오류로 표시하고 임의 stock 상위 n개로 대체하지 않는다. pick 지면에는 이번 범위에서 지면 코드를 제공하지 않는다.

학생의 백지 활동은 `textbook_concept_attempt`에 저장한다. `attemptId/requestId/bodyHash/studentId/editionId/conceptKey/frozenHash/form/channel/response/submittedAt/revision`과 교사의 `reviewStatus/reviewedBy/reviewedAt/note`를 구분한다. channel은 `student-text` 또는 `teacher-observed`. 학생 텍스트는 recall/term/cloze, map/figure는 교사 종이 확인으로 지원한다. reviewStatus는 pending/checked/needs-review이며 needs-review는 교사 확인용 복습 후보 사유다. 새 제출은 새 attempt며 원 응답을 덮어쓰지 않는다. 교사 확인은 expectedRevision으로 충돌을 검사한다. 응답은 교재 데이터·학생 숙달 정본과 별도다. 학생 백지는 서버에서 answers/why/hidden keywords/교사 메모를 제거한 문항 모델로 만든다. 키워드 빈칸을 CSS로 가리는 것은 허용하지 않는다.

## 해시와 원문

호환·학습 문맥의 추가 고정 사항:

- 선택 확장과 `conceptKeys`가 없던 패키지에는 파싱 시 기본 빈 배열/null을 삽입하지 않는다. 읽기 전용 보관본은 원래 바이트/manifest를 유지한다. 새 reader의 과거 파일 호환과 옛 strict reader의 새 확장 지원은 다르다. 후자는 명시적 지원 없으면 오류다.
- exact `pick` 지면은 이번 범위에서 기존 60자 지면 코드를 찍지 않는다. 정확한 선택은 패키지/서버 기록에 남으며 이전 코드로 축약하지 않는다. frozen에는 선택 section 라벨·순서 및 파서/조합 버전도 포함한다. 과거 지면을 구성할 때 현재 `getBlankSection`의 이름·존재 여부에 의존하지 않는 resolved section 입력을 둔다.
- pick selection은 `?s=` URL에 싣지 않는다. 인쇄는 저장 문서 ID 또는 교재 개념 참조로 서버에서 읽고, `?s=`용 decoder는 pick 포함 입력을 거절한다. 기존 pick 없는 URL 동작은 유지한다. 교재에서 개념백지로 이동할 때도 큰 선택 JSON 대신 권한을 확인한 서버 참조를 사용한다.
- `givenCase`가 recall에 맞지 않거나 형식/난이도와 pick이 충돌하면 누락시키지 않고 오류를 낸다. 개념의 일치가 필요한 문항 연결은 교재 item의 검수된 `conceptKeys`로만 표시한다. 현재 `Problem.unitId`나 courseBank의 가공 결과로 exact 개념을 증명하지 않는다.
- 복습 시작 응답은 `started | resumed | deferred | unavailable`을 구분한다. 현재 엔진의 repair가 여러 카드 구성을 요구하는 경우 단일 카드 복습을 했다고 표시하지 않는다. 문자열 피드백을 해석하지 않고 같은 CAS에서 전후 도전 ID·미완료/미해결 상태로 계산한다. 새 도전 생성은 started, 미완료 도전 유지는 resumed, 완료했으나 미해결이 남아 재도전이 먼저면 deferred, 연결/학생 기록/탐험 기록이 없으면 unavailable + reasonCode다. 기존 영수증 스키마는 바꾸지 않는다. 같은 requestId 재시도는 추가 상태 변경 없이 현재 상태로 resumed/deferred를 반환하고 `replayed:true`를 붙인다. 둘 다 아니면 unavailable/reasonCode=already-processed다. started는 실제 도전을 생성한 첫 요청에만 표시한다. 요청 없는 GET은 학습 상태를 변경하지 않는다.
- 학생 텍스트는 학생 삭제 시 기존 학생 활동 삭제 수명에 맞춰 삭제하고, 학생 응답을 인쇄 판본 불변 blob이나 교사 교환 패키지에 넣지 않는다. 임의의 자동 만료/보상/숙달 전환은 추가하지 않는다.
- 교사 `parseConceptBlankView` 기본값은 정답을 포함할 수 있고 `loadGradeBank`는 답을 가진 은행을 읽는다. 새 학생 경로가 교사 인쇄 URL에 query만 바꾸거나 은행 전체를 번들에 싣는 방식은 금지한다.

`canonicalJson(value)`는 검증한 JSON만 받는다. 객체 key는 UTF-16 code unit 순서로 정렬하여 직접 문자열을 구성하고 배열 순서는 보존한다. JSON.stringify의 정수형 key 재배열에 의존하지 않는다. 문자열 escaping/숫자 표기는 ECMAScript JSON 규칙이며 NFC 변환·공백 정리·줄바꿈 변환을 하지 않는다. UTF-8, BOM 없음, 끝 개행 없음. undefined/NaN/Infinity/sparse array/유효하지 않은 UTF-8·고립 surrogate/U+0000/음의 0/안전 정수 범위 밖 정수를 입력에서 거부한다. 가져오기·보관 패키지와 새 교재 API의 원본 JSON 바이트를 제한된 토큰 파서로 읽어 JSON.parse/request.json 전에 중복 key를 검출한다. 기존 다른 API 파서를 일괄 바꾸지 않는다. 토큰 검사와 Zod 후 canonical 함수를 호출한다.

- `contentHash`: ProblemPayload 전체. assetId와 figure 순서/choiceIndex/sourceWidthMm 포함. metadata/rawSource/id/time/page/QR/URL 제외.
- `snapshotHash`: 불변 sourceRef + sourceMetadata + rawSource + contentHash. capturedAt/sourceUpdatedAt은 이 hash에서 제외한다. snapshot 유일성은 `(owner,sourceIdentity,snapshotHash)`로 두어 같은 payload에서 메타데이터만 바뀐 새 캡처를 구별한다. 영상 검수는 contentHash를 사용한다.
- `conceptContentHash`: 고정 원고 body 및 ordered entry payload와 순서·자산 byte hash·mapping version의 명시적 projection. 표시명만 남기고 정의/정답을 빼지 않음.
- `manifestHash`: config, editionId/label, units 원고, snapshot별 `{snapshotId,contentHash,snapshotHash}`, items, 개념 전체 고정 연결/내용, 자산 id/mime/sha256/실측치수, QR 대상/url, pageMap, renderer/template/canonicalization version. 스냅샷 원문·출처는 위 두 hash를 정본에서 다시 계산해 결합한다. asset packagePath는 포장 위치라 제외하며 별도 package 파일 manifest로 검증. exportedAt/publishedAt/status/revision/manifestHash 자체와 mutable video 상태/URL은 제외. schemaVersion 포함.
- artifact hash: 실제 PDF/HTML/ZIP 바이트. 원문 hash와 서로 대체하지 않음. 파일 목록 manifest는 경로·크기·sha256을 포함.

최소 고정 vector: key 순서만 변경 동일, 그림 배열/답/해설/choiceIndex/물리폭 변경 상이, NFC/NFD·CRLF/LF 상이, 원 source ID/code 변경 content 동일·manifest 상이, packagePath 변경 content/edition manifest 동일·package manifest 상이, assetId 재발급 content 상이, mutable video 변경 edition manifest 동일, 다른 ID의 같은 payload 자동 병합 없음, 개념 entry 정의/순서·검수 hash 변경 manifest 상이. 테스트 기대 digest는 별도 독립 Node 계산과 비교한다.

## 교사와 학생 API

teacher prefix `/api/textbook`, student prefix `/api/learn/textbook`. Next params는 Promise다. 모든 handler는 공통 auth/에러 기록과 no-store 정책을 사용한다. routeAccess 패턴에는 지원되는 `{id}` 토큰만 사용한다. teacher 요청은 전용 요청 기록에 requestId UUID와 검증된 본문의 canonical bodyHash를 저장한다. 학생 백지 요청은 활동 행의 `(studentId,requestId)`와 bodyHash, 학생 복습 시작은 기존 탐험 영수증을 사용한다. 다른 주체의 FK를 억지로 넣지 않는다. 같은 요청/다른 본문 재사용은 409다. 오류 응답은 기존 관례를 따른다.

권한 경로는 층을 구분한다. `{id}`는 studentRouteAccess/routeAccess 패턴 문법이며 `accountRouteAllowed`는 prefix 비교다. 후자에는 `/api/textbook`·교재 인쇄 경로·교사 QR 미리보기(`/q`)를 `textbook` 메뉴로 명시한다. `/api/learn/textbook`는 학생 관문을 먼저 통과하며 교사 메뉴 접근만으로 학생 API가 열리지 않는다. `/q`의 익명은 안전한 로그인 복귀, 학생은 배정 확인, 교사는 명시적 메뉴+소유 미리보기 순으로 분기한다. Next 폴더는 `[editionId]/.../[sectionId]`처럼 서로 다른 segment 이름을 사용한다.

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
| `/editions/{id}/concepts/{id}/attempts` POST | 권한 있는 교사의 teacher-observed 종이 활동 생성. studentId/requestId/form/observation |
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
| `/api/learn/textbook/q/{id}/assets/{id}` GET | 해당 QR의 고정 문항/개념에서 참조하는 자산만, 매 요청 배정 확인 |
| `/api/learn/textbook/editions/{id}/concepts/{id}` GET | 배정된 판본 개념/답 없는 백지/기존 복습 접근 상태 |
| 같은 경로 `/attempts` POST | 본문 requestId/form/response, studentId는 세션에서만 |
| 같은 경로 `/review` POST | 본문 requestId만. 서버가 검수된 연결·기존 복습 자격·진행 중 미션 검사, 기존 엔진으로 실제 활동 시작 또는 안내 |

학생에게 임의 cardId/학생ID를 받아 연결 범위를 넓히지 않는다. `/learn` 진입 문맥은 edition/concept reference를 서버에서 해석하며 안전한 내부 복귀 경로만 허용한다. 기존 학생 첫 비밀번호 변경 동선까지 이어진다. 교사와 학생이 같은 QR을 열 때 세션 종류에 맞는 화면을 제공하고 로그인 루프를 만들지 않는다.

## 저장·발행 경계

Claude architecture v02의 17개 전용 표, 통합 v03의 개념/활동 2개와 `textbook_archive` 1개를 기반으로 실제 FK/CHECK/trigger를 검증한다. 보관본은 자체 archiveId·owner와 검증한 패키지 바이트를 보관하며, 원 ID를 살아 있는 책/판본/QR 표에 INSERT하지 않는다. 읽기 전용 viewer는 패키지 정체를 유지하지만 외부 QR을 우리 서비스에 활성화하지 않는다. 새 원고 복사만 별도 이동표를 거쳐 실제 표에 적재한다.

section은 UUID PK + unique(edition,unit_key,section_key). source 원본 삭제 시 nullable snapshot.problem_id만 바뀔 수 있고 immutable sourceRef는 남는다. 교재 child들은 동일 edition/owner와 자산 접근 범위를 증명해야 하며 UUID 존재 검사만으로 통과하지 않는다. 배치/개념의 `(editionId,sectionId)`와 QR의 `(editionId,itemId)`는 복합 FK로 동일 판본을 보장한다.

개념/구획/item 저장은 각 CAS와 판본 aggregate revision을 같은 트랜잭션에서 올린다. 발행은 고정 aggregateRevision. 예약 QR은 불변 대상·학생 비공개. 작업 lease는 CAS로 잡고 결과 바이트 저장 후 작업 완료를 기록한다. finalize 입력에서 pageMap/PDF hash/통과 flags를 받지 않는다. 서버의 검증 완료 작업만 결합하고 revision을 다시 확인해 부모 published 전환을 마지막에 한다. 실패 재시도는 기존 요청 결과를 사용한다.

TestProblem nullable snapshot_id는 별도 additive migration. 스냅샷이 없는 기존 시험지 동작은 그대로다. `snapshotId`가 있는데 관계가 없거나 source problemId가 다르면 오류로 닫는다. 필드별 null-coalescing으로 live 본문/해설/그림을 섞지 않는다. 시험지에서 같은 problemId의 두 배치를 구분할 응답 계약은 현재 없으므로 교재 내 반복 배치는 허용하되 **시험지 재출제에서 중복 problemId 선택은 이유를 알리고 거절**한다. 이를 몰래 한 문제로 줄이지 않는다.

실제 내용 독자는 `loadTestProblemItems/serializeTestProblemItem`, `tests/[id]/print`의 `toPrintProblem`, `submitTestResult`, `gradeSheet.loadProblems/saveGradingMarks`, `replaceTestProblemAtSeq`다. `generateDraftTest`는 공통 serializer의 관계 타입만 맞춘다. `dev/retry-wire`의 직접 본문 읽기도 가드 대상이다. PDF/HWPX writer는 DB를 읽지 않으므로 진입부에서 snapshot 렌더 모델과 고정 자산 바이트를 전달한다. 캡처 unitId·학년·단원 표시·난도·원본 배점을 명시적 메타데이터로 보존하고 `tp.score`의 시험지 배점 우선 규칙을 유지한다. `achievement/load.ts`의 성적 분석에서도 snapshot 시험지는 해당 메타데이터를 사용해야 교사 요약에 최신 은행 정보가 섞이지 않는다.

`contentOf`의 동일성 검사는 nullable snapshot.problemId가 아니라 불변 source.problemId와 TestProblem.problemId를 비교한다. 내용·정답·해설·형식·모든 그림 정보·캡처 unitId/난도/학년/원본 배점·표시용 저장 코드는 snapshot에서 읽는다. 현재 Problem의 ID·검수 상태·pool·출제 자격은 운영 권한/자격 검사에 사용한다. 재출제 Test 생성은 수동 바구니 출제와 공유하는 생성 함수로 필수 testType/rangeEndUnitId/자격 검사를 유지한다.

`/api/tests/{id}/submit`는 현재 교사 세션의 학생 응답 입력 경로다. 새 디지털 학생 시험 제출 API가 이미 있는 것처럼 표시하지 않는다. 교재의 문제 풀이 결과는 이 기존 채점과 실제 SRS 활동에서 읽으며, 백지 텍스트 응답만 별도 학생 경로로 추가한다. 학생 응답/수업 기록 삭제 정책과 발행본 불변 보존 정책은 별도이며 학생 개인 응답은 교환 패키지에 포함하지 않는다.

## 의존성 후보와 검증

2026-10-03 npm registry 확인: `qrcode@1.5.4`, `jsqr@1.4.0`, `fflate@0.8.3`, `pdf-lib@1.17.1`; 격리 SQL 시험 `@electric-sql/pglite@0.5.8` 개발 의존성. 설치 전 의존·배포 번들 경계를 확인하고 실제 추가시 exact version을 고정한다. 현재 설치한 것은 없다. 기존 `pdfjs-dist`/`puppeteer-core`/KaTeX/로컬 Pretendard를 재사용한다.

공식 근거: [QR 생성](https://github.com/soldair/node-qrcode), [QR 픽셀 디코드](https://github.com/cozmo/jsQR), [ZIP 스트리밍](https://github.com/101arrowz/fflate), [PDF 페이지 병합](https://pdf-lib.js.org/docs/api/classes/pdfdocument), [격리 Postgres](https://pglite.dev/docs/). 전체 ZIP을 무제한 unzipSync하는 경로는 만들지 않는다. 파일 수·압축/실제 누적 해제 바이트·경로·중복 이름·CRC/sha256·MIME를 검증한다. QR은 생성 SVG 자체가 아니라 PDF를 래스터화한 픽셀에서 각 배치 위치를 전수 읽는다.

P1 완료는 strict 계약과 독립 hash/ref vectors, 기존 selection 호환 벡터, 공유 import 방향, migration 설계에 대한 세 모델의 명시적 승인이다. P2 구현 완료나 운영 적용으로 표시하지 않는다.
