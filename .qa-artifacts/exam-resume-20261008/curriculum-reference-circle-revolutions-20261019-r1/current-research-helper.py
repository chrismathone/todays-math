import urllib.request,pathlib,re,json,hashlib,zipfile,io
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/curriculum-reference-circle-revolutions-20261019-r1')
urls={'notice2022':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401','typesafe-index':'https://docs.typesafe.ai/llms.txt','typesafe-build':'https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md','typesafe-citation':'https://docs.typesafe.ai/cookbooks/citation_check.md'}
receipt=[]
for name,url in urls.items():
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read(); (out/(name+'.txt')).write_bytes(data); receipt.append({'name':name,'url':url,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
 except Exception as e: receipt.append({'name':name,'url':url,'error':str(e)})
html=(out/'notice2022.txt').read_text(encoding='utf-8')
for m in re.finditer('fileDown',html): print(html[max(0,m.start()-100):m.start()+260])
(out/'fetch-receipts.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(receipt,ensure_ascii=False,indent=2))
