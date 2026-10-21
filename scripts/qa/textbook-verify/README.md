# 교과서 문항 원본 대조 (2026-10-21)

DB 교과서 문항(`source = school_textbook`)을 SSD 원본 HWP 와 하나씩 견준다 — 본문 «같음 · 표기만 다름 · 다른 문항 · 원본 못 찾음»,
정답 «같음 · 표기 · 다름 · 그림 …». 결과와 방법은 `docs/planning/tracks/reports/textbook-verify-20261021.md`.

🔴 **읽기만** — DB 를 안 만진다. 잠금은 리드가 목록을 보고 한다.
🔴 출력에는 교과서 글이 든다 — **저장소 밖**에 쓴다(`dump-db.ts` 는 저장소 안 경로를 거절한다).
🔴 한컴 COM 을 쓰지 않는다(CLAUDE.md 9번) — HWP 이진 판을 직접 읽는다(`hwp5_flow.py`).

## 다시 돌리기

```bash
OUT=/Users/pss/Desktop/creative/display-survey/textbook-verify
PY=$OUT/.venv/bin/python            # python3.12 + olefile · rapidfuzz · pytest
# 1. DB 덤프(읽기만)
npx tsx --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/textbook-verify/dump-db.ts $OUT/db-20261021.jsonl
# 2. 원본에서 문항을 다시 가른다(이관과 같은 segment · extract) — 파일 수백 개, 두 일꾼이면 몇 분
nice -n 10 $PY scripts/qa/textbook-verify/extract_originals.py $OUT/db-20261021.jsonl $OUT/orig --workers 2
# 3. 전수 대조(13초 남짓)
nice -n 10 $PY scripts/qa/textbook-verify/verify.py $OUT/db-20261021.jsonl $OUT/orig $OUT/ledger-try.jsonl
# 4. 눈금 — 틀린 대조군 · 표기 대조군 · 손 판정 표본
nice -n 10 $PY scripts/qa/textbook-verify/calibrate.py $OUT/db-20261021.jsonl $OUT/orig $OUT/ledger-try.jsonl $OUT/calibration-final \
  --labels $OUT/labels-50.json --labels $OUT/labels-50b.json --labels $OUT/labels-50c.json
# 5. 마무리 원장 · 잠금 후보 · 확인 목록 · 요약
$PY scripts/qa/textbook-verify/report.py $OUT/ledger-try.jsonl $OUT/manual-20261021.json $OUT/calibration-final/controls.json $OUT
# 시험(지어낸 예문만)
$PY -m pytest scripts/qa/textbook-verify/test_verify.py -q -p no:cacheprovider
```

## 파일

| 파일 | 하는 일 |
|---|---|
| `dump-db.ts` | 교과서 문항을 DB 에서 그대로 읽어 JSONL 로(읽기만) |
| `hwp5_flow.py` | HWP 5.0 이진 판 → 이관의 `hwpx_flow.Para` 와 같은 문단 흐름(표 칸 · 수식 · 그림 자리 · 각주) |
| `extract_originals.py` | 원본 파일마다 이관과 같은 가르기를 돌려 외부 열쇠별 원본 문항 · 정답 · 풀이를 낸다 |
| `skeleton.py` | 글 뼈대 — 한글 수식 스크립트와 LaTeX 를 같은 꼴로, 첨자 · 분수 구조는 표지로 남긴다 |
| `compare.py` | 두 뼈대의 차이마다 까닭을 붙여 «같음 · 표기만 다름 · 다른 문항»을 낸다 |
| `verify.py` | 전수 대조 — 주변 근거(머리글 · 가까운 표 칸 · 이웃 번호) · 정답 대조 · 자리 · 복구 묶음 기록 |
| `calibrate.py` | 눈금 — 틀린 대조군 아홉 · 표기 대조군을 전수와 같은 판정 길로 · 손 판정 표본 |
| `report.py` | 원장 + 손 판정 → 마무리 원장 · 잠금 후보 · 확인 목록 · 요약 |

## 손 판정(`manual-<날짜>.json`)

기록 없는 «다른 문항»마다 `{category, label, note}` — A 잠금 후보(DB 글이 빠짐) · B 확인 목록(DB 가 원본과 다르게 고침) ·
C DB 이상 없음(대조기 쪽 차이). 대조기의 «다른 문항» 정밀도가 낮아(표본 18/34) 표본이 아니라 전부 읽는다.
