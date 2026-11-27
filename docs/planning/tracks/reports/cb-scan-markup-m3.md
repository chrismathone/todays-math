# 개념 백지 사진 위 첨삭 M3

기능 구현과 로컬 브라우저 검증을 마쳤다. 저장소 전체 `npm run lint`가 종료 1이라 완료 관문은 실패다. 검사에 걸린 74개 파일은 M3 구현 시작점 `3179b685a`와 내용이 같다. 이번 변경 범위의 ESLint는 경고 없이 통과했다.

## 저장과 공개

- [추가 마이그레이션](../../../../prisma/migrations/20261127150000_concept_blank_scan_markup/migration.sql)은 `concept_blank_scan_markup`에 최초 스냅숏과 `edit`, `remove`, `publish` 사건을 넣는다. 스냅숏은 `ready`, `empty`, `failed`를 저장한다. 판정·사진 복합 외래 키에 제출 ID를 포함하고, 판정별 순번과 요청 UUID의 중복을 막는다. UPDATE·DELETE 트리거와 RLS·브라우저 역할 권한 회수를 추가했다. `layout`은 nullable이다.
- 판정과 스냅숏을 같은 트랜잭션에 저장한다. 중단 후 완료된 쪽을 건너뛰고, 저장 전 중단 시 같은 요청 지문에 정산된 응답이 있으면 재사용한다. 진행 중 작업은 시작 당시 판을 유지한다. 새 v3 작업도 동일한 읽기·수정 근거의 기존 v2 정산 응답이 있으면 추가 호출 없이 판정만 복구한다.
- `GET /api/concept-blank/scan/submissions/{id}/markup`은 교사에게 초안과 바른 답을 돌려준다. 학생 응답의 표적에는 `gradeId`, 첨삭에는 `id`, `slotId`, `say`만 들어간다. `POST`의 표적 순번은 같은 제출 잠금 안에서 확인한다. 공개 후 편집하는 동안 학생은 마지막 공개본을 읽으며, 지우기는 공개본에도 즉시 반영된다. 판정 교체는 이전 공개를 철회한다. 같은 사진·판독 근거의 △·× 판정에는 교사가 이전 초안을 새 판정에 다시 공개할 수 있다.
- 사진 만료나 삭제 뒤에도 공개된 설명을 목록에서 읽을 수 있다. 사진이 교체되면 이전 사진의 표식을 새 사진과 연결하지 않는다. 표 미적용 시 새 첨삭 경로가 503을 반환하며 채점은 v2로 처리된다.

## 배포 순서

1. 리드가 원장님 승인 뒤 위 추가 SQL을 검수하고 공유 DB에 먼저 적용한다. 복합 외래 키, RLS와 `anon`·`authenticated` 권한 회수를 확인한다.
2. `prisma generate`한 코드를 `CONCEPT_BLANK_SCAN_MARKUP` 미설정 상태로 배포한다. 기존 판정 조회와 두 새 첨삭 메서드의 접근 범위를 확인한다.
3. 기존 읽기·채점 대기열과 재시도 대상을 확인한 뒤 서버에서만 `CONCEPT_BLANK_SCAN_MARKUP=on`을 설정한다. 배포 또는 스위치 전환 중 같은 작업의 모델 이름·생각 강도도 함께 바꾸지 않는다. 테스트 지면에서 후보 판정 하나당 한 응답, 교사 승인 뒤 학생 노출을 확인한다.
4. 긴급 차단 시 먼저 새 작업의 첨삭 스위치를 끈다. 이미 시작한 v3 작업은 해당 판으로 마무리한다. 오래된 코드로 서비스를 되돌리기 전에 v3 대기·미완료 작업부터 정리하고, 첨삭 표와 사용량 원장을 보존한다.

## 검증

| 검사 | 결과 |
| --- | --- |
| 요청한 `conceptBlankScan*` 단위·API·컴포넌트 시험 | 30파일, 203시험 통과 · `/tmp/cb-m3-vitest.log` |
| 학생 허용 목록·proxy 역할 관문 | 3파일, 56시험 통과 · `/tmp/cb-m3-gates-unit.log` |
| 인증된 학생 쿠키의 스캔·전체 라우트 호출 전수 | `/tmp/cb-m3-sweep-scope.log` |
| Prisma schema · 타입 · 어포던스 · 변경 범위 ESLint | 통과 · `/tmp/cb-m3-type-final.log`, `/tmp/cb-m3-affordance.log`, `/tmp/cb-m3-lint-scope.log` |
| 저장소 전체 ESLint | **실패 (종료 1)**, 오류 275·경고 94 · `/tmp/cb-m3-lint.log` |
| 전체 학생 세션 전수의 auth 호출자 분류 | **기존 실패 1건**, `src/lib/math-ontology/actions/production.server.ts` 미분류. 시작점 시험 파일로 같은 오류를 재현했다 · `/tmp/cb-m3-sweep-baseline.log` |

실제 마이그레이션을 읽는 Prisma OID 모사 PGlite 시험으로 동시 교사 공개, 판정 교체 경쟁과 재공개, 본인·다른 학생·다른 지점 교사, 사진 만료·삭제·교체, 교차 제출 외래 키, 스냅숏 불변성, 표 부재, 저장 후 중단·재개, 재시도 키, 공개 응답 전체 키 일치를 확인했다. 단일 PGlite 연결의 트랜잭션 순서 및 제약 검증이며 별도 연결의 물리 잠금 경합은 운영 측정 범위다. 기존 v2 요청의 스키마와 지시문 바이트 해시를 고정했고, 스위치 꺼짐에는 첨삭 행이 생기지 않는 것을 확인했다.

RED는 미구현 첨삭 경로에서 시작했다. 구현 뒤 세 변이를 복구 전 실제 시험에 넣었다. 학생 응답에 `fix` 추가, 현재 사진 ID 비교 제거, 저장한 쪽 건너뛰기 제거가 하나씩 해당 시험을 실패시켰다. 로그는 `/tmp/cb-m3-mutation-{public-fix,photo-binding,persisted-page}.log`다.

브라우저 하네스는 제품 UI → 로컬 HTTP → PGlite → 가짜 모델 저장 → 교사 공개 → 학생 UI를 돌았다. 69개 요청, 가짜 모델 8회(채점 3회), 브라우저 오류·외부 요청·가로 넘침 0이었다. 공개 전 학생 목록과 SVG의 첨삭이 모두 0이고, 공개 뒤 확대 모달에서 번호 중심의 `elementFromPoint`가 적재된 사진을 가리켰다. `document.fonts.load("700 23px Gaegu", "대응하는 각도")`에서 실제 적재를 확인했다. 로컬 PDF 사진은 300dpi MuPDF로 래스터화했다. 채점 세 쪽에서 v3 예약 입력 상계는 기존보다 쪽당 **1,308 토큰, $0.005232** 늘었다. 실제 제공자 청구액 측정은 별도다.

| 화면 | 390px | 1440px |
| --- | --- | --- |
| 교사 초안 | `/tmp/cb-scan-markup-m3/markup-teacher-draft-390.png` | `/tmp/cb-scan-markup-m3/markup-teacher-draft-1440.png` |
| 학생 공개본 | `/tmp/cb-scan-markup-m3/markup-student-published-390.png` | `/tmp/cb-scan-markup-m3/markup-student-published-1440.png` |
| 학생 확대 | `/tmp/cb-scan-markup-m3/markup-student-photo-390.png` | |

브라우저 증거 JSON은 `/tmp/cb-scan-markup-m3/flow-evidence.json`이다. Gaegu Bold 700은 상류 TTF의 전체 글리프를 유지해 WOFF2 약 473KiB로 압축했다. 원본 OFL은 `public/fonts/Gaegu-OFL.txt`에 있다. [상류 Gaegu 배포 파일](https://github.com/google/fonts/tree/main/ofl/gaegu)

## 시안과 실물 검수

- 촬영 사진에는 맞춤된 A4의 칸 테두리와 빨간 번호를 그린다. 설명은 결과 목록에 두며 시안의 Gaegu 700·23px, 번호 13px, 공개 전 11px·불투명도 0.6을 적용했다. 검증된 배치가 들어오면 그릴 mm 좌표 입력을 SVG 함수에 둔다.
- 기존 발행본에는 문항 번호의 좌표가 없다. 사진 판정 기호의 현재 기준은 해당 판정의 첫 답 칸 왼쪽 위다. 문항 번호 바로 위에 정확히 맞추려면 발행 때 번호를 따로 계측해야 한다. 원장님께 현 위치로 충분한지, 좁은 화면에서 설명 최소 23px과 확대 후 번호 크기가 읽기 좋은지 실물 검수를 요청한다.
- 운영 빈 지면 래스터를 결정한 뒤 설명의 빈 자리와 줄 끝 번호·물결 밑줄을 검증한다. 이번 확인은 합성 사진·로컬 DB·가짜 모델에서 수행했다.

시작할 때 로컬 M1/M2 `60c6ef01b`를 작업 가지에 충돌 없이 병합했다. 구현 커밋은 `913f8a3b1`, `2bc88ea4a`에 있다. 작업 중 공유 DB 접근·적용과 유료 호출은 0회다.
