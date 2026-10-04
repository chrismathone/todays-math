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

## 무료 효과음 v3 최종 통합 검증

Codex·Claude·Grok 최종 동의 후 Kenney CC0 효과음 셋(총 WAV 90,332바이트)을 추가했다. 정답/중립/하루 완료에 연결하며 기본 끔, 기기 설정, gain 0.2, 명시 미리 듣기를 쓴다. 원본 출처·라이선스·변환법·배포 해시는 public/audio/math-learning/README.md와 manifest에 남겼다. 음원을 새로 생성하지 않았다.

- 통합 Vitest 15파일 247시험 통과. 확정 답, 학생 격리, 자기 평가, 중복, 늦은 decode 취소, 저장 성공 뒤 오디오 예외, 관문, 음원 바이트, 기기 설정을 포함한다. 최신 main의 공통 뒤로가기 단추 변경을 보존해 병합한 뒤 영향을 받는 5파일 111시험도 다시 통과했다.
- 최종 Chromium 320×568/390×844/768×650/1280×800의 116항목 전부 통과: 초등·중등 은행 각각28, 홈/움직임20, 사운드40. 실제 WAV decode와 AudioContext를 사용해 사용자 activation 안에서 생성/resume, gain 0.2, 켜기 뒤 자동 샘플 없음, 명시 미리 듣기, 숫자키/Enter 답1회, 유실 응답 무음과 재확인1회, 재로드 요청0, HTML 음원 거절 뒤 저장 정상, 경계 밖 무음, 음소거/visibility 사건 중지를 확인했다. autoplay 허용 플래그는 쓰지 않았다.
- fixture의 Junction 바깥 실제 node_modules 경로를 명시 허용해 KaTeX 폰트를 제공했고, 최신 main 병합 뒤 320×568/640×400의 선택·내장보기·분수4·분수12·긴본문·자기평가 12경우도 다시 통과했다. 최종 캡처의 320px 효과음 스위치/미리 듣기 배치도 직접 확인했다.
- 변경 TypeScript ESLint와 전역 affordance, diff 검사 통과. 전체 standalone type-check 통과 뒤, 최신 main 병합의 production build에서도 TypeScript 검사와 175정적 페이지 생성이 통과했다. 기존 figureBytes tracing 경고2는 유지한다.
- 실제 main Next production 서버에서 익명 GET/HEAD 세 음원의 200·audio MIME·바이트·SHA를 대조했고, POST 및 접두사 밖 경로의 로그인 리다이렉트를 확인했다. Vite를 proxy 관문 검증 근거로 삼지 않는다. 학생 인증 관문은 모의 인증 단위시험이다.
- 통합 도중 다른 작업의 최신 main이 Prisma 스키마를 변경해, main의 기존 npm build 단계로 로컬 Prisma client를 현재 스키마에 맞췄다. 효과음 자체의 스키마/DB 변경은 없고 마이그레이션·운영 DB 작업은 하지 않았다. 앞의 v2 빌드는 기존 client 재사용 기록이다.

확대 검사에서 발견한 kstDate/relationPolicy, mathSrsQuickFence/기존 prerequisite 하네스, mathSrsRecordIsolation/courseTeacherRoutes, noRmSync/기존 시험3파일 실패는 음원 통합 전 main에서도 네 가드를 실제 재실행해 동일 실패를 확인했다. 기록은 baseline-guards.json이며 해당 파일은 효과음 변경에서 수정하지 않았다. 전체 저장소 시험이 모두 초록이라는 뜻은 아니다.

최종 결과 정본: C:/Users/user/orca/artifacts/design-package-review-20261004/qa-sound-merged와 qa-reflow-merged. 실물 iPhone/iPad, 실제 운영 학생 로그인, 사람이 듣는 음색은 검증하지 않았다. 화면 숨김은 visibility 사건 시뮬레이션이다. 미리 듣기는 정답 샘플 한 종류를 재생한다.
