from pathlib import Path
import subprocess,json,hashlib,sys,math,xml.etree.ElementTree as ET,re
P=Path(__file__).resolve().parent;D=Path('D:/math-figure-editor');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');REV='5990a0dbff75640cd93eecb49d3469f6e190f66c';OLD='f6804668'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git','-C',str(D),*args])
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · intake 분리/원본 보존\n',encoding='utf8');assert '보존' in (P/'own-probe.txt').read_text(encoding='utf8')
assert git('rev-parse','HEAD').decode().strip()==REV
status=git('status','--short').decode('utf8')
changed=git('diff','--name-only',OLD,REV,'--','vendor/figure-engine','scripts/figure').decode().splitlines();assert len(changed)==51
paths=git('ls-tree','-r','--name-only',REV,'scripts/figure/assets').decode().splitlines()
snap=P/'own-local-data-snapshot';snap.mkdir(exist_ok=True)
sourceHashes={};oldHashes={}
for p in paths:
 b=git('show',f'{REV}:{p}');sourceHashes[p]=sha(b);(snap/Path(p).name).write_bytes(b)
tryold=lambda p:git('show',f'{OLD}:{p}')
before={str(R/p):sha((R/p).read_bytes()) for p in ['scripts/figure/figure_assets.py','scripts/figure/scene_assets.py','scripts/figure/render_spec.py','scripts/figure/build_asset_editor_registry.py','src/lib/figure/asset-editor-geometry.json','src/lib/figure/assetCatalog.ts','src/components/unified/figure-editor/figureAssetGeometry.ts']}
before.update({str(f):sha(f.read_bytes()) for f in (R/'vendor/figure-engine/core').glob('*.py')})
currentD={str(D/p):sha((D/p).read_bytes()) for p in paths+['scripts/figure/scene_assets.py','scripts/figure/build_catalog.py','docs/export/todays-math/README.md','docs/export/todays-math/patches/06-engine-all.patch','docs/export/todays-math/engine-check/check_engine.py']}
dump('own-before.json',{'root':before,'sourceWorkingTree':currentD,'sourceCommitAssetHashes':sourceHashes,'status':status,'changedPaths':changed})
rows=[]
for f in snap.glob('manifest*.json'):rows+=json.loads(f.read_text(encoding='utf8'))['assets']
new={r['slug']:r for r in rows};assert len(new)==41 and len(rows)==41
oldreg=json.loads((R/'src/lib/figure/asset-editor-geometry.json').read_text(encoding='utf8'))['assets'];assert len(oldreg)==39
attrs=set('x y x1 y1 x2 y2 cx cy r rx ry width height d points transform'.split())
def canon(e):return [e.tag.rsplit('}',1)[-1],[[k,re.sub(r'\s+',' ',v.strip())] for k,v in sorted(e.attrib.items()) if k in attrs],[canon(c) for c in e]]
identity=[]
anchors=json.loads((snap/'anchors.json').read_text(encoding='utf8'));outside=[]
for slug,row in new.items():
 b=(snap/row['file']).read_bytes();root=ET.fromstring(b)
 signature=json.dumps([canon(c) for c in root],ensure_ascii=False,separators=(',',':'))
 entry={'slug':slug,'newViewBox':row['viewBox'],'newSignatureSHA':sha(signature.encode()),'newSourceLF_SHA':sha(b.replace(b'\r\n',b'\n'))}
 if slug in oldreg:entry.update(oldViewBox=oldreg[slug]['viewBox'],oldSignatureSHA=sha(oldreg[slug]['signature'].encode()),signatureMatches=signature==oldreg[slug]['signature'],viewBoxMatches=row['viewBox']==oldreg[slug]['viewBox'])
 identity.append(entry)
 for kind,pt in anchors.get(slug,{}).items():
  if not isinstance(pt,list) or len(pt)!=2 or any(type(v)not in (int,float) or not math.isfinite(v) for v in pt):outside.append({'slug':slug,'kind':kind,'invalid':pt})
  elif not(0<=pt[0]<=row['viewBox'][0] and 0<=pt[1]<=row['viewBox'][1]):outside.append({'slug':slug,'kind':kind,'point':pt,'viewBox':row['viewBox']})
# Current ROOT code only. SourceD assets are inert QA data, never imported code.
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import figure_assets,scene_assets,render_spec
from core.figure_quality import sanitize_svg
figure_assets.ASSET_DIR=str(snap);figure_assets._manifest_cache=None;figure_assets._body_cache={};scene_assets._anchor_cache=None;scene_assets._picture_cache=None
load=[];render=[]
for slug,row in sorted(new.items()):
 try:
  w,h,body=figure_assets._asset_body(slug);clean=sanitize_svg(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{body}</svg>');load.append({'slug':slug,'ok':True,'sanitizedSHA':sha(clean.encode())})
 except Exception as e:load.append({'slug':slug,'ok':False,'error':str(e)})
 spec={'version':'elem-1','kind':'assetScene','items':[{'asset':slug,'x':40,'y':40,'w':60}],'canvas':[180,180]}
 try:
  output=render_spec.render_json(json.dumps(spec,ensure_ascii=False));output=output if isinstance(output,str)else json.dumps(output,ensure_ascii=False,sort_keys=True);render.append({'slug':slug,'ok':True,'outputSHA':sha(output.encode())})
 except Exception as e:render.append({'slug':slug,'ok':False,'error':str(e)})
picture=json.loads((snap/'picture-assets.json').read_text(encoding='utf8'))['picture'];native=[]
for slug in picture+['can','dice','bowl']:
 spec={'version':2,'points':{'A':[100,100],'B':[100,30]},'segments':{'AB':['A','B']},'labels':{'A':'A','B':'B'},'assets':[{'asset':slug,'at':'A','anchor':'center','width':40}]}
 try:
  output=render_spec.render_json(json.dumps(spec,ensure_ascii=False));native.append({'slug':slug,'accepted':True,'outputSHA':sha(str(output).encode())})
 except Exception as e:native.append({'slug':slug,'accepted':False,'error':str(e)})
# Metadata-only old six expected files, not a rerun and never replace old expected.
export=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/engine-all-sync-20261021-r1/source-export'
six=[]
for f in sorted((export/'engine-check/expected').glob('*.json')):
 p='docs/export/todays-math/engine-check/expected/'+f.name
 try:b=git('show',f'{REV}:{p}')
 except subprocess.CalledProcessError:continue
 old=f.read_bytes();six.append({'name':f.name,'savedBytes':len(old),'commitBytes':len(b),'savedRawSHA':sha(old),'commitRawSHA':sha(b),'rawSame':old==b,'LFNormalizedSame':old.replace(b'\r\n',b'\n')==b.replace(b'\r\n',b'\n')})
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__).read_bytes()) for n,m in sys.modules.copy().items() if getattr(m,'__file__',None) and (n.startswith('core.') or n in ['figure_assets','scene_assets','render_spec'])}
after={p:sha(Path(p).read_bytes()) for p in before};da={p:sha(Path(p).read_bytes()) for p in currentD};assert before==after and currentD==da;assert git('status','--short').decode('utf8')==status
result={'sourceCommit':REV,'sourceStatus':status,'sourceClean':not bool(status),'diffPaths51':changed,'assetCount':len(new),'oldRegistryCount':len(oldreg),'newSlugs':sorted(set(new)-set(oldreg)),'pictureAllowed':picture,'identity':identity,'anchorsOutsideViewBox':outside,'actualRootLoaderSanitize':load,'actualRootElementaryRender':render,'actualRootNativePictureRenderAndSolidRejections':native,'sixExpectedMetadataNotRuntime':six,'actualRootImportClosure':closure,'unchangedAfter':True}
dump('own-results.json',result);dump('own-after.json',{'root':after,'sourceWorkingTree':da})
print(json.dumps({'assets':len(new),'loadPass':sum(x['ok']for x in load),'renderPass':sum(x['ok']for x in render),'legacySignatureMatches':sum(x.get('signatureMatches',False)for x in identity),'anchorOutside':len(outside),'nativeAccepted':sum(x['accepted']for x in native),'six':len(six)}))
