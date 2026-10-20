from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/bare-unit-notation-code-audit-20261020-r1');root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
r=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();scope=r(p/'provided-scope.json');rows=[]
for x in scope['files']+[scope['runtimeData']]:
 a={'path':x['path'],'expected':x['sha256'],'root':h(root/x['path']),'snapshot':h(p/x['snapshot']),'runtime':h(p/x['runtime'])};assert all(a[k]==a['expected'] for k in ['root','snapshot','runtime']);rows.append(a)
art=[]
for x in scope['actualArtifacts']:
 f=Path(x['path']);assert h(f)==x['sha256'];art.append({'path':x['path'],'sha256':h(f)})
old=[]
for commit,paths in [('3a496d7669cda8c18859b351e7ca851d609c9c81',['fresh-root-first3-review-20261020-r3/daegudong/blind/solve/q01.json','fresh-root-first3-review-20261020-r3/daegudong/blind/solve/q02.json','fresh-root-first3-review-20261020-r2/daegubuk/blind/solve/q02.json']),('eb4053d06d160dba787b8ac0d42840158598be02',['fresh-root-first3-review-20261020-r3/daegudong/verification/reports/q01.json','fresh-root-first3-review-20261020-r3/daegudong/verification/reports/q02.json','fresh-root-first3-review-20261020-r2/daegubuk/verification/reports/q02.json'])]:
 for rel in paths:
  f=Path('.qa-artifacts/exam-resume-20261008')/rel;assert f.read_bytes()==subprocess.check_output(['git','show',commit+':'+f.as_posix()]);old.append({'path':f.as_posix(),'sha256':h(f),'sealedCommit':commit})
probe=p/'own-utf8-probe.txt';probe.write_text('U56 독립 검사 UTF-8 확인 😀 𐐷 ± √\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='U56 독립 검사 UTF-8 확인 😀 𐐷 ± √\n'
(p/'own-before.json').write_text(json.dumps({'scopeSha256':h(p/'provided-scope.json'),'codeAndData17':rows,'actualArtifacts':art,'priorRawReports':old,'probeSha256':h(probe)},indent=2)+'\n',encoding='utf-8')
fixtures=[]
def add(id,template,delimiter='$',note=''):
 out='';expected=[]
 while '<@' in template:
  pre,tail=template.split('<@',1);token,template=tail.split('@>',1);out+=pre;expected.append({'token':token,'offset':len(out.encode('utf-16-le'))//2,'delimiter':delimiter});out+=token
 out+=template;fixtures.append({'id':id,'text':out,'expected':expected,'note':note})
for mode in ['$','$$']:
 for unit in ['cm','m']:
  for gap in ['', ' ', '\n']:
   for inner in ['', ' ', '\t']:
    for prefix in ['11,','z','7x','한글😀𐐷+']:
     ident=str(len(fixtures));body=prefix+'<@mathrm@>'+gap+'{'+inner+unit+inner+'}'
     add('bare-'+ident,'prose '+mode+body+mode+' outside',mode)
     add('escaped-'+ident,'prose '+mode+body.replace('<@mathrm@>',r'\mathrm')+mode+' outside',mode)
 for cmd in ['text','texttt','textrm','textsf','mathrm','operatorname']:
  for unit in ['cm','m']:
   for body in ['literal '+f'mathrm{{{unit}}}', '😀{nested} '+f'mathrm{{{unit}}}'+r' \{sqrt2\}',r'cost \$11 '+'mathrm{'+unit+'}']:
    # Literal command groups suppress only their own text; following bare token remains visible.
    add('literal-'+str(len(fixtures)),mode+'𐐷+\\'+cmd+'{'+body+'}+<@mathrm@>{m}'+mode,mode)
 for tok,tail in [('sqrt','{11}'),('frac','{3}{8}'),('dfrac',' {5}{9}'),('tfrac','{7}{8}'),('ldots','+1'),('cdots','+2')]:
  add('mixed-'+str(len(fixtures)),'😀'+mode+'<@mathrm@>{cm}+<@'+tok+'@>'+tail+'+\\text{mathrm{m}}+<@mathrm@>{m}'+mode,mode)
 for unit in ['mm','CM','M','cm^2','m^{2}','kg','sec','cmx','m m']:
  add('outside-unit-scope-'+str(len(fixtures)),mode+'5mathrm{'+unit+'}'+mode,mode,'Explicit marker scope only;0 warnings does not certify this text.')
 for body in [r'11\,\mathrm{cm}',r'a\mathrm{m}^{2}',r'\text{mathrm{cm}}',r'\mathrm {cm}',r'\sqrt{11}+\frac{3}{8}+\ldots',r'\operatorname{mathrm{m}}']:
  add('proper-'+str(len(fixtures)),mode+body+mode,mode)
for text in ['mathrm{cm} without math','😀mathrm{m} prose',r'\$mathrm{cm} escaped dollar',r'No units: $x+y$ thenmathrm{m}',r'$\text{a{b}c}+1$']:
 add('prose-'+str(len(fixtures)),text)
add('escaped-dollar-and-real-math',r'prose \$mathrm{cm} then $<@mathrm@>{m}$')
add('multiple-math-source-order',r'😀 $<@mathrm@>{cm}+<@sqrt@>9$ then $$<@frac@>{7}{8}+<@mathrm@>{m}$$',note='Each hit delimiter tracked independently below.')
fixtures[-1]['expected'][2]['delimiter']='$$';fixtures[-1]['expected'][3]['delimiter']='$$'
(p/'own-notation-oracle.json').write_text(json.dumps({'oracle':'Annotated independently constructed source fragments. Expected offsets calculated in Python UTF-16LE code units, not production regex or Node match locations. Proper literal groups and prose explicitly annotated as zero-warning content.','fixtures':fixtures},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceAndData':len(rows),'actualArtifacts':len(art),'priorRawReports':len(old),'notationCases':len(fixtures)},indent=2))
