from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
b=json.loads((P/'own-preparation-hashes.json').read_text(encoding='utf8'));assert all(sha(Path(p).read_bytes())==h for p,h in b.items())
# Exact character-length witness for current JS JSON string storage contract;
# ASCII payload means Python compact JSON and JS JSON.stringify length agree.
stack62=['G'*128]*62;stack63=stack62+['G'*128]
n=lambda v:len(json.dumps(v,separators=(',',':')))
assert n(stack62)==8123 and n(stack63)==8254
report={'stage':'preparation only','NodeExecuted':False,'browserExecuted':False,'static41publicLFBindings':True,'legacy39MetadataPrepared':True,'sourceBoundFiles':len(b),'potentialBoundary':{'id':'groupstack-combined-limits','kind':'source-derived static witness; TS/DOM not yet executed','input':{'priorStackLength':62,'eachPriorNameLength':128,'currentGroupNameLength':128},'priorJSONChars':n(stack62),'afterPushJSONChars':n(stack63),'readerLimit':8192,'sourceReason':'readGroupStack accepts<=8192; push checks stack.length>=64 but no new serialized length guard. Pushing valid63rd layer may write8254 chars, next read returns[]; history loss possible before64-depth guard.','expectedSafe':'Reject before commit or preserve a representable complete stack. Pending independent DOM long-stack case must not change expected outcome to force pass.'},'pending':['Fresh freeze/delta and explicitGO','Root direct DOM insertion current41 and legacy39 frame compatibility','Bad body/ID/viewBox/center errors','Lazy fetch integrity/retry/cache via isolated fake data transport, no real service','Group bounds/push/pop/history preservation','Typed perspective and planar/projected display separation','Full React keyboard/focus/undo remains separate and not claimed'], 'limits':'No parent tests counted. No SourceD/Root writes or AI/model/API/DB calls. No whole UI/math/grade/rights approval.'}
(P/'own-static-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-static-report.json').read_bytes()),'stackBoundary':[n(stack62),n(stack63)],'Node':0}))
