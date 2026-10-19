from pathlib import Path
import fitz
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group3-review-20261020-r1/blind');f=p/'own-nobyeon3-blind-utf8.txt';f.write_text('중앙값·최빈값·산점도 독립풀이\n',encoding='utf-8');assert f.read_text(encoding='utf-8')=='중앙값·최빈값·산점도 독립풀이\n'
records={'A':[2,4,3,6,7],'B':[3,5,6,5,8],'C':[9,7,8,4,3],'D':[1,2,4,3,6],'E':[4,3,6,8,7]}
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="240" viewBox="0 0 1000 240"><rect width="1000" height="240" fill="white"/>']
for i,(label,ys) in enumerate(records.items()):
 o=200*i;svg.append(f'<text x="{o+90}" y="20" font-size="18">{label}</text><path d="M{o+25} 35 V210 H{o+185}" fill="none" stroke="black"/>')
 for x,y in enumerate(ys,1):svg.append(f'<circle cx="{o+25+30*x}" cy="{210-17*y}" r="4" fill="black"/><text x="{o+22+30*x}" y="228" font-size="12">{x}</text>')
svg.append('</svg>');f=p/'own-nobyeon3-blind-scatter.svg';f.write_text(''.join(svg),encoding='utf-8');d=fitz.open(stream=f.read_bytes(),filetype='svg');d[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(str(p/'own-nobyeon3-blind-scatter.png'));print('UTF8 probe and own scatter plots passed')
