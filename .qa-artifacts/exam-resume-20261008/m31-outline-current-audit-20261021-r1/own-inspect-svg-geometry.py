from pathlib import Path
import xml.etree.ElementTree as E,json,collections
p=Path('.qa-artifacts/exam-resume-20261008/m31-outline-current-audit-20261021-r1/own-rendered/n12.svg');r=E.parse(p).getroot();print(json.dumps({'tags':dict(collections.Counter(x.tag.split('}')[-1] for x in r.iter())),'directGeometry':[{'tag':x.tag.split('}')[-1],'attrs':x.attrib} for x in r if 'data-label' not in x.attrib]},ensure_ascii=False))
