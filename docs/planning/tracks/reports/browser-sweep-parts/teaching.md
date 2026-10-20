# 수업 · 학생 관리 요청 폭포 개선 — 2026-10-20

대상: 브라우저 병목 브리프 5번. 기준 소스는 `560c6a0fa0d0fcb7908e0628b86bb62e6395c505`다. 코디네이터가 `ClassManage.tsx`, `useClassManage.ts`와 관련 테스트까지 범위 확장을 허용했다. 변경 파일은 미커밋 상태로 보존하며 통합·운영 배포는 코디네이터 소유다.

## 바뀐 조회 흐름

기존에는 `TeachingView`가 teaching 인증·단원 응답을 받은 뒤 `ClassManage`를 띄우고, 반 목록의 모든 페이지를 받은 뒤 선택된 반의 학생·진도·수업 계획을 조회했다. **학생·진도·수업 계획 세 요청은 원래도 병렬**이었다.

새 초기 요청은 `/api/studio/teaching?classes=1` 또는 개발 표면의 `/api/dev/unified/teaching?classes=1`이다. 기존 인증·작업실 접근 검사를 통과한 다음 단원 조회와 권한 범위 안 반 첫 페이지(100개)를 함께 시작한다. 목록 구현을 `src/lib/class/listClasses.ts`로 옮겨 기존 `/api/classes`와 공유하므로 소유·지점·연동 범위, 관리자 담당 표시, 내 반 우선 및 각 묶음의 최신순 정렬을 복제하지 않는다.

이 합치기는 **반 · 학생 관리 탭의 초기 로드에만** 적용한다. 처음부터 `teachingTab=lessons`로 들어오거나 그 탭에서 로그인·재시도하면 이전의 가벼운 teaching 요청을 사용해 수업 진행 화면이 반 목록을 추가로 기다리지 않는다. 요청 시점의 URL 탭을 읽으므로 로그인 중 탭 이동도 반영한다. focus/quiet 검사도 기존 가벼운 경로다.

클라이언트는 초기 목록을 해당 계정의 `ClassManage`에만 넘긴다. 100개를 넘으면 기존 API의 2페이지부터 이어 읽으며, 전체 목록을 확인한 뒤 기존 규칙대로 URL의 반 또는 첫 반을 선택한다. 선택된 반의 세 상세 요청은 기존 API로 계속 조회한다. 서버·브라우저 공용 캐시를 추가하지 않았다.

## 세 번의 변경 전후 브라우저 측정

**아래는 실제 운영 DB 응답 시간이 아닌, 고정 지연을 적용한 브라우저 fixture 측정이다.** 실제 `TeachingView`, `ClassManage`, `useClassManage`, `ProgressPlanSection`과 기존 계약 파서를 실행했다. Vite fixture는 Next Link/Dynamic/Auth 경계와 실행하지 않는 수업 진행 탭·서버 로그아웃 액션을 대역 처리한다. 전체 작업실 셸과 Tailwind 전역 CSS는 포함하지 않고 기존 CSS 모듈과 동일한 최소 전역 스타일을 사용했다. 따라서 화면 픽셀 동등성은 이 fixture 범위의 비교이며 전체 운영 화면 검수로 확대하지 않는다.

Chromium headless, 1685×1000, reduced motion, 로컬 3185 포트, 한 번의 모듈 워밍 뒤 새 페이지 진입을 세 번씩 측정했다. 변경 전은 `git show`로 위 기준 소스의 클라이언트 네 파일만 Vite에 공급하므로 checkout을 되돌리지 않는다. 고정 지연은 teaching 810ms, classes 1000ms, students 350ms, progress 300ms, progress-plan 400ms다. 합쳐진 teaching fixture의 지연은 독립 작업의 최댓값인 1000ms로 모델링한다. 서버의 실제 병렬 실행은 별도의 API 지연 시험 두 방향으로 확인했다. 화면 준비 시각은 MutationObserver가 학생 목록·진도 활성화·수업 계획 표시를 처음 함께 관찰한 순간이며 Playwright polling 시간은 제외했다.

| 회차 | 변경 전 화면 준비 | 변경 후 화면 준비 | 감소 | API 요청 수 |
|---|---:|---:|---:|---:|
| 1 | 2645.8ms | 1830.0ms | 815.8ms | 5 → 4 |
| 2 | 2626.2ms | 1794.0ms | 832.2ms | 5 → 4 |
| 3 | 2645.1ms | 1804.4ms | 840.7ms | 5 → 4 |

중앙값 2645.1 → 1804.4ms, 840.7ms(31.8%) 감소다. 수업 진행 직접 진입 리뷰까지 반영한 최종 코드로 측정했다. 전후 네트워크 시각은 navigation 시작 기준이다.

| 회차·버전 | teaching 시작–완료 | 별도 classes 시작–완료 | 상세 세 요청의 첫 시작 | 상세 마지막 완료 |
|---|---:|---:|---:|---:|
| 1 전 | 35.2–848.8ms | 1233.2–2236.1ms | 2238.7ms | 2642.5ms |
| 1 후 | 41.4–1044.3ms | teaching 안에 포함 | 1423.5ms | 1825.9ms |
| 2 전 | 26.6–840.3ms | 1215.4–2219.6ms | 2221.9ms | 2624.9ms |
| 2 후 | 26.1–1028.6ms | teaching 안에 포함 | 1387.3ms | 1790.9ms |
| 3 전 | 27.7–842.1ms | 1232.1–2235.2ms | 2238.8ms | 2641.9ms |
| 3 후 | 27.0–1030.5ms | teaching 안에 포함 | 1400.7ms | 1803.0ms |

전후 여섯 번 모두 최종 DOM 문구, 입력값, disabled, aria-current/selected, 링크 대상과 전체 화면 PNG SHA-256이 같았다. PNG 지문은 `2193dfbafacdb72a3964590576042e883238aac52cd0d2999042703ccfd28c35`다. 페이지 오류 0개, fixture API 쓰기 0개다.

재현 명령(실DB와 환경 파일이 필요 없다):

```sh
npx tsx --conditions=react-server scripts/qa/sweep-20261020/teaching.ts --baseline 560c6a0fa --out /tmp/sweep-teaching-before.json
npx tsx --conditions=react-server scripts/qa/sweep-20261020/teaching.ts --compare /tmp/sweep-teaching-before.json --out /tmp/sweep-teaching-after.json
```

이번 최종 실행의 전체 리소스 타이밍·DOM 스냅샷·지문은 공유 로컬 `/tmp/sweep-teaching-before-final.json`, `/tmp/sweep-teaching-after-final.json`에 남겼다. 내구성 있는 요약 수치는 위 표에 보존했다. 루트 측정 스크립트는 수정하지 않았다.

## 보존한 동작과 검증

- 익명은 단원·반을 읽기 전에 401, 작업실 접근 불가는 403, 개발 경로는 production에서 404다. 첫 반 목록은 검증된 세션의 기존 범위 함수로만 조회한다. `private, no-store`를 유지했다.
- `classes=1`이 없는 요청은 이전 teaching 응답 그대로이며 반 조회를 추가하지 않는다. 이전 응답을 받는 클라이언트 경로도 기존 목록 API로 계속 동작한다.
- 반 목록 초기값의 실패·잘못된 응답은 기존 «반 목록을 불러오지 못했습니다»와 목록 재시도로 이어진다. 인증된 화면을 전체 오류로 바꾸거나 실패를 빈 목록으로 표시하지 않는다.
- URL로 지정한 권한 있는 반·학생, 접근 불가 반의 경고, 빈 반·학생·진도 상태를 유지했다. 초기 목록이 100개를 넘으면 101번째 반도 찾으며 1페이지를 중복 요청하지 않는다.
- 같은 계정 focus 검사에서는 현재 반·입력 상태를 보존한다. 계정이 바뀌면 기존 계정의 화면을 새 계정으로 재사용하지 않고 반 목록을 새로 읽는다. 전체 reload·재진입은 초기 목록을 새로 받는다.
- superseded teaching 요청과 목록 요청을 abort하며 기존 version/cancelled 및 반 선택 version 보호를 유지한다. transport가 abort를 무시해도 오래된 teaching 응답은 표시하지 않는다. 기존 반 A→B→A와 진행 중 쓰기 뒤 재조회·학생 등록·진도 저장의 시험을 유지했다.
- JSX 구조·CSS·문구·수업 계획 계산·상세 API·쓰기 경로는 유지했다. `ProgressPlanSection`의 저장·예정·취소 시험도 통과했다.

관련 **11개 테스트 파일, 159개 테스트 통과**:

```sh
npx vitest run src/__tests__/api/teachingBootstrap.test.ts src/__tests__/api/teaching.test.ts src/__tests__/api/class.test.ts src/__tests__/api/classOwner.test.ts src/__tests__/api/managedClassAccess.test.ts src/__tests__/api/studioWorkspace.test.ts src/__tests__/components/TeachingView.test.tsx src/__tests__/components/ClassManageWorkflow.test.tsx src/__tests__/components/ClassManage.test.tsx src/__tests__/unit/classListPagination.test.ts src/__tests__/components/ProgressPlanScreen.test.tsx --reporter=dot
npm run type-check
npm run lint:affordance
```

모두 통과했고 변경 TS/TSX 14개 파일의 eslint는 오류·경고 0개, `git diff --check`도 통과했다. 테스트의 예상 거절 응답에는 기존 error-log 대역에 `create`가 없어 출력되는 stderr가 있지만 테스트 실패·실DB 쓰기는 없다. 변경 전의 해당 기본 5개 파일 69개 시험도 통과했다.

API 동등성 시험은 교사·지점 관리자·최고 관리자·지점 강사에 대해 기존 반 목록 API와 합쳐진 teaching의 목록·pagination·실제 DB 조회 인자를 비교한다. 이전 class/classOwner/managedClassAccess 시험은 기존 범위·정렬·담당 결과를 계속 고정한다. 독립 조회의 병렬성은 단원을 지연할 때 반 조회가 먼저 시작되는지와 반 조회를 지연할 때 단원이 먼저 시작되는지 둘 다 확인한다.

## 정확한 변경 파일

1. `src/app/api/classes/route.ts` — 기존 목록 구현을 공유 helper로 연결; 생성 응답의 담당 serializer도 같은 구현으로 이동.
2. `src/app/api/studio/teaching/route.ts` — 기존 인증 뒤 선택적 초기 목록 로더 호출.
3. `src/app/api/dev/unified/teaching/route.ts` — 개발 전용 경계 유지, 같은 선택적 초기 목록 사용.
4. `src/lib/class/listClasses.ts` — 기존 권한 범위·목록 순서·pagination·담당 직렬화의 공용 서버 구현.
5. `src/lib/studio-ai/teaching.ts` — 단원·반 첫 페이지 병렬 조회와 목록 실패의 분리.
6. `src/contracts/teaching.contract.ts` — 초기 목록 ready/error 계약.
7. `src/components/unified/TeachingView.tsx` — 초기 목록 요청·검증·전달, 이전 요청 abort.
8. `src/components/class/ClassManage.tsx` — 초기 목록을 hook에 전달.
9. `src/hooks/useClassManage.ts` — 초기 목록 활용, 재시도와 선택 보호, 목록 abort.
10. `src/lib/class/classApi.ts` — 받은 1페이지를 검증해 재사용하고 추가 페이지부터 조회.
11. `src/__tests__/api/teachingBootstrap.test.ts` — 인증·응답/조회 인자 동등성·병렬·부분 실패 검증.
12. `src/__tests__/components/TeachingView.test.tsx` — 직렬 요청 제거·부분 실패/재시도·계정 교체·abort/stale 검증.
13. `src/__tests__/unit/classListPagination.test.ts` — 초기 페이지 재사용·101번째 반·취소 검증.
14. `scripts/qa/sweep-20261020/teaching.ts` — 전후 각각 3회 fixture browser 측정과 픽셀·DOM 동등성 검사.
15. `docs/planning/tracks/reports/browser-sweep-parts/teaching.md` — 이 보고서.

## 남은 범위와 제한

공유 DB를 열거나 읽지 않았고 DB/schema 쓰기, 계정/학생 쓰기, 커밋·stage·push·배포를 하지 않았다. 허용된 `node_modules` 심볼릭 링크만 사용했으며 stage하지 않았다. `classAccess.ts`, 개념 adminService, SRS courseServer, 교재 books/quickCreate, 연산 컴포넌트와 루트 측정 파일은 건드리지 않았다.

운영 서버의 실제 DB 지연·동시성·권한별 실계정 동작은 이 fixture 숫자만으로 확정할 수 없다. 실제 반 선택에 필요한 목록 조회 뒤의 상세 의존성과 동적 컴포넌트 로딩 대기는 남아 있다. 전체 작업실의 폭별 시각 검수와 운영 측정·통합·배포는 코디네이터의 후속 범위다.
