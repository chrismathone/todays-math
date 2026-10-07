# 독립 풀이 후 새 해설/학년 검토

독립 solve를 먼저 작성한 별도 검수자가 후보의 답/해설/스펙을 검토한다. 원문 답 일치를 승인 기준으로 쓰지 않는다. 원문과 같은 개념/핵심 방법, 새 구조/소재/표현/역추론, 자연스러움과 목표 난이도를 검토한다. 각 reports/qNN.json에 {status:'verified'|'pending'|'rejected',studentDigest,candidateDigest,assetDigest,method:'independent-solve-then-review',verifierId,solveDigest,checks,evidence,curriculumSurfaces}를 기록한다.

checks: answerCorrect, solutionCorrect, existenceUniqueness, choicesCorrect, figureConsistent, sameCoreConceptAndProcedure, distinctPresentation, naturalKorean, curriculumAppropriate, allStudentSurfacesInScope, unitFamilyFit, scoreAppropriate. 각 true는 구체적인 풀이·보기·그림·성취기준/학년/선수 근거를 필요로 한다. curriculumSurfaces 각 stem, choices, figuresAndTables, notation, answer, studentSolution, prerequisites는 passed/pending/rejected로 판정한다. 학년 밖 필수 방법은 rejected, 불명은 pending. 코드/확률/원본 학교가 승인 근거가 아니다. 권리와 출처 승인은 이 검수의 수학 통과와 분리한다.
