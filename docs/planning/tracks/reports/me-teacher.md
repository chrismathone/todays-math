# me-teacher — 개념 카드(탐험) 기록을 교사에게: 투영 · 계약 · 끝점 둘

가지 `chrismathone/me-teacher`(로컬 main `e0e0d2100` 에서 갈림) · 2026-10-01 · **main 병합 안 함** · 화면 없음 · DB 없음 · 학생 쪽 변경 없음

브리프 `docs/planning/tracks/briefs/me-teacher.md` · 계획 `docs/planning/27-explorers-teacher-visibility.md` §4 공백 1 · 2 · 4 ·
사유 문턱은 **v1.1**(main 의 `tracks/reports/consult-27/consensus.md` §1.2 — 작업 중에 리드가 보내 옴).

## 0. 한눈에

| | |
| --- | --- |
| 새로 선 것 | 순수 투영 하나 · strict 계약 하나 · GET 끝점 둘 |
| 저장 · 마이그레이션 · 새 Prisma 질의 | **0** — 명단과 기록은 기존 읽기로만(기존 질의 둘의 계정 select 에 `createdAt` 한 칸) |
| 학생 화면 · 저장 꼴 · 교사 화면(컴포넌트) | 안 건드림 |
| 문항 글 · 보기 · 학생이 고른 답 | 응답에 **없다**(D-141 ⑵) — 계약이 strict, 키 이름 · 실제 카드 문장 둘 다로 잠금 |
| `mathSrsRecordIsolation` 허용 목록(`ALLOWED`) | **그대로** — 넓히지 않았다. 기록 모듈 목록(`RECORD_MODULES`)에 한 줄을 **더해 조였다**(§5) |
| 도움 사유 | **두 목록**(학습 개입 5 · 운영 확인 2) · 정책 판 **2** · 문턱 열 개가 이름 붙은 상수 |
| 🔴 합의문과 글자가 다른 곳 하나 | «최근 복습에서 막힘»에 **날짜 조건**을 더했다(§2.2) — 없으면 새 단원을 배운 날마다 선다 |
| 🔴 검증 상태 | 새 시험 5파일 69개는 **커밋한 코드에서 초록**. 기존 시험 23파일 · eslint 는 v1 코드에서만 돌렸고, 다시 돌리던 실행과 변이 검증은 **메모리 부족으로 멈췄다**(§4.3). 타입은 아무도 안 봤다 |
| 전체 타입 검사 · 빌드 · e2e | **안 돌렸다**(브리프) — 리드가 병합 뒤 main 에서 |
| 27번 문서 | 내 가지에서는 **안 고쳤다** — main 에서 리드가 §4.2 를 v1.1 로 이미 고쳐 놓아서(같은 줄을 고치면 부딪힌다) |

## 1. 만든 것

| 파일 | 무엇 |
| --- | --- |
| `src/lib/math-explorers/teacherSummary.ts` | 순수 투영 — `explorerTeacherDetail` · `explorerTeacherSummary` · `expeditionTileDates` + 문턱 상수 · `TEACHER_FLAG_POLICY = 2` |
| `src/contracts/mathExplorersTeacher.contract.ts` | strict Zod — 반 응답(카드 목록 없음) · 학생 응답(카드 목록 포함) · 사유 두 목록 |
| `src/lib/math-explorers/teacherRoutes.ts` | 처리기 둘(`server-only`) |
| `src/app/api/classes/[id]/math-srs/explorers/route.ts` | `GET` · `withErrorLog` · `noStore` |
| `src/app/api/students/[id]/math-srs/explorers/route.ts` | `GET` · `withErrorLog` · `noStore` |

기존 파일에서 고친 것(다섯 — 전부 작다):

| 파일 | 무엇 · 왜 |
| --- | --- |
| `src/lib/math-srs/serverContext.ts` | `loadSrsClassDashboard` 안의 «명단 + 기록 읽기»를 `loadSrsClassRoster(classId)` 로 **꺼냈다**(where · 차례 글자 그대로). 반 복습 현황과 탐험 교사 보기가 같은 길로 읽는다 — 브리프 «새 Prisma 질의를 손으로 짓지 않는다». 계정 select 에 `createdAt` |
| `src/lib/math-srs/courseServer.ts` | `studentInclude` 의 계정 select 에 `createdAt` 한 칸(«시작 전»의 3일 — §2.3) |
| `src/lib/math-srs/courseTeacherRoutes.ts` | `teacherGate` 에 `export` 한 낱말 + 주석 한 줄 — 학생 끝점이 **같은 함수**를 지난다(«문지기는 …/course 와 같게») |
| `src/lib/accountRouteAccess.ts` | 한 줄 — `/api/students/{id}/math-srs/explorers` 는 `GET` · `srs` 메뉴. 안 적으면 `/api/students` 줄에 걸려 «수업» 메뉴로 열린다(옆 `…/course` 와 메뉴가 갈린다) |
| `src/__tests__/unit/mathSrsRecordIsolation.test.ts` | `RECORD_MODULES` 에 `math-explorers/teacherRoutes` 한 줄(조임 — §5) |

⚠️ `me-ops` 트랙도 `courseTeacherRoutes.ts` 를 만진다 — 내 쪽은 30행 언저리 두 줄뿐이라 같은 줄을 안 고쳤으면 그냥 합쳐진다.

### 1.1 문지기

| 끝점 | 계정 관문 | 역할 | 소유 범위 |
| --- | --- | --- | --- |
| `GET /api/classes/{id}/math-srs/explorers` | `accountRouteAllowed` — «수업 · 학생 관리» 메뉴(`/api/classes` 줄) | 검수 계정 거절 | `requireOwnedClass` |
| `GET /api/students/{id}/math-srs/explorers` | `accountRouteAllowed` + `srs` 메뉴(`teacherGate` — 옆 끝점과 같은 함수) | 검수 계정 거절 | `requireOwnedStudent` |

«같게»는 **짝 시험**으로 잠갔다: 세션 열두 가지(승인 대기 · 메뉴 없음 · 다른 메뉴만 · 검수 · 다른 소유자 · 다른 지점 관리자 · 지점이 빈 관리자 ·
제 것 · 제 메뉴만 · 같은 지점 관리자 · 메뉴 없는 같은 지점 관리자 · 최고관리자)를 **옛 끝점과 새 끝점에 같이** 넣어 상태 코드를 견준다.
옛 끝점의 문지기가 바뀌면 새 끝점 시험이 같이 빨개진다.

반 끝점의 문지기는 옛 `route.ts` 안에 글자로 적혀 있어(내보낸 함수가 없다) 같은 여덟 줄을 옮겨 적었다 — 옛 라우트는 안 건드렸다.

## 2. 도움 사유 — v1.1 · 정책 판 2

전부 이미 저장된 기록에서 읽는다. 문턱은 `teacherSummary.ts` 의 이름 붙은 상수이고 응답에 `policy` 로 판 번호가 실린다.
**값을 바꾸면 `TEACHER_FLAG_POLICY` 도 올린다** — 시험 하나가 판 번호와 값 열 개를 한 덩어리로 잠근다.
안 · 밖 시험은 상수를 읽어 날짜를 만들므로 값이 바뀌어도 따라간다.

목록이 **둘**이다 — 응답에서도 칸이 둘(`learningFlags` · `operationFlags`)이고 계약이 서로의 코드를 거절한다(한 순위로 못 합친다).

**학습 개입**(`learningFlags` — 배열 차례가 곧 차례) · 칸은 `{ code, value, date, cards: [{ id, name }] }`

| 차례 | 코드 | 뜻 | 조건 | 상수 · 값 | `value` · `date` · `cards` |
| --- | --- | --- | --- | --- | --- |
| 1 | `unresolved` | 미해결을 남기고 끝냄 | **가장 최근 세션**(이력의 마지막 줄 — 이력에 아직 없는 끝난 세션이면 그 세션)의 미해결 ≥ 1 이고 그 세션이 최근 7일 안 | `UNRESOLVED_FLAG_MIN = 1` · `UNRESOLVED_RECENT_DAYS = 7` | 남은 활동 수 · 그 세션의 날 · `missed ≥ 1` 인 카드 |
| 2 | `review-stuck` | 최근 복습에서 막힘 | `level ≥ 1` · `lastRecall = "retry"` · **`reviewedAt > lastDate`** 인 카드가 2장 이상 | `REVIEW_STUCK_FLAG_CARDS = 2` | 카드 수 · 가장 늦은 `reviewedAt` · 그 카드들 |
| 3 | `overdue` | 복습이 밀림 | 3일 이상 밀린 카드 3장 이상, **또는** 7일 이상 밀린 카드 1장 이상 | `OVERDUE_FLAG_DAYS = 3` · `OVERDUE_FLAG_CARDS = 3` · `OVERDUE_LONG_FLAG_DAYS = 7` | 가장 오래 밀린 날 수 · 그 만기 · 3일 이상 밀린 카드(오래 밀린 순) |
| 4 | `carried-over` | 임무가 날을 넘김 | 열린 세션을 시작한 날이 2일 이상 전 | `CARRIED_OVER_FLAG_DAYS = 2` | 넘긴 날 수 · 시작 날 · — |
| 5 | `idle` | 오래 쉼 | 끝낸 날이 있는 학생의 **마지막으로 칸을 얻은 날**이 7일 이상 전 | `IDLE_FLAG_DAYS = 7` | 쉰 날 수 · 그 날 · — |

**운영 확인**(`operationFlags` — 많아야 하나) · 칸은 `{ code, value, date }`

| 코드 | 뜻 | 조건 | 상수 · 값 | `value` · `date` |
| --- | --- | --- | --- | --- |
| `not-started` | 시작 전 | 계정이 있고 탐험 기록(`payload.explorers`)이 없고, 계정을 만든 지 3일 이상(만든 날을 모르면 바로) | `NOT_STARTED_GRACE_DAYS = 3` | 계정을 만든 뒤 지난 날 수 · 만든 날(KST) |
| `no-account` | 계정 없음 | 학생 행의 `studentAccount` 가 없거나 꺼짐 — «시작 전»을 대신한다 | — | null · null |

세부(합의문이 글로 안 정한 것 — 내가 정했다):

- **«최근 7일 안»은 오늘을 0 으로 세어 6까지**다(`< 7`). «오래 쉼»의 «7일 이상»(`≥ 7`)과 맞물려, 어느 날짜든 둘 가운데 한쪽에만 든다.
- **`missed` 는 조건에 안 쓴다**(합의 — 반복의 증거가 아니다). `unresolved` 사유가 «어느 카드가 남았나»를 고를 때만 읽고, 값은 학생 상세의 카드 줄에 그대로 실린다.
- **만기는 학생 화면과 같은 함수**(`definitionEffectiveDue` · `definitionDue` — 뜻을 고친 카드의 앞당긴 판 날 포함, D-143 ⑦). 시험이 네 날짜에서 둘을 견준다.
- **지난 칸 다시 풀기(`reviewOnly`)는 열린 임무가 아니다.**
- **탐험은 시작 전인데 옛 기록에서 들여온 날(`legacyDays`)이 있는 학생**은 두 목록에 따로 선다(`idle` + `not-started`).
- **계정이 꺼진 학생에게도 학습 사유는 기록대로 선다** — 목록이 갈려 있으니 화면이 고른다.

### 2.1 리드에게 물은 것 하나 → «오래 쉼»은 칸을 얻은 마지막 날로

`StoredExplorer.completedDays` 에는 개념 세션을 끝낸 날만 들어간다(`engine.ts:274-289`). 은행 날의 칸은 `state.expedition.awards` 에만 남는다.
브리프 글자 그대로면 은행 날이 이어지는 학생(D-144 조사 — 30일 중 은행 날 20~23)은 매일 학습해도 «오래 쉼»이 선다.
리드: *«거짓 경보는 가드를 끈다 … 칸 날짜와 completedDays 가운데 늦은 날»*. 그래서 투영의 입력이 `{ explorers, expedition }` 두 칸이 됐다
(둘 다 학생 기록 한 줄 안 — 새 읽기 없음). 응답의 `lastCompletedDate` 도 그 값이다.

### 2.2 🔴 합의문과 글자가 다른 곳 — «최근 복습에서 막힘»의 날짜 조건

합의문 §1.2 의 조건은 «`level ≥ 1` 이고 `lastRecall = retry` 인 카드 2장 이상»이다. 엔진을 돌려 보니 이 둘만으로는 **복습과 처음 배움이 안 갈린다**:
처음 배우며 첫 시도를 틀리고 재도전으로 푼 카드도 그날 `level 1` · `lastRecall "retry"` 가 된다(`definition-cards.ts:878-886`).
새 단원은 새 카드 다섯 장이라, 두 장의 첫 시도를 틀리는 것은 흔하다 — 글자 그대로면 **새 단원을 배운 날마다** «복습에서 막힘»이 선다.
(합의가 v1 을 버린 까닭 — «너무 많이 울린다» — 과 같은 자리다.)

저장된 값으로 갈린다 — **날짜**로. 레벨이 오른 마지막 날(`lastDate`)과 기억을 잰 날(`reviewedAt`)이

| 경우 | `lastDate` | `reviewedAt` | 사유 |
| --- | --- | --- | --- |
| 처음 배운 날 틀리고 재도전으로 풂 | 그날 | 그날 | 안 센다 |
| 처음에 미해결을 남기고, 다른 날 다시 풀어 모음 | 다시 푼 날 | 다시 푼 날 | 안 센다 |
| 모은 **뒤의** 복습에서 첫 시도를 틀림 | 그대로(앞 날) | 복습한 날 | **센다** |
| 그 뒤 복습에서 기억함 | — | — | `lastRecall = "remembered"` — 빠진다 |

네 줄 전부 엔진을 돌린 시험이 본 값이다. 못 가르는 자리 하나: 모은 **그날** 다시 풀다 틀린 것(`reviewedAt = lastDate` — 처음 배운 것으로 친다).
이 조건을 합의문 글자로 되돌리는 변이를 걸어 볼 참이었는데 못 돌렸다(§4.1).

**리드가 정할 것**: 이대로 두려면 main 의 27번 문서 §4.2 차례 2 «읽는 곳»에 `reviewedAt > lastDate` 를 적어 주면 된다. 합의문 글자가 맞다면
`teacherSummary.ts` 의 그 한 줄(`(progress.reviewedAt ?? "") > progress.lastDate`)을 지우고 시험 «🔴 새 단원에서 첫 시도를 틀린 것은 복습이 아니다»를 뒤집는다.
이름의 «최근»은 조건에 없다(합의문에도 창이 없다) — 복습에서 틀린 채로 오래 안 온 학생은 `idle` · `overdue` 와 같이 계속 선다.

### 2.3 «시작 전»의 3일 — 새 질의 없이

합의: «계정 만든 날을 이미 읽는 자료로 알 수 있으면 3일 뒤부터 — 새 질의를 더해야 하면 조건 없이». 명단을 읽는 기존 질의 둘이 계정을
`select: { id, disabledAt }` 로 읽고 있어서 **질의를 더하지 않고 select 에 `createdAt` 한 칸**을 더했다(`loadSrsClassRoster` · `courseServer.studentInclude`).
만든 날은 KST 날짜로 센다(시험: KST 10-03 01:00 에 만든 계정 — UTC 로 세면 하루 어긋나 선다).
칸을 더한 것이 «이미 읽는 자료»의 뜻을 넘는다고 보면 그 두 줄과 `accountFacts` 의 `createdOn` 을 null 로 돌리면 «조건 없이»가 된다.

## 3. 응답 꼴 (가짜 학생)

아래 두 덩어리는 `mathExplorersTeacherContract.test.ts` 의 «보고서에 실은 예시 꼴이 계약을 지난다»가 그대로 계약에 넣어 본 값이다.

`GET /api/classes/{id}/math-srs/explorers` — 학생마다 요약(카드 목록 없음). 기록 없는 학생도 줄에 나오고, 탈퇴 학생은 빠진다.

```json
{
  "data": {
    "class": { "id": "7e7c388b-c264-4d39-809b-527723b8b74b", "name": "중1 A" },
    "today": "2026-10-01",
    "policy": 2,
    "students": [
      {
        "id": "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
        "name": "가짜 학생",
        "hasAccount": true,
        "summary": {
          "started": true,
          "collected": 4,
          "total": 230,
          "units": [
            { "id": "factors", "title": "소인수분해", "grade": 7, "collected": 4, "total": 5 }
          ],
          "dueToday": 1,
          "overdue": { "cards": 1, "maxDays": 2 },
          "recentSessions": [
            {
              "date": "2026-10-01",
              "route": "unit",
              "unitId": "factors",
              "unitTitle": "소인수분해",
              "targetCardName": null,
              "first": 12,
              "total": 15,
              "unresolved": 3,
              "stars": 4
            }
          ],
          "openSession": {
            "startedOn": "2026-10-01",
            "route": "unit",
            "unitId": "factors",
            "unitTitle": "소인수분해",
            "status": "retry",
            "solved": 12,
            "total": 15,
            "round": 3,
            "continuation": 0,
            "unresolved": 3
          },
          "lastCompletedDate": null,
          "learningFlags": [
            {
              "code": "unresolved",
              "value": 3,
              "date": "2026-10-01",
              "cards": [{ "id": "prime", "name": "소수" }]
            }
          ],
          "operationFlags": []
        }
      }
    ]
  }
}
```

기록이 없는 학생의 줄은 숫자가 전부 0 이고 운영 확인만 선다 — `"operationFlags": [{ "code": "not-started", "value": 65, "date": "2026-08-01" }]`,
계정이 없으면 `[{ "code": "no-account", "value": null, "date": null }]`.

`GET /api/students/{id}/math-srs/explorers` — 한 명의 상세. `detail` 은 위 `summary` 와 같은 칸 + `cards`.

```json
{
  "data": {
    "student": {
      "id": "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
      "name": "가짜 학생",
      "classId": "7e7c388b-c264-4d39-809b-527723b8b74b",
      "className": "중1 A",
      "hasAccount": true
    },
    "today": "2026-10-01",
    "policy": 2,
    "detail": {
      "…": "summary 와 같은 칸",
      "cards": [
        {
          "id": "prime",
          "name": "소수",
          "unitId": "factors",
          "unitTitle": "소인수분해",
          "grade": 7,
          "level": 0,
          "due": "2026-10-02",
          "lastRecall": "retry",
          "missed": 3,
          "reviewStep": 0,
          "overdueDays": 0
        }
      ]
    }
  }
}
```

칸의 뜻에서 헷갈리기 쉬운 것:

- `units` — 카드 기록이 **하나라도 있는** 단원만(학년 순). 46단원 전부가 아니다.
- `dueToday` — 만기 ≤ 오늘(밀린 것 포함). `overdue.cards` 는 만기 < 오늘, `maxDays` 는 그 가운데 가장 오래 밀린 날 수.
- `recentSessions` — 이력 끝에서 10건, **최근 것부터**. `first` 는 첫 시도 정답 수(재도전은 안 올린다).
- `openSession.status` — `active` 풀고 있음(«남은 문제 다시 풀기» 중 포함) · `retry` 끝냈지만 미해결이 남음. `continuation` 은 «남은 문제 다시 풀기»를 연 횟수(합의 안건 4 의 상한이 읽을 값).
- `lastCompletedDate` — §2.1 의 «칸을 얻은 마지막 날».
- `missed` — 마지막 세션이 끝났을 때 그 카드에 남은 활동 수(0~3). 세션을 걸친 반복의 수가 아니다.
- `lastRecall` — 옛 기록이라 칸이 없으면 `null`.
- 오류: 401 로그인 없음 · 403 권한/소유 범위 밖 · 404 없는 반/학생 · **탈퇴 학생** · 400 식별자 꼴 · 503 저장소 없음/기록이 깨짐/다른 학생의 기록이 앉아 있음
  (빈 기록으로 꾸미지 않는다 — 기존 반 현황과 같다).

## 4. 시험

전부 파일 이름을 적어 `--pool=threads --maxWorkers=1` 로, 공용 잠금(`cb-verify.lock`)을 쥐고 돌렸다.

🔴 **먼저 읽을 것 — 검증이 다 끝나지 않았다.** 새 시험 다섯 파일은 **커밋한 코드**(`3e64ab6dd`)에서 초록이다. 기존 시험 23파일 · eslint 는
v1(문턱 v1.1 을 받기 전) 코드에서만 돌렸고, v1.1 로 고친 뒤 다시 돌리려던 실행과 변이 검증은 **기계 메모리 부족으로 멈췄다**(§4.3).

**커밋한 코드에서 돌린 것** — 5 파일 · 69 시험 · 전부 초록(01:14 · 34.8초)

| 파일 | 시험 | 무엇 |
| --- | --- | --- |
| `unit/mathExplorersTeacherSummary.test.ts` | 30 | 투영 — 사유마다 문턱 바로 안 · 밖(날 수 · 장수) · KST 자정 앞뒤 · 기록 없음 · 열린 세션 · 재도전 연장 · 지난 칸 다시 풀기 · 은행 날의 칸 · 운영 확인의 3일 · 학생 화면과 같은 만기 · 문항 글이 안 나감(카드 230장의 문장 900여 개를 응답 글에서 찾는다) · 정책 판과 값 열 개 |
| `unit/mathExplorersTeacherContract.test.ts` | 7 | 계약 — 키 이름 32개(문항 글 · 보기 · 답 · 풀이 · 낸 답)가 응답 꼴에 없다 · 열 층 어디에 끼워도 거절 · 반 응답에 카드 목록 없음 · 두 목록이 안 섞임 · 보고서의 예시 꼴 |
| `api/mathExplorersTeacherRoutes.test.ts` | 15 | 새 끝점 둘 — 401 · 403 표(열두 세션, 옛 끝점과 짝) · **다른 지점 관리자 403** · 권한 회수 뒤 다시 읽기 · 404 · 400 · 제 반 200 · **탈퇴 학생 제외** · 계정 없음 · 시작 전 · 막 만든 계정 · 은행 날 · 503(저장소 없음 · 깨진 기록 · 남의 기록) · 쓰기 0 · `no-store` · GET 만 내보냄 |
| `api/mathSrsTeacherBranchScope.test.ts` | 8 | 기존 교사 끝점 셋의 «다른 지점 관리자» — 반 현황 403 · 학생 상세 · 학습 설정 읽기/쓰기 403(저장 0) · 명단은 제 지점 조건이 질의에 실림 · 지점이 빈 관리자 · 권한 회수 |
| `unit/courseSrsAccess.test.ts` | 9 (새 1) | 계정 관문 — 학생 쪽은 `srs` 메뉴 · GET 만, 반 쪽은 옆 끝점과 같은 답, 학생 세션은 둘 다 거절 |

**v1 코드에서 돌린 것**(01:01 · 28 파일 · 391 시험 · 전부 초록 · 198.6초) — 위 다섯(그때는 61 시험) + 아래 23 파일 330 시험.
그 뒤 바뀐 것은 새 모듈 셋(투영 · 계약 · 처리기)의 v1.1 과, 기존 질의 둘의 계정 select 에 `createdAt` 한 칸이다. **아래 23 파일은 그 뒤에 다시 안 돌렸다.**

- 전수 가드: `unit/errorLogRouteCoverage` · `unit/mathSrsRecordIsolation` · `unit/mathSrsQuickFence` · `api/studentSessionSweep`
- 고친 파일을 무는 기존 시험: `api/mathSrsRoutes` · `api/mathSrsCourseRoutes` · `api/mathSrsReplayRoutes` · `api/mathExplorersRoutes` · `api/mathExplorersStarAward` ·
  `api/teacherRoster` · `api/conceptAdmin` · `unit/mathSrsServer` · `unit/mathExplorersEngine`
- 관문: `unit/accountRouteAccess` · `unit/routeAccess` · `unit/studentRouteAccess` · `unit/ownerScope` · `unit/proxyRoleGate` · `unit/proxyStudentGate` ·
  `unit/conceptMenu` · `unit/englishMenu` · `unit/kstDate` · `components/conceptBlankMenu`

빨강 먼저: 구현 전 실행에서 투영 · 경로 시험은 모듈이 없어 적재에서, 계정 관문 시험은 단정에서 빨갰다(3 파일 실패).
계약 시험과 «다른 지점» 시험(기존 끝점 셋)은 처음부터 초록이었다 — 앞은 계약을 먼저 써서, 뒤는 **기존 동작을 굳히는 시험**이라서다.
그래서 «무는지»는 변이로 따로 봐야 한다(§4.1 — 아직 못 봤다). v1.1 은 시험을 먼저 고쳐 쓰고 구현을 맞췄다.

기록은 손으로 짓지 않고 **제품 엔진**(`applyExplorerAction`)을 돌려 만들었다 — 첫 시도 오답 · 세 바퀴 내내 오답 · «남은 문제 다시 풀기» · 다음 날 복습 ·
지난 칸 다시 풀기 · 회복 길까지. 장수 문턱처럼 엔진으로 딱 그 수를 못 만드는 자리만 엔진이 만든 기록의 **만기 한 칸**을 옮겼다.
경로 시험의 DB 대역은 **where 를 실제로 읽는다**(소유 조건의 세 꼴 · `eywaWithdrawnAt: null`) — 조건을 안 읽는 대역은 질의가 조건을 빠뜨려도 초록이다.

### 4.1 변이 — 가드가 무는가 · 🔴 **못 돌렸다**

커밋한 나무에서 변이를 하나씩 걸고 관련 시험 파일을 돌릴 참이었다(22개 — 되돌리기는 `git checkout -- src`). **하나도 안 걸렸다** — 실행이
공용 잠금을 기다리는 동안 메모리 부족으로 종료됐다(§4.3). 그래서 아래는 «물었다»가 아니라 **걸려던 목록**이다. 특히 처음부터 초록이던
«다른 지점» 시험 8개는 변이 없이는 «무는 시험»이라고 말할 수 없다.

| 갈래 | 걸려던 변이 | 빨개져야 하는 시험 |
| --- | --- | --- |
| 지점 | `withinOwnerScope` 가 다른 지점도 같은 지점으로 친다 | 다섯 끝점의 «다른 지점 관리자 403» |
| 지점 | `ownedStudentsWhere` 가 관리자에게 조건 없이 | «명단 — 질의에 제 지점 조건이 실린다» |
| 명단 | `loadSrsClassRoster` 가 `eywaWithdrawnAt: null` 을 뺀다 | «탈퇴 학생은 빠지고» · 반 현황 이름 목록 |
| 끝점 | 반 · 학생 끝점이 소유 범위를 안 묻는다(둘) | 403 표 |
| 끝점 | 계정 없음을 안 본다 · 계정 만든 날을 UTC 로 센다 · 남의 탐험 기록도 읽는다(셋) | 운영 확인 · 막 만든 계정 · 503 |
| 투영 | 문턱 비교를 하나씩 어긋나게(밀림 날 수 · 장수 · 오래 밀린 한 장 · 오래 쉼 · 날 넘김 · 복습 장수 · 미해결 창 · 시작 전 유예 — 여덟) | 각 «문턱 바로 안 · 밖» |
| 투영 | 복습의 날짜 조건을 합의문 글자로(`>` → `>=`) | «🔴 새 단원에서 첫 시도를 틀린 것은 복습이 아니다» |
| 투영 | 지난 칸 다시 풀기를 열린 임무로 · 은행 날의 칸을 안 읽음 · 이력에 없는 끝난 세션을 안 읽음 · 미해결 0 에도 섬 · 계정 없음을 안 실음(다섯) | 각 이름의 시험 |

### 4.2 그 밖의 검사

| 검사 | 결과 |
| --- | --- |
| `npx prettier --check`(고친 · 새 파일 16개, 이름을 적어서) | 통과 — 작업 폴더가 CRLF 인 기존 파일 여섯은 줄끝을 걷어 내고 견줬다(줄끝만 달라 통째로 «수정됨»으로 뜬다) |
| `npx eslint`(같은 파일들) | **v1 코드에서** 오류 0 · 경고 1(안 쓰는 변수 — 고쳤다). 🔴 v1.1 코드로는 **다시 못 돌렸다** |
| 좁힌 `tsc`(고친 파일과 그 import 닫힘만) | 🔴 **못 돌렸다** — 첫 시도는 임시 설정이 워크트리에 없는 `next-env.d.ts` 를 가리켜 시작도 못 했고, 고친 뒤의 실행이 멈췄다. vitest 는 타입을 안 본다 — **새 코드의 타입은 아무도 확인하지 않았다** |
| `npm run type-check` · 빌드 · e2e | 안 돌림(브리프) |
| `npm run lint:affordance` | 생략 — 컴포넌트 · CSS 를 안 건드렸다 |
| 커밋 훅 | 안 돌았다 — 이 워크트리에 `.husky/_` 가 없다(§6 의 7) |

### 4.3 멈춘 것 — 무엇이 · 왜 · 남은 흔적

2026-10-01 01:19 무렵, 백그라운드로 걸어 둔 명령 둘이 **기계 메모리가 위험 수준으로 낮아져** 종료됐다(그때 남은 물리 메모리 1.3 GB / 15.4 GB).
명령 자체의 실패가 아니다.

| 멈춘 것 | 그때 하던 일 | 남은 흔적 |
| --- | --- | --- |
| 변이 검증(투영 쪽 14개) | 공용 잠금(`cb-paper2` 가 쥠)을 기다리는 중 — **변이를 하나도 걸기 전** | `src` 는 깨끗했다(`git status` 로 확인). 셸만 죽고 잠금을 기다리던 스크립트가 고아로 남아 있어 **손으로 껐다** — 두면 잠금이 풀리는 순간 아무도 안 보는 채로 `src` 에 변이를 걸기 시작한다. 공용 잠금은 내 것이 아니었다(건드리지 않았다) |
| 리드에게 보낸 질문(§2.2 의 날짜 조건 A/B) | 답을 기다리는 중 | 질문이 리드 쪽에 기록됐는지 모른다(답은 안 왔다) |

다시 걸지 않았다 — 메모리가 아직 빠듯하고, 다시 돌리는 것은 리드(또는 원장님)가 정할 일이다. **병합 전에 돌려야 하는 것**(무거운 순):

1. 관련 시험 28파일을 커밋한 코드에서 — 파일 목록은 위 §4(작업자 하나로 약 200초).
2. `npx eslint` — 고친 · 새 파일 16개.
3. 타입 — 리드의 병합 뒤 `npm run type-check` 가 어차피 본다.
4. 변이 22개(§4.1) — 투영 쪽은 시험 파일 하나라 가볍고, 끝점 쪽은 파일 둘.

## 5. `mathSrsRecordIsolation` — 넓히지 않았고, 한 줄 조였다

- 기록을 읽는 새 모듈(`teacherRoutes.ts` · `teacherSummary.ts`)은 `src/lib/math-explorers/` 안, 라우트 둘은 `src/app/api/classes/[id]/math-srs/` ·
  `src/app/api/students/[id]/math-srs/` 안 — 전부 이미 허용된 자리다. `ALLOWED` 는 **한 글자도 안 바꿨다.**
- 복습 기록 표를 직접 읽는 곳은 여전히 `serverStore.ts` 하나다(새 코드는 `srsStateTable` · `readSrsState` 를 거친다).
- `RECORD_MODULES` 에 `math-explorers/teacherRoutes` 를 **더했다.** 이 목록은 «기록을 읽거나 강사에게 내보내는 모듈»이고, 누가 그 모듈을
  허용된 자리 밖에서 부르면 빨개지게 하는 쪽이다. 안 더하면 다음 사람이 이 처리기를 문제은행 · 시험지 · 리포트 쪽에서 불러도 울타리가 조용하다
  (27번 문서 공백 11 «학부모 A4 에 탐험 사실 싣기»가 바로 그 자리 — 그때 울타리가 빨개져 원장님 결정으로 간다).
  뜻이 다르면 이 한 줄만 되돌리면 된다.
- 순수 투영 `teacherSummary.ts` 는 목록에 안 넣었다 — 저장소를 읽지 않는다(기록을 **받아서** 셈만 한다).

## 6. 못 한 것 · 남긴 것

1. **은행 날의 열린 임무는 «임무가 날을 넘김»이 안 본다.** 이 사유는 개념 세션(`definitions.session`)만 읽는다(표 «열린 세션의 `date`» 그대로).
   은행 임무를 열어 두고 안 돌아온 학생은 `state.expedition.mission`(`status` · `date`)에 있다 — 읽는 길은 §2.1 로 이미 열려 있어 몇 줄이면 되지만,
   사유가 읽는 곳이 달라지는 결정이라 하지 않았다.
2. **시작은 했는데 한 번도 하루를 끝내지 못한 학생**은 «오래 쉼»이 안 선다(합의 «학습 이력이 있는»). 개념 세션을 열어 뒀으면 «날을 넘김»이 잡고,
   은행 임무였으면 1번 구멍으로 빠진다.
3. **«최근 복습에서 막힘»** — §2.2 의 날짜 조건은 합의문에 없다(리드 확인 필요) · 모은 그날의 재풀이는 못 가른다 · «최근»의 창이 없다.
4. **한 학생의 기록이 깨져 있으면 반 전체가 503** — 기존 반 복습 현황과 같은 동작이라 그대로 뒀다(깨진 기록을 빈 기록으로 꾸미지 않는다).
5. **보충 카드(D-147) · 통분 공방**은 싣지 않았다(브리프 밖 — 본 카드 230장만).
6. **전체 타입 검사 · 빌드 · e2e 는 안 돌렸다**(브리프 — 리드가 병합 뒤 main 에서). 화면이 없어 실물 확인도 없다.
7. **이 워크트리에서는 커밋 훅이 안 돈다** — `.husky/_` 가 없다(`core.hooksPath = .husky/_`, 20번 교훈 2026-08-19 «훅이 아예 안 돌고 있었다»).
   훅이 하는 일 가운데 `prettier` 는 손으로 돌렸고 `eslint` 는 v1 코드에서만 돌렸다(§4.2). `npm install` 을 하지 말라는 브리프라 고치지 않았다.
8. **운영 자료가 없다**(합의문 §1.15 — `student_srs_state` 1행 · 개념 카드 기록 0건). 이 트랙의 수치는 전부 엔진을 돌려 만든 기록에서 본 것이다.
   문턱은 2주 표본으로 다시 잰다 — 그때 고칠 곳은 `teacherSummary.ts` 의 상수 · `TEACHER_FLAG_POLICY` · 시험의 «정책 판 2 의 값» 한 덩어리다.
9. 합의 안건 4(«남은 것 다시» 상한)가 들어오면 «상한에 닿아 선생님과 확인»이 **차례 0** 이다 — `EXPLORER_TEACHER_LEARNING_FLAG_CODES` 맨 앞에 한 줄,
   읽을 값(`openSession.continuation`)은 이미 응답에 있다.
