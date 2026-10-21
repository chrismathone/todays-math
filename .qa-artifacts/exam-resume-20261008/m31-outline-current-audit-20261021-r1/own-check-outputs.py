from pathlib import Path
from collections import Counter
import json,re,hashlib
P=Path(__file__).resolve().parent;r=json.loads((P/'own-actual-outputs.json').read_text(encoding='utf-8'));checks=[];rows=[]
def ck(n,v):checks.append({'name':n,'pass':bool(v)})
for i,row in enumerate(r['rows']):
 p=row['problem'];text=p['content'];mode=0 if text.startswith('그림과 같은') else 1;fig=p.get('figureSpec');result={'cohort':row['cohort'],'mode':mode}
 if mode==0:
  n=int(re.search(r'\$(\d+)\$각형',text)[1]);names=[chr(65+j) for j in range(n)];expected={frozenset((names[j],names[(j+1)%n])) for j in range(n)};points=fig['points'];edges=list(fig['segments'].values());labels=fig['labels'];actual={frozenset(e) for e in edges};ck(f'{i}/boundaryCycleExactly',len(points)==n and set(points)==set(names) and len(edges)==n and actual==expected and all(len(e)==2 for e in edges));ck(f'{i}/vertexLabelsOnly',labels==dict(zip(names,names)));ck(f'{i}/noConstructionExtraMarks',all(not fig.get(k) for k in ['angles','dimensions','arcs','lines','circles','polygons']) and set(fig)<= {'version','points','segments','labels'});ck(f'{i}/countAndUnits',p['answer']==f'${n-3}$개');result.update(n=n,edges=len(edges),possibleDiagonalsNotDrawn=n-3)
 else:
  given=int(re.search(r'개수가 \$(\d+)\$개',text)[1]);n=given+3;ck(f'{i}/inverseNoFigure',fig is None);ck(f'{i}/inverseAnswerScalarNoUnit',p['answer']==f'${n}$');result.update(n=n,givenDiagonalCount=given)
 if row['cohort']=='forcedHandler16':ck(f'{i}/forcedModeN',mode==row['forcedMode'] and n==row['forcedN'] and row['rngDrawCount']==2)
 rows.append(result)
ck('API100andForced16',r['counts']=={'actualAPICalls':100,'forcedTypeHandlerCalls':16,'total':116});ck('bothActualBranches',set(x['mode'] for x in rows if x['cohort']=='actualAPI100')=={0,1});ck('heapAndNoCalls',r['heapLimit']<=256*1024**2 and r['DBImports']==0 and r['networkCalls']==0)
out={'counts':{'assertions':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks)},'branchCountsActual':dict(Counter(x['mode'] for x in rows if x['cohort']=='actualAPI100')),'checks':checks,'cases':rows,'sourceOutputsSHA256':hashlib.sha256((P/'own-actual-outputs.json').read_bytes()).hexdigest()};(P/'own-calculations.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(out['counts']));assert all(x['pass'] for x in checks)
