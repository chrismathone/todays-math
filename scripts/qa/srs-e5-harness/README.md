# 초5 SRS 로컬 실서버 하네스 (2026-10-19 ~ 10-20)

학생 SRS 를 **실제 서버 코드**로, 학생처럼 며칠씩 풀어 보는 격리 환경의 도구다. 계획서
`docs/planning/srs-e5-30day-plan-20261019.md` §1 진단과 §5 «초5 14일 실서버 걷기»가 이것으로 쟀다.
처음에는 무시되는 폴더(`.qa-artifacts/srs-e5/`)에만 있었다. 2026-10-21 에 다른 컴퓨터에서 이어 하도록 저장소로 옮겼다.

🔴 **공유 DB 에는 읽기만 한다.** `fixture.ts` 가 공유 DB 의 초5 문항 행을 읽어 로컬에 복사한다. 쓰기는 전부 로컬
(`127.0.0.1:54335/srs_e5`)이고, 스크립트마다 주소가 로컬이 아니면 시작하지 않는 줄이 있다.

## 띄우는 차례

1. **Postgres(Docker 없이)** — 작업 폴더 밖 아무 곳(예: scratchpad)에서 `npm i embedded-postgres`.
   - 바이너리는 `node_modules/@embedded-postgres/windows-x64/native/bin` 에 온다(`postgres` · `initdb` · `pg_ctl` 뿐 — psql 없음).
   - `initdb -D data -U postgres --pwfile=pw.txt -A scram-sha-256 -E UTF8 --locale=C`(비밀번호는 `postgres` — `fixture.ts` 의 주소와 맞춘다).
   - `pg_ctl -D data -o "-p 54335" -l logfile -w start`. Git Bash 에서 `-w` 가 안 돌아와도 서버는 뜬다 — `logfile` · `netstat` 로 확인.
2. **마이그레이션** — 🔴 먼저 Supabase 역할 `anon` · `authenticated` · `service_role` 을 만든다(없으면 사슬 중간에서 죽는다).
   - 그다음 `DATABASE_URL` · `DIRECT_URL` 을 `postgresql://postgres:postgres@127.0.0.1:54335/srs_e5` 로 주고 `npx prisma migrate deploy`.
   - `supabase/migrations/` 에만 있는 칸(`problem.question_group_key`)은 Prisma 사슬에 없다 — 손으로 더한다(`prisma migrate diff --from-url … --to-schema-datamodel` 로 확인).
   - 시드: `npx tsx prisma/seed.ts`.
3. **원장 · 반 · 학생 · 문항** — 작업트리 안에서(바깥에서 돌리면 옛 `@prisma/client` 를 집는다):
   `SRS_E5_DIRECTOR_PASSWORD=… SRS_E5_STUDENT_PASSWORD=… npx tsx scripts/qa/srs-e5-harness/fixture.ts 초5`.
   - 원장 `director@srs-e5.local` · 반 «초5 기억반»(초5) · 학생 `test_s`. 비밀번호는 저장소에 적지 않는다(운영 시험 계정과 아이디가 같다).
   - 공유 DB 주소는 `SHARED_ENV_FILE`(없으면 `D:/todays-math/.env`)의 `DATABASE_URL` 에서 읽는다 — 읽기만 한다.
   - 로컬 학생은 `isTest: true` 다. 선생님 코스 계획 쓰기는 시험 학생이면 403 이다 — 계획을 시험하려면 로컬에서 끈다.
4. **dev 서버** — `DATABASE_URL=… DIRECT_URL=… AUTH_SECRET=<아무 값> AUTH_URL=http://localhost:4321 AUTH_TRUST_HOST=true npx next dev --webpack -p 4321`.
   - 작업실(`/`)은 열지 않는다 — dev 에서 순수 선택자 오류로 서버 전체가 오류 상태가 된다. 학생 화면과 API 만.
5. **크로뮴** — `%LOCALAPPDATA%\ms-playwright\chromium-*\chrome-win64\chrome.exe --remote-debugging-port=9333 --user-data-dir=<빈 폴더>`.
   - 로그인은 `/login`(학생 아이디 · 비밀번호). 선생님 브라우저는 9334 로 하나 더(`PORT=9334`).

## 도구

| 파일 | 하는 일 |
| --- | --- |
| `fixture.ts` | 로컬 DB 에 원장 · 반 · 학생 · 계정을 만들고 공유 DB 의 문항을 읽어 복사 |
| `reset-student.ts` | 로컬 DB 의 `test_s` 학습 기록을 비운다(첫날부터 다시 걷기) |
| `drive.mjs` | 띄워 둔 크로뮴(9333)에 CDP 로 붙어 같은 탭을 걸음 목록대로 조작 · 캡처는 `.qa-artifacts/srs-e5/shots/`(커밋하지 않는다) |
| `cookies.mjs` | 크로뮴의 쿠키를 넣는다 — 시계 쿠키를 걷기 전에 명시로 |
| `solve-explorer.ts` | 브라우저 쿠키로 오늘의 개념 탐험을 정답으로 끝까지(화면과 같은 API · 머리글 `x-explorer-follow-up: 1`) |
| `answer.mjs` · `solve.mjs` · `autoplay.mjs` | 화면에서 답을 넣고 넘기며 캡처 |
| `peek.ts` · `peek2.ts` | 학생 API 를 읽기만(탐험 · 하루 계획 · `today`) |
| `probe*.ts` · `selfcheck-*.ts` · `choice-quality.ts` · `template-*.ts` · `mode-count.ts` · `list-*.ts` · `preview-prompts.ts` | 계획서의 수치를 낸 측정(저장 없이 엔진을 재현) — 로컬 DB 에만 붙는다 |

## 함정

- 시간 이동은 쿠키 `learn-test-clock=<날 수>` 다. 서버는 로그인 아이디가 `test_s` 일 때만 읽는다.
- 🔴 크로뮴 프로필에 지난 걷기의 시계 쿠키가 남는다 — 그대로 걸으면 기록 날짜가 넣은 시계와 어긋난다. 걷기 전에 `cookies.mjs` 로 `0` 을 넣고, 날마다 `peek2.ts` 로 `today` 를 본다.
- 버튼 글이 KaTeX 로 그려지면 글 찾기가 실패한다(«×» 앞뒤 띄어쓰기) — `button:has-text("0.06")` 처럼 짧은 글로 찾는다.
- tsx 는 CJS 로 바꾼다 — 최상위 `await` 대신 `main()`.
- 클러스터 시간대는 OS 를 따라 Asia/Seoul 이다 — `CURRENT_TIMESTAMP` 기본값이 앱의 UTC 칸과 9시간 어긋난다.
- 끝나면 dev(4321) · 크로뮴(9333)을 끈다. 타입 검사와 메모리를 다툰다. Postgres 는 가볍다.
- 도구 안 주석의 실행 경로(`.qa-artifacts/srs-e5/…`)는 옮기기 전 자리다 — 지금은 `scripts/qa/srs-e5-harness/…` 로 부른다.
