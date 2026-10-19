from pathlib import Path
import json,hashlib,subprocess,html
D=Path(__file__).resolve().parent
rows=json.loads((D/'existing-figure-bindings.json').read_text(encoding='utf8'))
selected=[r for r in rows if (r['familyId'].endswith('inverse-area-ratio') and r['variant'] in [0,1,2,11]) or (r['familyId'].endswith('shared-side-square') and r['variant'] in [0,7])]
local=D/'local-view';local.mkdir(exist_ok=True)
# Display already-authored SVGs at explicit CSS70mm; no engine figure rerender.
parts=[]
for r in selected:
 b=Path(r['svg']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['svgSha256']
 parts.append('<section><div>'+r['familyId'].removeprefix('study-middle-')+' / '+str(r['variant'])+'</div><img src="'+html.escape(Path(r['svg']).as_uri())+'"></section>')
page=local/'existing-70mm-six.html'
page.write_text('<!doctype html><meta charset="utf-8"><style>body{margin:8px;display:grid;grid-template-columns:repeat(3,70mm);gap:10px;font:12px Arial}section{width:70mm}img{width:70mm;height:70mm}div{height:22px}</style>'+''.join(parts),encoding='utf8')
target=local/'existing-70mm-six.png'
cmd=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','--headless','--disable-gpu','--no-sandbox','--hide-scrollbars','--force-device-scale-factor=2','--window-size=850,680','--user-data-dir='+str(local/'edge-profile'),'--screenshot='+str(target),page.as_uri()]
result=subprocess.run(cmd,capture_output=True,text=True,encoding='utf8',errors='replace',timeout=45)
assert result.returncode==0 and target.exists(),result.stderr[-1000:]
(D/'visual-view-metadata.json').write_text(json.dumps({'method':'Existing exact-bound SVGs shown in local HTML at CSS70mm; Edge headless screenshot DPR2. No engine figure generation.','priorAttemptFailure':'CairoSVG import failed: missing cairo-2/cairo/libcairo-2 libraries. No install performed; switched to available Edge.','sheet':str(target),'sheetSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'selected':selected,'limitations':'Only these six layouts visually viewed; all20current specs and labels checked separately. No blanket all-variant print-layout clearance.'},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
