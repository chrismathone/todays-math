# 연산대장 메인 스레드 병목 — 2026-10-20

브리프 항목 4만 수정했다. **메뉴 진입의 Long Task는 로컬 3회 모두 1건(205 / 189 / 172ms)에서 0건으로 줄었다.** 원인은 카드 24개의 렌더보다 브라우저에서 필요 없이 실행하던 연산 엔진의 초기화와 전체 카탈로그 예제 생성이었다. CSS·문구·생성/채점 규칙·API·저장 계약을 변경하지 않았다. 운영 981ms를 같은 조건으로 재측정한 결과는 아니다.

## 재현 조건과 증거

- 기준 소스: `560c6a0fa0d0fcb7908e0628b86bb62e6395c505`.
- Next 16.3.8 로컬 dev, Turbopack, `127.0.0.1:3184`; Playwright Chromium `151.0.7922.34`, 1685×1000, CPU 배율 1, 매 회 새 브라우저 context. 페이지와 지연 청크를 한 번 예열한 뒤 측정했다.
- 익명 `/dev/arithmetic-sweep`: 현재 엔진에서 만든 737개 유형을 서버 컴포넌트가 직렬화하고, fixture가 실제 `ArithmeticWorkbench`의 카탈로그·생성 요청을 **메모리 안에서** 응답한다. 기본 연산 카탈로그도 메모리 응답이다. 나머지 API 모양의 호출은 메모리에서 503을 반환한다. 실제 `/api/**`와 외부 HTTP는 Playwright에서 차단했다. 전후 6회 모두 실제 API 요청 0건, 페이지 오류 0건이다.
- 공유 `.env`를 읽지 않았다. dev 서버의 두 DB URL은 접속 불가능한 `127.0.0.1:1`의 fixture 주소로 지정했다. 계정·운영 DB·인증 API·스키마 쓰기를 사용하지 않았다.
- CDP `Profiler`, sampling interval 1000µs와 `PerformanceObserver(longtask)`를 사용했다. 열기 클릭 전 프로파일을 시작하고, 24개 카드와 생성 버튼이 준비된 뒤 300ms까지 기록했다.
- **앱 수정 전에** 3회 CPU/LongTask를 확보했다. 보존된 원본 소스에서 동작 비교를 추가 실행하고, 수정본에서 같은 13단계를 실행했다. 도구 준비 중 실패한 예열/fixture 실행은 아래 표에서 제외했다.
- Webpack은 기존 `ArithmeticWorkbench.module.css:540`의 전역 인쇄 선택자에 대해 `is not pure` 오류로 실행되지 않았다. 해당 CSS를 고치지 않고, 외부 `node_modules`를 APFS clone한 로컬 사본으로 Turbopack을 실행했다. `node_modules`는 Git에 추가하지 않았다.

원본 증거는 Git 밖 `/tmp/arithmetic-sweep-20261020-final/`에 보존했다.

| 파일                                          | 내용                                         |
| --------------------------------------------- | -------------------------------------------- |
| `before/run-{1,2,3}.cpuprofile`               | 수정 전 V8 CPU 원본                          |
| `after/run-{1,2,3}.cpuprofile`                | 수정 후 V8 CPU 원본                          |
| `before/summary.json`, `after/summary.json`   | 각 회차 LongTask·관측 준비 시간·함수 샘플    |
| `before/behavior.json`, `after/behavior.json` | 13단계 문구·DOM·폼 값 지문                   |
| `before/*.png`, `after/*.png`                 | 초기·생성·정답·출력 등을 포함한 각 12개 캡처 |
| `after/behavior-comparison.json`              | 단계별 DOM·픽셀 비교 결과                    |
| `artifact-sha256.json`                        | 원본 trace·summary·동작 증거 SHA-256         |

## CPU에서 확정한 경로

1. `GradeArithmeticWorkbench`와 `ArithmeticGradeSelect`가 모듈을 읽는 순간 각각 `listArithmeticV2Types()`를 호출했다. 목록 API가 이미 같은 `types`를 내려주는데 브라우저는 이를 버리고 전체 737개 유형의 예제를 다시 생성·검증했다.
2. 해당 import와 `ArithmeticWorkflow → arithmeticOutput → arithmetic-v2` 경로가 전체 registry/family를 초기화했다. `families/elementary/fractions.ts`의 `threeTermDomain → rows → properPool.reduce → threeTermAllowed → isProper`가 대표 병목이다. `families/algebraComplete/shared.ts`의 `tuples` 등도 초기 후보 공간을 전개했다. 첫 화면은 페이지 24개 유형만 필요하다.
3. `arithmeticToStudioProblems`는 저장된 문항을 투영할 때도 전체 예제 카탈로그를 만들었다. 필요한 것은 유형 제목·학년·영역·표현 메타데이터이며, 새 문제/정답 생성은 필요하지 않다.

아래는 같은 세 원본 trace에서 해당 이름이 스택에 있었던 샘플의 시간(ms)이다. 부모·자식 함수는 겹치므로 합산하지 않는다. `family`는 연산 family 청크가 스택에 있던 샘플이며, 일부 기하 초기화는 수정 후에도 남아 있다.

| 함수/청크               |   전 1 |   전 2 |   전 3 |  후 1 |  후 2 |  후 3 |
| ----------------------- | -----: | -----: | -----: | ----: | ----: | ----: |
| family                  | 164.70 | 152.14 | 140.51 | 14.16 | 12.51 | 14.95 |
| `listArithmeticV2Types` |  35.26 |  34.56 |  29.20 |     0 |     0 |     0 |
| `threeTermAllowed`      |  29.73 |  24.37 |  28.10 |     0 |     0 |     0 |
| `isProper`              |  20.84 |  14.47 |  20.59 |     0 |     0 |     0 |
| `tuples`                |  18.39 |  16.81 |  14.32 |     0 |     0 |     0 |

## 전후 3회

| 회차 | 전 LongTask 수 / 최대(ms) | 후 LongTask 수 / 최대(ms) | 전 클릭→준비(ms) | 후 클릭→준비(ms) |
| ---- | ------------------------: | ------------------------: | ---------------: | ---------------: |
| 1    |                   1 / 205 |                     0 / 0 |            423.6 |            786.8 |
| 2    |                   1 / 189 |                     0 / 0 |            398.3 |            365.3 |
| 3    |                   1 / 172 |                     0 / 0 |            373.5 |            373.4 |

후 1회 준비 시간 786.8ms도 제외하지 않았다. 이 값은 dev 청크 요청·컴파일/캐시 상태·Playwright의 준비 조건 polling·비동기 대기를 포함하고, 해당 회차에도 50ms 이상 메인 스레드 작업은 없었다. 컴파일/캐시가 그 차이의 정확한 기여분인지는 분리 측정하지 않았으므로 **준비 시간의 일괄 개선이나 HTTP 개선으로 주장하지 않는다.**

## 수정 범위

- `GradeArithmeticWorkbench`: 기존 목록 응답의 `types`를 사용한다. 버전 확인, 실패 문구, 명시적 `다시 확인`, writer gate를 유지한다. 로컬 preview는 필요할 때 카탈로그를 import한다. 생성·숫자 변경·저장본 복원에서만 생성/검증 모듈을 읽는다.
- `ArithmeticGradeSelect`: 예제 생성 없이 카탈로그에서 받은 학년 집합으로 선택기를 구성한다. 기본 연산의 기존 9개 학년 옵션은 현재 전체 카탈로그와 같은지 시험으로 고정했다.
- `ArithmeticWorkflow`와 새 `ArithmeticGeneratedWorkflow`: 저장된 sheet가 있을 때만 투영 모듈을 읽는다. 정답 표시 상태는 바깥 workflow에 남겨 단계 이동·초안 보존을 유지한다.
- `arithmeticOutput`: 원본 registry의 메타데이터만 읽고, 기본 연산은 필요한 스킬 메타데이터만 읽는다. `problemAt`을 호출하지 않는다. 회차 복원 함수는 새 `arithmeticReviewRounds`로 분리하되 기존 `arithmeticOutput` 재수출을 유지했다.

## D-07 동등성과 검사

13단계: 초기 화면, 2페이지, 학년/학기 필터, tooltip, 검색 무결과, 담기, 첫 생성/검토, 정답 보기, 2회차, **출력**, 범위 복귀, 기본 연산 전환, 학년별 초안 복귀.

- 13단계 모두 문구·카드 순서·문항/정답·입력값·disabled/checked 상태와 정규화 DOM 지문이 같았다.
- DOM 정규화는 속성 삽입 순서, React의 불투명한 ID 이름(참조 관계는 유지), Suspense가 남긴 빈 `style=""`만 제외한다. 실제 문구·구조·속성값은 유지한다.
- 스크린샷 12개 중 **11개는 원본 PNG 바이트까지 동일**하다. `page-2`만 1401×942 중 모서리 18픽셀이 채널 값 1/255 차이를 보였다. 첫 시도의 학년 필터 39픽셀 차이는 최종 재실행에서 없어졌다. 원본을 모두 보존하며, 비교기는 strict DOM 일치에 더해 **최대 100픽셀·채널 차이 1 이하**의 경계 래스터 차이만 허용한다. 출력 캡처도 바이트 동일이다.
- 관련 Vitest **9파일 79시험 통과**. 전체 737개 유형의 저장 prompt/answer/snapshot 투영, 첫 생성, 선택 재생성, 기본/학년별 초안 유지, 수동 저장·revision 충돌·저장본 복원·writer/preview gate를 확인했다. 추가로 서버 카탈로그 재사용, 카탈로그 누락 후 재시도, 기본 연산 학년 옵션, 출력 중 `problemAt` 미호출을 검증했다.
- `npm run type-check` 통과, 변경 TS/TSX/MJS 파일 ESLint 통과, `npm run lint:affordance` 통과, `git diff --check` 통과.
- React 품질 점검: hook 조건부 호출 없음, 비동기 catalog/복원은 취소 이후 상태 갱신을 막음, 기존 native label/aria/초안 상태와 출력 권한을 유지함.

## 재실행

공유 환경 파일 없이 포트 3184에 로컬 dev 서버를 띄운 뒤 실행한다. fixture는 production에서 404다.

```sh
node scripts/qa/profile-arithmetic-sweep-20261020.mjs --phase before --runs 3 --output /tmp/arithmetic-sweep-repeat
node scripts/qa/profile-arithmetic-sweep-20261020.mjs --phase after --runs 3 --output /tmp/arithmetic-sweep-repeat --compare /tmp/arithmetic-sweep-repeat/before
```

`before`는 수정 전 소스에서 실행해야 한다. 측정과 분리해 동작만 다시 보려면 `--behavior-only`를 추가한다. 스크립트 기본 경로는 `/tmp/arithmetic-sweep-20261020`이며 이번 최종 증거는 위의 `-final` 경로다.

## 한계와 남은 일

- 운영 슈퍼관리자 화면·운영 DB에서 981ms가 실제로 얼마나 줄었는지는 확인하지 않았다. 배포하지 않았다. fixture는 독립 작업 면이므로 전체 workspace shell, 모바일/실기기, 실물 인쇄를 새로 검수한 결과도 아니다.
- catalog 425ms, labels 860ms의 운영 HTTP 지연을 수정하지 않았다. 카탈로그 응답을 기다리는 비동기 시간은 남으며, 사용 이력 labels도 도착한 metadata를 기준으로 요청한다.
- 첫 생성/검토·저장본 복원에서는 엔진·검증·투영이 여전히 필요하다. 해당 동작의 결과는 검사했지만, 그 CPU 지연 자체를 이번 메뉴 진입 성능 창으로 측정했다고 주장하지 않는다.
- 공유 DB 쓰기·스키마 변경·커밋·staging·push 없이 변경 파일을 보존했다. 최종 통합/운영 확인은 coordinator 소유다.

## 인계 파일

```text
src/components/arithmetic/ArithmeticGradeSelect.tsx
src/components/arithmetic/ArithmeticWorkflow.tsx
src/components/arithmetic/ArithmeticGeneratedWorkflow.tsx
src/components/arithmetic/GradeArithmeticWorkbench.tsx
src/components/arithmetic/LegacyArithmeticWorkbench.tsx
src/lib/arithmeticOutput.ts
src/lib/arithmeticReviewRounds.ts
src/app/dev/arithmetic-sweep/page.tsx
src/app/dev/arithmetic-sweep/ArithmeticSweepFixture.tsx
scripts/qa/profile-arithmetic-sweep-20261020.mjs
src/__tests__/components/ArithmeticGroupedOutput.test.tsx
src/__tests__/components/ArithmeticManualSave.test.tsx
src/__tests__/components/ArithmeticSelectiveRegeneration.test.tsx
src/__tests__/components/ArithmeticWorkbench.test.tsx
src/__tests__/components/ArithmeticWorkbenchRouting.test.tsx
src/__tests__/components/GradeArithmeticWorkbench.test.tsx
src/__tests__/unit/arithmeticOutput.test.ts
docs/planning/tracks/reports/browser-sweep-parts/arithmetic.md
```
