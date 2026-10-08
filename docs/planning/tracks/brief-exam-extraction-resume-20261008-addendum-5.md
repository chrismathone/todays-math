# 추가 지시 5 — Orca 재시작 뒤 원본 세션 유지

2026-10-08 20:35 KST 이후 사용자의 지속 실행 지시를 따른다. Orca 재시작 뒤 기존 실행이 끝나고 빈 신규 Codex가 자동으로 열린 상태를 확인했다. 신규 세션을 기존 제작/검수 문맥이 보존된 원본 세션으로 오인하지 않는다.

주 세션 `01a11702-baf1-7343-b2bc-64cf304bbcc5`를 기존 PowerShell에서 추가 지시 4의 런처로 복구했다. `/status`로 원본 ID와 문맥, Full Access를 확인했고 `continuation-watch/tool-ready-r2.json`에 실제 명령/파일 쓰기와 되읽기를 기록했다. 범일 현재20 검수와 경구22의 답 공개 전 독립 풀이, e3e70ae73까지의 저작58개는 보존한다.

Windows 예약 `TodaysMath-ExamContinuation`의 controller r2는 다음 조건을 검사한다.

- 작업 중이면 입력을 건너뛴다. 파일 잠금과 IgnoreNew를 유지한다.
- 유휴 Codex의 `/status`에서 원본 세션 ID와 Full Access를 확인한 뒤에만 작업 프롬프트를 보낸다.
- 자동 생성된 빈 초기 화면과 문맥 없는 다른 세션임을 확인하고, 저장된 원본 pane의 동일 작업 경로 PowerShell 프롬프트가 존재할 때만 빈 세션을 종료하고 원본 shell에서 재개한다. 다른 대화/문맥/작업 흔적이나 불명확한 터미널은 보존하고 건너뛴다.
- 송신 접수와 실행 증명을 구분한다. 원본 대화 로그의 새 작업 시작/실제 도구 실행도 확인하며, 불명확한 이전 송신 뒤 새 프롬프트를 중복 발송하지 않는다.
- 제어표시/전체 완료/사용자 정지 규칙은 그대로다. 명령·문항·답·그림·승인 데이터를 직접 변경하지 않는다.

운영 파일은 `C:/Users/user/orca/artifacts/outputs/exam-continuation-watch-20261008/`에 있고 r1 controller도 보존했다. 안전조건 제어시험12개 및 실제 작업 중 건너뜀을 확인했다. 오래된 상태 화면의 권한/문맥을 최신 판정으로 재사용하지 않는 조건도 검사했다. 실행 중인 제작을 보존하기 위해 재시작 복구 전체 분기를 강제 재시작으로 검증하지는 않았으며, 이번 원본 재개는 직접 `/status`와 도구 실행으로 검증했다.

이 Windows에서 `Get-CimInstance Win32_Process`와 `Get-ScheduledTask`가 진단 중 반환하지 않는 증상을 확인했다. 이 조회를 제작/검수의 필수 선행 단계로 두지 않는다. 현재 상태는 `Get-Process`, `schtasks.exe /Query`, Orca terminal list/read/show, 원본 로그와 읽기 전용 session sqlite로 확인할 수 있다. 종료 시 `schtasks.exe /Change /TN TodaysMath-ExamContinuation /DISABLE`을 사용할 수 있다.

주 작업자가 복구한 독립 세션은 source-identity `01a1177f-954e-7343-9cfb-e803c179ed85`, geometry `01a1177e-fbb2-7822-a7e2-51c40b39e38f`, algebra `01a1177d-e52b-7511-944f-c2d4edd47c82`다. 각 세션은 이전 파일/답 비노출 이력을 유지하며 실제 명령·쓰기 성공을 확인한 뒤 진행한다. 개별 보류를 분리하고 나머지 제작·검수·2025+ 추출·유용한 생성 엔진 개선을 계속한다. 현재 저작58개나 실행 복구를 최종 승인/운영 적재 완료로 확대하지 않는다.
