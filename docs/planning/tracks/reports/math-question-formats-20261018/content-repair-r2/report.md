# 17행 오류 수정 R2 · 수선은 그림에서 세기

2026-10-18 · Codex · 승인 계획 SHA `50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61`

소스 `141d2c638`과 이 디렉터리의 manifest·before-ledger가 **최종 내용 검토 대상 R2**다. R1의 소스·manifest는 실행하지 않는다. 17 ID와 수정 원인은 [R1 보고서](../content-repair/report.md)와 같으며 공유 DB 쓰기는 여전히 **0회**다.

coordinator의 실제 학생 지면 검토에서 `quad242PerpCount`의 기존 문장이 수선 개수를 미리 알려 준다는 문제가 확인됐다. 소스 발문을 **“그림에서 평행한 두 직선 사이에 그은 수선은 모두 몇 개인가?”**로 바꿨다. 수정 후보 4행의 실제 그림에서 4·5개를 세어 답하게 하며 원래 seed·k·ID·코드·단답/객관 정답·객관 보기와 정답 위치는 보존했다. 교사용 해설에만 계산된 개수가 남는다. 생성 함수의 앞으로의 발문은 k2·k3에도 적용되지만, **이미 저장된 k2·k3 행은 이 17행 수정에 포함하지 않으며 업데이트하지 않는다.** 글로벌 refresh를 실행하지 않는다.

나머지 13행은 R1의 정답 유일성 수정 그대로다. tri221PickIso의 기존 eqTri와 rightTri 자리, tri222Pick의 wideTri와 rightTri 자리는 모두 명백한 부등변 도형이며 기존 전역 모양은 그대로다. 사다리꼴은 포함 정의로도 유효 정답 하나, 정다각형은 변과 각 두 조건을 모두 명시한다. actual SVG의 변 길이·외적·내적·개수 독립 검산은 `coordinate-verification.json`에 있다.

공유 DB를 새 읽기 전용 트랜잭션으로 읽은 결과 17행의 최초 payload digest와 11개 참조 열의 0값이 다시 일치했다. 비공개 **전체 before snapshot의 파일 바이트도 R1과 동일**하다. 전체 원본과 R2 실제 후보는 다음 경로에 있고 커밋된 before-ledger·manifest가 파일 SHA와 행별 payload/full-row digest를 연결한다.

```text
.qa-artifacts/math-question-formats-20261018/content-repair-r2/before-private.json
.qa-artifacts/math-question-formats-20261018/content-repair-r2/candidates-private.json
```

`scripts/qa/bank/math-question-repair.ts`의 기본 경로는 이제 R2다. `prepare`와 `verify`만 실행했으며 `apply/revert`는 실행하지 않았다. root 실행은 커밋된 `claude-content-approval.json`의 exact 계획/source digest/manifest/before-ledger SHA, 두 명시적 환경 gate와 `--apply`가 모두 있어야 가능하다. 실제 쓰기 전 다시 runtime FK+SQL-only 참조를 발견하고 테이블 잠금→참조 0→전체 17행 CAS를 확인한다. 한 참조나 한 행 충돌도 업데이트 전에 전부 중단한다. updatedAt·ID·코드·그 외 필드를 readback으로 보존하고, 역작업도 자기 payload가 그대로이고 참조가 0일 때만 허용한다. 형제 group key는 변경 후 NULL이며 실제 pair 재증명 전 임의 복구하지 않는다.

R2 실제 학생/교사 `TestPrint`를 Chromium에서 다시 렌더했다. 학생 17문항·교사 17해설·15개 A4 페이지에서 수식/콘솔/네트워크 오류와 질문·해설·SVG 넘침이 0이다. 교사용 sentinel은 학생 지면 0개, 교사 지면 17개다. 측정은 `browser-verification.json`, 실제 화면·PDF는 비공개 `.qa-artifacts/math-question-formats-20261018/repair-r2-paper-evidence/`에 있다. 수선 발문에서 답 개수가 사라졌고 그림의 개수·평행/직각 표시가 대응한다.

범위 TypeScript와 15개 전용 시험이 통과했다. 시험은 실제 SVG 풀이, full-row SQL CAS와 미래 FK discovery, 보호 도구의 멱등/역작업/새 참조 중단, 실제 저장된 pair의 key proof, 계획·소스·원장·Claude 승인 SHA/커밋 거부를 포함한다. PGlite는 운영 권한과 동시 잠금의 증명이 아니다. `/dev/print-check`의 세 관련 항목은 모두 **대기**이며 종이 출력은 미검수다.

별도 Claude 내용 승인과 root의 보호된 적용·실제 DB readback이 남아 있다. R2 최종 manifest SHA와 before-ledger SHA는 `preparation.json`에 있다. 기존 R2/R5 wave1 승인·108행 원장·frozen138 적재기는 변경하지 않았다.
