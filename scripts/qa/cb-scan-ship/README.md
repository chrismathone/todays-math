# 개념 백지 사진 채점 — 로컬 검증

실제 AI·공유 DB·실제 학생 사진을 사용하지 않는다. 산출물 기본 경로는
`/tmp/cb-scan-ship-20261125/`이며 저장소에 캡처/PDF/래스터를 커밋하지 않는다.
Chromium 작업은 아래 순서대로 한 번에 하나씩 실행한다. 운영 빌드는 필요 없다.

## Hi-fi

```sh
npx vite --config scripts/qa/cb-scan-ship/vite.config.mts
node scripts/qa/cb-scan-ship/hifi.mjs
```

첫 명령은 loopback 4248 서버이며 별도 터미널에서 유지한다. 네 안의 다섯 화면을
390/1440에서 캡처한다. 코드의 가드 시험은 별개다. `CB_SCAN_OUTPUT`으로 산출물 경로를 바꿀 수 있다.

## 제품 인쇄·QR·합성 정합

```sh
node scripts/qa/cb-scan-ship/render.mjs
node scripts/qa/cb-scan-ship/raster.mjs
node scripts/qa/cb-scan-ship/registration.mjs
```

`CB_SCAN_QA_OUTPUT`으로 세 도구의 공통 산출물 경로를 바꿀 수 있다. `pdftoppm`이 필요하다.
실제 초5 single/multi/all 선택의 제품 렌더로 PDF를 만들고 기존 쪽 수·본문 넘침을 대조한다.
300dpi 래스터의 모든 QR을 원래 발행 ID/쪽/학생지·채점표와 비교한다.
그 학생지에 독립적으로 정한 원근 변환 두 가지와 회전 변환을 적용해 제품 등록 함수에 넣는다.
답 칸의 네 모서리와 중심을 알려진 변환의 참좌표와 비교하며, 사진 px와 지면 환산 mm를 모두 기록한다.
이는 합성 평면 시험으로 실제 종이 휨·연필·폰 품질을 검증하지 않는다.

## 제품 E2E

```sh
node scripts/qa/cb-scan-ship/e2e.mjs
```

loopback 4250을 직접 열고 종료 시 닫는다. 실제 서비스의 발행·HTTP 처리 함수·화면을 사용한다.
인증 신원, Storage, 모델만 주입하며 DB는 전체 마이그레이션 사슬을 적용한 PGlite다.
Prisma 6와 같은 파라미터 OID를 지정하고 void 결과를 거절하는 어댑터를 쓴다.
`ANTHROPIC_API_KEY`/DB URL은 이 프로세스에서 제거하고 외부 fetch와 브라우저 요청은 거절한다.
공유 DB나 유료 모델로 전환하는 공개 플래그는 없다.

발행 → 실제 PDF QR 복호화 → QR URL → 세 쪽 파일 업로드/브라우저 인코딩 →
답 칸 확대/입력 연결 → 빈 답·직접 입력 → 채점 → 학생 결과 → 이유 있는 교사 수정 → 학생 고르기 창을 검증한다.
`flow-evidence.json`은 실제 요청 수/크기, 모델 대역 호출 수, DB 이력과 보존 기간, 가로 넘침/브라우저 오류를 기록한다.
2026-11-25 적대적 검토 회귀: 첫 발행 동시 2요청과 새 요청 ID 재인쇄가 한 발행 행으로 모이는지,
발행 응답·재인쇄 HTML이 각각 1MB 미만인지, 저장 CSS에 글꼴 바이트가 없는지 검사한다.
URL 글꼴을 실제로 불러온 재인쇄 지면의 좌표를 격리 Chromium의 내장 글꼴 좌표와 비교한다.
모델 대역은 JSON 울타리/서문/꼬리글을 붙이며 구조화 출력 요청도 확인한다.
`flow-evidence.json`의 `paperBytes`·`reprint`가 크기와 글꼴 요청/좌표 증거다.
Next RSC 응답 자체는 이 Vite 하네스가 아니므로 별도 인쇄 페이지 시험에서 CSS 미직렬화와 크기를 검사한다.

입력 사진은 미작성 발행지의 래스터다. 판독 정확도 시험이 아니며 모의 답/모의 판정은 제품 데이터가 아니다.
Next 인증 래퍼·학생 proxy는 API/전수 단위 시험으로 따로 검증한다. PGlite 단일 연결을 실제 다중 연결 부하 시험으로 부르지 않는다.

## 시험

```sh
npx vitest run src/__tests__/unit/conceptBlankScan*.test.ts src/__tests__/api/conceptBlankScan*.test.ts src/__tests__/api/conceptBlankScanPage.test.tsx src/__tests__/components/conceptBlankScanScreen.test.tsx src/__tests__/components/conceptBlankIssuePrint.test.tsx --maxWorkers=3
npm run lint:affordance
npm run type-check
```

현재 검수 지시는 관련 시험·type-check·변경 범위 lint만 실행한다. 전체 시험·운영 빌드는 실행하지 않는다.
기존 실패와 신규 회귀의 구분 및 최종 결과는
[`cb-scan-ship.md`](../../../docs/planning/tracks/reports/cb-scan-ship.md)에 기록한다.
