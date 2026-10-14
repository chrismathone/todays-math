# 사용 순위 라벨 (2026-10-14)

읽기 전용. 새 표·마이그레이션·배포·푸시는 없다. 화면과 `src/lib/arithmeticPresentation.ts` 는 루트가 붙인다.

## 계약

`src/contracts/usageLabels.contract.ts` (`contractVersion` 1).

- `POST /api/studio/problems/labels`
- `POST /api/dev/unified/problems/labels` ( `NODE_ENV === "development"` 가 아니면 404, 그다음 같은 `authorizeStudio` )

본문은 strict 이다. `problemIds` 와 `arithmeticTypes` 는 각각 최대 100개. `period` 는 `30d`(기본) 또는 `all`. 중복 문항·정규화 뒤 같은 연산 유형은 400 이고 DB 를 읽지 않는다. 관문은 로그인, 문제은행 메뉴, 같은 사이트 POST. 검수 계정은 기존 규칙대로 403.

루트가 유형 동일성에 쓸 함수는 `arithmeticUsageTypeKey` (`src/lib/usageLabels/typeKey.ts`, 배럴 `src/lib/usageLabels/index.ts`). 시드·문항 수·순서는 키에 없다. 곱셈구구의 단 순서가 달라도 같은 키다. 저장된 학습지를 셀 때는 그 스냅샷의 `catalogVersion` 을 넘긴다.

## 내 출제

범위 코드는 `owner-confirmed-printed-tests` 이다. 처음 얼린 `accessible-confirmed-printed-tests` 는 쓰지 않는다.

세는 행은 `Test.userId` 가 현재 사용자이고 `status` 가 `confirmed` 또는 `printed` 인 시험뿐이다. 초안은 뺀다. 미리보기와 새로고침은 시험 상태가 아니므로 세지 않는다. 반·지점으로 열람할 수 있는 다른 교사의 시험도 뺀다. `accessibleTestsWhere` 를 부르지 않는다.

문항은 그 시험들에 연결된 `TestProblem` 의 서로 다른 `testId` 개수다. 같은 시험에 두 줄이 있어도 한 번이다. 순위 모집단은 요청 목록이 아니라, 같은 차시(`Unit.section`)에서 그렇게 쓰인 자격 문항 전체다. 자격은 기존 출제 자격(공유 풀, 승인, 바로 출제, 답 있음)이다. 공유가 아니거나 행이 없으면 `unknown`(횟수 null). 보이지만 자격이 없으면 `ineligible`. 자격은 있는데 이 기간에 안 쓰였으면 `zero`(횟수 0). 집계가 상한에 걸리거나 쓰인 문항 행을 못 읽으면 그 요청 쪽 전체가 `unavailable` 이다. 없는 순위를 만들지 않는다.

라벨은 `내 출제 N위`, 동점이면 `내 출제 공동 N위`. 툴팁은 `차시 {section} · {기간} · {횟수}회`. 차시를 유형이라고 부르지 않는다.

## 내 학습지 사용

범위 코드는 `owner-arithmetic-sheets`. `Problem` 과 `Test` 는 읽지 않는다.

`WorkspaceDocument.userId` 가 현재 사용자이고 `kind` 가 `arithmeticSheet` 인 행만 본다. `reopenArithmeticSheet` 가 거부하는 스냅샷은 건너뛴다. 한 문서 안에서 같은 유형이 여러 라운드에 있어도 한 번이다. 문서를 고쳐 저장해도 문서는 하나다(기간은 `createdAt`). 모집단은 연산 기호(`+`, `-`, `×`, `÷`)가 같은 유형 전체다. 한 자리 덧셈과 두 자리 세로 덧셈은 같은 `+` 모집단이다.

라벨은 `내 학습지 사용 N위`, 동점이면 `내 학습지 사용 공동 N위`. 툴팁은 `연산 {기호} · {기간} · {장수}장`.

## 사본

스키마에 `sourceDocumentId` 칸은 없다. 사본은 둘 중 하나로 뺀다.

- `AccountAuditLog` `action = material.copied` 의 `details.documentId` (복사로 생긴 문서)
- 페이로드 필드 `sourceDocumentId` 가 비어 있지 않은 문자열

표식이 없는 똑같은 원본 두 장은 두 번으로 센다. 내용 해시를 합치지 않는다. 감사 로그도 없고 페이로드 표식도 없는 사본은 원본과 구분하지 못한다. 감사 로그는 이 사용자의 행만 보고, 상한을 넘으면 학습지 쪽은 `unavailable` 이다.

## 기간과 이력

지금 남아 있는 행만 센다. 지워진 시험·학습지는 없다. 기간은 `createdAt` 이고 기준 시각은 응답의 `observedAt` 이다. `30d` 는 그 시각에서 30×24시간. `all` 은 보유 중인 행 전부이며 `createdAt <= observedAt` 이다. 응답 `period.history` 는 `not-an-event-log`, `basis` 는 `retained-created-at` 이다. 전체 출제 이력이라고 말하지 않는다. 기간 문구는 `최근 30일` 또는 `보유 중인 기록` 이다.

## 순위 문

후보마다 서로 다른 시험 또는 원본 문서가 5개 이상이고, 그 모집단의 관측 후보(횟수 > 0)가 2개 이상일 때만 순위를 낸다. 모자라면 `unranked` (`below-minimum` 또는 `sparse-population`)이고 횟수는 보여 주되 순위는 null 이다. 0회는 `zero` 이며 관측 후보가 아니다.

동점은 경쟁 순위다. 순위는 1 + 더 많은 후보의 수. 1위가 둘이이면 다음은 3위다. 10위까지만 숫자를 낸다. 11위부터는 `outside-top`, 순위 null. 11위라는 라벨은 없다. 1위에 여럿이 묶여 경쟁 순위가 10 이하면 라벨이 10개를 넘을 수 있다. 최소 횟수에 못 미친 후보도 모집단에 남아서 뒤 후보의 경쟁 순위를 밀어 올린다. 요청에 없는 형제 문항·유형도 모집단에 들어간다.

## 상한

시험을 2,001건, 연결을 20,001건, 학습지를 2,001건, 복사 감사 행을 2,001건 읽으면 그 쪽은 `unavailable` 이고 더 읽지 않는다. 정확히 2,000건이면 집계는 끝난 것이다. 본문은 64KB. 한쪽이 실패해도 다른 쪽은 계산한다. 응답이 계약을 통과하지 못하면 503 이다.

## 루트·저장이 아직 가진 것

화면 라벨, `arithmeticPresentation.ts`, `arithmeticSheet` CHECK 확장, 저장·목록·다시 열기, 인쇄. 이 읽기는 그 행이 있을 때만 센다. 행이 없으면 순위는 `zero` 또는 빈 배열이지, 지어낸 순위가 아니다.
