# Vercel 운영 빌드 메모리 검토

## 단계별 합의안

| 단계 | 판단 | RED 먼저 | 완료 조건 |
| --- | --- | --- | --- |
| P0 | 동의. 리드가 적용한 `6e3553b5a` 유지 | 같은 SHA/Node/환경에서 맵을 켠 클린 빌드의 서버 맵 바이트와 RSS를 기록. 서버 맵을 없애는 산출물 검사를 먼저 실패시킨다. 설정이 적용된 상태에서 같은 검사 통과 | 같은 Standard 기계의 캐시 없는 빌드에서 Ready, OOM 이벤트 0. 프로젝트의 운영 URL이 해당 SHA를 가리키고 로그인 및 대표 교사·학생·인쇄 흐름 통과. Preview 제어 오류로 Vercel 로그 및 앱 로깅의 메시지·라우트·상관 ID 확인. |
| P1a 은행 | 동의하되 서버, 학생·교사 브라우저, 저작·검수 입력을 각각 확인하고 수직으로 전환 | 현행 산출물에서 서버 및 브라우저에 은행 전체가 남으면 실패. 별도 배포 트리에 필요한 pack을 하나 빼면 해당 소비자 smoke가 실패하는지 확인. 현행 출력으로 호환 고정값 채취 | 전체 은행 청크 2벌과 브라우저 전체 은행 제거, 앱/패키지 trace 검사 통과. 14개 part·9,119 ID와 순서·문장·지문·고정 문서가 동일. 전환 전후 인증 및 오류 응답 동일. |
| P1b 연산 | 방향 동의. 서버 전용 fs 일괄 치환은 반대. 브라우저 소비자의 데이터 준비 경계부터 분리 | 클라이언트에서 큰 pack을 읽는 경로의 첫 표시·재생성·인쇄 테스트를 준비하고 pack 미주입·지연·실패에서 실패 확인. 기준 출력 시각/바이트 캡처 | 두 11 MB 서버 청크의 pack과 브라우저 초기 번들 pack 제거. 문제별 SVG, 출력 크기·줄바꿈·인쇄·저장 후 재열기 일치. 동기 내부 변환과 사용자 작업의 순서 유지. |
| P2 | 수정 동의. 운영 관측과 소유자 확인 후 개발용부터 물리 분리 | 기존 103개 라우트 목록을 기준으로 제거 후보가 manifest에 남으면 실패. 운영 유지 경로 하나나 가드 하나를 빼면 대응 검사 실패 | 제외 페이지는 운영 manifest·trace에 없고 개발/검수 빌드에는 존재. 유지 페이지의 비로그인·제한 계정·원장 접근과 PDF 동작 검증. 정상 앱 URL 및 운영 API 동작 유지. |
| P3 | 동의. 가벼운 산출물 검사와 별도의 Linux 전체 빌드 예산을 함께 사용 | 임계 초과 샘플·누락된 측정·실패 빌드·새 대형 데이터 청크를 각각 주입해 감지 확인 | 같은 2 vCPU 또는 프로젝트 Standard 사양, 8 GB 제한의 환경에서 프로세스 그룹 전체를 측정. P0부터 냉간 3회의 peak 및 단계별 시간 범위를 기록하고 이후 변경은 동일 방식으로 비교. |

## 재현과 수치

- 작업트리를 건드리지 않고 `git archive b5cb15cc0`의 임시 복사본에서 동일한 Next 16.3.8 / 의존성 / 환경으로 두 빌드를 실행했다. 두 번째 실행은 리드가 커밋한 설정을 임시 복사본에 적용했다. 각 실행은 새 `.next`로 시작했고 `/usr/bin/time -l node scripts/deploy/build-next.mjs`를 사용했다. Vercel 배포 명령의 Prisma/그림 준비 단계와 Vercel 머신 전체 메모리는 이 비교 바깥이다.
- 양쪽 모두 종료 코드 0이었다. 맵을 끄면 컴파일 33.7 → 13.6초, 전체 64.28 → 41.77초, 최대 RSS 6,991,855,616 → 6,254,084,096바이트 (6.51 → 5.82 GiB, −10.6%)였다. 서버 청크 맵은 2,191개, 336,496,448바이트(320.91 MiB) → 0이었다. 리드가 본 시간 및 산출물 방향은 재현됐고, 이 표본의 맵 활성 RSS는 리드의 7.82–8.22 GB보다 낮았다. 한 번씩 실행한 Mac 값이라 프로젝트의 운영 메모리 여유로 환산하지 않는다.
- 아래 표의 MB는 별도 표기가 없으면 바이트를 10진으로 환산했다. “경로 수”는 앱 엔트리의 `.nft.json`에서 확인한 참조 수다. 앱 경로 매니페스트에는 엔트리 466개와 `/dev` 페이지 103개가 있었다. 리드가 제시한 461과는 매니페스트·CLI 집계 기준을 맞춰야 한다.

| 산출물 | 바이트 (P0 전) | 참조 |
| --- | ---: | ---: |
| 은행 route 층 | 11,094,936 | 50 |
| 은행 SSR 층 | 11,272,745 | 8 |
| 연산 그림 공용 SSR | 11,348,168 | 9 |
| 연산 grade-print 전용 SSR | 11,387,211 | 1 |
| 공유 도형 명부 | 원본 약 6.9 MiB | 이미 고정 경로 파일 읽기 |

네 대형 청크의 내용은 맵의 `sources`로 확인했다. 공유 도형 명부는 `loadSharedFigureManifest()`의 `readFileSync`와 기존 `outputFileTracingIncludes`에 들어 있다. 네 청크의 맵에는 명부 JSON 모듈이 없다. 명부는 새 외부화 대상에서 빼고 Next 라우트 trace와 파일 크기만 관찰한다. `@comunica` 쪽 4.62 MB 동일 크기 청크도 네 벌 확인했다. P1/P2 이후 다시 프로파일할 후보이며, 현 단계에서 의존성을 바꿀 근거로 쓰기는 이르다. 전체 라우트와 청크별 참조는 [chunks-maps-on.txt](chunks-maps-on.txt), 원본 모듈은 [chunk-sources.txt](chunk-sources.txt).

`NODE_OPTIONS=--max-old-space-size=4096 node scripts/deploy/build-next.mjs`는 제한 실험으로 해석할 수 없다. 래퍼가 그 뒤에 `--max-old-space-size=8192`를 추가한다. 필요하면 동일 조건에서 직접 CLI 또는 임시 측정 래퍼로 유효 값을 확인하고 Node heap·Turbopack native·Linux 컨테이너 총량을 함께 기록한다. Vercel 공개 문서의 Standard는 현재 4 vCPU/8 GB로 표기된다. 이번 배포 로그의 2 vCPU/8 GB와 차이가 있어 해당 프로젝트의 실제 기계 유형과 빌드 로그를 기록해야 한다. [Vercel 빌드 기계](https://vercel.com/docs/builds/managing-builds) · [Vercel OOM 진단](https://vercel.com/kb/guide/troubleshooting-sigkill-out-of-memory-errors)

## P0 운영 영향과 확인

- `withErrorLog.ts`는 예외 메시지와 `Error.stack`을 조합하고 `describe.ts`는 프레임을 잘라 기록한다. 저장소 자체에서 맵으로 원본 스택을 복원하는 코드나 `--enable-source-maps`는 찾지 못했다. 이 경로의 기록 메커니즘·실패 응답은 그대로 실행되며, Next 또는 수집기가 맵을 쓰던 곳의 파일·줄·함수 해석 품질은 낮아질 수 있다. Vercel Build Diagnostics/빌드 로그와 함수 Runtime Logs를 분리해 검증한다. 맵이 꺼진 상태도 메시지·digest·상관 ID·HTTP 상태를 확인하고 실제 프레임 변화를 기록한다.
- 운영에는 Next dev 오류 오버레이가 없다. 운영 React 에러 경계/오류 응답을 분리해서 확인한다. 현재 설정이 개발에도 적용되므로 작은 시험용 dev 오류에서 오버레이 위치·클릭·원본 프레임을 확인한다. 개발 회귀가 실제로 확인되면 production build phase에만 끄고 dev 기본값을 유지하는 후보를 검증한다. 브라우저 production map은 켠 산출물에서도 0이었다. `productionBrowserSourceMaps`와 동일한 서버 전용 스위치로 설명하면 안 된다. [Next Turbopack 설정](https://nextjs.org/docs/app/api-reference/turbopack)
- P0 후에도 TypeScript 작업자는 별도 단계의 큰 메모리 소비자다. 빌드 캐시/기계가 다른 단일 Ready만으로 여유량을 확정하지 않는다.

## P1a 은행

- 전체 직접 참조는 [bank-imports.txt](bank-imports.txt)에 경로와 줄을 기록했다. `bank/index.ts`가 7 core + 7 plus를 즉시 합친다. `bank/load.ts`는 학년별 dynamic import로 원본+보강을 가져오며 `ConceptBlankView.tsx`가 브라우저에서 사용한다. `stock.ts`와 `compose.ts`는 주입된 은행을 다룬다. `coreConceptBank.ts`는 index를 우회하여 7 core 파일을 직접 쓰므로 textbook quick-create를 별도로 이관해야 한다. `assessment.ts`와 14개 grade 모듈이 `.data.js`를 통해 저작 JSON을 읽고 스키마와 revision을 적용한다.
- 운영 직접 소비자는 개념 백지 인쇄 페이지, scan issued, privateDocumentActions, textbook concepts 및 quick-create, fading catalog, ontology definitionEvidence다. textbook learn/교사용·문서·학생과 교사 fading·ontology 라우트의 전이 의존은 trace 목록에서 확인한다. 브라우저 경로는 `SrsWorkspaceView.tsx → import("./previewData")`와 `ConceptBlankView → loadGradeBank`를 우선 처리한다. `devSamples.ts`는 현재 값 소비가 `/dev/fading`과 `/dev/fading-teacher-hifi`의 서버 페이지에 있고 `FadingDevClient`에서는 타입만 읽는다. `/dev/concept-blank-scan-wire/samples.ts`도 호출 경계를 확인한다.
- 검수/작성 입력을 별도 유지한다. 은행 감사·학생 문장 compile/검증·그룹 sync/rebalance·함정/시뮬레이션·scan E2E/사진·교재 quick-create 증명이 전체, part, 또는 원본 JSON을 소비한다. 원본 JSON 직접 경로와 동적 문자열 경로를 목록에 포함했다. `test` 모듈에 `server-only` 진입을 막연히 씌우기 전에 기존 Vitest, tsx, esbuild 및 브라우저 번들 실행 방식을 구분한다.
- 우선 안은 저작 입력을 유지하고 동일한 `withAssessments`/given-case 로직으로 14개 배포 데이터를 만들며, 버전·part별 해시를 생성한다. Node 앱 소비자는 명시적인 동기 getter로 최초 요청 때 읽고 함수 인스턴스 안에서 재사용한다. module top-level에서 전 part를 읽으면 빌드 page-data와 런타임 cold start 비용이 남는다. N개 서버 함수에 모든 파일을 일괄 넣지 말고 라우트별 필요한 part 또는 projection을 trace한다. `process.cwd()` 기준 경로와 배포 출력 폴더를 깨끗한 패키지에서 확인한다. Edge·완전 정적 페이지에는 trace includes가 적용되지 않으므로 필요 시 Node 경계를 따로 둔다. [Next 파일 추적](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- 개념 백지 화면에는 기존 학년 단위 로딩을 인증된 데이터 경계로 이동한다. 기존 교사 preview에는 실제 로컬 미리보기 입력만 보낸다. 권한·branch scope·학생 허용 정책, 정답 포함 payload 및 캐시 공유 여부를 검증한다. 은행 전체를 `public/`에 올리거나 RSC props로 내리면 노출·전송 문제와 그래프 문제가 다시 생긴다. 서빙 실패는 빈 은행·새 digest로 처리하지 말고 기존 오류 경로에 연결한다.
- 배포 파일의 무결성 해시와 풀이의 내용 지문은 목적이 다르다. `fadingContentKey`는 개념 지문과 정규화한 함정 텍스트 순서를 이용해 세션 토큰을 계산한다. 생성 방식만 바뀌는 전환에서는 동일 개념·함정에 대해 digest, content key, 저장 UUID→화면 UUID, 칩 순서, open session의 복원 상태가 이전 값과 정확히 일치해야 한다. 한 문장/함정만 바꾼 음성 사례에서는 이전 토큰 409도 재확인한다. `fadingGroups.test.ts`는 구조·포함 관계 보호에 유효하지만 문장 동일성을 별도 전수 비교한다. `conceptBlankBank`·`conceptBlankBankLoad`·`fadingContentGuard`·`fadingRoutes`·교재 해시와 검토/고정 시험도 실행한다. core/plus 순서, null/제외사유, questionRevision, Unicode, 텍스트/수식, 이미 발행된 스캔 및 고정 교재 payload를 비교한다.
- RED는 배포 후 trace에서 자산 누락을 탐지하는 시험, 기존 앱/브라우저 번들에서 원본 은행 모듈 발견 시 실패하는 시험, 과거와 현재 bank projection의 전수 동등성이다. GREEN은 새 배포 출력만으로 Node 인쇄, 발행 스캔, 교재 quick-create, 교사 미리보기/학생 실제 세션에서 파일 I/O 및 토큰까지 동작해야 한다. 기준선 대비 냉간 p95와 함수별 압축/비압축 크기 변화도 기록한다.

## P1b 연산 그림

- 7개 JSON은 약 10.7 MiB다. `angles`는 매칭 ID에서 literal `require`, `engineFigures`·`dimensions`·`remaining`·`segments`는 정적 JSON import를 쓴다. 압축된 문자열에 `atob → fflate.inflateSync → JSON`을 적용하는 경로와, inline 템플릿·인덱스·압축 청크를 부분 복원하는 경로가 함께 있다. `engine-typography-v1.json`은 3.2 KiB로 독립적으로 판단한다. pack을 그대로 운반하는 1차 전환과 포맷 자체 변경을 분리하고 기존 family 단위 지연 디코딩·LRU를 보존한다.
- `arithmeticOutput.ts`는 브라우저에서 연산 생성/검토/문항 재생성, AdminArithmeticPreview, WorksheetEditor/Print/ProblemMeta에 닿는다. `GradeArithmeticPaper`와 SSR 전용 grade-print까지 같은 표현 어댑터를 쓴다. 공용 모듈에 fs를 얹으면 클라이언트 도달성이 깨진다. Node 인쇄는 traced reader, 브라우저는 승인된 준비 경계에서 필요한 family 또는 렌더된 SVG만 주입한다. 준비가 필요한 바깥 경계만 비동기로 두며 요청-응답 경합, 빠른 단원 전환, 재시도, 미준비 인쇄/저장 방지, 오프라인 동작의 기존 기대를 맞춘다. 이미 저장한 canonical/id/figure snapshot은 변경하지 않고 디스플레이 SVG만 계산한다.
- 단위 시험의 각 figure family·타이포그래피·기하 정책, seeded 실제 출력의 SVG 및 치수, 관리 미리보기, 교사 작업대(생성·부분 재생성·저장·열기), worksheet 인쇄, grade-print를 실행한다. mixed-family에서 최초 디코드 횟수, warm cache, 클라이언트 first-load 전송 바이트 및 인쇄 완료 시간도 비교한다.

## P2 운영 경로 유지

- 저장소에서 운영에서 원장에게 열리도록 명시된 곳은 42개다. [전체 목록](dev-director-routes.txt)에는 `/dev/print-check`, `/dev/print-paper`, `/dev/print-specimen`, `/dev/exam-print`, `/dev/pack-by-height`, `/dev/figure-glyph-size`, 시험지·보고서·스캔·수직선·복습·fading 화면 등이 있다. 이는 **사용 가능한 경로의 목록**이다. 실제 이용 횟수는 이 검토에서 확인하지 않았다. print-check는 별도 인쇄 컴퓨터를 위한 명시 운영 요구다. 로그와 소유자 확인 전에는 42개를 보존 후보로 취급한다.
- `/dev/arithmetic/grade-print`는 plain `devPageVisible()`, `/dev/fading`는 `ENABLE_RENDER_QA`, `/dev/transfer-qa`는 `ENABLE_TESTCHANGER_QA`, `/dev/katex`는 `ENABLE_KATEX_QA`로 제어된다. `/dev/unified`와 `/dev/workspace-alignment`는 개발 전용이다. 운영 환경에서 켜진 별도 QA 플래그 및 외부 북마크·검수 스크립트의 URL은 결정 전에 대조한다. `/api/dev`와 공개 `/lab`, `/dev/blender-assets` 등의 정적 자원까지 동일 접두사로 제거하면 다른 계약이 바뀐다. `/dev/print-check/items.ts`처럼 route 외 소비자가 있는 fixture도 분리 조사가 필요하다.
- 첫 실험으로 전용 grade-print 엔트리 제외 전후의 크기/RSS를 측정한다. Next의 `--debug-build-paths`는 이 실험에 적합하지만 공개 문서상 디버그 기능이다. 정식 배포는 dev 전용 라우트 등록을 staging tree 또는 별도 QA 앱에서 관리하고 운영 목록을 manifest와 비교한다. 원본 checkout에서 파일을 이동/복원하는 방식은 캐시·병렬 실행·실패 재시도에 취약하다. runtime `notFound()`나 proxy 차단만으로 graph가 줄지 않는다. 유지 경로의 가드는 방어로 계속 남기고, `devPageGuardCoverage`와 anonymous/no-DB 시험을 실제 출력에도 적용한다. [Next 빌드 CLI](https://nextjs.org/docs/app/api-reference/cli/next)

## 대안 및 P3 측정

- JSON import attribute는 JSON 해석의 문법이며, Turbopack이 산출물에 내장하는 동작을 바꾸지 않는다. dynamic import는 브라우저 초기 로딩과 런타임 eager evaluation에 유효하다. 현재 학년 loader 자체가 그 사례이며, 빌드 그래프에서는 여전히 파일을 변환한다. 각각을 P1 완료 조건으로 단독 인정하지 않는다.
- `serverExternalPackages`는 Node package 경계가 이미 있을 때 검토할 수 있다. 내부 상대경로를 그냥 넣어 해결할 수 없고, 브라우저에는 적용되지 않는다. 로컬 workspace 패키지화는 배포 추적·해결·파일 크기 부담을 별도로 시험한다. 단순 데이터에 우선 적용할 이유는 약하다. `--webpack` 또는 Enhanced/elastic은 긴급 복구 후보가 될 수 있으나, 전체 회귀와 비용을 별도 확인한다. 라우트 통합은 URL·인증·trace가 달라질 수 있으므로 공통 데이터 경계를 먼저 줄인다. [Next 패키지 외부화](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) · [Vercel elastic](https://vercel.com/changelog/elastic-build-machines-now-protect-against-out-of-memory-builds)
- P3 후보 초기선은 Linux 8 GiB 제한에서 컨테이너 최고치 6.4 GiB 경고, 7.2 GiB 차단이다. 실측 3회와 Vercel 기계의 headroom으로 조정한다. `memory.peak`/OOM 카운터를 쓰거나 동일 cgroup에만 빌드를 넣고 이 값을 아티팩트로 남긴다. Mac `time -l`은 보조 비교다. 프로세스별 RSS 합산은 공유 페이지 중복과 샘플링 누락을 설명해야 한다. Vercel의 peak, compile·typecheck·tracing 시간, 기계 유형·CPU·캐시·Node/Next·커밋과 함께 비교한다.
- PR 검사에는 서버 JS 총량·최대 청크, 서버 map 유무/바이트, static JS 총량·초기 라우트 청크 및 큰 trace files를 기록한다. 지금 산출물의 134.3 MB / 11.39 MB에 임시 10% 증가 경고를 둘 수 있고, P1/P2 완료 후 기준을 재설정한다. 절대 상한과 기준 대비 증가 폭을 함께 두며 압축 전/후를 명시한다. 청크 예산은 조기 경보라서 OOM 판정은 전체 cgroup을 쓴다. 개발자 머신마다 고비용 pre-push를 실행하는 대신 산출물 검사와 기준 환경 CI를 사용한다.
