"""Copy whitelisted student inputs byte-for-byte; render local SVGs at print widths."""
from pathlib import Path
import hashlib
import json
import shutil
import sys
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding="utf-8")
SCOPE=Path(__file__).resolve().parent
OWN=SCOPE.parents[2]
PARENT=OWN.parent/'exam-extraction-resume-20261008'
QA=Path('.qa-artifacts/exam-resume-20261008')
SRC=PARENT/QA/'gyeonggu-review-r1/blind'
BLIND=SCOPE/'blind'


def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(name,data):
    p=SCOPE/name
    assert p.resolve().is_relative_to(SCOPE)
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def prepare():
    assert not (BLIND/'student-problems.json').exists(),'Preserve existing copied inputs; no overwrite'
    old=OWN/QA/'bumil-q07-curriculum-adjudication-r1/preservation-baseline.json'
    rows=json.loads(old.read_text(encoding='utf-8'))
    mismatches=[x['path'] for x in rows if not Path(x['path']).is_file() or sha(x['path'])!=x['sha256']]
    own_q07=OWN/QA/'bumil-q07-curriculum-adjudication-r1'
    extra=[{'path':p.as_posix(),'sha256':sha(p),'kind':'immutable_completed_q07_adjudication'} for p in sorted(own_q07.rglob('*')) if p.is_file()]
    report=OWN/'docs/planning/tracks/reports/bumil-q07-curriculum-adjudication-r1-20261008.md'
    extra.append({'path':report.as_posix(),'sha256':sha(report),'kind':'immutable_completed_q07_adjudication'})
    save('preservation-baseline.json',{'prior2089':rows,'newQ07Evidence':extra,'preexistingExternalDifferences':mismatches,
        'mode':'byte hashes only; no answer-bearing file decoding; no Gyeonggu private files read'})
    BLIND.mkdir(parents=True,exist_ok=True)
    p=SRC/'student-problems.json'
    shutil.copyfile(p,BLIND/p.name)
    data=json.loads((BLIND/p.name).read_text(encoding='utf-8'))
    assert [x['questionNumber'] for x in data]==[*range(1,20),21,22,23]
    copied=[{'sourcePath':p.as_posix(),'ownedPath':(BLIND/p.name).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size}]
    seen=set()
    for q in data:
        assert len(q['studentDigest'])==64
        assert not set(q)&{'answer','solution','figureSpec','private','authorChecks'}
        for f in q['figures']:
            rel=Path(f['svgPath']);src=SRC/rel;dest=BLIND/rel
            assert src.resolve().is_relative_to((SRC/'figures').resolve()) and rel.suffix=='.svg'
            assert sha(src)==f['sha256']
            assert f['intendedWidthMm']==(55 if q['questionNumber']==11 else 70)
            assert rel.as_posix() not in seen
            seen.add(rel.as_posix());dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(src,dest)
            assert sha(dest)==f['sha256']
            copied.append({'questionNumber':q['questionNumber'],'sourcePath':src.as_posix(),'ownedPath':dest.as_posix(),
                           'sha256':sha(dest),'bytes':dest.stat().st_size,'intendedWidthMm':f['intendedWidthMm']})
    assert len(seen)==20
    save('input-manifest.json',{'wholeStudentInputSha256':sha(BLIND/'student-problems.json'),'files':copied,
        'allCopiedByteIdentically':all(sha(x['sourcePath'])==sha(x['ownedPath']) for x in copied),
        'candidateAnswerExposure':False,'otherSolverRead':False,
        'disclosure':'Prior original exam source familiarity is possible and earlier Bumil scan annotations were incidentally seen. No Gyeonggu original/source/keys were reopened; these new candidate answers, authored solutions and other solver results were not read. Work proceeds solely from copied new student inputs.',
        'inputBoundary':'Only Root gyeonggu-review-r1/blind/student-problems.json and its referenced student SVGs were parsed. Old preservation files were hash-read without decoding answers.',
        'forbiddenInputsRead':[]})
    print('Copied 22 student questions / 20 SVGs; student SHA',sha(BLIND/'student-problems.json'))
    print('Old 2089 mismatches at entry:',mismatches)


def render():
    import fitz
    data=json.loads((BLIND/'student-problems.json').read_text(encoding='utf-8'))
    rows=[]
    for q in data:
        for f in q['figures']:
            p=BLIND/f['svgPath'];xml=ET.fromstring(p.read_bytes())
            vb=[float(x) for x in xml.get('viewBox').replace(',',' ').split()]
            width=f['intendedWidthMm'];height=width*vb[3]/vb[2]
            raw=p.read_text(encoding='utf-8')
            assert '<script' not in raw.lower() and 'http' not in raw.replace('http://www.w3.org/2000/svg','')
            # The PDF records physical 70/55mm size; 300dpi PNG is the inspection rendering.
            # Normalize only a temporary render copy; original SVG bytes stay unchanged.
            xml.set('width',f'{width}mm');xml.set('height',f'{height}mm')
            normalized=ET.tostring(xml,encoding='utf-8')
            stem=p.stem;png=SCOPE/'blind/rendered'/f'{stem}-300dpi.png';pdf=png.with_suffix('.pdf')
            png.parent.mkdir(exist_ok=True)
            # Cairo's native runtime is absent. Existing MuPDF converts SVG without installs.
            with fitz.open(stream=normalized,filetype='svg') as svgdoc:
                pdfbytes=svgdoc.convert_to_pdf()
            with fitz.open(stream=pdfbytes,filetype='pdf') as vector:
                outdoc=fitz.open()
                page=outdoc.new_page(width=width/25.4*72,height=height/25.4*72)
                page.show_pdf_page(page.rect,vector,0)
                outdoc.save(str(pdf))
                page.get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False).save(str(png))
                outdoc.close()
            with fitz.open(str(pdf)) as doc:
                physical=doc[0].rect.width/72*25.4
                assert abs(physical-width)<0.01
            labels=[]
            for node in xml.iter():
                if node.tag.rsplit('}',1)[-1]=='text':labels.append(''.join(node.itertext()))
            rows.append({'questionNumber':q['questionNumber'],'svg':f['svgPath'],'svgSha256':sha(p),
                'intendedWidthMm':width,'renderedPdfWidthMm':physical,'renderedHeightMm':height,'viewBox':vb,
                'png':png.relative_to(SCOPE).as_posix(),'pngSha256':sha(png),
                'pdf':pdf.relative_to(SCOPE).as_posix(),'pdfSha256':sha(pdf),'svgTextLabels':labels,
                'mathematicalOracle':False,'renderer':'Existing PyMuPDF SVG->vector PDF at physical width->300dpi PNG; Cairo runtime absent; no installs',
                'visualInspection':'awaiting direct view_image; rendering metadata is not visual approval'})
    save('render-manifest.json',rows)
    print('Rendered 20 SVGs at actual PDF physical widths; 300dpi PNGs for direct inspection')


if __name__=='__main__':{'prepare':prepare,'render':render}[sys.argv[1]]()
