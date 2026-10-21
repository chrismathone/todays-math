"""Small stdlib regression suite. Execute copied converter, never external checkout."""
import importlib.util, argparse, json
from pathlib import Path
PRIMARY=[(r'(2+\sqrt{5})\mathrm{cm}','LEFT ( 2+sqrt {5} RIGHT ) rm`cm'),(r'x\mathrm{km/h}','x rm`km/h'),(r'60\mathrm{m/s}','60 rm {m/s}'),(r"\triangle AGG'\sim\triangle AEF", "TRIANGLE rm {AGG'}∽ TRIANGLE rm {AEF}")]
CONTEXT=[('m+g+h','m+g+h'),('g(x)/h','g(x)/h'),(r'\mathrm{A}/g','rm A it /g'),(r'\mathrm{A}+g/h','rm A it +g/h'),(r'\mathrm{A}x/g','rm A it x/g'),(r'\sim P','∼P'),(r"\sim f'(x)","∼f'(x)"),(r"P'\sim Q","P'∽ Q"),(r'20\mathrm{m}','20 rm {m}'),(r'20\mathrm{g}','20 rm`g'),(r'100\mathrm{mL}','100 rm`mL'),('100mL','100 rm`mL'),(r'50\mathrm{dL}','50 rm`dL'),(r'12\mathrm{cm}','12 rm`cm'),('2m','2m'),(r'\overline{AL}','bar {rm {AL}}'),(r'\mathrm{A}/x','rm A it /x'),(r'\left\{ \frac{x}{2} \right.','LEFT { {x} over {2} RIGHT .'),(r'\left. \frac{x}{2} \right\}','LEFT . {x} over {2} RIGHT }'),(r'\left( \frac{x}{2} \right)','LEFT ( {x} over {2} RIGHT )'),(r'\left. \frac{x}{2} \right.','{x} over {2}'),(r'\cfrac{1}{2}','{1} over {2}'),(r'\dfrac{1}{2}','{1} over {2}'),(r'8\sqrt{3}\mathrm{cm}^{2}','8 sqrt {3} rm`cm^{2}')]
def run(module,primary=False):
 s=importlib.util.spec_from_file_location('copied_converter',module);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
 rows=[]
 for t,expected in PRIMARY+([] if primary else CONTEXT):
  actual=m.latex_to_hwpeq(t,italicize_stat=False);rows.append(dict(input=t,expected=expected,actual=actual,passed=actual==expected))
 return rows
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--module',required=True);a.add_argument('--output',required=True);a.add_argument('--primary',action='store_true');args=a.parse_args();r=run(args.module,args.primary);Path(args.output).write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(f'{sum(x["passed"] for x in r)}/{len(r)} passed');raise SystemExit(any(not x['passed'] for x in r))
