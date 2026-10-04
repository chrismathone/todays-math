# 듣기 웹 업로드의 비공개 Storage 저장 — 2026-10-04

웹 GUI의 begin/append/complete 계약과 교사·학생 인가를 유지하면서 새 음원 조각을 비공개 Supabase Storage로 보낸다. 서버 설정이 있을 때 `PrismaStorageListeningMediaStore`를 선택하며, 기존 PostgreSQL 음원 및 단일 Storage 원본도 같은 재생 경로로 읽는다. 공개 키·주소·공급자 응답은 클라이언트에 보내지 않는다.

각 조각은 1MiB 이하의 새 UUID 경로다. 먼저 SQL에 업로드 의도를 기록하고, 덮어쓰기 없는 POST 후 HEAD와 실제 원격 바이트의 SHA-256을 확인한 뒤 참조를 확정한다. 이후 SQL CAS가 수신 길이·청크 해시·업로드 개정·소유 범위를 검증한다. MP3는 전체 디코딩 검증 후 메타데이터를 제외한 기존 MPEG 프레임을 재생하며, 필요한 PCM 출력도 Storage 조각으로 저장한다. 재시도·서버 재시작·취소·디코딩 중 실패 시 확정된 원본을 보존한다.

`english_listening_media_storage_blob`에는 UUID, 파일 길이·해시·비공개 원격 참조·확정 여부·정리 상태만 저장한다. 새 음원의 bytea는 없다. RLS와 PUBLIC/anon/authenticated 권한 회수, 원격 참조 불변 트리거를 migration에 포함한다. Prisma 모델은 추가했지만 작업 중 공유 Prisma client를 generate하지 않았다. 운영 DB에는 적용하지 않았다.

Storage 원본·웹 업로드·시험지 구성이 소유자별 8GiB/512개 한도를 공유한다. 진행 중 업로드는 최대 출력량을 예약하고, 완성본은 물리 object의 중복 참조를 한 번만 계산한다. 정리 대상은 삭제 상태를 SQL에 먼저 남기며, 제거 실패는 다음 정리에서 다시 시도한다. 시험지가 같은 원격 조각을 참조하면 마지막 SQL 참조가 사라질 때만 원격 파일을 제거한다. 기존 PG 음원의 용량 제한과 전역 디스크 보호는 별도로 보존한다.

검증은 임의 포트의 실제 로컬 PostgreSQL과 Storage HTTP fixture를 사용했다. 새 suite 12개가 별도 스키마에서 재개·동시 재전송·CAS 실패·부분 PCM 출력 실패·고아 파일 제거 실패·취소·원본 SHA 불일치·quota 경주·소유권 변경·PG legacy·공유 원격 참조·SQL 불변성과 RLS를 확인했다. 이전 서버 통합 7파일/81개도 실제 로컬 DB에서 통과했다. 테스트 종료 후 DB를 중지했다. 운영 Storage/DB 쓰기 테스트는 하지 않았다.

변경 서버 경로 및 테스트의 TypeScript 검사, 변경 TS ESLint, Prisma schema validate를 통과했다. 전체 프로젝트 TypeScript 검사는 기본 Node 4GiB heap을 소진해 진단 전 종료했으므로 전체 통합 검사는 더 큰 heap으로 별도 실행해야 한다. 새 DB suite는 `LISTENING_MEDIA_TEST_DATABASE_URL`이 명시된 loopback `listening_media` 또는 `listening_media_test` DB만 허용하며, suite가 생성한 스키마를 마지막에 제거한다. 서로 다른 파일이 실제 DB 크기를 바꾸는 capacity 검사는 파일 간 병렬 실행 없이 검증한다.

Storage 구현 전 [현재 standard upload 문서](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [접근 제어 문서](https://supabase.com/docs/guides/storage/security/access-control), [Storage 스키마 변경 제한](https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025)을 확인했다. 새 표는 기존 앱 표가 있는 스키마에 두며 Supabase 내부 storage 스키마를 변경하지 않는다.
