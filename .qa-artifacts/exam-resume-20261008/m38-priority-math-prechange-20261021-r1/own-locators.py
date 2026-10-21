from pathlib import Path
import subprocess,json,hashlib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');targets=[('M8','src/lib/middle/m2GeoSim.ts',2474),('M9','src/lib/middle/m2GeoSim.ts',2617),('M19','src/lib/middle/m2Center.ts',1678),('M20','src/lib/middle/m2Mono.ts',527)];rows=[]
for finding,path,line in targets:
 rows.append({'finding':finding,'sourcePath':path,'lineAtAudit':line,'sha256':hashlib.sha256((R/path).read_bytes()).hexdigest(),'lastSourceCommit':subprocess.check_output(['git','-C',str(R),'log','-1','--format=%H','--',path],text=True,encoding="utf-8").strip(),'blame':subprocess.check_output(['git','-C',str(R),'blame','-L',f'{line},{line}','HEAD','--',path],text=True,encoding="utf-8").strip()})
(P/'own-source-locators.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')

