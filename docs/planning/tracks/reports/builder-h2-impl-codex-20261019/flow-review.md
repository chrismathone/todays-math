# 시험지 만들기 H2 독립 검증

측정: 2026-10-19T04:22:08.426Z → 2026-10-19T04:23:10.918Z
제품 작업트리: /Users/pss/Desktop/creative/today-builder-wire

## 판정

DB: passed. 검증된 READ ONLY 트랜잭션 3회, 의도한 롤백 3회, 제품 읽기 메서드 93회(SQL 문장 수와 다름), 합성 보호 검사 10개.
제품 DOM: passed. 실제 HTTP API 호출 0회.
인증된 HTTP 전후 속도는 미검증이다. 거절 응답도 DB 오류 로그를 쓸 수 있어, 쓰기 금지 및 서버 유지 조건에 따라 호출하지 않았다.

## 실제 범위와 출제 가능 수

문항은 서버의 question 정체성 기준이다. 기본 설정의 범위별 선택 상한은 같은 문항류 1개 규칙의 갈래 수다. 범위별 합계와 전역 문항 수를 혼동하지 않는다.

| 출처 | 범위 수 | 보유 문항 | 출제 가능 문항 |
|---|---:|---:|---:|
| all | 735 | 70368 | 67893 |
| textbook | 735 | 12301 | 11783 |

### all 학년별

| 학년·과정 | 전체 범위 | 선택 가능 범위 | 출제 가능 문항(범위 합) | 갈래 상한(범위 합) |
|---|---:|---:|---:|---:|
| 초1 | 57 | 0 | 0 | 0 |
| 초2 | 73 | 0 | 0 | 0 |
| 초3 | 56 | 56 | 6721 | 589 |
| 초4 | 62 | 62 | 7323 | 673 |
| 초5 | 56 | 56 | 7401 | 633 |
| 초6 | 56 | 56 | 7109 | 607 |
| 중1 | 52 | 52 | 15139 | 5359 |
| 중2 | 56 | 56 | 13603 | 3969 |
| 중3 | 22 | 22 | 4079 | 316 |
| 공통수학1 | 53 | 51 | 2376 | 934 |
| 공통수학2 | 50 | 47 | 763 | 675 |
| 대수 | 38 | 38 | 1910 | 736 |
| 미적분1 | 28 | 28 | 680 | 586 |
| 확률과 통계 | 20 | 20 | 561 | 531 |
| 기하 | 27 | 25 | 228 | 218 |
| 미적분2 | 29 | 0 | 0 | 0 |

### textbook 학년별

| 학년·과정 | 전체 범위 | 선택 가능 범위 | 출제 가능 문항(범위 합) | 갈래 상한(범위 합) |
|---|---:|---:|---:|---:|
| 초1 | 57 | 0 | 0 | 0 |
| 초2 | 73 | 0 | 0 | 0 |
| 초3 | 56 | 0 | 0 | 0 |
| 초4 | 62 | 0 | 0 | 0 |
| 초5 | 56 | 0 | 0 | 0 |
| 초6 | 56 | 0 | 0 | 0 |
| 중1 | 52 | 52 | 4757 | 4757 |
| 중2 | 56 | 55 | 3346 | 3346 |
| 중3 | 22 | 0 | 0 | 0 |
| 공통수학1 | 53 | 51 | 934 | 934 |
| 공통수학2 | 50 | 47 | 675 | 675 |
| 대수 | 38 | 38 | 736 | 736 |
| 미적분1 | 28 | 28 | 586 | 586 |
| 확률과 통계 | 20 | 20 | 531 | 531 |
| 기하 | 27 | 25 | 218 | 218 |
| 미적분2 | 29 | 0 | 0 | 0 |

## 제품 요청 수와 로컬 DOM 시간

실제 제품을 jsdom으로 실행. 첫 1회 예열 제외, 전후 순서 교대, 학년별 7회. 같은 실제 DB 응답을 메모리에서 전달한다. workspace-units는 작업실이 단원 메타데이터를 전달한 진입, deferred-units는 mathSource가 bootstrap을 직접 받는 진입이다.

| 출처 / 진입 | 학년 수 | 요청 수 전→후 | 로컬 단계 합 중앙값 ms 전→후 | 요청 증가 없음 | 로컬 합 증가 없음 |
|---|---:|---:|---:|---|---|
| all / workspace-units | 13 | 1 → 1 | 15.005 → 9.956 | true | true |
| all / deferred-units | 13 | 2 → 2 | 14.625 → 11.204 | true | true |
| textbook / workspace-units | 8 | 1 → 1 | 17.74 → 11.011 | true | true |
| textbook / deferred-units | 8 | 2 → 2 | 13.264 → 10.39 | true | true |

단계별 시간과 요청 수:

| 출처 / 진입 | 단계 | 로컬 ms 전→후 | 요청 수 전→후 |
|---|---|---:|---:|
| all / workspace-units | entry | 10.193 → 6.681 | 1 → 1 |
| all / workspace-units | grade | 2.005 → 0.819 | 0 → 0 |
| all / workspace-units | unit | 0.934 → 0.826 | 0 → 0 |
| all / workspace-units | lesson | 1.627 → 1.244 | 0 → 0 |
| all / deferred-units | entry | 9.275 → 7.774 | 2 → 2 |
| all / deferred-units | grade | 2.153 → 0.91 | 0 → 0 |
| all / deferred-units | unit | 1.007 → 0.888 | 0 → 0 |
| all / deferred-units | lesson | 1.647 → 1.273 | 0 → 0 |
| textbook / workspace-units | entry | 12.01 → 6.351 | 1 → 1 |
| textbook / workspace-units | grade | 2.375 → 1.018 | 0 → 0 |
| textbook / workspace-units | unit | 1.148 → 1.03 | 0 → 0 |
| textbook / workspace-units | lesson | 1.917 → 1.672 | 0 → 0 |
| textbook / deferred-units | entry | 8.224 → 7.419 | 2 → 2 |
| textbook / deferred-units | grade | 2.21 → 0.841 | 0 → 0 |
| textbook / deferred-units | unit | 0.991 → 0.911 | 0 → 0 |
| textbook / deferred-units | lesson | 1.7 → 1.271 | 0 → 0 |

## 서버 로더 시간 (HTTP 제외)

| 로더 | cold 중앙값 ms | warm 중앙값 ms | cold 읽기 연산 | warm 읽기 연산 |
|---|---:|---:|---:|---:|
| bootstrap | 2058.058 | 0.098 | 4 | 0 |
| allWithoutRecent | 2384.399 | 0.026 | 4 | 0 |
| textbookWithoutRecent | 2329.059 | 0.014 | 5 | 0 |
| all | 2547.808 | 2297.925 | 4 | 4 |
| textbook | 2336.515 | 2363.242 | 5 | 5 |

응답 digest 안정: true. 이는 같은 로더의 반복 결과 비교이며, 전후 서로 다른 서버의 HTTP 비교가 아니다.

## 보호·재현과 한계

3008 리스너 전후 동일: true. 서버 시작·재시작 명령을 실행하지 않았다.
제품 소스 측정 중 안정: true. 실제 사용한 모든 JS/TS 소스 digest는 JSON에 있다.

```sh
cd '/Users/pss/Desktop/creative/today-builder-wire'
TSX_DISABLE_CACHE=1 node node_modules/tsx/dist/cli.mjs scripts/qa/measure-builder-h2-flow.ts --rounds 7 --db-rounds 3 --baseline-from-git
```

기준 사본이 없어도 파일을 복원할 필요가 없다. 세 파일(ExamBuilder.tsx, ExamBuilder.module.css, ScopePicker.tsx)은 각 src/components/exam-builder/ 경로에 대해 git show b353aff927677b475ff167137214898879ac27c5:<경로>를 실행해 메모리에서 읽는다. --baseline-from-git 옵션은 사본을 그대로 둔 채 같은 경로를 강제로 검증한다. 이번 기준 파일 출처: ExamBuilder.tsx=pinned-git-show-in-memory, ExamBuilder.module.css=pinned-git-show-in-memory, ScopePicker.tsx=pinned-git-show-in-memory.

DB 자식 프로세스만 지정된 env-file을 로드한다. NODE_OPTIONS에 --conditions=react-server를 추가한다. Prisma 실제 클라이언트는 로그를 끄고, 제품의 visibility extension을 유지한다. SET TRANSACTION READ ONLY 및 transaction_isolation 확인 뒤에만 모델/SQL 읽기를 허용한다. 제품 내부 트랜잭션은 같은 보호된 클라이언트를 사용한다. 모든 성공 트랜잭션도 센티널 예외로 ROLLBACK한다. 쓰기·unsafe raw·트랜잭션 밖 읽기·배열 트랜잭션은 거절한다. 부정 검사는 가짜 클라이언트에서만 실행하므로 실제 DB 쓰기 시도가 없다.

실제 bootstrap·availability 응답은 IPC와 프로세스 메모리에만 있다. 결과 파일에는 수량·해시·시간·요청 경로만 저장한다. 계정·학생·문항 본문·DB 주소·env 내용·오류 원문을 출력하거나 저장하지 않는다.

- DB samples execute unmodified product loaders locally in verified READ ONLY/RepeatableRead transactions; they exclude auth, HTTP, Next compilation and rendering.
- Offline DOM samples run real ExamBuilder and mathSource against the same real response objects. Requests are intercepted in memory; CSS, layout, paint, network and account authorization are excluded.
- One source-order eligible lesson per grade is selected; all curriculum scopes and default family counts are checked on every mount. No questions are composed or saved.
- The default UI sends recent=1. Its pure product reader receives an explicitly empty exclusion context (recentProblemIds => []), as in the existing read-only benchmark. This is shared-bank capacity, not an authenticated teacher's capacity. Personal 14-day history and its DB cost are unverified; no account/history rows are read.
- Baseline ExamBuilder/ScopePicker use the supplied temporary copies when present, otherwise git show from pinned b353aff927677b475ff167137214898879ac27c5 in memory. --baseline-from-git forces the fallback without modifying the snapshot. Other baseline TS/TSX dependencies, including mathSource, always come from that pinned commit. Current loaded sources are hashed and checked for concurrent edits. CSS/layout are excluded.
- Local medians cannot prove non-increase of authenticated end-to-end HTTP latency; individual tiny DOM stage timings are subject to scheduler/JIT noise.

HTTP 차단의 코드 근거: src/lib/studio-ai/guard.ts authorizeStudio, src/lib/errorLog/withErrorLog.ts withErrorLog/logRejection, src/lib/errorLog/record.ts recordErrorLog. 인증 우회 또는 서버·DB 설정 변경 없이 HTTP 지연의 동등성을 결론낼 수 없다.

## 최종 소스 및 스크립트 확인

제품 최종 소스 기준 재측정: 2026-10-19T04:23:10.918Z. 7회 DOM / 3회 READ ONLY. 측정 흐름 588개; 학년·출처·진입 조합별 중앙값 증가 없음 42/42. 측정 후 읽은 제품 소스도 전부 동일하다.

UTF-8 소스 바이트의 SHA-256:

| 파일 | SHA-256 |
|---|---|
| src/components/exam-builder/ExamBuilder.tsx | d95ed6e45f5deef39f225637da43b230df0f3db5167e880105b05d4f0f3b4be4 |
| src/components/exam-builder/ScopeSequencePicker.tsx | f9d10f2384c64d5da36375757b0efed75ae301a4fa3d527ed8d1db303ddd67ba |
| src/components/exam-builder/useQuestionReorder.ts | e406d9a177fc6d09e25129f4d64bea82e74d333ddc09c9a652f8f976cd2e8a4a |
| src/components/exam-builder/mathSource.ts | 46be528cacf269aa039b4343e0924b9a08618a8cc3d4006ca57ad4a123200c6e |

측정 스크립트 SHA-256: 59dcb0eca79b18f16d62705a8578868b6ac6fa11bebc7e2dd1656cc9ef6523ee.

기준 사본의 세 파일은 실제로 git show 메모리 경로로 읽어 검증했다. 제공된 임시 사본과 세 digest가 모두 일치하며, 임시 디렉터리나 추가 repo 파일은 만들거나 변경하지 않았다.

- 측정 스크립트 eslint: exit 0.
- 측정 스크립트와 해석된 의존성 전체 그래프 TypeScript: 오류 0. noEmit, incremental=false.
- 별도로 시도한 전체 저장소 기본 4GB tsc는 heap OOM으로 종료했다. 전체 저장소 type-check 통과를 주장하지 않으며, 위 성공 결과는 요청된 측정 스크립트 범위다.

정적 검사 재현(위 제품 작업트리에서):

```sh
node node_modules/eslint/bin/eslint.js scripts/qa/measure-builder-h2-flow.ts
node --max-old-space-size=8192 - <<'TYPECHECK'
const ts = require('typescript');
const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(['scripts/qa/measure-builder-h2-flow.ts'], {
  ...parsed.options, incremental: false, noEmit: true
});
const diagnostics = ts.getPreEmitDiagnostics(program);
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => '\n'
}));
console.log(JSON.stringify({ errors: diagnostics.length }));
process.exitCode = diagnostics.length ? 1 : 0;
TYPECHECK
```
