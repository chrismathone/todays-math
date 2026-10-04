# 기존 듣기 자료 원본 보존

2026-10-05 사용자 지시: 기존 자료는 원본을 유지한다. 공식 문제의 발문·지시문·보기·정답·그림을 재구성 문제의 문체에 맞춰 번역하거나 다시 생성하지 않는다. 회차 전체 원음과 출처 파일도 보존한다. 문항별 음원은 검증된 경계에서 만든 별도 파생 파일로 관리한다.

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

## 음원 분할의 적용 조건

기존 `ebsi-high-1-2022-2`의 20개 파생 파일과 원음을 유지한다. 나머지 회차의 후보 검증 결과는 실제 음성 경계·원본 대본의 시작과 끝·문항 번호·반복 방송·PCM quiet 검증을 통과하기 전까지 운영에 연결하지 않는다. VAD 모델의 여백이나 후보 통과 수를 실제 파형 검증으로 표시하지 않는다. 검증 산출물은 사람의 청취 검수·내용 검수·발행 승인으로 승격하지 않는다.

후속 분할 작업 역시 공식 원본의 문제·보기·정답·그림과 전체 원음을 보존해야 한다. 미확정 문항은 원음으로 재생하고, 검증된 파생 파일과 구분하여 관리한다.

## 별도 분할 검증본

7회차·137문항을 원음의 실제 PCM으로 검사했다. 129개 구간에서 고정 quiet 기준에 맞는 경계 후보를 찾았으며, 번호 안내·원본 대화 전체·첫 발화와 마지막 발화·인접 문항 침범 검사까지 통과한 18문항만 별도 WAV로 만들었다. 대상은 2026년 2회 중1 9문항, 중2 8문항, 고2 1문항이다. 나머지 119문항은 보류하며 기준을 낮추거나 전사 시간을 임의로 잘라 맞추지 않았다.

최종 검증본은 `output/listening-assessments/strict-split-progress-20261005/final-002/manifest.json`이며 SHA-256은 `2cb2893c16067e83fcf4137a99e6e4f7c29c06937c58a1fe8c388c495fdf1cc2`다. 검증 core SHA-256은 `590fd936ce43f0819e4f8503e76de706e7474e81a2faa998d1935f47a0bccc91`다. root가 136개 원본 산출물 SHA, 원음 재디코딩, 선택된 raw 발화와 번호 안내, WAV 바이트와 원음 sample 범위, 양쪽 quiet 측정을 독립적으로 재검증했고 18개 모두 일치했다. 증명은 `.qa-artifacts/listening-original-preservation/replay-2026-10-04T18-57-35-025Z.json`에 있다.

추가 WAV는 로컬 검증본으로만 보존했다. 운영 DB·Storage에 올리거나 원본 그룹을 교체하지 않았다. 실제 운영 DB를 18:22·18:57 UTC에 각각 읽어 193회차의 문서·revision·발행 수가 모두 동일한 것을 확인했다. 추가 분할 파일을 사이트에서 사용하려면 원본을 유지하는 별도 연결 기능이 필요하며, 현재 importer의 회차 전체 검증 기준을 우회하지 않는다.
