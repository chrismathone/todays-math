# 문항별 듣기 음원 — 절단점의 실측 무음

`src/lib/english/listening/media/audioBoundary.ts` 의 쓰임새와, 고정 20클립(`ebsi-high-1-2022-2`)에 대어 본 결과다.
독립 감사 `docs/operations/reviews/english-listening-question-audio-claude-20261004.md` 의 B2(«앞뒤 400ms 무음»은 VAD 여백을 되읽은 값이다)를 닫기 위한 측정 모듈이다.

**이 모듈은 재기만 한다.** 음원을 자르지 않고, 파일 · DB · Storage 에 쓰지 않는다. 문턱은 결정적 측정 정책이지 사람 청취 검수가 아니고, 문턱보다 작은 말소리가 없다는 보증도 아니다.

## 1. 정책 — `native-pcm16-max-channel-rms-v1`

| 항목 | 값 | 비고 |
| --- | --- | --- |
| 읽는 것 | `planListeningSampleClip(source, start, end).read()` | 클립을 만드는 바로 그 PCM16 스트림. 다른 디코더 · 리샘플 없음 |
| 창 | 20ms | 프레임 수는 올림(48kHz 960 · 44.1kHz 882 · 11.025kHz 221) |
| 수준 | 채널별 실효값 가운데 **큰 쪽** | 좌우를 더하면 위상이 반대인 소리가 0 이 된다 |
| 조용함 | −60 dBFS **이하** | 제곱합 ≤ `floor(32768² × 프레임 ÷ 10⁶)` — 정수 비교. 파일에 맞춰 바꾸지 않는다 |
| 가장자리 | 첫 50ms · 마지막 50ms 가 조용 | 창이 조용해도 가장자리가 넘을 수 있어 따로 잰다 |
| 안쪽 여유 | 절단점에서 안으로 조용한 창이 400ms 이상 이어짐 | 380ms 는 400ms 가 아니다 |
| 후보 범위 | 원래 절단점에서 ±1.5초 | 20ms 격자(원래 절단점 기준) |

상수는 `LISTENING_BOUNDARY_POLICY` 하나이고 인자로 못 바꾼다. 잡음 바닥이 −60 dBFS 위인 파일은 조용한 창이 없어 `uncertain` 으로 남는다 — 문턱을 내려 통과시키지 않는다.

## 2. 함수 둘

### `measureListeningBoundaryQuiet(source, { startFrame, endFrame })`

돌려주는 것: `source`(`pcmSha256` · `sampleRate` · `channels` · `frameCount`) · `range` · `policy`(상수 + 이 표본률의 프레임 수) · `windows`(전체 창 수 · 조용한 창 수) · `leading` / `trailing`(`quietWindows` · `quietFrames` · `quietMs`(내림) · `edgeFrames` · `edgeRmsDbfs`(소수 둘째 자리, 디지털 무음은 `null`) · `edgeQuiet`) · `status` · `reasons`.

| `status` | 뜻 |
| --- | --- |
| `measured_quiet` | 사유 없음. 양쪽 가장자리가 조용하고 양쪽 안쪽 여유가 400ms 이상 |
| `rejected` | 조용한 창은 있는데 절단점이 기준을 못 넘음 |
| `uncertain` | 이 정책으로 판단할 수 없음(`no_quiet_window` · `range_too_short`) |

사유: `range_too_short` · `no_quiet_window` · `no_audible_window` · `leading_edge_above_threshold` · `leading_quiet_below_minimum` · `trailing_edge_above_threshold` · `trailing_quiet_below_minimum`.
`rejected` 와 `uncertain` 은 둘 다 자르면 안 된다. 잘못된 범위 · 정본이 아닌 WAV · 잘린 스트림은 `planListeningSampleClip` 과 같은 오류를 던진다.

### `findListeningBoundaryRefinement(source, { startFrame, endFrame, anchors?, previous?, next? })`

읽기 전용 후보 찾기다. 원래 범위를 재고, 양쪽 절단점마다 하나를 정한 뒤, **후보를 같은 `measureListeningBoundaryQuiet` 로 다시 재서** 통과할 때만 `candidate` 로 낸다.

| 쪽의 `action` | 조건 |
| --- | --- |
| `unchanged` | 그쪽이 이미 기준을 넘고 앵커가 안에 있다 |
| `extended_through_measured_quiet` | 절단점이 조용한 곳에 있다. 실측으로 조용한 창만 지나 400ms 가 될 때까지(또는 앵커가 들어올 때까지) **넓힌다**. 줄이지 않는다 |
| `extended_to_complete_boundary_sound` | 절단점이 소리 안에 있다. 그 소리가 끝나고 400ms 조용한 곳까지 넓힌다(±1.5초 · 이웃 범위 안에서) |
| `moved_inside_unanchored_boundary_sound` | 그 소리를 범위 안에서 끝낼 수 없을 때만. **앵커가 주어졌고, 모든 앵커가 그 소리보다 먼저 끝나고, 남기는 쪽과 그 소리 사이에 실측 400ms 조용한 구간이 있을 때** 그 구간 끝으로 옮긴다. 빼는 구간은 `removedAudible` 에 적힌다 |
| `held` | 위 어느 것도 안 됨. 사유가 붙는다 |

보류 사유: `audible_before_minimum_quiet`(400ms 가 되기 전에 다음 소리) · `source_or_scan_limit` · `boundary_sound_not_completed_within_bound` · `anchor_inside_boundary_sound` · `no_measured_quiet_run_within_bound` · `refinement_bound_exceeded` · `neighbor_or_source_limit` · `range_shorter_than_window`. 후보가 재측정에서 떨어지면 `candidate_<측정 사유>` 로 보류된다.

- `anchors` — 의미가 확인된 첫 · 마지막 발화의 원음 프레임 구간(ASR 추정 시각을 `floor` / `ceil` 로 옮긴 것). 전부 후보 안에 있어야 한다. **앵커 없이는 들리는 소리를 빼지 않는다.**
- `previous` / `next` — 이웃 클립의 범위. 후보는 들어가지 않고, 원래 범위가 이미 겹쳐 있으면 보류다.
- `scan` — 쪽마다 훑은 창의 제곱합(시간 순, 정수). 판단의 원자료다.
- 고정 길이로 자르거나, 이벤트 섬을 그냥 줄이거나, 문턱을 낮추는 경로는 없다.

## 3. 붙일 자리(root)

`loadListeningQuestionAudioPlan` 에서 `planListeningSampleClip` 으로 클립을 정한 직후, DB · Storage 호출 전에 `measureListeningBoundaryQuiet(source, { startFrame, endFrame })` 를 부르고 `measured_quiet` 가 아니면 중단한다. 보고에는 VAD 여백(`leadingSilenceMs` 로 불리던 값)과 실측값(`leading.quietMs` · `trailing.quietMs` · `edgeRmsDbfs`)을 **다른 이름으로** 같이 적는다.

후보는 제안이다. 적용은 새 정렬 · 새 스냅샷 · 전체 증명을 다시 거쳐야 한다. 특히 아래 §4 의 «끝을 안으로 옮긴» 11개는 여백 붙은 VAD 이벤트 **안**을 자른다(VAD 가 문항 사이 신호음의 첫 0.66~0.72초를 발화로 잡았다). 지금의 «clip cuts a real speech event» 규칙과 부딪히므로, 어느 근거를 우선할지는 root 가 정한다.

## 4. 고정 20클립에 대어 본 결과 (2026-10-04)

원본을 `decodeListeningMp3Pcm` 으로 끝까지 풀어(PCM SHA `fcf73e6f1fe64534003cdd4f905ed2a6a78eb410be472073e6a07e4b8ddb6ded`, 48kHz · 2채널 · 60,758,667프레임) 쟀다. 20개 원래 범위의 클립 SHA 는 `apply.json` 과 모두 같다 — 저장된 클립과 같은 바이트를 잰 것이다. 음원 · 기존 증거 파일 · 운영 데이터는 바꾸지 않았다.

- **기존 20개는 새 기준에서 전부 `rejected` 다.** 앞 여유가 20개 모두 120~360ms 이고, 12개는 끝이 신호음 안(여유 0ms, 끝 50ms −34.5 ~ −37.9 dBFS), 5개는 끝 여유 320~380ms, 3개(3 · 11 · 12번)만 끝이 통과한다.
- **후보 19개 · 보류 1개(16번).** 후보는 모두 같은 관문을 다시 통과했고, 최종 범위 20개는 순서대로 겹치지 않는다.
- 끝을 안으로 옮긴 11개에서 빠지는 소리는, 3번 뒤의 첫 소리 3초와 정규화 상관 0.9997~1.0000 이다(원음 표본률, ±40ms 안). 문항 사이에 되풀이되는 같은 신호음으로 **보인다** — 들은 것이 아니다.

| 번 | 앞 여유 | 뒤 여유 · 끝 50ms | 시작 | 끝 | 후보 범위(프레임) | 후보 뒤 여유 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 360ms | 0ms · −37.50 | 40ms 앞으로 | 1,120ms 안으로 | 2454912–5074176 | 780ms |
| 2 | 360ms | 0ms · −37.70 | 40ms | 1,120ms 안으로 | 5549952–8084736 | 740ms |
| 3 | 220ms | 400ms · −85.21 | 180ms | 그대로 | 8569152–11165952 | 400ms |
| 4 | 120ms | 0ms · −37.65 | 280ms | 1,120ms 안으로 | 11660928–14087424 | 580ms |
| 5 | 360ms | 0ms · −35.27 | 40ms | 1,080ms 안으로 | 14557056–16926336 | 520ms |
| 6 | 360ms | 380ms · −83.84 | 40ms | 20ms 밖으로 | 17409408–19995840 | 400ms |
| 7 | 300ms | 0ms · −37.68 | 100ms | 1,120ms 안으로 | 20489280–22793472 | 840ms |
| 8 | 240ms | 0ms · −37.91 | 160ms | 1,120ms 안으로 | 23271168–25427712 | 740ms |
| 9 | 240ms | 340ms · −85.21 | 160ms | 60ms 밖으로 | 25917696–28130880 | 400ms |
| 10 | 260ms | 0ms · −37.70 | 140ms | 1,120ms 안으로 | 28622016–31084800 | 500ms |
| 11 | 240ms | 400ms · −77.17 | 160ms | 그대로 | 31576320–34017024 | 400ms |
| 12 | 220ms | 400ms · −85.75 | 180ms | 그대로 | 34524480–36706560 | 400ms |
| 13 | 260ms | 320ms · −77.32 | 140ms | 80ms 밖으로 | 37212864–39327744 | 400ms |
| 14 | 260ms | 0ms · −37.74 | 140ms | 1,120ms 안으로 | 39816384–41950464 | 620ms |
| 15 | 260ms | 0ms · −37.65 | 140ms | 1,120ms 안으로 | 42439872–44675328 | 720ms |
| **16** | 240ms | 0ms · −36.49 | (160ms) | **보류** | — | — |
| 17 | 260ms | 0ms · −37.83 | 140ms | 1,120ms 안으로 | 48070848–49925376 | 520ms |
| 18 | 300ms | 340ms · −78.25 | 100ms | 60ms 밖으로 | 50419776–52822080 | 400ms |
| 19 | 260ms | 360ms · −85.41 | 140ms | 40ms 밖으로 | 53297856–55565952 | 400ms |
| 20 | 360ms | 0ms · −34.53 | 40ms | 1,060ms 안으로 | 56068992–58273344 | 900ms |

후보의 앞 여유는 19개 모두 정확히 400ms 다(조용한 창만 지나 넓혔다). 시작 쪽에서 빠지는 소리는 없다.

**16번 보류 — `end_anchor_inside_boundary_sound`.** 정렬이 인용한 마지막 조각(영어 캐시 308번, 추정 984.304~992.424초)의 끝이, 실측 400ms 조용한 구간을 등진 가장 가까운 끝(원래 끝보다 52,800프레임 = 1.1초 앞)보다 44,737프레임(0.93초) **뒤**에 있다. 추정 시각이 신호음 안까지 뻗어 있어, 그 조각을 안에 둔 채로는 신호음을 뺄 수 없다. 억지로 통과시키지 않았다. 풀려면 더 정밀한 시각의 근거(낱말 단위 시각 등)가 필요하고, 관문을 낮추는 것은 답이 아니다.

**5번 주의.** 후보 끝(16,926,336)이, 정렬이 인용하지 **않은** 다른 인식의 «Thanks.» 추정 구간(영어 캐시 112번, 끝 16,935,936)보다 0.2초 앞이다. 인용된 마지막 조각(113번, 352.45초)은 안에 있고, 후보 끝 앞 520ms 는 실측으로 조용하다. 인용되지 않은 조각은 관문에 쓰지 않았고 보고서(`confidentAsrSpansLeftOutByCandidate`)에 적어 두었다.

## 5. 증거

`C:/Creative/testautocreator/output/listening-assessments/triple-review/` (저장소 밖):

| 파일 | SHA-256 |
| --- | --- |
| `native-boundary-candidates.json` — 원천 해시 · 정책 · 20개의 측정값 · 앵커 · 쪽별 창 제곱합 · 후보 범위와 후보 클립 SHA(만들지 않음) | `0d9ede7b3dc38193e8210a3f92e9d17e63de385edb0c3ba2ade5b592b654657d` |
| `native-boundary-candidates.method.mts` — 위 보고서를 만든 스크립트 | `a6f6794db4db789b508f70cecffd3c66079fa51e35720f8b4fa6f7bffda28d4b` |
| `native-boundary-candidates.run.log` | `98efd7ae6c24c0f3b4e120554629f501e16ae663780670bd23c3a5fe662d6d52` |
| `native-boundary-mutations.json` · `…method.py` — 변이 30개의 결과와 방법 | `1019c101…ccce79f0` · `f87fdafe…e0e277b5` |

보고서는 커밋된 코드로만 만들어진다(스크립트가 작업본과 `HEAD` 의 blob 이 다르면 멈춘다): 커밋 `8a40225c2`, `audioBoundary.ts` blob `3d0e286715f093f3ee3aaab6cbef3bf7416eeb12`, 시험 blob `ac2e2625591117ec8d1f7478347070e1035a1aba`.

다시 만들기(환경 변수 파일을 읽지 않는다):

```powershell
node --import tsx C:/Creative/testautocreator/output/listening-assessments/triple-review/native-boundary-candidates.method.mts <저장소> C:/Creative/testautocreator/output/listening-assessments <보고서.json>
```

## 6. 시험

`src/__tests__/unit/englishListeningAudioBoundary.test.ts` 11개: 조용한 절단점 · −60 dBFS 선(32 는 조용, 33 은 아님)과 380ms · 첫 낱말 절단 · 신호음에 걸린 끝 · 스테레오 반대 위상과 한쪽 채널 · 짧은 범위와 잘린 원천 · 조용한 창이 없는 원천 · 후보 재측정 · 조용한 곳으로만 넓히기 · 범위 / 이웃 / 앵커 한계 · 바이트 분할 / 채널 수 / 표본률.

전체 `tsc --noEmit` 은 통과한다(기본 힙 4GB 에서는 메모리 부족으로 죽으므로 `--max-old-space-size` 를 올려 돌렸다). 변이 30개 중 29개가 시험을 빨갛게 만든다. 남은 하나(«빼기 경로의 ±1.5초 조건 제거»)는 동치다 — 안쪽으로 훑는 범위가 `한계 + 400ms` 라서, 한계 밖의 자리는 조용한 구간을 잴 수 없어 이미 걸러진다.

## 7. 이 모듈이 말하지 않는 것

- 사람이 들은 것이 아니다. −60 dBFS 아래의 말소리 · 숨소리는 조용함으로 센다.
- 소리가 말인지 신호음인지 가리지 않는다. 그 구분은 앵커(ASR 추정)와 root 의 증명이 한다. 앵커 시각이 부정확하면 16번처럼 보류되거나, 반대로 인용되지 않은 말이 빠질 수 있다 — 클립 안 발화를 전부 계상하는 일(감사 B3)은 이 모듈 밖이다.
- 1번 앞의 «이제 시작하겠습니다», 16 · 18번의 공통 지시처럼 **범위 안에 있는** 다른 발화는 건드리지 않는다.
- 후보를 적용하면 클립 SHA · 자산 ID · 계획 해시가 모두 바뀐다. 기존 20개는 그대로 두었다.
