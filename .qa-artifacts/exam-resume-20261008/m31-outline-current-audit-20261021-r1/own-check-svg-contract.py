from pathlib import Path
import xml.etree.ElementTree as ET,json,hashlib,itertools
P=Path(__file__).resolve().parent;read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();r=read(P/'own-render-results.json');checks=[];rows=[]
def ck(n,v):checks.append({'name':n,'pass':bool(v)})
for row in r['result']:
 n=row['n'];ck(f'n{n}/strictRender',row['ok'] and row['droppedDimensions']==[])
 if not row['ok']:continue
 sp=P/f'own-rendered/n{n}.spec.json';sv=P/f'own-rendered/n{n}.svg';ck(f'n{n}/hashBinding',sha(sp)==row['specSHA256'] and sha(sv)==row['svgSHA256']);svg=ET.parse(sv).getroot();vx,vy,vw,vh=map(float,svg.attrib['viewBox'].split());labels=[x for x in svg.iter() if 'data-label'in x.attrib];names=[chr(65+i) for i in range(n)];ck(f'n{n}/allLabelsExactlyOnce',sorted(x.attrib['data-label'] for x in labels)==names)
 boxes=[];points={}
 for g in labels:
  a=g.attrib;x=float(a['data-x']);y=float(a['data-base']);w=float(a['data-w']);asc=float(a['data-a']);desc=float(a['data-d']);fs=float(a['data-fs']);box=[x-w/2,y-asc,x+w/2,y+desc];boxes.append({'label':a['data-label'],'box':box,'fontSize':fs});points[a['data-label']]=(float(a['data-px']),float(a['data-py']))
 ck(f'n{n}/labelBoxesInViewport',all(b['fontSize']>0 and b['box'][0]>=vx-0.002 and b['box'][1]>=vy-0.002 and b['box'][2]<=vx+vw+0.002 and b['box'][3]<=vy+vh+0.002 for b in boxes))
 overlaps=[]
 for a,b in itertools.combinations(boxes,2):
  aa=a['box'];bb=b['box'];overlap=min(aa[2],bb[2])-max(aa[0],bb[0])>0 and min(aa[3],bb[3])-max(aa[1],bb[1])>0
  if overlap:overlaps.append([a['label'],b['label']])
 ck(f'n{n}/labelBoxesDisjoint',not overlaps)
 lines=[x for x in svg.iter() if x.tag.split('}')[-1]=='line'];expected={frozenset((names[i],names[(i+1)%n])) for i in range(n)};edges=[]
 for line in lines:
  ends=[(float(line.attrib[f'x{i}']),float(line.attrib[f'y{i}'])) for i in [1,2]];mapped=[]
  for e in ends:
   near=[key for key,p in points.items() if abs(p[0]-e[0])<=0.002 and abs(p[1]-e[1])<=0.002];mapped.append(near[0] if len(near)==1 else '?')
  edges.append(mapped)
 ck(f'n{n}/renderedBoundaryNoInternalFan',len(lines)==n and {frozenset(e) for e in edges}==expected)
 ck(f'n{n}/noUnresolvedOrUnsafeMarkup',not any(x.tag.split('}')[-1] in ['text','script','image','foreignObject'] for x in svg.iter()) and not any('data-mj'in x.attrib for x in svg.iter()))
 rows.append({'n':n,'specSHA256':sha(sp),'svgSHA256':sha(sv),'viewBox':[vx,vy,vw,vh],'labelBoxes':boxes,'overlapPairs':overlaps,'renderedEdges':edges})
ck('exact8SequentialRenders',len(r['result'])==8 and all(x['ok'] for x in r['result']));ck('heapAndCalls',r['heapLimit']<=256*1024**2 and r['DBImports']==0 and r['networkCalls']==0)
out={'counts':{'figures':8,'assertions':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks)},'checks':checks,'figures':rows,'limits':'SVGcontract only: labels/metricboxes/viewport/edgeincidence, no browser/pixelmath/nativeprint/physicalsize or comprehensive readability approval. Glyph outlines notusedasmathoracle.'};(P/'own-svg-contract-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'counts':out['counts'],'failures':[x for x in checks if not x['pass']]}));assert all(x['pass'] for x in checks)
