from pathlib import Path
import json,sys,subprocess
P=Path(__file__).resolve().parent;cases=json.loads((P/'own-extra-cli-cases.json').read_text());rows=[]
for name in cases:
 p=subprocess.run([sys.executable,'-B',str(P/'own-extra-cli-probe.py'),name],capture_output=True,encoding='utf-8');assert p.returncode==0,(name,p.stderr);r=json.loads(p.stdout);r['passed']=r['exit']==2 and r['error']is None and not r['outputExists']and r['inputHashesBefore']==r['inputHashesAfter']and not any('textlayer' in e.get('path','').lower()or e.get('path','').lower().startswith('n:')for e in r['events']);rows.append(r)
x={'total':len(rows),'passed':sum(r['passed']for r in rows),'failed':[r['case']for r in rows if not r['passed']],'rows':rows,'method':'Actual main with OWN BASE/inventory fixtures; no validator replacement. Audit hook prohibits unsupplied reads and every filesystem mutation after fixture preparation. No positive parser execution.'};(P/'own-extra-cli-results.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print({k:v for k,v in x.items()if k not in ['rows','method']})
