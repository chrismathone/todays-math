"""Compile finite arithmetic display plans with the existing FigureScene engine.
No second renderer, runtime Python/network, frozen asset edits or answer labels.
All rejected dimensions retain their exact public value in a named text line.
"""
from pathlib import Path
import sys,json,math,re,hashlib,base64,zlib,collections,inspect,copy,html
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'vendor/figure-engine'))
from core.figure_scene import compile_figure_spec, StyleProfile
from core.figure_quality import sanitize_svg

LABEL_METRICS=json.loads(Path("/tmp/arithmetic-figure-quality/label-metrics.json").read_text())

def scene_spec(row):
 plan=row['plan'];m=plan['model'];raw=m['points']
 xs=[p[0] for p in raw.values()];ys=[p[1] for p in raw.values()]
 # A compound figure reserves space for two independently readable views.
 # Only geometry is uniformly scaled; measured type and collision rules stay
 # at the authoritative engine sizes. This is a shared view budget, not a
 # question-specific coordinate adjustment.
 budget=.65 if row.get('detailOnly') else 1
 scale=budget*min(200/(max(xs)-min(xs)),170/(max(ys)-min(ys)))
 points={k:[p[0]*scale,-p[1]*scale] for k,p in raw.items()}
 segments={k:{'points':list(k),**({'dash':'4 3'} if k in m.get('dashed',[]) else {})} for k in m['edges']}
 if row['key']=='trapezoid-diagonal-midpoints':
  # P/Q are declared midpoints, not deductions. Separate tick groups encode
  # AP=PC and BQ=QD without suggesting the diagonals equal one another.
  segments.pop('AC');segments.pop('BD')
  m={**m,'equal':[['AP','PC'],['BQ','QD']]}
 for i,group in enumerate(m.get('equal',[])):
  for k in group:segments.setdefault(k,{'points':list(k)})['ticks']=i+1
 for i,group in enumerate(m.get('parallel',[])):
  u=[points[group[0][1]][j]-points[group[0][0]][j] for j in (0,1)]
  for k in group:
   ends=list(k);v=[points[ends[1]][j]-points[ends[0]][j] for j in (0,1)]
   if sum(u[j]*v[j] for j in (0,1))<0:ends.reverse()
   segments.setdefault(k,{'points':list(k)}).update(points=ends,parallel=i+1)
 angles={k:{'vertex':k[1],'points':[k[0],k[2]],'right':True} for k in m.get('right',[])}
 for k in m.get('arcs',[]):angles.setdefault(k,{'vertex':k[1],'points':[k[0],k[2]]})
 dimensions={}
 for given in [*plan['givens'],*([plan['target']] if plan.get('target') and plan['target'].get('dimension',True) else [])]:
  k=given['key']
  if given['kind']=='angle':
   angles.setdefault(k,{'vertex':k[1],'points':[k[0],k[2]]})['label']=given['text']
  else:dimensions['dim'+k]={'points':list(k),'label':given['text']+' cm','inset':min(3,math.dist(points[k[0]],points[k[1]])/4)}
 target=plan.get('target')
 if target and target['kind']=='segment':
  k=target['key']; segments.setdefault(k,{'points':list(k)})
 circles={f'c{i}':{'center':c['center'],'radius':c['radius']*scale} for i,c in enumerate(m.get('circles',[]))}
 point_labels=m.get('labels',{k:k for k in points})
 labels=set(point_labels.values())|{d['label'] for d in dimensions.values()}|{a['label'] for a in angles.values() if a.get('label')}
 return {'version':2,'label_metrics':{k:LABEL_METRICS[k] for k in labels},'points':points,'segments':segments,'angles':angles,'dimensions':dimensions,'circles':circles,'labels':point_labels,'style':{'clear_angle_labels':True}}

def dimension_candidates(spec):
 # Shared engine options, never altered geometry, smaller type or ignored ink.
 yield copy.deepcopy(spec), {'kind':'default'}
 for offset,inset_fraction in ((1,0),(5,0),(14,0),(1,.1),(5,.1),(14,.1)):
  candidate=copy.deepcopy(spec)
  for d in candidate['dimensions'].values():
   a,b=[candidate['points'][k] for k in d['points']]
   d['offset']=offset;d['inset']=math.dist(a,b)*inset_fraction
  yield candidate, {'kind':'engine-dimension-options','offset':offset,'insetFraction':inset_fraction}

def normalize_labels(svg):
 def plain(m):
  attrs=m[1];label=re.search(r'data-mj="([^"]*)"',attrs)
  if not label:return m[0]
  attrs=re.sub(r' font-style="italic"','',attrs)
  return '<text'+attrs+'>'+html.escape(html.unescape(label[1]))+'</text>'
 return re.sub(r'<text\b([^>]*)>.*?</text>',plain,svg,flags=re.S)

def compile_base(row):
 original=scene_spec(row);attempts=[];choices=[]
 for candidate,rule in dimension_candidates(original):
  candidate_residual=[];candidate_refusals=[]
  while True:
   try:
    scene=compile_figure_spec(copy.deepcopy(candidate));resolved=scene.resolve()
    attempts.append({**rule,'success':True,'residual':candidate_residual})
    choices.append((len(candidate_residual),len(choices),scene,resolved,candidate,candidate_residual,candidate_refusals))
    break
   except Exception as exc:
    match=re.match(r"dimension '([^']+)' has no collision-free layout",str(exc))
    if not match or match[1] not in candidate['dimensions']:raise
    key=match[1];d=candidate['dimensions'].pop(key)
    candidate_residual.append(''.join(d['points'])+'='+d['label'])
    candidate_refusals.append(str(exc));attempts.append({**rule,'failure':str(exc)})
  # The earliest complete layout wins. Otherwise minimize truly absent
  # dimensions across all shared engine settings; never count failed tries as
  # final omissions or greedily drop a default failure that another option fits.
  if not candidate_residual:break
 _,_,scene,resolved,spec,residual,refusals=min(choices,key=lambda c:c[:2])
 scene.resolve=lambda:resolved;svg=scene.render_svg()
 target=row['plan'].get('target')
 if target and target['kind']=='segment':
  k=target['key'];tx,ty=resolved.translation;a,b=[scene.points[c] for c in k]
  def highlight(match):
   tag=match[0];v=[float(re.search(fr'{n}=\"([^\"]+)\"',tag)[1]) for n in ('x1','y1','x2','y2')]
   if all(abs(x-y)<0.002 for x,y in zip(v,[a.x+tx,a.y+ty,b.x+tx,b.y+ty])) or all(abs(x-y)<0.002 for x,y in zip(v,[b.x+tx,b.y+ty,a.x+tx,a.y+ty])):
    return tag.replace('stroke-width=\"1.9\"','stroke-width=\"2.6\"')
   return tag
  svg=re.sub(r'<line\b[^>]+/>',highlight,svg)
 svg=sanitize_svg(normalize_labels(svg))
 # Metadata for independent endpoint/glyph checks, not renderer instructions.
 proof={'id':row['id'],'dimensions':{k:{'points':d['points'],'label':d['label'],'font':resolved.dimension_layouts[k].font_size} for k,d in spec['dimensions'].items()},'residual':residual,'refusals':refusals,'initialDimensions':original['dimensions'],'attempts':attempts,'spec':spec,'displaySha256':hashlib.sha256(svg.encode()).hexdigest()}
 return svg,residual,proof

def triangle_detail_plan(row):
 m=row['plan']['model'];p=m['points']
 if set(p)!={'A','B','C'} or row.get('detailOnly'):return None
 scale=min(200/(max(v[0] for v in p.values())-min(v[0] for v in p.values())),170/(max(v[1] for v in p.values())-min(v[1] for v in p.values())))
 pair=min(('AB','AC','BC'),key=lambda k:math.dist(p[k[0]],p[k[1]]))
 length=math.dist(p[pair[0]],p[pair[1]])
 if length*scale>=StyleProfile().angle_radius:return None
 far=next(k for k in p if k not in pair);zoom=72/length
 mid=[sum(p[k][j] for k in pair)/2 for j in (0,1)]
 points={k:[(p[k][j]-mid[j])*zoom for j in (0,1)] for k in pair}
 edges=[pair];dashed=[];rays={}
 for k,inner,outer in zip(pair,'UV','XY'):
  direction=[p[far][j]-p[k][j] for j in (0,1)];n=math.hypot(*direction)
  points[inner]=[points[k][j]+direction[j]/n*98 for j in (0,1)]
  points[outer]=[points[k][j]+direction[j]/n*110 for j in (0,1)]
  edges.extend([k+inner,inner+outer]);dashed.append(inner+outer);rays[k]=inner
 def angles(keys):
  return [''.join(rays[k[1]] if c==far else c for c in k) for k in keys if k[1] in pair]
 model={'points':points,'edges':edges,'dashed':dashed,'labels':{k:k for k in pair},'right':angles(m.get('right',[])),'arcs':angles(m.get('arcs',[]))}
 short=lambda g:g.get('kind')=='segment' and set(g['key'])==set(pair)
 detail={**row,'detailOnly':True,'plan':{**row['plan'],'model':model,'givens':[g for g in row['plan']['givens'] if short(g)],'target':row['plan'].get('target') if row['plan'].get('target') and short(row['plan']['target']) else None}}
 overview=copy.deepcopy(row);overview['detailOnly']=True
 overview['plan']['givens']=[g for g in row['plan']['givens'] if not short(g)]
 # An angle arc at a crowded endpoint can extend beyond its short ray. The
 # same angle is drawn at readable scale in the detail; do not leave a false
 # oversized arc on the exact overview. Right marks already fit their rays.
 overview['plan']['model']['arcs']=[k for k in m.get('arcs',[]) if k[1] not in pair]
 if overview['plan'].get('target') and short(overview['plan']['target']):overview['plan']['target']['dimension']=False
 return overview,detail,pair,zoom

def compose_detail(overview,detail,pair):
 def unpack(svg):
  box=[float(x) for x in re.search(r'viewBox="([^"]+)"',svg)[1].split()]
  return box[2],box[3],svg[svg.index('>')+1:svg.rfind('</svg>')]
 w,h,body=unpack(overview);dw,dh,dbody=unpack(detail)
 # Compare real engine-resolved bounds. Keep both views unscaled here; tall
 # triangles use side-by-side panels, flat triangles use stacked panels.
 # Each caption line has a reserved area and stays outside geometry bounds.
 vertical=(max(w,dw,170),24+h+48+dh+8)
 horizontal=(w+16+max(dw,170),40+max(h,dh)+8)
 side=max(horizontal)<max(vertical)
 W,H=horizontal if side else vertical
 oy=40 if side else 24;dx=w+16 if side else 0;dy=40 if side else 24+h+48
 # Only overview metadata owns full-triangle points, in global SVG space.
 dbody=re.sub(r' data-p[xy]="[^"]*"','',dbody)
 body=re.sub(r'data-py="([^"]*)"',lambda m:f'data-py="{float(m[1])+oy:.3f}"',body)
 caption=lambda x,y,t:f'<text x="{x:.3f}" y="{y:.3f}" font-family="Arial, sans-serif" font-size="14" fill="#111111">{t}</text>'
 labels=caption(12,18,'전체 그림')+caption(dx+12,18 if side else dy-30,f'{pair[0]}·{pair[1]} 부근 확대')+caption(dx+12,34 if side else dy-14,'긴 변은 일부만 표시')
 return sanitize_svg(f'<svg viewBox="0 0 {W:.3f} {H:.3f}"><rect width="{W:.3f}" height="{H:.3f}" fill="white"/>'+labels+f'<g transform="translate(0 {oy})">{body}</g>'+f'<g transform="translate({dx:.3f} {dy:.3f})">{dbody}</g></svg>')

def compile_row(row):
 detail=triangle_detail_plan(row)
 if detail is None:return compile_base(row)
 overview,close,pair,zoom=detail
 svg,lines,proof=compile_base(overview);dsvg,dlines,dproof=compile_base(close)
 combined=compose_detail(svg,dsvg,pair)
 initial=scene_spec(row)['dimensions']
 proof.update(initialDimensions=initial,dimensions={**proof['dimensions'],**dproof['dimensions']},residual=list(dict.fromkeys(lines+dlines)),refusals=proof['refusals']+dproof['refusals'],displaySha256=hashlib.sha256(combined.encode()).hexdigest(),detail={'pair':pair,'zoom':zoom,'spec':dproof['spec'],'dimensions':dproof['dimensions'],'attempts':dproof['attempts'],'residual':dlines})
 return combined,proof['residual'],proof

def compiler_fingerprint():
 data=(inspect.getsource(scene_spec)+inspect.getsource(dimension_candidates)+inspect.getsource(normalize_labels)+inspect.getsource(compile_base)+inspect.getsource(triangle_detail_plan)+inspect.getsource(compose_detail)+inspect.getsource(compile_row)+json.dumps(LABEL_METRICS,sort_keys=True)).encode()
 for path in sorted((ROOT/'vendor/figure-engine/core').glob('*.py')):data+=path.read_bytes()
 return hashlib.sha256(data).hexdigest()

COMPILER_FINGERPRINT=compiler_fingerprint()

def work(row):
 signature=hashlib.sha256(json.dumps(row,sort_keys=True).encode()).hexdigest()
 cache=Path('/tmp/arithmetic-figure-quality/cache-v2');cache.mkdir(exist_ok=True)
 path=cache/(signature+'.json')
 if path.exists():
  previous=json.loads(path.read_text())
  if previous.get('compiler')==COMPILER_FINGERPRINT and 'error' not in previous:return previous
  if '--repack' in sys.argv:return {'id':row['id'],'error':'cached geometry provenance changed; run without --repack'}
 try:
  svg,lines,proof=compile_row(row);result={'id':row['id'],'family':row['family'],'canonical':row['canonical'],'svg':svg,'lines':lines,'proof':proof,'compiler':COMPILER_FINGERPRINT}
 except Exception as exc:result={'id':row['id'],'error':str(exc)}
 path.write_text(json.dumps(result,ensure_ascii=False));return result

def pack(value):return base64.b64encode(zlib.compress(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode(),9)[2:-4]).decode()
def inline_pack(values):
 chunks=[];index={};templates=[];template_index={}
 ordered=[]
 for row in values.values():
  # A lossless string codec, not an SVG renderer: preserve every engine byte.
  pieces=re.split(r'([+-]?\d+(?:\.\d+)?)',row[1]);literals=pieces[::2];numbers=pieces[1::2];key=tuple(literals)
  if key not in template_index:template_index[key]=len(templates);templates.append(literals)
  tid=template_index[key]
  assert ''.join(t+(numbers[i] if i<len(numbers) else '') for i,t in enumerate(literals))==row[1]
  ordered.append([row[0],tid,numbers,row[2]])
 for offset in range(0,len(ordered),64):
  chunk=ordered[offset:offset+64];ci=len(chunks)
  encoded=[json.dumps(row,ensure_ascii=False,separators=(',',':')) for row in chunk]
  raw='['+','.join(encoded)+']';chunks.append(base64.b64encode(zlib.compress(raw.encode(),9)[2:-4]).decode());position=1
  for row,serialized in zip(chunk,encoded):
   end=position+len(serialized.encode('utf-16-le'))//2;ref=[ci,position,end]
   h=2166136261
   units=row[0].encode('utf-16-le')
   for i in range(0,len(units),2):h=((h^int.from_bytes(units[i:i+2],'little'))*16777619)&0xffffffff
   key=format(h,'x');existing=index.get(key)
   if existing is None:index[key]=ref
   elif existing!=ref:index[key]=(existing if isinstance(existing[0],list) else [existing])+[ref]
   position=end+1
 return {'index':index,'chunks':chunks,'templates':templates}

if __name__=='__main__':
 import concurrent.futures
 inline='--inline' in sys.argv
 name='trig-' if inline else ''
 rows=[r for r in json.load(open('/tmp/arithmetic-figure-quality/'+('trig-models.json' if inline else 'models.json'))) if r.get('plan')]
 packs=collections.defaultdict(dict);proofs=[];failed=[]
 with concurrent.futures.ProcessPoolExecutor(max_workers=3) as pool:
  for i,result in enumerate(pool.map(work,rows,chunksize=5)):
   if 'error' in result:failed.append(result)
   else:
    rowkey=result['canonical'] if inline else result['id']
    packs[result['family']][rowkey]=[result['canonical'],result['svg'],result['lines']];proofs.append(result['proof'])
   if (i+1)%100==0:print(json.dumps({'processed':i+1,'total':len(rows),'failed':len(failed)}),flush=True)
 out={'version':1,'engine':'vendored FigureScene v2','families':{k:(inline_pack(v) if inline else pack(v)) for k,v in packs.items()}}
 Path('/tmp/arithmetic-figure-quality/'+name+'engine-proof.json').write_text(json.dumps(proofs,ensure_ascii=False))
 Path('/tmp/arithmetic-figure-quality/'+name+'engine-failures.json').write_text(json.dumps(failed,ensure_ascii=False))
 candidate=Path('/tmp/arithmetic-figure-quality/'+name+'engine-candidate.json');candidate.write_text(json.dumps(out,separators=(',',':'))+'\n')
 print(json.dumps({'compiled':len(proofs),'expected':len(rows),'families':len(packs),'failures':collections.Counter(f['error'] for f in failed),'dimensionRefusals':sum(len(p['refusals']) for p in proofs),'refusedIDs':sum(bool(p['refusals']) for p in proofs)},ensure_ascii=False),flush=True)
 if failed or len(proofs)!=len(rows):sys.exit(1)
 target=ROOT/'src/lib/arithmetic-v2/presentation'/('engine-inline-v1.json' if inline else 'engine-figures-v1.json')
 if target.exists() and json.loads(target.read_text())!=out:sys.exit('Released display assets are immutable: choose a new asset version rather than overwrite v1')
 temporary=target.with_suffix('.tmp');temporary.write_bytes(candidate.read_bytes());temporary.replace(target)
