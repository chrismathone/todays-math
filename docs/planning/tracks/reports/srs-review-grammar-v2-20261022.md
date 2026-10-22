# SRS review grammar version 2 — 2026-10-22

숫자 복습 풀이의 `이하은` · `초과은` · `큰/작은 수만가`를 새 version 2에서만
교정한다. version 1의 문구·수학·템플릿 출력은 오타를 포함하여 exact
`7f68007dd2970ad8189c3674a7f79b957dd361e4`와 동일하게 보존한다.

## Reader R

부모는 정확 `7f68007dd2970ad8189c3674a7f79b957dd361e4`다. 저장 identity의
version만 1 또는 2로 읽으며 seed/cardIds와 public API shape는 그대로다.
공통 `reviewVariantCard` resolver에서 version 2의 범위 카드 explanation/note만
바뀐다. 숫자·선택·채점·활동 순서·정의·ID·일정·분량·FSRS·별·권한은 변경하지 않는다.
이 reader에서도 **신규 memory writer는 version 1**을 쓴다.

R을 먼저 납품한 뒤 작업트리·index·HEAD를 동결하고 리드의 독립 검토·build·push·
운영 성공 통지를 기다린다. 그 뒤 편집 소유권을 돌려받아야 W를 시작할 수 있다.
W는 R을 부모로 하는 별도 커밋이며 amend/rebase/squash하지 않는다.

## 검증

증거는 저장소 밖
`/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/grammar-v2/`에 둔다.
실제 학생 원본 payload는 저장소·회귀 fixture·보고서에 옮기지 않았다.

- exact 7f의 제품 코드에서 새 grammar 회귀가 **2실패/9통과**:
  `grammar-red-final.log`. version 1 byte 비교는 통과하고 실제 조사 오타를 잡는다.
  최종 시험으로 exact 7f의 제품 두 파일을 잠시 복원해 RED를 재현한 뒤 finally에서
  R 파일 바이트를 복원했다. R GREEN **11/11**은 `grammar-green-final.log`다.
- version 1 **5카드 × 640씨앗 = 3,200개**의 전체 카드 JSON을 exact 7f의
  원본 템플릿을 별도 로드한 결과와 byte 비교한다. 정본 카드 원천 파일도 무변경이다.
- version 2는 **네 용어 각각 640씨앗**, 각 용어의 true/false 각 320개를
  검산한다. 발문에서 기준·용어를 읽어 숫자의 포함/방향을 독립 비교하고,
  참거짓 문장에서 기준 포함 여부를 검산한다. 전체 카드의 다른 필드도 v1과 비교한다.
  나머지 세 카드의 v2 출력은 v1과 전체 JSON이 같다.
- 기존 reader 회귀를 v1과 v2 모두 실행한다. 소수·반올림·올림을 포함한
  5카드 × 640씨앗의 수학 검산, 225개 미지원/static, public label→채점,
  오답→재시도/풀이→reload→알겠어요, 완료일 identity·replay를 확인한다.
- 동일 답을 v1/v2에 끝까지 제출하고 매번 strict 저장 parse를 거친 뒤
  카드 일정·history·별·완료일 내용이 identity 외에는 JSON byte로 같음을 확인한다.
  과거 static/v1/v2 day replay는 history·일정·별·완료일 저장을 바꾸지 않는다.
- 실제 GET/POST route를 인증·저장소만 메모리 mock으로 실행한다. static/v1/v2의
  5카드 × 예/참거짓에 대해 label 선택, 채점, 두 오답, 공통 풀이, reload,
  같은 requestId 재전송의 추가 쓰기 없음, metadata 비노출을 확인한다.
  비로그인 GET/POST는 저장소 접근 전 401이다. 실제 HTTP/DB 호출은 없다.
- R 신규 memory가 v1을 쓰는 기존 회귀를 유지한다. unit/repair·첫학습 filler·
  옛 열린 static session은 표시하지 않는다. exact 7f strict identity reader는
  v1을 받고 v2를 거절하며 새 reader는 두 version을 읽는다.

R 관련 **10파일 143시험 통과**(`reader-tests.log`, `--maxWorkers=3`),
변경 TS 명시 ESLint·affordance·전체 `tsc --noEmit --incremental false`·
`git diff --check` 통과(`reader-eslint.log`, `reader-affordance.log`, `reader-types.log`).
기존 ExFAT 중복 type 진단은 이 root node_modules에서 발생하지 않았다.
최초 실행에서 한 수학 검산이 장시간
정지 후 timeout됐고(`reader-initial-tests.log`), 설정 변경 없이 재실행한
집중 60시험 및 최종 관련 시험은 통과했다. baseline QA 로더의 alias/상대 import
준비 오류도 제품 RED와 구별했고 실제 오타를 잡은 RED를 다시 확보했다.

R SHA와 clean 상태는 선납품 메시지와 외부 로그로 전달한다.
이 작업자는 모델/유료 API/공유 DB/운영 API/browser/server/build/push/deploy를
실행하지 않았고 deps/lock/env를 변경하지 않았다. 기존 untracked engine 자료
3파일은 경로·바이트 그대로 보존하며 stage하지 않는다. 운영 시각 검수와 배포는 리드 소유다.
