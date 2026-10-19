# U51 — 저장된 벡터의 strict 재현 점검

**현재 상태:** 아래는 R1 제작·보류 이력이다. [R2 추가 보류](exam-vector-render-replay-r2-hold-20261020.md)를 거쳐 후보/생성 기록의 같은 바이트 파싱·해시를 보완한 R3가 Node 151개와 독립 47개 대조를 통과했다. 실제 벡터 4개를 재현했고, 현재 범위와 한계는 [v33 보고서](exam-twin-checkpoint-v33-20261020.md) 및 [R3 검수](../../../../.qa-artifacts/exam-resume-20261008/vector-replay-code-audit-20261020-r3/own-report.json)가 정본이다. 수학·학년·권리·전체 reader/인쇄 승인과 적재는 분리한다.

저장된 SVG가 문항·그림 해시에 연결돼 있다는 사실과, 현재 도형 엔진이 그 spec에서 같은 그림을 만드는지는 별개의 조건이다. 기존 후보 결합 검사는 새로 바뀐 SVG의 해시도 결합할 수 있으므로, 저장된 SVG의 원 반지름만 잘못 바꾼 경우를 실제 재렌더와 비교하는 읽기 전용 점검을 추가했다. 수학·학년·권리·출처 승인은 이 점검과 분리한다.

`vectorReplay.mjs`는 현재 후보·학생·자산 digest와 입력 바이트를 묶고, 독립된 spec 객체를 `strict:true`로 렌더러에 전달한다. 저장된 SVG와 UTF-8 바이트 해시가 같아야 해당 자산을 `reproduced`로 기록한다. 렌더 실패·SVG 누락·치수 생략·불일치는 보류하며, 그림이 없는 입력을 빈 배열의 참으로 통과시키지 않는다. 실행 중 입력 파일이 바뀌면 유효한 결과를 반환하지 않는다. 이 함수 자체는 파일을 쓰지 않고 테스트용 렌더러 주입을 허용한다.

실행 도구는 실제 기존 서버의 `renderFigureSpec`와 저장소의 Python/MathJax 경로를 사용한다.

```powershell
node --import tsx scripts/import/exam-twin/replay-vector-figures.mjs <새-결과-폴더> <후보-JSON> [후보-JSON...]
```

`STUDIO_ENGINE_URL`, `VERCEL`, `FIGURE_ENGINE_PATH`가 설정돼 있으면 로컬 vendor 재현이라는 범위를 지킬 수 없어 실행을 거부한다. 운영 서비스 호출·임의 엔진 대체·유료 API 전환은 없다. 결과 폴더는 기존 작업트리 안의 새 경로여야 하며 기존 파일·정션 밖·공유 의존성에 쓰지 않는다. 후보별 JSON과 실행 manifest를 새로 남기고 렌더 관련 소스·Node/Python/MathJax 버전과 입력의 전후 해시를 연결한다. 모두 재현되지 않으면 종료 코드 2, 잘못된 입력·실행 실패는 1이다. 종료 코드 0도 수학·학년·적재 승인을 뜻하지 않는다.

범위는 현재 쌍둥이 후보 계약이 받는 일반 FigureSpec v2 벡터다. PNG 등 자산이 결합된 그림은 v2라고 적혀 있어도 별도 이미지/템플릿 출처 검토 대상으로 돌리고 렌더러를 호출하지 않는다. 기존 내장 imagegen 자산의 제작 이력을 대체하거나 래스터를 벡터 검증 완료로 세지 않는다. 전체 운영 reader·인쇄와의 동등성도 별도다. 모든 결과의 수학·학년·권리·native reader·적재 승인 필드는 고정 false이고 새 문항·새 그림·DB 쓰기는 0이다.

실제 새 원주각·길이 문항의 두 벡터를 도구로 다시 렌더링해 저장 SVG와 2/2 바이트 일치를 확인했다. 별도 복사본에서 원주각 그림의 원 반지름만 78→79로 바꾼 실제 CLI 대조는 `held/mismatch`, 종료 코드 2를 반환했다. 원본 후보/spec/SVG는 바꾸지 않았다. 이는 픽셀이나 그림 치수를 정답 계산으로 사용한 실험이 아니다.

관련 Node 12파일 144개와 새 코드 lint가 통과했고 전후 코드 해시를 보존했다. 새 단위 9개는 바이트 불일치, strict 실패/치수 누락, 비지원 spec·래스터, 그림 없음, 입력 변경, 위험 SVG, 서비스/외부 엔진 설정 및 승인 불가를 검사한다. 최초 8개 실행은 환경 설정을 제대로 거부했지만 예상 오류 문구가 달라 7통과·1실패였다. 원래 코드·테스트와 진단을 보존했고 메시지를 명확히 한 뒤 래스터 대조를 포함한 9개 및 전체 관련 144개를 통과했다. 테스트의 합성 PNG는 실제 imagegen 제작이나 새 그림으로 세지 않는다.

현재 근거는 [검증 기록](../../../../.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/vector-replay-validation-r1.json), [실제 2개 재현](../../../../.qa-artifacts/exam-resume-20261008/vector-render-replay-cli-20261020-r2/replay-manifest.json), [실제 불일치 대조](../../../../.qa-artifacts/exam-resume-20261008/vector-render-replay-negative-20261020-r1/negative-control-receipt-r1.json)이다. 이후 결합과 스냅샷 사이에서 파일을 교체하는 [추가 대조](../../../../.qa-artifacts/exam-resume-20261008/vector-replay-pre-snapshot-20261020-r1/finding-r1.json)와 [독립 재현](../../../../.qa-artifacts/exam-resume-20261008/vector-replay-code-audit-20261020-r1/own-r1-technical-hold.json)에서 R1의 기술적 보류를 확인했다. 앞의 실행 중 변경 검사는 렌더러 호출 이후 변경만 다뤄 이 앞선 시점은 잡지 못했다. 정상·기존 변조 대조가 통과했어도 R1 전체가 준비됐다는 결론을 내리지 않는다. 원래 코드·감사·추가 재현을 그대로 보존하고 입력 바이트와 실행 문맥의 결합을 보완한 새 버전을 검수한다. 작성·검수 승인 수와 보호 원문·잠금·권리 상태는 이 기술적 보류와 분리한다.
