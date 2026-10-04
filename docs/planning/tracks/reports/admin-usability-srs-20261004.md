# SRS·복귀 준비 검토 — 2026-10-04

판정: **구현 준비 완료, 구현 미착수**. root 요청에 따라 준비 검토를 종료하며 실제 소스 구현·테스트·구현 커밋은 최종 Claude/Grok 재검토 승인 이후 별도 작업에서 진행한다. 이 보고서는 항목 완료 증빙이 아니다.

## 읽은 근거

- 실행 계획: `docs/planning/admin-usability-remediation-20261004.md`.
- root 증빙: `admin-page/.tmp-admin-ui/review-20261004/sources/source-findings.md`, 재현 경로 목록.
- 현재 작업 트리: `049f08f65d4c4c41d07b66d1bb87c92e1a3f8d20`; root가 기록한 계획의 소스 대조 기준과 독립적으로 진전한 main은 구현 시작 전에 조정해야 한다.
- 설치된 Next 문서: root `node_modules/next/dist/docs/01-app`의 `use-router`, `use-search-params`, `link`, `linking-and-navigating`. `router.push/replace` 입력 검증, `Link.onNavigate`, query/history 동기화 및 Suspense 조건을 확인했다.
- React 스킬: `vercel-react-best-practices`, `vercel:react-best-practices`를 읽었으며 실제 구현에서 적용한다.

## 담당 항목과 구체적 수정 경계

| ID  | 확인한 코드 근거                                                                                                                                                                                                   | 구현 경계와 필수 검증                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 | `CourseDashboard`의 두 계정 확인 링크가 라우트 없는 `/classes/{id}`를 가리킴. 실제 관리 진입점은 `/classes`, `/classes/manage`, 지점 관리의 classes 탭이며 학생 계정 선택은 `StudentList` 내부 상태임.             | 허용된 실제 관리 경로로 `classId`, `studentId`, 안전한 SRS 복귀 맥락을 전달. `useClassManage`에서 요청 반이 없으면 명시적 안내, 다른 반으로 조용히 대체하지 않음. `StudentList`에서 조회 완료 후 요청 학생 선택, 권한이 없으면 불가 안내. 잘못된 링크를 기대하는 기존 테스트를 실제 목적지·반·학생 복원 검증으로 교체.   |
| A02 | `AdminAccounts`의 검색·필터·페이지·검토 선택, `AdminBranchDetail`의 탭이 로컬 상태임. `AdminUserDetail`은 쿼리 없는 지점 URL로 복귀함.                                                                             | 목록 상태를 URL에 저장하고 상세 링크에 허용된 동일 지점 복귀 URL 포함. 지점 탭 및 상세 탭도 URL 상태로 관리. scroll은 검증된 동일 화면 키만 사용. 새로고침·새 탭·직접 진입·브라우저 back과 다른 지점/외부/민감 query 거부를 검증.                                                                                        |
| A03 | `TeachingView`가 항상 classes 탭으로 시작하고 `useClassManage`는 조회 첫 반을 선택함. `/classes/manage`의 지점 관리자 redirect와 기존 SRS의 `manageHref`가 선택 맥락을 버림. 작업실의 view는 hash 중심으로 관리됨. | 독립/작업실/지점 셸별 tab·classId·studentId·허용 hash를 보존. 관리 redirect는 검증한 맥락만 유지. 기존 SRS 복귀는 방문 셸로 돌아가며 무효 값은 안전한 기본값. root의 `MainScreen` 변경과 URL 계약을 맞춤.                                                                                                                |
| A04 | `admin/eywa-sync/page.tsx`가 standalone main만 반환함. `AdminHeader`는 이미 `active="eywa"` 지원.                                                                                                                  | 페이지에 공통 `AdminHeader`·eywa 활성 메뉴·지점 복귀를 적용. `EywaManagement` 내부는 계정 worker 소유. 기존 승인/관리자 gate 유지.                                                                                                                                                                                       |
| A05 | 서버 `loadOperationalRoster`는 같은 학생을 반별 등록 행으로 반환하지만 대시보드의 map/key/선택/갱신은 학생 ID만 사용함. `requireOwnedStudent`는 등록 중 하나를 임의 선택할 수 있음.                                | 행 key/선택을 `(classId, studentId)`로 식별. 상세/저장 optional classId는 기존 `requireOwnedStudentInClass`로 소속과 권한 검증. 공유 plan/revision/summary 갱신은 학생 ID에 적용하되 각 행의 classId/className/학년 메타데이터 보존. 1명/2반 fixture로 학생 1명·등록 2건과 독립 선택·stale 조회·반 메타데이터 보존 검증. |
| A06 | `ClassManage`가 기존 반별 `ClassMathSrs`를 ‘수학 복습 현황’으로 소개하고 현재 과정 대시보드와 명칭이 겹침.                                                                                                         | 기존 엔진을 ‘이전 개념 복습’으로 표시하고 실제 학년·반 등록 범위 설명. 현재 과정 SRS 진입점을 안내하며 이력 삭제·재계산 및 엔진 교체 없음. 기존 반별 화면의 복귀 맥락 함께 보존.                                                                                                                                         |
| B06 | `CoursePlanForm`은 입력을 자체 state에 보관하고 dirty 계약이 없음. `StudentDetail`은 학생 ID로 remount되며 닫기/Escape/학생 전환이 저장 중에도 가능함.                                                             | 원본 대비 dirty/draft/valid 상태를 노출하고 대시보드가 이탈을 조율. 닫기·Escape·다른 등록 행·tab·내부 경로·브라우저 이탈 보호 및 저장/버리기/계속 편집 제공. 실제 원복하면 dirty 해제, 실패하면 원고 유지, saving ref와 request generation으로 중복/다른 학생 저장 차단.                                                 |
| C01 | 과정 roster DTO에 학년이 없고 모든 등록 행을 설정 필요에 포함함. `Student.schoolGrade`는 optional이며 실제 등록 반은 grade를 갖고 있음.                                                                            | root 승인 정책대로 명시적 반 학년을 DTO에 포함하여 기본 초3~초6/보충 대상 구분. 고유 기본 대상 설정 필요 수와 보충 수/명시 필터, 이미 설정한 보충 계획 유지. 같은 학생의 서로 다른 학년 반 fixture에서 scope 및 고유 수 검증.                                                                                            |

## 승인된 소유 경계

root의 Orca ask 답변으로 `AdminBranchDetail` 탭, `classes/manage` redirect 및 이전 SRS 복귀 맥락까지 수정 소유가 승인되었다. `CourseDashboard/CoursePlanForm`, 과정 계약·서버·teacher route·client API, 공통 안전 복귀 helper, `AdminAccounts/AdminUserDetail`, `TeachingView` URL/탭, `useClassManage`·`ClassManage/StudentList/ClassMathSrs`가 본 worker 경계다.

root는 `ClassTable.tsx`, `classApi.ts`, `MainScreen/loadMainDashboard`를 소유한다. `fetchClasses/fetchStudents`의 기존 export 이름은 유지하면서 root가 전체 페이지 조회를 구현한다. `TeachingView`에는 optional `user.menus`를 타입에 포함하고 `allowedMenus={access.data.user.menus}`를 전달하되 prop 구현은 root가 맡는다. 계정 worker는 `AccountReview/EywaManagement/BulkStudentAccountButton`, 교재 worker는 모든 교재 파일을 소유한다.

## 구현 전 반드시 확정할 계약

1. 공통 복귀 helper는 경로·query·hash를 화면별 allowlist로 정규화하고 동일 지점 검증을 받는다. `returnTo`의 재귀 중첩과 외부/프로토콜 상대/encoded 경로 우회, 임의 sensitive query는 거절한다. URL은 화면 맥락이며 서버 소속·메뉴 gate의 대체가 아니다.
2. URL 업데이트는 현행 작업실 hash와 무관한 query를 보존한다. Next router에 임의 입력을 직접 보내지 않는다. 필요한 `useSearchParams`에는 설치 문서가 요구하는 Suspense 또는 서버 page prop 전달을 적용한다.
3. dirty 보호는 폼 외부에서 유지하여 탭 변경 후에도 표시된다. 조회 refresh가 원고를 reset하지 않아야 하며 저장 성공 뒤 상세 GET 실패는 재저장으로 유도하지 않는다.
4. root 최신 main과의 통합 이후 관련 컴포넌트·API·DTO·복귀 helper 테스트와 타입 검사를 수행한다. 실제 브라우저 refresh/new-tab/back/scroll 검증은 jsdom의 URL 단언과 구분하여 기록한다.

## 상태와 남은 작업

정책·권한을 바꾸어야 하는 blocker는 발견되지 않았다. root에 위 경계와 준비 완료를 전달했고 소유 추가는 승인받았으나 **최종 계획에 대한 소스 편집 허가는 아직 받지 않았다**. 따라서 구현·테스트 실행·운영 쓰기·push는 수행하지 않았다.

---

# 승인 v02 실제 구현 — 2026-10-04

이 아래는 위 준비 검토 및 준비 커밋 `875a2222e`와 별개인 **실제 소스 구현과 검증 기록**이다. Claude·Grok의 실제 최종 승인과 새 Dispatch `ctx_20371fbbbd96`에 따라 A01·A02·A03·A04·A05·A06·B06·C01의 소유 경계를 구현했다. 구현 전에 root의 `BIGSHOL/admin-page`를 `914e6a675`까지 병합했고, 전체 페이지 반·학생 조회 변경 `d219ad715`도 병합했다.

## 구현 결과

| ID  | 실제 변경                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 | 계정 확인 링크를 허용된 `/classes/manage` 또는 지점 원장·관리자의 `/branch?tab=classes`로 교체했다. 최고 관리자는 지점 소속 여부와 무관하게 허용된 독립 관리 경로를 사용한다. `classId`, `studentId`, 열거형 출발 화면을 전달하고, 반·학생 조회 완료 뒤 해당 등록을 복원한다. 없거나 접근 불가한 요청 반은 명시적으로 안내하며 첫 반으로 대체하지 않는다.                                                                            |
| A02 | 지점 계정 목록의 q·status·page·tab·selection과 상세 탭을 URL에 유지한다. 검색어는 이름·이메일을 허용하고 비밀번호·증빙·토큰 query는 복귀 helper에서 거부한다. 상세 복귀는 현재 지점의 고정 목록 경로이며 scroll은 정규화한 동일 화면에서만 복원한다.                                                                                                                                                                                 |
| A03 | `admin-srs`, `workspace-srs`, `teaching` 열거형과 검증한 ID만으로 셸 복귀 경로를 만든다. 현재 query·hash를 보존하며 `/classes/manage`의 지점 redirect도 선택 맥락을 보존한다. 외부·프로토콜 상대·encoded 경로·다른 지점·재귀 return 및 알 수 없는 query를 거부한다.                                                                                                                                                                  |
| A04 | eywa 동기화 페이지에 역할별 `AdminHeader`와 복귀 링크를 적용했다. 최고 관리자만 지점 전체·관리자 SRS 메뉴를 보고, 지점 원장·관리자는 자기 지점으로 돌아간다. 기존 서버 접근 gate는 유지했다.                                                                                                                                                                                                                                         |
| A05 | React key·선택·강조를 `classId:studentId`로 식별한다. 계획·revision·summary는 학생별 공유 상태로 갱신하고 각 등록 행의 classId·className·classGrade는 보존한다. optional classId를 사용하는 상세/저장은 서버 `requireOwnedStudentInClass`를 거친다. 학생·설정 필요·학습 대상 수와 등록 건수를 구분한다.                                                                                                                              |
| A06 | 기존 개념 카드 엔진을 실제 대수 6개 개념 범위로 표시하고 과정 SRS 진입점을 제공했다. 이전 이력이나 엔진 상태를 재분류·재계산하지 않는다.                                                                                                                                                                                                                                                                                             |
| B06 | 원본과 실제 입력값을 비교하는 optional dirty callback을 `CoursePlanForm`에 추가했다. 닫기·Escape·다른 학생·같은 학생의 다른 반·탭·내부 링크·작업실 키보드/메뉴/hash/popstate 이동에서 저장 후 이동·버리고 이동·계속 편집을 제공한다. 저장 중 전환을 잠그고 최초 학생/반을 저장 대상으로 고정하며 native beforeunload를 적용했다. 성공한 저장 뒤 후속 상세 조회가 실패해도 저장 결과를 유지한다. 학생 화면의 기존 폼 호출은 그대로다. |
| C01 | 학생 학년을 덮어쓰지 않고 반 학년을 roster DTO에 제공한다. 어느 등록이든 정확한 초3–초6이면 고유 기본 대상 1명으로 계산한다. 나머지는 보충/학년 확인 필요로 계속 표시·필터링하고 기존 계획을 유지한다. 보충 학생은 명시적 설정 안내 후 계획을 저장하면 학습 대상에 포함되며 새 스키마 flag는 추가하지 않았다.                                                                                                                        |

root가 후속으로 `UnifiedWorkspace` 네비게이션 연결까지 소유를 확장했다. `ClassTable`, `classApi`, `MainScreen`, `loadMainDashboard`의 root 변경과 계정 worker의 `AccountReview` 폼은 편집하지 않았다. `TeachingView`에서 root의 `allowedMenus` prop에 허용 메뉴를 전달했다.

## 검증 근거와 경계

- 중간 재검증: CourseDashboard·ClassManageWorkflow **51/51**, AdminAccounts·AdminUserDetail·AdminHeaderRoles·TeachingView·ClassManage·roster metadata **73/73**, 작업실 SRS 이동 sidebar·키보드·hashchange·popstate **4/4** 통과.
- 신규 API fixture는 실제 저장소 쓰기 없이 두 등록의 반별 소속 검증·불가 반 거절·classId 누락 호환을 검증한다. 복귀 helper fixture는 외부/encoded/다른 지점/재귀/sensitive query 거절, 허용 검색어 및 hash·scroll 화면 정규화를 검증한다.
- React 최종 검사에서 발견한 URL 복원 effect와 ref 제어 문제는 파생 상태·안정적인 callback·`useImperativeHandle`로 수정했다. 이 수정과 같은 등록 행 클릭 보호에 대한 최종 검증은 아래 추가 기록에서 확정한다.
- 설치된 Next 16.3의 async params/searchParams 및 useSearchParams/Suspense 문서를 읽고 server page는 Promise prop을 await한다. 공통 query hook은 브라우저 외부 저장소 구독과 빈 server snapshot으로 정적 prerender 경계를 유지한다.
- 학교 학년 기본값 중1과 확인된 중1은 데이터만으로 구별할 수 없어 보충/학년 확인 필요로 함께 표시한다. jsdom 검증은 실제 브라우저 refresh/new-tab/back/scroll 검증을 대신하지 않으며 최종 브라우저 통합은 root 담당이다.
- 운영 쓰기·push·배포·의존성/lockfile 변경·Prisma generation·추가 worker는 실행하지 않았다.

실제 구현 커밋: `388ecdee5`; root 전체 목록 조회 병합: `be50527a1`. 후속 코드·fixture 및 최신 root 통합 뒤 검증 결과는 아래에 추가한다.

추가 fixture와 React 수정 이후 CourseDashboard·ClassManageWorkflow·AdminAccounts·UnifiedWorkspace.access의 **4개 파일, 133/133 테스트**가 통과했다(115.61초). 변경한 다섯 React 파일의 ESLint 재검사도 오류·경고 없이 통과했다. 이 결과에는 실제 CourseDashboard의 셸 이동 이벤트 거절, 같은 등록 행 재선택 guard 및 접근 불가 반의 자동 대체 거절이 포함된다.

## 최종 담당 검증과 실제 브라우저 추가 승인 범위

판정: **A01·A02·A03·A04·A05·A06·B06·C01 담당 구현 완료**. 실제 구현/fixture 커밋은 `388ecdee5`, `c8de0a7bb`이고, 타입 오류가 있었던 테스트의 지원하지 않는 `getByRole exact` 옵션 세 곳은 `cde93fadf`에서 제거했다. root `4d95f078f` 병합은 `ab9d92652`, 최종 root `6cae54e8c` 및 root 당시 main 통합 병합은 `e03a3b1e2`다.

- root 통합 뒤 관련 course API·server·class authorization·안전 복귀·roster metadata·학생 SRS·TeachingView **8개 파일 139개 케이스**를 확인했다. 첫 병렬 실행은 138 통과/TeachingView 동적 로딩 대기 1회 시간 초과였으며, TeachingView 단독 재실행은 **11/11 통과**했다. 다른 7개 파일은 첫 실행에 모두 통과했다.
- 담당 production **24개 파일 ESLint 오류·경고 0**; 새 `e2e/admin-srs` fixture도 ESLint 오류·경고 0이다.
- worker가 실행한 전체 8GB 타입 검사는 production 오류 없이 위 테스트 옵션 오류 세 곳을 보고했다. 해당 오류는 모두 수정·커밋했다. 코디네이터는 검사 프로세스 경합을 피하도록 추가 전체 타입 검사 실행을 중단하도록 지시했고, 이후 전체 통합 타입·빌드를 root가 맡았다. **worker의 최종 전체 타입 검사를 통과했다고 주장하지 않는다.**

코디네이터의 후속 요청으로 단위 테스트와 별도로 **실제 Edge 브라우저 acceptance**를 수행했다. `e2e/admin-srs`는 port 4326의 독립 Vite preview에서 production CourseDashboard/CoursePlanForm, UnifiedWorkspace 셸 이동, ClassManage/StudentList, AdminUserDetail 복귀 링크를 실행한다. Link/router/dynamic은 client framework shim이며 열지 않는 타 메뉴는 fixture로 대체한다. API는 브라우저 로컬 합성 데이터여서 운영 저장소에 접근하지 않는다. 서버의 실제 반 소속 gate는 위 API 검증 근거로 판단한다.

| 실제 브라우저 케이스         | 확인 결과                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 중복 반 등록과 보충 설정     | 학생 2명/등록 3건, 같은 학생 각 반의 계정 링크·독립 강조, 중2 등록에서 저장한 공유 계획이 초3·중2 행에 함께 반영되며 반 이름/학년은 보존. 보충 학생의 학년·학기·단원·소단원을 명시적으로 선택한 뒤 저장하면 계획 대상 2명이 됨. |
| 원고와 저장 대상             | Escape·동일 학생 다른 반·탭 이동에서 계속 편집/버리고 이동/저장하고 이동, 원본 값 복원, 최초 학생/반으로 저장 검증.                                                                                                             |
| production 작업실 셸         | 키보드 Enter와 hash 이동을 막고 계속 편집 시 SRS 유지, 버리기 및 저장 뒤 허용한 작업실 이동 실행.                                                                                                                               |
| native 이탈과 busy           | 실제 `beforeunload` 브라우저 dialog를 취소하면 원고 유지; 지연 중인 저장에서 다른 등록 행/Escape 전환 차단 및 최초 반으로 저장.                                                                                                 |
| 직접 링크·새로고침·안전 복귀 | 등록 반·학생으로 직접 이동/새로고침 복원, admin SRS 복귀 맥락 유지, 원장/관리자·최고 관리자·SRS-only 목적지 구분, 외부·다른 지점·재귀 return 거부.                                                                              |
| 반응형·실행 오류             | 320·390·1440px에서 실제 계획 화면의 document overflow 없음 및 pageerror 0. agent-browser로 내용/오버레이/실행 오류를 확인하고 화면을 직접 확인함.                                                                               |

**6개 고유 브라우저 케이스 통과**: main 실행에서 5개가 통과했고, 중복/보충 케이스는 비어 있는 보충 진도의 명시 선택 및 Playwright label 선택자를 수정한 focused 재실행에서 1/1 통과했다. main 실행의 5개는 3.8초/1.8초/12.0초/4.1초/3.9초, focused 케이스는 3.9초다. 단일 실행 6/6으로 오해하지 않도록 실행 경계를 구분한다.

화면 증빙: [320px](evidence/admin-usability-srs-20261004/srs-320.png), [390px](evidence/admin-usability-srs-20261004/srs-390.png), [1440px](evidence/admin-usability-srs-20261004/srs-1440.png). 재실행 방법과 fixture 한계는 `e2e/admin-srs/README.md`에 기록했다.

남은 작업은 root의 전체 통합 타입·빌드와 타 worker의 계정 폼/교재 guard 통합 확인이다. root가 후속 소유를 인계받은 UnifiedWorkspace production 및 UnifiedWorkspace.access 테스트를 더 편집하지 않았다. 이번 브라우저 검증은 실제 Next 서버 redirect·DB 쓰기를 실행한 검증이 아니며, 계정 목록 scroll과 브라우저 history 전체 스택 복원은 helper/jsdom 근거와 root 전체 통합 확인 범위로 남긴다.
