# 리스닝 L0 코드 검토 — 결함 10건과 재현 (2026-10-03)

검토 기준: main `6ee028522`. 대상은 `docs/planning/english-listening-plan-20261003.md`, `src/contracts/englishListening*.ts`, `src/lib/english/listening/**`, `src/__tests__/unit/englishListening*.ts`, `englishFence.test.ts`. 검토 시점에 시험 8파일 100건이 main 에서 초록이었고, 재현은 읽기 전용 probe(tsx, 소스 무변경)로 확인했다. 행 번호는 검토 시점 main 기준이다.

처리 현황(2026-10-03 갱신): **F2·F9·F10 은 이 문서와 같은 트랙(`listening-l0-contract` 워크트리)에서 구현했다** — 각 절의 «처리» 항목. F1·F4 는 root 가 main `296403be1` 에 넣었다(`canReadListeningAssignment(facts, action, mediaTarget?)` · `publication.setId/audioAssetIds`). F3·F5·F6·F7 은 root 가 `14eed6db7`·`33e7fde18` 로 넣었고 F8 은 «의도된 보수적 해시»로 회귀 시험을 더해 닫았다 — 읽기 검토 결과는 맨 아래 «root 수정 검토» 절. 거기서 **F3-a(교사 방송 + 전입 학생) 한 건이 root 에 남아 있다.**

## F1 · 높음 — 학생 미디어 인가에 «자산 ↔ 발행본» 묶음이 없다 (바이트 누출)

- `src/lib/english/listening/access.ts:92-159` — `canReadListeningAssignment(facts, "media")` 는 요청된 `setId/assetId` 를 받지 않고 158행에서 `audioSource === "student_device"` 만 본다.
- `src/lib/english/listening/media/service.ts` `find()` 는 자산→세트만 묶고, `authorize` 가 true 면 그 세트의 **모든 `ready` 레코드**를 206 으로 낸다.
- 통합 시험의 `authorize` 도 `target.setId === ids.set` 만 검사해 이 구멍을 못 잡았다.
- 재현(probe GG): 같은 세트에 WAV 둘을 올려 하나만 발행 → 학생 컨텍스트로 미발행 자산 `GET bytes=0-43` → **206**. 다음 개정용 새 음원·발행에서 뺀 묶음의 음원이 학생에게 흐른다.
- 최소 수정: `canReadListeningAssignment(facts, action, mediaTarget?)` — `action === "media"` 면 `mediaTarget {setId, assetId}` 필수, `facts.publication` 에 불변 발행 스냅샷 `setId`·`audioAssetIds` 를 두고 `mediaTarget.setId === publication.setId && publication.audioAssetIds.includes(mediaTarget.assetId)` 를 요구한다. 라우트는 `setId` 를 클라이언트에서 받지 않고 배정→발행본→`document.id` 로 만든다.
- 처리: root(access 트랙). 이 트랙의 통합 시험은 그 서명으로 호출하며 «같은 세트 미발행 ready 자산 → 404» 를 단정한다(root 병합 전에는 이 단정만 빨갛다).

## F2 · 중간 — 브리지가 미디어 범위를 문서에서 지어낸다 (범위 검사가 항등식) — **구현됨**

- 검토 시점 `verifiedPublication.ts:40-42` — `ownerId: document.ownerId, branchId: document.branchId, verifiedAt: options.publishedAt`. 그래서 `publication.ts` 의 `media.ownerId !== document.ownerId` / `branchId` / `verifiedAt` 검사는 브리지 경로에서 절대 실패하지 않았다. 근본 원인: 미디어 레코드와 ready 영수증에 소유자·지점·검증 시각 칸이 없어 **업로드가 누구 것인지 저장소가 몰랐다.**
- 재현(probe C): 같은 readiness 콜백으로 `document.ownerId` 를 학생 id 로 바꿔 발행 → 성공(소유자 = 학생 id 인 발행본).
- 처리(이 트랙):
  - `englishListeningMedia.contract.ts` — `listeningMediaScopeSchema {ownerId, branchId|null}`; ready·publish_blocked 완료 영수증에 `ownerId`·`branchId`·`verifiedAt(ms)`.
  - `media/store.ts` — 레코드가 `ListeningMediaScope` 를 가진다.
  - `media/service.ts` — 의존성에 **필수** `resolveScope(context, setId)`(세트 행에서 서버가 읽는 범위, 요청 본문 아님). 모든 작업이 `authorize → resolveScope → 메타데이터 → 저장된 범위와 대조` 순서다. `beginUpload` 가 범위를 저장하고, `appendChunk`·`completeUpload`·`getVerifiedReadiness`·`serve` 는 현재 범위와 다르면(재배정·철회·풀리지 않음·형식 오류) `not_found` 로 막는다. 완료 영수증은 저장된 범위와 `now()` 를 싣는다.
  - `verifiedPublication.ts` — readiness 의 세 값을 그대로 넘기고 `document.ownerId/branchId` 와 다르면 «Listening media scope does not match this document», `verifiedAt > publishedAt` 이면 거절. 지어내는 값이 없다.
  - 시험 — 요청 본문의 `ownerId` 거절 · 순서(authorize < resolveScope < store.get) · 재배정 여섯 경우 · **저장소 뒤에서 ready 레코드의 owner/branch 를 바꾼 적대 사례** · 검증 시각 재생 불변 · 통합 시험의 F2 재현(소유자 바꾼 문서)이 이제 거절.

## F3 · 중간 — 배정 개정 번호가 바뀌면 진행 중 응시가 전부 고아가 된다

- `release.ts:62` — `attempt.assignmentRevision !== assignment.revision` → throw. `attempt.ts:118` 이 영수증 재생(120행)보다 먼저 호출하므로 **접수된 명령의 재전송까지** 막힌다. 공개 판정·투영도 같은 자리에서 죽는다.
- 계획 §4(73행)는 전입 추가를 «새 배정 개정»으로 두라 했다. 그 개정 한 번에 반 전체의 응시가 «Attempt binding mismatch» 가 된다.
- 재현(probe B): start 뒤 `assignment.revision=2, targetStudentIds+1` → answer / projection / start 재생 셋 다 THREW.
- 최소 수정: 비교를 `attempt.assignmentRevision > assignment.revision`(미래 개정만 거절)로 바꾸거나, 계약에 «대상 추가는 `revision` 을 올리지 않는 추가 행»이라고 못 박고 회귀 시험을 둔다.

## F4 · 중간 — 교사 관문이 정규화된 영어 차단을 못 본다 (계획 §4 가 경고한 바로 그 회귀)

- `access.ts:21-22` — `disabledMenus.includes("english")` 와 `"english-listening"` 만 본다.
- 관리자 저장 경로 `src/app/api/admin/users/[id]/route.ts:227-229` 는 `ALL_WORKSPACE_MENUS − menus` 를 쓰고, `accountAccess.contract.ts:50-66` 대로 그 목록에 `"english"` 는 없다. 오늘 관리자가 영어 셋을 전부 끈 계정의 `disabledMenus` 는 `["english-school","english-maker","english-library"]` 이고 이 관문은 **통과**시킨다. `"english-listening"` 은 `workspaceMenuSchema` 에 없어 저장될 수도 없다(정규화하면 사라진다).
- 재현(probe D): 삼중 차단 + 시범 허용 → `true`; 옛 `["english"]` → `false`; `normalizeWorkspaceMenus(["english-listening"])` → `[]`.
- 최소 수정: `new Set(normalizeWorkspaceMenus(disabledMenus))` 로 바꾸고 영어 세 메뉴가 모두 들어 있으면 거절, `"english-listening"` 은 원문에서 따로 본다. `workspaceMenuSchema` 에 `english-listening` 을 더해야 저장이 가능해진다. 삼중 차단 시험 한 줄 추가.

## F5 · 중간 — 응시 없는 학생에게 공개 이력이 있으면 읽기 전체가 500

- `release.ts:109-116` — `record.studentId !== attempt?.studentId` 는 `attempt === null` 이면 항상 throw.
- 시나리오: 평가 `at_time`(마감 전) 또는 `manual` 은 응시 없이도 공개된다(145-150행) → 이력 행이 남는다 → 교사가 정책을 `never` 로 돌리거나 `at` 을 미룬다 → 그 학생의 모든 조회가 «Release history binding mismatch». `projection.ts` 에 `studentId` 입력이 없어 응시가 없을 때 화면을 어느 학생에 묶을 방법 자체가 없다.
- 재현(probe N): `never` + 이력 1건 + attempt null → decide/projection 둘 다 THREW.
- 최소 수정: `listeningReleaseContextSchema` 에 `studentId` 를 넣고 `targetStudentIds.includes(studentId)`·`attempt?.studentId === studentId` 를 단언한 뒤, 이력 비교는 `context.studentId` 로 한다.

## F6 · 낮음 — 공개된 묶음에 저장한 «최초 답»에 노출 표지가 없다

- `attempt.ts:229-240` — 공개 여부와 무관하게 initial 답을 받는다. `release.ts:160-163` 의 `earlyExposure` 는 어디에도 저장되지 않고 응시 계약에 칸이 없다.
- 계획 §3 «이전 노출 여부», §9 «대본 확인 후 응시 구별»과 어긋난다. 재응시에서 `releaseHistory` 로 이미 열린 묶음도 같다.
- 재현(probe E): 평가 `at_time: now` → start → 투영에 `answerChoiceId` 보임 → initial 답 저장 성공, 답 객체 키는 `questionId/choiceId/savedAt` 뿐. 응시 없는 학생도 `["review","review"]`.
- 최소 수정: initial 답 저장 시 `decideListeningRelease` 를 돌려 공개된 묶음이면 거절하거나 답에 `savedAfterRelease: true` 를 남기고 `gradeListeningAnswers` 가 따로 센다.

## F7 · 낮음 — 배정 취소 뒤에는 응시 상태를 바꿀 길이 없다

- `release.ts:58` 이 모든 명령보다 먼저 throw 하므로 `cancel`·`interrupt` 도, 접수된 영수증 재생도 막힌다.
- 재현(probe A): `cancelledAt` 설정 뒤 cancel / interrupt → 둘 다 «Assignment revoked». 진행 중 응시는 영원히 `in_progress`.
- 최소 수정: `command.kind === "cancel"` 이면 취소 검사를 건너뛰는 플래그를 `assertListeningBinding` 에 넘기거나, 서버가 `cancelledAt` 을 쓰기 **전에** 응시를 먼저 취소한다고 문서화한다.

## F8 · 낮음 — 내용 해시에 `rightsReview`·`provenance` 가 들어 있어 검수 뒤 권리 확인이 검수 셋을 전부 낡게 만든다

- `publication.ts:200-212` + `239-244`. 보안 구멍은 아니고(더 엄격) 운영 함정이다. 수정: 권리 확인은 219-231행에서 따로 검사하므로 digest 에서 `rightsReview` 를 뺀다. 아니면 «권리 확인 → 검수» 순서를 문서에 적는다.

## F9 · 낮음 — Range 문법 오류를 416 으로 낸다 — **구현됨(정정 포함)**

- 검토 시점 `media/range.ts`·`service.ts` serve: `items=0-2`, `bytes=+1-2`, `bytes=0-1,4-5` 전부 416.
- **정정**: 검토 보고서의 «문법 오류는 무시(200)»는 부정확했다. 코디네이터가 확인한 [RFC 9110 §14.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.2) 원문은 셋을 가른다 — (1) «An origin server **MUST ignore** a Range header field that contains a range unit it does not understand», (2) «A server that supports range requests **MAY ignore or reject** a Range header field that contains an invalid ranges-specifier …, a ranges-specifier with more than two overlapping ranges, or a set of many small ranges», (3) 유효하나 만족 불가면 «**SHOULD** send a 416». §14.1: «All range unit names are case-insensitive».
- 처리(이 트랙, `decideListeningRange`): 모르는 단위 → 무시(인가된 전체 200) · 유효한 다중 범위 → 무시(200 — multipart/byteranges 를 만들지 않으므로 전체 표현이 늘 올바른 답이고 416 은 규격대로 요청한 클라이언트를 깨뜨린다) · `bytes` 문법 오류(`bytes=`, `bytes=9-1`, `bytes=+1-2`, `bytes= 0-1`, `bytes=0-1,x-y`, `unit=` 꼴이 아닌 값) → 416 유지(거부 선택) · 만족 불가(`bytes=204-`, `bytes=-0`) → 416 · HEAD 는 Range 무시 · 단위 이름 대소문자 무시 · 빈 목록 원소 무시(§5.6.1). 무시해도 인가는 그대로다(취소 뒤 `items=0-2` → 404). 선택 근거는 `listening-media-l0.md` 의 표에 적었다.

## F10 · 낮음 — 길이 0 조각을 결함으로 읽는다 — **구현됨**

- `service.ts` `collectBody`(body_size)·`readAsset`(storage_integrity). 웹 스트림은 빈 청크를 낼 수 있어 운영 어댑터가 중간에 끊길 수 있다.
- 처리(이 트랙): 빈 조각은 건너뛰되 **한 청크·한 blob 읽기당 4,096개까지만**(빈 조각만 끝없이 보내는 본문이 루프를 붙잡지 못하게) 허용하고, 선언 길이·조각 상한·남은 바이트 검사는 그대로다. 시험: 빈 프레임이 섞인 업로드 128바이트 정확히 접수 · 빈 프레임만 → body_size · 끝없는 빈 프레임 → 4,097개 안에서 body_size · 빈 프레임 사이의 1바이트 초과 → body_size · 어댑터가 빈 조각을 끼워 넣어도 206 본문이 원본과 같음.

## 알려진 한계 (결함으로 세지 않음)

- DB·라우트·인증 어댑터·MP3 디코더 미구현.
- readiness 읽기와 발행 저장 사이 TOCTOU — 브리지 주석이 인정.
- `putBlob` 과 CAS 사이 크래시 시 고아 blob — `store.ts` 주석이 인정.
- 학생 화면은 `assetId` 만 받는데 미디어 요청은 `setId` 가 필요하다 — 라우트가 배정→발행본→`document.id` 로 서버에서 만들어야 하며 클라이언트 값을 받으면 안 된다(F1 의 묶음 검사가 전제).
- 영수증 1만 개 상한을 넘으면 응시가 굳는다 — L0 에서는 무시 가능.

## 확인해서 문제 없던 것

- 경계 읽기: `collectBody` ≤ chunkBytes ≤ 1MiB, `readAsset` 조각 ≤ readChunkBytes, HEAD 는 blob 을 열지 않음, 취소 시 reader 닫힘.
- 멱등성: 키+명령 해시 묶음, 다른 본문 재사용 거절, 마감 뒤 재생 허용. 서버 시계 역행 거절, 종단 상태 고정.
- WAV 검사 엄격(헤더·크기·정렬·길이 상한), MP3 는 신호만. 404 균일, `private, no-store`.
- 울타리: `englishFence.test.ts` 가 리스닝 교사 계약 셋을 금지하고 학생 계약만 허용.

## root 수정 검토 — F3·F5·F6·F7·F8 (main `93f81c0c6`, 읽기 전용)

root 의 `14eed6db7`(assignment.ts 추가 · attempt/release 수정)·`33e7fde18`(`savedAfterRelease` · F8 회귀)을 읽고 scratchpad probe 로 돌려 봤다.

| 결함 | root 의 처리 | 판정 |
| --- | --- | --- |
| F3 | 등호 묶음은 유지하고 `appendListeningAssignmentTargets` 가 «옛 스냅샷 + 새 개정 + 감사 행»을 돌려준다. 어댑터는 응시의 `assignmentRevision` 스냅샷을 정확히 읽는다. | 재현 해소: 옛 스냅샷으로 start·재생·투영·수동 공개 전부 OK. **단, 아래 F3-a 가 남는다.** |
| F5 | `listeningReleaseContextSchema.studentId`(선택) — 대상 포함·응시 일치를 단언하고 이력은 그 학생에 묶는다. | 해소: 응시 없는 학생 + 이력 → `["already_released","locked"]`; 다른 학생 id → throw; id 없이 이력만 → throw. |
| F6 | `listeningAnswerSchema.savedAfterRelease`(선택, 서버 계산). initial 은 저장 직전 공개 판정, review 는 항상 true. `gradeListeningAnswers` 가 `savedAfterRelease`·`releaseStatusUnknown` 을 따로 센다. 요청 본문의 `savedAfterRelease` 는 거절. | 해소: 연습 묶음을 완성하는 마지막 initial 답은 false(공개 전), 이력으로 열린 묶음의 재응시 initial 답은 true, 옛 데이터는 unknown 으로 셈. «false 가 앱 밖 비노출을 뜻하지 않는다»가 계약 주석에 있다. |
| F7 | `assertListeningBinding(…, {allowCancellationTransition: command.kind === "cancel"})` — 취소 명령만 철회된 배정·취소된 응시를 지나간다. | 해소: 철회 뒤 in_progress·ready 응시 모두 cancel → cancelled, 재생 OK, 두 번째 cancel 은 종단 거절. `expire`·`interrupt`·답·읽기는 계속 «Assignment revoked». 의도대로 «cancel-only». |
| F8 | 전체 해시(권리·출처 포함)는 의도된 보수성 — «권리·출처 확인이 모든 검수에 앞선다». 회귀 시험 추가(`rightsReview.basis`·`provenance.basis` 변경 → stale review). | 수용: 보안상 더 엄격하고 순서가 문서·시험으로 고정됐다. |

### F3-a · 중간 — root 에 남은 한 건: 교사 방송이 전입 학생을 포함하면 옛 개정의 응시는 시작할 수 없다

- `attempt.ts` start(teacher_device): `broadcast.participantStudentIds.some(id => !assignment.targetStudentIds.includes(id))` → «Broadcast binding mismatch». 어댑터 규칙대로 옛 응시에 **개정 1 스냅샷**을 실으면, 전입 학생을 더한 뒤 교사가 반 전체(전입 포함)로 방송을 시작하는 순간 개정 1 학생 전원이 시작을 거절당한다.
- 재현(probe F3-a): 개정 1 응시 + 개정 1 스냅샷 + 참여자 `[기존, 전입]` 방송 → THREW «Broadcast binding mismatch»; 같은 응시에 개정 2 를 실으면 «Attempt binding mismatch»(어댑터 규칙 위반); 전입 학생의 개정 2 응시는 OK.
- 최소 수정(택일): ① 방송은 서버가 **현재** 배정에서 만드는 신뢰 기록이므로 부분집합 검사를 빼고 `participantStudentIds.includes(attempt.studentId)` 만 남긴다, ② 또는 전이 컨텍스트에 `currentTargetStudentIds`(현재 개정의 대상)를 받아 그것과 대조한다. 회귀 시험: 전입 뒤 방송으로 옛 응시 start → in_progress.

### 낮음 — F5 보강 제안

- `transitionListeningAttempt` 는 `context.studentId` 를 받지만(전이 컨텍스트가 공개 컨텍스트 모양을 펼침) 응시의 학생과 대조하지 않고 조용히 무시한다(probe: 다른 학생 id 로 start → in_progress). 라우트가 인가하므로 구멍은 아니지만, `context.studentId !== undefined && context.studentId !== attempt.studentId` → throw 한 줄이면 F5 의 단언과 결이 맞는다.

### 후속 수정 확인 (root, 2026-10-03)

위 F3-a와 F5 보강 제안을 실패 시험으로 재현한 뒤 수정했다. F3-a는 신뢰된 방송 참여 명단에 응시 학생이 있는지 확인하며, 이전 배정 스냅샷으로 다른 참여자 전체를 제한하지 않는다. 서버가 방송을 생성할 때 현재 배정·소속으로 모든 참여자를 인가해야 한다. 기존 응시의 정확한 개정 묶음과 방송·발행본·시작/마감 검사는 유지한다. 전입 추가 이후 이전 개정 응시도 같은 방송 시각으로 시작하고, 참여 명단에서 빠진 학생은 거절하는 회귀 시험이 통과했다.

F5 보강은 `context.studentId`가 응시 학생과 다르면 새 명령과 이미 접수된 명령 재전송 모두 거절한다. 수정 후 배정·응시 시험 2개 파일 16건이 통과했다. 아래 probe는 **수정 이전 관측 기록**으로 보존한다.

### root 검토 probe 출력

```text
[F3-a old attempt start w/ rev-1 snapshot + broadcast incl. transfer student] THREW -> Broadcast binding mismatch
[F3-a same start w/ current rev-2 assignment (adapter rule says not to do this)] THREW -> Attempt binding mismatch
[F3-a new student's attempt start w/ rev-2 + same broadcast] OK -> in_progress
[F3-b old attempt start w/ preserved snapshot] OK -> in_progress
[F3-b projection w/ preserved snapshot] OK -> 2
[F3-b release w/ preserved snapshot + manualRelease] OK -> manual
[F5 context.studentId != attempt.studentId] THREW -> Release student binding mismatch
[F5 context.studentId not a target (attempt null)] THREW -> Release student binding mismatch
[F5 projection attempt null + studentId + history] OK -> ["review","locked"]
[F5 transition w/ foreign context.studentId] OK -> in_progress
[F6 practice] firstAnswers savedAfterRelease: [ false, false ]
[F6 practice] reviewAnswers savedAfterRelease: [ true ]
[F6 grade keys] total,correct,incorrect,unanswered,savedAfterRelease,releaseStatusUnknown,items savedAfterRelease: 0 unknown: 0
[F6 retry w/ history] savedAfterRelease: true
[F7 expire under revoked (after deadline)] THREW -> Assignment revoked
[F7 interrupt under revoked] THREW -> Assignment revoked
[F7 cancel under revoked] OK -> cancelled
[F7 cancel again (new key) on cancelled attempt] THREW -> Terminal attempt cannot change
[F7 release decision under revoked] THREW -> Assignment revoked
[F7 cancel ready attempt under revoked] OK -> cancelled
```

## 재현 probe 출력 (검토 시점 main `6ee028522`, 소스 무변경)

```text
[B answer after assignment rev bump] THREW -> Attempt binding mismatch
[B projection after assignment rev bump] THREW -> Attempt binding mismatch
[B replay of accepted start after rev bump] THREW -> Attempt binding mismatch
[A cancel attempt under cancelled assignment] THREW -> Assignment revoked
[A interrupt attempt under cancelled assignment] THREW -> Assignment revoked
[D] ALL_WORKSPACE_MENUS contains legacy 'english'? false
[D] stored disabledMenus after full english block: ["english-school","english-maker","english-library"]
[D] english menus left for that account: []
[D] canUseListeningTeacher with normalized full block: true
[D] canUseListeningTeacher with legacy 'english' block: false
[D] normalizeWorkspaceMenus(['english-listening']) = []
[N release w/ history, attempt null] THREW -> Release history binding mismatch
[N projection w/ history, attempt null] THREW -> Release history binding mismatch
[E] view state before any answer: review answerChoiceId visible: true
[E initial answer after release] OK -> {"status":"in_progress","firstAnswers":1,"keys":["questionId","choiceId","savedAt"]}
[E release flags] OK -> {"groupId":"00000000-0000-4000-8000-000000000010","released":true,"reason":"at_time","earlyExposure":true}
[E projection attempt null early at_time] OK -> ["review","review"]
[GG] assets in publication: 1 unpublished asset in publication? false
[GG] student GET of unpublished ready asset in same set -> status 206
[C] bridge publish with document.ownerId swapped to another id (same readiness): 00000000-0000-4000-8000-000000000006
```

probe 의 각 블록은 fixture 발행본·배정으로 상태를 만든 뒤 해당 함수를 한 번 호출한 결과다. GG 는 `LocalTempListeningMediaStore` 에 WAV 둘(15초·12초)을 올리고 하나만 발행한 뒤 통합 시험과 같은 세트 단위 `authorize` 로 학생 GET 을 보낸 것이고, C 는 같은 readiness 콜백에 `ownerId` 만 바꾼 문서를 넣은 것이다. F2 구현 뒤에는 C 가 «Listening media scope does not match this document» 로 거절된다.
