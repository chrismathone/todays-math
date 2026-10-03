# 교재·개념백지·학생 학습 통합 검토 — Codex v03

2026-10-03 KST. **계획/구조 검토만 수행했다.** 제품 구현·DB 변경·유료 AI 호출·merge·push는 하지 않았다. 이 보고서 하나만 이번 변경이다. 이전 source 검토 커밋 `ba8439cfdafc5667cc8e801937cb5b53e4b65442`와 두 source 보고서는 보존한다.

## 1. 표결과 적용 범위

coordinator가 동결해 보낸 `C:/Users/user/orca/workspaces/todays-math/textbook-tab-20261003/docs/planning/textbook-studio-20261003.md` 전체를 읽고 실제 SHA-256을 대조했다.

**계획 표결: APPROVE — `60a508c008ea24abfcb8b361f3c639fbc19a80147ff404c045db9eb9cbb40702`에만 적용.** 14:41 KST에 `msg_fead8f4b5d2b`로 전달했다. 정확한 항목 선택, 불변 개념 snapshot, 학생 텍스트 응답/교사 관찰의 분리, 기존 탐험 세션과 CAS 보존, 승인된 선수 시범 범위 유지가 이번 사용자 요구를 구체적인 제품 동작으로 포함했다. 아래 상세는 이 행동 합의의 P1 계약 인수 조건이며, 아직 작성하지 않은 API/DDL이나 제품 시험의 승인으로 해석하지 않는다. v02 해시의 승인을 재사용하지 않았다.

서버가 저장된 revision으로 조판하고 PDF·QR을 검증하는 발행, DB 불변성 방어, `TestProblem.snapshot_id`와 공통 `contentOf`, 좁은 학생 로그인 복귀, 보관본 열기와 새 원고 복사를 구분한 규칙도 확인했다. 과거 외부 검토의 «가져온 QR/pageMap/video 메타데이터 폐기» 제안은 적용하지 않는다. 동결 v03의 무손실 보관 규칙을 따른다.

**Wire 구조 표결: W3.** 실제 W1–W4 desktop/mobile PNG 8장과 `wire-review.html`을 읽었다. 14:37 KST에 `msg_5b6d31631fd2`로 구조 표결을 먼저 전달했다. Hi-fi4는 이번 표결 대상이 아니며, UI 구현 승인도 아니다. coordinator는 이 보고서를 Hi-fi 제작 완료 전에 마무리해도 된다고 명시했다.

## 2. 실제 코드에서 확인한 통합 공백

| 근거 | 현재 동작 | 교재 통합에서 필요한 구체적 조치 |
| --- | --- | --- |
| `src/contracts/conceptBlank.contract.ts`의 `conceptEntrySchema`, `conceptBlankBankSchema` | `concepts/ox/apply/figures`는 다른 구조의 코드 은행이다. 정의·핵심어·예·정답·SVG·`givenCase`가 있다. | 네 종류를 하나의 문항/정의 타입으로 뭉개지 않고 종류와 실제 ID를 함께 참조한다. |
| `src/lib/concept-blank/bank/index.ts:23`, `bank/load.ts:13` | 기존 기본/보강 은행을 합치며 클라이언트는 학년별 원본+보강 모듈을 늦게 읽는다. | 교재용 새 정본 은행을 복제하지 않는다. 학생 화면에 이 정답 포함 모듈을 그대로 싣지도 않는다. |
| `src/lib/concept-blank/bank/e5.ts:50`, `:609` | 삭제한 항목의 번호를 재사용하지 않는 정책이며 통분 첫 개념의 ID는 `e5-1-4-3-c1`이다. | 이 안정 ID를 사용한다. 같은 소단원의 공통분모/최소공배수 항목을 모두 통분과 동일 개념으로 합치지 않는다. |
| `src/lib/concept-blank/sections.ts:40` | `CURRICULUM_UNITS`에서 `학년::대단원::소단원` 문자열과 표시 순서를 만든다. | source section key와 표시 글을 보존한다. 제목 수정 후 현재 시드만 읽어서 옛 책을 재조합하지 않는다. |
| `src/lib/concept-blank/compose.ts:24`, `:55`, `:87` | 소단원을 정렬하고 난도별 개수로 순회 선택한다. 모르는 key는 제거한다. A는 `givenCase`를 제외하고 D/E는 빈 결과를 없앨 수 있다. | 정확한 ID/순서 선택 경로가 필요하다. 원고에서 고른 항목이 재선택·누락되는 것을 오류로 처리한다. |
| `conceptBlankDocumentSchema`, `ConceptBlankView.tsx:675` | 저장 payload는 날짜를 뺀 `{selection}`이며 정확한 항목 ID나 과거 은행 내용은 없다. | 기존 문서는 그대로 열되 교재 발행의 불변 콘텐츠 저장 방식으로 재사용하지 않는다. |
| `src/lib/concept-blank/sheetCode.ts:165`, `:180` | 선택과 조합/쪽 나눔 결과의 20비트 지문을 코드에 넣어 변경을 감지한다. 소단원은 현재 시드의 위치 번호로 해독한다. | 지면 코드는 과거 원문 복원/암호학적 동일성/학생 식별자가 아니다. SHA-256과 보존된 snapshot이 별도로 필요하다. |
| `src/app/(main)/concept-blank/print/page.tsx:49`, `paper/view.ts:4` | 교사 세션과 메뉴 아래 현재 은행으로 조합한다. `view` 누락/미지원 값은 학생지+채점표 `both`다. | 학생용 교재 백지는 별도 배정 관문·서버 projection으로 제공한다. 교사 인쇄 링크에 `view=student`만 붙이는 방식으로 개방하지 않는다. |
| `src/lib/math-explorers/definition-cards.ts:362`, `:374` | 앱 정본은 `applyCardFix`를 적용한 `definitionCards`다. `definitionSourceCards`는 검사/보정 도구 전용이다. | 수정 전 raw 카드를 교재 연결/학생 활동의 정본으로 읽지 않는다. 콘텐츠 버전을 함께 기록한다. |
| `src/lib/math-explorers/curriculumBridge.ts:78`, `:102`, `:219` | 초등 소단원→탐험 단원, 선택적인 카드 매핑이 있다. 중등도 일부 방정식 차시/카드 연결은 있다. 없는 연결은 null이다. | «초등만 연결됨»으로 단정하지 않는다. 다만 소단원 연결은 정확한 개별 백지 항목/문제와의 의미 동등성 증거가 아니다. |
| `prisma/schema.prisma:437`, `:725`; `src/lib/math-srs/courseBank.ts:19` | 일반 DB `Problem`은 `Unit`에 연결되며 공통 개념 항목 관계는 없다. 코스 은행 어댑터는 단원 triple로 DB를 찾고 반환 시 DB 문제 ID를 보존하지 않는다. | 정확한 문제별 개념 관계와 원천 증거는 검수된 매핑으로 추가해야 한다. 같은 단원인 모든 문제를 같은 개념 정답 증거로 세지 않는다. |
| `src/lib/math-srs/types.ts:1`, `:29` | 기존 중등 SRS의 `balance/two-step/.../fractions/word`와 `conceptWeights`는 생성 문항 엔진의 별도 분류다. | 이 ID를 백지 entry, 탐험 카드, 그래프 ID와 혼용하지 않는다. `fractions`를 초등 분수 선수 시범 전체로 연결하지 않는다. |
| `src/app/learn/page.tsx:13` | query에서 `view=collection`만 선택한다. 교재/판본/카드 출처를 받지 않는다. | 서버에서 검증한 교재 학습 문맥을 추가한다. URL에 카드 이름만 붙이면 통합된다는 가정은 성립하지 않는다. |
| `src/lib/math-explorers/routes.ts:71`, `engine.ts:90`, `definition-cards.ts:693` | 학생 인증, requestId 재생, revision 저장을 거친다. 시작 요청은 진행 중 세션을 이어줄 수 있으며 카드 세트는 5장이다. | 특정 한 개념을 눌렀다고 자동으로 새 퀘스트/goal을 덮어쓰지 않는다. 실제 시작/이어하기/보류 결과와 복귀 문맥을 전달한다. |
| `src/lib/math-explorers/teacherSummary.ts:134`, `teacherRoutes.ts:119` | 학생별 실제 카드/복습/세션을 기존 교사 범위에서 집계한다. | 여기에 별도 출처의 교재·백지·문제 결과를 읽기 관점으로 묶는다. 근거 없는 단일 숙달률을 새로 만들지 않는다. |
| `src/lib/math-prerequisite/mapping.ts:14`, `enabled.ts:2`, `evidence.ts:141` | 시범 대상/확인 소단원이 고정돼 있다. 명시적 ON만 활성화하며 자기채점·힌트 사용은 독립 정답 근거에서 제외한다. | 새 교재/백지 결과는 이 근거에 자동 유입시키지 않는다. 매핑 확장과 학생 추천 확장은 서로 다른 승인 대상이다. |

이번 검토 범위의 `src/contracts`, `src/lib`, Prisma에서 공통 `ProblemConcept` 정본이나 학생 개념백지 제출 API는 확인되지 않았다. 이미 구현됐다고 계획에 기록하지 않는다. 별도 개념 강의는 `ConceptLecture.unitId`라는 차시 연결이며 문제 해설 binding이나 백지 개별 개념의 동일성 관계가 아니다.

## 3. 공통 식별 계약 제안

공통 식별자는 새 개념 본문 은행이 아니라 **타입이 있는 source locator**다. 핵심 key는 `(namespace, entryKind, entryId)`이고 버전/해시는 그 내용 판을 가리킨다. 이름·교육과정 순서·URL·표시 번호·맨 앞 후보는 identity가 아니다. 여러 시스템의 이름이 같더라도 이 tuple들을 합치지 않는다.

| namespace / 종류 | 실제 식별자 예 | 의미 |
| --- | --- | --- |
| `conceptBlank` / `concepts` | `e5-1-4-3-c1` | 책과 백지가 공유할 정확한 은행 정의 항목 |
| `conceptBlank` / `ox`, `apply`, `figures` | 해당 은행의 실제 ID | 별도의 활동 문항. 정의 자체와 구분 |
| `explorer` / `card` | `g5-common-denominator` | 보정된 탐험 카드와 그 기존 기록 |
| `course` / `section` | `5-1-4-3` | 초등 코스 차시, 개별 개념보다 넓을 수 있음 |
| `database` / `unit` | 실제 `Unit.id` UUID | 현재 DB 차시 관계; 로컬에서 UUID를 지어내지 않음 |
| `mathGraph` / `unit` 또는 `topic` | `E56-N03`, 실제 topic ID | 편집 그래프 노드. contains와 prerequisite를 구별 |
| `mathSrs` / `generatedConcept` | `balance`, `fractions` | 기존 중등 엔진의 제한된 concept enum |

P1에서 다음 관계를 하나의 계약/검증기로 고정한다.

1. **원고 위치:** `bookId/editionId`와 `(unitKey, sectionKey, blockId)`. 교재 구획의 `sectionKey`는 각 `unitKey` 안에서 검사한다. 백지의 전체 source section key와 교재 구획 key는 다른 필드다. DB API에서 차시를 지목할 때는 검증한 `Unit.id`를 쓴다.
2. **핵심 정의 anchor:** 정확한 `conceptBlank/concepts/entryId`의 순서 있는 목록. 활동 refs에는 `ox/apply/figures`를 구분해 넣는다. `ConceptEntry.kind`의 정의/성질/방법 분류는 source 종류와 다른 축이다.
3. **외부 관계:** 탐험 card/course section/DB unit/graph ref 각각에 `relation`, `status`, `mappingVersion`, 검수 출처·검수자·시각을 둔다. `same-concept`는 검토된 의미 관계이지 바이트 동일성이 아니다. 넓은 `covers/context` 관계를 개별 개념 정답으로 승격하지 않는다. 미확인/후보/거절/확정 상태를 구별한다.
4. **문제 매핑:** `(problemId, problemSnapshotId 또는 sourceContentHash)`에 정확한 개념 refs와 `primary/supporting/context` 역할을 붙이고 검수 근거를 남긴다. 기존 `unitId`는 후보 검색 범위다. 문제 수치/질문/답/그림이 변하면 기존 매핑 판을 자동 확정하지 않는다. 현재 `courseBank`처럼 원천 ID가 없는 과거 코스 결과는 정확한 DB 문제로 역추정하지 않는다.
5. **버전 분리:** source release/내용 SHA-256, mapping version, composition/parser version, textbook renderer/template version은 각각 기록한다. source 수정과 관계 수정은 다른 변화다. 같은 ID의 내용 수정은 새 content hash/snapshot이며 옛 발행본은 변경하지 않는다.

예를 들어 통분 블록의 anchor `conceptBlank/concepts/e5-1-4-3-c1`과 `explorer/card/g5-common-denominator`를 사람이 확인한 관계로 연결할 수 있다. `curriculumBridge`의 `5-1-4-3 → g5-common-denominator`는 그 검토의 근거가 된다. 그렇다고 같은 백지 소단원의 모든 정의·O/X·적용 항목, DB 단원의 모든 문제, 그래프의 선행 단원을 한 개념으로 합치지는 않는다.

관계 원장은 본문을 중복 저장하는 새 정본 catalog가 아니다. 검색·표시 adapter는 기존 정본을 읽는다. 필요한 개념이 없으면 원고에는 미연결 상태를 표시하고 기존 은행의 검수된 보강으로 해결한다. 발행 요건을 충족하려고 유사한 항목을 몰래 대체하지 않는다.

## 4. 정확한 항목 조합과 불변 snapshot

기존 `{selection}` 문서는 기존 의미로 호환 유지한다. 교재에서 시작한 백지는 별도 versioned exact 선택 모드를 사용한다. 폼별로 `(entryKind, entryId)`의 **순서 있는 명시적 목록**을 받으며, 난도별 개수는 결과 요약이지 다른 문항을 다시 뽑는 명령이 아니다. 같은 은행 항목이 책에 두 번 배치되면 source ref는 같고 placement ID는 다르다.

새 경로는 알 수 없는 ID/section, 다른 section에 속한 ID, 중복 배치 규칙 위반, 형식 불일치, 요청 수 부족을 위치와 함께 거부한다. `recall + givenCase`, `figure + concepts`, `term + apply` 등 지원하지 않는 조합을 조용히 줄이거나 바꾸지 않는다. A/B/C/D/E의 기존 학습 의미와 공통 `{...}` 핵심어/KaTeX parser를 재사용하되 정확한 선택 경로를 통과시킨다. D의 개념지도는 기존 표현 형식이며 새 선수 그래프를 추론하는 기능이 아니다.

발행 `conceptSnapshot`에는 최소한 아래 값이 들어간다.

- 교재 블록의 실제 핵심 정의/조건/키워드/예/반례 및 승인된 원고 본문, source anchor와 모든 관련 활동의 ordered refs.
- 선택된 `concepts/ox/apply/figures`의 원문 필드 전체: 정답·근거·예·SVG·viewBox·tags/lines·`givenCase` 등. source 문구를 임의 정규화하지 않는다.
- 당시 section의 전체 key·학년·대단원·제목·순서와 폼별 resolved entry 목록. 현재 `getBlankSection` 조회 결과에 의존하지 않는 조합 입력이 필요하다.
- source release, entry/content SHA-256, mapping version 및 검수 근거, parser/composition/render/template version. 발행 manifest가 개념 refs와 snapshot 집합을 포함하는 정확한 projection은 P1 벡터로 고정한다.
- 고정된 원문과 학생 projection의 구분, 그림 바이트/해시, 실제 발행 pageMap 및 출력 artifact hash. 출력물은 저장된 발행 바이트를 사용한다. 나중에 렌더러가 바뀌었다고 옛 PDF를 현재 코드로 조용히 대체하지 않는다.

`composeSheets(selection, frozenSubset)`만 호출하는 것으로 충분하지 않다. 이 함수는 여전히 **현재** `getBlankSection`, 소단원 정렬, 제목 변환과 폼 조합을 읽는다. 고정 section context를 받는 공통 adapter 또는 이미 resolved된 versioned sheet model까지 보존해야 한다. 학생에게 정답을 보낼 필요 없이 서버에서 원문→학생 표시 조각을 만들 수 있다.

과거 snapshot은 발행 증거이고 편집 가능한 두 번째 은행이 아니다. source 업데이트는 초안에서 diff/갱신 제안으로 보이며 교사의 명시적 수락 후 새 판본을 만든다. source 삭제/이름 변경/순서 변경 이후에도 발행 책, 연결 백지, 채점 기준, QR 의미가 그대로 남아야 한다.

기존 20비트 지면 코드는 변경 경고 용도로만 유지한다. 시드에 차시가 삽입되면 위치 해독부터 달라질 수 있으므로 그 코드만으로 옛 학생지/채점표를 재생하지 않는다. 새 exact 선택을 v1 코드에 억지로 넣지 말고 새 코드 버전 또는 snapshot 식별 경로를 P1에서 정한다. 어느 방식이든 코드에는 학생 신상정보를 넣지 않는다.

## 5. 교환 패키지의 호환성과 보관

`injaewon.textbook.exchange.v1`에 **명시적으로 알려진 선택 필드** `conceptIntegration`과 그 내부 버전을 두는 설계는 새 reader가 구 패키지를 읽는 방향으로 호환 가능하다. 이 제안을 `msg_2278e023c630`으로 전달했다. 구 strict reader가 새 필드를 읽는 방향까지 호환된다는 주장은 하지 않는다.

| 입력/동작 | 요구 동작 |
| --- | --- |
| extension 없는 구 발행 패키지 보관본 열기 | 부재를 그대로 보존. 원래 ID/manifest/QR/pageMap/video 메타데이터와 원본 bytes를 유지하고 읽기 전용으로 표시 |
| 지원하는 extension 있는 패키지 | 엄격하게 검사하고 그대로 보존. 내용 해시를 공격자가 다시 계산했어도 서버 출처/권한 검증 없이 운영 linked/게시 권한을 부여하지 않음 |
| 모르는 extension 내부 버전/필드 | 위치·이유와 함께 지원 불가. 조용한 strip/default로 재저장하거나 변환 성공으로 표시하지 않음 |
| 보관본에서 온라인 초안 복사 | 별도 동작. 새 book/edition/placement/QR ID와 원본→새 ID 이동표. 원본 패키지를 유지하고 refs를 재검수 |
| 새 발행 요청에 개념 블록이 있는데 refs가 없음 | 검수 오류. 과거 보관본을 강제로 고쳐서 요건을 맞추지 않음 |

extension 부재와 빈 extension은 동일 bytes가 아니다. default 객체를 삽입해 과거 manifest를 바꾸지 않는다. 기존 packages에 대한 hash projection과 새 개념 포함 projection을 구분하는 검증 벡터가 필요하다. 새로운 필수 의미를 구 reader에 전달할 수 없다면 명시적 format version/capability 거절로 처리하고 이름만 v1이라서 무손실이라고 주장하지 않는다.

## 6. 교사·학생이 이어지는 실제 행동 계약

교사는 책의 개념을 선택해 같은 source 항목의 백지를 만들고, 검수된 문제 관계를 보고, 같은 반/학생에게 배정한다. 돌아가기 문맥에는 판본·개념 snapshot·구획/블록·필요한 item을 식별하는 서버 검증 ref를 둔다. 교재 권한이 개념백지/문제은행/학생 관리 메뉴 권한 전체를 주지는 않는다. 메뉴가 없으면 권한 설명을 표시하고 대체 route로 우회하지 않는다.

학생은 배정된 **그 판본**의 설명과 백지 활동을 연다. 읽기 요청은 학습 완료·정답·시청 진도·숙달 이벤트를 만들지 않는다. 현재 개념백지의 교사 `print` route, `view=both` 기본값, 정답 포함 bank loader를 학생 flow로 노출하지 않는다. 학생 API는 허용된 prompt·빈칸·그림/라벨·입력 영역만 서버에서 투영한다. 답·채점 기준·교사 메모가 JSON, 초기 상태, DOM, HTML/PDF, 다운로드에 없는지 검증한다.

P1의 `textbookConceptAttempt`는 다음 최소 관계를 분리한다.

| 기록 | 필수 문맥과 의미 |
| --- | --- |
| `student_text` 제출 | 서버가 확정한 student/assignment, edition/conceptSnapshot/activity/entry refs, 입력 응답, 제출 시각, requestId. 일반 열린 답은 pending teacher review |
| `teacher_observation` | 같은 학생·판본·활동과 관찰한 종이 범위, 관찰자·관찰 시각·기록 시각·관찰 문장. 학생이 실제 입력한 답으로 꾸미지 않음 |
| 교사 확인/정정 | 정확한 제출/관찰 ID, 검토 방법/결과/검토자/시각/근거. 정정은 이전 결과를 추적할 수 있게 보존 |
| 기존 탐험/문제 결과 참조 | 실제 기존 session/attempt/card/problem ref와 그 출처. 관련 관계의 넓이와 버전을 표시하고 없는 옛 source hash를 지어내지 않음 |

모든 write는 현재 배정·회수·만료·학생/반/지점/교사 범위를 다시 확인한다. body의 studentId/actorId/hash를 믿지 않는다. 같은 requestId/같은 제출 재시도는 같은 결과, 같은 키/다른 응답은 충돌이다. `Problem`이 없는 백지 활동에 가짜 `problemId`를 만들어 `ProblemAnswer`를 쓰지 않는다. 종이 확인·영상 열람을 탐험의 정답 event로 변환하지 않는다.

«이 개념 복습»은 서버에서 검증한 **교재 출처 문맥**과 실제 card ref를 먼저 읽는다. 사용자가 시작한 뒤에만 기존 `handleExplorerRequest → applyExplorerAction/applyDefinitionAction → changeSrsState` 경로를 사용한다. 현재 `start/repair`는 5장 구성이고 새 단일카드 세션을 보장하지 않는다. P1 응답은 적어도 시작됨/기존 미션 이어가기/보류/지원되지 않음을 구별해 UI가 실제 결과를 설명하도록 한다. 다른 세션을 이어줬는데 요청한 개념을 시작한 것처럼 제목만 바꾸지 않는다.

미완료 탐험/오답/실습이 있으면 기존 세션을 유지하고 이후 복습 동선을 제공한다. 일일 예산·requestId·CAS·보상·기존 due 계산을 우회하지 않는다. 책을 열거나 백지를 제출한 이유로 `goalUnitId`, 카드 level/stars, SRS due를 직접 수정하지 않는다. `definitionEffectiveDue`가 현재 보정 카드의 날짜를 읽는 기존 정책도 책에서 덮어쓰지 않는다. 현재 카드와 과거 교재 문구가 다르면 판을 구별해 표시하고 옛 책의 정의를 교체하지 않는다.

교사 학생 상세에서는 교재 제출/관찰·탐험 카드 결과·문제 풀이를 같은 검수된 개념 관계 아래 나란히 보여 준다. `explorerTeacherSummary/Detail`와 기존 교사 scope를 재사용한다. 출처·날짜·판본·채점 방법·응답 여부를 표시하며 데이터 없음/미연결/미시작을 0점으로 바꾸지 않는다. 서로 다른 근거를 합산한 새 «숙달 점수»는 만들지 않는다.

## 7. 선수 시범과 AI 경계

현재 시범은 그래프 단원 관계 `E56-N03 → E56-N04`에 대해 목표 `5-2-2-1`, `5-2-2-2`와 확인 `5-1-5-4`, `5-1-5-3`만 사용한다. 약분 `5-1-4-2`는 자기채점이라는 이유로 확인 범위에서 제외돼 있다. `MATH_PREREQ_CHECK === "on"`일 때만 켜지며 기본 OFF를 유지한다.

현재 정책의 직접 선수 depth 1, 최대 확인 범위 2개, 하루 1회, 14일 근거/재확인 경계와 공급 검사는 그대로다. 교재와 탐험을 연결했다는 이유로 이 scope를 늘리거나 백지 관찰을 기존 독립 정답/오답 수에 넣지 않는다. graph schema/content hash, mapping version, policy version은 별도 버전이다. `contains`나 topic 배열 순서에서 소단원 prerequisite를 만들지 않는다. 기존 탐험 카드 내부의 학습 순서 관계도 이 승인된 코스 시범을 확대하는 근거가 아니다.

[프로젝트 TypeSafe 스킬](../../../../../.agents/skills/typesafe-ai/SKILL.md), [라이브 문서 색인](https://docs.typesafe.ai/llms.txt), [entity alignment cookbook](https://docs.typesafe.ai/cookbooks/entity_alignment)을 읽었다. Cookbook은 관련 있지만 동일하다고 확정하기 어려운 후보를 검토로 넘기는 구분과 수치 비교를 코드에 두는 예를 제공한다. 이 과업에는 유료 AI 판단을 추가하지 않는다. 이후 의미 매칭이 필요해도 검수 후보/차이 안내만 별도 평가하며 ID·hash·권한·계산·발행과 학생 숙달을 모델의 확신만으로 확정하지 않는다.

## 8. W1–W4 실제 구조 검토

모든 desktop PNG는 1280×800, mobile은 390×844이다. HTML은 목록/생성/편집/펼침/검수/충돌/영상 상태를 전환하는 검토 fixture다. 실제 확인한 PNG는 편집 화면이다. HTML의 다른 상태는 소스를 읽었으며 저장·발행 버튼의 제품 작동을 시험한 것은 아니다. 이미지의 FX ID는 시험용으로 명시돼 있다.

| 안 | 실제 관찰 | 표결 이유 |
| --- | --- | --- |
| W1 | 고정 sidebar 외에도 168px 단원 panel, 원고, 계산 지면의 3열. 모바일은 단원 panel이 먼저 큰 높이를 차지 | 목록 파악에는 좋지만 편집/지면에 쓸 폭과 첫 화면을 과하게 소모 |
| W2 | 원고 위/펼침 아래. 입력 영역과 지면이 세로로 쌓이며 원고 영역은 내부 스크롤 | 큰 지면은 장점이나 원고 수정과 좌우 결과 대조에 반복 이동이 필요 |
| **W3** | 원고와 계산된 펼침이 비슷한 폭으로 동시에 보이고 짝수 014/홀수 015의 이어지는 대화를 대조 가능. 교사용 정답은 종이 밖 | **선택.** 주된 작업인 원고 수정→결과 검토가 같은 화면에 남고 구조/조판 오류도 나눠 보여줄 공간이 있음 |
| W4 | 편집 캡처는 W2와 거의 같은 위/아래 구조. 단계별 지면/검수에 집중 | 학습 단계 안내는 유용하지만 전권 구획 경계·even-left 충돌을 단계 밖에서 보기 어려움. 전체 편집 구조로는 W3보다 약함 |

W3를 고른 조건은 다음과 같다. 단원 outline은 접기/열기, 현재 구획과 오류 수는 항상 찾을 수 있게 한다. 계산 지면은 확대/전체 펼침 보기를 제공하고 원고/미리보기 revision과 측정 중/오류 상태를 보여 준다. 학생용 종이와 교사용 정답 panel은 시각뿐 아니라 export DTO에서도 분리한다. 개념 연결 상태와 «이 개념으로 백지 만들기»는 현재 블록의 문맥 안에 둔다.

모바일 4안 모두 현재 캡처만으로 입력·저장·전체 펼침 검토가 충분하다고 판정할 수 없다. HTML은 panel마다 `overflow:auto`, 고정 높이 장치, 1열로 바뀌는 spread를 사용한다. W3에는 **원고/미리보기 탭**, 선택 블록/스크롤/미저장 입력 보존, 접는 outline, 전체 펼침의 별도 확대/이동, 도달 가능한 저장·검수 조작이 필요하다. 작은 화면에서 두 panel을 동시에 우겨 넣지 않는다. 하단 9개 메뉴의 이름/터치 영역과 키보드 노출 시 조작도 Hi-fi에서 확인한다.

직접 읽은 artifact SHA-256:

| 파일 (`D:/tmp/textbook-tab-20261003/design/`) | SHA-256 |
| --- | --- |
| `wire-review.html` | `b2cf7131b21c8862ecea4fdcbe6d6fc5fec4a29eefb5d0c75a5a2c4dae680f7b` |
| `wire-w1-desktop.png` | `ee1ce4e3ee9e0a4cf56b257b3ed90579cd8adeac5d955047a8c4524be868c104` |
| `wire-w2-desktop.png` | `0c6e3caa7d7def5efc523bfd602bd650946fa2fb44194691a6ae30e5de6c0ee9` |
| `wire-w3-desktop.png` | `4e6303b831d325bcc069286a25f313899045fbc76246036977a2a2a1e00dd126` |
| `wire-w4-desktop.png` | `aef01ec302bfb9ba9149a81e36c9a3fc9346b73901e5bce613707939b5b4d312` |
| `wire-w1-mobile.png` | `b5ec80da7a822d9b883fdfac57ef79658b275496174dcb84cff8d1a54551e2cc` |
| `wire-w2-mobile.png` | `768ad0f2265a74442fdab1823ae5d95107cf4cb54f7676434138fc56c68176c0` |
| `wire-w3-mobile.png` | `30ca08154974c33745946304634c6b280bcc3944f560a3175632b303a65762b1` |
| `wire-w4-mobile.png` | `ddd835dfdea66932b3fabe8ae1e73a62818c5fdad52d29af49ece937ab3fdd60` |

## 9. P1/P4에 넘길 구체적 인수 시나리오

아래는 **후속 제품 시험 요구**다. 이번 보고서 작성으로 통과했다고 주장하지 않는다.

| ID | 입력/행동 | 필요한 관측 |
| --- | --- | --- |
| CI-01 | 서로 다른 namespace에서 같은 문자열 ID, 동명 개념, 같은 section의 다른 정의 | 잘못된 identity 합침 0. relation/검수 상태와 source tuple 유지 |
| CI-02 | 두 section에서 난도/은행 순서와 다른 정확한 entry 순서 선택 | 요청한 typed refs만 그 순서로 렌더/재열기. 개수 기반 재추첨 없음 |
| CI-03 | 없는 ID/section, 형식 오류, 삭제 entry, `givenCase`와 recall | 정확한 위치의 오류. 빈 sheet/부분 누락으로 성공 응답하지 않음 |
| CI-04 | 발행 후 원천 definition/answer/SVG/labels/order/parser 변경 | 옛 책·백지·키·manifest/PDF/QR 불변. 새 초안에 diff 후 명시적 갱신 |
| CI-05 | 구 selection 문서 및 extension 없는 v1 보관 패키지 왕복 | 기존 문서 행동 유지. 보관 package에는 새 default/ID/QR/hash를 삽입하지 않음 |
| CI-06 | 미지원 extension, 새 개념 블록 refs 누락, attacker가 hash 재계산 | 무손실 지원 불가/발행 검수 오류. self-consistent hash만으로 운영 권한 획득 불가 |
| CI-07 | 학생이 teacher print에 key/both/미지원 view 요청, 학생 bundle 검사 | 기존 교사 route는 학생에게 닫힘. 학생 DTO/JS/DOM/PDF에 은행 답/교사 정보 없음 |
| CI-08 | 배정 학생 열기→텍스트 제출→응답 유실 재시도→교사 확인 | 동일 제출 1건, 정확한 판본/snapshot/actor/time. 다른 payload의 requestId 재사용 충돌 |
| CI-09 | 다른 학생/반/지점·회수/만료·반 이동·교사 권한 회수 후 읽기/확인 | 모든 endpoint에서 현재 범위 재검증. UI 링크만 숨긴 상태로 성공하지 않음 |
| CI-10 | 같은 개념 복습 시작 중 다른 미완료 탐험/오답/실습 존재·동시 탭 | 기존 세션/goal/보상/due 불변, 실제 resume/defer 결과. CAS와 재전송 규칙 유지 |
| CI-11 | 백지 제출·종이 확인·영상 열람·책 열기 | 기존 카드 획득/정답/시청 완료/SRS 숙달/선수 trigger 이벤트가 생기지 않음 |
| CI-12 | 같은 단원의 다른 Problem, source ID 없는 옛 코스 결과 | 정확한 개념/DB 문제 증거로 오인하지 않음. source 불명/넓은 관계를 그대로 표시 |
| CI-13 | 지도 topic 관계·새 교재 graph ref·비시범 차시 | topic prerequisite 생성 0, 파일/플래그/시범 범위 불변. OFF에서 추천 활성화 없음 |
| CI-14 | 교재→동일 백지→배정 학생 응답→교사 확인→실제 기존 복습→교사 상세 | 같은 학생·판본 출처가 연결되고 독립 근거가 나란히 보임. 없는 기록은 없다고 표시 |
| CI-15 | 모바일 원고/미리보기 전환, 키보드, 저장 실패, 전체 펼침 검수 | 미저장 입력/선택 유지, 저장·복귀 도달, 좌우 펼침과 오류 위치 검토 가능 |

P1의 정해진 소유에 따라 root는 공통 참조/학생 문맥/요약 계약, Claude는 snapshot/배정/응답·확인 저장 및 불변성, Codex는 정확한 조합/보존 adapter, Grok은 선택·상태·복귀 UI를 담당하는 분할이 가능하다. 계약 이름과 DTO/해시 벡터를 먼저 맞춘 뒤 각 트랙을 구현해야 한다.

## 10. 수행·보존·미실행

정적 코드/계약/동결 계획을 읽고, 실제 PNG 8장을 시각 확인하고, HTML fixture와 원본 03 계약의 extension 관련 부분을 대조했다. live TypeSafe 문서는 index와 정상 HTML cookbook으로 확인했으며 `.md`와 일부 building guide 접근 실패를 API 사용 증거로 대체하지 않았다. 모델 호출은 없었다.

제품 테스트, dev server, DB 조회/적용, 전체 PDF 재렌더, 실영상/실물 인쇄 시험은 하지 않았다. 기존 v15 미확보 등은 앞선 source 보고서와 root 계획의 별도 대기 항목이다. 이번 계획 승인으로 그 항목을 완료 처리하지 않는다.

시작 시 `package-lock.json`만 setup 변경으로 남아 있었다. SHA-256 `87f4e6986cda89801fe71781b266e785c638594d705dc3dfd332b55fe46b5217`, `source-codex.md`의 `3433602379b26ffe9b04902b7b4bf4f9b3ca168bbd8c5b4b5d56e3318724bdd3`, `source-codex-v02.md`의 `17641fe4a18d85ffb341d181b4f899fb5ae7b51d93900693f31680af7a90a04c`를 보존 검사 기준으로 기록한다. 보고서만 commit하고 setup 변경은 포함하지 않는다. 미병합/dirty worktree를 제거하지 않는다.

종료 전 문서 무결성 검사에서 UTF-8 대체문자 0, CI-01~15 존재, PNG 헤더의 1280×800/390×844 치수를 확인했다. lockfile과 두 이전 보고서의 SHA-256은 시작값과 모두 같았다. 이는 보고서/증거 보존 검사이며 제품 기능 시험이 아니다.
