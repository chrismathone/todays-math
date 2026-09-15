# REPORT-01 — 강의 생성기 복원 (워크트리 `lecture-gen`, 2026-09-15)

> 브리프: `D:/todays-math/docs/planning/tracks/briefs/todays-concept-lecture-gen.md` (§7 추가 지시 포함).
> 계약 문서: `docs/LECTURE-PIPELINE.md` · 스키마: `schemas/lecture-direction.schema.json` · 코드: `scripts/lecture/`.
> 이 폴더(`scratch/`)는 gitignore — 8편 원료에서 나온 되살린 DIRECTION·프레임·렌더가 들어 있다. **커밋하지 않았다.**

## 0. 한 줄

8편 결과물에서 생성기 규칙을 역산해 되살렸다. 되살린 컴파일러로 배치 7편을 다시 컴파일하면 **장면·자막 파일 57개가 글자 하나 다르지 않다.**
단 이 57/57 은 「컴파일러와 되살리기가 서로 맞는다」까지다(리드 검수) — **규칙의 증거는 되살리기가 못 박은 수와 경계 검산**이고,
그 판정을 regress 에 넣어 역산 규칙 7개를 하나씩 비틀면 모두 빨개지는 것을 확인했다(§5.1).
gcd-concept 한 편은 음성부터 렌더까지 새로 돌려 기존 final.mp4 와 같은 시각 프레임을 비교했다(§4).

## 1. 커밋한 것 (브랜치 `chrismathone/lecture-gen`, 푸시 안 함)

커밋 계정 `Chris <chrismathone@gmail.com>` (`git config --local` 로 다시 걸어 둠).

| 커밋 | 내용 |
|---|---|
| `d3ba81a` refactor(scripts) | 전사 단어 매칭 규칙 → `scripts/lib/transcript-match.mjs` (apply-transcript 와 공용, 출력 불변 확인) |
| `f5f1cc7` feat(scripts) | `transcribe` 가 `HMW_PYTHON` · `HMW_WHISPER_MODELS` 를 읽는다 — 워크트리에서 본 체크아웃 venv·모델을 절대 경로로 (복사 없음) |
| `79d2ac1` chore | **보존 3종** `scripts/upload-youtube.mjs` · `docs/LECTURE-QUEUE.md` · `docs/YOUTUBE-UPLOAD.md` (원본과 줄바꿈만 다름) + `.gitignore` 에 `secrets/`·`scratch/` |
| `599e0ba` feat(lecture) | **계약** `schemas/lecture-direction.schema.json` · `docs/LECTURE-PIPELINE.md` · 합성 예제 `templates/lecture/DIRECTION.example.json` |
| `be3a919` feat(lecture) | **생성기** `scripts/lecture/`(컴파일러·시각 맞춤·음성 어댑터·렌더·meta·되살리기·회귀·프레임 비교·자체 점검) · 화풍 팩 `shared/lecture/paper-v2/` · KaTeX `shared/vendor/katex/` · `npm run lecture` / `lecture:check` / `upload` · README 안내 |
| `082399d` fix(lecture) | 프레임 비교 — 영상 끝 넘는 컷 건너뛰기, `--scenes-new`(장면 자리 맞춰 비교). 문서 strict 설명 보정 |
| `8674200` fix(lecture) | **리드 검수 대응(브리프 §8)** — 역산 규칙을 `align.mjs` 한 곳으로 · regress 판정에 `at`·`seed` 못 박은 수(기준선 `BASELINE`)와 경계 검산 · `mutation-test.mjs` · 문서 §6.5, strict 기본 채택 기록 (§5.1) |

8편의 대본·장면 내용은 커밋하지 않았다 — 화풍 틀은 내용을 걷어 낸 것(스크립트로 「수맥·공약수·S02…」 문자열이 남지 않았는지 확인), 합성 예제는 새로 썼다.
mp4·음성·렌더 산출물 커밋 없음. 푸시 안 함.

## 2. 되살린 계약 요약 (자세히: `docs/LECTURE-PIPELINE.md`)

- **한 편** = `jobId` · `slug` · `title`(+`subtitle`) · `disclosure` · `ids{unitCode, conceptSlug, pageId, sortOrder}` · `source` · `vocabulary` · `terms` · `scenes[]`.
- **장면** = `id`(SNN-이름) · `kind`(hook·define·example·property·method·note·caution·wrap — 뜻 표시) · `narration[]`(**자막 한 줄 단위**, 음성은 공백으로 이어 읽음) · `blocks[]` · `emphasis[]` · `layout.scale`(선택).
- **판서 블록 7종** = definition · callout(example/note/caution/highlight + 사용자 딱지) · list · steps · paragraph · math · table(grid/ladder). 판서 글은 `$…$` 인라인 TeX, `\n` 줄바꿈.
- **강조** = `kind`(ul/hl/circle) · `block` · `find`(화면 글자 그대로) · `anchor` · `dur` · `tone`(warn=붉은 연필) · `pad` · `why` · `seed`.
- **시각 힌트(cue)** = 내레이션에서 복사한 구절(`anchor`, `occurrence`) 또는 장면 기준 초(`at`, 파일럿 방식). 블록 = 앵커 −0.10(≥0.15, 없으면 0.20), 항목·행 = 앵커, 강조 = 앵커(없으면 장면 한가운데).
- **meta.json** = 수맥 규약 칸 그대로 + `unitCode`(= `Unit.problemCodePrefix`, 지금 null) + `video_url: null`.
  리드 추가 지시(브리프 §7) 반영 — 처음 `unitId` 로 두었던 칸을 스키마(`ids.unitCode`)·meta.json·되살리기 모두 `unitCode` 로 바꿨다. uuid 아님, 값을 지어내지 않는다.
- 필드마다 「8편 어디서 봤나」를 문서 §2~§5 표에 적었다. **한 편에서만 본 필드**: `model`·`pad`·`why`·callout `highlight`·`hookLabel` 다른 값(모두 파일럿), grid 표(counting-divisors). 새로 둔 필드: `version`·`unitCode`·`seed`·`occurrence`·`at`(파일럿 `t` 를 옮긴 것)·`layout.scale`·`terms`.

### 역산으로 확정한 규칙 (근거 수치)

| 규칙 | 근거 |
|---|---|
| 장면 시작 = 앞 TTS 조각 길이 + 무음 0.6초 누계 | 8편 모두 `raw/tts/sNN.mp3` 길이 합과 일치 |
| 마지막 장면 끝 = max(음성 길이, 마지막 단어 끝 + 0.2), totalFrames = ⌈끝×30⌉ | 8편 meta.json 8개 모두 일치 |
| 자막 = 대본 줄 그대로, 시각은 느슨한 일치 + 앞 4단어 창, −0.08/+0.12, 간격 0.04, 최소 0.6초, 못 찾은 줄은 글자당 0.09초 | 8편 CAPTIONS.md 193줄 중 193줄 재현(창 크기 1~30 중 4 가 유일한 최적) |
| 블록 −0.10(≥0.15)/0.20 · 항목 = 앵커 · 강조 = 앵커 또는 장면 절반 · seed = 장면×10+순번 | 배치 블록 43 · 항목 21 · 강조 76 모두 설명됨 |
| 자막 금색 용어 = 정의 용어 + 사용자 딱지, 줄마다 가장 긴 것 하나 | 8편 `hl:` 전부 |
| 수식 = KaTeX 0.16.47, `\displaystyle ` 앞붙임 | 화면 수식 266개 되그림이 글자 단위로 같음 |
| 장면 틀(머리 CSS·손그림 함수) | 배치 43장면 모두 글자 단위로 같음 → `shared/lecture/paper-v2/scene.html` |

## 3. 기존 8편과 다른 점

**생성기 설계에서 달라진 것 (의도)** — 문서 §9
1. 강조 `find` 가 화면에 없으면 **검사 오류**. 8편은 조용히 뺐다 — exponent S05(기록에 있음)에 더해 **lcm-methods S05 에서도 한 건 빠졌던 것을 이번에 찾았다**(seed 50 자리가 비어 있음).
2. 시각 기본값 **strict**(장면마다 그 장면 대본 토큰 ↔ 그 장면 전사 단어 DP 정렬). legacy 는 회귀용으로 남김. 8편 원래 전사로 두 방식을 비교하면 블록·강조 시각은 7편 모두 같고, 자막만 달라진다 — legacy 의 결함(gcd-concept S03 한 줄 17.1초 → 실제 발화 길이 12.0초, counting-divisors 「표에 나온…」 10.8초 → 정상)이 사라진다.
3. 카드 배율 — `layout.scale` 또는 새 추정식. 8편 원래 산식은 **역산 실패**(TeX 소스 길이와 r²≈0.61). 새 추정식은 8편 43장면 크롬 실측 높이로 보정해 평균 오차 1.6px, 최대 과소추정 9%.
4. 한 파일 녹음·장면별 녹음 모드, `docs/SCRIPT.md`(녹음 대본)·`docs/ALIGNMENT.md`(시각 맞춤 보고) 새로.
5. 장면 파일과 index 의 장면 길이를 같은 수에서 낸다(8편 gcd-concept S06 은 15.17/15.16 으로 달랐다).

**재현하지 못한 것** — 문서 §9
1. 원래 생성기 코드·배치 DIRECTION 7편 — 결과물에서 되살림. 원래 앵커 구절은 알 수 없다(되살린 앵커는 1~4토큰, 한 곳만 `at` 고정: counting-divisors S05).
2. 음성 조립 — `sNN.mp3` → `narration-tts.wav` 를 표본 단위로 같게 못 만든다(지연 0, 신호 비례 오차 RMS≈169/32768; concat·soxr·필터 크기 바꿔도 같음). 그래서 Whisper 를 다시 돌리면 단어 시각이 조금 달라진다(아래 §4).
3. 카드 배율 산식(위 3).
4. 파일럿(prime-composite)의 손으로 짠 장면 — 자연수 세 갈래 그림, 체 지우기 애니메이션, 메모. 계약 밖(파일럿 DIRECTION.json 이 다룬 것은 강조 목록뿐이고, 그 필드는 계약에 모두 들어갔다).

## 4. 회귀

### 4.1 컴파일 회귀 — 배치 7편 전부

`node scripts/lecture/regress.mjs <7편> --out scratch/regress/compile` — 되살린 DIRECTION + 원래 `audio/scenes.json`(legacy 시각) → 다시 컴파일 → 원래 파일과 글자 비교.

| 편 | 장면 | 장면 파일 | captions.html | CAPTIONS.md |
|---|---:|---|---|---|
| counting-divisors | 7 | 7/7 같음 | 같음 | 같음 |
| exponent-notation | 5 | 5/5 | 같음 | 같음 |
| gcd-concept | 7 | 7/7 | 같음 | 같음 |
| gcd-methods | 6 | 6/6 | 같음 | 같음 |
| lcm-concept | 5 | 5/5 | 같음 | 같음 |
| prime-factorization | 7 | 7/7 | 같음 | 같음 |
| lcm-methods | 6 | 6/6 | 같음 | 같음 |
| **합** | 43 | **57/57 글자 단위로 같음** | | |

되살린 DIRECTION 7편 모두 계약 검사 통과(오류 0). 로그: `scratch/regress/compile.log`, 파일: `scratch/regress/compile/<slug>/`.
리드 검수 뒤 판정이 더해졌다 — 참 규칙에서 `at` 고정 합 1(counting-divisors S05) · `seed` 고정 합 2(lcm-methods S05) · 경계 불일치 0, 판정 통과(§5.1).

### 4.2 끝에서 끝 — gcd-concept (A: 원래 음성 조각 + legacy)

`npm run lecture -- build <되살린 DIRECTION> --recording-dir <원래 raw/tts> --timing legacy` → 원래 `s01~s07.mp3` 를 장면별 녹음으로 넣고 무음 0.6초로 잇기 → extract-audio → **Whisper 다시** → 컴파일 → lint → 렌더.

- Whisper: 원래 153단어 / 새로 158단어, 같은 단어 152개 중 시작 시각이 똑같은 것 103개, 차이 중앙값 0초 · 95% 0.36초 · 최대 1.44초.
- 장면 파일: S01·S03 글자 단위로 같음. 나머지 5장면은 시각 숫자만 다름 — 블록 2곳(S02 +0.23s, S05 +1.26s)·강조 5곳(대부분 ±0.02s, S06 −1.16s). 원인은 모두 새 전사의 단어 시각.
- 자막: 문구·강조 같음, 시각만 새 전사 따라 이동. index.html: 끝 121.48→121.49, S07 시작 99.95→99.96(원래 것은 누계 반올림 흔적).
- lint 오류 0 · 경고 9 (원래 프로젝트 사본을 같은 CLI 로 lint 해도 오류 0 · 경고 9, 같은 종류).
- 렌더: `hyperframes render`(standard, 30fps, 3 workers, 브라우저 = ms-playwright chrome-headless-shell) 3분 23초, 7.4MB, 121.50초 · **3645 프레임 = meta.totalFrames 3645 = 원래 meta 3645.**
  원래 영상과 코덱 같음(h264 High yuv420p + AAC 48k). 렌더 로그의 `404 /assets/media/KaTeX_Main-Regular…ttf` 는 수맥 CSS 가 적어 둔 폰트 경로라 원래도 났을 것이고 화면에 영향 없음(KaTeX 폰트는 katex.min.css 가 싣는다).
- 프레임 비교 — 장면마다 3컷(카드 등장 뒤 · 가운데 · 끝 0.4초 전) 21컷, `scratch/regress/frames-A/t{초}.png`(왼쪽 원래 · 오른쪽 새것), 표 `frames-A/frames.md`:

| 결과 | 컷 | 설명 |
|---|---:|---|
| 사실상 같음 (SSIM 0.995~0.998, PSNR 42~45dB) | 17 | 카드·블록·밑줄·동그라미·형광펜·자막이 같은 자리·같은 모양. 남은 차이는 인코딩 잡음 수준 |
| 조금 다름 (SSIM 0.993) | 1 | 22.96s — S02 둘째 정의 블록이 0.23초 늦게 떠서 페이드 끝자락 |
| 다름 (SSIM 0.96~0.98) | 3 | 1.50s — 자막 2번이 0.3초 늦게 바뀜 · 75.83s — S05 「예」 블록과 그 자막이 1.26초 늦게(원래 전사는 「예를」 을 쉼 앞에 붙였고 새 전사는 실제 발화 자리에 붙임) · 110.73s — 마무리 자막이 먼저 뜸 |

**재현 못 한 차이** = 위 4컷. 원인은 모두 Whisper 단어 시각(원래 음성 조립을 표본 단위로 재현 못 해 전사가 조금 달라짐). 컴파일러 차이는 0 — §4.1 과 같은 전사를 넣으면 글자 단위로 같다.

### 4.3 끝에서 끝 — gcd-concept (B: edge-tts 새 합성 + strict + 새 배율)

A 와 같은 되살린 DIRECTION 에서 `layout.scale` 만 지우고(새 배율 추정식), `--tts edge-tts --timing strict` 로 음성부터 새로 만들었다 — **새 강의를 만들 때의 기본 경로**. edge-tts 호출은 장면 7번(이 회귀 한 번)뿐.

- **edge-tts 가 8월과 다르다**: 같은 글(7/7 같음)·같은 목소리(`ko-KR-SunHiNeural`, +0%)·같은 형식(24kHz 48kbps)인데 장면마다 10~21% 짧다(0.79~0.90배). 한 편 121.32s → 102.91s.
- Whisper 154단어, strict 정렬 대본 토큰 153개 중 147개 짝. 자막 27줄, 끝 102.91s(3088 프레임), lint 오류 0 · 경고 9.
- 새 배율: 7장면 모두 2.35 (8편은 S03 1.4, S05 1.74 였다).
- 렌더 3분 14초, 6.7MB, 102.93s · 3088 프레임 = meta.totalFrames.
- 프레임 비교 두 벌:
  - **같은 시각**(브리프 방식, `scratch/regress/frames-B-same-time/`) — 19컷(2컷은 새 영상이 짧아 건너뜀), SSIM 0.875~0.995. 음성이 빨라 장면이 앞당겨졌으니 같은 시각이면 다른 장면·다른 자막이 보이는 것이 정상.
  - **같은 장면 자리**(`frames-B-same-scene/`, 새 영상은 자기 장면 기준 같은 자리) — 21컷. S01·S02·S06 과 S04·S07 대부분 SSIM 0.99 이상 = 판서(블록·밑줄·동그라미·형광펜·배치) 같음.
    낮은 컷은 두 갈래: ① S03·S05 카드가 커짐(1.4/1.74 → 2.35, 의도한 변경 — 작던 예 블록이 읽을 만해짐) ② 장면 안 말 빠르기가 달라 그 자리에 떠 있는 자막·「예」 블록이 다름(음성 차이).

### 4.4 한 파일 녹음 경로 — gcd-concept (C: 원래 `narration-tts.wav` 를 한 파일 녹음으로)

사람 녹음 실물이 없어, 8월 TTS 를 이은 원래 wav 한 개를 `--recording` 으로 넣었다(장면 조각 정보 없이 — 사람이 한 번에 녹음한 경우와 같은 조건). strict, 렌더는 안 함.

- Whisper 결과가 원래 `audio/narration.json` 과 **바이트 단위로 같다** — 같은 wav 면 전사도 같다(결정적). 그러니 A 의 시각 차이는 전부 음성 조립 차이에서 왔다.
- 대본 정렬로 찾은 장면 경계 vs 실제 조각 경계:

| 장면 | 실제(TTS 조각) | 찾은 경계 | 차이 |
|---|---:|---:|---:|
| S01 | 0 | 0 | 0 |
| S02 | 17.02 | 17.10 | +0.08 |
| S03 | 28.90 | 28.14 | −0.76 |
| S04 | 51.48 | 51.52 | +0.04 |
| S05 | 66.86 | 66.62 | −0.24 |
| S06 | 84.79 | 84.49 | −0.30 |
| S07 | 99.96 | 99.15 | −0.81 |

  찾은 경계는 모두 장면 사이 쉼 안이다(다음 장면 첫 단어 0.3초 전, 앞 장면 마지막 단어 뒤). 차이가 큰 S03·S07 은 Whisper 가 첫 단어 시작을 쉼 안쪽으로 당겨 잡은 곳 — 화면이 말보다 조금 먼저 바뀔 뿐 말이 잘리지 않는다.
- strict 정렬 대본 토큰 153개 중 147개 짝, 자막 27줄, 끝 121.49s(3645 프레임), lint 오류 0 · 경고 9.
- 원장님 실녹음(의역·쉼·말 더듬)은 아직 안 해 봤다 — §6-2.

## 5. 검증

- `npm run lint`(= hyperframes lint) — A·B·C 프로젝트와 합성 예제 모두 오류 0 (경고는 8편과 같은 종류: `caption_exit_missing_hard_kill`·`timeline_track_too_dense`). 워크트리에 node_modules 가 없어 본 체크아웃 CLI(`HYPERFRAMES_CLI`)로 돌렸다.
- 렌더는 한 번에 하나씩 두 번(A, B). Whisper 도 렌더와 겹치지 않게 차례로 돌렸다.
- `npm run lecture:check` — 합성 예제 계약 검사 → 합성 시각으로 strict 컴파일 → index·meta → lint 오류 0 → 결정성(`Date.now`·`performance.now`·`Math.random`·`fetch`·`XMLHttpRequest` 없음) 통과. 컴파일 단계도 산출 파일에 이 문자열이 있으면 멈춘다.
- `apply-transcript.mjs` 를 공용 매칭 모듈로 바꾼 뒤 기존 프로젝트(square-root-concept 사본)에서 전후 출력(triggers·scenes·TRANSCRIPT·CAPTIONS·STORYBOARD·로그) 모두 같음.
- 보존 3종 비밀값 검사 — `client_secret`·토큰·API 키 꼴 문자열 0건. `secrets/` 는 복사하지 않았고 `.gitignore` 에 넣었다.

### 5.1 리드 검수 대응 (브리프 §8) — 회귀가 규칙을 지키는가

**지적**: 되살리기(`recover`)가 컴파일러와 같은 상수로 앵커를 찾다 못 찾으면 `at` 으로 물러나 출력을 맞추므로, 57/57 같음은 규칙의 증거가 아니다.
리드가 `BLOCK.lead` 0.1→0.12 로 비틀어도 gcd-concept 는 「같음 9 · 다름 0」이었다(참 규칙 `at` 0 → 비튼 규칙 `at` 4).

**고친 것** (커밋 하나, §1):
1. 역산 규칙을 `align.mjs` 머리 한 곳에 모았다 — `BLOCK`·자막 창·`EMPHASIS.fallback`(강조 기본 시각)·`SEGMENT_GAP`(무음)·`emphasisSeed`(seed).
   전에는 강조 기본 시각·seed·무음이 compile·recover·voice 에 따로 적혀 있어 「규칙 하나를 비튼다」가 성립하지 않았다.
2. `regress.mjs` 판정 — ① 파일 글자 비교 ② **편마다 `at` 으로 물러난 수**를 찍고 기준선을 넘으면 실패(지시 1) ③ 같은 원리로 `seed` 를 못 박은 수
   ④ 경계 검산: 원래 TTS 조각 길이 + 무음 누계 = 원래 `scenes.json` 시작·장면 길이, 끝 = max(음성, 마지막 단어 + 0.2), ⌈끝×30⌉ = meta.totalFrames.
   기준선은 `regress.mjs` 의 `BASELINE` 한 곳에, 까닭과 함께:
   - `at` counting-divisors **1** (7편 합 1, 보고서 기준 그대로) — S05 동그라미 「8개」(22.86s). 앵커가 될 내레이션 구절이 「8개입니다」뿐인데 느슨한 일치가
     장면 앞 「99입니다.」(편집거리 2)에 먼저 걸린다. 8편 생성기가 이 시각을 어떻게 풀었는지는 결과물로 알 수 없다.
   - `seed` lcm-methods **2** — S05 첫 강조를 8편 생성기가 화면 글자 불일치로 빼서, 남은 둘이 seed 51·52(규칙대로면 50·51).
   - 기준선보다 적게 나오면 실패는 아니고 「기준선을 낮출 것」을 찍는다.
3. `scripts/lecture/mutation-test.mjs` — 저장소 일부를 OS 임시 폴더에 복사해 규칙 한 줄만 바꾸고 사본의 regress 를 돌린다(이 저장소 파일은 안 건드림).
   바꿀 문자열이 파일에 정확히 한 번 있는지 확인하고 건다(아무것도 안 바꾼 채 초록이 나오는 일을 막으려고).

**변이 시험** — 배치 7편 전체로. 빨강 = regress 실패(규칙 변이를 잡음), 초록 = 통과(못 잡음).

| 비튼 규칙 | ① 파일 비교 + ② `at` 수 (지시 1 까지) | ①~④ 모두 (지금 커밋) | 걸린 곳 |
|---|---|---|---|
| 대조 — 바꾸지 않음 | 초록 ✓ | 초록 ✓ | 같음 57 · `at` 1 · `seed` 2 · 경계 불일치 0 |
| `BLOCK.lead` 0.10 → 0.12 | 빨강 | 빨강 | `at` 합 26 (7편 모두 넘음, gcd-concept 4 = 리드 관찰과 같음). 파일 차이 0 — 되살리기가 다 맞춰 버림 |
| `BLOCK.min` 0.15 → 0.17 | 빨강 | 빨강 | 파일 다름 10 + `at` 합 11 |
| `BLOCK.fallback` 0.20 → 0.22 | 빨강 | 빨강 | `at` 합 8 (3편). 파일 차이 0 |
| 자막 창 4 → 5 | 빨강 | 빨강 | 파일 다름 4 (자막). 되살리기는 자막 시각을 쓰지 않아 못 맞춘다 |
| 자막 창 4 → 3 | 빨강 | 빨강 | 파일 다름 4 |
| 강조 기본 시각 장면×0.5 → ×0.45 | 빨강 | 빨강 | `at` 합 6 (3편). 파일 차이 0 |
| seed 장면×10+순번 → +1 | **초록 — 못 잡음** | 빨강 | `seed` 고정 합 70 (기준선 2). 파일 차이 0 — 되살리기가 seed 를 전부 못 박음 |
| 무음 0.6 → 0.62초 | **초록 — 못 잡음** | 빨강 | 경계 불일치 79곳. ①②는 원래 `scenes.json` 을 그대로 써서 무음 규칙이 아예 안 쓰인다 |

- 지시 1(`at` 수)만으로는 **seed 규칙과 무음 0.6초를 회귀가 지키지 못했다.** 둘은 같은 원리(못 박은 수)와 독립 증거(원래 TTS 조각 길이)로 판정을 더해 빨개지게 했다 —
  규칙 값을 직접 단정하는 검사는 넣지 않았다. 더한 두 판정이 과하다고 보면 `regress.mjs` 의 ③④ 를 빼면 된다(그러면 위 두 줄은 다시 초록).
- 7개 모두 **파일 글자 비교만으로 잡힌 것은 자막 창·`BLOCK.min` 셋뿐**이다. 나머지는 되살리기가 출력을 맞춰 버려 못 박은 수로만 잡힌다.
- 변이 폭은 리드와 같은 크기(+0.02 안팎)로 잡았다. **목록 밖 규칙은 돌리지 않았다** — 자막 lead/tail/간격/최소 길이, 못 찾은 줄 글자당 0.09초,
  느슨한 일치 임계값, 끝 +0.2초(경계 검산에 들어 있지만 변이로 확인 안 함).
- 대조 regress 는 저장소에서 따로 한 번 더 돌려 통과(종료 코드 0). `npm run lecture:check`(음성 없이 컴파일 → lint 오류 0 → 결정성)도 다시 통과.
- 로그: `scratch/regress/mutation-round1.log`(①② 까지) · `mutation-round2.log`(①~④) · `compile.log`(대조).

## 6. 남은 일

1. **오늘의수학 쪽 연결** — 대본 생성기(D-32 DeepSeek)가 이 스키마로 `DIRECTION` 을 내게 하고, 「원문에 없는 숫자 0건」 관문을 그쪽에 둔다(8편 기록상 생성기 앞단 거름망). `meta.json` 파서(`concept-port`)는 이번 `unitCode`·`video_url:null` 모양을 읽으면 된다.
2. **목소리 ④** — 유료 TTS 가 정해지면 `--voice-module` 로 끼울 모듈 하나(가입·키는 그때). 원장님 실녹음으로 한 파일·장면별 두 모드를 한 번씩 돌려 볼 것(이번엔 TTS wav 로 흉내만 — §4.4).
3. **카드 배율 추정식** — 8편 43장면(정의·예·목록·표 위주)으로만 보정했다. 긴 수식·큰 표가 많은 차시(고등)에서 한 번 더 실측 보정.
4. **hyperframes lint 경고 9건** — 8편과 같은 두 종류(연필 사라짐을 자막 퇴장으로 오인하는 `caption_exit_missing_hard_kill`, 자막 27줄 한 파일의 `timeline_track_too_dense`). 무해. 없애려면 8편 모양에서 벗어난다.
5. **GSAP 을 CDN(jsdelivr)에서 받는다** — 8편·이 저장소 모든 장면과 같음. 렌더 PC 가 오프라인이면 렌더가 깨진다. 필요하면 로컬 벤더링.
6. **워크트리 실행 조건** — 이 PC 는 `~/.cache/hyperframes/chrome` 이 없어 `HYPERFRAMES_BROWSER_PATH`(ms-playwright 헤드리스 셸)를 줘야 렌더된다. 워크트리에는 `node_modules` 가 없어 본 체크아웃 CLI 를 `HYPERFRAMES_CLI` 로 썼다. 병합 후 본 체크아웃에서는 `npm install` 된 CLI 를 그대로 쓴다.
7. **8편 원본 폴더는 여전히 본 체크아웃에만 미추적**(21번 §1.3 디스크 위험) — 원료 문제로 이 저장소에 못 넣는다. 별도 백업 자리가 필요하다.
8. 채널 정리(LECTURE-QUEUE 의 구판 9개 삭제·lcm 2편 재업로드)는 손대지 않았다 — 업로드·삭제 금지.

9. **변이 시험 목록 밖 규칙**(§5.1) — 자막 상수·못 찾은 줄 0.09초·일치 임계값·끝 +0.2초는 변이로 확인하지 않았다. `mutation-test.mjs` 의 `MUTANTS` 에 한 줄씩 더하면 된다.

## 7. 리드가 정할 것

> **리드 결정 (브리프 §8, 2026-09-15)** — ① **strict 를 기본으로 채택**, legacy 는 회귀 재현용으로만(코드 기본값이 이미 strict, 문서 §6.3 에 적음).
> ②·③·⑤ 는 영상 화풍·문구·호스팅 결정(21번 §5)과 함께 원장님께 여쭌다 — 손대지 않았다. ④ 둘 다 받게 둔 지금 모양 그대로.
> 아래는 처음 올린 목록(기록용).


1. **시각 기본값** — strict(새, 자막이 실제 발화에 붙음) 채택? legacy 는 회귀 재현용으로만 남길지. (추천: strict)
2. **카드 배율** — 새 추정식(8편보다 카드가 커져 긴 예 블록도 2.35 까지) vs 8편 모양 유지(`layout.scale` 로 1.4 등 고정). 화풍 결정(D-07)과 같이 볼 것.
3. **머리글·문구** — 8편은 머리글 「수맥 · 제목」, 첫 카드 라벨 「개념 공부」, 고지 「선생님이 검수한 AI 보충 강의입니다.」. 오늘의수학에서 `brand`(없으면 제목만)·`hookLabel`·`disclosure` 를 무엇으로 할지 — 계약은 값을 받기만 한다. 합성 예제는 `brand: null`.
4. **`unitCode` 를 채우는 쪽** — DIRECTION 을 쓰는 대본 생성기가 넣을지, 등록 CLI 가 `--unit` 으로 넣을지. 지금 계약·meta 는 둘 다 받게(비워 두면 null) 해 두었다.
5. **업로드 도구의 수맥 문구** — `upload-youtube.mjs` 가 설명란에 「수맥(Su-Maek) 학습 자료용으로 자동 업로드된 강의 영상입니다.」를 박아 넣는다. 보존 지시대로 그대로 커밋했다 — 오늘의수학용으로 바꿀지는 호스팅 결정(21번 §5.3)과 함께.
6. **edge-tts 는 대조군에도 조심** — 같은 글·같은 목소리로 다시 합성하니 장면마다 10~21% 빨라졌다(§4.3). 기존 8편과 나란히 볼 때는 8월 음성(`raw/tts/sNN.mp3`)을 `--recording-dir` 로 재사용하는 것이 공정하다.
