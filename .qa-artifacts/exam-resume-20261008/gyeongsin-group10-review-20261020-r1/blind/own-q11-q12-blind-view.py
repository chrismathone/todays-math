from pathlib import Path
import fitz
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group10-review-20261020-r1/blind')
probe=p/'own-q11-q12-blind-utf8.txt'
probe.write_text('UTF8 확인: 원주각과 접선의 길이\n',encoding='utf-8')
assert probe.read_text(encoding='utf-8')=='UTF8 확인: 원주각과 접선의 길이\n'
print((p/'SOLVE-BRIEF.md').read_text(encoding='utf-8-sig'))
for q in (11,12):
 d=fitz.open(stream=(p/f'figures/q{q}-1.svg').read_bytes(),filetype='svg')
 d[0].get_pixmap(matrix=fitz.Matrix(3,3)).save(str(p/f'own-q11-q12-blind-q{q}-view.png'))
print('UTF8 roundtrip and two SVG renders completed')
