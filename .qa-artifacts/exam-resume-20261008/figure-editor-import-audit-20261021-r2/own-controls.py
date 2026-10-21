from pathlib import Path
import sys,json,hashlib,copy,importlib.util,itertools,xml.etree.ElementTree as ET
from xml.sax.saxutils import escape as std
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');OLD=P.parent/'figure-editor-import-audit-20261021-r1'
paths=['vendor/figure-engine/core/'+x+'.py' for x in ['__init__','figure_quality','figure_svg','label_markup']]+['scripts/figure/'+x for x in ['graph_scene.py','graph_native.py','engine_path.py','test_grid.py','engine-catalog.json']]+['src/components/unified/figure-editor/'+x for x in ['figureGridMetadata.ts','figureGrid.ts','figureSvgEditing.ts','FigureGridPanel.tsx','FigureLabelInput.tsx','FigureEditor.tsx']]+['src/lib/dev-ai/figure-engine.ts','src/components/unified/draftStore.ts']
sha=lambda b:hashlib.sha256(b).hexdigest();before={x:sha((R/x).read_bytes()) for x in paths};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');probe=P/'own-command-write-probe.txt';probe.write_text('현재 Python 경계 재검사: 원문·좌표 보존\n',encoding='utf-8');assert '좌표' in probe.read_text(encoding='utf-8')
sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
from core.figure_quality import sanitize_svg,SvgSecurityError
from core.label_markup import escape
from graph_scene import render_graph
rows=[];fixtures=[]
def check(id,ok,details=None):rows.append({'id':id,'pass':bool(ok),'details':details})
for i,(s,e) in enumerate(itertools.product(['','abc','<>&','&amp;','"\'','한글\n<가>','x&#38;y','a>b<c'],[None,{}, {'"':'&quot;'}, {"'":'&apos;'}, {'x':'X','y':'Y'}])):check('escape-'+str(i),escape(s,e)==std(s,e or {}))
base={'version':'graph-1','xRange':[0,8],'yRange':[0,5],'axes':False,'grid':{'step':1},'segments':[{'from':[1,1],'to':[4,4],'arrow':True}]}
svg=render_graph(base);root=ET.fromstring(sanitize_svg(svg));g=root[0];data=g.attrib['data-grid'];path=ET.tostring(g[0],encoding='unicode');fixtures.append({'id':'actual-default-grid','spec':base,'svgSHA256':sha(svg.encode()),'sanitizedSHA256':sha(sanitize_svg(svg).encode())});check('actual-default-background',g.tag.endswith('g') and len(g)==1 and g[0].tag.endswith('path'))
# Same numeric matrix as R1, replacing its artificial valid group with actual generated background.
values=[('valid',data,True),('zero-width','0 0 0 10 5 5',False),('zero-height','0 0 10 0 5 5',False),('zero-columns','0 0 10 10 0 5',False),('oversize','0 0 10 10 61 5',False),('999','0 0 10 10 999 5',False),('nonsquare','0 0 10 20 5 5',False),('negative-width','0 0 -1 10 5 5',False),('nan','0 0 NaN 10 5 5',False),('inf','0 0 inf 10 5 5',False),('float-count','0 0 10 10 1.5 5',False),('max','0 0 10 10 60 60',True)]
def accepts(s):
 try:sanitize_svg(s);return True
 except SvgSecurityError:return False
for id,v,expected in values:
 t=ET.fromstring(svg);t[0].set('data-grid',v);check('metadata-'+id,accepts(ET.tostring(t,encoding='unicode'))==expected)
for id in ['nested','transform','duplicate','path-transform','empty','two-paths','late']:
 t=ET.fromstring(svg);a=t[0]
 if id=='nested':t.remove(a);wrapper=ET.Element('{http://www.w3.org/2000/svg}g');wrapper.append(a);t.insert(0,wrapper)
 elif id=='transform':a.set('transform','translate(1 1)')
 elif id=='duplicate':t.append(copy.deepcopy(a))
 elif id=='path-transform':a[0].set('transform','translate(1 1)')
 elif id=='empty':a.remove(a[0])
 elif id=='two-paths':a.append(copy.deepcopy(a[0]))
 elif id=='late':t.remove(a);t.append(a)
 check('placement-'+id,not accepts(ET.tostring(t,encoding='unicode')))
for i,(dx,dy,cols,rs) in enumerate([(1,1,8,5),(2,3,4,3),(.5,2,16,4),(1,1,60,60)]):
 s=copy.deepcopy(base);s.update(xRange=[0,dx*cols],yRange=[0,dy*rs]);s['grid']['step']=[dx,dy];raw=render_graph(s);t=ET.fromstring(sanitize_svg(raw));v=list(map(float,t[0].attrib['data-grid'].split()));check('square-grid-'+str(i),abs(v[2]-v[3])<=.002 and v[4:]==[cols,rs] and t[0][0].attrib['d'].count('M')==cols+rs+2);fixtures.append({'id':'grid-'+str(i),'spec':s,'svgSHA256':sha(raw.encode())})
# R1 patch graph baseline: same pre-adaptation graph renderer, current read-only common dependencies.
spec=importlib.util.spec_from_file_location('audit_old_graph',OLD/'own-shadow-root/scripts/figure/graph_scene.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for i,extra in enumerate([{}, {'axes':True},{'points':[{'at':[2,2]}]}, {'polygons':[{'points':[[1,1],[4,1],[2,3]]}]}]):
 s=copy.deepcopy(base);s.pop('grid');s.update(extra);a=render_graph(s);b=m.render_graph(s);check('non-grid-baseline-'+str(i),a==b and accepts(a));fixtures.append({'id':'nongrid-'+str(i),'spec':s,'svgSHA256':sha(a.encode())})
# Imports are actual current Root modules, not shadow wrappers.
modules={n:str(sys.modules[n].__file__) for n in ['core.figure_quality','core.label_markup','core.figure_svg','graph_scene','graph_native']}
after={x:sha((R/x).read_bytes()) for x in paths};(P/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8');(P/'own-fixtures.json').write_text(json.dumps(fixtures,indent=2),encoding='utf-8');result={'uniqueControls':len(rows),'passed':sum(x['pass'] for x in rows),'failed':[x for x in rows if not x['pass']],'rows':rows,'modules':modules,'sourceChanged':[x for x in paths if before[x]!=after[x]],'R1EightCounterexamples':'zero-width/height/count,61,999,nonsquare,nested,transform now rejected','R1ArtificialPositive':'replaced by actual render_graph full path; empty group explicitly rejected','catalogSVG':'pending separate bounded catalogue fixture inspection; no full catalog executed','nodeExecuted':False};(P/'own-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k not in ['rows','modules']},ensure_ascii=True))
