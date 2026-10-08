"""Read-only local original scan rendering; only this evidence directory is writable."""
from pathlib import Path
import json
import hashlib
import fitz

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
audit=json.loads((ROOT/'.qa-artifacts/exam-resume-20261008/next-five-audit.json').read_text(encoding='utf-8'))
select={'gyeonggu':'(준희T)','gyeongsan':'(밍코)','gyeongsang':'(어수마러)',
        'gyeongsin':'(삼동)','gyeongam':'(쭌쭌)'}
out=[]
for exam in audit['exams']:
    slug=exam['legacyExtraction']['examId'].split('-')[1]
    path=next(Path(r['path']) for r in exam['sourceFiles']
              if not r['selectedForReference'] and select[slug] in Path(r['path']).name)
    source_hash=hashlib.sha256(path.read_bytes()).hexdigest()
    pages=[]
    with fitz.open(path) as doc:
        for i,page in enumerate(doc):
            target=HERE/slug/'evidence'/f'original-scan-page-{i+1:02}.png'
            target.parent.mkdir(parents=True,exist_ok=True)
            # Scale the actual PDF page to a readable <=1700px width, preserving rotation.
            scale=min(2.0,1700/page.rect.width)
            rotation=180 if slug=='gyeongsan' else 0
            page.get_pixmap(matrix=fitz.Matrix(scale,scale).prerotate(rotation)).save(str(target))
            pages.append({'page':i+1,'pageSizePt':list(page.rect),
                          'render':str(target.relative_to(HERE)),
                          'renderSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
                          'viewRotationDegrees':rotation,
                          'inAuthoringPacket':False,'viewed':False})
    out.append({'slug':slug,'sourcePath':str(path),'sourceSha256':source_hash,
                'pages':pages,'note':'Audit views only. Scan answer annotations, if present, must never be copied into the authoring packet.'})
(HERE/'scan-render-index.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Original scan paper renders',len(out),'pages',sum(len(x['pages']) for x in out))
