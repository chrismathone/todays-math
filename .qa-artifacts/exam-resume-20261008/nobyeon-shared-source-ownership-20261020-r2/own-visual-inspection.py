from pathlib import Path
from PIL import Image
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-shared-source-ownership-20261020-r2')
f=p/'own-utf8-probe.txt';f.write_text('원문 소유 범위·격자 전사 확인\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='원문 소유 범위·격자 전사 확인\n'
for n,name in enumerate(['original-01-page-03-r2.png','original-02-page-04-r2.png'],1):
 im=Image.open(p/name);w,h=im.size;box=(int(w*.745),int(h*.305),int(w*.945),int(h*.46));im.crop(box).resize((1120,1240)).save(p/f'own-ref{n}-grid-inspection.local.png');print(n,im.size,box)
