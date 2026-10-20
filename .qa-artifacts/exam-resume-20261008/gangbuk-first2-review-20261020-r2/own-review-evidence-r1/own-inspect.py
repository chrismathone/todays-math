from pathlib import Path
import json
B=Path('.qa-artifacts/exam-resume-20261008');P=B/'gangbuk-first2-review-20261020-r2';rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));items=rd(P/'verification/verification-inputs.json')
for item in items:
 c=item['candidate'];print(json.dumps({'n':c['questionNumber'],'answer':c['answer'],'solution':c['solution'],'variantDelta':c['variantDelta'],'curriculumReview':c['curriculumReview'],'metadata':c['metadata'],'bindings':{k:item[k]for k in ['studentDigest','candidateDigest','assetDigest','solveDigest']}},ensure_ascii=False,indent=2))
C=B/'gangbuk-source-context-local-20261020-r1'
for n in [1,2]:
 q=rd(C/f'q{n:02}.local.json');print('SOURCE',json.dumps({k:v for k,v in q.items()if k in ['number','stem','choices','difficultyLabelFromSource','topicLabelFromSource','printedScoreOccurrences']},ensure_ascii=False))
