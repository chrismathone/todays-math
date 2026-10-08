# 독립 풀이 후 검토 — q10·q16·q17·q19·q20

Verifier: `orca-codex-exam-twin-author-algebra-20261008`. 방법은 `independent-solve-then-review`이다. 먼저 고정한 블라인드 커밋 `0e2ee38d597e2e7a8782a673a0a0235c4910630f`의 다섯 풀이를 변경하지 않고, 그 후 새 저자의 답·해설·사양을 읽었다. 원문 답/해설은 열지 않았고, 답 일치를 원문에서 가져오지 않았다.

| 문항 | 전체 판정 | 정답·해설·조건·보기·그림 계산 | 7면의 중3/2015 범위 | 남긴 특정 보류 |
| --- | --- | --- | --- | --- |
| q10 | pending | 통과 | 7면 passed | Unit/family 의도적 미확정; 95 mm 수학 라벨 최소 em 약 8.25 pt의 지면 판정 |
| q16 | verified | 통과 | 7면 passed | 이 검토 범위의 보류 없음 |
| q17 | pending | 통과 | 7면 passed | v2/후보 ‘응용’과 current family16 ‘심화하’의 난이도/5점 척도 연결 |
| q19 | pending | 통과 | 7면 passed | family05의 실제 30°·45°·60° 입력/높이 분할 경로와 새 75° 입력/다른 수선 방향·역산의 의미 대응 |
| q20 | pending | 통과 | 7면 passed | 활꼴·보완 영역의 Unit/live family 미확정; 복합 과정의 ‘기본’/7점 근거 |

각 reports/qNN.json은 학생·후보·자산·풀이의 네 digest, 검수자, 방법, 12개 checks, 일곱 curriculumSurfaces와 구체적인 근거를 포함한다. `candidatePack.mjs`의 읽기 전용 바인더로 네 digest를 모두 재계산하여 부모 verification-inputs와 일치함을 확인했고, 저자와 검수자 ID가 다름도 확인했다. 알려지지 않은 의미 유형에 임의 라벨을 부여하지 않았다. q10·q20의 family 보류를 유지한다.

학년 판정은 공식 `curriculum-evidence.json`의 2015 PDF·2020 HWP 대응 성취기준, 2025/2026 중3의 2015 적용 시기, 중3 Unit/후보 Unit, 실제 학생 절차와 선수 개념을 함께 사용했다. q10의 직사각형 선수 근거에는 9수04-12, q17의 다항식 전개에는 9수02-12를 검수 근거로 보충했다. 학년군 코드·학교 출제·확률·해시만으로 승인하지 않았다. q17은 접선 길이 같음과 피타고라스 후 일차식이며 원과 비례의 곱 정리가 없다. q19는 45°·60°만 삼각비에 사용하고, q20의 120°는 도 단위 부채꼴에 쓰며 높이는 수선·60°로 구한다.

q10·q19의 생성 PNG·generation prompt·사양·학생 SVG의 해시 연결과 동일 PNG 바이트의 임베딩을 확인했다. 래스터는 장면만 제공하고 별도 벡터 관계도·본문/표가 수학 조건을 제공한다. 래스터 픽셀을 수치 사실로 측정하지 않았다. 95 mm에 해당하는 359 px/96 dpi 화면 교정본을 직접 확인했다. 수학 라벨 최소 em은 q10 약 8.25 pt, q19 약 9.05 pt이고, 실제 도형 조건은 벡터 좌표에서 별도로 검산했다. q10의 작은 라벨은 부모 지면 치수 검수에 남겼다. q19의 두 각과 점 이름은 화면 교정본에서 구별된다. 종이 출력 검사를 했다고 주장하지 않는다.

q16·q17·q20은 새 사양의 원 위 점·현 수선·접선 접점·각·색칠 경계를 확인했다. source-reference의 q16·q17·q20 문제용 그림만 열어 동일 핵심 구조와 질문 대상 전환을 대조했다. q16은 관계·각도 짝 고르기, q17은 창틀/장식/지지대 설치의 소재와 위치 조건, q20은 작은 CB 활꼴에서 반원의 나머지로 질문 대상이 바뀌어 단순 숫자/동의어 교체와 구별된다.

프로젝트 [TypeSafe 스킬](../../../../.agents/skills/typesafe-ai/SKILL.md)을 읽고 live [confidence 문서](https://docs.typesafe.ai/confidence), [증거 대조 cookbook](https://docs.typesafe.ai/cookbooks/citation_check), [문서 index](https://docs.typesafe.ai/llms.txt)를 확인했다. 근거별로 좁은 판정을 분리하고 정확한 수학·바이트 바인딩은 코드로 확인했다. TypeSafe/Jev 등 추론 API 호출은 0이며 응답·확률·confidence 수치를 만들지 않았다. cookbook의 근거 대조 방식을 참고하여 원문 존재/해시 대조와 의미 판단을 구분했다.

판정 `verified`는 이 범위의 독립 검토 완료를 뜻한다. 모든 보고서에서 자동 release는 허용하지 않는다. 권리·원본 학교/연도 진위·native generation/standalone engine provenance는 부모의 pending 상태로 남겼다. 특히 q10·q19 패키지는 생성 PNG와 복합 SVG가 바인딩되어 있으나 별도 원본 엔진 SVG 파일은 포함하지 않으므로, 그 원본 해시 provenance를 새로 승인하지 않았다. 제공 근거는 선택된 조항의 2015/2020 일치를 보장하지만 이후 해당 조항의 **중대한 개정 여부에 대한 최종 발행 확인**은 부모에게 남겼다. 이 확인은 여기서 쓰는 성취기준·삼각비/원 제한 조항에 한정하며 전체 정책 재구축을 요구하지 않는다.

이번 커밋은 reports 5개와 이 노트만 포함한다. 블라인드 결과 12개와 authored 파일 54개는 보존하며, DB·설치·유료/추론 API·원본/운영 소스 수정·적용·배포·푸시는 수행하지 않았다.
