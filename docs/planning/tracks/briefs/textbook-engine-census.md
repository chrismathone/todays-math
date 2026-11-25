# textbook-engine-census — 교과서 엔진 0단계: 중1 · 중2 교과서 문항 전수 대조

> 먼저 읽을 것: `CLAUDE.md` 절대 규칙 · `docs/planning/28-textbook-engine.md`(이 일의 SSOT) ·
> `docs/planning/schoolbook-import-20261007.md` · `docs/planning/tracks/reports/textbook-twins-20261021.md` ·
> `.claude/skills/middle-gen/SKILL.md` · `docs/planning/18-qa-playbook.md`(이미 있는 연장 · 해 보고 버린 것) ·
> `20-lessons-learned.md` 의 2026-10-07(답이 맞은 것과 지면에 낼 수 있는 것) · 2026-10-21(보충은 갱신 뒤 DB 로 센다).
> 기계 부하: vitest 는 관련 시험만 `--maxWorkers=3` · 운영 빌드 금지 · 브라우저는 한 번에 하나.

## 목표

중1 · 중2 교과서 문항(`problem.source = 'school_textbook'`, 운영 DB 기준 중1 4,943 · 중2 3,559)을 **유형으로 묶고** 묶음마다 가른다.

- **ⓐ 덮임** — 기존 중등 엔진(`src/lib/middle/`) 유형이 같은 유형을 이미 만든다(유형 키를 적는다).
- **ⓑ 엔진화 가능** — 새 엔진 유형으로 지을 수 있다(씨앗으로 숫자 · 조건 · 그림을 바꾸고 정답을 계산으로 낼 수 있다).
- **ⓒ AI 필요** — 서술 · 개념 · 상황 의존이 커서 엔진으로 짓기 어렵다.

## 내야 할 것

1. 보고서 `docs/planning/tracks/reports/textbook-engine-census.md`
   - 단원별 표(교과서 문항 수 · ⓐ · ⓑ · ⓒ · 그림 있는 수) — 단원 이름은 중등 엔진 단원 이름에 맞춘다.
   - **ⓑ 새 유형 후보 목록** — 묶음 크기순. 후보마다: 이름 · 단원 · 묶인 문항 수 · 변하는 값(무엇을 씨앗으로 바꾸나) · 정답 계산법 한 줄 · 그림 필요 여부 · 난이도(easy/mid/hard) · 견본 문항 코드 셋(교과서 글은 보고서에 옮기지 않는다 — 코드만).
   - ⓐ 의 판정 근거(같은 유형이라 본 기준)와 표본 검산(무작위 표본을 다시 읽어 맞는 비율).
   - 1단계(새 엔진 유형) 트랙을 단원 묶음 몇 개로 나눌지 제안 · 우선순위(문항 수 · 난이도 · 그림 부담).
2. 데이터 `docs/planning/tracks/reports/textbook-engine-census/`(문항 id → 묶음 → ⓐ/ⓑ/ⓒ · 유형 키). 교과서 글 · 그림은 저장소에 넣지 않는다.
3. 판정을 다시 돌릴 수 있는 스크립트(`scripts/qa/textbook-engine-census/`).

## 지킬 것

- 🔴 **DB · 운영에 쓰지 않는다.** 읽기만. 워크트리에는 `.env` 가 없다 — 리드가 읽기 전용으로 뽑은 자료가 필요하면 보고서에 «필요한 자료»로 적고 멈추지 말고 나머지를 한다. (리드가 출발 전에 `textbook-mid-rows.jsonl` 을 저장소 밖에 둔다 — 아래.)
- 🔴 **유료 API 키 호출 금지.** 판단은 너(Codex) 자신이 한다. 다른 모델의 검산이 필요하면 구독 CLI 로, 보고서에 세션 · 바이트를 남긴다(시범 도구의 방식).
- 표본만 보고 전수를 말하지 않는다 — 전수 판정과 표본 검산을 갈라 적는다. 추측이 필요한 곳은 덜 위험한 쪽(ⓐ 보다 ⓑ, ⓑ 보다 ⓒ)으로 정하고 까닭을 적는다.
- 가지 `phase/textbook-engine-census` 에 뜻 단위로 커밋. main 에 밀지 않는다 · push 하지 않는다 · `._*` 를 올리지 않는다.

## 자료

- 교과서 행(중1 · 중2, 글 · 정답 · 풀이 · 단원 · 그림 유무 · 잠금 여부): `/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl`(리드가 운영 DB 에서 읽기로 뽑음 — 저장소 밖).
- 중등 엔진 유형 목록: `npx tsx scripts/middle/gen-cli.ts --sections --grade 중1` · `--list --q …` · `npx tsx scripts/middle/type-census.ts`.
