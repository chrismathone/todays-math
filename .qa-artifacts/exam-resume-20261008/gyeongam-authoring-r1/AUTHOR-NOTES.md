# 경암 중3 2025-2 중간 — author r1

19개 부모/20개 원문 leaf를 모두 고려했다. q01–q14, q16–q19의 새 제안은 18개 부모/19개 leaf, 객관식 14개와 서술형 4개, 95점이다. q17은 두 소문항 각 5점, 부모 총 10점이며 합산에서 부모 배점을 다시 더하지 않는다. q15 5점은 작성 전 보류다. 독립 풀이·검수·최종 학년 승인·권리 승인·적재는 모두 0이다.

원문 입력은 root `4cc9278da`의 안전한 questions.json/index.html/19개 문항 PNG뿐이다. `evidence/source-final`의 21개 파일은 정확한 원래 바이트로 복사하여 해시 고정했다. source-manifest는 메타데이터 투영만 보존했다. 옛 정답·해설·키·초안·원시 스캔 페이지를 입력으로 사용하지 않았다. 원문 관측 도수/15개 산점도 점/통계 자료/빈칸은 `evidence/source-observations.json`에 별도로 보존한다. 후보의 수치와 점은 새 구성 자료이며 실제 원문 관측이라고 주장하지 않는다.

새 문제·선택지·정확 답·학생 풀이·채점 기준·소문항·사실 데이터는 candidates에 있다. 실제 학교 경암중은 source/내부 metadata에만 있다. 학생면에서 학교가 필요할 때 쓰는 일관된 가상 이름은 온빛누리중학교이며 현재 새 본문에는 실제 학교명이 없다. 순수 수학에는 불필요한 이야기를 붙이지 않았다.

SVG 9개는 기존 `renderFigureSpec`에서 strict:true/typeset:true로 로컬 생성했다. MathJax 라벨, 새 FigureSpec, 수학 좌표/자료 결합 및 생성 입력 해시를 보존했다. 새로운 Node 프로세스에서 9개 SVG 전부를 메모리로 다시 그려 기존 바이트와 일치함을 확인했다. 원문 crop은 최종 그림이 아니다. 18개의 새 문제와 완전한 풀이 화면을 실제 70mm 열에서 모두 보았으며 q11 그림 두 개는 각각 55mm이다. 기록은 checks/visual-review.json 및 checks/author-seven-surface-review.json이다.

초기 q1 barChart의 values 형식을 label/value 객체로 고쳐 strict 렌더가 성공했다. q9 긴 축 문구가 70mm에서 눈금을 좁히는 결함은 축 뜻과 단위를 바로 앞 본문에 명시하여 해결했다. 12개 점, 0–80 범위, 10점 눈금, 50점 경계는 그대로다. 어떤 치수도 strict 엔진에서 누락하지 않았으며 SVG를 직접 편집하지 않았다.

q15는 일반 예각의 두 삼각비 대소를 통해 제곱근 부호를 고르는 핵심과 공식 제한의 경계가 미확정이다. 공식 근거는 `삼각비 사이의 관계는 다루지 않는다.`(2015 별책8 물리39/인쇄35쪽, 후속 HWP record4440/paragraph908)다. 일반각의 구체적 기하 비교 절차가 이 제한에 어긋나지 않는다는 문항별 공식/전문 근거와 독립 7면 검토가 있어야 재개한다. 고정각 수치 문제로 바꿔 핵심을 지우거나 학교/registry/신뢰도만으로 허용하지 않는다. q15 후보·답·새 풀이·그림은 만들지 않았다.

bank 증거는 parent의 2026-10-08 04:53:45.769124+00(13:53 KST) RepeatableRead, 22 Unit/302 family, writes0의 시점 증거다. 현재 DB 주장이나 연결은 없다. 현재 저장소의 순수 registry 20개 관련 key와 snapshot 행, 다섯 Unit seed/UUID 행을 정확히 대조했다. 새 전체 조건/질문/절차/형식을 지원하는 family는 확인되지 않아 전부 null/held이다. 특히 실제 산점도07은 x>y 개수,12는 경계 없는 10명 백분율이고 활용12의 역산 갈래도 대각선 곱 sin 넓이를 쓴다. 새 문항과의 단순 제목 유사성은 배정 근거가 아니다.

TypeSafe 프로젝트 skill과 live building/confidence/hierarchical-classification docs를 읽었다. 설계 판단에는 no-match/보류와 명시적 근거를 적용했으며 모델 호출은 하지 않았다. 정확 계산은 SymPy 및 실제 FigureSpec 좌표/선택지 파서에서 수행했다. 저자 검사는 독립 검수가 아니다. q8 편차제곱의 구체적 전개, q13 동일 함수에 해당하는 길이 변화, q18 제시된 이등변삼각형의 특정 22.5도 및 복합 절차는 별도 독립 전체 학년/난도 검토가 남는다.

재현: 봉인 후에는 `python checks.py`와 `node verify-freeze.mjs`로 읽기 검사를 한다. SVG의 읽기 전용 재현은 설치된 tsx로 `node-render-check.mts`를 실행한다. 새 출력 생성 bootstrap/build/render/preview/author-review는 봉인 파일을 덮어쓰지 못한다. 변경이 필요하면 부모와 새 revision을 정한다. 봉인 학생 자료는 review-ready/SOLVE-BRIEF.md, student-problems.json, figures뿐이며 author 자료/qa 풀이 화면/source를 독립 풀이 전에 읽으면 안 된다.

sealed Gyeonggu 247파일과 이전 Bumil 75파일, 총 322파일의 시작 바이트가 모두 그대로임을 확인했다. 82 잠금·DB·main·다른 세션·원본·N·기존 출력·공유 의존성·예약 감시 제어를 변경하지 않았다. 후속 새 독립 풀이 작업은 root의 별도 배정 이후 진행한다.
