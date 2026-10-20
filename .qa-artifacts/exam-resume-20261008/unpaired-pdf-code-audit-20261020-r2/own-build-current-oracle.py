from pathlib import Path
import json
P=Path('.qa-artifacts/exam-resume-20261008/unpaired-pdf-code-audit-20261020-r2');t=(P/'own-controls.py').read_text(encoding='utf-8-sig');start=t.index("  if any(word in parts[-1]");end=t.index('\n  identity=',start);t=t[:start]+"  if labelOracle(PureWindowsPath(raw).stem):continue"+t[end:]
pos=t.index('def fileOracle')
fn='''def labelOracle(name):
 if any(w in name for w in ['\\uB2F5\\uC548','\\uD574\\uB2F5','\\uC815\\uB2F5','\\uD574\\uC124']):return True
 def ascii_alnum(c):return c.isascii()and c.isalnum()
 def ko_alnum(c):return ascii_alnum(c)or '\\uAC00'<=c<='\\uD7A3'
 def scan(words,ischar):
  for i in range(len(name)):
   if i and ischar(name[i-1]):continue
   for word in words:
    if name[i:i+len(word)].casefold()!=word.casefold():continue
    j=i+len(word)
    # Permit a numeric label suffix with at most one separator.
    if j<len(name)and name[j]in '-_ ':j+=1
    while j<len(name)and name[j].isascii()and name[j].isdigit():j+=1
    if j==len(name)or not ischar(name[j]):return True
  return False
 return scan(['\\uB2F5'+x for x in ['', '\\uD3EC\\uD568','\\uC9C0','\\uB9CC','\\uC218\\uB85D','\\uC788\\uC74C']],ko_alnum)or scan(['answer','answers','solution','solutions'],ascii_alnum)
'''
t=t[:pos]+fn+t[pos:];t=t.replace("own-controls-results.json","own-current-oracle-results.json");t=t[:t.rfind(';print(')]+";print(json.dumps({'total':sum(counts.values()),'passed':sum(counts.values())-len(failed),'failCount':len(failed),'routing':routing},ensure_ascii=False))\n";(P/'own-current-oracle.py').write_text(t,encoding='utf-8')
# Keep the exact old-oracle failures locally; commit only a digest/IDs summary without original metadata bodies.
x=json.loads((P/'own-controls-results.json').read_text(encoding='utf-8'));import hashlib
summary={k:v for k,v in x.items()if k!='failed'};summary['failed']=[{'category':r['category'],'id':r['id'],'expectedSHA256':hashlib.sha256(r['expected'].encode()).hexdigest(),'actualSHA256':hashlib.sha256(r['actual'].encode()).hexdigest()}for r in x['failed']];summary['rawDiagnosticLocalSHA256']=hashlib.sha256((P/'own-controls-results.json').read_bytes()).hexdigest();(P/'own-r1-replay-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
