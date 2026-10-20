from pathlib import Path
import json
B=Path('.qa-artifacts/exam-resume-20261008');P=B/'gachang-next2-review-20261020-r3';rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
for x in rd(P/'verification/verification-inputs.json'):
 c=x['candidate'];print(json.dumps({'n':c['questionNumber'],'answer':c['answer'],'solution':c['solution'],'variantDelta':c['variantDelta'],'curriculumReview':c['curriculumReview'],'metadata':c['metadata'],'bindings':{k:x[k]for k in ['studentDigest','candidateDigest','assetDigest','solveDigest']}},ensure_ascii=False))
for n in [4,5]:
 c=rd(B/f'gachang-next2-source-context-local-20261020-r1/q{n:02}.local.json');print('SOURCE',json.dumps({k:v for k,v in c.items()if k in ['stem','choices','printedScoreOccurrences','difficultyLabelFromSource','topicLabelFromSource']},ensure_ascii=False))
