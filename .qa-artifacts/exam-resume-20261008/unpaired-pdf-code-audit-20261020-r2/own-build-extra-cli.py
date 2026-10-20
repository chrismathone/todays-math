from pathlib import Path
import json
P=Path('.qa-artifacts/exam-resume-20261008/unpaired-pdf-code-audit-20261020-r2');rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));x=rd(P/'own-extra-results.json');print(json.dumps([{'id':r['examId'],'eligible':r['eligible'],'names':[d['name']for d in r['removed']]}for r in x['membershipChanges']],ensure_ascii=True,indent=1));x=rd(P/'own-legacy64-rebind.json');print({k:v for k,v in x.items()if k!='rows'});print([r['id']for r in x['rows']if r['mode']!='reexecuted'])
# New actual-main CLI fixture cases. Only metadata config differs; no validator mocks.
cases={}
for i,v in enumerate(['own:stream','CON','nul','COM1','LPT9','a/b','a\\b','C:relative','\\rooted','\\\\server\\share','x.','x ','a'*129]):cases['extra-id-'+str(i)]=['examId',v]
for i,v in enumerate(['(\ub2f5\uc9c0)','(\ub2f5\ud3ec\ud568)','answer','ANSWER_KEY','solutions','solution-key','\ub2f51']):cases['extra-label-'+str(i)]=['label',v]
(P/'own-extra-cli-cases.json').write_text(json.dumps(cases,indent=2)+'\n',encoding='utf-8')
t=(P/'own-cli-probe.py').read_text(encoding='utf-8-sig');anchor=" if case=='missing-count':";where=t.index(anchor);t=t[:where]+" extra=json.loads((P/'own-extra-cli-cases.json').read_text(encoding='utf-8-sig'))\n if case in extra:\n  k,v=extra[case]\n  if k=='examId':job[k]=v\n  else:job['files']=[{**f,'path':str(Path(f['path']).parent/(v+'.pdf'))}]\n"+t[where:];(P/'own-extra-cli-probe.py').write_text(t,encoding='utf-8')
