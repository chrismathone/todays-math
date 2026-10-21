# PREPARED ONLY: requires explicit GO, then writes only this QA directory.
from pathlib import Path
import json,sys,os,hashlib
P=Path(__file__).resolve().parent;config=P/'own-go-freeze.json'
if not config.exists():raise SystemExit('NOT RUN: explicit GO/freeze file required')
c=json.loads(config.read_text(encoding='utf-8-sig'))
if c.get('go') is not True:raise SystemExit('NOT RUN: GO is false')
R=Path(c['root']);expected=c['expectedHashes'];
if R.resolve()!=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008').resolve():raise SystemExit('HOLD wrong Root')
required=[R/'scripts/figure/render_spec.py',R/'scripts/figure/scene_assets.py',R/'vendor/figure-engine/core/figure_scene.py',R/'vendor/figure-engine/core/figure_quality.py',R/'vendor/figure-engine/core/label_markup.py',R/'src/lib/figure/asset-editor-geometry.json']
if not expected or any(p.resolve() not in {Path(k).resolve() for k in expected} for p in required):raise SystemExit('HOLD incomplete freeze hashes')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for p,h in expected.items():
 if sha(Path(p))!=h:raise SystemExit('HOLD source changed: '+p)
sys.dont_write_bytecode=True;os.environ['PYTHONDONTWRITEBYTECODE']='1';os.environ['PYTHONIOENCODING']='utf-8';os.environ['FIGURE_ENGINE_PATH']=str(R/'vendor/figure-engine');sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
from render_spec import render_json
from core.label_markup import parse_label
cohort=json.loads((P/'own-cohort-inputs.json').read_text(encoding='utf-8'));rows=[]
for slug in cohort['nativePictureSlugs']:
 spec={'version':2,'points':{'A':[180,180],'B':[280,180]},'segments':{'AB':['A','B']},'labels':{'A':'A','B':'B'},'assets':[{'asset':slug,'at':'A','anchor':'center','width':60}],'background':'transparent'}
 result=render_json(json.dumps(spec));rows.append({'slug':slug,'input':spec,'result':result,'inputSHA256':hashlib.sha256(json.dumps(spec,sort_keys=True).encode()).hexdigest()})
units=[]
for text in cohort['units']:
 try:result=[{'text':x.text,'italic':x.italic,'shift':x.shift} for x in parse_label(text)]
 except Exception as e:result={'error':str(e)}
 units.append({'input':text,'pieces':result})
after={p:sha(Path(p)) for p in expected};(P/'own-native-and-units.json').write_text(json.dumps({'actuallyExecuted':True,'expectedFreeze':expected,'after':after,'changed':[p for p in expected if expected[p]!=after[p]],'native':rows,'units':units},ensure_ascii=False,indent=2),encoding='utf-8')
