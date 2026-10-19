# 지점 관리 화면 정리 (원장님 2026-10-19 — 스크린샷 다섯 장)

대상: `src/components/branch/BranchAccounts.tsx` (탭 «반 관리» · «계정 관리») · `src/app/api/branch/**`.

## 1. «사용 권한이 없는 메뉴입니다» 오류 (두 탭 모두 위에 빨간 글)
원인(리드 확인): 이 화면이 학생 목록을 `/api/students?classId=…` 로 부른다(`BranchAccounts.tsx` 117행 · 250행 부근). 그 경로는 proxy 의 메뉴 관문(`src/lib/accountRouteAccess.ts` — `/api/students` 는 `any("teaching")`)에 걸린다. 지점 관리자가 «수업·학생 관리» 메뉴를 안 가졌으면 403.
고칠 것: `/api/branch/students` 에 **GET**(classId · page · pageSize)을 더해 지점 범위로 읽는다 — 권한은 같은 파일 POST 의 `canManageStudentAccounts` + `branchId` 일치, 반은 그 지점의 것만. 응답 모양은 이 화면이 지금 쓰는 것과 같게(기존 `/api/students` GET 의 직렬화를 재사용). 화면의 두 호출을 새 경로로 바꾼다. `accountRouteAccess` 의 메뉴 관문은 넓히지 않는다. `errorLogRouteCoverage` 같은 전수 가드 시험이 새 경로를 요구하면 맞춘다.

## 2. 종강한 반이 나온다
`/api/branch/classes` 가 `branchId` 만으로 거른다. 이 지점 실측: 94반 중 33반이 `active=false` · `closedAt` 지남(«(~26.09.19)» 같은 이름) — 화면에 다 나온다.
고칠 것: 운영 중인 반만 — `active: true` 이고 `closedAt` 이 없거나 미래(같은 폴더 `students/route.ts` POST 의 조건과 같게). 이 경로를 쓰는 다른 화면이 있으면 찾아 영향이 없는지 확인하고 보고.

## 3. 줄 맞춤 (원장님 «행열정렬»)
- 계정 관리 탭의 직원 목록: 지금 칩이 옆으로 흘러 감긴다. **표처럼 열을 맞춘 목록**으로 — 열: 이름 | 계정 유형 | 이메일. 한 사람 한 줄.
- 반 관리 탭의 «반 담당 강사 배정» 목록: 반 이름 | 학년 | 학생 수 | 담당 강사(선택 칸) 열을 맞춘다. 지금은 «이름 · 학년 · 학생 N명» 이 한 글덩이라 줄마다 어긋난다.
- 기존 토큰 · 글꼴 · 테두리 스타일 안에서. 새 색 · 장식 · 문구 추가 없음(D-07 · D-08). 행 hover 배경 · 손가락 커서 금지(D-30). 폰 폭에서 가로로 넘치지 않게(필요하면 열이 접힌다).

## 4. «학생 반 배정»을 따로 분리
지금 반 관리 탭 맨 아래에 있어 찾기 어렵다. **세 번째 탭 «학생 반 배정»** 으로 옮긴다(탭: 반 관리 · 학생 반 배정 · 계정 관리). 기능 · 문구는 그대로.

## 확인
- 시험: 새 GET 의 권한(다른 지점 반 · 권한 없는 계정 403) · 종강 반 제외 · 화면이 새 경로를 부름 · 탭 셋. 관련 기존 시험 · `npm run type-check` · eslint · `npm run lint:affordance` 통과.
- DB 쓰기 · 스키마 · `prisma generate` · 커밋 금지. 보고서 `docs/planning/tracks/reports/branch-accounts-fix-codex-20261019.md`.
