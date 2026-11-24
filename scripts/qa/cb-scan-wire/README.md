# 개념 백지 촬영 Wire 검증

제품 경로는 `/dev/concept-blank-scan-wire`다. `devPageVisible({ directorOnly: true })`와 별도의 세션 확인을 지나며 개발 모드도 로그인 없이 열지 않는다.

아래 하네스는 동일한 클라이언트 컴포넌트·실제 은행·제품 지면·제품 글꼴을 **127.0.0.1에서만** 표시한다. 인증 경로의 대체물이 아니다. 가드는 Vitest와 Next의 비로그인 HTTP 요청으로 따로 확인한다. 카메라·AI·API·DB를 연결하지 않는다.

```sh
npx vite --config scripts/qa/cb-scan-wire/vite.config.mts
node scripts/qa/cb-scan-wire/capture.mjs
```

- Chromium은 한 개만 실행하며 `finally`에서 닫는다.
- 산출물 기본값은 저장소 밖 `/tmp/cb-scan-wire-20261124`. `CB_WIRE_OUTPUT`으로 바꿀 수 있다.
- `evidence.json`: 화면 폭/가로 넘침, 실제 A4 치수, 본문 넘침, 코드 줄의 아래 여유, QR 크기·복호화 결과, 페이지 오류, 외부 요청.
- QR은 인쇄 100%의 크기를 96/300dpi에 대응하는 픽셀 수로 래스터화해 기존 `jsqr`로 읽는다. **300dpi 복호화는 검증 조건**, 96dpi는 작은 화면 재샘플링의 한계를 기록하는 관측이다. 어느 쪽도 실물 인쇄/폰 카메라 실험은 아니다.
- `?proof=P1&sample=multi`는 조작 UI 없이 제품 조판을 실제 크기로 표시한다. P1~P4, single/multi/all을 지원한다. 이 쿼리는 하네스에만 있다.
- 기존 산출물이 있을 때만 `CB_WIRE_PHASE=ui` 또는 `CB_WIRE_PHASE=print`로 바뀐 영역만 다시 확인할 수 있다. 다른 영역의 기록은 보존한다.
- 사진은 같은 실제 은행의 **미작성 지면 대용**이다. 표시 좌표는 제품의 `[data-cb-item="term"] [data-cb-ruled]`에서 구한다. 사진 맞춤·원근 보정은 구현하지 않았다.
- P3는 긴 제목 표본의 **채점표 첫 쪽**에서 본문 영역을 약 26px 넘는다. 대안의 약점으로 화면과 보고서에 공개하며 제품의 쪽 나눔을 바꾸지 않는다.

```sh
npx vitest run src/__tests__/unit/conceptBlankScanWireGuard.test.ts src/__tests__/unit/devPageGuardCoverage.test.ts src/__tests__/unit/devPageAccess.test.ts --maxWorkers=3
npm run lint:affordance
npx eslint src/app/dev/concept-blank-scan-wire src/__tests__/unit/conceptBlankScanWireGuard.test.ts scripts/qa/cb-scan-wire --ignore-pattern '**/._*'
npm run type-check
```

`._*`는 macOS 메타데이터이며 소스나 산출물이 아니다. Git에 싣지 않는다. 운영 빌드는 실행하지 않는다.
