# 기출 쌍둥이 · 엔진 작업 — 다른 컴퓨터 인수인계

사용자 최종 지시: **잔여 작업과 방금 도착한 회신까지 모두 인수인계 문서에 남겨 푸시하고, 이 컴퓨터의 불필요한 작업트리를 정리한다.** 이 문서는 현지 실행을 이어가라는 지시가 아니다. 2026-10-22 기준이며 원본·검증 증거와 미완료 코드를 구분한다.

## 1. 받아야 할 기준

- 저장소: `https://github.com/chrismathone/todays-math.git`
- 이어받을 브랜치: `chrismathone/exam-extraction-resume-20261008`. 이 문서가 들어 있는 최신 원격 커밋을 받는다.
- 마지막 검증된 공용 편집기 구현: `8ba64fd4ed1426812cb6e4830c2ec473c069b6ca`.
- 하위 검수 작업자 보존 기준: `a66e54d1f2c4f7010d9c3e3687ef24d23dffb497`. 원격 보존 태그 `archive/exam-source-identity-20261022`에서 재현한다. **과거 작업자 코드이며 최신 main을 통합하기 전에는 공유 DB에 연결하지 않는다.**
- 엔진 원장: `.qa-artifacts/exam-resume-20261008/engine-upgrades-progress-r69.json`.
- 문항 기준: `.qa-artifacts/exam-resume-20261008/current-authored-batches-v50.json`. v51 로컬 초안은 자동 승격하지 않는다.
- 미완료 파일·복구 도구·보존 명세: `.qa-artifacts/exam-resume-20261008/handoff-other-pc-20261022-r1/` (이하 `H`).

문서·원장에 남아 있는 `C:/Users/user/orca/...`는 이전 컴퓨터 경로다. 새 checkout을 기준으로 경로를 계산하되 봉인된 입력·풀이·검수 JSON을 경로 수정 목적으로 덮어쓰지 않는다. 실제 자산 바이트·SHA와 현재 후보 ID의 일치부터 확인한다.

## 2. 현재 업무 경계

이 세션은 **생성 엔진과 공용 도형 편집기**를 맡았다. 다른 컴퓨터의 118,166문항 전수 검수·재구축 및 문제 지면·서술형 묶음과 구분한다. 이미 출제되거나 등록된 문항을 수정하는 작업은 이 인수인계 범위가 아니다. 다른 세션은 examStudy 및 `m3.ts`, `m3figures.ts`, `m3root.ts`, `renderFigureSpec.ts`, `expandEngine.ts`, `deriveFormats.ts` 등 겹치는 엔진 파일을 직접 고치지 않고 결함 목록을 넘기기로 했다. 실제 다음 변경 전에 최신 원격과 담당 범위를 다시 대조한다.

공유 DB의 이 세션 쌍둥이 계보도 다른 문항 재구축에서 제외한다. 운영 삭제·재적재·자동 잠금 해제·승인·배포 권한으로 해석하지 않는다. 이번 실행의 운영 DB 쓰기·문항 승인·적재·배포는 0이다. 기존 82개 잠금, 보정 원장 3개와 경산여 19 영구 제외를 유지한다. 10/03 DB 스냅샷은 현재값이 아니다.

최신 사용자 AGENTS 지시와 프로젝트의 reader floor를 먼저 확인한다. 특히 SRS reviewVariant v1/v2 등 새 reader 지시가 옛 checkout의 AGENTS 파일보다 최신일 수 있다. 이 세션은 SRS·학생 개념은행을 수정하지 않았다.

원래 기출 지시는 `docs/planning/tracks/brief-exam-extraction-resume-20261008.md`와 addendum-1~6, `brief-exam-extraction-resume-20261012-addendum-7.md`에 보존돼 있다. 최신 엔진 전담·다른 컴퓨터 인수인계 지시가 실행 범위에서 우선한다. 기존 source=past_exam/원본 그림 loader를 쌍둥이 적재기로 그대로 쓰지 않는다. 표현·역추론 변형에서는 정의역·단위·부호·길이 양수·존재·유일성·선택지와 새 선수개념 유입도 검사한다.

## 3. 방금 도착한 회신 — 이미 완료, 중복 적용 금지

math-figure-editor 담당자는 optional r2 입력 후보를 검토·적용해 **`a32662cf57ee71ffc8bf45ffffa87933c939d423`**를 `origin/master`에 푸시했다고 회신했다. source 저장소에서 해당 커밋과 갱신된 동기화 문서를 읽어 `H/source-ack-a32662c/`와 JSON 명세에 보존했다.

- 원본 담당자 자체 검증: 입력 회귀 3개 + 수식 틀 123개 = 126시험, 타입·프로덕션 빌드, Chromium 분수 칸 → TeX → PNG → 재열기, 외부 요청·페이지 오류 0. 이는 **원본 담당자의 증거**이며 todays-math 검사에 합산하지 않는다.
- 저장 대기의 커스텀 수식 입력은 원본 `27ac9fc`와 todays-math 모두 기존 `fieldset disabled={busy}`에 `inert={busy}`를 더해 막았다. 중복 수정하지 않는다.
- FINAL-2의 탭 클릭 경고 삭제는 포팅 중 생긴 차이였다. 원본의 새 결함으로 분류하지 않는다. 이전 3파일 역반영 후보는 적용 대상이 아니다.
- 원본 앱의 관리자·서버 저장·IP 차단·공용 최근 작업은 앱 전용이다. todays-math에 가져오지 않는다. `b4d6a19` 등 Vercel 미들웨어 후속 변경도 이 포팅과 무관하다.
- Native 시험지 한글화는 담당자 회신상 `d46c238` 코드, `baaa421` 배포 기록, 0.1.27 EXE, 관련 120시험·기존 7종 픽셀 차이 0·import selftest 통과다. 기존 corpus 21 품질 문제와 Gemini 잔액 402는 별도 기록이며 이 인수인계가 해결한 것이 아니다.

공용 편집기 포팅은 이미 끝났다. 이 회신을 추가 기능 구현이나 배포 요청으로 다시 해석하지 않는다.

## 4. 완료된 todays-math 편집기 범위

`8ba64fd4e`에 세 번째 수식편집기 탭·123구조 틀, MathLive 0.111.1 지연 로드·폰트 20개와 LICENSE, 틀 전체/가로/세로 확장, 일반 그룹 변환, PNG 전용 외부 저장·이벤트, 불투명 내부 복사를 반영했다. 기존 ‘도형 적용’과 SVG/dataUrl/originalImage 저장·비동기 호스트 콜백을 유지했다. 등록 41종/과거 39종 자산 frame·위변조 검사와 화살표 `406615bf8`을 보존했다.

실제 검사: 20파일 517시험 통과, 변경 운영 코드 11파일 타입 오류 0, 프로젝트 ESLint 11파일 오류·경고 0, affordance 10파일 위반 0, Edge 1280/768/390/320px 4화면 통과. 실제 수식 입력·PNG·이벤트 1회·비동기 적용·저장 중 입력 차단·재열기를 확인했다. 전체 Next 빌드나 main 병합·운영 배포까지 했다는 뜻은 아니다.

검증 보고서: `docs/planning/tracks/reports/exam-engine-editor-final-20261022.md`. 세부 증거와 push receipt는 `.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/editor-final-20261022-r1/`에 있다. 마지막 EOF 빈 줄 정리는 원래 바이트와 현재 SHA의 동일 내용 연결을 별도로 남겼다. 실패·보류 기록도 보존했다.

공유 node_modules는 main 정션이었다. 여기에 npm install/prisma generate를 실행하지 않았다. package/lock은 독립 폴더에서 lock-only로 갱신했고 검증은 integrity를 확인한 별도 0.111.1로 했다. 당시 정션 설치본 0.110.0은 그대로였다. 다른 컴퓨터에서도 설치 경로가 정션인지 확인하고, 독립 checkout/deps에서 준비한다. Next 변경 전 해당 설치본의 `node_modules/next/dist/docs/`를 읽는다.

## 5. 다음 우선 작업 — M5 산점도 최종 검증 마무리

현재 운영 코드의 adapter version은 `20261022-scatter-grid-reading-without-coordinate-lists-r2`다. 06/07/08/09/10/11/12/14/15의 아홉 유형에서 학생 발문의 좌표 목록을 제거하고 5단위 모눈·과목 축을 사용했다. 12/15 해설 연결 문구도 고쳤다. 기존 type13·비대상 경로·family ID를 유지한다.

증거 폴더: `.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-final-20261022-r2/`.

- 현재 입력으로 새로 봉인한 학생용 SVG 144개, 독립 풀이 144개, 봉인 후 정답·점 집합 대조 144개 일치 기록을 보존한다. 원문 21검산이나 이전 좌표 목록 버전의 승인을 새 승인으로 복사하지 않는다.
- 독립 풀이·점 전사 원문은 `.qa-artifacts/exam-resume-20261008/m5-scatter-final-current-audit-20261022-r2/own-solutions.json`, `own-readback.json`, `own-report.json`에 있다. 가져온 커밋 `327dcc540`, 원래 봉인 커밋 `0b9bcaad0`이며 풀이 SHA는 `1143d778ba6d20ca9b543b70b953d80e6419cccf1cfe42cc475c3c5ab3a05050`이다.
- 마지막 관련 검사 기록은 **194 통과/5 실패**다. 실패 5개는 예전 발문 좌표 목록을 읽던 시험 parser다. 공유 편집기 517 통과가 이 실패를 해결한 것은 아니다.
- 미커밋이던 `middleM3Stat2.test.ts` 초안은 `H/wip/parent/`에 원본 바이트로 보존했다. SHA `b3de8fc781d185a73798c159a447b5d92967dca7538dd1a8b278f8e02f54e049`. 아직 검증된 시험 수정이 아니다.
- 초안의 `plottedStudentPoints`는 strict SVG의 축 숫자와 circle 중심에서 학생에게 보이는 점을 읽는다. raw FigureSpec/facts를 답 oracle로 쓰지 않는지 다시 검토한다. 중복·숨겨진 점, transform, 유한성·정수·범위·점 개수를 확인한다. 그림 픽셀을 수학적 정답 oracle로 삼지 않는다.

다른 컴퓨터에서 할 순서:

1. `H/restore_wip.py`로 부모 초안의 preimage를 확인한 뒤 별도 checkout에 복원한다.
2. 위 폴더 `run_final_checks.py tests handoff-pc2-tests-r1`로 해당 시험을 실행한다. 새 label을 써서 기존 결과를 덮지 않는다.
3. `run_final_checks.py capture handoff-pc2-capture-r1`로 현재 코드의 실제 출력·strict SVG가 봉인한 144입력과 동일한지 재확인한다. 이 동일성 대조를 새 독립 풀이 144개로 세지 않는다.
4. `run_final_checks.py related handoff-pc2-related-r1` 및 변경에 맞는 타입·린트를 실행한다. 해당 스크립트의 최소 메모리·단일 worker·독립 cache·DB localhost:1 설정을 확인한다.
5. 새 결함이 나오면 관련 단계와 영향 유형만 고치고 현재 후보·본문·그림·blind 풀이·검수 해시를 다시 묶는다. 학년·권리·native/reader 보류를 자동 해제하지 않는다.

## 6. 다른 엔진 잔여 및 보류

|범위|실제 상태|다음 검증|
|---|---|---|
|M4 주어진 전체각|54개 치수 보존, 전체 halo 소유관계 38통과/16보류(B6/D10)|현행 radius14/distance30 기준 16건을 해결하고 치수·주어진각·family 경로 보존 확인|
|M4 QA 시제품|512 조합 탐색, 후보 수치에서 45통과/9보류|QA만 존재한다. 현행 운영 16보류를 9보류로 바꿔 집계하지 말 것|
|M14 교점 O|참조 보완 완료, native 10통과/10보류|기존 mode1 EF 치수 충돌 해결. EF를 뺀 그림은 승인하지 않음|
|U01–U28 및 M 계열 다른 카드|r69의 부분 구현/최신 main 재감사/보류 상태 유지|r69 원장과 다른 세션의 결함 인수인계 목록을 대조해 실제 코드 개선·검증|
|imagegen 이미지 문제 지원|저장 자산·해시·수학 조건 연결의 제한된 native 지원|공개 catalog/API 등록, 다중 매개변수·검색·출력·검수 재현성은 별도 완료 기준|

M4: `engine-upgrade-20261019/m4-given-trapezoid-angle-20261021-r1/`, `m4-ownership-prototype-20261022-r1/` 및 독립 `m4-given-angle-current-audit-20261021-r2/`. M14: `engine-upgrade-20261019/m14-intersection-20261021-r1/`와 `m14-current-artifact-audit-20261021-r2/`.

학교별 추가 제작이나 기존 문항 재검수는 엔진 전담이라는 최신 범위에 맞춰 별도 담당과 조율한다. 전체 추출/쌍둥이/엔진 개선을 준비·표본·이번 편집기 완료와 혼동하지 않는다.

## 7. 문항 집계와 유지할 관문

r69/v50 실제 집계: 현재 작성 174문항, 그림 117개, 새 통계표 28개, 내장 imagegen 2개. 현재 후보에 연결된 pre-exposure 풀이 174, 독립 수학·학년 검수 173, 내용 통과 15/보류 158, 추가 독립 검수 수집 대기 1. **전체 검증 완료 0, 적재 가능 0**이다. 현재 raw point 전사 제한 등 원장 보류를 유지한다.

원본은 `N:/개인/기출`의 2025년 이후만 참조한다. 동일 시험 HWP/PDF는 내용을 근거로 묶는다. 같은 수학 개념·핵심 풀이·교육과정·목표 난이도를 유지하되 자연스러운 발문 구조/소재 전환, 대수↔기하 표현, 질문 대상 역전을 사용한다. 숫자·이름·동의어만 바꾸어 완료하지 않는다.

본문·보기·그림·표기·정답형식·학생용 해설·필수 풀이·선수개념 전체에서 해당 학년 밖 개념을 강제 제외한다. 2015/2022 적용 연도·학년, 성취기준·실제 Unit UUID·live family 근거를 남긴다. 불명은 보류한다. AI 확률이나 상위 학년 풀이로 통과시키지 않는다. 학교명은 공개되는 모든 위치에서 일관되게 교체하고 실제 출처는 내부 메타데이터에 보존한다.

답·해설·그림은 새로 만들고 바뀐 문제를 독립 풀이·검산한다. 코드/벡터로 되는 도형은 기존 엔진, 어려운 삽화는 내장 imagegen skill을 읽고 로컬 원본을 view_image로 확인한 후 만든다. 임의 유료 API/CLI 전환이나 운영 앱이 skill을 직접 호출한다는 가정을 금한다. 권리·유사성 검토는 별도 관문이며 변형만으로 허가됐다고 단정하지 않는다.

TypeSafe 분류·검수·라우팅을 설계/변경할 때는 프로젝트 skill과 live docs를 먼저 읽는다. 계산은 코드로 한다. 메타데이터에는 단원·family·교육과정·난이도·유형·형식·배점·출처·변형 ID/delta·그림·검수 근거를 연결한다.

## 8. 하위 작업자 미완료 초안

`H/wip/worker/`의 4개 파일은 `a66e54d1f` 기준 별도 작업자 초안이다.

- `scripts/import/exam-twin/candidatePack.mjs`
- `scripts/import/exam-twin/review-exam-twins.mjs`
- `scripts/import/exam-twin/curriculumDeclarations.mjs`
- `scripts/import/exam-twin/curriculumDeclarations.test.mjs`

명시된 성취기준 선언끼리의 비교와 보류 처리를 다루며, **최신 부모 경로에 통합·검증된 코드가 아니다.** 아카이브 작업자 기준에서 먼저 복원해 diff를 읽는다. 부모의 최신 candidatePack/검수/reader 계약을 파일째 덮어쓰지 않는다. 이 초안을 학년 승인이나 적재 허가로 사용하지 않는다.

## 9. 다른 컴퓨터 시작 명령

다른 작업과 분리한 새 복제본에서 시작한다. 기존 main/다른 세션의 미커밋 변경 위에서 checkout하지 않는다.

```powershell
git clone --branch chrismathone/exam-extraction-resume-20261008 https://github.com/chrismathone/todays-math.git todays-math-exam-engine
Set-Location todays-math-exam-engine
git fetch origin main
git status --short
python -X utf8 -B .qa-artifacts/exam-resume-20261008/handoff-other-pc-20261022-r1/restore_wip.py --owner parent --target .
# preimage가 모두 맞고 미완료 시험을 이어서 검증할 때만 파일 복원
python -X utf8 -B .qa-artifacts/exam-resume-20261008/handoff-other-pc-20261022-r1/restore_wip.py --owner parent --target . --restore
```

작업자 초안이 필요하면 별도 복제본에서 `archive/exam-source-identity-20261022`를 받아 그 태그에서 분기하고, `H`의 복원 도구·manifest·wip/worker를 가져와 `--owner worker`로 검사/복원한다. 두 소유자의 초안을 같은 경로에 일괄 적용하지 않는다. 도구는 알려진 preimage와 다르면 쓰기를 중단한다.

의존성과 테스트는 새 컴퓨터 설치 규격에 맞춰 독립적으로 준비한다. 공유 정션에 설치하지 않는다. 푸시 직전에는 항상 target branch와 main을 fetch·비교하고, 새 커밋을 보존 통합해 관련 검사를 다시 통과시킨다. force push·main 자동 병합·자동 배포를 하지 않는다.

## 10. 로컬 자료와 작업트리 정리

Git에는 미완료 파일 5개 원본·preimage·패치·복원 도구, 최신 M5 144봉인 입력과 실제 SVG/대조 기록, M4 시제품, 원본 앱 완료 회신과 인수인계 명세를 넣는다. 재설치 가능한 private deps/cache는 넣지 않는다.

이전 컴퓨터의 추가 미추적·무시된 자료 **14,185개, 3,713,577,148바이트(약 3.7GB)**는 **`C:/Users/user/orca/artifacts/outputs/exam-handoff-20261022-r1/ignored-evidence/`**에 작업트리 밖으로 보존했다. `H/ignored-files-manifest-r1.json.gz`는 파일별 위치·SHA·크기를 담는다. 같은 NTFS 볼륨의 보존용 hardlink는 원래 파일을 작업트리와 함께 제거해도 바이트를 유지한다. 이 보존 폴더를 수정하지 않는다. 필요 시 전체 폴더를 다른 컴퓨터로 따로 복사한다. 수 GB의 원본 크롭·옛 로컬 산출물 전체가 Git에 업로드된 것은 아니다. 즉시 이어갈 핵심 엔진 자료와 코드 초안은 Git으로 받으며, 특정 과거 원본 페이지/로컬 산출물을 재검토할 때는 N 원본을 해시로 확인하거나 이 보존 폴더를 옮겨 사용한다.

N 원본 및 기존 `C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003`은 수정·이동·삭제하지 않는다. main과 SRS·교재·도형 편집기 등 다른 저장소/작업트리도 정리 대상이 아니다.

로컬 자동 재개 예약 `TodaysMath-ExamContinuation`은 이번 확인에서 Disabled였다. 다른 컴퓨터 인수인계 중 이 컴퓨터에서 재개하지 않는다. 하위 검수 세션은 종료했다. 사용자 요청에 따라 원격 이력·미완료 파일·로컬 자료 보존과 복원 확인 뒤 현지의 두 기출 작업트리만 정리하며, 미병합 코드를 main에 완료 통합했다는 뜻이 아니다. 현재 부모 작업트리는 이 회신을 마친 뒤 별도 정리 프로세스로 종료·제거할 수 있다. 실제 정리 로그는 위 외부 보존 폴더에 남긴다.
