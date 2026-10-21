from pathlib import Path
import xml.etree.ElementTree as ET

p = Path(__file__).resolve().parent / 'native-once/beta-9.svg'
root = ET.fromstring(p.read_bytes())
def walk(el):
    if el.tag.rsplit('}',1)[-1] == 'defs' or 'data-label' in el.attrib:
        return
    tag = el.tag.rsplit('}',1)[-1]
    if tag == 'line' or (tag == 'path' and 'A' in el.attrib.get('d','')):
        print(tag, el.attrib)
    for c in el:
        walk(c)
print('viewBox', root.attrib.get('viewBox'))
walk(root)
