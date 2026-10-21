"""Exact six-case bytes plus all 39 actual asset renders/rasters; QA, never question approval."""
from pathlib import Path
import ctypes,datetime,hashlib,importlib.util,io,json,os,subprocess,sys,xml.etree.ElementTree as ET
out=Path(__file__).resolve().parent
class M(ctypes.Structure):
 _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
memory=dict(availableGiB=m.availPhys/1024**3,minimumGiB=.5,NodeOrBrowser=False)
(out/'asset-memory-r1.json').write_bytes((json.dumps(memory)+'\n').encode('utf-8'))
print(json.dumps(memory),flush=True)
if m.availPhys<.5*1024**3:raise SystemExit(75)
from PIL import Image,ImageDraw
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
checker=out/'source-export/engine-check/check_engine.py'
spec=importlib.util.spec_from_file_location('owned_checker',checker);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
rows=[]
for name,case in module.CASES.items():
 r=subprocess.run([sys.executable,'-B','scripts/figure/render_spec.py'],input=json.dumps(case).encode('utf-8'),capture_output=True,env=env,timeout=30)
 expected=(checker.parent/'expected'/f'{name}.json').read_bytes()
 actual=out/'actual-six'/f'{name}.json';actual.parent.mkdir(exist_ok=True);actual.write_bytes(r.stdout)
 assert r.returncode==0 and not r.stderr and r.stdout==expected,name
 payload=json.loads(r.stdout);assert ('error' in payload)==name.endswith('refused')
 rows.append(dict(name=name,byteIdentical=True,expectedSHA256=hashlib.sha256(expected).hexdigest(),actualSHA256=sha(actual)))
sys.path[:0]=[str(Path('scripts/figure').resolve()),str(Path('vendor/figure-engine').resolve())]
from render_spec import render_json
from figure_assets import list_assets
from core.figure_svg import svg_to_png_bytes
assets=sorted(list_assets(),key=lambda a:a['slug']);assert len(assets)==39
gallery=Image.new('RGB',(280*6,200*7),'white');draw=ImageDraw.Draw(gallery)
renders=out/'asset-renders';renders.mkdir(exist_ok=True)
asset_rows=[]
for i,a in enumerate(assets):
 w,h=map(float,a['viewBox']);aw=100.;ah=aw*h/w
 payload=render_json(json.dumps(dict(version='elem-1',kind='assetScene',items=[dict(asset=a['slug'],x=10,y=10,w=aw)],canvas=[max(40,min(480,aw+20)),max(30,min(360,ah+20))])))
 assert 'svg' in payload,(a['slug'],payload)
 svg=payload['svg'];ET.fromstring(svg)
 sp=renders/(a['slug']+'.svg');sp.write_bytes(svg.encode('utf-8'))
 png=svg_to_png_bytes(svg,200);assert png and png.startswith(b'\x89PNG'),a['slug']
 pp=renders/(a['slug']+'.png');pp.write_bytes(png)
 im=Image.open(io.BytesIO(png)).convert('RGBA');im.thumbnail((250,165))
 x,y=(i%6)*280,(i//6)*200;gallery.paste(im,(x+(280-im.width)//2,y+24),im);draw.text((x+8,y+5),a['slug'],fill='black')
 asset_rows.append(dict(slug=a['slug'],svgSHA256=sha(sp),pngSHA256=sha(pp),assetFileSHA256=sha(Path('scripts/figure/assets')/a['file']),
  sourceIdentity='imported project asset at captured sourceHead; not an original exam crop',rights='UNKNOWN_REQUIRES_REVIEW',gradeApproval=False))
gallery.save(out/'asset-contact-sheet.png')
report=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),six=rows,exactByteMatches=6,assets=asset_rows,actualAssetRenders=39,actualRasterizations=39,
 contactSheetSHA256=sha(out/'asset-contact-sheet.png'),sourceDWrites=0,dbWrites=0,newQuestionOrApprovedFigureCredits=0,pixelMathOracle=False)
(out/'bytes-and-assets-r1.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(byteIdentical=6,actualAssetRenders=39,rasterizations=39,questionApproval=0)))
