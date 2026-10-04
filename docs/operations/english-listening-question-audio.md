# 문항별 듣기 음원 등록

기존 원본 세트의 문항을 검증된 passage별 음원 그룹으로 교체하는 trusted operator 작업이다. 원본 MP3/M4A·ready asset은 보존한다. WAV는 원본 전체를 엄격하게 디코딩한 PCM의 정확 sample frame 범위를 잘라 만들며 다시 압축하지 않는다. 음원은 private Supabase Storage의 immutable 1MiB objects, DB에는 기존 durable media metadata만 저장한다.

```powershell
node --conditions=react-server --env-file=C:/Creative/testautocreator/.env --import=tsx scripts/import/adopt-listening-question-audio.mts ebsi-high-1-2022-2 --archive-root C:/Creative/testautocreator/output/listening-assessments
```

기본 실행은 로컬 파일 검증·전체 디코딩 후 SQL `SET TRANSACTION READ ONLY`로 현재 source scope/revision/document hash/rights/ready 원음/Storage quota를 확인한다. Storage credential을 읽거나 Storage에 연결하지 않는다. 쓰기는 같은 명령에 `--apply`를 명시한 경우에만 한다. 프로젝트 `jyaguxwuaxgdnovtulna`와 기존 운영 owner에 고정하며 public/anon key나 다른 프로젝트로 fallback하지 않는다. M4A는 trusted CLI 영역에서만 `--ffmpeg-path ABSOLUTE_PATH`와 기존 검증 변환 helper를 이용한다.

입력 binding은 `<archive>/prepared-question-audio/<sourceRecordId>.json`이다. `listeningQuestionAudioSnapshotSchema`의 `{schemaVersion:1,sourceRecordId,alignment:{path,sha256},expectedSet:{setId,ownerId,branchId,revision,documentSha256,originalAssetId}}`를 따른다. `revision`과 `documentSha256`은 native 문항 채택 **이후 실제 현재 DB**에서 root가 읽어 기록한다. document hash는 `listeningValueHash(document)`이며 metadata/image.role을 포함한 전체 문서를 해시한다. raw artifact SHA는 `questionAudioSha256(bytes)`이다. 원본 registration checkpoint의 오래된 revision을 추정하여 사용하지 않는다.

적용 자격은 한 회차의 모든 문항/passage가 통과한 경우뿐이다. `qualified` flag만으로 승격하지 않는다. loader는 원본 prepared/audio/PDF/공식 대본/ASR/VAD raw files의 SHA, 원본문항 전체 ID·순서·번호, 선택한 문단 밖의 공식 발화까지 포함한 전체 대본·첫·마지막 발화와 문항 번호에 실제 적용되는 반복 근거를 재검증한다. 빈 응답 앞의 호칭도 원문에서 임의로 제외하지 않는다. ASR의 전체대화 recall ≥ 0.90/precision ≥ 0.70 및 첫·마지막 recall ≥ 0.90 기준을 유지한다. 첫/끝 근거는 실제 선택 sequence의 연속 prefix/suffix이고 실제 시작·끝 8개 단어 위치도 통과해야 한다. 선택한 대화 캐시의 구간 내부에 배정하지 않은 추가 발화는 단순 번호 안내 외에는 보류한다. 첫 문항~마지막 문항 사이 VAD 이벤트도 정확히 한 passage에 배정돼야 한다. 추정/미확정·누락·중복·실제 겹친 발화·발화 중간 절단·인접 문항 침범은 중단한다. `--approve` 우회 옵션은 없다. Exact-adjacent raw ASR timestamps는 0초 겹침이며, floor/ceil 때문에 생기는 가짜 1sample 겹침과 구분한다. 실제 positive speech overlap은 허용하지 않는다.

실제 번호 안내와 원문의 정확 번호 범위가 함께 확인된 common scope는 독립 대화 여러 개의 번호만 공유할 수 있다. 공통 `[16~17]` 지시만으로 shared passage를 만들지 않는다. 실제 같은 공식 대화를 공유한다고 확인된 문항만 한 그룹/한 player로 유지한다. 각 문항의 `audioRange`는 새 WAV 전체 `0..duration`이므로 개별 담기에는 해당 passage만 따라간다.

VAD raw source artifact는 strict activity의 `rawArtifact`로 hash를 바인딩한다. decoder/source SHA/16000Hz frame count/전체 float32 SHA, threshold 0.5·minSilence 2000ms·speechPad 400ms, 실제 padded 및 별도 unpadded events를 확인한다. unpadded speech 위치로부터 계산하는 앞뒤 400ms는 **VAD 모델 여백**이며 실제 조용한 여백으로 보고하지 않는다. Native PCM에서 20ms 창의 최대 채널 RMS와 첫·끝 50ms를 별도로 측정한다. 고정 -60dBFS 기준으로 양쪽 400ms 이상의 실제 quiet를 확인하지 못하면 신규 등록을 중단한다. 스테레오 위상 상쇄로 조용하다고 오판하지 않으며, 소음이 있는 파일에 맞춰 임계값을 낮추지 않는다. 조용한 구간의 존재도 사람의 청취 검수나 말소리 누락 부재를 증명하지 않는다. PyAV float32 SHA와 Node canonical PCM16 SHA는 각각의 디코딩 provenance이며 서로 같다고 주장하지 않는다. Node 전체 strict decode errors/finite/sample 수 검사 및 VAD resampling frame identity 검사는 별도로 수행한다.

Korean probe는 원본 SHA·실제 VAD 이벤트에서 시작하는 최대 12초·원본 sample offset과 local timestamp를 증명하는 **cue 전용** optional cache다. English localized windows는 recognition-only 입력이며 최종 절단 경계가 아니다. 상보 ASR cache는 `derivedFrom` raw files의 SHA 및 각 `origin.artifactSha256/segmentId`에 text/time/uncertain이 정확히 같아야 하며 원본 segment를 중복 사용하거나 재귀 합성하지 않는다. ASR 누락으로 기준을 통과하지 못한 회차는 staging에 남는다. 검증 결과는 human content/audio/alignment review가 아니다.

짧은 SQL transaction 사이에 durable chunks를 순차 업로드하고 저장된 전체 clip bytes/SHA/WAV header/duration을 다시 검증해 ready로 seal한다. 최종 set advisory lock → owner media lock → asset row locks 아래 권한·rights·publication/review·현재 전체 문서 SHA/revision을 재검증하고 문서 교체와 audit를 atomic하게 수행한다. 문항/보기/정답 IDs 및 native prompt/image/metadata/provenance는 보존한다. Answer evidence는 정확히 clip 안에 포함된 구간만 remap하며 나머지는 제거한다. 분할 대본에 맞는 번역 근거가 없으면 translation은 null이다.

현재 검증 정책의 plan hash와 deterministic asset/group IDs로 중단된 업로드를 재개한다. 최종 CAS 전에 원본이 변경되면 문서는 교체하지 않는다. 이미 준비된 음원은 원본과 별개의 durable checkpoint로 남으며 자동으로 원본이나 ready 음원을 삭제하지 않는다. 만료/충돌 checkpoint는 운영자가 별도 정리한다. 현재 정책으로 완료한 같은 snapshot의 재실행은 audit의 plan hash/최종 revision/전체 document SHA 및 원본·clip ready scope/hash를 확인한 경우만 `already_split`을 반환한다. 기본 read-only 재실행도 지원한다. v1 증명이 새 정책에서 보류되면 해당 snapshot의 재실행도 보류되며, 옛 승인 여부로 파형 검사를 우회하지 않는다. 검수/발행된 source는 거절한다.

Storage owner budget은 원본 및 PCM 파생 파일을 위한 **80GiB / 8192 assets**다. 100GB private Storage 범위 안에서 corpus 약 40GB와 원본을 수용하는 앱 한도이며 물리 object aliases를 중복 계산하지 않는다. PostgreSQL legacy binary 경로는 기존 **2GiB−1 byte / 128 assets** 및 database capacity guard를 유지한다.

첫 적용 대상은 `ebsi-high-1-2022-2`의 20문항/20passages이다. 당시 source 전체 디코딩과 모든 native clip SHA, 앞뒤 각 400ms의 **VAD 모델 여백**을 확인했다. 후속 삼중 검토의 실제 PCM quiet 기준은 기존 20구간 모두 통과하지 못했다. 기존 private 초안·원음·revision 5·v1 plan hash·적용 증명은 보존하고 신규 승인으로 재사용하지 않는다. 20구간에 발화 누락이 확인됐다는 의미는 아니다. 일부 끝의 신호음과 실제 여백, 답변 빈칸 앞 호칭 근거를 보완하고 새 문서/revision CAS·원음 보존을 증명해야 재적용할 수 있다. 현재 importer는 이미 분할된 세트를 새 plan으로 덮어쓰는 우회 경로를 제공하지 않는다. 원음 전후 40개 WAV와 sample/hash manifest는 `.qa-artifacts/listening-import/question-alignment-20261004/boundary-audio/ebsi-high-1-2022-2/manifest.json`에 있다. 최신 판단은 `docs/operations/reviews/english-listening-question-audio-{codex,grok,claude}-20261004.md`와 `output/listening-assessments/triple-review`를 확인한다. 신규 운영 적용은 현재 DB binding→기본 preview→전체 검증→기존 playback 확인 후 수행한다.
