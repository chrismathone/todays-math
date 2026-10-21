from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;old=P.parent/'figure-engine-all-runtime-audit-20261021-r1/own-runtime.py';s=old.read_text(encoding='utf-8-sig');s=s.replace("os.environ['PYTHONDONTWRITEBYTECODE']='1';", "os.environ['PYTHONDONTWRITEBYTECODE']='1';os.environ['PYTHONIOENCODING']='utf-8';")
s=s.replace("*list((R/'scripts/figure/assets').glob('*.svg'))]", "*list((R/'scripts/figure/assets').glob('*.svg')),R/'scripts/figure/engine-catalog.json']")
s=s.replace("[sys.executable,'-B','-S',", "[sys.executable,'-X','utf8','-B','-S',")
s=s.replace("input=raw,capture_output=True,timeout=25,cwd=P", "input=raw,executable=sys.executable,capture_output=True,timeout=25,cwd=P")
(P/'own-runtime.py').write_text(s,encoding='utf-8');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();(P/'own-harness-lineage.json').write_text(json.dumps({'R1HarnessSHA256':sha(old),'R2HarnessSHA256':sha(P/'own-runtime.py'),'changes':['same139 inputs and expectations; explicit Python executable retained','UTF8 child interpreter/env explicit','add engine-catalog metadata to pre-import hash inventory'],'copiedOldResultsAsCurrent':False,'parentResultsCounted':False},indent=2),encoding='utf-8')
