# SRS·복귀 준비 검토 — 2026-10-04

판정: **구현 준비 완료, 구현 미착수**. root 요청에 따라 준비 검토를 종료하며 실제 소스 구현·테스트·구현 커밋은 최종 Claude/Grok 재검토 승인 이후 별도 작업에서 진행한다. 이 보고서는 항목 완료 증빙이 아니다.

## 읽은 근거

- 실행 계획: `docs/planning/admin-usability-remediation-20261004.md`.
- root 증빙: `admin-page/.tmp-admin-ui/review-20261004/sources/source-findings.md`, 재현 경로 목록.
- 현재 작업 트리: `049f08f65d4c4c41d07b66d1bb87c92e1a3f8d20`; root가 기록한 계획의 소스 대조 기준과 독립적으로 진전한 main은 구현 시작 전에 조정해야 한다.
- 설치된 Next 문서: root `node_modules/next/dist/docs/01-app`의 `use-router`, `use-search-params`, `link`, `linking-and-navigating`. `router.push/replace` 입력 검증, `Link.onNavigate`, query/history 동기화 및 Suspense 조건을 확인했다.
- React 스킬: `vercel-react-best-practices`, `vercel:react-best-practices`를 읽었으며 실제 구현에서 적용한다.

## 담당 항목과 구체적 수정 경계

| ID | 확인한 코드 근거 | 구현 경계와 필수 검증 |
|---|---|---|
| A01 | `CourseDashboard`의 두 계정 확인 링크가 라우트 없는 `/classes/{id}`를 가리킴. 실제 관리 진입점은 `/classes`, `/classes/manage`, 지점 관리의 classes 탭이며 학생 계정 선택은 `StudentList` 내부 상태임. | 허용된 실제 관리 경로로 `classId`, `studentId`, 안전한 SRS 복귀 맥락을 전달. `useClassManage`에서 요청 반이 없으면 명시적 안내, 다른 반으로 조용히 대체하지 않음. `StudentList`에서 조회 완료 후 요청 학생 선택, 권한이 없으면 불가 안내. 잘못된 링크를 기대하는 기존 테스트를 실제 목적지·반·학생 복원 검증으로 교체. |
| A02 | `AdminAccounts`의 검색·필터·페이지·검토 선택, `AdminBranchDetail`의 탭이 로컬 상태임. `AdminUserDetail`은 쿼리 없는 지점 URL로 복귀함. | 목록 상태를 URL에 저장하고 상세 링크에 허용된 동일 지점 복귀 URL 포함. 지점 탭 및 상세 탭도 URL 상태로 관리. scroll은 검증된 동일 화면 키만 사용. 새로고침·새 탭·직접 진입·브라우저 back과 다른 지점/외부/민감 query 거부를 검증. |
| A03 | `TeachingView`가 항상 classes 탭으로 시작하고 `useClassManage`는 조회 첫 반을 선택함. `/classes/manage`의 지점 관리자 redirect와 기존 SRS의 `manageHref`가 선택 맥락을 버림. 작업실의 view는 hash 중심으로 관리됨. | 독립/작업실/지점 셸별 tab·classId·studentId·허용 hash를 보존. 관리 redirect는 검증한 맥락만 유지. 기존 SRS 복귀는 방문 셸로 돌아가며 무효 값은 안전한 기본값. root의 `MainScreen` 변경과 URL 계약을 맞춤. |
| A04 | `admin/eywa-sync/page.tsx`가 standalone main만 반환함. `AdminHeader`는 이미 `active="eywa"` 지원. | 페이지에 공통 `AdminHeader`·eywa 활성 메뉴·지점 복귀를 적용. `EywaManagement` 내부는 계정 worker 소유. 기존 승인/관리자 gate 유지. |
| A05 | 서버 `loadOperationalRoster`는 같은 학생을 반별 등록 행으로 반환하지만 대시보드의 map/key/선택/갱신은 학생 ID만 사용함. `requireOwnedStudent`는 등록 중 하나를 임의 선택할 수 있음. | 행 key/선택을 `(classId, studentId)`로 식별. 상세/저장 optional classId는 기존 `requireOwnedStudentInClass`로 소속과 권한 검증. 공유 plan/revision/summary 갱신은 학생 ID에 적용하되 각 행의 classId/className/학년 메타데이터 보존. 1명/2반 fixture로 학생 1명·등록 2건과 독립 선택·stale 조회·반 메타데이터 보존 검증. |
| A06 | `ClassManage`가 기존 반별 `ClassMathSrs`를 ‘수학 복습 현황’으로 소개하고 현재 과정 대시보드와 명칭이 겹침. | 기존 엔진을 ‘이전 개념 복습’으로 표시하고 실제 학년·반 등록 범위 설명. 현재 과정 SRS 진입점을 안내하며 이력 삭제·재계산 및 엔진 교체 없음. 기존 반별 화면의 복귀 맥락 함께 보존. |
| B06 | `CoursePlanForm`은 입력을 자체 state에 보관하고 dirty 계약이 없음. `StudentDetail`은 학생 ID로 remount되며 닫기/Escape/학생 전환이 저장 중에도 가능함. | 원본 대비 dirty/draft/valid 상태를 노출하고 대시보드가 이탈을 조율. 닫기·Escape·다른 등록 행·tab·내부 경로·브라우저 이탈 보호 및 저장/버리기/계속 편집 제공. 실제 원복하면 dirty 해제, 실패하면 원고 유지, saving ref와 request generation으로 중복/다른 학생 저장 차단. |
| C01 | 과정 roster DTO에 학년이 없고 모든 등록 행을 설정 필요에 포함함. `Student.schoolGrade`는 optional이며 실제 등록 반은 grade를 갖고 있음. | root 승인 정책대로 명시적 반 학년을 DTO에 포함하여 기본 초3~초6/보충 대상 구분. 고유 기본 대상 설정 필요 수와 보충 수/명시 필터, 이미 설정한 보충 계획 유지. 같은 학생의 서로 다른 학년 반 fixture에서 scope 및 고유 수 검증. |

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
