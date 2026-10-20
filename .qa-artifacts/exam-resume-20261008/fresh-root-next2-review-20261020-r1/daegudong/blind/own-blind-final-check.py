from pathlib import Path
from fractions import Fraction
import json,hashlib
base=Path('.qa-artifacts/exam-resume-20261008/fresh-root-next2-review-20261020-r1')
for name,n in [('daegudong',3),('daeguil',2)]:
 p=base/name/'blind';s=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0];raw=json.loads((p/'solve'/f'q{n:02}.json').read_text(encoding='utf-8'));r=json.loads((p/'own-blind-replay-receipt.json').read_text(encoding='utf-8'));c=raw['evidence']['ownExactCalculation']
 if name=='daegudong':
  values=[Fraction(v.strip('$')) for v in s['choices']];expected=[Fraction(int(x['k']['numerator']),int(x['k']['denominator'])) for x in c['allFiveChoices']];assert values==expected
 else:assert [[z.strip() for z in x.split(',')] for x in s['choices']]==[x['items'] for x in c['allFiveChoices']]
 assert raw['studentDigest']==s['studentDigest'] and raw['status']=='solved' and raw['answer']=='③' and '\ufffd' not in raw['solution'] and raw['evidence']['exposureDeclaration']['currentTransformedAuthorAnswerSeenBeforeRawSeal'] is False
 for x in r['studentInputsAfter']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
 print(name,'all5printed-choice-binding, raw schema, exposure and input hashes checked')
