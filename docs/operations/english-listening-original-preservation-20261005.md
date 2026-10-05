# 기존 듣기 자료 원본 보존

2026-10-05 최종 사용자 지시: **모든 전국 영어듣기평가와 모의고사 듣기는 원본 회차 전체 음원만 재생한다. 문항별 분할·연결 작업은 중단한다.** 공식 문제의 발문·지시문·보기·정답·그림과 기존 문항 메타데이터를 그대로 유지한다. 회차 전체 원음과 출처 파일도 보존한다.

## 전체 음원 복원과 확인

- 운영 DB의 전국 평가 자료 193회차·3,699문항을 점검했다. 192회차는 이미 전체 원본을 사용하고 있었다.
- 유일하게 분할 음원이 연결된 `ebsi-high-1-2022-2`를 보관된 원본 그룹으로 되돌렸다. 20문항의 ID·발문·지시문·보기·정답·그림·메타데이터는 동일하며, 회차 전체 대본과 원본 음원 연결을 복원했다. revision은 5에서 6으로 증가하고 `whole_source_audio_restored` 감사 기록을 남겼다.
- 원본 음원 asset은 `eb45e983-0de5-4b7a-bee7-9c16479a43d9`이며 길이는 1,265,806ms다. 비공개 Storage에서 실제 재생 파일 35,443,968바이트를 전부 읽어 SHA-256 `5a8c543e9bc4eea3649489f78a107071ceae40f61a4fe44f96a3ec4ba2af5ce4`와 대조했다.
- 복원 후 모든 193회차가 원본 전체 음원 한 개를 연결하며, 분할 회차와 문항별 `audioRange`는 0개다. 전체 문항 내용과 나머지 192회차의 문서·revision·발행 수는 변경되지 않았다.
- 실제 `compose-source` 조회와 원본 음원 파일의 시작·끝 Range 요청을 검증했다. 두 요청은 각각 64바이트와 HTTP 206을 반환했다. 기존 원본 파일이나 보관용 파생 파일은 삭제하지 않았고 Storage에는 새 파일을 쓰지 않았다.
- 복원 적용 증명: `.qa-artifacts/listening-original-preservation/whole-audio-2026-10-05T01-15-18-298Z/report.json`.
- 전체 회차 대조 증명: `.qa-artifacts/listening-original-preservation/whole-audio-verified-2026-10-05T01-17-29-934Z/report.json`.

전국 평가 자료를 골라 시험지를 만들 때에도 서버가 전체 음원을 포함한다. 문항별 듣기 버튼과 구간 편집은 전국 평가에서 제공하지 않는다. 교사가 직접 만든 별도 자료의 기존 구간 기능은 유지한다.

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

## 이전 분할 작업 기록

이전 `ebsi-high-1-2022-2`의 20개 파생 파일은 보관용으로 남기고 사이트의 원본 자료 연결에서 제외했다. 추가 분할 후보도 운영에 연결하지 않는다. 아래 검증 결과는 이전 작업의 기록이며 현재 운영 정책은 전체 원본 재생이다. 검증 산출물은 사람의 청취 검수·내용 검수·발행 승인으로 승격하지 않는다.

전국 평가의 문항별 음원 importer는 DB의 저장된 출처를 확인해 Storage 업로드 전에 거절한다.

## 별도 분할 검증본

7회차·137문항을 원음의 실제 PCM으로 검사했다. 129개 구간에서 고정 quiet 기준에 맞는 경계 후보를 찾았으며, 번호 안내·원본 대화 전체·첫 발화와 마지막 발화·인접 문항 침범 검사까지 통과한 18문항만 별도 WAV로 만들었다. 대상은 2026년 2회 중1 9문항, 중2 8문항, 고2 1문항이다. 나머지 119문항은 보류하며 기준을 낮추거나 전사 시간을 임의로 잘라 맞추지 않았다.

최종 검증본은 `output/listening-assessments/strict-split-progress-20261005/final-002/manifest.json`이며 SHA-256은 `2cb2893c16067e83fcf4137a99e6e4f7c29c06937c58a1fe8c388c495fdf1cc2`다. 검증 core SHA-256은 `590fd936ce43f0819e4f8503e76de706e7474e81a2faa998d1935f47a0bccc91`다. root가 136개 원본 산출물 SHA, 원음 재디코딩, 선택된 raw 발화와 번호 안내, WAV 바이트와 원음 sample 범위, 양쪽 quiet 측정을 독립적으로 재검증했고 18개 모두 일치했다. 증명은 `.qa-artifacts/listening-original-preservation/replay-2026-10-04T18-57-35-025Z.json`에 있다.

추가 WAV는 로컬 검증 기록으로만 보존하며 운영 DB·Storage에 올리거나 문항별 재생에 연결하지 않는다. 이전 읽기 전용 검증에서 18:22·18:57 UTC의 193회차 문서·revision·발행 수가 모두 동일했다. 현재는 최종 사용자 지시에 따라 기존 2022년 회차만 전체 원본 연결로 복원했다.
