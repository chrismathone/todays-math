# 추가 지시 4 — 재개 실행 경로의 실제 복구

2026-10-08 사용자의 지속 실행 요청을 유지한다. **추가 지시 3의 Orca 예약 자동화는 실제 실행에 실패했고 지금 비활성화했다.** 첫 예약들은 precheck 실패, 이후에는 프로젝트 연결 오류로 건너뛰어졌으며, 설정 완료만으로 실제 재개 성공을 주장했던 보고는 정정한다. 실패 기록은 삭제하지 않았다.

## 현재 실행 경로

- Windows 예약 작업: `TodaysMath-ExamContinuation`.
- 간격: 15분, 로그인한 현재 사용자, Limited 권한, 숨은 PowerShell 창.
- 컨트롤러: `C:/Users/user/orca/artifacts/outputs/exam-continuation-watch-20261008/controller.ps1`.
- 실행/건너뜀/접수 기록: 같은 폴더의 `last-check.json`, `checks.ndjson`, `last-send.json`.
- 기존 Orca 자동화 `358474c8-24be-49ee-b3c9-55fbebf68de4`는 비활성화 상태로 보존한다.

설치된 Orca 실행 파일을 절대 경로로 호출해 현재 작업트리와 터미널을 다시 조회한다. 상태가 불명확하거나 작성자가 작업 중이면 입력을 보내지 않는다. 예약 작업의 `IgnoreNew`와 컨트롤러 파일 잠금으로 감시 중복 실행을 차단한다. 수학 코드·문항·그림·승인 원장은 컨트롤러가 직접 작성하지 않는다.

기존 Codex 세션의 실행 도구에도 `helper_unknown_error: setup refresh had errors`가 발생했다. 해당 프로세스만 종료하고 원래 대화·가지·파일·미커밋을 보존한 채 설치 CLI의 `--no-daemon --sandbox danger-full-access --ask-for-approval never`로 다시 시작했다. 이는 이번 세션에 이미 적용된 full access/never 설정을 런처에 명시한 것이며, 공유 전역 설정이나 보안 제품을 변경하지 않았다. 원래 세션의 `Get-Location`, `git status` 실행 및 `tool-ready.json` 작성/되읽기로 실제 명령·쓰기 복구를 확인했다.

주 작업자는 창작/검수와 실제 코드 작업을 계속하며, 다른 Codex 작업자를 재개할 때도 현재 허용된 실행 설정과 실제 명령/쓰기 성공을 확인한다. 같은 도구 실패를 반복하는 것만으로 작업 진행을 기록하지 않는다. 모델·추론 강도와 원래 대화는 유지한다.

전체 목표가 실제 달성되거나 사용자가 정지/취소하면 `Disable-ScheduledTask -TaskName TodaysMath-ExamContinuation`과 제어 폴더의 COMPLETE/STOP/PAUSED를 함께 기록한다. 기존 전면차단 기준과 모든 학년·교육과정/원본·잠금/권리·검수 조건은 유지한다. 작성 58문항을 전체 승인·적재 완료로 취급하지 않는다.
