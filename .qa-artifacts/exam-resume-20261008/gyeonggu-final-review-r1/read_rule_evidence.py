"""Capture bounded current rule blocks, not DB state or inferred classifications."""
from pathlib import Path
import hashlib,json,re,sys
sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parent
PARENT=OUT.parents[2].parent/'exam-extraction-resume-20261008'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
snap=json.loads((OUT/'unit-family-snapshot.json').read_text(encoding='utf8'))
paths={name:PARENT/'src/lib/middle'/name for name in ['m3Trig.ts','m3Tangent.ts','m3.ts']}
blocks=[]
for name,p in paths.items():
    text=p.read_text(encoding='utf8')
    starts=list(re.finditer(r'\bdef\(\s*"([^\"]+)"\s*,\s*"([^\"]+)"',text))
    for i,m in enumerate(starts):
        a,b=m.group(1,2)
        minor,typ=(a,b) if name!='m3Tangent.ts' else ('원과 직선',a)
        key=f'3-2|{minor}|{typ}'
        selected=next((x for x in snap['comparedFamilies'] if x['registry']['key']==key),None)
        if not selected:continue
        end=starts[i+1].start() if i+1<len(starts) else len(text)
        block=text[m.start():end]
        blocks.append({'key':key,'source':{'path':p.as_posix(),'sha256':sha(p),
            'startLine1based':text[:m.start()].count('\n')+1,'endLine1based':text[:end].count('\n')+1},
            'fullRuleBlock':block,'blockSha256Utf8':hashlib.sha256(block.encode()).hexdigest(),
            'snapshotRecord':selected})
    if name=='m3Trig.ts':
        lines=text.splitlines()
        helper='\n'.join(lines[879:932])
        blocks.append({'key':'triangleArea-helper','source':{'path':p.as_posix(),'sha256':sha(p),
            'startLine1based':880,'endLine1based':932},'fullRuleBlock':helper})
    if name=='m3Tangent.ts':
        m=re.search(r'const T11 = \[.*?\] as const;',text,re.S)
        assert m
        blocks.append({'key':'T11-parameter-pool','source':{'path':p.as_posix(),'sha256':sha(p),
           'startLine1based':text[:m.start()].count('\n')+1},'fullRuleBlock':m.group()})
missing={x['registry']['key'] for x in snap['comparedFamilies']}-{x['key'] for x in blocks}
assert not missing,missing
seed=PARENT/'prisma/seed-data/units.ts';lines=seed.read_text(encoding='utf8').splitlines()
result={'rules':blocks,'sourceFiles':[{'path':p.as_posix(),'sha256':sha(p)} for p in paths.values()],
        'seed':{'path':seed.as_posix(),'sha256':sha(seed),'startLine1based':2943,
            'endLine1based':2987,'text':'\n'.join(lines[2942:2987])},
        'snapshotScope':'Read-only parent capture302 families; no reviewer DB read/current DB claim.'}
(OUT/'rule-evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for x in blocks:
    print('\n',x['key'],x['source']['startLine1based'])
    # Full rule is retained; display the generated inputs/targets, modes, facts and formulas.
    lines=x['fullRuleBlock'].splitlines()
    for i,line in enumerate(lines):
        if any(k in line for k in ['content:', 'answer:', 'solution:', 'facts:', 'mode ===','intBetween(rng','SEC.', '"기본"','"응용"','"심화하"','const T11','[3, 12']):
            print(line)
print('\nSEED',result['seed']['text'])
