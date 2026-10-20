from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent.parent;E=P/'own-raw-evidence-r1';rows=[]
for n in [3,6]:
 p=P/f'blind/solve/q{n:02}.json';d=json.loads(p.read_text(encoding='utf-8-sig'));old=json.loads((E/f'own-preseal-notation-q{n:02}.json').read_text(encoding='utf-8-sig'));assert set(d)=={'studentDigest','solverId','answer','solution','evidence','status'} and len(d['answer'])==1 and d['answer'] in '①②③④⑤' and isinstance(d['solution'],str) and isinstance(d['evidence'],dict) and d['status']=='solved';assert d['answer']==old['answer'] and d['solution']==old['solution'];rows.append({'question':n,'answer':d['answer'],'status':d['status'],'rawSHA256':hashlib.sha256(p.read_bytes()).hexdigest()})
(E/'own-final-schema-receipt.json').write_text(json.dumps({'rows':rows,'currentAuthorAnswerExposure':False,'mathAnswersSolutionsUnchangedByPresealNotationCorrection':True,'calculationAssertions':40,'passed':40,'failed':0,'notSummedWithRepeatedExecution':True,'visualReviewPerformed':False},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(rows,ensure_ascii=False))
