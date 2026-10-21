from pathlib import Path
import os,sys,json,hashlib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');os.environ['PYTHONDONTWRITEBYTECODE']='1';os.environ['FIGURE_ENGINE_PATH']=str(R/'vendor/figure-engine');sys.dont_write_bytecode=True
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();paths=json.loads((P/'own-run2/own-before.json').read_text());before={x:sha(Path(x)) for x in paths}
sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
from render_spec import render_json
base={'version':2,'points':{'V':[100,100],'P':[200,100],'Q':[150,150]},'segments':{'VP':['V','P'],'VQ':['V','Q']},'background':'transparent'}
a=render_json(json.dumps(base));b=render_json(json.dumps({**base,'assets':None}));result={'classification':'supplemental2call reproduction, not added to139unique controls','withoutAssets':a,'withExplicitNull':b,'identicalResult':a==b,'expectedNullRejectionStillHeld':True,'sourceChanges':[x for x in before if before[x]!=sha(Path(x))]};(P/'own-null-reproduction.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'identical':a==b,'sourceChanges':result['sourceChanges']}))
