import json,pathlib,datetime
ROOT=pathlib.Path(__file__).parent
targets=json.loads((ROOT/'before-actualrows-and-normalized.json').read_text(encoding='utf-8'))['targets']
decisions=[]
def keep(i,reason):
 decisions.append(dict(id=targets[i]['id'],index=i,verdict='retain',reason=reason,patch={},reader='Codex direct reading',readAt=datetime.datetime.now(datetime.timezone.utc).isoformat()))
def revise(i,reason,**patch):
 decisions.append(dict(id=targets[i]['id'],index=i,verdict='revise',reason=reason,patch=patch,reader='Codex direct reading',readAt=datetime.datetime.now(datetime.timezone.utc).isoformat()))
def save(start):
 (ROOT/f'decisions-{start:03d}.json').write_text(json.dumps(dict(batchStart=start,maximumBatchSize=25,decisions=decisions),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
