import json,pathlib,sys
root=pathlib.Path(__file__).parent
start=int(sys.argv[1]);count=int(sys.argv[2]) if len(sys.argv)>2 else 25
ts=json.loads((root/'after-actualrows-and-normalized.json').read_text(encoding='utf-8'))['targets']
for i,t in enumerate(ts[start:start+count],start):
 p=t['normalized'];print('\n#',i,t['id'],t['decision']['verdict'])
 if t['decision']['verdict']=='revise':
  print('B:',json.dumps(p['B'],ensure_ascii=False,separators=(',',':')))
  print('C학생:',t['studentSentence']);print('C:',json.dumps(p['C'],ensure_ascii=False,separators=(',',':')))
  print('coreAfter:',p['coreAfter'],'coreReason:',p['coreReason'],'역할:',t['actualRow']['learningRole'],'목표:',p['goal'])
 else:print('유지근거:',t['decision']['reason'])
 for v in t['originalFullVerdicts']:print('원래blind전체:',json.dumps(v['blind'],ensure_ascii=False,separators=(',',':')))
