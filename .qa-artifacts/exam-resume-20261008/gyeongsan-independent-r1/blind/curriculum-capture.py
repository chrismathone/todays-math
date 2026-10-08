"""Only official curriculum, never an original exam or an author/private pack."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,re
import fitz
R=Path(__file__).resolve().parent
assert not (R/'solve-freeze.json').exists(),'Sealed scope.'
p=Path('C:/Users/user/orca/workspaces/todays-math/exam-twin-curriculum-20261008/.qa-artifacts/exam-resume-20261008/sources/moe-2015-74-book8-math.pdf')
raw=p.read_bytes();doc=fitz.open(p)
requested=['9수01-07','9수01-10','9수02-05','9수02-10','9수02-12','9수02-13','9수03-01','9수03-05','9수03-06','9수03-09','9수03-10','9수04-02','9수04-04','9수04-05','9수04-10','9수04-12','9수04-14','9수04-16','9수04-17','9수04-18','9수04-19','6수03-06']
selected=[]
for i,page in enumerate(doc):
 text=page.get_text();text=re.sub(r'\s+',' ',text.replace('\x01',' '))
 for code in requested:
  m=re.search(r'\['+re.escape(code)+r'\]\s*(.*?)(?:다\.|있다\.)',text)
  if m and not any(v['code']==code for v in selected):selected.append({'code':code,'exactText':m.group(0).split(']',1)[1].strip(),'physicalPage1based':i+1,'printedPage':i-3,'source':'2015-74 math booklet8 official PDF'})
assert set(v['code'] for v in selected)==set(requested),'Official standard not found; do not invent code.'
restrictions=[{'id':'no_ratio_identities','exactText':'삼각비 사이의 관계는 다루지 않는다.','physicalPage1based':39,'printedPage':35},{'id':'angle_range','exactText':'삼각비의 값은 0°에서 90°까지의 각도에 대한 것만 다룬다.','physicalPage1based':39,'printedPage':35},{'id':'no_circle_proportionality','exactText':'원과 비례에 관한 성질은 다루지 않는다.','physicalPage1based':39,'printedPage':35},{'id':'no_complex_function_application','exactText':'함수와 관련하여 지나치게 복잡한 활용 문제는 다루지 않는다.','physicalPage1based':37,'printedPage':33}]
for v in restrictions:
 t=re.sub(r'\s+',' ',doc[v['physicalPage1based']-1].get_text()).replace('\x01',' ')
 assert v['exactText'] in t
out={'method':'read official2015-74 booklet8 PDF only; selected exact standards/clauses, no exams/author answers','sourcePath':str(p),'sourceRawSha256':hashlib.sha256(raw).hexdigest(),'officialSourceUrl':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=60747&lev=0&m=040401&opType=N&page=1&s=moe','standards':selected,'restrictions':restrictions,'scope':'selected2015 clauses;not a complete current-policy/final-grade approval'}
(R/'curriculum-scope-input.json').write_bytes((json.dumps(out,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print('Selected22 exact official standards captured;quadratic graph standards9수03-09/10;circle tangents9수04-19;no author exposure.')
