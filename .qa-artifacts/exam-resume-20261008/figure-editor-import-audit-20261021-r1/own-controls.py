from pathlib import Path
import importlib.util,sys,json,hashlib,itertools
from xml.sax.saxutils import escape
P=Path(__file__).resolve().parent;S=P/'own-shadow-root';R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);sys.modules[name]=m;s.loader.exec_module(m);return m
q=load('audit_quality',S/'vendor/figure-engine/core/figure_quality.py');l=load('audit_label',S/'vendor/figure-engine/core/label_markup.py')
rows=[]
def record(id,expected,actual,kind):rows.append(dict(id=id,expected=expected,actual=actual,pass_=actual==expected,kind=kind))
for i,(text,entities) in enumerate(itertools.product(['','abc','<>&','&amp;','"\'','한글\n<가>','x&#38;y','a>b<c'],[None,{}, {'"':'&quot;'}, {"'":'&apos;'}, {'x':'X','y':'Y'}])):
 record('escape-'+str(i),escape(text,entities or {}),l.escape(text,entities),'actual patched Python vs stdlib')
cases=[('valid','0 0 10 10 5 5',True),('zero-width','0 0 0 10 5 5',False),('zero-height','0 0 10 0 5 5',False),('zero-columns','0 0 10 10 0 5',False),('oversize','0 0 10 10 61 5',False),('999','0 0 10 10 999 5',False),('nonsquare','0 0 10 20 5 5',False),('negative-width','0 0 -1 10 5 5',False),('nan','0 0 NaN 10 5 5',False),('inf','0 0 inf 10 5 5',False),('float-count','0 0 10 10 1.5 5',False),('max','0 0 10 10 60 60',True)]
for id,data,expected in cases:
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g data-grid="{data}"><path d="M 0 0 L 10 10" stroke="black"/></g></svg>'
 try:q.sanitize_svg(svg);actual=True
 except q.SvgSecurityError:actual=False
 record('grid-'+id,expected,actual,'actual patched sanitizer; expected importer semantic contract')
for id,group in [('nested','<g><g data-grid="0 0 10 10 5 5"><path d="M 1 1 L 30 30"/></g></g>'),('transform','<g transform="translate(10 10)" data-grid="0 0 10 10 5 5"><path d="M 1 1 L 30 30"/></g>')]:
 try:q.sanitize_svg('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">'+group+'</svg>');actual=True
 except q.SvgSecurityError:actual=False
 record('grid-'+id,False,actual,'actual sanitizer acceptance; editor metadata boundary requires review')
before=json.loads((P/'own-before.json').read_text(encoding='utf-8'));after={k:hashlib.sha256(Path(k).read_bytes()).hexdigest() if Path(k).exists() else None for k in before};(P/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
result={'uniqueExecutedControls':len(rows),'passed':sum(x['pass_'] for x in rows),'failed':sum(not x['pass_'] for x in rows),'controls':rows,'baselineChanges':[k for k in before if before[k]!=after[k]],'nodeExecuted':False,'RootWrites':False,'externalExecution':False}
(P/'own-python-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k!='controls'},ensure_ascii=True))
