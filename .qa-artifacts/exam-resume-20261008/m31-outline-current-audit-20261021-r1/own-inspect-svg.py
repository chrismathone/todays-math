from pathlib import Path
import xml.etree.ElementTree as E,json
P=Path('.qa-artifacts/exam-resume-20261008/m31-outline-current-audit-20261021-r1');root=E.parse(P/'own-rendered/n12.svg').getroot();print(json.dumps({'root':root.attrib,'labels':[x.attrib for x in root.iter() if 'data-label' in x.attrib],'otherText':[x.attrib for x in root.iter() if x.tag.endswith('text')]},ensure_ascii=False))
