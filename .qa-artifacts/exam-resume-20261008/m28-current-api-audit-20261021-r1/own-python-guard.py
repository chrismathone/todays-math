from pathlib import Path
import sys,runpy,importlib.machinery,hashlib,json
P=Path(__file__).resolve().parent;root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/vendor/figure-engine/';before={};old=importlib.machinery.SourceFileLoader.get_code

def guarded(self,fullname):
 p=Path(self.path);n=str(p.resolve()).replace('\\','/')
 if n.startswith(root):before.setdefault(str(p.resolve()),hashlib.sha256(p.read_bytes()).hexdigest())
 return old(self,fullname)
importlib.machinery.SourceFileLoader.get_code=guarded
runpy.run_path(str(P/'own-check-v2.py'),run_name='__main__')
after={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in before};assert before==after
(P/'own-python-first-import-hashes.json').write_text(json.dumps({'beforeFirstImport':before,'after':after,'matched':True,'rerun':'Repeat64nativeSVGcompilations for before-first-import hashing, not64newfigures/outputs; noAPIrerun'},indent=2),encoding='utf-8')
