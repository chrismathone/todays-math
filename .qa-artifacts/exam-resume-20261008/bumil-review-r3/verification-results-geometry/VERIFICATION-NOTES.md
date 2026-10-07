# 독립 검수 기록 — round 3

검수자: `orca-codex-exam-twin-author-geometry-20261008`. 방법: `independent-solve-then-review`.
독립 풀이 커밋: `c998ea12a6447970c71679e6dd97d06d0fa3dc6b`. 부모의 hash-fixed 사본과 내 풀이 바이트 및 canonical solveDigest를 대조한 뒤 새 저자 답·해설을 읽었다. 독립 풀이/기존 저작 자산 50개 파일을 해당 커밋과 비교하여 변경 없음을 확인했다.

지정 검수만 완료: q06, q08, q09, q12, q13. 기술 검수 통과: q06, q08, q09, q12, q13. 보류: 없음. 거절 문항 없음. 수학 정답·해설·존재/유일성·보기·그림과 일곱 학생 교육과정 면은 이 그룹 모두 통과했다. 보류는 reports에 명시한 taxonomy 근거이며 부분 통과가 사용 허가가 되지는 않는다.



`candidatePack.mjs`의 실제 JS `bindCandidate`를 읽기 전용으로 호출했다. candidateDigest는 candidate와 assetBindings를 함께 묶고 assetDigest는 role/specSha256/svgSha256/intendedWidthMm 등의 자산 바인딩을 묶는다. source 경로가 있는 assets 배열이나 candidate 단독의 임의 Python hash로 바꾸지 않았다. student/candidate/asset/solve 제공 digest가 모두 재계산과 일치한다. 각 spec/SVG 및 blind SVG도 바이트 해시로 확인했다. 새 해설과 답은 사전 봉인된 풀이와 모두 일치한다.

수학은 Fraction/Decimal와 정확한 부호·변 역할로 재계산했다. 각 report의 deterministicMath에 실행한 식과 결과, 모든 보기 판정을 기록했다. 실제 학생 SVG 총 5개를 독립 풀이 때 확인했으며 동일 바이트임을 검수 때 재확인했다. 새 학생 표·보기·그림 및 새 저자 해설을 KaTeX throwOnError/로컬 Chromium, 외부 요청 차단으로 재렌더하고 전부 직접 보았다. q04의 다섯 choice:N 그래프와 q13 두 그림은 각각 확인했다. 임시 중립 렌더는 부모의 최종 페이지 레이아웃 승인 주장이 아니며 커밋에는 보고서와 이 노트만 포함한다.

답이 없는 원본 problems.json과 그 여섯 참조 PNG만 사용했다. 원본 답·해설·재생성 자료는 열지 않았다. 첫 입력 요약에서 범위 밖 verification 배열이 출력된 실수를 기록한다. 이후 문항 번호 allowlist로 이 9개만 읽어 비교·판정했으며 타 문항이나 내 geometry 후보에 대한 검수 결과는 만들지 않았다. 내 geometry 후보는 hash 보존 검사만 했다.

프로젝트 [TypeSafe skill](../../../../.agents/skills/typesafe-ai/SKILL.md) 및 live [문서 인덱스](https://docs.typesafe.ai/llms.txt), [설계 지침](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [confidence](https://docs.typesafe.ai/confidence), [citation checking](https://docs.typesafe.ai/cookbooks/citation_check)를 읽었다. 계산·해시·기준 문구 대조는 코드로, 의미 검수는 독립 차원별로 근거를 기록했다. 좁은 질문/타입 결과 또는 확률을 정답·승인으로 간주하지 않았다. 모델/TypeSafe 추론 API 호출, 만들어 낸 confidence, DB 접근 없음. Live 문서 조회는 읽기 전용 GET이었다.

2015 공식 PDF의 관련 성취기준 및 여덟 제한 문구를 실제 추출 텍스트와 대조했다. PDF 공백/제어 구분자만 정규화했다. parent 2020 HWP 추출 증거와 이 선택 문구가 일치하며 HWP를 새로 추출한 것으로 표시하지 않았다. MoE 2015/2022 고시의 시행 부칙 HTML도 바이트 해시와 중3 적용일 문구를 확인했다. 2025/2026 중3은 이 검수의 2015 적용 대상이며 2027 중3/2022 재출판은 별도이다. Unit/live family는 제공된 은행·registry snapshot과 실제 family 코드의 요구 절차까지 비교했고 학교, 제목, AI, 기존 유형 존재만으로 승인하지 않았다. 관련 없는 전체 개정 연혁 감사를 추가 승인 조건으로 만들지 않았다.

난이도·배점은 새 학생의 실제 계산 단계, 구성 제공 여부, 출력 형식과 보기 부담으로 평가했다. 경험적 정답률 검증은 주장하지 않는다. q06은 기본 상단~응용 하단 경계의 세 방향 정의 적용으로 기록했다. q04 해설 위치 표현의 문장 다듬기는 비차단 권고이다. 이 두 문항을 수정하지 않았으며 모든 후보·자산·풀이 바이트를 보존했다.

검수 통과는 배포/적재 승인과 다르다. 부모 소유 native provenance, rights, source identity 및 최종 수집 게이트는 계속 보류한다. DB/apply/unlock/main/source 수정, 설치, 유료 호출, push 없음.


Parent candidatePack.mjs evaluateReview consumer check executed for each selected report: mathematicalVerified=true, gradeReviewed=true, overallVerified=false, loadable=false, productionWrites=false. Only q05/q18 carry selected review-status-pending and review-unitFamilyFit-not-passed reasons; parent rights/native gates remain closed. Native problem-type labels are reused from the contract (q08 uses its existing calculation label), while reviewer difficulty bands describe workload rather than inserting new difficulty enum values.
