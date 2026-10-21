from pathlib import Path
import sys,json,hashlib,copy,re,math,xml.etree.ElementTree as ET
from fractions import Fraction as F
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');A=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-grid-20261022-r1'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
dump=lambda n,v:(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 scatter grid actual Python probe\n',encoding='utf8')
j=json.loads((A/'actual-current.json').read_text(encoding='utf8'));fixture=R/'src/__tests__/fixtures/m3Scatter-native-default-20261022.json';old=json.loads(fixture.read_text(encoding='utf8'))
files=[R/p for p in j['sourceSHA256']]+[A/'actual-current.json',fixture]+[A/r['file'] for r in j['rows']]
before={str(p):sha(p)for p in files};dump('own-before.json',before)
for p,h in j['sourceSHA256'].items():assert sha(R/p)==h
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
from elementary import render_elementary
from core.figure_quality import sanitize_svg
tag=lambda n:n.tag.rsplit('}',1)[-1]
def inspect(svg,s):
 root=ET.fromstring(svg);g=[n for n in root if 'data-grid'in n.attrib];assert len(g)==1 and root[0] is g[0];g=g[0];assert len(g)==1 and tag(g[0])=='path' and 'transform'not in g.attrib
 vals=[F(v)for v in g.get('data-grid').split()];assert len(vals)==6
 x,y,cx,cy,nx,ny=vals;assert cx==cy and cx>0 and nx.denominator==ny.denominator==1
 assert nx==F(s['xMax']-s['xMin'],s['gridStep'])and ny==F(s['yMax']-s['yMin'],s['gridStep'])
 # Parse the actual restricted M x y V/H endpoint path, not pixels.
 commands=re.findall(r'M(-?[\d.]+) (-?[\d.]+)([VH])(-?[\d.]+)',g[0].get('d'));assert len(commands)==int(nx+ny+2)
 expected=[(x+i*cx,y,'V',y+ny*cy)for i in range(int(nx)+1)]+[(x,y+i*cy,'H',x+nx*cx)for i in range(int(ny)+1)]
 assert [(F(a),F(b),c,F(d))for a,b,c,d in commands]==expected
 disks=[(F(n.get('cx')),F(n.get('cy')),F(n.get('r')))for n in root if tag(n)=='circle']
 wanted=[(x+F(a-s['xMin'],s['gridStep'])*cx,y+ny*cy-F(b-s['yMin'],s['gridStep'])*cy)for a,b in s['points']]
 assert [(a,b)for a,b,r in disks]==wanted
 return root,vals,disks
records=[]
for row in j['rows']:
 s=copy.deepcopy(row['spec']);original=copy.deepcopy(s);svg=render_elementary(s);assert s==original
 root,grid,disks=inspect(svg,s);public=(A/row['file']).read_text(encoding='utf8');assert sha(A/row['file'])==row['svgSHA256'];pub,pg,pd=inspect(public,s);assert pg==grid and pd==disks
 clean=sanitize_svg(svg);inspect(clean,s)
 numbers=[n for n in root if tag(n)=='text' and re.fullmatch(r'-?\d+',n.text or '')]
 expected=[str(v)for v in range(s['xMin'],s['xMax']+1,s['xStep'])]+[str(v)for v in range(s['yMin'],s['yMax']+1,s['yStep'])]
 assert [n.text for n in numbers]==expected
 boxes=[];unknown=[]
 for n in pub.iter():
  if 'data-label'not in n.attrib:continue
  a=n.attrib;xx=float(a['data-x']);base=float(a['data-base']);w=float(a['data-w']);asc=float(a['data-a']);desc=float(a['data-d']);anchor=a['data-anchor'];left=xx-w/2 if anchor=='middle'else xx-w if anchor=='end'else xx
  boxes.append((a['data-label'],(left,base-asc,left+w,base+desc)))
 unknown=[l['text']for l in row['labels']if l['width'] is None]
 overlaps=[];hits=[];clips=[];vx,vy,vw,vh=map(float,pub.get('viewBox').split())
 for i,(label,b)in enumerate(boxes):
  l,t,r,bot=b
  if l<vx or t<vy or r>vx+vw or bot>vy+vh:clips.append(label)
  for name,c in boxes[i+1:]:
   if min(r,c[2])>max(l,c[0])and min(bot,c[3])>max(t,c[1]):overlaps.append([label,name])
  for di,(xx,yy,rad)in enumerate(disks):
   if math.hypot(max(l-float(xx),0,float(xx)-r),max(t-float(yy),0,float(yy)-bot))<float(rad):hits.append([label,di])
 records.append({'id':row['id'],'ownSVG_SHA256':hashlib.sha256(svg.encode()).hexdigest(),'publicSVG_SHA256':row['svgSHA256'],'grid':list(map(str,grid)),'pointCount':len(disks),'majorLabels':expected,'numericBoxes':boxes,'numericOverlaps':overlaps,'numericPointHits':hits,'numericClips':clips,'unknownCJKMetrics':unknown,'inputUnchanged':s==original})
defaults=[]
for row in old['rows']:
 s=copy.deepcopy(row['spec']);out=render_elementary(s);assert s==row['spec'];defaults.append({'key':row['key'],'exactBytes':out==row['svg'],'SHA256':hashlib.sha256(out.encode()).hexdigest()})
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__))for m in list(sys.modules.values())if getattr(m,'__file__',None)and str(R).lower()in str(Path(m.__file__).resolve()).lower()}
after={p:sha(Path(p))for p in before};assert before==after;dump('own-after.json',after);dump('own-import-closure.json',closure)
report={'scope':'Current six technical scatter specs: independent actual Root Python rendering and supplied public SVG geometry/MathJax metadata analysis','ownPythonRenders':len(records),'defaultFixtureRenders':len(defaults),'records':records,'defaultBytes':defaults,'sourceUnchanged':True,'parentActualPublicSVGsAnalyzed':6,'ownPublicAPIorMathJaxExecutions':0,'failures':{'numericOverlaps':sum(len(r['numericOverlaps'])for r in records),'numericPointHits':sum(len(r['numericPointHits'])for r in records),'numericClips':sum(len(r['numericClips'])for r in records),'defaultByteMismatches':sum(not r['exactBytes']for r in defaults)},'limits':['CJK font metrics are null and remain unknown; no inferred measured clearance for CJK/title.','MathJax numeric boxes are derived from actual SVG metadata, not own typesetting; parent rows are not own public API runs.','Square serialized cells and rational point readback do not prove student method/grade/rights/native/full print approval.','No pixel oracle, no questions authored, no data mutation, Node/browser/API/model/DB0.','Closure hashes recorded after import; initial supplied source inventory bound before first import.']}
dump('own-report.json',report);print(json.dumps({'renders':len(records),'defaults':len(defaults),'failures':report['failures'],'reportSHA256':sha(P/'own-report.json')}))
