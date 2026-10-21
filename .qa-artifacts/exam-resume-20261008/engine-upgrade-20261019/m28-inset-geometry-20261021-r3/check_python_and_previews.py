"""Record current Python checks and deterministic previews; no pixel answer oracle."""
from pathlib import Path
import datetime,hashlib,json,math,os,subprocess,sys
OUT=Path(__file__).resolve().parent
assert not (OUT/'python71-execution.json').exists()
sources=list(Path('scripts/figure').glob('*.py'))+list(Path('vendor/figure-engine/core').glob('*.py'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before={p.as_posix():sha(p) for p in sources}
cmd=[sys.executable,'-B','-m','unittest','discover','-s','scripts/figure','-p','test_*.py']
r=subprocess.run(cmd,capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},timeout=180)
log=r.stdout+r.stderr;(OUT/'python71.log').write_bytes(log)
same=before=={p.as_posix():sha(p) for p in sources}
(OUT/'python71-execution.json').write_text(json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),command=cmd,exitcode=r.returncode,logSHA256=hashlib.sha256(log).hexdigest(),codeSHA256=before,sourcesUnchanged=same,dbWrites=0),indent=2)+'\n',encoding='utf-8')
assert r.returncode==0 and same,log.decode('utf-8')
sys.path.insert(0,str(Path('scripts/figure').resolve()))
from engine_path import ensure_on_path
ensure_on_path()
from core.figure_svg import svg_to_png_bytes
from render_spec import render_json
rows=json.loads(Path('.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1/own-actual-outputs.json').read_text(encoding='utf-8-sig'))['rows']
previews=[]
for target in (9,16,72):
    for row in rows:
        spec=row['figureSpec'];a,b,c=(spec['points'][k] for k in ('A','B','C'))
        u=(a[0]-b[0],a[1]-b[1]);v=(c[0]-b[0],c[1]-b[1])
        beta=math.degrees(math.atan2(abs(u[0]*v[1]-u[1]*v[0]),u[0]*v[0]+u[1]*v[1]))
        if abs(beta-target)>.01:continue
        spec=json.loads(json.dumps(spec))
        for mark in spec['angles'].values():mark['serialized_inset']=True
        result=render_json(json.dumps(spec));assert 'svg' in result,result
        png=svg_to_png_bytes(result['svg'],width=1200);assert png
        name=f'current-beta-{target}.png';(OUT/name).write_bytes(png)
        previews.append(dict(targetBeta=target,coordinateBeta=beta,png=name,sha256=hashlib.sha256(png).hexdigest(),pixelOracle=False));break
    else:raise AssertionError(target)
(OUT/'preview-manifest.json').write_text(json.dumps(dict(actualCurrentPreviews=previews,physicalPrintApproval=False),indent=2)+'\n',encoding='utf-8')
print(log.decode('utf-8')[-300:]);print(json.dumps(previews))
