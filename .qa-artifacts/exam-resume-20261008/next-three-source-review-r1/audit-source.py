"""Read-only source custody/record audit and reviewer-only local previews.
No answers are extracted; raster previews stay reviewer-only, never author inputs.
"""
import hashlib, json, pathlib, struct, zlib, sys
import fitz, olefile
from PIL import Image, ImageDraw
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent
PARENT = pathlib.Path(r'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008/next-three-extraction-r1-attempt2')
SCHOOLS = ['gyeongilyeo', 'gyeseong', 'nobyeon']
def sha(b): return hashlib.sha256(b).hexdigest()
def write(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def records(data):
    result=[]; off=0
    while off<len(data):
        start=off; h=struct.unpack_from('<I',data,off)[0];off+=4
        size=h>>20
        if size==0xfff: size=struct.unpack_from('<I',data,off)[0];off+=4
        result.append({'recordIndex':len(result),'offset':start,'tag':h&1023,'level':(h>>10)&1023,'payloadSha256':sha(data[off:off+size]),'size':size})
        off+=size
    assert off==len(data)
    return result
audit={'schemaVersion':1,'scope':'independent-source-custody-and-components','schools':[], 'noOriginalAnswersUsed':True}
for school in SCHOOLS:
    manifest_path=PARENT/school/'source-manifest.json'
    m=json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    inputs=json.loads((PARENT/school/'selected-source-inputs.json').read_text(encoding='utf-8-sig'))
    entry={'schoolKey':school,'manifestSha256':sha(manifest_path.read_bytes()),'inputs':[], 'sections':[], 'originalAlternatives':[], 'questions':[]}
    for src in inputs['selected']+inputs['originalReferences']:
        b=pathlib.Path(src['path']).read_bytes()
        entry['inputs'].append({'path':src['path'],'sha256':sha(b),'bytes':len(b),'matchesManifest':sha(b)==src['sha256'] and len(b)==src['bytes']})
        assert entry['inputs'][-1]['matchesManifest']
    with olefile.OleFileIO(inputs['selected'][0]['path']) as ole:
        allrecords={}
        for sec in m['hwpSections']:
            compressed=ole.openstream(sec['stream']).read(); data=zlib.decompress(compressed,-15)
            rs=records(data);allrecords[sec['stream']]=rs
            e={'stream':sec['stream'],'compressedSha256':sha(compressed),'inflatedSha256':sha(data),'recordCount':len(rs)}
            e['matchesManifest']=all(e[k]==sec[k] for k in ['compressedSha256','inflatedSha256','recordCount']);assert e['matchesManifest'];entry['sections'].append(e)
        for q in m['questions']:
            checks=[]
            def walk(obj):
                if isinstance(obj,dict):
                    if 'recordIndex' in obj and ('stream' in obj or 'streamBodyText' in obj):
                        stream=obj.get('stream',obj.get('streamBodyText'));rs=allrecords[stream];actual=rs[obj['recordIndex']]
                        matching={k:actual[k]==obj[k] for k in ['tag','level','payloadSha256'] if k in obj}
                        offset=obj.get('offset',obj.get('inflatedByteOffset'))
                        if offset is not None: matching['offset']=actual['offset']==offset
                        checks.append({'stream':stream,'recordIndex':obj['recordIndex'],'checks':matching})
                    for value in obj.values():walk(value)
                elif isinstance(obj,list):
                    for v in obj:walk(v)
            for field in ['hwpAnchor','positionedSourceItems','mathExpressions','hwpFigureRecords']:
                walk(q[field])
            assert all(all(c['checks'].values()) for c in checks)
            crops=[]
            for crop in q['questionPageCrops']:
                actual=sha((PARENT/pathlib.Path(crop['path'])).read_bytes());assert actual==crop['sha256']
                crops.append({**crop,'shaMatches':True})
            entry['questions'].append({'number':q['number'],'sourceContentDigest':q['sourceContentDigest'],'anchorChecks':checks,'cropChecks':crops,'unknownControlsCount':len(q['unmappedItems'])})
    # Render originals; these preserve incidental handwriting and notices and are reviewer-only.
    for n, src in enumerate(inputs['originalReferences'],1):
        doc=fitz.open(src['path']);alt={'alternative':n,'sha256':src['sha256'],'pageCount':len(doc),'pages':[]}
        for pn,page in enumerate(doc,1):
            pix=page.get_pixmap(matrix=fitz.Matrix(1.35,1.35),alpha=False)
            path=ROOT/'reviewer-only'/school/f'original-{n:02d}-page-{pn:02d}.png';path.parent.mkdir(parents=True,exist_ok=True);pix.save(path)
            alt['pages'].append({'page':pn,'width':pix.width,'height':pix.height,'pixelSha256':sha(pix.samples),'pngSha256':sha(path.read_bytes()),'path':str(path.relative_to(ROOT)).replace('\\','/'),'notAuthorInput':True})
        entry['originalAlternatives'].append(alt)
    # Four question-only parser crops per local contact sheet, with full raw credits retained as quarantine.
    qs=m['questions']
    for start in range(0,len(qs),4):
        selected=qs[start:start+4];ims=[]
        for q in selected:
            paths=q['questionPageCrops']
            sourceims=[Image.open(PARENT/c['path']).convert('RGB') for c in paths]
            w=max(i.width for i in sourceims);h=sum(i.height for i in sourceims)
            im=Image.new('RGB',(w,h+32),'white');draw=ImageDraw.Draw(im);draw.text((6,6),f'{school} q{q["number"]:02d}',fill='black')
            y=32
            for srcim in sourceims: im.paste(srcim,(0,y));y+=srcim.height
            im.thumbnail((650,1300));ims.append(im)
        cols=2;cw=max(i.width for i in ims);ch=max(i.height for i in ims)
        canvas=Image.new('RGB',(2*cw,2*ch),'white')
        for i,im in enumerate(ims):canvas.paste(im,((i%2)*cw,(i//2)*ch))
        dest=ROOT/'reviewer-only'/school/f'completed-q{selected[0]["number"]:02d}-q{selected[-1]["number"]:02d}.png';canvas.save(dest)
    audit['schools'].append(entry)
write(ROOT/'custody-record-audit.json',audit)
print(json.dumps({'schools':len(audit['schools']),'questions':sum(len(s['questions']) for s in audit['schools']),'inputHashesPass':True,'recordAnchorsPass':True,'sourceApprovals':0}))
