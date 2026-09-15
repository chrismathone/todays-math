# 오늘의 개념 ② — 강의 생성기 복원 (워크트리 `lecture-gen`, 2026-09-15)

리드는 `D:/todays-math` 메인 세션이다. 너는 **`hyper motion video` 저장소의 워크트리**에서 일한다.
다시 조사하지 말 것 — 필요한 사실은 이 문서와 21번 문서에 있다.

## 0. 먼저 읽을 것 (이 순서)

1. 이 문서
2. `D:/todays-math/docs/planning/21-todays-concept.md` — 특히 §1.2 · §1.3 · §4
3. `D:/todays-math/docs/planning/07-coding-convention.md` 의 **D-123** 행 (맨 끝)
4. 이 저장소의 `README.md` · `PROCESS-GUIDE.md` · `CLAUDE.md`
5. `D:/hyper motion video/docs/LECTURE-QUEUE.md` — **미추적이라 본 체크아웃에만 있다**

## 1. 목표

수맥용 8편(2026-08-03~04)을 만든 **배치 생성기를 결과물에서 되살려 이 브랜치에 커밋한다.**
생성기 코드는 어디에도 남아 있지 않다(21번 §1.3). 입력은 연출 계약 `DIRECTION`, 출력은
`output/final.mp4` + `output/meta.json` 이다. 이 계약이 **오늘의수학 쪽 대본 생성기의 출력 형식**이 된다.

## 2. 재료 — 본 체크아웃에서 **읽기만** (미추적이라 워크트리에는 없다)

`D:/hyper motion video/projects/2026-08-0*__*/` 8편:

| 파일 | 뜻 |
|---|---|
| `docs/DIRECTION.json` | 연출 입력 — **`2026-08-03__prime-composite-lecture` 한 편에만** 있다 |
| `raw/tts/sNN.txt` · `sNN.mp3` · `list.txt` | 장면별 내레이션 글과 합성 음성 |
| `compositions/SNN-*.html` · `captions.html` | 「종이 판서 스타일 v2」 장면 (모눈 바탕 `#f5f1e8`, 연필, 블록, KaTeX, GSAP) |
| `audio/scenes.json` · `narration.*` · `corrections.json` | Whisper 실측 시각과 내레이션 |
| `assets/css/*`(`sumaek-app.css` 포함) · `assets/fonts/*` · `assets/katex/*` | 장면이 부르는 자산 |
| `output/meta.json` | 수맥 폼 규격 메타 (`output/` 은 gitignore) |

이미 커밋된 도구: `scripts/transcribe.py` · `apply-transcript.mjs` · `build-captions.mjs` · `render-all.mjs` ·
`scripts/shortgen/tts.mjs`(edge-tts, 기본 `ko-KR-SunHiNeural`) · `scripts/lib/*` · `templates/`.
미추적 도구: `scripts/upload-youtube.mjs` · `docs/LECTURE-QUEUE.md` · `docs/YOUTUBE-UPLOAD.md`.
파이썬 환경 `.venv` 와 Whisper 모델 `.whisper-models`(약 1.6GB)는 **본 체크아웃에만** 있다 —
절대 경로로 쓰고 복사하지 않는다.

## 3. 할 일

1. **계약부터.** `DIRECTION.json` 한 편과 8편의 장면·내레이션을 맞대어 연출 입력 계약을
   `docs/LECTURE-PIPELINE.md`(설명) + 스키마(JSON Schema 또는 zod)로 못 박는다. 장면 종류
   (hook·define·example·property·note·wrap …), 판서 블록(글·LaTeX 수식), 강조, 내레이션, 시각 힌트,
   고지(`disclosure`), 잡 ID. **필드마다 뜻을 적는다.** 한 편에서만 본 필드는 그렇다고 적는다.
2. **씬 컴파일러.** 계약 → `compositions/SNN-*.html` (+ `captions.html`). 기존 8편과 같은 모양이 나와야 한다.
3. **음성 어댑터 — 갈아 끼울 수 있게.** 목소리가 미정이다(D-123 ⑷).
   - (a) TTS 제공자 인터페이스 — 지금은 edge-tts 구현 하나(비교·회귀용)
   - (b) **사람 녹음** — 파일을 받아 Whisper 로 장면 시각을 맞춘다(기존 transcribe/apply-transcript 재사용)
   - 어느 유료 TTS 도 **고르거나 가입하지 않는다.** 인터페이스 자리만 둔다.
4. **렌더와 meta.json.** HyperFrames 렌더 → `output/final.mp4` + `output/meta.json`.
   meta.json 은 수맥 규약 필드(`lessonTitle`·`fps`·`totalFrames`·`disclosure`·`jobId`·`video_url`·`sortOrder`)를
   유지하되, 오늘의수학 쪽 식별자(차시)는 아직 안 정해졌다 — **빈 칸으로 둘 수 있게** 하고 지어내지 않는다.
5. **회귀.** 되살린 생성기로 **최소 한 편**(권장 `2026-08-03__gcd-concept`)을 다시 만들고, 기존
   `final.mp4` 와 **같은 시각의 프레임**을 뽑아 나란히 비교한다(PNG 를 워크트리 `scratch/` 에).
   재현 못 한 차이는 못 했다고 적는다.
6. **보존.** 미추적 도구 셋(`scripts/upload-youtube.mjs` · `docs/LECTURE-QUEUE.md` · `docs/YOUTUBE-UPLOAD.md`)을
   이 브랜치에 옮겨 커밋한다. 넣기 전에 비밀값이 없는지 본다 — `secrets/` 는 gitignore 이고 **절대 복사하지 않는다.**

## 4. 하지 말 것

- 🔴 **유튜브 업로드·삭제 금지** — `upload-youtube.mjs` 를 실행하지 않는다. 외부 게시다.
- 🔴 **8편의 대본·장면 내용을 커밋하지 않는다** — 원료가 개념원리 본책 정제본이다(D-123 ⑶).
  회귀는 본 체크아웃 경로를 읽는다. 저장소에 넣는 본보기 `DIRECTION` 은 **새로 쓴 합성 예제**로 한다.
- 본 체크아웃(`D:/hyper motion video`)의 파일을 고치지 않는다 — 6월부터의 미커밋 수정이 있다.
- 유료 TTS·외부 API 가입·키 생성 금지. edge-tts 호출은 회귀에 필요한 만큼만.
- 렌더는 **한 번에 하나** — 원장님이 같은 PC 에서 일하신다(CLAUDE.md 절대 규칙 9 의 취지).
- mp4·음성·대용량 산출물 커밋 금지. **푸시 금지** — 리드가 검수 후 병합한다.

## 5. 완료 조건

- 계약 문서 + 스키마 + 생성기(컴파일러 · 음성 어댑터 · 렌더 진입점) 커밋
- 회귀 한 편: 프레임 비교 PNG + 다른 점 목록
- `npm run lint` 통과 · 결정성(`Date.now()`·`Math.random()`·fetch 금지 — README 핵심 규칙)
- 커밋 계정 `Chris <chrismathone@gmail.com>` — 저장소 이력과 같게 `git config --local` 로 건다

## 6. 보고

워크트리 안 **`scratch/REPORT-01-lecture-gen.md`** 에 쓴다(터미널로 보고하지 않는다 — 한글이 깨진다).
되살린 계약 요약 · 기존 8편과 다른 점 · 회귀 비교 결과 · 남은 일 · **리드가 정할 것**.

## 7. 추가 (2026-09-15 리드) — meta.json 의 차시 칸 이름

오늘의수학 쪽 이전 워크트리(`concept-port`)가 `meta.json` 을 읽는 파서를 만들고 있다. 두 쪽 이름을 맞춘다:

- 칸 이름은 **`unitCode`**, 값은 오늘의수학 `Unit.problemCodePrefix`(예 `J10103` = 중1 1단원 3차시).
  **`unitId`(uuid)가 아니다** — uuid 는 사람이 못 읽고 환경마다 다를 수 있다.
- 지금은 **비워 둔다**(필드 생략 또는 `null`). 지어내지 않는다 — 없으면 등록 CLI 가 `--unit=<코드>` 를 요구한다.
- 수맥 규약 칸(`lessonTitle`·`fps`·`totalFrames`·`disclosure`·`jobId`·`video_url`·`sortOrder`)은 그대로 둔다.

## 8. 리드 검수 (2026-09-15) — 병합 전에 하나 고친다

리드가 본 것: 컴파일 회귀를 **직접 다시 돌려** «같음 57 · 다름 0» 재현 · 커밋된 트리에 8편 내레이션 문장 0건 · 비밀값 꼴 0건. 좋다.

🔴 **그런데 회귀가 시각 규칙의 변이를 못 잡는다.** 저장소 밖 사본에서 `align.mjs` 의 `BLOCK.lead` 를 0.1 → **0.12** 로 바꾸고
gcd-concept 를 돌려도 **«같음 9 · 다름 0»** 이었다. 되살리기(`recover`)가 같은 상수로 앵커 단어를 찾다가 못 찾으면
**`at` 고정으로 물러나** 출력을 맞추기 때문이다 — 참 규칙이면 되살린 DIRECTION 의 `at` 이 **0개**, 바꾼 규칙이면 **4개**였다.
그러니 «57/57 같음»은 «컴파일러와 되살리기가 서로 맞는다»이지 «규칙이 맞다»의 증거가 아니다
(20번 교훈 「변이 판정기가 **도장**이었다」 · 「시험을 표본이 다시 구현할 때」의 자리). 규칙의 증거는 **`at` 으로 물러난 수**다.

할 일:
1. `regress.mjs` 가 편마다 **`at` 으로 물러난 수**를 세어 찍고, 기준선(보고서 기준 7편 합 **1** — counting-divisors S05)을
   넘으면 **실패**하게 한다. 기준선은 상수 한 곳에, 이유와 함께.
2. **변이 시험** — 아래를 하나씩 바꿔 회귀가 **빨개지는지** 보고서에 표로: `BLOCK.lead` · `BLOCK.min` · `BLOCK.fallback` ·
   자막 창 크기 4 · 강조 기본 시각(장면 절반) · seed 규칙(장면×10+순번) · 무음 0.6초. 안 빨개지는 것이 있으면 그 규칙은
   회귀가 지키지 못한다고 **적는다**(억지로 초록을 만들지 말 것).
3. 커밋 하나로(푸시 금지). 보고서 §5 에 결과를 더한다.

리드가 정한 것(보고서 §7): **① strict 를 기본으로 채택** — legacy 는 회귀 재현용으로만. ②·③·⑤ 는 영상 화풍·문구·호스팅
결정(21번 §5)과 함께 원장님께 여쭌다 — 지금은 손대지 않는다. ④ 둘 다 받게 둔 지금 모양 그대로.
