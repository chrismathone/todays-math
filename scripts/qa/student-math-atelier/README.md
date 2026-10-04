# 학생 수학 아틀리에 브라우저 fixture

실제 StudentMathExplorers와 학생 하단 메뉴, 제품 CSS·Pretendard 폰트를 Vite로 표시한다. Next 전용 클라이언트 어댑터만 검증용으로 교체하며, API는 기존 mobile-explorers-qa.mjs가 제품 엔진과 메모리 저장소로 응답한다. 가로채지 않은 API는 fixture 서버가 404로 막는다. 운영 DB·로그인·학생 기록은 사용하지 않는다.

PowerShell에서 서버를 실행하고 별도 터미널에서 검사한다.

```powershell
node scripts/qa/student-math-atelier/server.mjs

$env:BASE = 'http://127.0.0.1:4338'
$env:QA_OUTPUT = '.qa-artifacts/student-math-atelier'
$env:QA_ENGINES = 'chromium'
$env:QA_SIZES = '320x568,390x844,768x650,1280x800'
$env:QA_SCENARIOS = 'atelier:home-motion,concept,workshop,bank-elementary,bank-middle'
node scripts/qa/mobile-explorers-qa.mjs
```

결과 JSON과 캡처는 QA_OUTPUT에 저장한다. feedback-geometry.json은 결과 줄과 문제/보기의 겹침 및 보기 중앙 hit test를 기록한다. 200% PC 확대의 reflow 검사는 1280×800의 절반인 640×400 CSS viewport를 추가해 확인한다. 이는 실제 기기·운영 배포·20분 학습 효과 검증과는 별개다. 서버는 Ctrl+C로 종료한다.

무료 효과음 검사는 `QA_SCENARIOS = 'atelier:sound'`로 별도 실행한다. 실제 AudioContext와 WAV decoder를 사용하고 사용자 activation, source 시작/중지, gain을 기록한다. 기본 끔의 요청0, 명시 미리 듣기, OS 움직임 설정과 독립, 음소거/숨김 중지, 키보드 답, 응답 유실/같은 요청 확인, 재로드 무음, 200 HTML 거절 뒤 정상 저장, 공급자 밖 무음을 확인한다. 숨김은 visibility 사건 시뮬레이션이며 청취·실물 iOS 검사가 아니다. 브라우저 autoplay 허용 플래그를 쓰지 않는다.

Vite는 운영 proxy를 지나지 않는다. 관문은 `studentRouteAccess`/`proxyStudentGate` 단위시험과 실제 main의 Next production build/start에서 따로 확인한다.

```powershell
# main에서 기존 Prisma client를 사용해 production build를 완료한 뒤 실행
node node_modules/next/dist/bin/next start -p 4339 -H 127.0.0.1
# 별도 터미널: 익명 GET/HEAD, MIME, 실제 파일 3개 SHA, POST와 접두사 밖 거절
$env:BASE = 'http://127.0.0.1:4339'
npx tsx scripts/qa/student-math-atelier/sound-assets-smoke.ts
```

학생 관문 단위시험은 모의 인증을 쓰며 운영 학생 로그인/DB를 사용하지 않는다. 실제 학생 세션과 물리 iPhone/iPad의 소리, 사람이 듣는 음색은 별도 확인 대상이다.
