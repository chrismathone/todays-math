# 기출 1편 이관 — 정화중 25-2-중간 (시험 이관)

원장님 지시(2026-09-05)로 N드라이브 기출 **한 편**을 끝까지 넣어 본 판이다.
다음 기출 이관이 그대로 물려받을 수 있게 남긴다.

## 차례

    ① scripts/qa/convert-hwp-spans.py   HWP 수식 스크립트 → LaTeX (정본 변환기)
    ② fix-exam-solutions.ts             정본이 못 되돌린 잔재를 마저 고치고 **제품 렌더러로 판정**
    ③ build-exam-drafts.ts              본문·정답·해설·배점을 맞추고 **오염을 걷는다**
    ④ (해설이 없는 객관식) 내부 세션으로 생성 — 정답을 **안 보여 주고** 풀린다
    ⑤ load-exam-paper.ts                드라이런 → `ALLOW_SHARED_IMPORT=1 … --apply`

## 이 판에서 배운 것 (다음 사람이 같은 함정에 안 빠지게)

1. **본문의 정본은 HWP 다.** 완료 PDF 의 텍스트층은 조판을 잃는다 — 분수가 풀리고
   (`tan35°+tan50° 8`), 호 표시가 깨지고, `\overline` 가 통째로 사라지고,
   한 문항은 **발문이 아예 없었다**. PDF 는 **대조용**으로만 쓴다.
2. **그런데 배점은 PDF 가 맞다.** HWP 추출은 소문항이 있는 문항에서 마지막 소문항
   배점을 집는다(문17 3점 · 문19 4점). 가르는 근거는 본문 밖에 있다 — **합이 100점**.
3. **HWP 발문 끝에 검수자 실명이 붙어 온다**(`정답 / 워드:○○○t / 오검:…`).
   개인정보다. 걷어 내고, 걷은 **뒤에** 남았는지 다시 센다.
4. `convert-hwp-spans.py` 만으로는 안 끝난다 — `rmbarBD` 가 `\mathrm{\overline{B}}D`
   (B 에만 바)로 나온다. **KaTeX 는 초록**이라 렌더 검사가 이 부류를 못 잡는다.
   모양 자체를 세는 규칙이 따로 필요하다.
5. **AI 해설은 답이 맞을 때만 싣는다.** 푸는 쪽에 정답을 보여 주지 않는 것이 요점이다.

## 둘째 편부터 — 편마다 폴더 하나 (2026-09-12)

첫 편은 학교·편 id·소단원 표·손 고침이 스크립트에 **박혀** 있었고, 작업폴더(되돌리기 원장 포함)는
다른 컴퓨터에만 남았다. 이제 편마다 `exams/<examId>/` 에 설정(`exam.json`)과 산출물을 두고 **커밋한다**.
원본 PDF·HWP 와 HWPX 중간물은 싣지 않는다(`exams/.gitignore` — N드라이브에서 다시 뽑힌다).

    0. 원본 짝 복사 — `pdf/중3/…(완료).PDF` ↔ `워드/중3/…(완료).hwp` (이름이 같다)
    1. HWP → HWPX : scripts/qa/hwp_to_hwpx_quiet.py (isolate_desktop() 먼저 — 절대 규칙 9)
       → D:/시험지 한글화/scripts/hwp_extract.py → answers.json   (정답·해설·소단원·배점)
    2. PDF 텍스트층 : D:/시험지 한글화/db/textlayer.py extract() → body.json   (대조·배점)
    3. 그림 : figures/extract_source_figures.py --src --out <편>/figures
       표   : figures/crop_tables.py --src --out <편>/figures --numbers 1,14   (exam.json tables 와 같게)
    4. 수식 : scripts/qa/convert-hwp-spans.py  pieces_in → pieces_conv · sol_in → sol_conv
    5. 잔재 : fix-exam-solutions.ts <conv> <fixed> --config <편>/exam.json   → hwp_fixed · sol_fixed
    6. exam.json 의 units — 소단원·문항류를 **사람이** 정한다(D-120). 원장님 검토 대상
    7. build-exam-drafts.ts <편>   → drafts.json
    8. 해설 없는 객관식 — 정답을 **안 보여 준** 풀이자가 sol_ai/qNN.json 을 쓴다
    9. load-exam-paper.ts <편> (드라이런) → ALLOW_SHARED_IMPORT=1 … --apply
   10. exam-load-ledger.json · public/figures/exam/<해시>/ 를 **커밋하고 민다**

⚠️ 0~5 는 아직 한 스크립트로 묶이지 않았다(둘째~넷째 편은 손으로 이었다). 편을 대량으로 넣기 전에 묶을 것.

### 둘째~넷째 편에서 새로 난 것
- **표** — HWP 는 표를 한 줄에 한 칸씩 푼다. 원본에서 오려 그림으로 붙이고 풀린 칸 줄은 걷는다.
  `tables` 에 적은 문항에서 칸을 못 찾아도, 안 적은 문항에서 칸이 보여도 **멈춘다**.
- **보기에도 오염** — 경산여중 문26 은 ⑤ 뒤에 검수자 실명이 붙어 왔다. 걷기를 보기에도 건다.
- **사적 사용 영역 글자 ∥ (U+F005A)** — 원본 지면을 렌더해서야 ∥ 인 줄 알았다.
- **정답 쪽 판정** — 정답 쪽이 1…21 을 다 나열하면 «최댓값이 줄어드는가»로는 못 찾는다.
  «번호가 1로 되돌아가는가»로 본다. 첫 편 그림 19장은 바이트 그대로 나오는 것을 확인했다.


## 편을 여러 개 — 대량 이관 (2026-09-13)

    python scripts/import/exam-paper/batch_import.py --folder "N:/개인/기출/2025 기출모음/2025년 2학기 중간고사 모음" --grade 중3 --list
    python scripts/import/exam-paper/batch_import.py --folder "…/2025년 2학기 중간고사 모음" --grade 중3

편마다 한 줄만 나온다(✅ / ⏳ 기다림 / ⏸ 사람이 정할 것 / ⏹ 3회 실패로 포기 / — 건너뜀).
자세한 것은 `exams/<편>/batch.log`, 이번 실행의 줄 전부는 `exams/.batch-last-run.txt`.

- **학년은 폴더가 아니라 파일 이름 `[학년]` 태그**로 정한다 — 중3 폴더에 `[강북중][2]` 가 섞여 있다.
- `(완료)` PDF ↔ **같은 이름** HWP 짝만(D-37). 짝이 없으면 건너뛰고 사유를 찍는다(칠곡중처럼).
- 이미 적재된 편(`exam-load-ledger.json`)은 건너뛴다. **드라이버가 세우지 않은 편 폴더**는 멈춘다
  (정화중처럼 원장 없이 적재된 편이 있다 — 다시 넣으면 공유 DB 에 두 번 들어간다).
- 재개는 `exams/<편>/batch-state.json` 이 안다. 한 단계가 다시 돌면 **그 뒤 단계 기록은 지운다.**
- 사람이 정할 것: 표 확신 없음 · 5단계 남은 결함(→ `exam.json` `hand` 또는 `acceptFix`) · 잔재 훑기 ·
  빌더의 `[중단]`. 이건 실패가 아니라 **보류**라 시도 횟수를 안 센다.
- 6단계(소단원·문항류 `units`)와 9단계 적재는 **사람·메인**이 한다. 드라이버는 `classify.md` 만 낸다.
  적재 전에 `units` 를 채워야 `load-exam-paper.ts` 가 돈다.

### 해설 풀이 — grok CLI, **두 번에 나눈다**

1. 드라이버가 편마다 문제지(`problems.json` · `fig/` · `out/`)와 **지시서 `BRIEF.md`** 를 낸다.
   문제지 폴더는 **저장소 밖**이어야 한다(기본값은 grok 워크트리
   `…/grok-solve/scratch/grok-solve`) — 저장소 안에는 정답이 든 `drafts.json` 이 있다.
   그 워크트리에서는 `exams/` 의 편 폴더를 지우고 풀린다(지난 판 `build_grok_sheets.py` 가 그랬다).
2. 드라이버는 편 목록을 **앞 절반 · 뒤 절반**으로 가른다(`exams/solve-plan.json`). 뒤 절반은
   문제지를 **안 낸다**. 앞 절반 채점이 끝나면 화면에 «절반 지점 — 메인 표본 검수 후 재개» 가 찍히고 멈춘다.
3. 🔴 **절반 지점 표본에는 «그림에서 값을 읽는 문항»(산점도 · 표 · 그래프)을 반드시 넣는다.**
   점 하나를 빠뜨려도 답이 같으면 채점기가 못 잡는다 — 사람이 그림과 해설을 나란히 봐야 드러난다.
4. 검수를 마치면 `--reviewed` 로 다시 부른다. 그때 뒤 절반 문제지가 나간다.

채점(`grade_solutions.py`)은 **기록된 정답과 일치 · 해설 모양 · 중학교 과정 밖 방법 · 변환 잔재**를 본다.
통과한 것만 `sol_ai/` 로 가고, 걸린 것은 `solve-flags.json` 에 목록으로 남는다(해설은 안 싣는다).
금지 방법 · 허용 명령 · 문장 수는 **`solver_rules.json` 한 곳**에서 지시서와 채점기가 같이 읽는다 —
한쪽만 늘리면 시키는 쪽과 세는 쪽이 갈린다. «목록 밖 명령»은 **경고**일 뿐이다(문지기는 적재기의 렌더러 검사).

### 회귀

    python scripts/import/exam-paper/regress_batch.py --part a    # 4단계 이후 — 커밋된 중간물에서 바이트 대조
    python scripts/import/exam-paper/regress_batch.py --part b    # 0~3 단계 — N드라이브 원본에서(HWP COM)
    python scripts/import/exam-paper/regress_batch.py --part mut  # 드라이버를 망가뜨려 회귀가 빨개지는지

`--part b` 는 **한글(HWP) COM** 을 돌린다 — 숨은 데스크톱에서 한 번에 하나씩이고, 사용자 화면에
한글 창이 뜨거나 포커스가 넘어가면 드라이버가 **스스로 멈춘다**(절대 규칙 9). 원장님이 한글로 일하시는
동안에는 돌리지 않는다.
