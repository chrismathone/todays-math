# 기존 듣기 자료 원본 보존

2026-10-05 최종 사용자 지시: **모든 전국 영어듣기평가와 모의고사 듣기는 원본 회차 전체 음원만 재생한다. 분할 파일 제작·연결은 중단하고, 검증된 문항 시작 시각으로 전체 음원의 재생 위치만 이동해 끝까지 이어 듣는다.** 공식 문제의 발문·지시문·보기·정답·그림과 기존 문항 메타데이터를 그대로 유지한다. 회차 전체 원음과 출처 파일도 보존한다.

## 전체 음원 복원과 확인

- 운영 DB의 전국 평가 자료 193회차·3,699문항을 점검했다. 192회차는 이미 전체 원본을 사용하고 있었다.
- 유일하게 분할 음원이 연결된 `ebsi-high-1-2022-2`를 보관된 원본 그룹으로 되돌렸다. 20문항의 ID·발문·지시문·보기·정답·그림·메타데이터는 동일하며, 회차 전체 대본과 원본 음원 연결을 복원했다. revision은 5에서 6으로 증가하고 `whole_source_audio_restored` 감사 기록을 남겼다.
- 원본 음원 asset은 `eb45e983-0de5-4b7a-bee7-9c16479a43d9`이며 길이는 1,265,806ms다. 비공개 Storage에서 실제 재생 파일 35,443,968바이트를 전부 읽어 SHA-256 `5a8c543e9bc4eea3649489f78a107071ceae40f61a4fe44f96a3ec4ba2af5ce4`와 대조했다.
- 원본 복원 직후 모든 193회차가 원본 전체 음원 한 개를 연결하고, 분할 회차는 0개였다. 이 시점에 나머지 192회차의 문서·revision·발행 수가 변경되지 않은 것을 확인했다.
- 실제 `compose-source` 조회와 원본 음원 파일의 시작·끝 Range 요청을 검증했다. 두 요청은 각각 64바이트와 HTTP 206을 반환했다. 기존 원본 파일이나 보관용 파생 파일은 삭제하지 않았고 Storage에는 새 파일을 쓰지 않았다.
- 복원 적용 증명: `.qa-artifacts/listening-original-preservation/whole-audio-2026-10-05T01-15-18-298Z/report.json`.
- 전체 회차 대조 증명: `.qa-artifacts/listening-original-preservation/whole-audio-verified-2026-10-05T01-17-29-934Z/report.json`.

전국 평가 자료를 골라 시험지를 만들 때에도 서버가 전체 음원을 포함한다. 문항을 선택해도 파일을 자르지 않는다. 전국 평가의 구간 편집은 숨기고, 검증된 시작 시각이 있는 문항에는 `해당 시각부터 이어 듣기`를 제공한다. 이 버튼은 같은 전체 음원의 `currentTime`만 이동하며 문항 끝에서 자동 정지하지 않는다. 교사가 직접 만든 별도 자료의 기존 구간 기능은 유지한다.

## 전체 음원의 검증된 시작 위치

기존 원본 분할 검증에서 확인된 시작 위치만 시간 메타데이터로 재사용했다. 2022년 제2회 고1의 20문항과 2026년 제2회 중1 9문항·중2 8문항·고2 1문항, 총 4회차·38문항이다. 신규 18개 위치의 원본 산출물 136개 해시, 원음 재디코딩, 문항 번호·대화 전체·원음 sample 위치·quiet를 root가 다시 검증했다. 기존 2022년 위치는 적용 감사 증명과 준비된 파일, 원본 음원 해시, 보관된 immutable `sourceClip` 시작 frame·sample rate를 대조했다.

DB에는 기존 `audioRange.startMs`로 확인된 원음 시작 위치를 저장하고 `endMs`는 회차 전체 길이로 저장했다. 이 필드는 전체 원음 안에서 이동할 위치이며 파생 음원 asset을 가리키지 않는다. 네 회차의 revision만 증가하고 원본 그룹·대본·음원 참조와 문항 내용은 유지했다. 발행이나 사람 검수 상태도 바꾸지 않았다. 위치가 확인되지 않은 문항에는 추정 시각을 넣지 않는다.

- 추가 검증 증명: `.qa-artifacts/listening-original-preservation/replay-2026-10-05T01-35-13-186Z.json`.
- 시간 메타데이터 적용 증명: `.qa-artifacts/listening-original-preservation/whole-audio-starts-2026-10-05T01-39-19-292Z/report.json`.
- 최종 DB 읽기 대조: `.qa-artifacts/listening-original-preservation/whole-audio-verified-2026-10-05T01-40-39-818Z/report.json`.
- 기존 38개 위치를 등록한 시점에는 193회차·3,699문항 모두 전체 원본 연결, 분할 회차 0개였다. 당시 189회차는 문서·revision·발행 수까지 동일했고, 시간 위치를 추가한 4회차도 문제·보기·정답·그림·기존 메타데이터가 동일했다. 아래 추가 등록에서도 이 38개 위치를 정확히 보존했다.

## 193회차의 추가 위치 검증과 실제 DB 등록

Claude가 공식 원본 121회차를 분석했다. Grok의 재구성 72회차 작업은 주간 사용 한도로 중단됐고, 실제 Antigravity CLI의 `gemini-3.1-pro-high`가 완료된 음성 인식 결과를 재사용하며 남은 39회차·513개 분석 구간을 처리하고 근거를 완성했다. Codex는 고정한 원본 파일·운영 재생 시간축·음성 인식 입력·실제 PCM 시작 위치·문항 번호·생성 당시의 근거 구간을 독립적으로 대조했다. 재구성 문항의 화면 번호를 원음의 번호로 간주하지 않았다.

- 최종 독립 증명은 193회차·3,699문항 전부를 다루며, 원본·시간축 검사 193개가 모두 통과했고 구조 오류는 0개다. 전체 순서 검사에서 추가로 보류된 67개 후보도 최종 등록 수에 포함하지 않았다.
- 최종 통과한 새 위치는 **2,165개**다. 공식 원본 1,982개와 재구성 문항 183개이며, 기존 위치 38개를 그대로 유지해 운영 DB의 시작 위치는 **총 2,203개**다.
- 실제 등록은 2026-10-05 09:35 UTC에 끝났다. **180회차**에 새 위치를 저장했고, 전체 **181회차**에 검증된 위치가 있다. 모든 문항의 위치가 있는 회차는 15개, 일부 문항의 위치가 있는 회차는 166개, 위치가 없는 회차는 12개다. 전체 음원 재생은 193회차 모두 유지한다.
- **1,496문항은 보류**했다. 원문 문항 범위와 생성 근거가 확실히 연결되지 않거나, 원음 번호·지시문·첫 대화가 유일하게 확인되지 않는 경우, 다음 원문 문항의 경계가 없는 경우 등을 포함한다. 추정 시각을 넣지 않았다.
- 새 `audioRange.startMs`와 변경 회차의 revision만 추가했다. 모든 `endMs`는 회차 전체 길이다. 전체 193회차를 다시 조회해 원본 음원 참조·문제·보기·정답·그림·기존 메타데이터·사람 검수 상태·발행 수를 대조했다. 원본 음원 교체나 Storage 업로드·삭제는 없었다.
- 학년별 자료와 원본 M4A를 MP3로 제공하는 2006년 제2회 중1 자료를 포함한 7회차의 실제 `compose-source` 조회에서 새 위치와 전체 음원 연결을 확인했다. 비공개 음원의 시작·끝 Range 요청 14개는 모두 HTTP 206·64바이트·원본 재생 SHA를 반환했다.

최종 독립 증명은 `output/listening-assessments/whole-audio-seek-20261005/codex/replay-final-002/certificate.json`이며 SHA-256은 `99c5bc17db4c18e5b3b683776947df21b4b1b4c3ac83f9fe1159a3e5eb972368`다. 실행한 검증 도구 23개는 같은 디렉터리 계열의 `codex/final-implementation-006`에 고정했고, 독립 검증 회귀 검사 165개와 root 등록 검사 16개가 통과했다.

- 등록 전 실제 DB 점검: `.qa-artifacts/whole-audio-seek-20261005/adoption-2026-10-05T09-33-07-282Z/report.json`.
- 실제 등록·전체 193회차 읽기 대조: `.qa-artifacts/whole-audio-seek-20261005/adoption-2026-10-05T09-34-23-633Z/report.json`.
- 실제 재생 서버·비공개 Storage Range 확인: `.qa-artifacts/whole-audio-seek-20261005/runtime-readback-2026-10-05T09-35-43-486Z.json`.

이 결과는 전체 원음의 재생 위치를 검증한 기록이다. 사람의 청취·내용 검수나 발행 승인으로 승격하지 않는다.

## 실제 자료 대조

- 운영 프로젝트: `todays-math`, Supabase 프로젝트 `jyaguxwuaxgdnovtulna`.
- 2026-10-04 18:22 UTC에 운영 DB를 읽기 전용 transaction으로 조회했다. 적재 자료는 공식 원본 121회차와 음원 기반 재구성 72회차다.
- 공식 원본 2,417문항의 `prompt`, `instruction`, `choices`, `answerChoiceId`, `image`를 검증된 `prepared-native-registration` 원본 변환 산출물과 문항 ID별로 대조했다. 다른 필드는 0개다.
- 공식 원본에서 한글이 없는 `prompt` 180개는 모두 `Man: ___` 또는 `Woman: ___` 응답 빈칸이다. 실제 발문은 별도 한글 `instruction`에 있으며, 영문 발문 번역 대상으로 분류하지 않는다.
- 이번 원본 대조 작업은 DB·Storage를 변경하지 않았다. 재구성 문항의 추가 문구 수정도 보류했다.
- 읽기 전용 DB snapshot SHA-256: `cfac57cbbff010dd4c20eb850a518ace9207e0ba614d60b96dffb8c8b2fb7213`.
- 로컬 증명: `.qa-artifacts/listening-original-preservation/2026-10-04T18-22-35-604Z/original-presentation-proof.json`.

## 완료 작업트리 정리

다음 네 작업트리는 깨끗한 Git 상태와 작업이 없는 PowerShell 화면을 확인한 후 정리했다. 이미 cherry-pick된 변경의 Git ancestry를 main에 기록했고, 임시 PostgreSQL 8GiB 한도 제안은 현재의 PostgreSQL 2GiB·Storage 80GiB 분리 정책을 유지하며 종료했다. 두 정리 merge는 파일 tree를 변경하지 않았다. 각 브랜치는 아래 SHA 그대로 보존했다.

| 브랜치 | 보존 SHA |
| --- | --- |
| `BIGSHOL/listening-storage-migration` | `745ba0c73097ed7e1b403967f54a32ffc3b11116` |
| `BIGSHOL/listening-storage-upload` | `3e2b6434a7049a989423c60cf844570aa295de64` |
| `BIGSHOL/listening-drive-media` | `1954e0c72e7dfa2ce78222e7105019c521fe730b` |
| `BIGSHOL/listening-mp3-archive` | `007deb2f3d785608ef735e7899a4526619f4abfb` |

이어 듣기 위치 분석의 완료 작업트리도 결과와 검증 도구를 main에 병합한 뒤, 깨끗한 상태·종료된 프로세스·main 밖 작업트리를 가리키지 않는 증명을 확인하고 정리했다. Grok은 주간 사용 한도로 중단됐으며, 실제 Antigravity CLI의 Gemini 3.1 Pro가 기존 32회차의 결과를 보존하고 남은 39회차·513개 분석 구간을 이어서 처리했다. Gemini의 재생 위치 후보 184개 중 독립 검증을 통과한 183개를 재구성 문항의 위치로 등록했다. 최종 원음 대조와 실제 등록 수는 위의 추가 위치 검증 기록을 따른다.

| 브랜치 | 보존 SHA |
| --- | --- |
| `BIGSHOL/listening-seek-claude` | `397be0e1c9032f8f3ede653495667238b296e4c6` |
| `BIGSHOL/listening-seek-grok` | `66c7db00910103506197be70e8b17d6e07493334` |
| `BIGSHOL/listening-seek-gemini` | `eec600e6b8a5afb80cd44eeabc28daf48210ccb6` |
| `BIGSHOL/listening-seek-codex` | `1f150d90f66e463be307e47f43041e2ff5a71622` |

독립 검증 worker의 성공 완료와 터미널 반환을 확인한 뒤 Codex 작업트리도 정리했다. 최종 증명의 파일 참조 803개가 모두 존재하고, 제거한 작업트리를 가리키는 참조는 0개였다. 네 브랜치는 위 SHA로 보존했고 main의 Next.js 의존성도 그대로 유지했다.

## 이전 분할 작업 기록

이전 `ebsi-high-1-2022-2`의 20개 파생 파일은 보관용으로 남기고 사이트의 원본 자료 연결에서 제외했다. 추가 분할 후보도 운영에 연결하지 않는다. 아래 검증 결과는 이전 작업의 기록이며 현재 운영 정책은 전체 원본 재생이다. 검증 산출물은 사람의 청취 검수·내용 검수·발행 승인으로 승격하지 않는다.

전국 평가의 문항별 음원 importer는 DB의 저장된 출처를 확인해 Storage 업로드 전에 거절한다.

## 별도 분할 검증본

7회차·137문항을 원음의 실제 PCM으로 검사했다. 129개 구간에서 고정 quiet 기준에 맞는 경계 후보를 찾았으며, 번호 안내·원본 대화 전체·첫 발화와 마지막 발화·인접 문항 침범 검사까지 통과한 18문항만 별도 WAV로 만들었다. 대상은 2026년 2회 중1 9문항, 중2 8문항, 고2 1문항이다. 나머지 119문항은 보류하며 기준을 낮추거나 전사 시간을 임의로 잘라 맞추지 않았다.

최종 검증본은 `output/listening-assessments/strict-split-progress-20261005/final-002/manifest.json`이며 SHA-256은 `2cb2893c16067e83fcf4137a99e6e4f7c29c06937c58a1fe8c388c495fdf1cc2`다. 검증 core SHA-256은 `590fd936ce43f0819e4f8503e76de706e7474e81a2faa998d1935f47a0bccc91`다. root가 136개 원본 산출물 SHA, 원음 재디코딩, 선택된 raw 발화와 번호 안내, WAV 바이트와 원음 sample 범위, 양쪽 quiet 측정을 독립적으로 재검증했고 18개 모두 일치했다. 증명은 `.qa-artifacts/listening-original-preservation/replay-2026-10-04T18-57-35-025Z.json`에 있다.

추가 WAV는 로컬 검증 기록으로만 보존하며 운영 DB·Storage에 올리거나 파생 음원 재생에 연결하지 않는다. 이전 읽기 전용 검증에서 18:22·18:57 UTC의 193회차 문서·revision·발행 수가 모두 동일했다. 이후 최종 사용자 지시에 따라 기존 2022년 회차를 전체 원본 연결로 복원했고, 기존 위치 38개와 추가 검증된 위치 2,165개를 전체 원음 이동용 메타데이터로 유지한다.
