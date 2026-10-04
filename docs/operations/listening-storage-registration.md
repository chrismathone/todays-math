# 듣기 자료 보관과 등록

`todays-math`의 DB와 듣기 Storage 대상은 `jyaguxwuaxgdnovtulna`다.
문항, 검색 메타데이터, 권한과 파일 참조는 PostgreSQL에 저장한다.
음원 원본과 검증된 재생 파일은 비공개 `english-listening-private` 버킷에 저장한다.
Google Drive 보관본은 별도 백업이며 사이트 재생 서버의 Storage 설정을 대신하지 않는다.

서버 환경에는 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY` 또는 기존
`SUPABASE_SERVICE_ROLE_KEY`가 필요하다. 공개 `sb_publishable_` 키는 사용할 수 없다.
키는 저장소에 커밋하거나 브라우저에 전달하지 않는다. Vercel Production 설정은
로컬 `.env`와 별개이며 변경 후 새 배포에 적용한다.

등록 준비 파일은 `output/listening-assessments` 안에 둔다. 원본 문항의 이미지와
정답, 원본 파일 SHA를 검증하고, 음원 전체 디코딩이 성공한 뒤 DB를 변경한다.
원본 문제지가 없는 회차의 완성된 준비 파일은
`prepared-reconstructed-registration`에 따로 저장하고 우선 등록한다.
미완성 출력은 `.partial`로 저장한다. 재구성 문항은 원본 문항 번호를 주장하지 않으며
출처 음원 SHA와 재구성·검증 상태를 함께 보관한다.

저장소 루트에서 다음 명령을 실행한다. 기본 실행은 읽기 전용 검증이다.

```powershell
node --conditions=react-server --env-file=.env --import=tsx scripts/qa/english-listening/register-listening-assessment.mts ebs-middle-1-2026-2
node --conditions=react-server --env-file=.env --import=tsx scripts/qa/english-listening/register-listening-assessment.mts ebs-middle-1-2026-2 --apply
```

실제 원본이 M4A인 회차는 `--ffmpeg-path <설치된 FFmpeg 실행 파일>`을 추가한다.
원본과 파생 MP3를 각각 Storage에 보관하고, 전체 원본 PCM 검증·파생 MP3 디코딩이
성공한 경우만 등록한다. 검색 메타데이터의 음원 SHA는 M4A 원본을 가리킨다.

진행 원장은 `output/listening-assessments/storage-registration/<sourceRecordId>.json`이다.
같은 자료는 기존 세트·음원을 재사용한다. 이미 바뀐 문항이나 발행·사람 검수 자료는
덮어쓰지 않는다. 완료 전에 앱의 비공개 음원 경로로 HEAD, Range와 전체 재생 SHA를
검증하고 준비 파일 SHA를 기록한다. 문제지가 없는 회차는 음원만 먼저 보관할 수 있으며,
`pending_audio_reconstruction` 상태를 완료 문항 등록으로 취급하지 않는다.

큰 원본과 재생 파일은 1MiB 이하의 비공개 Storage 조각으로 보관하며, DB 조각 테이블에는
파일 참조와 해시만 저장한다. 기존 PostgreSQL WAV의 물리 이관은
`migrateListeningWaveAssetToStorage`를 사용하는 신뢰된 운영 스크립트에서 수행한다.
원본 백업, 원본·조각 SHA, Storage 재생 검증을 완료한 후 같은 트랜잭션에서 참조를
교체하고 해당 바이너리만 삭제한다. 자료 ID, revision과 기존 발행 스냅샷은 유지한다.

은행에서는 전체 회차와 개별 문항을 담을 수 있다. 개별 문항의 음원 구간이 없으면
‘회차 전체 음원과 함께 만들기’를 선택해 선택 문항만 시험지에 넣는다. 문항별 음원
추출은 실제 시작·끝 구간이 있는 경우에 수행한다. 추정 구간을 정확한 구간으로 저장하지 않는다.
