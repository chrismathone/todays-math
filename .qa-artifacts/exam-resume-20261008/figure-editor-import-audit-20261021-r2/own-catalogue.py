from pathlib import Path
import sys,json,hashlib,subprocess
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
# Capture direct import dependency closure on first read through a read-only source loader.
from importlib.machinery import SourceFileLoader
orig=SourceFileLoader.get_data;reads={}
def capture(self,path):
 data=orig(self,path)
 if str(R).replace('\\','/').lower() in str(path).replace('\\','/').lower() and str(path).endswith('.py'):reads[str(Path(path))]=hashlib.sha256(data).hexdigest()
 return data
SourceFileLoader.get_data=capture
sys.path[:0]=[str(R/'vendor/figure-engine'),str(R/'scripts/figure')]
from core.figure_scene import compile_figure_spec
from core.figure_quality import sanitize_svg
catalog=json.loads((R/'scripts/figure/engine-catalog.json').read_text(encoding='utf-8'));scene=compile_figure_spec(catalog['v2_example']);svg=scene.to_svg();clean=sanitize_svg(svg)
r=subprocess.run([sys.executable,'-B','-S',str(R/'scripts/figure/test_grid.py')],capture_output=True,encoding='utf-8')
result={'catalogueExactExample':{'svgSHA256':hashlib.sha256(svg.encode()).hexdigest(),'sanitizedSHA256':hashlib.sha256(clean.encode()).hexdigest(),'accepted':True},'existingRootTests':{'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr,'attribution':'own execution of four supplied tests, NOT four additional independently designed cases'},'dependencyFirstReadSHA256':reads,'dependencyAfterSHA256':{p:sha(Path(p)) for p in reads},'sourceChanged':[p for p,h in reads.items() if sha(Path(p))!=h]}
(P/'own-catalogue-and-root-tests.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if not k.startswith('dependency')},ensure_ascii=True))
