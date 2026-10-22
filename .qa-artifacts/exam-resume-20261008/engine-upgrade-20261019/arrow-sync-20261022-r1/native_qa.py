"""Pinned source import, native arrow geometry and security checks; no DB/API writes."""
from pathlib import Path
import hashlib, json, os, re, subprocess, sys, xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parent
ROOT = Path.cwd()
sys.path.insert(0, str(ROOT / 'scripts/figure'))
import engine_path
engine_path.ensure_on_path()
import elementary, figure_assets
from core.figure_quality import sanitize_svg, SvgSecurityError

COMMIT = '69d134beb0efcaf29bc20f788929571198efcaca'
env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'PYTHONDONTWRITEBYTECODE': '1'}
sha = lambda b: hashlib.sha256(b).hexdigest()
exact = ['scripts/figure/graph_scene.py', 'scripts/figure/elementary.py',
         'scripts/figure/figure_assets.py',
         'src/__tests__/unit/figureEngineArrows.test.ts']
matches = []
for name in exact:
    src = subprocess.check_output(['git', '-C', 'D:/math-figure-editor', 'show', COMMIT + ':' + name])
    # Git working-tree CRLF conversion is immaterial for source identity.
    got = (ROOT/name).read_bytes().replace(b'\r\n', b'\n')
    assert got == src.replace(b'\r\n', b'\n'), name
    matches.append({'path': name, 'committedSourceSHA256': sha(src), 'currentLF_SHA256': sha(got)})

def wrap(body):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">' + body + '</svg>'

cases = []
for name, body in [('down', elementary._arrow_down(80,20,80)),
                   ('up', elementary._arrow_up(80,80,20)),
                   ('right', elementary._arrow_right(20,100,50)),
                   ('both', figure_assets._dim_arrow(20,50,100,50,''))]:
    raw = wrap(body)
    clean = sanitize_svg(raw)
    root = ET.fromstring(clean)
    group = next(n for n in root.iter() if n.get('data-arrow'))
    expected = 'both' if name == 'both' else 'end'
    assert group.get('data-arrow') == expected
    assert len(list(group)) == (3 if name == 'both' else 2)
    (OUT/('native-'+name+'.svg')).write_text(clean, encoding='utf-8')
    cases.append({'name':name, 'raw':raw, 'sanitized':clean, 'metadata':expected})

for name, to in [('horizontal',[4,1]),('vertical',[1,4]),('diagonal',[4,4])]:
    spec={'version':'graph-1','xRange':[0,5],'yRange':[0,5],'axes':False,
          'width':240,'height':200,'segments':[{'from':[1,1],'to':to,'arrow':True}]}
    run=subprocess.run([sys.executable,'-B','scripts/figure/render_spec.py'],input=json.dumps(spec),
                       text=True,encoding='utf-8',capture_output=True,env=env,check=True)
    result=json.loads(run.stdout); raw=result['svg']
    assert 'data-arrow="end"' in raw
    (OUT/('native-'+name+'.svg')).write_text(raw,encoding='utf-8')
    cases.append({'name':name,'spec':spec,'raw':raw,'sanitized':raw,'metadata':'end'})

negative = [wrap('<g data-arrow="other"/>'), wrap('<g data-arrow="end "/>'),
            wrap('<g data-arrow="url(https://example.com)"/>'),
            wrap('<line data-arrow="end" x1="0" y1="0" x2="10" y2="10"/>'),
            wrap('<defs><marker id="m"/></defs>'),
            wrap('<line x1="0" y1="0" x2="10" y2="10" marker-end="url(#m)"/>'),
            wrap('<g data-grid="0 0 2 3 2 2"/>'), wrap('<g data-grid="0 0 2 2 0 2"/>')]
rejected=[]
for raw in negative:
    try: sanitize_svg(raw)
    except SvgSecurityError as e: rejected.append(str(e))
    else: raise AssertionError('Unexpected sanitizer acceptance: '+raw)

# Frozen external compatibility fixtures remain read-only. The new grouping is
# expected only in the grid case: stripping exactly those wrappers recovers all
# prior SVG bytes. This is a declared migration, not a raw 8/8 equality claim.
source_check=Path('D:/math-figure-editor/docs/export/todays-math/engine-check/check_engine.py')
ns={'__name__':'qa_read_only','__file__':str(source_check)}
exec(compile(source_check.read_bytes(),str(source_check),'exec'),ns)
compat=[]
for name,spec in ns['CASES'].items():
    run=subprocess.run([sys.executable,'-B','scripts/figure/render_spec.py'],input=json.dumps(spec).encode(),
                       capture_output=True,env=env,check=True)
    got=run.stdout.decode('utf-8')
    old=(source_check.parent/'expected'/f'{name}.json').read_text(encoding='utf-8')
    old_obj,new_obj=json.loads(old),json.loads(got)
    normalized=dict(new_obj)
    if isinstance(normalized.get('svg'),str):
        normalized['svg']=re.sub(r'<g data-arrow="(?:end|both)">(.*?)</g>',r'\1',normalized['svg'])
    old_normalized=dict(old_obj)
    if isinstance(old_normalized.get('svg'),str):
        old_normalized['svg']=re.sub(r'<g data-arrow="(?:end|both)">(.*?)</g>',r'\1',old_normalized['svg'])
    assert normalized == old_normalized, name
    compat.append({'name':name,'rawIdentical':got==old,'arrowWrapperOnlyEqual':True,
                   'expectedSHA256':sha(old.encode()),'actualSHA256':sha(got.encode())})

(OUT/'native-cases.json').write_text(json.dumps(cases,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
helper='src/components/unified/figure-editor/figureArrow.ts'
result={'exactCommittedSourceMatches':matches,'nativeCases':len(cases),'securityRejected':rejected,
        'reviewedLocalHelper':{'path':helper,'currentSHA256':sha(Path(helper).read_bytes()),'upstreamSHA256':sha(subprocess.check_output(['git','-C','D:/math-figure-editor','show',COMMIT+':'+helper])),'localRootIDAndPresentationGuards':True},
        'externalFrozenFixtures':compat,'sourceRepositoryWritten':False,'dbWrites':0}
(OUT/'native-results-r2.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourcePaths':len(matches),'nativeCases':len(cases),'securityRejected':len(rejected),
                  'externalRawEqual':sum(c['rawIdentical'] for c in compat),
                  'externalArrowWrapperOnlyEqual':len(compat)}))
