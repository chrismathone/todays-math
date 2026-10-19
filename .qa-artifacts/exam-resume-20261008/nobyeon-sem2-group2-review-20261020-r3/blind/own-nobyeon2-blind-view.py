from pathlib import Path
import fitz
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group2-review-20261020-r2/blind')
f=p/'own-nobyeon2-blind-utf8.txt';f.write_text('독립 풀이: 수선·거리·분산\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='독립 풀이: 수선·거리·분산\n'
for q in ('09','10'):
 d=fitz.open(stream=(p/f'figures/q{q}-1.svg').read_bytes(),filetype='svg');d[0].get_pixmap(matrix=fitz.Matrix(3,3)).save(str(p/f'own-nobyeon2-blind-q{q}-view.png'))
print('UTF8 roundtrip and SVG rendering passed')
