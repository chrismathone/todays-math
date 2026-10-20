from pathlib import Path
import json,hashlib,urllib.request,re
p=Path('.qa-artifacts/exam-resume-20261008/fresh-three-source-component-review-20261020-r1')
h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'))
m=read(p/'input-manifest.json');rows=[]
for item in m['inputs']:
 f=p/item['path'];assert h(f)==item['sha256'];rows.append({'path':item['path'],'sha256':h(f),'bytes':f.stat().st_size})
probe=p/'own-utf8-probe.txt';probe.write_text('독립 원문 성분 검토: 중첩 제곱근 ± √ 순환마디\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='독립 원문 성분 검토: 중첩 제곱근 ± √ 순환마디\n'
(p/'own-input-before.json').write_text(json.dumps({'manifestSha256':h(p/'input-manifest.json'),'files':rows,'probeSha256':h(probe)},indent=2)+'\n',encoding='utf-8')
url='https://askmath.kosac.re.kr/mathEduProcess/index.do'
data=urllib.request.urlopen(url,timeout=30).read();f=p/'own-primary-kosac.local.html';f.write_bytes(data);text=data.decode('utf-8');codes=['9수01-01','9수01-03','9수01-04','9수01-05','9수01-06','9수01-07','9수01-08','9수01-09','9수01-10']
assert all(c in text for c in codes) and '2015년' in text
receipt={'url':url,'localOnlyHtml':f.name,'sha256':h(f),'bytes':len(data),'codesObserved':codes,'webViewLocators':{'2015tab':'84-85','middle13band':'461','standards':'466','terms':'469','repeatingDecimalTeachingLimit':'477','rootIrrationalIntroduction':'478-480','calculationAssessmentLimits':'483-485'},'interpretation':'Actual2015 page observed. Codes are middle1-3 band, not by themselves M3 semester placement or candidate approval. Captured Unit grade/semester is separate evidence. No full HTML staged.'}
(p/'own-primary-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'inputs':len(rows),'questionRecords':sum('/q0' in x['path'].replace('\\','/') for x in rows),'primarySha256':receipt['sha256']},indent=2))
