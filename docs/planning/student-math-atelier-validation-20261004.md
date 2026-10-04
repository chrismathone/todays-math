# 학생 수학 아틀리에 검증 기록 — 2026-10-04

v2는 Codex·Claude·Grok 실소스 검토와 명시 동의 후 구현했다. 홈·지도와 풀이를 별도 Orca 세션에서 작업하고 main에 통합했다. 음원은 최신 사용자 요청에 따라 별도 v3로 합의/추가 검증한다.

- 관련 통합 Vitest 13파일 148시험 통과. 확인 키·1200ms·수동 다음·포커스·키보드·콤보·409 상자·학생 격리를 포함한 풀이 worker의 확대 회귀는 14파일 218시험 통과. 통합 marker/짧은 화면 보정 후 5파일 76시험 재검사 통과.
- Chromium 실제 컴포넌트 + 제품 엔진/메모리 API fixture: 320×568, 390×844, 768×650, 1280×800에서 개념·공방·초등은행·중등은행 156항목 모두 통과. 결과 줄은 본문/보기와 겹치지 않고 화면에 보이는 보기 중앙 hit test 통과. 끊긴 응답의 같은 요청 재시도·재풀이·완료 칸·OS 줄이기를 포함한다.
- 홈/기기 움직임 검사 4크기 20항목 통과: 앱/OS 줄이기 네 조합, 저장/재로드, 진행 중 잠겨도 기기 토글 가능, PC 지도 두 열(1100px 이상)·작은 화면 DOM 순서.
- 지도 이름 전수 검사 4폭(320/390/768/1280): 폭별 6560이름 검사, 잘림/낱말 분리/칸 넘침/가로 넘침 없음. 지도 실측 폭 272/334/620/620px. 별도 기존 스크립트가 허용한 320px 초등 전체 지도 긴 이름 말줄임 1개는 유지한다.
- 200% PC 확대를 나타내는 640×400 CSS viewport에서 초등/중등 은행 완료·재풀이 14항목 통과. 선택/내장 보기/분수4/분수12/긴본문/자기평가의 320×568·640×400 12경우 통과. 낮은 화면은 문제 카드의 내부 스크롤로 본문/답/결과에 접근한다. 실제 브라우저 200% 배율 버튼이나 물리 기기는 확인하지 않았다.
- 별도 초등 기존 QA의 390×700 다섯 입력·전환과 움직임 축소 2경우 통과. 중등 전용 모바일 QA의 320×568·390×600은 통과했으며 해당 검사 도구의 고정 모바일 높이 가정은 데스크톱에는 적용하지 않는다. 데스크톱/확대 은행 검증은 위 탐험 fixture로 수행했다.
- 전체 type-check는 Node 힙 10GB로 통과. 4GB 기본 힙은 메모리 부족으로 종료했고 타입 오류는 아니었다. 변경 TSX ESLint 오류0(기존 지도 img 경고5), 전역 lint:affordance와 git diff --check 통과. 기존 textbook 단추 selector 3개를 실제 button에 한정해 전역 affordance 실패를 해소했다.
- main에서 Next16.3 기본 Turbopack production build 통과(175정적 페이지). 기존 공유 그림 경로 tracing 경고2는 남는다. 스키마가 바뀌지 않아 이미 설치된 Prisma client를 재사용하고 prepare-shared-figures + next build를 실행했다. Junction 작업본의 Turbopack은 root 밖 node_modules를 거부했고 Webpack은 기존 exam-hifi :root module selector를 거부하므로 실제 main에서 기본 bundler로 검증했다.

기존 확대 검사 실패: StudentProgressBoard.test.tsx 2개는 변경하지 않은 main에서도 실패(생산 화면에서 사용하지 않는 오래된 컴포넌트). mathSrsRecordIsolation의 전수 소스 허용목록 1개는 기존 courseTeacherRoutes.ts의 studentSrsState 접근을 누락했다. 이 작업이 추가한 기록 접근은 없다. 전체 저장소 시험 모두 통과라고 보고하지 않는다.

재현: scripts/qa/student-math-atelier/README.md. 결과/스크린샷 정본은 C:/Users/user/orca/artifacts/design-package-review-20261004/qa-practice-final, qa-home-motion, qa-journey, qa-reflow-final, qa-reflow-banks, qa-elementary-normal에 보관했다. 운영 DB/학생 로그인/학습 효과/음원 청취 검사는 이 v2 검증의 근거가 아니다.
