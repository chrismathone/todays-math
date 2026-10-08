경구 중3 2025-2 중간 원번호 23개를 모두 고려하여 새 후보 22개(객관식 19·서술형 3)를 실제 작성했다. 새 strict FigureSpec/SVG는 20개, 그림이 있는 문항은 19개다. q20 1개는 작성 전에 제외했고 작성 전 미완료 보류는 0개다. 작성 부분은 93점이며 완성 100점 시험으로 승인하지 않는다. 독립 풀이·최종 교육과정·권리 승인 0건, directUseAllowed=false이다.

산출물은 `.qa-artifacts/exam-resume-20261008/gyeonggu-authoring-r1/` 하나에 있다. `candidates/qNN/qNN.json`은 새 본문·선택지·동그라미 객관식 답/정확한 서술 답·새 한국어 풀이·배점·7개 학생면·교육과정·변형·실제 분류 근거를 담는다. `candidate-index.json`, `author-freeze.json`이 수집 결합값이며 `review-ready/`는 다른 작업자의 독립 풀이용 학생 면만 담는다. 기존 범일 저자·풀이·검수·taxonomy 75개는 원바이트를 보존했다. 기존 taxonomy 0 assignment와 Bumil q07 작성 전 보류도 그대로다.

| 원번호 | 실제 새 목표/조직 | 점수 | 그림 | 분류 상태 |
| --- | --- | --- | --- | --- |
| q01 | 다른 두 각의 cos/tan 측정 기록 | 3 | 1 | Unit 제안·family 보류 |
| q02 | sin/빗변 기록에서 두 직각변 복구 | 3 | 0 | Unit 제안·family 보류 |
| q03 | 유한 삼각형의 비 곱이 속하는 구간 | 3 | 1 | Unit 제안·family 보류 |
| q04 | 빗변 수선 높이에서 두 cos 기록의 차 | 3 | 1 | Unit 제안·family 보류 |
| q05 | 네 값 비교·양 끝 제거·남은 특수값 차 | 3 | 0 | Unit 제안·family 보류 |
| q06 | 접선 높이 기록→각 식별→두 수선 길이 | 3 | 1 | Unit 제안·family 보류 |
| q07 | 세 유한 특수각 계산 기록 완성 | 3 | 0 | Unit 제안·family 보류 |
| q08 | 받침대 높이에서 두 수평 길이 합의 표현 | 4 | 1 | Unit 제안·family 보류 |
| q09 | 제공 수선·합동·AA 닮음에서 길이/tan 기록 | 4 | 1 | Unit 제안·family 보류 |
| q10 | 실제45/30도 삼각형의 길이 합으로 cos15 기록 | 4 | 1 | Unit 제안·family 보류 |
| q11 | 밑면/실제 직각 단면 두 평면 그림의 높이·부피 | 4 | 2 | Unit 제안·family 보류 |
| q12 | 새 지지틀 높이에서 바닥 전체 길이 복구 | 4 | 1 | Unit 제안·family 보류 |
| q13 | 두 수선발을 제공한 부분넓이→BD 역산 | 5 | 1 | Unit 제안·family/복잡도 독립 검토 |
| q14 | 안내판 반지름/현 전체 길이→중심 거리 | 3 | 1 | Unit 제안·family 보류 |
| q15 | 같은거리 현·밑각 일차식→매개변수/꼭짓점각 | 3 | 1 | Unit 제안·family 보류 |
| q16 | 접선 삼각형 넓이→원 바깥 구간 길이 | 3 | 1 | Unit 제안·family 보류 |
| q17 | 동심원 고리 넓이→유일 현 길이 | 3 | 1 | 접선 Unit 제안·family 보류 |
| q18 | 반원 창 지지틀의 네 변 둘레 | 3 | 1 | 실제 family11 mode1 제안·난도/점수 독립 검토 |
| q19 | 정사각형 둘레→내부 접선점의 모서리 거리 | 4 | 1 | Unit 제안·family 보류 |
| q20 | 임의 여각 tan 곱을 요구하는 전체 원문 | 7 | 0 | 작성 전 제외·후보 없음 |
| q21 | 연결대 길이 입력→다른 지지대/연결대/아래 넓이 | 10 | 1 | Unit 제안·복합 family 보류 |
| q22 | 둘레 증명/입력→접선 길이·반지름·AO | 8 | 1 | Unit 제안·복합 family 보류 |
| q23 | 접선/작은호 바깥 넓이→반지름·OP | 10 | 1 | Unit 제안·family/복잡도 독립 검토 |

`exact-checks.py`는 새 조건에서 정확한 SymPy 계산을 수행했다. 실제 19개 선택지 세트를 읽어 서로 다른 값/기록과 정답 1개를 확인했고, 서술형 3개의 정확한 답·배점 합을 확인했다. 실제 FigureSpec 좌표의 주어진 길이·표시 각·직각·접점·원 위 점·내부점·넓이/둘레 조건도 검사했다. q17은 반지름 자체의 비유일성과 현 길이의 유일성을 구분했고, q23은 양의 넓이 계수/양의 반지름을 확인했다. 이 코드는 저자 계산 검증이며 독립 풀이가 아니다.

도형 20개는 기존 `renderFigureSpec`에 strict:true/typeset:true를 주어 로컬 렌더했다. API 경로 환경값을 제거했고 dropped dimensions는 0개다. 소스 crop은 reference-only이다. q11의 두 그림은 각55mm, 나머지는70mm로 실제 미리보기를 만들었고 모든 학생 본문·선택지·새 풀이·도형을 직접 확인했다. q14 M 라벨을 수선발 근처로 옮기고 q16 B 라벨을 원 교점 아래로 수정했다. q17 고리의 구멍과 q23 원 바깥 작은호 영역도 확인했다. 표/수식 overflow와 네트워크 요청은 0개이며 final PNG와 candidate/student/asset 결합은 `checks/visual-author-review.json`에 기록했다. 새 final raster는0개다.

현재 규칙의 바이트 자료는 `.ts.txt` 보관본이며 코드 원경로와 SHA256은 receipt에 유지한다. 기본 lint-staged의 첫 실행은 `.ts` 자료6개를 대상으로 잡고 eslint 부재로 실패/원상 복구했다. 보관 확장자만 바꾼 후 원바이트 동일성을 다시 확인했다. `git diff --check`에는 strict 엔진이 q11 빈 `<g>`에 만든 공백1줄과 HTML/학생 SVG의 동일 사본2곳이 남는다. SVG 수작업 편집 없이 엔진 원출력/고정 해시를 보존한 예외이다.

전체 7개 학생면은 본문, 선택지, 그림·표, 표기, 정답, 학생 풀이, 선수 학습으로 나눠 후보마다 author-proposed 근거를 남겼다. q09에는 이등분선 비를 외우지 않고 제공 E의 ASA 합동과 AA 닮음을 사용하는 풀이를 새로 썼다. q10의15도 값은 특수각에서 실제 길이를 복구한 비이며 덧셈정리가 없다. q13은 sin105/사인넓이공식을 사용하지 않는다. q22는 원문 변환의 화살표를 접선 직선/선분과 점의 순서로 바꾸어 벡터를 요구하지 않는다. q23의120도는 중심각/도단위 부채꼴 비율이며 삼각비는30도에서만 계산한다. q05의 같은 함수 값 비교, q09의 복잡도, q13/q23의 공식 복잡도 제한 적용과 배점은 독립 검토 사항으로 명시했다.

q20은 제3부분이 임의 예각의 여각 tan 곱을 요구하여 2015 공식 제한 “삼각비 사이의 관계는 다루지 않는다”에 따른 저자 작성 제외다. 앞의 선분 읽기만 살리거나 고정각으로 바꾸면 전체 핵심을 보존하지 못한다. 공식 근거는 복사한 curriculum-evidence의 no_ratio_identities, 원2015 PDF 물리39쪽/인쇄35쪽,2020고시 HWP record4440/p908이다. 전체 소문항을 보존하는 합법적인 중3/2015 방법의 구체적 공식 근거와 독립 검토가 재개 조건이다. 학교 출제 이력은 이 제한을 해제하지 않는다.

출처는 다음-five worker의 provisional 질문 전용 packet/questions.json과 source-manifest.json을 사용 전에 원바이트로 복사했다. 질문 packet SHA256은 `05c0542d0b54d719b51e83ec9daf21acb1b943d358e59c27f630786cf2e4b261`이다. HWP 2025 머리말은 초안 작성을 지지하지만 manifest의 yearConfirmed=false와 학교·연도·페이지 전체 동등성은 source final commit까지 pending이다. 준비용2026 footer를 출제연도로 추정하지 않는다. 추가 q23-part2 PNG는 JSON에서 참조되지 않아 열지 않았고 저작/학생 입력에서 제외했다. 출처 작업자가 질문 전용 여부·면 대응을 확정해야 한다. 원문 HWP/PDF/N, 옛 정답/해설/각주 답안을 열지 않았다. 모든 후보의 sourceReference native identity는 미확정이며 가짜 DB 문항 ID를 만들지 않았다. 원학교는 내부 경구중, 학생용 alias는 온빛누리중학교로 일관되게 기록했다.

부모의 fresh-r2 bank 읽기는2026-10-08 04:53:45.769124+00(13:53 KST) readOnly RepeatableRead 시점의22 Unit/302 live family 관측이며 현재 DB 단언이 아니다. 이전 관측과 unit/family count가 같다. 통합 저장소의 순수 registeredTypes(중3 299개)의 관련28개 키와 실제 unit seed5개를 대조했다. q18만 `mid:3-2|원과 직선|11` mode1의 새 조건·둘레 목표·접선합/높이차/피타고라스/둘레 전체 순서가 일치하는 저자 family 제안이다. 실제 규칙 난도 심화하를 기록했고 원3점의 적정성은 별도 검토다. 나머지21개 family는 null/보류이며 가까운 제목이나 신뢰도 매칭으로 채우지 않았다.

프로젝트 [TypeSafe skill](../../../../.agents/skills/typesafe-ai/SKILL.md)과 [building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification), [confidence](https://docs.typesafe.ai/confidence)를 읽었다. 정확 계산/키 조회는 코드에서 수행하고 no-match와 서로 다른 승인 게이트를 보존했다. API·모델 호출·새 AI 통합은 없다. confidence나 registry 존재를 승인으로 사용하지 않았다.

깨끗한 자신의 branch에서 부모 `7e1e8080ad5741b53d9bb7ebf8e3a72ff5596db5`를 먼저 통합했고 local merge는 `eed3c53835c4923dc5807ffe61629700206ec41c`이다. 새 저자 commit은 이 새 QA 경로와 이 보고서만 포함한다. `checks/preservation.json`은 이전 소유75파일의58f7adb26 원바이트 보존을 확인한다. DB/API/install/prisma generate/apply/unlock/deploy/push, main/부모/다른 session/shared dependency/기존 outputs 수정은 수행하지 않았다. 부모는 고정된 studentDigest로 다른 작업자의 blind solve를 먼저 수집한 뒤 정답을 노출한다. 모든 rights/similarity/source/native 및 최종 grade 게이트는 pending으로 유지한다.
