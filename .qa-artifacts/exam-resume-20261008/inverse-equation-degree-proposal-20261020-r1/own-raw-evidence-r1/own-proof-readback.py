from pathlib import Path
import json
P=Path('.qa-artifacts/exam-resume-20261008/inverse-equation-degree-proposal-20261020-r1');r=json.loads((P/'own-raw-solutions-r1.json').read_text(encoding='utf-8'));print(json.dumps([{'n':x['n'],'answer':x['answer'],'L':x['evidence']['remainingLinearCoefficient'],'root':x['evidence']['rootX'],'solution':x['solution']}for x in r['solutions']],ensure_ascii=False,indent=1))
