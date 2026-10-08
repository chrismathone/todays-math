"""Serialize the evidence-based reviewer adjudication, not an inference service."""
from pathlib import Path
import hashlib
import json
import sys

from collect_evidence import OWN, OUT, PARENT, QA, REPORT, load, ref, save, sha

sys.stdout.reconfigure(encoding="utf-8")
ID="orca-codex-exam-twin-source-identity-20261008"
q=load(OUT/"question-observation.json")
official=load(OUT/"official-provisions.json")
units=load(OUT/"unit-family-evidence.json")
notice=load(OUT/"official-notices/moe-2022-2-notice-records.json")
byid={x["id"]:x for x in official["provisions"]}
assert byid["no_trig_ratio_relationships"]["hwp"]["text"]=="삼각비 사이의 관계는 다루지 않는다."
notice_rows={x["record_1based"]:x for x in notice["records"]}
assert "총론을 일부 개정" in notice_rows[25]["text"]
assert "【별책 1】" in notice_rows[43]["text"]
assert "【별책1】" in notice_rows[624]["text"] and "【별책4】" in notice_rows[628]["text"]

policy={
    "reference":"actual 2025 middle3; 2015 revision",
    "operativeMathEvidence":[official["pdf"],official["hwp"]],
    "2022_2Amendment":{
        "source":{k:notice[k] for k in ["path","sha256","url","noticeBoard"]},
        "selectedRecords":[notice_rows[n] for n in [25,43,624,628]],
        "observedScope":"General curriculum book1 and high-school curriculum book4; no math book8 amendment in this notice.",
        "changesQ07MathProvisions":False
    },
    "2024_1Amendment":{
        "url":"https://ncic.re.kr/board/B0033.cs?act=read&bwrId=2114&m=34&pageIndex=1&pageUnit=15&searchCondition=&searchEndDt=&searchKeyword=&searchStartDt=",
        "locator":"Notice dated 2024-08-16, published 2024-08-29; numbered amendment subjects 1-11, supplementary provision 1",
        "booksNamed":[2,3,4,7,9,12,19,24,27,28,30,39,40,42,43],
        "effectiveDate":"2025-03-01","mathBook8Listed":False,
        "observation":"Direct official NCIC page read through web tool on 2026-10-08; tool reports archived crawl. No new raw local HTML hash is asserted.",
        "changesQ07MathProvisionsEvidenced":False
    },
    "completeGeneralPolicyHistoryClaim":False,
    "identifiedMaterialAmendmentUncertainty":[],
    "unrelatedWholePolicyCompletenessIsAdditionalApprovalGate":False,
    "limits":"Bounded to the relevant 2015 math clauses, phase-in, and specifically flagged 2022-2/2024-1 amendments. No claim that every post-2020 policy has been exhaustively audited; no identified later math change to the cited provisions. This rejection does not approve current/future publication."
}
save("policy-application.json",policy)

citations={
    "method":"deterministic exact-text/locator checks then contextual reviewer judgment; no inference API",
    "skill":ref(OWN/".agents/skills/typesafe-ai/SKILL.md"),
    "liveDocumentationReadDateKst":"2026-10-08",
    "liveDocumentation":[
        {"url":"https://docs.typesafe.ai/llms.txt","use":"Targeted documentation discovery; no integration or SDK invocation."},
        {"url":"https://docs.typesafe.ai/confidence","use":"Confidence summarizes an output distribution. No model probability or confidence is curriculum permission; none was calculated here."},
        {"url":"https://docs.typesafe.ai/cookbooks/citation_check","use":"Text presence and contextual support are separate checks; retain observed clauses separately from the reviewer application."}
    ],
    "claims":[
        {"id":"explicit_exclusion","source":"official-provisions.json#no_trig_ratio_relationships","textPresent":True,"contextSupports":True,
         "finding":"Official wording excludes relationships between trig ratios, under geometry teaching/learning cautions; it is not a statement prohibiting Pythagoras.","type":"observed"},
        {"id":"definitions_allowance","source":"official-provisions.json#9수04-17","textPresent":True,"contextSupports":True,
         "finding":"Simple trig-ratio values and the meaning of trig ratios are in scope. The same section contains the separate relationship exclusion; the standard is not an exception to it.","type":"observed_plus_contextual_application"},
        {"id":"q07_is_relation_assessment","source":"question-observation.json + official-provisions.json","textPresent":True,"contextSupports":True,
         "finding":"The known quantity is one same-angle sine value; the asked quantity is a quotient of cosine and tangent. Its intended assessment transfers one trig ratio to other same-angle trig ratios and combines them.","type":"reviewer_application_of_official_exclusion","officialWorkedQ07RulingClaim":False},
        {"id":"geometric_exception","source":"official-provisions.json#9수04-16/#9수04-17/#no_trig_ratio_relationships","textPresent":False,"contextSupports":False,
         "finding":"No examined clause grants a geometric/Pythagorean exception for retaining this ratio-to-compound-ratio assessment. Individual permitted steps do not waive the assessment exclusion.","type":"bounded_no_support_not_exhaustive_nonexistence_claim"},
        {"id":"live_family_permission","source":"unit-family-evidence.json","textPresent":False,"contextSupports":False,
         "finding":"Unit/family metadata and the generator purpose are observed. They are product classification data, not official curricular allowance.","type":"unsupported_as_permission"}
    ],
    "semanticRulingBy":ID,"confidence":None,"modelProbability":None,"inferenceApiCalls":0
}
save("citation-review.json",citations)

surfaces=[
    {"surface":"stem","gradeAllowed":False,"status":"rejected",
     "evidence":"9x²−12x+4 fixes sin A; the target cos A÷tan A deliberately assesses a relation among same-angle trig ratios. The real quadratic alone is allowed. Exact source content confirmed in retained source audit."},
    {"surface":"choices","gradeAllowed":True,"status":"numeric_forms_in_scope_not_an_eligibility_override",
     "evidence":"The five options are ordinary positive rational numbers. They introduce no extra notation or prerequisite. Choosing one still answers the rejected compound-ratio assessment. No original key or option agreement used."},
    {"surface":"figure_and_graph_semantics","gradeAllowed":True,"status":"not_applicable_to_printed_source",
     "evidence":"No printed figure or graph in normalized q07. The original handwritten triangle was excluded by the completed source audit. Adding a right-triangle representation cannot remove the retained ratio-conversion target."},
    {"surface":"notation","gradeAllowed":True,"status":"symbols_individually_in_scope",
     "evidence":"sin A, cos A, tan A are visible learning elements on PDF physical p38/printed34. x², fractions, division and 0°<A<90° are in scope. Rejection concerns the assessed dependency, not a blanket syntactic ban on division or these symbols."},
    {"surface":"answer_format","gradeAllowed":True,"status":"rational_numeric_format_in_scope_not_an_eligibility_override",
     "evidence":"A rational-number response is age-appropriate as a format. Its requested mathematical meaning is still the compound ratio; an ordinary number does not erase that meaning. No new candidate answer field was authored."},
    {"surface":"student_solution","gradeAllowed":False,"status":"rejected_for_preserved_assessment",
     "evidence":"Direct trig identities assess the excluded relationship. A geometric route uses permitted factorization, root, Pythagoras and definitions, but it still converts the known sine into cosine/tangent and their quotient. Individually allowed steps do not make this faithful target eligible."},
    {"surface":"necessary_procedure","gradeAllowed":False,"status":"rejected_for_preserved_ratio_transfer",
     "evidence":"Any faithful target retains the information flow one known ratio -> reconstruct other same-angle ratios -> combine them (or algebraically equivalent side expression). Replacing the target with a side length removes that flow and changes the assessment. This is not a claim that elementary geometric calculations themselves are out of grade."}
]
prereqs=[
    {"standard":"9수02-12","allowedIndividualStep":True,"unitOrderIndices":[472,473],"step":"Recognize/expand (3x−2)²; solve the factorized real quadratic."},
    {"standard":"9수02-13","allowedIndividualStep":True,"unitOrderIndices":[475],"step":"Solve this elementary repeated-root quadratic. No Vieta or discriminant is required."},
    {"standard":"9수01-07","allowedIndividualStep":True,"unitOrderIndices":[469],"step":"Use positive square-root length when interpreting a right triangle."},
    {"standard":"9수01-10","allowedIndividualStep":True,"unitOrderIndices":[471],"step":"Elementary radical arithmetic; not a new grade exception."},
    {"standard":"9수04-16","allowedIndividualStep":True,"unitOrderIndices":[463,464],"step":"Pythagoras for a missing leg, already placed at middle2 by actual project seed."},
    {"standard":"9수04-13/14","allowedIndividualStep":True,"unitOrderIndices":[],"step":"Similar scaling of a right triangle makes opposite2/hypotenuse3 a representation of a ratio, not actual given side lengths; middle-band source verified."},
    {"standard":"9수04-17","allowedIndividualStep":True,"unitOrderIndices":[481],"step":"Define each individual trig ratio from a right triangle; read with separate no-relationship restriction."}
]
alternatives=[
    {"case":"Keep equation->sin A and cos A÷tan A; add a drawn/scaled right triangle",
     "faithfulAssessment":True,"avoidsExcludedRelationship":False,"eligibility":"rejected",
     "reason":"Geometry changes the representation/route, not the one-ratio-to-other-ratios assessment."},
    {"case":"Keep equivalent relation target but write it as adjacent²/(hypotenuse×opposite)",
     "faithfulAssessment":True,"avoidsExcludedRelationship":False,"eligibility":"rejected",
     "reason":"Algebraically disguising the same information dependency is not a curricular change."},
    {"case":"Supply actual right-triangle side lengths and ask only for an unknown side, length, or single direct side-ratio value",
     "faithfulAssessment":False,"avoidsExcludedRelationship":"possible_if_rewritten_task_is_independently_in_scope",
     "eligibility":"different_task_requires_separate_authorization_and_full_review",
     "reason":"It removes the source's known-trig-ratio -> compound other-trig-ratio assessment. No candidate, exact wording, numerical twin, or figure was created."}
]
adjudication={
    "schema":"bumil-q07-curriculum-adjudication.v1","createdDateKst":"2026-10-08",
    "questionNumber":7,"verifierId":ID,"method":"confirmed-question-only-source-then-primary-curriculum-adjudication",
    "status":"rejected","eligibleFor2015FaithfulTwinAuthoring":False,
    "decisionType":"preauthor_curriculum_gate_only","affectedQuestionNumbers":[7],
    "reference":{"examYear":2025,"grade":"middle3","applicableCurriculum":"2015_revision",
                 "normalizedQuestionSha256":q["normalizedInput"]["sha256"],
                 "retainedSourceAuditCommit":"c348f02772f8d8eb4b698a61417c3a681e337b3e", "printedScore":4},
    "governingGate":"Known out-of-grade assessment, notation, or necessary student procedure excluded; genuinely unresolved material scope held. Same assessment/core principle required for a faithful twin.",
    "materialConflict":{"restrictionId":"no_trig_ratio_relationships","parentEvidenceAlias":"no_ratio_identities",
        "officialText":byid["no_trig_ratio_relationships"]["hwp"]["text"],
        "hwpLocator":byid["no_trig_ratio_relationships"]["hwp"],
        "pdfPhysicalPage1based":39,"pdfPrintedPage":35,
        "assessedDependency":"Root of a quadratic fixes sin A, then determine cos A/tan A at the same acute angle.",
        "finding":"This is an assessment of a relationship among trig ratios. Retaining it conflicts with the explicit exclusion under the user's strongest grade gate.",
        "findingType":"reasoned_application_of_official_provision_to_confirmed_question",
        "officialDocumentExplicitlyNamesQ07":False,
        "permissibleIndividualStepsDoNotOverrideAssessmentExclusion":True,
        "identityMemorizationOnlyExceptionFound":False},
    "definitionsScope":{"standard":"9수04-17","hwpLocator":byid["9수04-17"]["hwp"],
                        "pdfPhysicalPage1based":38,"pdfPrintedPage":34,
                        "individualDefinitionsAndSimpleValuesAllowed":True,
                        "blanketBanOnMultipleDefinitionsOrPythagoras":False,
                        "definitionRouteGrantsExceptionToRetainedAssessment":False},
    "sevenStudentSurfaces":surfaces,"prerequisites":prereqs,"representationCases":alternatives,
    "faithfulGeometricRestatementAvoidingConflictEstablished":False,
    "mathematicalExistenceAndPositiveRatiosChecked":True,
    "supplementalMathIsGradePermission":False,"originalAnswerAgreementUsed":False,
    "actualUnitFamily":{"unit":units["snapshots"][-1]["unit"],"family":units["snapshots"][-1]["family"],
                       "observedRulePurpose":"One same-angle ratio -> a different same-angle ratio, using Pythagoras",
                       "exactCompoundQuotientInFamily03Rule":False,
                       "purposeRiskFor2015":True,"inverseSupportIsBasisOfRejection":False,
                       "productClassificationIsCurricularPermission":False,"noProductOrDbChange":True},
    "pending":{
        "materialQ07CurriculumScopeUnknowns":[],
        "generalPolicyCompletenessAdditionalHold":False,
        "copyrightCustodyPublisherAuthorizationNativeProvenance":"not_adjudicated_and_retained_pending_or_blocked_by_parent",
        "future2022Republication":"not_adjudicated; new exact target-grade/edition scope check required",
        "newCandidateReview":"not_applicable; no q07 candidate authored or approved"
    },
    "reopeningCriteria":[
        {"condition":"Direct applicable official clarification or amendment addresses the exact retained assessment under the 2015 exclusion",
         "requiredCheck":"Provide clause/page/record and effective date explicitly permitting one known same-angle sine value -> cosine/tangent compound quotient through definitions/Pythagoras, or changing/removing the relationship restriction. Recheck the actual entire proposed student method and seven surfaces; a standard title, school original, publisher exercise, live family or probability is insufficient."},
        {"condition":"Target cohort/curriculum actually changes",
         "requiredCheck":"Bind actual rollout and exact 2022 or later mathematical scope/restrictions to the target cohort, then independently review the full assessment. The 2027 rollout alone is not permission."}
    ],
    "differentSideLengthTask":{"canBeConsideredSeparately":True,"reopensFaithfulQ07Twin":False,
                               "requirement":"Explicitly acknowledge changed assessment and authorize/review it as a distinct task; do not relabel it an allowed representation-only faithful twin."},
    "evidenceFiles":[ref(OUT/n) for n in ["question-observation.json","official-provisions.json","rollout.json",
       "policy-application.json","supplemental-math.json","unit-family-evidence.json","citation-review.json"]],
    "preservation":{"oldQ07Hold":q["priorHold"],"oldHoldEdited":False,
                    "priorAnnotationsExposureDisclosed":True,"blindOriginalAnswerReviewClaim":False},
    "actions":{"sourceAuditRepeated":False,"candidateAuthoring":False,"inferenceApiCalls":0,"dbReads":0,"dbWrites":0,
               "productCodeEdits":0,"sourceWrites":0,"parentWrites":0,"installs":0,"pushes":0,"deploys":0}
}
save("adjudication.json",adjudication)

text=f"""# 범일 source q07 제작 전 교육과정 판정 r1 (2026-10-08)

판정은 **rejected: 2025 중3·2015 적용의 충실한 q07 쌍둥이 제작에서 제외**다. 원문의 핵심 평가는 이차방정식의 근으로 정한 `sin A`에서 같은 각의 `cos A÷tan A`를 구하는 관계이다. 공식 제한 **“삼각비 사이의 관계는 다루지 않는다.”**와 이 평가 대상을 함께 적용하면 충돌한다. 피타고라스와 개별 삼각비 정의로 계산할 수 있다는 사실은 이 관계 평가의 허용 근거가 아니다. 이는 공식 문서에 q07 번호가 실렸다는 주장이 아니라, 확인된 원문에 명시적 제한과 사용자의 가장 강한 학년 게이트를 적용한 독립 판정이다.

검토자 `{ID}`. 실제 후보 제작 전의 원문 평가 대상에 한정한다. source17 감사는 반복하지 않았다. 기존 `CURRICULUM-HOLD-q07.md`, source 감사, 독립 풀이/검토, 부모의 frozen20 후보/검토는 수정하지 않았다. 이 새 판정이 부모가 수집할 추가 근거이며, 옛 보류 문서의 바이트는 그대로 남는다.

## 확인된 원문과 적용 교육과정

원문: `{q['normalizedQuestion']['stem']}`. 인쇄 그림은 없고 배점은 4점이다. 손으로 그린 삼각형은 인쇄 문제 그림이 아니므로 기존 정규화에서 제외되었다. 정규화 파일 SHA-256 `{q['normalizedInput']['sha256']}`를 바인딩하며, 부모의 통합본과 바이트가 같다. HWP/PDF/원스캔 내용·학교·날짜 확인은 이미 통합된 source 감사 `{adjudication['reference']['retainedSourceAuditCommit']}`의 결과를 유지한다. [기존 q07 정규화](../../../../../.qa-artifacts/exam-resume-20261008/bumil-source-audit-r2/question-only/q07/normalized-question.json)의 `sin A` 입력과 `cos A÷tan A` 목표가 이번 판단 대상이다.

실제 시험은 2025-09-23 중3이다. 교육부 [2015-74 고시](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=60747&lev=0&m=040401&opType=N&page=1&s=moe) 부칙 1 라의 중3 시행일은 2020-03-01, [2022-33 일반 교육과정 고시](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401&opType=N&page=1&s=moe) 부칙 1 라의 중3 시행일은 2027-03-01이다. 따라서 2025·2026 중3에는 2015를 적용한다. 2027 이후 새 대상의 2022 적합성이나 현재·미래 재발행 허가는 이 판정으로 승인되지 않는다. 시행조항은 오늘 읽은 기존 공식 HTML의 정확한 문단 및 해시를 `rollout.json`에 보존했다. 웹 도구의 2015 고시 재열람 실패를 캐시의 새 다운로드로 꾸미지 않았다.

## 공식 제한 및 허용되는 개별 선수 지식

직접 공식 출처는 [2015-74 수학 별책8 PDF 포함 배포파일](https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=dc926a43bf953203951fb928ff098b1c)와 [2020-236 개정 수학 별책8 HWP](https://www.moe.go.kr/boardCnts/fileDown.do?m=0404&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84)이다. [교육부 2020-236 고시 게시판](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=81884&lev=0&m=0404&opType=N&s=moe&statusYN=W)의 해당 첨부파일도 확인했다. 아래 기록은 HWP `BodyText/Section0`, tag67, 압축 해제 스트림 오프셋이며, 이번 코드가 다시 디코딩하여 PDF와 공백·제어문자 정규화 후 전체 조항을 대조했다. 물리 33·34·38·39쪽을 새 증거로 렌더하고 `view_image`로 문맥/표기/인쇄 쪽수를 확인했다.

| 조항/의미 | HWP record / paragraph / offset | PDF 물리/인쇄 쪽 | 이 건 적용 |
|---|---|---|---|
| `no_trig_ratio_relationships`: 삼각비 사이의 관계 제외 | 4440 / 908 / 224820 | 39 / 35 | 보존된 q07 평가와 충돌 |
| `[9수04-17]` 삼각비의 뜻과 간단한 값 | 4341 / 891 / 219120 | 38 / 34 | 정의와 간단한 값 허용, 위 제한의 예외 아님 |
| `[9수04-18]` 삼각비 활용 문제 | 4345 / 892 / 219292 | 38 / 34 | 일반 활용 허용이 관계 제외를 지우지 않음 |
| 0°~90°만 다룸 | 4444 / 909 / 224946 | 39 / 35 | 원문 급각 조건 충족 |
| `[9수04-16]` 피타고라스 | 4333 / 889 / 218866 | 38 / 34 | 나머지 변을 구하는 개별 절차 허용 |
| `[9수02-12]` 인수분해 | 3956 / 807 / 201534 | 34 / 30 | 완전제곱 인식 허용 |
| `[9수02-13]` 이차방정식 | 3964 / 809 / 201786 | 34 / 30 | 실수 중근의 풀이 허용; 근과 계수/판별식 불필요 |
| `[9수01-07]` 제곱근 | 3776 / 768 / 192865 | 33 / 29 | 양의 길이를 위한 제곱근 허용 |
| `[9수01-10]` 근호 계산 | 3788 / 771 / 193301 | 33 / 29 | 간단한 근호 사칙 계산 허용 |

정확한 전문·인접 문맥·파일 경로·해시는 새 `official-provisions.json`에 있다. PDF SHA-256 `{official['pdf']['sha256']}`, 개정 HWP SHA-256 `{official['hwp']['sha256']}`. 제한은 기하의 **교수·학습 방법 및 유의 사항**에 위치한다. 이를 평가상 보존된 관계를 허용하는 조항으로 뒤집을 수 없다. 부모의 별칭 `no_ratio_identities`도 공식 문구를 “외운 항등식만 제외”로 좁히는 근거가 아니다. “간단한 삼각비의 값”만 인용하고 같은 절의 관계 제한을 생략하지 않았다.

개정 불확실성을 이번 대상에 한정했다. [2022-2 실제 고시문](https://www.moe.go.kr/boardCnts/fileDown.do?fileSeq=2b69253bc6744cab14e91cc8ce4150ad&m=&s=moe)의 record25/offset707은 총론 일부 개정, record43/1449는 별책1의 해당 장, record624/26448·628/26596은 별책1·4를 명시한다. 수학 별책8 변경이 아니다. 새 내려받기 SHA-256 `{notice['sha256']}`. [국가교육위원회 2024-1 공식 안내](https://ncic.re.kr/board/B0033.cs?act=read&bwrId=2114&m=34&pageIndex=1&pageUnit=15&searchCondition=&searchEndDt=&searchKeyword=&searchStartDt=) 본문 1~11항(2025-03-01 시행)은 별책8을 개정 대상으로 열거하지 않는다. 해당 두 후속 고시에서 이 삼각비 조항을 바꾸는 내용은 확인되지 않았다. 모든 일반 정책의 전체 개정 이력을 감사했다고 주장하지 않으며, 관련 없는 누락을 추가 승인 게이트로 삼지 않는다. 이번 정확한 대상에 관한 별도 미확인 수학/학년 조항은 남겨두지 않았다.

## 왜 도형 재표현으로 통과하지 않는가

정보 흐름은 `이차방정식 → 한 삼각비 sin A → 같은 각의 다른 두 삼각비 → 그 몫`이다. 목표를 유지한 채 직각삼각형을 그리거나 적절한 닮음 척도로 바꾸어도 이 흐름은 남는다. 이는 길이가 주어진 도형에서 정의로 하나의 삼각비를 읽는 평가와 구별된다. sin/cos/tan 기호 자체나 피타고라스 자체를 금지했다는 결론도 아니다.

정의 풀이의 개별 계산은 중학교 안에서 실행할 수 있다. 그러나 “허용된 단계만 쓰므로 어떤 평가 대상도 허용된다”는 결론은 명시적 제외를 우회한다. 이 원문에서는 sine 값 하나로 다른 같은 각의 비를 결정하여 결합하는 능력을 성공 조건으로 요구한다. 관계식을 외우게 하지 않고 수치 도형으로 구현해도 **평가하는 관계**가 바뀌지 않는다. 공식 문서에서 이 보존된 평가에 대한 피타고라스/도형 예외는 확인되지 않았다. 이 조항 적용은 검토자의 구체적인 범위 판정이며 학교 출제·원답·모델 확률을 대체 근거로 사용하지 않았다.

| 변환의 종류 | 원문 평가 동일성 | 제외된 관계 제거 | 판정 |
|---|---|---|---|
| sin 조건/최종 cos÷tan 유지 + 직각삼각형 제시 | 유지 | 제거하지 못함 | rejected |
| 같은 목표를 `이웃변²/(빗변×대변)` 등 동치 식으로 치환 | 유지 | 관계 의존성만 숨김 | rejected |
| 실제 변 길이를 주고 나머지 변/직접 변의 비만 묻는 별개 과제 | 핵심 평가 변경 | 새 과제에 따라 가능 | 충실한 q07 twin 승인 불가; 별도 과제로 별도 검토 |

선수 지식이 허용됨과 **평가 대상이 허용됨**을 분리했다. 원문을 보존하는 도형 재표현은 승인하지 않는다. 도형의 실제 길이 문제로 바꿀 수 있다는 말은 원문과 같은 평가·핵심 원리를 보존했다는 말이 아니다. 새 발문, 수치 변형 후보, 그림, 학생 해설은 제작하지 않았다.

보조 수학만 `Fraction` 코드로 확인했다. `(3x−2)²` 전개 계수 `[9,−12,4]`, 유일한 실근 `2/3`(중복도2), 급각 사인 범위, 빗변3/대변2로 **척도를 선택한** 도형의 나머지 변 제곱5와 양의 길이, cos²=5/9·tan²=4/5 및 몫의 제곱 일치를 계산했다. 마지막 몫은 5/6으로 계산되지만, 선택지·원래 정답과의 일치 검사는 하지 않았다. 이 값은 새 후보 정답이 아니라 평가 의존성 검토의 보조 계산이며, 어느 학년의 허용 근거도 아니다. `supplemental-math.json`과 실행 코드를 보존한다.

## 전체 학생 표면과 선수 단원

아래는 **확인된 원문 q07**과 그 평가를 보존하려는 가상 경로의 제작 전 판정이다. 아직 존재하지 않는 새 후보의 전체 검토를 완료했다고 주장하지 않는다.

| 학생 표면 | 확인/판정 |
|---|---|
| 발문 | 방정식은 범위 안; sin→cos÷tan의 평가 관계는 rejected |
| 선택지 | 다섯 유리수의 표기/수 자체는 범위 안; 목표 충돌을 면제하지 않음 |
| 그림/그래프 의미 | 인쇄 그림 없음; 추가 도형이 목표를 유지하면 관계 충돌도 유지 |
| 표기 | 개별 sin/cos/tan, 제곱, 나눗셈, 급각 범위는 허용; 표기 금지를 근거로 삼지 않음 |
| 답 형식 | 유리수 답 형식은 허용; 답이 가리키는 평가 목표는 rejected |
| 전체 학생 풀이 | 개별 정의/피타고라스는 허용, 보존된 관계 평가 풀이로는 rejected |
| 필수 절차 | 한 비에서 다른 같은 각의 비와 그 결합을 결정해야 하는 핵심은 제거되지 않음 |

실제 부모 `prisma/seed-data/units.ts`의 중2 order463(2851행)·464는 피타고라스/활용, 중3 order469(2880행)·471(2892행)은 제곱근/근호, order472(2899행)·473(2905행)은 곱셈/인수분해, order475(2918행)은 이차방정식의 풀이, order481(2956행)은 삼각비의 뜻이다. 이것은 `[9수...]` 중1~3 학년군 코드에 더하여 실제 프로젝트의 선수 순서를 확인한 근거다. 필요한 개별 기초의 학년 밖 문제는 발견되지 않았다. 기본 단원들이 맞아도 관계 제외는 남는다. 코드의 정확한 SHA-256·행·발췌는 `unit-family-evidence.json`에 있다.

## 실제 family03의 목적과 제한된 권고

현재 부모의 두 read-only bank snapshot에서 Unit `3e93bf73-4493-4299-b8a3-c4f5247e4413`은 중3·2학기·`삼각비의 뜻`·order481이다. family `mid:3-2|삼각비|03`은 live24이며 마지막 snapshot `bank-read-fresh-r2-20261008.json`의 `/units/12`, `/liveFamilies/85`, 캡처 `2026-10-08 04:53:45.769124+00`를 확인했다. DB는 읽지 않았다. Registry의 `/entries/72`는 “한 삼각비의 값을 알 때 다른 삼각비의 값 구하기”이다.

실제 `src/lib/middle/m3Trig.ts` 1023~1059행은 주어진 같은 각의 비 `given`과 다른 목표 비 `want`를 택하고, 피타고라스 세 쌍에서 나머지 변을 복원해 다른 비를 계산한다. `given===want`는 제외하며 출력 그림은 null이다. SHA-256 `{units['generator']['sha256']}`. 제목만 보고 목적을 추정하지 않았다. q07의 **두 비의 몫**은 이 정확한 family03 규칙의 목표로 구현되어 있지 않다. 이 지원 차이는 별도의 family 목적 적합성 문제이며, 이번 교육과정 거절의 근거가 “생성기에 inverse 기능 없음”인 것은 아니다. 그 기능을 추가해도 명시적 평가 관계 충돌은 해결되지 않는다.

권고는 **2015 대상의 같은 각 ratio→ratio family03를 공식 제한 위험이 있는 목적으로 식별하고, live 존재/제목을 학년 허용 증거로 사용하지 말 것**이다. 실제 각 생성 목적을 그 제한에 맞춰 따로 검토해야 한다. 이 권고는 live24 전량의 최종 판정·삭제·잠금이 아니며, 제품 코드/DB row를 바꾸지 않는다. 다른 삼각비 활용 family 전체를 일괄 거절하거나 2022를 자동 허용하는 주장도 하지 않는다.

## 판정의 한계, 재개 조건, 보존

`rejected`는 원문 평가를 보존하는 **2025 중3·2015 q07 제작 적격성**의 결과다. 원문 내용/출처 동일성은 기존 확인 상태를 유지한다. 저작권·취득 경위·출판 허락·native provenance·적재의 별도 pending/blocked 상태는 이번 수학 범위 판정으로 해제되지 않는다. 원스캔의 학생 주석을 앞선 source 감사에서 우연히 본 사실은 이미 공개되어 있으며, 이번 검토를 원답에 대해 blind였다고 부르지 않는다. 그 노출은 공식 범위 판정의 근거로 쓰이지 않았다.

같은 q07 목표를 다시 열려면 적용 가능한 **직접 공식 설명/개정**에서 이 정확한 사례(하나의 같은 각 sin 값에서 cos/tan 몫으로 전환하는 평가)를 정의·피타고라스로 허용하거나 관계 제외를 바꾼다는 조항·쪽·기록·시행일을 제시하고, 실제 새 학생 경로/일곱 표면을 다시 대조해야 한다. 일반 성취기준 제목, 출판사·학교 연습문제, live family, 모델 확률, 원답 일치만으로는 열지 않는다. 실제 대상이 2022 적용 학년으로 바뀌는 경우도 해당 기준·제한을 별도로 확인한 뒤 재검토한다. 단순 변 길이 과제는 사용자가 평가 변경을 명시적으로 인정한 **별도 과제**로 검토할 수 있으나, 동일 q07 twin의 재개 조건을 충족한 것으로 기록하지 않는다.

TypeSafe 프로젝트 skill과 오늘의 [confidence 문서](https://docs.typesafe.ai/confidence), [citation check 문서](https://docs.typesafe.ai/cookbooks/citation_check)를 읽고 문구 존재와 문맥상 지원, 관측과 적용 판단을 분리했다. `citation-review.json`은 직접 공식 문구와 이 원문에 대한 검토자 적용을 구별한다. confidence/확률은 기록하지 않았고 inference API는 호출하지 않았다. 결정적 계산은 코드에서 수행했다.

새 증거 경로는 `.qa-artifacts/exam-resume-20261008/bumil-q07-curriculum-adjudication-r1/`뿐이다. 사전 바이트 기준 2,089개 파일(자신의 기존 증거/관련 보고서207개, 부모 frozen scope hash-only1,786개, 그 밖의 read-only 입력/보호 ledger/기존 산출물)을 해시로 확인한다. 이는 보존 증명이며 교육과정/출처를 해시만으로 증명한 것이 아니다. 이전 hold SHA-256 `{q['priorHold']['sha256']}`. 최종 `preservation-check.json`·`validation.json`·`artifact-manifest.json`이 보존 및 새 범위 검사를 기록한다. 부모/main/N/old outputs/공유 의존성/제품 코드 수정, 설치, DB/API/적재/해제/배포/push 없이 이 새 판정과 증거만 자신의 브랜치에 커밋한다.
"""
text=text.replace("../../../../../.qa-artifacts/", "../../../../.qa-artifacts/")
REPORT.parent.mkdir(parents=True,exist_ok=True)
REPORT.write_text(text,encoding="utf-8")
print("Written adjudication rejected; report",REPORT)
