from pathlib import Path
import fitz,re,json
P=Path(__file__).resolve().parent;d=fitz.open('.qa-artifacts/exam-resume-20261008/gyeongsang-q13-r5-review-r1/official/moe-2015-74-book8-math.pdf');r=[]
for i in range(40):
 t=d[i].get_text().replace('\x01',' ')
 if '중학교' in t:r.append({'physicalPage1':i+1,'contexts':[t[max(0,m.start()-20):m.start()+75] for m in re.finditer('중학교',t)]})
s=(P/'own-local-primary/moe2015notice.local').read_text(encoding='utf-8',errors='replace');text=re.sub(r'\s+',' ',re.sub('<[^>]+>',' ',s));provisions=[]
for term in ['2015년 9월','2015.09.23','2019년 3월','2018년 3월']:
 k=text.find(term);provisions.append({'term':term,'context':text[max(k-70,0):k+160] if k>=0 else None})
(P/'own-notice-context.json').write_text(json.dumps({'2015BandPages':r,'2015NoticeContexts':provisions},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'2015BandPages':r,'2015NoticeContexts':provisions},ensure_ascii=False))
