from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));r=read(P/'own-runtime-results.json');sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();b=read(P/'own-source-before.json');modules=r['moduleHashesAtFirstImport'];before={**b,**modules};after={p:sha(p) for p in before};changed=[p for p in before if before[p]!=after[p]];assert not changed;assert r['heapLimit']<=256*1024**2
(P/'own-source-after.json').write_text(json.dumps({'explicitBefore':b,'runtimeFirstImport':modules,'after':after,'changed':changed,'uniqueSourceFiles':len(after)},indent=2),encoding='utf-8')
summary=[]
for c in r['cases']:
 obs=c.get('observations',[]);summary.append({'name':c['name'],'factoryCalls':c['factoryCalls'],'renderCalls':c['renderCalls'],'delivered':len(c['result']['questions']),'verifierFailures':[i for i,x in enumerate(obs) if not x['passesCurrentVerifier']],'logicalKeyMismatches':[i for i,x in enumerate(obs) if not x['logicalKeyMatchesCurrentParams']],'contentDigestMismatches':[i for i,x in enumerate(obs) if not x['contentDigestMatchesCurrentTask']]})
(P/'own-observation-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8');print(json.dumps({'heapLimitBytes':r['heapLimit'],'rootSourceModules':len(modules),'uniqueSources':len(after),'changed':changed,'cases':summary},ensure_ascii=False))
