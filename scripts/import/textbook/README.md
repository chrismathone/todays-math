# 교과서 문제 이관 (2026-10-07 시작)

원장님 2026-10-07: «G드라이브에 보면 교과서가 있거든? 문제를 전부 추출해서 문제은행에 넣고 싶은데 '교과서 라벨'을 붙여서»
→ «정답이 없는건 정답지가 있나 찾아보고 매핑시키면 됨. 매핑 안되는 문제들은 따로 md 보고서 작성».

원본은 `G:\중등교과서` · `G:\고등교과서` — 2022 개정 출판사 교사용 자료(54권 · HWP 5,493 · PDF 2,702 · zip 276).
`G:\중등교과서\중3` 은 비어 있다.

## 길

| 단계 | 도구 | 하는 일 |
|---|---|---|
| 1. 고르기 | `triage.py` | HWP 의 미리보기 글(PrvText)만 읽어 «문제 · 문제 의심 · 정답 · 아님»을 가른다 — 한글을 띄우지 않는다(5,493편 1분 반) |
| 2. 바꾸기 | `convert_batch.py` | HWP → HWPX. **창을 안 띄운다**(별도 데스크톱 · 숨김 · 대화상자 자동응답 — `scripts/qa/hwp_to_hwpx_quiet.py` 와 같은 안전장치). 한글 객체를 50편마다 새로 띄워 한 편 0.9초 · 일꾼 둘로 3,863편 35분 |
| 3. 뽑기 | `extract.py` | 문단의 흐름(`hwpx_flow.py`) → 문항 · 정답 · 풀이(`segment.py`) → 이름이 짝인 정답 파일(`…_정답및해설` · `…_해설` ↔ `…_문제` · 꼬리 없음)을 붙인다 |
| 4. 보고서 | `report.py` | 답을 못 붙인 문항을 까닭별로 — `docs/planning/tracks/reports/textbook-import-20261007/unmapped.md` |
| 개발용 | `peek.py` · `stats.py` | 한 파일을 가른 모양 · 책별 요약 |

```bash
python scripts/import/textbook/triage.py E:/todays-math-textbook-import/triage.json
# 변환 — 일꾼 둘(번호 · 수 · 출력 · 고른 목록). 원장님 화면에 창이 안 뜬다
python scripts/import/textbook/convert_batch.py 0 2 E:/todays-math-textbook-import E:/todays-math-textbook-import/triage.json
python scripts/import/textbook/convert_batch.py 1 2 E:/todays-math-textbook-import E:/todays-math-textbook-import/triage.json
# 본 저장소 밖의 변환 폴더(E:) 를 쓴다. 파이썬 3.11 · olefile · pywin32(변환만)
python scripts/import/textbook/extract.py E:/todays-math-textbook-import E:/todays-math-textbook-import/extract
python scripts/import/textbook/report.py E:/todays-math-textbook-import/extract docs/planning/tracks/reports/textbook-import-20261007/unmapped.md
python -m pytest scripts/import/textbook/test_segment.py -q
```

## 가르는 규칙(요지 — 자세한 것은 `segment.py` 머리)

- 문항 번호는 문단 머리의 글자(`01` · `1` · `1.` · `10두 …`) 또는 **작은 그림**(YBM «UP 문제»는 번호가 23×27 픽셀 그림이다). 바로 앞 번호 + 1 일 때만 받는다.
- 번호가 1로 돌아가면 물음이면 새 묶음(«기초 → 실력»), 물음이 아니면 정답 칸.
- 번호 꼴(`01` 대 `1`)은 파일 전체에서 «물음이 따라오는 번호»로 다수결 — 머리의 «1» · «2»에 끌려가지 않게.
- 정답 칸의 줄기는 **풀이의 수가 문제의 수와 겹치는 정도**로 묶음에 붙이고, 빠른 정답 줄기는 바로 뒤의 풀이 줄기와 짝짓는다.
  번호 겹침만 보면 크기가 같은 묶음끼리 한 칸씩 밀려 붙었다(동아 «소단원학습지» — 무작위 표본에서 찾았다).
- 문지기: 보기 문항인데 답이 보기 번호가 아니면 그 묶음 통째로 · 진짜 풀이가 있는데 문제의 수가 20% 도 안 나오면 그 문항을
  «정답 짝 의심»으로 뺀다. 답을 **지어내지 않는다**.

## 잰 것 (2026-10-07)

평가 자료 문항 17,027 · 답 붙음 9,769(57%). 답 붙은 문항을 무작위로 뽑아 직접 풀어 맞춰 보았다 — 첫 표본 22개에 틀린 답 2(줄이 안 갈린
빠른 정답 · 밀린 묶음) → 고친 뒤 둘째 표본 30개 가운데 맞춰 볼 수 있는 27개가 다 맞았다. 본문 쪽 결함(같이 쓰는 지시문 · 문제를 되풀이한
풀이 줄)은 그 표본에서 찾아 고쳤다.

## 아직 안 한 것

- **적재**(문제은행에 넣기) — 출처 «교과서»는 새 값이다(`ProblemSource` 에 없다 → 공유 DB 의 enum 을 바꿔야 한다 · DB 먼저 · 코드 나중).
- **단원 붙이기** — 우리 단원 나무(eywa 교육과정 · 차시)와 교과서 소단원 이름이 글자가 다르다.
- **그림** — 답 붙은 문항 가운데 그림 파일 2,350 · 한글 도형 638 · «그림»이라는데 아무것도 못 잡은 1,365.
- **정답이 그림**(YBM 고등 «기초 · 실력 UP» · 대단원 평가 1,100문항) · **PDF 정답책 · 지도서**(교과서 본문 문제 · 비상 «문제 NOTE»).
- **zip 안의 HWP**(198개 zip · 6,424편 — 대부분 폴더를 통째로 묶은 겹침) · 변환 실패 1편(천재 미적분1 중간기말대비 1단원 1회 문제).

## 저장소 밖 의존물

- 원본: `G:\중등교과서` · `G:\고등교과서`
- 변환본 · 추출 결과: `E:\todays-math-textbook-import\`(`hwpx/` 4.1GB · `manifest*.jsonl` · `triage.json` · `extract/`)
