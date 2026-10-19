from pathlib import Path
import fitz,json
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group11-review-20261020-r1/blind')
f=p/'own-q13-q17-blind-utf8.txt';f.write_text('학생 그림 확인·정확 계산\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='학생 그림 확인·정확 계산\n'
for q in range(13,18):
 d=fitz.open(stream=(p/f'figures/q{q}-1.svg').read_bytes(),filetype='svg');d[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(str(p/f'own-q13-q17-blind-q{q}-view.png'))
print('UTF8 roundtrip and five SVG renders passed')
