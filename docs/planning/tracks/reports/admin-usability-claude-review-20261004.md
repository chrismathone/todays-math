# 관리자 사용성 후속 계획 — Claude 독립 검토 (2026-10-04)

- 대상: [관리자 사용성 점검 후속 실행 계획](../../admin-usability-remediation-20261004.md) 초안(커밋 `049f08f65`).
- 검토자: Claude Code 세션. 실제 모델 `claude-fable-5-1`(Claude Fable 5.1).
- 방법: 증빙 폴더의 `reproduction-scenarios.json` 37건 · `sources/` 3편 · `live-findings.json` 을 읽고, 이 워크트리의 소스(`1285a24f0` + 문서 커밋)에 직접 대어 봤다. 교재 P1 계약(`textbook-studio-p1-contracts-20261003.md`)과 `src/contracts/textbook*.ts` 를 읽었다.
- 한계: **정적 읽기만 했다.** 시험 · 빌드 · 브라우저 · 운영 쓰기 · 코드 수정 없음. 이 워크트리에는 `node_modules` 가 없어 Next 문서는 같은 판(16.3.0)이 설치된 main 체크아웃의 `node_modules/next/dist/docs` 에서 읽었다(`link.md` §onNavigate · `use-search-params.md` · `04-linking-and-navigating.md` history API · `preserving-ui-state.md`). main 은 검토 중 `64f3eec46` 으로 나아갔다 — 아래 행 번호는 `1285a24f0` 기준이고 구현 전에 다시 맞춰야 한다.

## 결론

**수정 필요 (NEEDS REVISION).**

37건의 실패 경로는 현행 코드에서 전부 그대로 확인됐다(§4). 계획의 방향과 정책 결정안 — B01 보안 효과 유지 · B02 를 P2 로 · D03 공통 저장 범위 유지 · A08/B05 에서 권한을 넓히지 않음 — 에는 동의한다. 반대하는 정책은 없다.

다만 §1 의 차단 6건은 지금 문장만으로는 구현자가 보존해야 할 계약을 깨거나 서로 다른 뜻으로 구현할 수 있다. 차단 6건과 §2 의 수용 기준 보강이 계획에 들어가면 승인한다.

## 1. 차단 사항

### B1. T01 — «서버 계약에 영속화»는 strict · 해시 계약의 확장이다

현행 사실:

- 교사용 정답은 **구획 단위 자유 글**이다(`src/components/textbook/model.ts:154`, 입력 `parts.tsx:893-903`). 블록 union 에도 구획 계약에도 자리가 없다(`src/contracts/textbookExchange.contract.ts:235-290` — `textbookSectionSchema` 는 strictObject). 저장 직렬화가 빼고(`src/lib/textbook/client.ts:712-722`) 읽을 때 `""` 로 만든다(`client.ts:633`).
- 저장 칸은 `textbook_section.content` JSONB 이고 CHECK 는 «객체이고 blocks 가 배열»만 본다(`prisma/migrations/20261003120000_textbook_studio/migration.sql:119`). **새 키는 migration 없이 들어간다 — 칸 추가는 필요 없다.**
- `content` 를 쓰는 곳 가운데 `sections.ts:331` 은 `{blocks}` 만 조립해 **새 키를 지운다.** `quickCreate.ts:816` · `imports.ts:556` 도 손봐야 한다. `items.ts:562`(`...section.content`)와 `books.ts:328`(통째 복사)은 보존한다. 읽어 내보내는 `sections.ts:65-77` · `exchange.ts:148-154` 는 blocks 만 투영한다.
- 판본 해시는 `units` 를 통째로 넣는다(`src/lib/textbook/canonical.ts:143`). 학생 렌더 모델은 구획 칸을 allowlist 로 집고(`render/model.ts:93-113`), 학생 오프라인 HTML 은 교사 보관 자료를 못 싣게 막혀 있다(`render/server.ts:673`).

계획 T01 행에 적어야 할 계약:

1. **자리와 이름** — `textbookSectionSchema` 에 선택 칸 `teacherAnswer`(1자 이상의 글). 문항 정답 `ProblemPayload.answer` 와 이름을 겹치지 않는다. 텍스트 블록에 넣지 않는다(학생 지면에 조판된다).
2. **«없음»은 칸 생략 하나** — `""` · `null` 금지, 파싱 때 기본값을 넣지 않는다. 빈 값을 실으면 `manifestProjection` 이 units 를 통째로 해시하므로 **이미 발행한 판본의 manifest 재계산이 달라져** 내보내기 검증이 깨진다.
3. **해시** — 값이 있으면 `units` 를 통해 manifestHash 에 들어간다(투영 추가 없음). 고정 벡터 셋: 칸 없음 = 변경 전 digest 와 같음 / 칸 있음 ≠ / 값 한 글자 변경 ≠.
4. **저장 왕복** — 저장→재열기, 저장→**문항 담기**(`items.ts`)→재열기, 새 초안 복제, 내보내기→가져오기(copy), 보관본 읽기. 구획 상한 262,144바이트에 포함.
5. **CAS · 불변** — 기존 구획 `expectedRevision` 경로 그대로. 409 의 `serverSection` 에 포함. 발행본 PUT 은 기존 잠금으로 거절되는지 시험.
6. **학생 비노출** — 표지 문자열을 넣은 fixture 로 학생용 렌더 모델 · 학생 PDF/HTML · `/api/learn/textbook/**` · QR 응답 어디에도 없음을 단정한다. `createTextbookRenderModel` 의 구획 allowlist 에 무조건 넣지 않는다.
7. **P1 계약 문서 개정** — `textbook-studio-p1-contracts-20261003.md` «교환 형식과 버전»의 허용 확장 목록에 추가한다(목록 밖 칸은 오류라고 그 문서가 정한다).
8. **지면 결정(계획이 골라야 함)** — 지금 미리보기는 `sheet` 모드에서 이 값을 보여 주는데(`parts.tsx:2195-2203`) 서버 해설 PDF 는 이 값을 모른다. (가) 이번에는 원고 · 미리보기 · 교환 파일까지만 하고 미리보기에 «PDF 에 인쇄되지 않음»을 적거나, (나) 해설 PDF 에 조판한다. (나)는 지면 변경이라 절대 규칙 6(실물 검수 · `/dev/print-check` 항목)이 따른다. 권고는 (가).

### B2. A07 — 사건 사유 칸은 외부 응답이고, «검토 필요»는 두 곳에서 나오며, 보관 담당자 지정은 반 소유권 부여다

- `finishEvent` 가 `errorCode: null` 을 쓴다(`src/lib/eywa/managedReceiver.ts:261-279`). 그런데 같은 칸을 **에이와가 읽는 상태 응답이 그대로 내보낸다**(`src/app/api/integrations/eywa/v2/events/[eventId]/route.ts:17-25`). conflict 사건에 코드를 남기면 외부 연동 응답이 바뀐다. 계획이 하나를 골라야 한다: (가) 에이와 쪽이 `conflict` + 값 있는 `errorCode` 를 어떻게 다루는지 확인하고 쓴다 / (나) 관리 화면 전용 칸을 둔다(= `eywa_inbox` migration, DB 먼저) / (다) 칸을 안 바꾸고 기존 감사 기록 `eywa.relation_conflicts`(details 의 bindingId · snapshotId)를 조회해 붙인다.
- «검토 필요»의 원천이 **둘**이다. 관계 충돌(`managedReceiver.ts:168-196` — lastError 와 감사 기록이 남는다)과 **계정 검토 대기 수가 0보다 큼**(`:208-211` — 이때는 lastError 도 null 이고 기록이 없다). 계획의 «충돌 사건 사유와 검토 ID 보존»은 앞의 것만 덮는다. 뒤의 사유(예: «계정 확인 대기 n건 — 아래 계정 연결 및 검토»)를 명시해야 «—»가 남지 않는다.
- 보관 담당자: 주인을 못 찾은 반이 그 계정 **소유로 생성**된다(`src/lib/eywa/managedRelations.ts:248-259, 283-288`) — 학생 명단 접근권이 생긴다. 지금 검증은 «대상 지점 소속 · 미삭제»뿐이다(`managedAdministration.ts:279-289`). 계획의 «소속 · 권한 · CAS · 감사 · 활성 담당자»를 구체화할 것: 최고관리자 전용(기존 `platform_operator_required` 유지) · 대상은 그 지점의 승인 · 미정지 · 미삭제 교사 계정 · `lockBinding` 안에서 현재 값 비교 · 감사에 전/후 값 · **이미 주인이 있는 반은 옮기지 않음**(코드가 `existing?.userId` 를 먼저 본다 — 시험으로 고정) · null→지정만 허용할지 교체도 허용할지.
- 재처리는 conflict 사건을 received 로 되돌릴 뿐이다(`managedAdministration.ts:382-386`). 원인이 남아 있으면 같은 결과가 난다는 안내를 재처리 버튼 옆에 둔다.

### B3. A05 · C01 · B06 — 세는 단위와 «학생당 하나»인 것을 정해야 한다

- 행은 (반, 학생) 등록이고(`src/lib/classAccess.ts:271-317`) DTO 의 id 는 학생 id 다(`src/lib/math-srs/courseServer.ts:110-127`). 저장 뒤 `updateRow` 는 같은 학생 id 의 **모든 행을 응답 한 줄로 갈아 끼운다**(`CourseDashboard.tsx:164-177`) — 다른 반 행의 classId · className 이 덮인다. 상세 · 저장 API 는 studentId 만 받는다(`:633, 686`).
- 학습 계획과 학습 상태는 학생당 하나다. 계획의 «독립 행 선택»만으로는 부족하다. 수용 기준을 셋으로: ⑴ 선택 · 강조 · key 는 (classId, studentId) ⑵ 계획 저장 뒤 **같은 학생의 모든 행**에 plan · summary · revision 이 반영 ⑶ 어느 행도 classId · className 이 안 바뀜.
- 상세 패널의 key 가 `selected.id` 다(`:554`). 복합키로 바꾸면 같은 학생의 다른 반 행으로 옮길 때 패널이 다시 만들어져 계획 입력이 사라진다. B06 의 이탈 경로에 «같은 학생의 다른 반 행»을 넣거나 패널 key 를 studentId 로 유지한다.
- 상태별 수(설정 필요 등)와 C01 의 대상 · 대상 외 수가 **고유 학생** 단위인지 등록 단위인지 적는다(권고: 학생. 반 필터를 걸면 그 반의 학생).
- C01 학년의 원천: 로스터 DTO 에 학년이 없다. 쓸 수 있는 것은 반 학년인데 에이와 반은 학년을 모르면 **"중1" 로 채운다**(`managedRelations.ts:265-270`) — 초등 반이 «대상 외»로 빠질 수 있다. 학년 원천 · 두 반의 학년이 다른 학생의 판정(권고: 하나라도 초3~초6 이면 기본 대상)을 적는다. «대상 외»를 숨기지 않고 수와 필터로 늘 보이게 하는 것은 계획대로 유지.
- C01 «보충학습 대상으로 명시적으로 선택»의 저장: 새 칸 없이 **«대상 외 학생에게 계획을 저장했다 = 보충 대상»으로 파생**하면 계약 · 스키마가 안 바뀌고 기존 보충 계획도 저절로 유지된다. 새 플래그를 원하면 `mathSrsCourse.contract.ts` 와 SRS 상태 CAS 변경을 따로 명세한다.
- `CoursePlanForm` 은 학생 화면(`StudentCourseSrs.tsx`)도 쓴다. dirty 통지는 선택 prop 으로만 더하고 학생 쪽 동작은 바꾸지 않는다.

### B4. 공통 계약 1 · 2 · 4 의 빈칸

- **계약 1 에 셋째 상태 «결과 불명»이 없다**(요청은 갔고 응답을 못 받음). B03 에서 POST 가 커밋된 뒤 응답이 유실되면 비밀번호는 바뀌었고 임시값은 다시 볼 수 없다 — «계정을 다시 읽어 마지막 변경 시각이 바뀌었으면 재발급된 것이며 한 번 더 재발급해야 한다»는 안내가 필요하다. 또 POST 성공이 `updatedAt` 을 올리므로(`src/app/api/admin/users/[id]/password/route.ts:75-91`) 재조회가 성공하기 전에는 그 계정의 다른 변경이 전부 «다른 관리자가 변경» 409 가 된다 → 재조회 성공 전에는 다른 변경을 막고 사유를 보인다. T04 · W08 도 성공 / 실패 / 불명 셋으로 적는다.
- **계약 2 의 «모든 이탈 경로에서 저장 · 버리기 · 계속 편집»은 글자 그대로는 불가능하다.** `<Link onNavigate>` 의 preventDefault 는 SPA 링크 이동만 막고 새 탭 · 외부 주소 · download 에서는 안 돈다(설치본 `link.md`). 탭 닫기 · 새로고침은 브라우저 기본 문구(`beforeunload`)뿐이다. `cacheComponents` 가 꺼져 있어 이동 시 상태 보존도 없다. 경로를 셋으로 나눠 적을 것: 화면 안 이동(3택) / 앱 안 링크(기존 `onClickCapture` + `closest("a")` 패턴 — `AdminUserDetail.tsx:477-484` — 또는 onNavigate) / 새로고침 · 닫기(beforeunload 만). 교재 화면에는 beforeunload 가 없다 — 넣을지 결정.
- **계약 4 는 자유 문자열 `returnTo` 대신 구조화된 값으로.** 목록 상태는 허용 키(`q` · `status` · `page` · `tab`)를 상세 링크에 싣고 복귀 링크는 고정 틀에서 다시 만든다. 셸 사이 복귀(A01 · A03)는 경로가 아니라 열거 토큰(`from=admin-srs|workspace-srs|teaching`)과 id 를 받고 도착지에서 권한을 다시 검사한다. 검색어(이름 · 이메일일 수 있다)를 페이지 주소에 싣는 것을 «민감값»에서 뺀다고 명시한다 — 앱 감사 기록은 쿼리를 안 남긴다(`src/proxy.ts:210-223`, 시험으로 고정). 금지는 임시 비밀번호 · 확인 근거 · 토큰.
- **주소 상태 구현 주의(설치본 문서)** — 클라이언트 `useSearchParams` 는 정적 렌더 경로에서 Suspense 가 없으면 빌드가 실패한다. 서버 page 의 `searchParams`(Promise)로 받아 내려 주거나 Suspense 로 감싼다. 입력 중 갱신은 `window.history.replaceState`(라우터와 동기화된다고 문서에 있다). «목록으로» 링크는 push 이동이라 스크롤이 저절로 복원되지 않는다 — «스크롤 보존»은 브라우저 뒤로가기에만 약속하거나 구현 수단을 적는다.

### B5. 절대 규칙 1(D-07) · 5(D-08) · 6 이 계획에 없다

새 형태가 생기는 항목: A05(수 표기) · A07(복구 흐름) · B01(확인 단계) · C01(필터 · 수) · D01(검색 · 필터) · D02(페이지 · 총수) · D03(미리보기/적용 분리) · D05 · D06(선택기) · D07(미리보기 단계) · T06. 계획에 «기존 확정 컴포넌트 · 패턴만 재사용하는 항목»과 «시안 확정이 필요한 항목»을 가르는 줄을 넣고, 뒤쪽은 지점 관리 고도화 때처럼 위임 근거를 적거나 원장님 확정을 받는다. 문구는 D-08. T01 을 (나)로 가면 규칙 6.

### B6. A08 · W07 — 지연의 주 경로와 «100개»의 전수가 빠졌다

- 긴 로딩의 주 경로는 반마다 `/api/progress`(없으면 `/suggest` 까지)를 부르고 전부 끝나야 그리는 것이며, 한 반의 실패가 화면 전체를 실패시킨다(`src/lib/main/loadMainDashboard.ts:84-103`). 계획의 «핵심/부가 분리»는 tests · metrics 만 말한다 — 그것만 떼면 반 수만큼의 요청은 그대로다. 반별 진도의 격리(그 카드만 실패)와 점진 표시 또는 묶음 조회를 적는다. 수용 기준은 시간이 아니라 **요청 수**로(93반 fixture 에서 첫 카드까지 k회 이하).
- `pageSize=100` 첫 쪽만 읽는 곳은 둘이 아니라 **다섯**이다: `useGenerateSetup.ts:126` · `loadMainDashboard.ts:56` · `src/lib/class/classApi.ts:28`(반 관리 — A01 · A03 의 도착 화면) · `BasketPanel.tsx:56` · `OnboardingForm.tsx:63`. 전 쪽을 읽는 구현은 이미 있다(`src/lib/textbook/client.ts:1397`). 한 함수로 모아 다섯 곳이 쓰게 하고 W07 을 A01 · A03 · D01 보다 먼저 한다. 관찰된 반은 93개다 — 여유 7.
- 전 쪽을 읽으면 반별 진도 요청도 는다. 위 격리 · 묶음과 한 설계로 다룬다.

## 2. 묶음별 필수 보강

교재

- **T02/T03** — dirty 를 거치지 않는 경로는 완성 보기의 구획 버튼(`TextbookStudioView.tsx:1303`)과 보기 전환(`:1320-1323`)이다. 경고 UI 는 `!simplePreview` 분기 안에 있다(`:1696-1721`). 가져오기 폼은 교재를 열지 않았을 때만 보인다 — 계획 목록의 «가져오기»가 뜻하는 경로를 확인한다.
- **T04** — 재조회가 실패해도 **잠금은 즉시** 반영한다. 안 그러면 편집이 열린 채 저장이 DB 잠금에 걸린다. finalize 를 다시 부르지 않는다(재조회만). `pdfJob?.jobId ?? … ?? newRequestId()`(`:2105-2110`)의 새 requestId 폴백으로 확정이 두 번 시도되지 않는지 시험한다.
- **T05** — 개념 PUT 과 구획 PUT 은 서로 다른 CAS 다. 순서를 고정하고(개념 먼저), «개념 저장됨 · 구획 연결 실패»를 따로 표시하고, 재시도는 **연결만** 한다(같은 conceptKey 재생성 금지). 다시 열었을 때 블록 없는 개념을 고를 길을 둔다.
- **T06** — 가져오기 오류는 검수 `issues` 와 **다른 상태**로 둔다. 지금은 같은 `setIssues` 를 쓰고(`:1221`) 책을 열면 지워진다(`:421`).
- **T07** — 요청 세대와 editionId 에 귀속하고 이동 때 `URL.revokeObjectURL`.
- **D06** — `expectedContentHash` 는 «검수자가 본 내용»의 증명이다(`src/lib/textbook/server/videos.ts:6-8, 205-226`). 자동 채움은 **내용을 보여 준 시점의 해시**여야 한다. 제출 시점에 다시 읽어 채우면 낡음 검사가 늘 통과한다. 시험: 표시 뒤 확정본이 바뀌면 409. 초안→검수→게시 단계는 그대로.
- **D05** — 배정 탭의 «불러오는 중»과 «반 없음» 혼동(증빙 «후속 확인»)을 같이 닫을지 표시한다.

연동 · 계정

- **B01** — 복구 안내를 실제 왕복으로 검증한다: 중지 → 활성화(원본이 정상이고 같은 epoch 일 때만 — `managedAdministration.ts:319-325`) → 재조정에서 정지 해제(`managedAccounts.ts:166-168`) → 재로그인. 수동 정지 계정은 풀리지 않는지 시험한다. 영향 수는 서버가 세어 주고 감사 details 에 실제 처리 수를 남긴다.
- **B04** — 가능 여부는 라우트와 **같은 판정 함수**에서 낸다. 행렬: 일반 / `authSource=eywa` / 연결 매핑된 기존 계정 / 최고관리자 / 삭제. 근거 입력 UI 를 새로 여는지 결정한다 — 이번에는 사유 표시까지만 권고.
- **B07** — 실패를 가른다. 검증 · 통신 오류는 근거와 체크를 보존한다. **version 충돌**은 근거 글만 보존하고 최신 후보를 다시 읽으며(지금은 실패 때 새로 읽지 않는다 — `EywaManagement.tsx:50-64`) «확인했습니다» 체크는 푼다. 본인 연결(비밀번호) 경로의 비밀번호 칸은 보존하지 않는다.
- **D07** — POST 는 본문이 없다(`BulkStudentAccountButton.tsx:38-44`). 미리보기와 실행 사이에 명단이 바뀌면 확인하지 않은 학생의 계정이 생긴다. POST 가 확인한 studentId 목록을 받고 서버가 그 부분집합만 발급하게 하거나(계약 변경), 최소한 «미리보기 뒤 추가된 n명»을 결과에 따로 보인다. 권고는 앞의 것.
- **A04** — 이 페이지는 지점 관리자도 연다(`src/app/admin/eywa-sync/page.tsx:6-8`). `AdminHeader` 의 지점 관리 · SRS 는 최고관리자 화면이라 그대로 붙이면 권한 없는 메뉴가 보인다. 역할별 메뉴로(지점 관리자는 `/branch` 복귀).
- **D02** — 한국 시간 표기는 `src/lib/kstDate.ts` 한 곳의 셈만 쓴다. 페이지는 서버 `searchParams`.

SRS · 복귀

- **A01** — 도착지가 역할마다 다르다. 교사는 `/classes/manage`, 원장 · 지점 관리자는 `/branch?tab=classes`(`classes/manage/page.tsx:18-22` 가 돌려보낸다), 최고관리자는 관리 콘솔의 반 · 학생 화면. 셋을 계획에 적고 각 도착지가 반 선택을 받는지 확인한다(`src/hooks/useClassManage.ts:50-58` 은 첫 반을 고른다). 고칠 시험: `src/__tests__/components/CourseDashboard.test.tsx:254, 461`.
- **A06** — «이전»은 제품 지위 선언이다. 대상 개념과 학년 범위를 적는 사실 서술형 이름으로 하거나 원장님 확인을 받는다.

작업실(리드 소유)

- **A09** — 운영 서버가 UTC 라면 한국 브라우저 사용자에게 틀리는 쪽은 **상단 날짜**다(한국 00~09시에 어제로 보인다 — `src/lib/main/pipeline.ts:175-180`). 시행일은 브라우저 날짜라 맞는다. 증빙의 «시행일이 어제»는 한국 밖 시간대 브라우저의 관찰과 맞는다. fixture 에 «UTC 15:00~23:59 서버 + 한국 브라우저»를 넣고 SSR/hydration 불일치가 없는지 본다. 같은 «오늘»을 쓰는 곳: `BasketPanel.tsx:36` · `WorksheetPrint.tsx:73`(인쇄 머리). 시행일은 문항 추첨 씨앗과 최근 출제 제외 창에 들어간다(`src/lib/tests/generateDraftTest.ts:152-160`).
- **W02/W03** — 학생 선택 비우기는 효과가 아니라 `selectClass` 에서 동기로 한다. 안 그러면 명단 도착이 key 를 바꿔 기본 범위를 다시 불러 수동 선택을 덮는다. W03 은 «같은 (반, 학생) key 의 늦은 응답»만 무시한다 — 반 · 학생이 바뀌면 수동 범위를 버린다는 기존 확정(`useGenerateSetup.ts:194-198`)은 유지한다.
- **W01** — 그 행만 서버 값으로 바꾼다. 목록 재정렬이나 필터 이탈로 행이 사라지지 않게 한다.
- **B05** — teaching 단독 계정에서 `/api/tests` · `/api/metrics` 요청이 0회임을 단정한다(`src/lib/accountRouteAccess.ts:180, 190`).
- **D03** — 저장은 지점이 아니라 **서비스 전체 한 키**다(`src/lib/journeyThemeStore.ts:11`). 적용 버튼 문구에 정확한 범위를 적는다.

## 3. 우선순위와 검증 계획

- 계획 표에 우선순위 열이 없다. P1 은 T01 · T02 · T05 · A01 · A05 · A07 · B01 · B03 으로 두고 묶음 안에서 먼저 한다. B02 의 P2 조정에는 동의한다(같은 파일의 B03 과 함께 고치면 된다).
- W07 은 P2 그대로지만 순서를 앞당긴다(B6).
- 검증 3번에 더할 것: T01 학생 비노출 표지 시험과 해시 벡터 · B01 왕복 · B07 version 충돌 · A05 «다른 반 행의 반 이름 불변 + 계획은 양쪽 반영» · A09 UTC 서버/한국 브라우저 · W02→W03 순서(반 변경 → 범위 수동 선택 → 명단 도착) · B05 요청 0회 · D06 낡은 해시 409.

## 4. 37건 대조표

«확인»은 `1285a24f0` 소스에서 실패 경로를 직접 읽었다는 뜻이다(실행 재현 아님).

| ID | 현행 코드 | 순위 | 계획 판정 |
|---|---|---|---|
| A01 | 확인 `CourseDashboard.tsx:446, 1222` | P1 | 보강 — 역할별 도착지 · 시험 2곳 (§2, B4) |
| A02 | 확인 `AdminAccounts.tsx:51-56, 343` · `AdminUserDetail.tsx:488-498` | P2 | 보강 — 구조화된 복귀 값 · 스크롤 범위 (B4) |
| A03 | 확인 `classes/[id]/math-srs/page.tsx:24-27` · `TeachingView.tsx:66` | P2 | 보강 — 열거 토큰 · W07 선행 (B4, B6) |
| A04 | 확인 `eywa-sync/page.tsx` | P2 | 보강 — 역할별 메뉴 (§2) |
| A05 | 확인 `CourseDashboard.tsx:164-177, 394` | P1 | **차단 B3** |
| A06 | 확인(증빙과 같음) | P2 | 보강 — 명칭 (§2) |
| A07 | 확인 `managedReceiver.ts:208-211, 261-279` | P1 | **차단 B2** |
| A08 | 확인 `loadMainDashboard.ts:54-103` | P2 | **차단 B6** |
| A09 | 확인 `useGenerateSetup.ts:47-52` · `pipeline.ts:175-180` | P2 | 보강 — 틀리는 쪽 · 전수 (§2) |
| B01 | 확인 `managedAdministration.ts:221-274` | P1 | 보강 — 왕복 검증 · 영향 수 (§2) |
| B02 | 확인 `AccountReview.tsx:437-440, 451-454` | P2 | 동의 |
| B03 | 확인 `AccountReview.tsx:348-377` | P1 | 보강 — 결과 불명 · 재조회 전 잠금 (B4) |
| B04 | 확인 `password/route.ts:55-76` | P2 | 보강 — 한 판정 함수 (§2) |
| B05 | 확인 `accountRouteAccess.ts:180, 190` | P2 | 보강 — 요청 0회 (§2) |
| B06 | 확인 `CourseDashboard.tsx:554, 743-746` | P2 | **차단 B3**(패널 key) |
| B07 | 확인 `EywaManagement.tsx:309-321` | P2 | 보강 — 실패 종류 (§2) |
| C01 | 확인 `courseServer.ts:110-127` | P2 | **차단 B3**(학년 원천 · 저장 방식) |
| W01 | 확인 `BankView.tsx:196-205` | P2 | 보강 (§2) |
| W02 | 확인 `useGenerateSetup.ts:167-192` | P2 | 보강 — 동기 비우기 (§2) |
| W03 | 확인 `useGenerateSetup.ts:199-232` | P2 | 보강 — 기존 확정 유지 (§2) |
| W07 | 확인 — 소비처 5곳 | P2, 먼저 | **차단 B6** |
| W08 | 확인 `ConceptView.tsx:127-143, 178-185` | P2 | 보강 — 셋째 상태 (B4) |
| W09 | 확인 `ConceptBlankView.tsx:590-603` | P2 | 동의 |
| T01 | 확인 `client.ts:633, 712-722` | P1 | **차단 B1** |
| T02 | 확인 `TextbookStudioView.tsx:1303, 1320-1323` | P1 | 보강 (§2, B4) |
| T03 | 확인 `:1006, 1696-1721` | P2 | 보강 (§2) |
| T04 | 확인 `:2101-2117` | P2 | 보강 — 즉시 잠금 (§2) |
| T05 | 확인 `:1908-1935, 272-287` | P1 | 보강 — 두 CAS 의 부분 실패 (§2) |
| T06 | 확인 `:1219-1238` | P2 | 보강 — 상태 분리 (§2) |
| T07 | 확인 `:1425-1434` | P2 | 보강 (§2) |
| D01 | 해당 화면에 필터 없음 | 개선 | 보강 — W07 뒤 · D-07 (B5) |
| D02 | 확인 `managedAdministration.ts:48, 64, 75` | 개선 | 보강 (§2, B5) |
| D03 | 확인 `JourneyThemePicker.tsx:96-118` | 개선 | 보강 — 범위 문구 · D-07 (§2, B5) |
| D04 | 확인 `EywaManagement.tsx:96-108` | 개선 | 동의 |
| D05 | 확인 `TextbookStudioView.tsx:1482` | 개선 | 보강 (§2) |
| D06 | 확인 `parts.tsx:2606-2656` | 개선 | 보강 — 해시는 증명 (§2) |
| D07 | 확인 — 미리보기 GET 은 있고 버튼이 안 쓴다 | 개선 | 보강 — 확인한 대상만 (§2) |

## 5. 재검토 조건

수정안에서 확인할 것: B1 의 계약 여덟 줄과 지면 선택 · B2 의 세 선택(외부 응답, 두 원천, 담당자 조건) · B3 의 단위와 병합 규칙 · B4 의 셋째 상태와 이탈 경로 구분 · B5 의 D-07 구분 줄 · B6 의 반별 진도와 다섯 소비처. 이 여섯이 들어가면 §2 는 구현 명세에서 다뤄도 된다.
