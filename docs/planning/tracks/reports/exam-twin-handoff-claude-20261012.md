# 기출 쌍둥이·엔진 작업 Claude 인수인계 — 2026-10-12

사용자는 관련 세션을 잠시 중단해 메모리를 확보한 뒤, **열려 있는 Claude에 현재 진행상황을 넘기고 이어서 진행하도록** 새로 지시했다. 이 문서와 실제 파일을 이어받아 작업한다. 기존 Codex 3개 작업자는 종료 상태로 유지하고, 새 기본 세션·중복 저자를 만들지 않는다. 이 Codex 작성자는 전달 후 작업을 멈춘다.

## 소유 범위와 먼저 읽을 것

- 실제 작성 위치: `C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008`. 현재 branch `chrismathone/exam-extraction-resume-20261008`, HEAD `28ce9974e74f1d854e586009e161926482edd69b`.
- 열린 Claude의 시작 폴더가 `D:/todays-math`여도 이 기출 작업은 위 워크트리에서 수행한다. main이나 다른 활성 작성자의 파일에 직접 쓰지 않는다. 새 워크트리를 만들 필요가 없다.
- 최신 `D:/todays-math/AGENTS.md`, 최초 기출 brief와 addenda 1–6, `docs/planning/tracks/brief-exam-extraction-resume-20261012-addendum-7.md`, 이 문서, v11 보고서와 원장을 읽는다. TypeSafe 분류/검수/라우팅 설계는 프로젝트 skill와 live docs, Next 변경은 설치된 `node_modules/next/dist/docs/`를 먼저 읽는다. UI·학생 개념은행은 이번 범위가 아니다.
- 마지막 확인 원격 feature는 `439094fe9d4aced0497c88ec32b816dd9917a448`이다. 그 뒤 source67 worker를 통합한 HEAD `28ce9974e`는 아직 부모 원격에 푸시하지 않았다. 마지막 통합 main은 `3f4d27f97`; 현재값이라고 단정하지 말고 새 fetch 후 비교한다.

## 실제 집계와 승인 구별

v11 정본: `.qa-artifacts/exam-resume-20261008/continuation-index-v11.json`, `status-ledger-v11.json`, `current-authored-batches-v11.json`; 보고서 `docs/planning/tracks/reports/exam-twin-checkpoint-v11-20261012.md`.

- 현재 작성 **106문항 / 새 그림 84개 / 새 표 5개 / 내장 imagegen 2개**.
- 현재 ID로 묶은 독립 수학·7면 학년 검수 **91**, 내용·분류 **통과15 / 보류76**. 원시 독립풀이 **105 solved / 1 pending**이며 원시 풀이를 최종 승인에 더하지 않는다.
- 최종 승인·적재 가능 및 **이 작업의 운영 쌍둥이 적재0**. 다른 작성자의 교과서/엔진 적재 집계와 섞지 않는다.
- 새 경산 q22 r2 최종 보고서 `.qa.../gyeongsan-q22-final-review-r2/reports/q22.json`는 원시 커밋 `383a5f763` 후 공개한 자료로 작성했고, 최종 worker `b9324223c`가 통합됐다. 수학·전체5보기·7면 학년·원문 핵심 통과, 12검사 중11통과. 정확한 Unit/family/problemType와 권리·native는 보류다. r1 옛 검수를 r2 승인에 재사용하지 않는다.
- 범일20은 수학·학년20, 내용12통과/8보류, 최종0이며 q7은 학년 보류로 제외됐다. 모든 문항의 개별 보류를 전체 차단으로 확대하지 않는다.

## 즉시 마무리할 미커밋 코드와 원장

현재 추적 변경은 `src/app/api/problems/route.ts`, `src/contracts/problem.contract.ts`, `src/__tests__/api/problem.test.ts`와 두 owner 원장의 PAUSED 상태다. API POST 수동 등록에서 `source=past_exam`이면 `directUseAllowed=false`를 명시하도록 고쳤다. 수동 자작은 기존 true이고 검수 상태 승격은 기출 잠금을 풀지 않는다. API 회귀검사는 등록→승격→출제 풀 제외까지 실제 mock 경로를 확인한다. **3파일93검사 통과**했지만 이 코드3개는 아직 커밋·푸시하지 않았다. 배포나 운영 DB 쓰기는 하지 않았다.

`pause-receipt-20261012-r1.json` 및 `continuation-watch/PAUSED`는 당시 사용자 중단 증거로 보존한다. 현재 두 owner 원장의 `executionState`는 PAUSED다. Claude가 소유권을 받은 뒤에는 새 인수인계 실행 상태를 별도 기록하되 v11 동결본과 옛 중단 증거를 덮어쓰지 않는다. 미추적 `.qa-artifacts`는 Git 기본 상태에 안 나오므로 아래 새 폴더를 함께 확인한다.

코드와 새 원장을 검증해 scoped checkpoint로 커밋하고 feature에 중간중간 푸시한다. **매 푸시 직전 target feature와 main을 fetch·비교, 새 변경 보존 통합, 관련 검사 재실행, fast-forward만**. force push/main push/병합·배포로 확대하지 않는다. 가져온 main의 CRLF 검수 증거를 공백 정리로 변조하지 않는다. own scope `git diff --check`와 바이트 해시를 확인한다. 공유 hook의 deps 생성은 피한다.

## 진행 중이던 독립 작업과 다음 조치

1. **경상 나머지 GF14 최종검수**: Geometry 작업트리의 `.qa.../gyeongsang-remaining-final14-r1/`는 14개 solved만 따로 공개한 package/blind/review/context다. 원래 GF15 원시 풀이 커밋 **`ebc4e14137ba351cf4b4f1f65cafd536271a821b`**, 원격 worker **`d68b5f2c87f6039af879817ef1a9c9fb159c4a8f`**가 통합돼 있다. 원시15 =14solved/q18pending; q18은 학년·복잡성 보류이며 private 공개에서 제외됐다. 원시 hash와 기존15 동결본을 바꾸지 않는다. 현재 GF14 검수는 착수했으나 보고서 완료·합산하지 않았다. 작성자가 SourceIdentity, 풀이자가 Geometry였던 독립성을 보존한다. 부모에선 저자 답을 읽은 뒤 풀이를 새 blind라고 부르지 않는다. 완료 후 current candidate/student/asset/solve/report를 다시 묶어 새 버전으로 집계한다.
2. **경상 통계 q13 r5 수정본**: 부모 `.qa.../gyeongsang-q13-metadata-repair-r5/`에서 내부 설명9곳의 편차 방향 오류를 고쳤다. 학생 본문/보기/답/해설/수학 facts는 r4와 동일하지만 새 ID/studentDigest이며 **r5는 아직 미선택**이다. 부모 `.qa.../gyeongsang-q13-r5-review-r1/`에 freeze와 blind가 있다. SourceIdentity 작업자는 실제 기존 답 비노출을 선언했고 학생 전용 pack만 읽어 정확 유리수 계산(평균86, 누락편차-8, 실제 점수92/81/78/93, 전체5보기)·70mm 표 미리보기를 작성했다. **아직 raw 커밋으로 봉인하지 않았고 private/최종검수 공개도 하지 않았다.** 그 작업트리의 새 raw/code/preview를 보존하고 원시봉인→후공개 검수를 이어가거나 이 노출 이력을 유지하는 독립 절차를 마련한다. 옛 r4 승인을 r5에 옮기지 않는다.
3. **source67 검토 완료·통합**: Algebra worker **`b2de0fe07d248557f2344f4dd8a383a795d7f138`**의 `.qa.../next-three-source-review-r1/`가 부모 HEAD28ce에 통합됐다. 67개 개별 보고서, 질문 전용 계획 입력42(KSE21/NB21), 학년 강제 제외 제안4(KI18/KSE2/KSE8/NB3), 원본 신원 관측45, **공식 source 인증/authoring release/권리·학년·family/native 승인0**. 부모에 reviewer-only 원본 미리보기131개를 SHA 동일하게 로컬 복사했고 `validate-review.py`67 전량 통과했다. 원본 미리보기는 Git에 올리거나 새 도형·저자 입력으로 쓰지 않는다. 복사 원장 `parent-local-evidence-copy-r1.json`만 연결한다. KI 전부는 실제 인쇄1학기와 이름2학기 충돌, 종전96/새100 배점 충돌을 둘 다 보존해 보류한다. KSE 원본01 답안지 포함PDF 전체를 격리한다. NB15–17 공통 조건/그림 귀속 결함은 별도 staged 질문에서만 교정했고 raw 파서는 그대로다.
4. **노변 NB5 제작 착수**: 동일 Algebra 작업자에 NB1/2/4/6/8만 새 pending 쌍둥이로 제작 요청을 전달했고 실제 착수 확인 후 중단됐다. 완료 새 문항 집계는 **아직0**, 작업자는 문맥 압축 중이었다. 각 source-only staged 조건/원문 핵심을 참고해 발문/자료/질문 대상/표현을 실제 바꾸고 새 답·해설·SVG/spec·70mm 문제/해설 미리보기를 만든다. q4는 좌표 절편으로 실제 직각삼각형 구성, q8은 수선 높이와 보통 넓이·대각선의 등넓이로 학년 내 풀이를 할 수 있는지 새로 검증한다. 삼각비 일반 관계/삼각함수 덧셈정리/사인·코사인 법칙/헤론/벡터/외운 삼각비 넓이 공식은 쓰지 않는다. 불법 선수개념이 필요한 개별 후보는 제외하고 다른 후보를 진행한다. 학교 표시명은 새 가명, 실제 노변 출처는 내부 보존한다. 저자 코드 계산은 독립 검수로 세지 않는다. 기존42 계획 whitelist의 authoringReleasedCount0과 원본 보류를 새 초안 작성만으로 승인 변경하지 않는다.
5. **캐시59 및 남은 원본**: NI20/DG22/DD17의 별도 새59 파싱은 아직 전체 구성/신원 검토 전이다. 기존127+67+59 =253은 파싱 관측이며 전체 추출 완료가 아니다. N:가 오전 실행에 없어서 새 r3 reader 원본 읽기는 실패했고 새 파싱0이었다. 현재 다시 실제 mount를 확인하되 미연결이면 캐시 검토/제작/코드를 계속한다. 이미 보존된 next-five reader 동일 바이트가 부모에 있어 삭제한 worker에 의존할 필요가 없다. `.qa.../extract-next-three-source-r3.py`와 `.next-five-extraction-r1/extract_source.py`를 사용하고 실패·옛 코드 증거를 지우지 않는다.

## 강한 수학·권리·운영 제약

- 2025+ 실제 시험지만 참고, 동일 시험 HWP/PDF 중복은 내용으로 묶는다. 같은 개념/핵심 풀이 원리/적용 교육과정/목표 난이도를 유지하고 **원문과 다르게 읽히는 자연스러운 발문·자료·소재·대수↔기하 표현·직접결과↔입력 역추론**을 만든다. 단순 수치/이름/문장 순서 교체만으로 완료하지 않는다.
- 본문/보기/그림·표/표기/답 형식/학생 해설/필수 풀이·선수개념 전체가 해당 학년 내여야 한다. 2025중3=2015, 중3의2022적용은2027부터다. 공식2015 제한 **삼각비 사이의 관계는 다루지 않는다**를 학교 출제나 AI 확률로 넘기지 않는다. actual triangle 정의와 유한 특수각 계산은 일반 항등식과 구별한다. 동치/단위/정의역/부호/양수/존재·유일성/함수·자료 범위를 코드로 검산한다.
- 모든 답·해설·그림 새 제작. 독립 풀이 전 저자 답을 공개하지 않고 공개 전 원시 hash/commit을 보존한다. 원문 답 일치/옛21검산/픽셀 길이를 승인 oracle로 쓰지 않는다.
- 실제 Unit UUID/live family/성취기준/학년·교육과정/난이도/유형·형식·배점/출처/새ID·실제 delta/도형·표/검수 근거를 연결한다. 가까운 제목 family를 억지로 배정하지 않는다. 10/08 r3 DB 분류 snapshot22Units/302families는 역사 근거이지 최신 DB값이 아니다.
- 미세 변경이나 쌍둥이 구조 변경을 저작권 허가로 단정하지 않는다. 권리/유사성/출처 custody/native provenance/reader/학년/검수/운영 적재를 각각 보류·통과 근거로 기록한다.
- **2026-10-12 04:23:29 UTC 읽기 전용 DB 관측**: source=past_exam101 전부direct_use_allowed=false, 직접 출제 가능0, 기존 보호82·보정 원장3개 일치, 새 DB쓰기0. 현재 재조회 전 그 시각 값으로 표현한다. 경산여19 영구 제외/기존 잠금·보정 유지. 운영 삭제/재적재/잠금 해제/배포 금지. 잠금 변경이 필요하더라도 최신 구체범위·원장·되돌리기 근거 없이 확대하지 않는다.
- N원본/옛 산출물/타인변경/학생은행ID·순서·기록은 그대로. 공유 node_modules는D:/todays-math 정션이라 npm install/prisma generate 금지. 필요하면 독립 deps, 기존 설치 docs 준수.

## 엔진 실제 개선과 검증

30개 개선 후보 U01–U30을 추적하지만 이번 기출 작업에서 **운영 생성 경로 완료 인증0**이다. 오프라인 candidatePack/review workflow, exact 통계조건, 상수 정답 동치/단위·역할/오답 쌍 중복, imagegen PNG+engine vector+수학 조건 바인딩, 70mm 미리보기는 실제 구현했고 핵심33검사 통과했다. 이 도구 작성과 전체 엔진 완료를 구별한다. 기존 transformer/원본 past_exam loader를 쌍둥이 적재기로 쓰지 않는다.

전체 추출 후 28초기 후보와 새 발견까지 유용한 유형/조건/정답/해설/도형/imagegen 이미지 문제/검색 메타데이터/재현성·검수 경로를 **실제 코드·검증**으로 연결한다. 보고서나 표본으로 목표를 끝내지 않는다. 이미지 재제작은 imagegen skill를 읽고 로컬 참조를 view_image로 확인, 내장 imagegen이 기본이다. 유료 API/CLI로 임의 전환하지 않는다. 운영 앱이 skill를 직접 실행한다고 가정하지 않고 제작 자산/템플릿과 수학 조건을 연결하는 지원을 설계한다.

## 중단·정리·재개 제어

- 완료 워크트리6개 삭제 확인, original branch6 및 로컬 미추적305파일 보존. 원장 `.qa.../worktree-cleanup-receipt-20261012-r1.json`. 외부 `C:/Users/user/orca/artifacts/outputs/worktree-cleanup-20261012-r1/`는 환경 자료가 들어 있어 **내용을 원격에 올리지 않는다**.
- 중단 때 Codex 보조3개 총PTY8개 종료 확인, 원본 대화/branch/dirty·ignored 자료 모두 보존. 아직 작업트리3개는 미완료라 제거하지 않았다. 필요 없어진 완성 작업은 통합·검증·증거 보존 후 정리한다. 다른 활성 세션은 끊지 않는다.
- original IDs: parent `01a11702-baf1-7343-b2bc-64cf304bbcc5`; Geometry `01a1177e-fbb2-7822-a7e2-51c40b39e38f`; SourceIdentity `01a1177f-954e-7343-9cfb-e803c179ed85`; Algebra `01a1177d-e52b-7511-944f-c2d4edd47c82`. 기존 노출 이력과 로그를 보존해 독립 검수 필요 시 참고하되 이번 인계만으로 이 Codex들을 재실행하지 않는다.
- Windows `TodaysMath-ExamContinuation`은 사용자 메모리 중단 요청으로 Disabled, PAUSED marker를 남겼다. **Claude가 이어가더라도 기존 Codex 자동 재개 예약을 켜거나 marker를 제거하지 않는다**. 외부 Root소유 controller/config도 덮어쓰지 않는다. 별도 Claude 실행 상태를 기록한다. Get-CimInstance/Get-ScheduledTask 조회는 이 환경에서 걸릴 수 있어 Orca CLI/Get-Process/schtasks/read-only sqlite를 사용한다.
- 이번 새 지시는 Claude가 실제 가능한 작업을 이어가라는 승인이다. 개별 보류를 분리해 계속하고, 단계마다 재확인을 요구하거나 작은 보고서로 전체 목표를 완료 표시하지 않는다. 다시 사용자 중단 요청이 오면 멈춘다.
