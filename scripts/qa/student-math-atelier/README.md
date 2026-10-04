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
