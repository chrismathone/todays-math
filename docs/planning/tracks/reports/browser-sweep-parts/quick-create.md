# 교재 quick-create 집계 — 브라우저 성능 점검 1번

2026-10-20. 작업 경로 `/Users/pss/orca/workspaces/today_/sweep-quick-create`.
공유 DB·스키마·화면을 변경하지 않았고 커밋·스테이지·푸시도 하지 않았다.

`listQuickCreateUnits`의 본문 전량 전송·JS 중복 제거를 SQL 대표행 선택·집계로 옮겼다.
중2 1학기 서버 reader 최종 실측 중앙값은 **686.961 → 280.844ms(59.1% 감소)**,
문항 조회 결과는 **14,122행 / 5,616,199B → 99행 / 11,217B(99.8% 감소)**였다.
실제 DB의 초3~중3 14개 학년·학기 응답은 전후 바이트가 모두 같았다.
브리프의 브라우저 5,393ms와 아래 서버 reader 시간은 측정 경계가 다르다.

## 변경과 동등성

- `src/lib/textbook/server/quickCreate.ts`: 단원 조회·학기 선별·단원 순서·`problemCount`·`conceptCount`·응답 조립은 유지하고 availability 계산만 새 helper로 위임했다. 제작 writer는 변경하지 않았다.
- `src/lib/textbook/server/quickCreate/availability.ts`: 기존 자격 조건 그대로 읽고 단원·난도 묶음·정규화한 본문마다 첫 행을 SQL에서 고른 뒤 집계한다. 난도 집합은 기존 `QUICK_CREATE_DIFFICULTIES`에서 JSON 인자로 전달한다.
- `actual_format`은 5051fea68과 `brief-question-format-column-code-r2-codex.md`의 규칙대로 **현재 버전 + non-NULL**을 신뢰한다. `unknown`도 저장된 정상 값이다. NULL·다른 버전·입력 수정으로 트리거가 무효화한 대표행만 본문·답안과 함께 가져와 기존 `classifyFormat`을 호출한다. digest를 읽기마다 재계산하거나 fact를 채우는 쓰기는 추가하지 않았다. digest 대응은 기존 무효화 트리거와 별도 감사 도구가 소유한다.
- SQL `btrim`에 ECMAScript `trim()`의 공백·개행 문자 25개를 명시했다. 기본 SQL trim이 놓치는 NBSP·BOM·전각 공백 등을 제거하고 U+0085/U+180E/U+200B는 보존한다. 내부 공백은 바꾸지 않는다.
- 본문 전체를 `COLLATE "C"`로 비교한다. md5만으로 중복을 판정하지 않으므로 해시 충돌이나 Unicode 정규화로 서로 다른 본문을 합치지 않는다.
- 원래 SELECT가 내는 첫 등장 위치를 `row_number() OVER ()`로 먼저 캡처하고, 난도별 중복의 그 대표행만 `written`에 쓴다. `bool_or`나 ID 최솟값으로 다른 중복의 형식을 섞지 않는다. 기존 SELECT에는 ORDER BY가 없으므로 ID·삽입 순서를 새 계약으로 만들지 않았다. 이번 PGlite 및 공유 DB 전수 비교에서 기존 스캔과 결과가 일치했다.
- `scripts/qa/sweep-20261020/quickCreate.ts`: 변경 전 reader를 독립 함수로 보존하고, `runQuickCreateMeasurement({ db: tx, sql })`를 export한다. 공유 DB 측정은 READ ONLY를 확인하고 SELECT/읽기 CTE만 통과시키며 모든 execute를 거부한다. 결과에는 시간·행 수·JSON 바이트 수·응답 해시만 남긴다.
- `src/__tests__/unit/textbookQuickCreateAvailability.test.ts`: 실제 API GET의 전체 응답 문자열을 변경 전 reader 결과와 14개 범위에서 비교한다. 난도 중첩, 서로 다른 형식의 중복, 빈 본문, 공백만 있는 본문, 조합/분해 Unicode, 자격 탈락 행, NULL/구버전/트리거 무효화 fact, 정상 unknown, 읽기 전용 가드를 포함한다.

## 공유 DB 최종 3회 실측

실행 시각 `2026-10-20T05:04:22.543Z`(한국 14:04).
`RepeatableRead` 한 거래에서 **먼저 `SET TRANSACTION READ ONLY`**를 실행하고
`current_setting('transaction_read_only') = 'on'`을 확인했다.
그 뒤 SELECT와 읽기 CTE만 실행했다. 두 번째 쌍은 후→전 순서로 바꾸었다.
별도 프로세스 캐시는 없으며 각 쌍에서 실제 두 reader를 모두 실행했다.

| 회차 | 순서 | 전 reader ms | 후 reader ms | 전/후 응답 바이트 일치 |
|---|---|---:|---:|---|
| 1 | 전→후 | 610.409 | 296.971 | 일치 |
| 2 | 후→전 | 829.316 | 280.844 | 일치 |
| 3 | 전→후 | 686.961 | 266.759 | 일치 |
| 중앙값 | | **686.961** | **280.844** | **3/3** |

모든 응답은 11,275바이트, SHA-256
`08cc7e0689308ce5e9649eed4696fbd70f52f5ceb1985f188fc31d729e9762ba`였다.

| 회차 | 전 단원 SQL ms | 전 문항 SQL ms | 후 단원 SQL ms | 후 집계 SQL ms |
|---|---:|---:|---:|---:|
| 1 | 68.729 | 229.258 | 95.031 | 201.588 |
| 2 | 94.777 | 220.835 | 68.250 | 212.467 |
| 3 | 65.478 | 206.017 | 64.481 | 202.097 |

단원 조회 결과는 전후 모두 56행 / 9,501B였다. 문항 쿼리 결과는 위 세 회차 모두
전 14,122행 / 5,616,199B, 후 99행 / 11,217B이며 fallback 본문은 0개였다.
후자의 99행은 단원별 난도 묶음 집계행이다.

시간은 서버 catalog reader와 DB 왕복·결과 변환을 포함하고, 거래 시작/종료·인증·HTTP·Next 컴파일·모듈 초기 적재·브라우저 렌더링·최종 응답 스키마 검증은 제외한다.
쿼리 결과 바이트는 UTF-8 JSON 직렬화 크기이며 PostgreSQL wire 크기는 아니다.
증거용 쿼리 결과 직렬화는 reader 타이머를 멈춘 뒤 실행한다.
초기 탐색 측정에는 그 계측 비용이 섞였으므로 위 표는 이를 제외하도록 보정한 최종 3회만 사용했다.

## 실제 DB 전수 응답 대조

`2026-10-20T05:03:43.558Z`, 별도 RepeatableRead + READ ONLY 거래.
같은 helper를 범위마다 `rounds: 1`로 호출하고 응답 문자열 전체를 대조했다.
모든 범위에서 fallback은 0개였다. 이 표는 추가 동등성 증거이며 위 3회 성능 표와 별개다.

| 범위 | 응답 B | 전 문항 결과 행 | 후 집계 결과 행 | 전체 바이트 일치 |
|---|---:|---:|---:|---|
| 초3 1학기 | 11,340 | 6,795 | 93 | 일치 |
| 초3 2학기 | 8,753 | 5,900 | 75 | 일치 |
| 초4 1학기 | 11,356 | 7,495 | 96 | 일치 |
| 초4 2학기 | 10,613 | 6,197 | 90 | 일치 |
| 초5 1학기 | 9,825 | 6,409 | 78 | 일치 |
| 초5 2학기 | 11,222 | 7,767 | 90 | 일치 |
| 초6 1학기 | 10,349 | 6,406 | 81 | 일치 |
| 초6 2학기 | 11,285 | 7,269 | 87 | 일치 |
| 중1 1학기 | 9,645 | 14,921 | 84 | 일치 |
| 중1 2학기 | 7,508 | 8,745 | 72 | 일치 |
| 중2 1학기 | 11,275 | 14,122 | 99 | 일치 |
| 중2 2학기 | 7,948 | 9,279 | 69 | 일치 |
| 중3 1학기 | 4,224 | 4,616 | 35 | 일치 |
| 중3 2학기 | 3,088 | 3,282 | 30 | 일치 |

## 시험과 정적 검사

```sh
node_modules/.bin/vitest run \
  src/__tests__/unit/textbookQuickCreateAvailability.test.ts \
  src/__tests__/unit/textbookQuickCreate.test.ts \
  src/__tests__/api/textbookQuickCreateRoute.test.ts \
  src/__tests__/api/textbookQuickCreateIntegration.test.ts
npm run type-check
node_modules/.bin/eslint src/lib/textbook/server/quickCreate.ts \
  src/lib/textbook/server/quickCreate/availability.ts \
  src/__tests__/unit/textbookQuickCreateAvailability.test.ts \
  scripts/qa/sweep-20261020/quickCreate.ts
npm run lint:affordance
git diff --check
```

4개 시험 파일 **97 통과 / 2 건너뜀**. 기존 `textbookQuickCreate.test.ts`의 전체 마이그레이션 PGlite 시험을 포함한다.
새 시험은 19개이며, 기존 integration의 건너뛴 2개는 `TEXTBOOK_PDF_TEST=1`일 때만 실행하는 실제 PDF 발행 시험이다.
type-check·변경 파일 eslint·affordance·diff 공백 검사가 통과했다.
계측 직렬화를 타이머 밖으로 옮긴 뒤 새 19개 시험·type-check·변경 eslint를 다시 실행했다.

## README — root 통합 측정 스크립트에서 호출

허용된 편집 범위에 별도 README가 없어 이 절을 root 소유 통합 README로 옮길 수 있게 남긴다.
helper는 Prisma client를 생성하거나 거래를 새로 열지 않는다. `db`와 `sql`은 **같은 거래**를 가리켜야 한다.
기본 범위는 중2 1학기이며 `scope`, `rounds`를 선택 인자로 받는다.

```ts
import { runQuickCreateMeasurement } from "./sweep-20261020/quickCreate";
import type { TextbookSql } from "../../src/lib/textbook/server/sql";

// db는 root가 소유하는 PrismaClient다.
const quickCreate = await db.$transaction(async (tx) => {
  await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
  const sql: TextbookSql = {
    query: <T>(text: string, params = []) =>
      tx.$queryRawUnsafe<T[]>(text, ...params),
    execute: async () => { throw new Error("READ_ONLY_GUARD"); },
  };
  return runQuickCreateMeasurement({ db: tx, sql });
}, { isolationLevel: "RepeatableRead", timeout: 180_000, maxWait: 10_000 });
// quickCreate에는 시간·행 수·크기·해시만 있고 원문/답안/ID는 없다.
```

독립 실행은 아래와 같다. `.env`의 내용은 출력하지 않는다.

```sh
node_modules/.bin/tsx --conditions=react-server \
  --env-file=/Users/pss/Desktop/creative/today_/.env \
  scripts/qa/sweep-20261020/quickCreate.ts
```

`listQuickCreateUnitsBefore(sql, scope)`도 export하므로 root가 다른 집계와 같은 거래에서 별도로 비교할 수 있다.
전수 대조는 위 호출의 `scope`를 초3~초6·중1~중3, 학기 1/2로 순회하고 `rounds: 1`을 지정한다.

## 한계와 인계

실제 DB 측정 시 현재 fact가 모두 유효해 운영 fallback의 지연은 재지 못했다. NULL·구버전·트리거 무효화 후 fallback은 로컬 PGlite에서 검증했다.
중복의 «첫 행»은 기존 무정렬 SELECT의 스캔 순서다. 향후 DB 계획·물리 배치 변화가 기존 reader의 첫 행도 바꿀 수 있다는 기존 한계는 남으며, 임의의 ID 정렬로 의미를 변경하지 않았다.
실제 HTTP·로그인·브라우저 Resource Timing의 재측정과 root 측정 스크립트/README 통합은 코디네이터 소유다.
프로세스 캐시·인덱스·스키마 변경은 없다. 공유 DB 쓰기·학생 흐름 실행·외부 게시도 하지 않았다.
`node_modules`는 요청된 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크이며 Git 추적·스테이지 대상에 넣지 않았다.
위 5개 파일을 미커밋 상태로 보존해 코디네이터가 현재 task worktree로 복사할 수 있게 남긴다.
