import pathlib,json,re,hashlib
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-circle-revolutions-20261019-r1')
root=pathlib.Path.cwd();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inv=root/'docs/reports/math-type-audit-20261018/unit-inventory.json'
rows=json.loads(inv.read_text(encoding='utf-8')); selected=[]
terms=['정비례','반비례','백분율','원주','반올림']
for row in rows:
 if row.get('grade') in ['중1','초5','초6'] and any(t in row.get('section','') for t in terms):selected.append({k:row.get(k) for k in ['id','grade','chapter','section','orderIndex','semester','supported']})
ref=root/'.qa-artifacts/exam-resume-20261008/curriculum-evidence.json';j=json.loads(ref.read_text(encoding='utf-8'))
standards=j['achievement_standards']; print('standard type',type(standards).__name__)
if isinstance(standards,dict):print('keys',list(standards)[:8])
else: print('first keys',list(standards[0])[:12])
(out/'project-unit-references.json').write_text(json.dumps({'inventoryPath':str(inv),'inventorySha256':sha(inv),'units':selected,'limits':'Existing project records, not official grade/edition proof or live taxonomy assignment. Each candidate must map its actual method to official provision text separately. unitSemester uses project chapter conventions, not national within-year sequencing.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(selected,ensure_ascii=False,indent=2))
