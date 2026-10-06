# 오늘의 기억 학생 화면 측정

이미 실행 중인 이 워크트리의 dev 서버를 쓴다. 새 서버를 띄우거나 서버 문을 켜지 않는다.

```powershell
$env:FADING_QA_URL='http://localhost:3443'
node scripts/qa/fading-screens/measure.mjs
```

헤드리스 Chromium만 사용한다. `devSamples.ts`가 은행 전체에서 표적 최다, 명제 최장, 칩 최장, 수식 표적 최다, 같은 글 표적, 최소 표적, 추가 칩이 있는 개념 중 표적 최다, 일반 표본을 계산한다. 모든 표본의 1~4단계를 320/390/768/1280 폭에서 그리고 홈 상태, 목록·단원·읽기, 통계, 대조, 평가, 요약, 나가기, 저장 실패·409도 확인한다.

글꼴 적재 후 문서 가로 넘침, 컨트롤 상자, 실제 텍스트 노드의 계산된 글자 크기, 수식 잉크를 잰다. 숨김/스크롤/clip 경계의 overflow를 잠시 풀어 **경계 밖에 새로 나타난 픽셀**을 세며, KaTeX 받침 상자나 근호 SVG의 scrollWidth는 수식 잘림으로 세지 않는다. 일부러 좁힌 실제 수식의 양성 표본으로 잉크 판정자가 작동하는지도 확인한다. 풀이 단추는 화면으로 스크롤한 뒤 `elementFromPoint`로 중앙 가림을 확인하며, 모달이 열린 동안에는 모달 안의 단추만 유효한 조작 대상으로 센다.

수치·캡처·표본은 추적하지 않는 `.qa-artifacts/fading-screens/`에 남는다. 중단하면 `interrupted.json/png`에 마지막 주소와 화면 오류를 기록한다. 저장·평가 실패는 dev 메모리 소스에서만 재현하며 실제 학생 API/DB는 호출하지 않는다.

대조 그림 전체는 `node scripts/qa/fading-screens/compare.mjs`로 받는다. 특정 그림만 갱신할 때는 이름을 넘긴다: `node scripts/qa/fading-screens/compare.mjs first done`. 나머지 그림과 목록은 보존한다.
