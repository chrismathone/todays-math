# M-05 · M-06 메모리 회귀

이 fixture는 학생 API·DB·유료 API 없이 `createLocalFadingSource`,
`resumeFadingSession`, `placeAnswer`를 사용한다. 이전 단계도 실제 행동으로
마치며 `filled`·완료 결과를 손으로 꾸미지 않는다. 제품의 두 세션 화면,
CSS, 수식 렌더러, 로컬 Pretendard를 그대로 읽는다. 문장 3/4개는 합성 자료이며
운영 콘텐츠나 학생 기록을 대체하지 않는다.

```sh
npx vitest run --maxWorkers=3 src/__tests__/components/fadingMemoryStatus.test.tsx
```

브라우저·서버는 리드가 순번을 **명시적으로 허용한 뒤에만** 실행한다.
운영 재검수 → M-03 → 이 작업의 순서다.

```sh
node scripts/qa/srs-m05-m06-memory/verify.mjs --lead-approved
```

기본 Playwright 실행 파일이 없는 이 로컬 환경에서는 이미 설치된 Chromium을
지정했다. 의존성 설치나 공유 패키지 변경은 하지 않는다.

```sh
QA_CHROMIUM_EXECUTABLE=/Users/pss/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell node scripts/qa/srs-m05-m06-memory/verify.mjs --lead-approved
```

헤드리스 Chromium 하나와 로컬 Vite 서버를 띄운다. 390×844, 1440×900에서
단계 2/3 빈칸 없음·있음·오답, 단계 4 답 제출·포기·대조·평가·연습 완료를
걷는다. 초기 0/n, 첫 답 뒤 1/n, 평가·완료 n/n을 나누어 확인한다.
문장 이동 Enter, 입력 Tab, Esc 뒤 기본 Tab도 확인한다.
외부 주소와 `/api/` 요청은 차단하며 요청 시 검증을 실패시킨다.
수식은 앱 layout의 KaTeX CSS도 함께 읽으며 MathML의 숨김 처리를 검사한다.
성공·실패 모두 `finally`에서 본인 브라우저와 서버 종료를 기다린 뒤 결과에
종료 여부를 기록한다. 반환을 먼저 알리고 문서·커밋을 정리한다.

기본 증거 경로는 저장소 밖
`/Users/pss/Desktop/creative/display-survey/srs-m05-m06-20261021/`다.
PNG를 직접 열어 본 뒤 `browser.json` 수치와 함께 보고한다.
제품 Next 서버·로그인·통합 탐험 껍데기는 이 fixture의 검증 범위가 아니다.
`next/dynamic`만 Vite의 React lazy로 연결하며 세션 규칙은 대체하지 않는다.
