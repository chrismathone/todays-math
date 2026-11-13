from asset_store import AssetStore
"""Independent actual final-SVG checks for every enlarged partial triangle.
Compare rendered overview points and rendered detail strokes, allowing only
three-decimal coordinate serialization, without solver-answer values.
"""
import gzip,json,re,math,xml.etree.ElementTree as ET,collections
from pathlib import Path
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
def read(n):return json.load(gzip.open(out/n))
manifest=read('manifest.json.gz');assets=AssetStore(out);proof={r['id']:r for r in read('engine-proof.json.gz')};bad=[];checked=0;families=collections.Counter();font_min=[];caption_min=[];orientations=collections.Counter()
def tag(n):return n.tag.split('}')[-1]
def vector(a,b):return (b[0]-a[0],b[1]-a[1])
def parallel(u,v):
 cross=u[0]*v[1]-u[1]*v[0]
 # Each rendered coordinate is rounded ±.0005; each vector component ±.001.
 bound=.001*(abs(u[0])+abs(u[1])+abs(v[0])+abs(v[1]))+.0000021
 return abs(cross)<=bound and u[0]*v[0]+u[1]*v[1]>0
for row in manifest['rows']:
 p=proof.get(row['id'])
 if not p or not p.get('detail'):continue
 errors=[];svg=assets[row['display']];root=ET.fromstring(svg);points={}
 for n in root.iter():
  name=n.attrib.get('data-mj')
  if name and name in 'ABC' and len(name)==1 and 'data-px' in n.attrib:points[name]=(float(n.attrib['data-px']),float(n.attrib['data-py']))
 if len(points)!=3:errors.append('overview point ownership incomplete')
 else:
  pair=p['detail']['pair'];nearest=min(('AB','AC','BC'),key=lambda k:math.dist(points[k[0]],points[k[1]]))
  if pair!=nearest:errors.append('detail does not show closest actual vertices')
  views=[n for n in root if tag(n)=='g' and n.attrib.get('transform','').startswith('translate(')]
  if len(views)!=2:errors.append('two explicit views missing')
  else:
   detail=views[1];groups=[n for n in detail if tag(n)=='g'];lines=[n for n in groups[0] if tag(n)=='line'] if groups else []
   segments=list(p['detail']['spec']['segments'].values());specpoints=p['detail']['spec']['points']
   if len(lines)!=len(segments):errors.append('detail segment count mismatch')
   else:
    owned={};translation=None
    for line,seg in zip(lines,segments):
     a,b=seg['points'];A=(float(line.attrib['x1']),float(line.attrib['y1']));B=(float(line.attrib['x2']),float(line.attrib['y2']));owned[a]=A;owned[b]=B
     translation=translation or (A[0]-specpoints[a][0],A[1]-specpoints[a][1])
     for k,q in [(a,A),(b,B)]:
      if any(abs(q[j]-specpoints[k][j]-translation[j])>.0011 for j in (0,1)):errors.append('rendered detail geometry differs from engine spec')
    if not parallel(vector(points[pair[0]],points[pair[1]]),vector(owned[pair[0]],owned[pair[1]])):errors.append('short side is rotated/deformed')
    zoom=math.dist(owned[pair[0]],owned[pair[1]])/math.dist(points[pair[0]],points[pair[1]]);far=next(k for k in points if k not in pair)
    for k,inner,outer in zip(pair,'UV','XY'):
     if not parallel(vector(points[k],points[far]),vector(owned[k],owned[inner])):errors.append('cropped ray direction changed')
     if math.dist(owned[k],owned[outer])>=math.dist(points[k],points[far])*zoom-.01:errors.append('detail extends beyond original edge')
   if any('data-px' in n.attrib for n in detail.iter()):errors.append('detail overrides full-triangle ownership')
 if '부근 확대' not in svg or '긴 변은 일부만 표시' not in svg:errors.append('partial-view explanation absent')
 native=[n.attrib['data-mj'] for n in root.iter() if tag(n)=='text' and n.attrib.get('data-mj')]
 if native!=['전체 그림', '·'.join(p['detail']['pair'])+' 부근 확대', '긴 변은 일부만 표시']:errors.append('untypeset label outside the two explicit Korean captions')
 W,H=[float(x) for x in root.attrib['viewBox'].split()][2:];scale=280/max(W,H)
 sizes=[float(n.attrib['data-fs'])*scale for n in root.iter() if 'data-label' in n.attrib and 'data-fs' in n.attrib]
 if sizes:font_min.append((min(sizes),row['id']))
 captions=[float(n.attrib['font-size'])*scale for n in root if tag(n)=='text']
 if captions:caption_min.append((min(captions),row['id']))
 orientations['horizontal' if len(views)==2 and not views[1].attrib['transform'].startswith('translate(0 ') and not views[1].attrib['transform'].startswith('translate(0.000 ') else 'vertical']+=1
 if errors:bad.append({'id':row['id'],'errors':sorted(set(errors))})
 checked+=1;families[row['family']]+=1
result={'actualFinalSVGsChecked':checked,'families':dict(families),'failures':bad,'minimumNominalMathFontCSSPx':min(font_min) if font_min else None,'nominalMathFontsBelow10CSSPx':[{'id':id,'px':px} for px,id in font_min if px<10],'coordinateRounding':.0005,'fontMetric':'Nominal data-fs or font-size times actual280px/max-viewBox scale, not glyph ink height or a universal readability guarantee','minimumNominalCaptionFontCSSPx':min(caption_min),'orientations':dict(orientations)}
(out/'detail-invariants.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({'checked':checked,'failed':len(bad),'minimumFont':result['minimumNominalMathFontCSSPx']});raise SystemExit(bool(bad))
