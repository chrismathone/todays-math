from pathlib import Path
import json,hashlib,re,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · editor08 준비만/실행 보류\n',encoding='utf8');assert '준비' in (P/'own-probe.txt').read_text(encoding='utf8')
entry=['src/components/unified/figure-editor/'+n for n in ['figureAssetLibrary.ts','figureSvgEditing.ts','figureAssetGeometry.ts','figureObjectGroups.ts','figureAngleMark.ts','figureRotate.ts','figureMirror.ts']]+['src/lib/dev-ai/figure-edit-contract.ts']
# Read-only dependency closure from explicit import edges; not full repository enumeration.
todo=[R/n for n in entry];seen={}
while todo:
 p=todo.pop()
 if str(p)in seen:continue
 if not p.exists():raise RuntimeError('missing import '+str(p))
 b=p.read_bytes();seen[str(p)]=sha(b)
 if p.suffix not in ('.ts','.tsx'):continue
 for s in re.findall(r'(?:from\s+|import\s*\()\s*[\'"]([^\'"]+)',b.decode('utf8')):
  base=R/'src'/s[2:] if s.startswith('@/')else (p.parent/s).resolve()if s.startswith('.')else None
  if base is None:continue
  candidates=[base]if base.suffix else [Path(str(base)+e)for e in ['.ts','.tsx','.json']]+[base/'index.ts',base/'index.tsx']
  target=next((f for f in candidates if f.is_file()),None)
  if target and str(target.resolve()).startswith(str(R.resolve())):todo.append(target)
for f in (R/'scripts/figure/assets').glob('*.svg'):seen[str(f)]=sha(f.read_bytes())
for f in (R/'scripts/figure/assets').glob('*.json'):seen[str(f)]=sha(f.read_bytes())
reg=json.loads((R/'src/lib/figure/asset-editor-geometry.json').read_text(encoding='utf8'))['assets'];legacy=json.loads((R/'src/lib/figure/asset-editor-geometry-legacy-20261021.json').read_text(encoding='utf8'))['assets']
assert len(reg)==41 and len(legacy)==39
manifest=[]
for f in (R/'scripts/figure/assets').glob('manifest*.json'):manifest+=json.loads(f.read_text(encoding='utf8'))['assets']
stocks=[]
for row in manifest:
 slug=row['slug'];src=R/'scripts/figure/assets'/row['file'];raw=src.read_bytes();digest=sha(raw.replace(b'\r\n',b'\n'));assert digest==reg[slug]['sourceSHA256']
 public=R/'public/figure-assets'/f'{digest[:16]}-{slug}.svg';assert public.is_file();assert sha(public.read_bytes().replace(b'\r\n',b'\n'))==digest;seen[str(public)]=sha(public.read_bytes())
 stocks.append({'slug':slug,'viewBox':row['viewBox'],'sourcePath':str(src),'publicPath':str(public),'LF_SHA256':digest})
fixtures={'baseSVG':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="white"/><line id="math" x1="10" y1="30" x2="110" y2="30" stroke="black" data-n="7"/><text id="value" x="55" y="25">30 m</text></svg>',
 'stock41':stocks,'legacy39':list(legacy),'groupNames':['A','B','C'],'badGroups':['','x'*129,'<script>','javascript:bad'],
 'stackInputs':[{'name':'null-and-name','value':'[null,"A"]','expected':[None,'A']},{'name':'65depth','value':json.dumps(['A']*65),'expected':[]},{'name':'129name','value':json.dumps(['a'*129]),'expected':[]},{'name':'8193bytes','value':' '*8193,'expected':[]},{'name':'wrongtype','value':'[3]','expected':[]}],
 'negativeAssets':['wrong-body','unknown-slug','wrong-viewBox','negative-viewBox','nonfinite-center','out-of-frame-center','duplicate-id','extra-math-body'],
 'perspectiveCases':[{'right':True,'perspective':True,'schemaAccepted':True},{'right':True,'perspective':False,'schemaAccepted':True},{'perspective':True,'schemaAccepted':False},{'right':False,'perspective':True,'schemaAccepted':False},{'right':True,'perspective':'true','schemaAccepted':False}],
 'expectedMode':'direct helper/jsdom only; no full UI/history/native/layout approval'}
dump('own-fixtures.json',fixtures);dump('own-preparation-hashes.json',seen)
after={p:sha(Path(p).read_bytes())for p in seen};assert after==seen
dump('own-preparation-after.json',after)
dump('own-preparation-receipt.json',{'PythonStaticExecuted':True,'currentAssetFilesBound':41,'legacyIdentityMetadata':39,'publicSourceLFBindingsChecked':41,'boundFiles':len(seen),'Node':0,'browser':0,'GO':False,'pending':'Fresh freeze/deltas+memory>=1.5GiB+separateGO before Node. No runtime controls have passed yet.'})
print(json.dumps({'RootBoundFiles':len(seen),'staticPublicLFBindings':41,'legacyMetadata':39,'Node':0}))
