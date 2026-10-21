from pathlib import Path
import importlib.util,json
P=Path(__file__).resolve().parent
inputs=[r'(2+\sqrt{5})\mathrm{cm}',r'x\mathrm{km/h}',r'60\mathrm{m/s}',r"\triangle AGG'\sim\triangle AEF",r'm+g+h',r'g(x)/h',r'\mathrm{A}/g',r'\mathrm{A}+g/h',r'\mathrm{A}x/g',r"\sim P",r"P'\sim Q",r"\sim f'(x)"]
rows=[]
for name in ['baseline','dropin']:
 s=importlib.util.spec_from_file_location(name,P/f'own-inputs/{name}.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);rows.append({'name':name,'outputs':[{ 'tex':t,'result':m.latex_to_hwpeq(t,italicize_stat=False)} for t in inputs]})
(P/'own-initial-conversion-probe.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(rows,ensure_ascii=False))
