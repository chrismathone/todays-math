from pathlib import Path
import importlib.util,json
P=Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('own_checker',P/'own-check.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);j=json.loads((P/'own-synthetic-render-preparation.json').read_text(encoding='utf-8'));out=[]
for r in j:
 _,check=m.svg_check(r['spec']);out.append({'ownSyntheticBeta':r['ownSyntheticBeta'],'actualAPI':False,'check':check})
(P/'own-synthetic-svg-check.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps([{'beta':r['ownSyntheticBeta'],'strict':r['check']['strictWholeArcCenterlineContainment'],'minimumIncident':min(a['incidentMinMargin'] for a in r['check']['arcs'])} for r in out]))
