import pathlib,json,subprocess,hashlib
out=pathlib.Path('.qa-artifacts/exam-resume-20261008/native-chord-inverse-audit-20261019-r2').resolve();p=out/'tuple-results.json';r=json.loads(p.read_text(encoding='utf-8'));print(json.dumps({'failures':r['failures'],'observations':r['observations']},ensure_ascii=False,indent=2))
local=out/'local-render';receipts=[]
for page,start in enumerate([40,54,68],1):
 body='<!doctype html><meta charset="utf-8"><style>body{margin:8px;background:white;font:12px Arial}.grid{display:grid;grid-template-columns:repeat(2,70mm);gap:8px 12px}.card{width:70mm}svg{display:block;width:70mm;height:auto}h3{margin:4px 0;font-size:12px}</style><div class="grid">'
 for a in range(start,start+14,2):
  for mode in [0,1]:
   svg=(local/f'a{a}-m{mode}.svg').read_text(encoding='utf-8');body+=f'<div class="card"><h3>a parameter {a}; mode {mode}</h3>'+svg+'</div>'
 body+='</div>';html=local/f'contact-{page}.html';html.write_text(body,encoding='utf-8');png=local/f'contact-{page}.png'
 subprocess.run(['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--force-device-scale-factor=1','--window-size=570,2600','--screenshot='+str(png),html.as_uri()],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 receipts.append({'page':page,'apexParameters':[start,start+12],'modes':[0,1],'svgWidthCssMm':70,'deviceScale':1,'path':str(png),'scope':'Local inspection artifact only, not Git publication.'})
(out/'visual-render-receipt.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

