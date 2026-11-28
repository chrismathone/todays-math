# P1a 개념 백지 은행의 배포 파일 전환

기준은 로컬 `main`의 `c065d613d`다. RED를 `5bd80461c`에 고정하고 전환은 `2aab5807b`에 커밋했다.

## 전환 범위

- 생성기는 저작 모듈을 실행해 기존 `withAssessments`와 given-case 처리가 끝난 값을 그대로 직렬화한다. `data/concept-blank/`에 14개 part와 manifest를 둔다. manifest 판은 part 해시 목록의 SHA-256이며 part마다 바이트 SHA-256을 확인한다. 배포 데이터는 합계 14,011,815바이트다.
- 개념 백지 인쇄와 스캔 발행, 일반 및 관리자 보관 문서 상세는 선택에 해당하는 학년 part를 지연 읽는다. 스캔 Wire와 Hi-fi는 초5 core·plus만 추적한다. 교재 개념 목록·연결·검토·미리보기·초안 백지·발행 검증은 필요한 학년을 지연 읽으며, 검색의 학년 생략이 허용되는 목록은 전체를 조회한다. Quick-create의 자동 교재 핵심 개념과 오류 점검은 core part를 읽는다.
- 학생·교사 fading의 catalog·figure, 개발용 기억 학습 표본, ontology assist의 native 정의 증거는 동기 getter로 옮겼다. 최초 접근에서 manifest와 필요한 part를 읽고 해당 프로세스에서 재사용한다.
- 교사 개념 백지 편집기는 학년 API를 읽는다. 교사 SRS 미리보기는 메뉴 권한을 확인한 API에서 로컬 소스용 개념 · 칩 · 그림을 읽는다. 두 응답은 `no-store`다. 공용 저작 데이터만 다루므로 지점·학생 기록 조회가 없고, 지점 매개변수를 보내도 데이터 범위가 달라지지 않는다. 교사용 정답은 조판과 로컬 학습 체험에 필요한 값이다. 학생 관문과 직접 처리기 양쪽에서 교사 전용 데이터 접근을 확인했다.
- QA의 Vite 지면·스캔·사진 스크립트는 `loadAuthored.ts`를 사용한다. 저작·감사·sync/rebalance·시뮬레이션은 기존 입력을 읽는다.

## 산출물과 호환성

- RED에서 두 전체 은행 청크(server 11,094,870바이트 · SSR 11,272,702바이트)와 static 학년 청크 14개를 탐지했다. 전환 후 `.next/server` 및 `.next/static`에서 은행 본문 검사가 통과했다.
- 전환 전에 채취한 [part별 기준 해시](p1a-baseline.json)와 파일 바이트가 14개 전부 일치했다. 9,119개 개념 ID의 순서와 전체 문항 payload를 비교했으며 문장, 그림, `null`, 제외 사유, `questionRevision`이 해시 범위에 포함된다. 여러 학년을 함께 고른 인쇄 지면과 스캔 snapshot도 일치했다.
- 원본 은행으로 고정한 fading 투영 해시에 배포 은행이 일치했다. 개념·함정 지문, 고정 저장 UUID에서 만든 화면 UUID, 2·3·4단계 칩 차례, 열린 풀이 복원이 비교 대상이다. 문장 하나를 바꾼 HTTP 시험은 이전 토큰을 409로 거절했고, 저장된 풀이와 씨앗을 유지했다.
- 산출물의 28개 route trace로 격리 패키지를 만들고 해당 배포 getter를 확인했다. 스캔 Wire의 `e5plus.json`, 학생 fading의 `m3plus.json`을 각각 빼면 해당 패키지 읽기가 ENOENT로 실패한다. part 내용을 변조한 시험은 해시 검증에서 실패한다. 나머지 라우트 trace와 저작 assessment JSON도 검사했다.

## Mac 냉간 비교

Apple M6 · Node 24.22.3 · Next 16.3.8. 각 빌드 전에 기존 `.next`와 `tsconfig.build.tsbuildinfo`를 옮겨 빈 상태에서 `/usr/bin/time -l node scripts/deploy/build-next.mjs`를 실행했다. DB URL은 루프백의 닫힌 포트로 고정했다. RSS와 JS 크기 단위는 바이트다.

| 지표 | 기준 | P1a | 감소 |
|---|---:|---:|---:|
| 최대 RSS | 5,855,608,832 | 5,614,698,496 | 4.1% |
| `.next/server` JS 총량 | 136,505,520 | 103,147,695 | 24.4% |
| `.next/static` JS 총량 | 48,775,802 | 37,449,331 | 23.2% |

## 검증과 남은 항목

- 관련 Vitest 288개 파일 중 270개 통과, 18개 건너뜀. 테스트는 4,267개 통과, 91개 건너뜀이다. 필터는 `conceptBlank fading textbook studentRouteAccess proxy accountRouteAccess mathOntologySourceDatabase`다. `npm run type-check`, 변경 파일 ESLint, `npm run lint:affordance`도 통과했다.
- 로컬 스캔 E2E는 Chromium과 Poppler로 실행했다. 합성 인증·채점·저장소 및 로컬 WASM Postgres에서 발행 → PDF·QR → 학생 촬영·제출 → 교사 확인·수정과 공개까지 통과했다. HTTP 요청 69건, 대역 모델 호출 8건, 기준 화면 12개에서 가로 넘침 0이었다.
- 전역 `npm run lint`는 기존 파일의 오류 275개, 경고 94개로 실패했다. 출력에 나온 파일은 이번 diff에 없다. 예를 들어 기존 검수 산출물 `e3e4-current-disputes-assist/helper.ts`의 `no-explicit-any`가 포함된다.
- 보조 Playwright 지면 검사 3건은 변경 전 로더와 하네스로도 같은 위치에서 실패했다. 사진 시편의 안내 문구, 단원 선택 뒤 수 입력 활성화, 미리보기 폭이다.
- Vercel 냉간 p95와 메모리 상한 여유는 동일한 Linux 8 GiB 환경에서 확인해야 한다. Mac의 동시 작업과 OS 캐시 상태에 따른 RSS 변동이 있었다. 배포 후 로그인한 교사·학생의 실제 호스팅 HTTP 경계와 배포 함수 크기도 확인 대상이다.
- 원장님 결정 사항은 없다.

재생성은 `npx tsx scripts/qa/concept-blank/generate-deployment-bank.ts`. 의도한 저작 변경 때 생성물을 갱신하고 호환성 기준 변경을 함께 검토한다. 산출물 확인에는 `npx tsx scripts/qa/concept-blank/check-deployment-bundles.ts`와 `node --conditions=react-server --import tsx scripts/qa/concept-blank/check-deployment-trace.ts`를 사용한다.
