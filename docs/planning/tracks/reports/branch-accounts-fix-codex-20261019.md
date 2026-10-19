# 지점 관리 화면 수정 결과 — 2026-10-19

브리프의 네 항목을 `fix/branch-students-menu` 작업 폴더에 반영했다. 시작 HEAD는 `0ed024b8529d58ae8fac27f097d1c8aa92df9f2f`다. 커밋·스테이징·푸시는 하지 않았다.

## 변경 내용

| 요구 | 반영 |
| --- | --- |
| 수업 메뉴 없는 지점 관리자의 학생 조회 403 | `GET /api/branch/students`를 추가하고 `BranchAccounts`의 초기 조회와 반 선택·페이지 이동 조회를 새 경로로 변경했다. |
| 종강 반 제외 | `GET /api/branch/classes`에 `active: true` 및 `closedAt`이 없거나 현재보다 미래인 조건을 적용했다. 종강 시각과 같은 경우도 제외한다. |
| 행·열 정렬 | 직원 목록은 이름·계정 유형·이메일, 담당 강사 목록은 반 이름·학년·학생 수·담당 강사로 구성한 native table로 변경했다. |
| 학생 반 배정 분리 | 세부 메뉴를 `반 관리 → 학생 반 배정 → 계정 관리`로 구성했다. `/branch?tab=students`에서 기존 학생 배정 폼과 저장 동작을 제공한다. 기본 진입은 기존 계정 관리다. |

새 학생 GET은 기존 POST와 같은 `authorizeAccount`·`canManageStudentAccounts` 정책과 계정의 `branchId`를 요구한다. 반 조회도 `{ id: classId, branchId }`로 제한한다. 권한 없는 계정·다른 지점 반·소속 없는 반·없는 반은 학생 조회 전에 403, 미로그인은 401, 잘못된 쿼리는 400을 반환한다. 최고관리자도 이 GET에서는 계정의 지점 범위로 제한한다.

기존 `/api/students`의 `studentListQuerySchema`, `studentListResponseSchema`, `serializeStudent`, 현재 수강 관계 조회를 재사용했다. `{ data, meta: { page, pageSize, total } }`, 기본 1페이지·20명, 최대 100명, 생성 시각 정렬과 연동 학생의 반별 조회·직렬화를 보존했다. 성공 응답은 `no-store`이며 새 GET에도 `withErrorLog`를 적용했다. `accountRouteAccess`와 기존 POST·PATCH는 변경하지 않았다.

화면은 기존 색·글꼴·테두리와 공통 토큰을 사용한다. 새 문구는 요청된 열 이름과 탭 이름 범위다. 가용 컨테이너 600px 이하에서는 열을 아래로 접고 각 값에 열 이름을 표시한다. 긴 이름·이메일의 줄바꿈과 입력 폭을 보장하며, 행에는 hover 배경·손가락 커서·클릭 동작을 추가하지 않았다. 담당 강사 선택기의 44px 높이와 초점 표시도 확인했다.

## 클래스 API 사용처와 영향

`src`, `scripts`, `e2e`의 경로 참조를 조사한 결과 실제 화면 소비자는 `BranchAccounts.tsx` 한 곳이다. 반환 목록은 담당 강사 배정, 학생 등록·반별 계정 발급의 반 선택, 학생 반 배정의 현재 반·옮길 반에 쓰인다. 이 목록과 선택지에서 종강 반이 제외된다.

`id`, `name`, `grade`, `userId`, `user.name`, `_count.students`, `{ data }` 래퍼와 정렬을 유지했으며, 다른 운영 화면 소비자는 발견하지 못했다. 기존 `teacherRoster` 시험도 통과했다. 학생 GET 자체는 같은 지점 반의 읽기를 제공하며, 운영 여부·연동 여부를 추가 제한하지 않는다. 운영 반 제한은 클래스 목록에 적용했다.

## 자동 검증

| 검사 | 결과 |
| --- | --- |
| 관련 Vitest 9개 파일 | 142개 통과 — 신규 API 32개, 신규 화면 4개 및 기존 회귀 시험 포함 |
| 페이지 시험의 지점 API mock 보강 후 영향받은 화면 시험 재실행 | 2개 파일·20개 통과 |
| `npm run type-check -- --incremental false` | 통과 |
| 수정 TS·TSX 7개 파일 ESLint | 통과 — 마지막 시험 mock 보강 후 해당 파일도 재실행 |
| `npm run lint:affordance` | 통과 |
| `git diff --check` | 통과 |

관련 시험 범위:

```sh
npm test -- \
  src/__tests__/api/branchAccountsRead.test.ts \
  src/__tests__/api/branchManagement.test.ts \
  src/__tests__/api/class.test.ts \
  src/__tests__/api/teacherRoster.test.ts \
  src/__tests__/api/managedClassAccess.test.ts \
  src/__tests__/unit/accountRouteAccess.test.ts \
  src/__tests__/unit/errorLogRouteCoverage.test.ts \
  src/__tests__/components/BranchAccounts.test.tsx \
  src/__tests__/components/AdminPages.test.tsx --maxWorkers=2
```

권한·다른 지점 차단·엄격한 쿼리·페이지/메타·연동 수강 관계·종강 경계·새 조회 URL·탭 순서와 분리·기존 배정 요청을 확인했다. `errorLogRouteCoverage` 14개는 새 GET도 자동 검사하므로 가드 파일 수정이 필요하지 않았다.

시험은 mock/인메모리 DB를 사용했다. 기존 `managedClassAccess` 거절 사례의 오류 기록 mock에 `create`가 없다는 로그와, `AdminPages`의 기존 `/api/admin/journey-theme` MSW 미등록 로그가 남지만 모든 단언과 실행 게이트는 통과했다. 이번 화면에서 발생하던 지점 계정·반 조회의 MSW 미등록 로그는 해당 페이지 시험의 handler 추가로 정리했다.

## 브라우저 검증

실제 `BranchPage`, `BranchAccounts`, 관리 셸 CSS와 전역 CSS를 임시 Vite fixture에서 렌더링하고 Chrome headless로 확인했다. 예시 데이터에는 긴 반 이름·직원 이름·이메일과 페이지 이동을 위한 101명 메타를 사용했다. API는 브라우저에서 가로챘고 인증, Next 링크/라우팅·동적 패널, 로그아웃, `TeachingView` 경계는 대체했다.

- 1920·1280·1050·768·760·390·320px × 3개 탭, 총 21개 조합에서 문서 가로 넘침과 콘솔·페이지 오류 없음.
- 목록의 행별 열 위치 일치, select 최소 높이 44px, 행의 pointer 없음 확인.
- 1280×600의 짧은 화면에서 담당 강사 변경, 세 탭 이동, 학생 반 배정, 계정 목록 2페이지 조회 확인. POST·PATCH는 모두 가로챈 요청으로 실제 저장하지 않았다.
- 담당 강사 선택기의 3px 초점 표시와 행 hover 전후 배경 동일 확인. 계정 관리의 CSS 200% 확대에서도 문서 가로 넘침 없음.
- 기존 `/api/students`로 나가는 요청 없음. 배정 PATCH의 기존 URL·본문 유지 확인.

이는 격리된 화면·요청 검증이다. 실제 Next 서버의 인증·proxy 통과, 운영 계정·운영 DB 조회와 저장, 동적 학생 계정 패널·반 관리 본체의 실사용 검증으로 확대하지 않는다. 학생 앱·인쇄 화면·사이드바 최대화는 이번 수정 대상이 아니다.

측정값: [browser-check.json](branch-accounts-fix-codex-20261019/browser-check.json). 재실행용 임시 fixture와 검사 스크립트는 `/tmp/branch-accounts-qa-20261019/`에 있다.

| 화면 | 캡처 |
| --- | --- |
| 반 담당 강사 목록 | [1280px](branch-accounts-fix-codex-20261019/classes-1280.png), [390px](branch-accounts-fix-codex-20261019/classes-390.png), [320px](branch-accounts-fix-codex-20261019/classes-320.png) |
| 계정 관리·직원 목록 | [1280px](branch-accounts-fix-codex-20261019/accounts-1280.png), [390px](branch-accounts-fix-codex-20261019/accounts-390.png), [320px](branch-accounts-fix-codex-20261019/accounts-320.png) |
| 학생 반 배정 탭 | [390px](branch-accounts-fix-codex-20261019/students-390.png) |

## 파일과 작업 상태

- API: `src/app/api/branch/students/route.ts`, `src/app/api/branch/classes/route.ts`.
- 화면: `src/app/branch/page.tsx`, `src/components/branch/BranchAccounts.tsx`, 신규 `BranchAccounts.module.css`.
- 시험: 신규 `branchAccountsRead.test.ts`, 신규 `BranchAccounts.test.tsx`, 기존 `AdminPages.test.tsx`.
- 문서: 메뉴 적용표의 지점관리 항목과 이 보고서·화면 증거.

Orca의 별도 Codex 작업트리에서 API 부분을 수행하고, 검토한 미커밋 패치를 현재 작업 폴더로 적용했다. 작업트리 `branch-accounts-api-20261019`는 `in-review`로 보존했다. 커밋 금지로 main 병합과 정리 조건이 충족되지 않았으므로 삭제하지 않았다. API 전달 패치와 별도 결과는 `/tmp/branch-accounts-api-20261019.patch`, `/tmp/branch-accounts-api-20261019-result.md`에 있다.

DB 쓰기·스키마 변경·`prisma generate`는 실행하지 않았다. 현재 `node_modules`는 기존 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크 그대로이며 스테이징하지 않았다. Git 인덱스는 비어 있고, 사용자가 제공한 미추적 브리프도 보존했다.
