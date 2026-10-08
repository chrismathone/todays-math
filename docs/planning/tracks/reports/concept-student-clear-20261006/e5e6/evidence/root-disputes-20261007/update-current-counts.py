import pathlib,json
root=pathlib.Path(__file__).parent.parent.parent
counts=json.loads((root/'evidence/root-disputes-20261007/full-validation.json').read_text(encoding='utf-8'))['counts']
for n in ['audit.json','partial-audit.json']:
 p=root/n;s=p.read_bytes().decode('utf-8');start=s.index('"counts": ')+len('"counts": ');_,end=json.JSONDecoder().raw_decode(s,start)
 replacement=json.dumps(counts,ensure_ascii=False,indent=2).replace('\n','\r\n  ')
 p.write_bytes((s[:start]+replacement+s[end:]).encode('utf-8'))
print('Updated current audit/partial counts; frozen summary and manifest preserved.')
