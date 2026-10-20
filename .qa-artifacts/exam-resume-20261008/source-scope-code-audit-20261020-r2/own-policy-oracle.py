from pathlib import Path
import json
P=Path('.qa-artifacts/exam-resume-20261008/source-scope-code-audit-20261020-r2');rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));s=rd(P/'provided-scope.json');v=rd(s['parentValidation']);results=[]
def expect(level,grade):return 'unparsed 2025+ '+level+' grade'+str(grade)+' selected HWP/PDF pair; protected schools and known parsed/registered IDs excluded; original questions quarantined; source identity, student curriculum and rights approvals remain separate and pending'
import sys,importlib.util
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('own_policy_actual',P/'provided-code-runtime-local/source_inventory_scope_v2.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for level in ['middle','high']:
 for grade in [1,2,3]:results.append({'id':level+str(grade),'passed':m.selection_policy(level,grade)==expect(level,grade)})
controls=rd(P/'own-controls-results.json')
for row in controls['overlayBindings']:
 o=rd(row['overlay']);scope=o['actualMetadataScope'];results.append({'id':Path(row['overlay']).name,'passed':o['correctedSelectionPolicy']==expect(scope['level'],scope['grade'])})
(P/'own-independent-policy-results.json').write_text(json.dumps({'method':'Own string grammar from explicit school level/grade, quarantine and pending authority requirements; does not use production selection_policy as overlay oracle.','total':len(results),'passed':sum(x['passed']for x in results),'results':results},indent=2)+'\n',encoding='utf-8');print(len(results),sum(x['passed']for x in results))
