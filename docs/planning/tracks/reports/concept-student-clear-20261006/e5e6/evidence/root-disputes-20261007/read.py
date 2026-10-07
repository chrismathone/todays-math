import json, pathlib, sys, re
root=pathlib.Path(__file__).parent
phase=sys.argv[1]; start=int(sys.argv[2]); count=int(sys.argv[3]) if len(sys.argv)>3 else 25
data=json.loads((root/('before-actualrows-and-normalized.json' if phase=='before' else 'after-actualrows-and-normalized.json')).read_text(encoding='utf-8'))['targets']
for i,t in enumerate(data[start:start+count],start):
 p=t['normalized']; r=t['actualRow']; print('\n#',i,t['id'],r['sourceIndex'],r['learningRole'],p['source']['term'],p['source'].get('level'))
 print('원문:',p['source']['definition']); print('B:',json.dumps(p['B'],ensure_ascii=False,separators=(',',':')))
 c=p['C'];print('C학생:',t.get('studentSentence',r.get('cStudentSentence')) if 'sentence' in c else c);print('C키/인정:',json.dumps(c,ensure_ascii=False,separators=(',',':')))
 print('일반설명:',p['coreAfter'],'이유:',p['coreReason']);print('학습목표:',p['goal'])
 for n in t.get('negatives',[]):print('Claude:',json.dumps({'blind':n['blind'],'key':n['key']},ensure_ascii=False,separators=(',',':')))
 if 'decision' in t:print('Codex판정:',json.dumps(t['decision'],ensure_ascii=False,separators=(',',':')))
