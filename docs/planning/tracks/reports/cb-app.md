# 트랙 cb-app 보고 — «개념 백지» 탭 화면 (D-150 · 26 §4)

가지 `chrismathone/cb-app` · 기반 `22500678e` · main 에 푸시하지 않았다(리드 검토 뒤 병합).

## 1. 한 일

| 자리 | 내용 |
|---|---|
| `src/contracts/accountAccess.contract.ts` | 브리프의 **두 곳을 글자 그대로** — `WORKSPACE_MENUS` 의 «오늘의 개념» 바로 아래 `conceptBlank` «개념 백지»(주석 포함) · `workspaceMenuSchema` 의 `"concept",` 아래 `"conceptBlank",` |
| `src/lib/accountRouteAccess.ts` | `/concept-blank`(과 그 아래 `/print`) → `conceptBlank` 메뉴. 영어 인쇄 페이지 줄 바로 아래. API 는 없다(은행이 코드 데이터) |
| `src/components/unified/UnifiedWorkspace.tsx` | 옆 메뉴 줄(«오늘의 개념» 바로 아래 · 아이콘은 기존 모음의 `pen` · 접힌 이름 «백지») + 뷰 붙이기(`dynamic` · 개념 · SRS 뷰와 같은 결로 떠나도 숨김으로 남는다 · `active={view === "conceptBlank"}`) |
| 새 `src/components/concept-blank/ConceptBlankView.tsx` · `concept-blank.module.css` | 아래 §2 |
| 계정 권한 화면 | `AccountReview` 가 `WORKSPACE_MENUS` 를 그대로 그려 «개념 백지» 체크 칸이 «오늘의 개념» 다음에 저절로 선다 — 코드는 안 고쳤고 시험으로 잠갔다 |

## 2. 화면 (`ConceptBlankView`)

- **머리**: «개념 백지» + 설명 한 줄 + 오른쪽 **인쇄하기**(`<a target="_blank" rel="noopener noreferrer">` →
  `/concept-blank/print?s=${encodeSelection(sel)}&view=both`). 고른 것이 없으면 잠긴 단추.
- **왼쪽 나무** «단원 고르기»: `BLANK_TREE` 학년 → 대단원(체크) → 소단원(체크).
  - 학년은 접혀 있고 **누른 학년 하나만 펼친다**(다른 학년을 펼치면 앞 학년은 접힘). 학년 단추에 «n개 고름».
  - 대단원 체크 = 그 아래 **재고 있는** 소단원 전부 · 일부만이면 반쯤(`indeterminate`) · 반쯤인 대단원을 누르면 전부 켠다.
  - 소단원 아래 둘째 줄에 재고 `stockCounts()` — «개념 n · ○× n · 적용 n · 그림 n»(체크 칸의 `aria-describedby`).
    재고 0 은 흐리게 · 고를 수 없음 · «문항 없음». 재고가 하나도 없는 대단원은 대단원 칸도 잠김.
  - `CONCEPT_BLANK_GRADES` 밖(초1 · 초2)과 고등은 «준비 중» 줄(단추 없음).
  - 소단원 상한 60(계약) — 넘으면 앞에서 자르고 «소단원은 60개까지 고를 수 있습니다.» 한 줄. «모두 풀기» 단추.
  - 나무 목록은 제 칸 안에서 굴린다(넓은 화면 `min(68vh, 720px)` + 칸 sticky · 폰 `60vh`) — 학년 하나(초5 56 소단원)를
    펼치면 목록이 3000px 가까이 돼 형식 카드를 한참 밀어냈다(첫 390 캡처가 5524px).
- **오른쪽 형식 카드 다섯**(`CONCEPT_BLANK_FORM_LABELS`, 글자 딱지 A~E): 켜기 스위치(진도 계획 화면의 확정 스위치 모양 그대로 —
  `role="switch"` 단추 + 트랙) · 설명 한 줄 · 하 · 중 · 상 숫자 칸.
  - 줄: A «개념 수» · B «용어» + «○×» · C «문장» + «적용» · D «개념 수» · E «그림». 칸 옆에 `/ 최대`.
  - **최대 = 고른 소단원의 그 난이도 재고**(계약 상한 40 에서 자름) · **기본 = 전부**(원장님이 고친 칸만 기억하고, 안 고친 칸은
    고르기가 바뀌면 재고를 따라간다) · 입력은 0~최대로 묶인다 · 재고 0 인 칸은 잠김.
  - 그 형식이 쓰는 재고가 0 이면 카드는 **꺼지고 잠기며 까닭 한 줄**(예: «고른 소단원에 그림 문항이 없습니다.»). 고르기 전에는
    다섯 모두 «소단원을 먼저 고르세요.»
  - 꺼진 카드 · 수가 전부 0 인 카드는 고르기(`forms`)에서 빠진다.
- **제목 · 날짜**(선택) — 제목 40자(계약) · 빈 칸의 자리글은 `composeSheets` 가 붙일 단원 제목 · 날짜는 `type="date"`.
- **미리보기**: `<ConceptBlankPaper sheets={composeSheets(sel, bank)} view=…/>` · 학생지 / 채점표 전환(`aria-pressed`) ·
  «형식 n · 문항 n». 🔴 **A4 비율 그대로 칸에 맞춰 줄인다**(코디네이터 지시 — 원장님 «A4 사이즈에 맞게»): 지면을 제 폭으로 그리고
  `ResizeObserver` 로 잰 칸 폭에 맞춰 가로 · 세로를 같은 배율로 `transform: scale(k)`(k ≤ 1 — 키우지 않는다), 바깥 칸에 줄인 폭 · 높이를
  적어 자리를 맞춘다. 지면 트랙이 화면에서 쪽마다 거는 `zoom: var(--cb-paper-scale, 0.58)` 은 미리보기 틀에서 `--cb-paper-scale: 1` 로
  꺼 **배율은 한 곳에서만** 정한다(두 번 줄지 않게).
- **은행 주입**: `bank?: ConceptBlankBank`(기본 `CONCEPT_BLANK_BANK`) — 시험 · 캡처는 `FIXTURE_BANK`.
- **주소로 되살리기**(있으면 좋음): 브리프의 `#concept-blank?s=` 대신 **`/?blank=<code>#conceptBlank`**. 까닭 — 셸의 해시 동기화가
  `#` 뒤 글 전체를 뷰 이름으로 읽어 `?s=` 가 붙으면 모르는 뷰로 보고 해시를 갈아 버린다. 셸의 해시 규칙을 건드리지 않으려고
  영어의 `?set=` · 작업실의 `?extraction=` 과 같은 검색 인수로 뒀다. 뷰가 **보일 때만** 싣고(`replaceState` — 셸의 popstate 를 안 깨움)
  다른 메뉴로 가면 지운다. 망가진 값은 무시하고 빈 고르기로 연다. 즐겨찾기가 «내 백지 세트»(26 §7 잔고, DB 필요)를 조금 대신한다.

## 3. 시험 결과

마지막 확인(코디네이터 규칙 — 파일 이름 · `--pool=threads --maxWorkers=1` · `cb-verify.lock`):

| 검사 | 결과 |
|---|---|
| 관련 vitest 9파일 — `ConceptBlankView` · `conceptBlankMenu` · `UnifiedWorkspace.access` · `englishMenu` · `conceptMenu` · `accountRouteAccess` · `AdminAccounts` · `studentSessionSweep` · `affordanceGuard` | **132 통과 / 0 실패** |
| 새 `ConceptBlankView.test.tsx` | 15 — 접힘 · 준비 중 · 대단원 → 소단원 전부(재고 0 뺌) · 반쯤 · 재고 줄 · 재고 0 흐림 · 숫자 칸 기본 전부 · 재고를 못 넘음 · E 재고 0 이면 꺼짐 + 까닭 · 끄면 빠짐 · 인쇄 주소 `decodeSelection` 왕복(제목 · 날짜 포함) · 교육과정 순서 · 학생지/채점표 · A4 축소 · `?blank=` 되살리기 · 떠나면 지움 · 망가진 주소 |
| 새 `conceptBlankMenu.test.tsx` | 11 — 자리(«오늘의 개념» 다음) · 수학 제품 · enum = 배열 · 전부 켜 저장 · `/concept-blank(/print)` 메뉴 켬 통과 · 끈 계정 막힘 · «오늘의 개념»만 켠 계정도 막힘 · 승인 전 막힘 · 비슷한 이름 경로 · **계정 권한 화면의 «개념 백지» 체크 칸**(자리 · 켜서 저장 PATCH) |
| `UnifiedWorkspace.access.test.tsx` | +1 — 옆 메뉴 순서 «수업 · 학생 관리 → 오늘의 개념 → 개념 백지 → 오늘의 기억 · SRS» · `#conceptBlank` · 떠나면 `active=false` 로 숨김 유지 · 메뉴 없는 계정은 마운트 안 함 |
| `englishMenu.test.ts` | «수학 메뉴 여덟» → **아홉**(`conceptBlank` 더함) |
| 변이 | 미리보기 배율 줄을 끊으면 축소 시험이 빨개진다(`expected '' to be 'scale(0.5)'`) — 원복 확인 |
| `npm run lint:affordance` · ESLint(바꾼 파일 8) | 0 · 0 |
| `npm run type-check` | 첫 판 뒤 한 번 **exit 0**. 맨 끝(미리보기 축소를 더한 뒤) 한 번은 공유 PC 메모리 부족으로 Claude Code 가 **셸을 끊었고**, 남은 `tsc --noEmit` 는 21:28:59 에 끝나며 **오류 줄 0**(출력 파일은 머리 두 줄뿐) — 종료 코드는 셸이 죽어 못 봤다. 다시 돌리지 않았다(지시) |
| `check-leak.ts` | 누출 0(이 가지의 은행은 빈 뼈대 — 화면 글은 교재 문장이 아니다) |

- 브리프의 «메뉴 하나를 더하면 네 곳이 빨개진다» — 이 가지에서 **실제로 빨개진 기존 시험은 `englishMenu` 한 곳**이었다.
  `UnifiedWorkspace.access` 는 `WORKSPACE_MENUS` 로 세서 그대로 초록이었고, 나머지는 `ALL_WORKSPACE_MENUS` 를 그대로 쓴다.
- ⚠️ 코디네이터의 메모리 지시를 읽기 **전에** 전체 vitest 를 한 번 돌렸다(906파일, 부하 속 38파일 · 53건 실패 — 45건이 20초 시간 초과).
  바꾼 파일을 import 하는 것들 · 전수 스캔형 9파일은 따로 다시 돌려 **`decisionLogNumbers` 하나만** 빨갛다 — 07 문서 Decision Log
  머리글 «현재 148» vs 표 150(기반 커밋의 문서 · 이 트랙 밖). 엔진 · 그림 시험 29파일은 제 파일과 닿지 않고, 메모리 규칙 때문에
  다시 돌리지 않았다(돌던 것도 지시를 읽고 바로 껐다).

## 4. 모양 — D-07 첫 판 캡처(Playwright · Chromium)

Next 셸 없이 뷰만 세운 임시 Vite 하네스(커밋 안 함)로 찍었다 — 은행은 `FIXTURE_BANK`(초5 두 단원), 옆 메뉴 자리는 240px 빈 남색 판으로
폭만 맞췄다. 다섯 장 모두 **가로 넘침 0px**. 미리보기의 지면은 아직 자리 표시(cb-paper 병합 전)라 제목 줄만 보인다.

| # | 장면 | 파일 |
|---|---|---|
| 1 | 1280 · 합동과 대칭 넷 + 2-1-1 · 다섯 형식 켬 · 제목 · 날짜 | [01-1280-selected.png](cb-app/01-1280-selected.png) |
| 2 | 1280 · 수의 범위 셋만 — E 꺼짐 + «고른 소단원에 그림 문항이 없습니다.» | [02-1280-no-figure.png](cb-app/02-1280-no-figure.png) |
| 3 | 1280 · 빈 상태 | [03-1280-empty.png](cb-app/03-1280-empty.png) |
| 4 | 390 · 1과 같은 고르기 | [04-390-selected.png](cb-app/04-390-selected.png) |
| 5 | 390 · 2와 같은 고르기 | [05-390-no-figure.png](cb-app/05-390-no-figure.png) |

토큰은 작업실 그대로(`--learn-*` — 새 색 · 새 글꼴 없음) · 두 칸은 영어 화면의 `0.92fr / 1.28fr` · 스위치는 진도 계획 화면 것 ·
왼쪽 색 막대 없음 · 손가락 커서는 단추 · 체크 칸 라벨에만(D-30) · 문구는 느낌표 · 이모지 없음(D-08).

## 5. 못 한 것

- **실제 A4 지면이 든 미리보기 캡처** — cb-paper 가 아직 미커밋이고, 이 무렵 공유 PC 여유 메모리가 12MB 까지 떨어져 하네스를 더 띄우지
  않았다. 병합 뒤 1280 · 390 에서 배율(1280 은 1배 = 실제 A4, 390 은 약 0.4배)과 줄맞춤을 한 번 보면 된다.
- 셸 크롬(옆 메뉴 · 머리 막대)까지 든 캡처 — 로그인 · DB 없이는 셸이 안 떠서 폭만 맞췄다.
- 실제 은행이 이 가지에서는 비어 있어 제품 화면에서는 지금 **모든 소단원이 «문항 없음»** 이다 — 은행 트랙(e3~m3) 병합 뒤 살아난다.

## 6. 원장님께 물을 것 (D-07 — 첫 판을 보시고)

1. **빈 상태** — 고르기 전 다섯 카드에 0 숫자 칸과 «소단원을 먼저 고르세요.»가 다섯 번 선다(캡처 3). 고르기 전에는 숫자 칸을 감출까요?
2. **학년 펼침** — 한 번에 한 학년만(아코디언). 두 학년을 같이 펼쳐 보는 편이 나을까요?
3. **재고 줄 자리** — 소단원 이름 아래 둘째 줄(«개념 2 · ○× 1 · 적용 0 · 그림 1»). 이름 옆 한 줄로 붙일까요(좁아서 자주 접힌다)?
4. **켜기 장치** — 스위치(진도 계획 화면과 같은 것) · 체크 칸 중 어느 쪽?
5. **미리보기 크기** — 칸 폭에 맞춰 최대 1배(넓은 화면에서 실제 A4 크기). 더 작게 여러 쪽을 나란히 볼까요?
6. **인쇄하기** — 지금은 학생지 + 채점표 한 번에(`view=both`). «학생지만 인쇄» 단추를 따로 둘까요?
7. **옆 메뉴** — 아이콘 연필(`pen`) · 접힌 이름 «백지».
8. 형식 카드 설명 문구 다섯(§2)과 딱지 A~E 를 그대로 둘까요?

## 7. 병합 메모

- `accountAccess.contract.ts` 의 두 곳은 cb-paper 도 같은 글자를 넣는다 — 겹쳐도 같은 줄이다.
- 미리보기 틀의 `--cb-paper-scale: 1` 은 cb-paper 의 변수 이름에 기댄다 — 이름이 바뀌면 여기도(안 맞으면 지면이 0.58배 위에 칸 맞춤이 한 번 더 걸려 작아질 뿐 깨지지는 않는다).
- `package-lock.json` 은 orca 설치 단계가 고쳤지만(peer 표시 등) 커밋하지 않았다.
- 설치 사고 하나: `npx prisma generate` 를 orca 의 `npm install` 이 끝나기 전에 불러 홈 폴더의 prisma 가 잡혔고, 그것이 `npm i @prisma/client` 를
  띄웠다 — 끊었더니 `jsdom/node_modules/lru-cache@11` 이 빠져 jsdom 이 «LRUCache is not a constructor» 로 죽었다. `npm install` 을 다시 돌려
  고쳤다. 새 워크트리에서는 **설치가 끝난 걸 보고** generate 할 것.
