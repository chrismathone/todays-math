"""Actual readonly source extraction. Parsed source is quarantined until visual review.

Uses captured positional readers without legacy hand corrections, answer export,
DB access or writing original/dependency files. Each invocation needs a new output.
"""
import argparse,collections,datetime,hashlib,importlib.util,json,pathlib,sys
import fitz
sys.dont_write_bytecode=True
sys.stdout.reconfigure(encoding='utf-8')
root=pathlib.Path.cwd().resolve()
base=root/'.qa-artifacts/exam-resume-20261008'
inventory=pathlib.Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
reader_source=root.parent/'exam-twin-next-five-20261008/.qa-artifacts/exam-resume-20261008/next-five-extraction-r1/extract_source.py'
converter_source=root/'scripts/qa/convert-hwp-spans.py'
pdf_source=pathlib.Path('D:/시험지 한글화/db/textlayer.py')
schools={'neungin':'능인중','daegok':'대곡중','daegudong':'대구동중'}
sha=lambda data:hashlib.sha256(data).hexdigest()
def reference(p):
 p=pathlib.Path(p);raw=p.read_bytes();return {'path':str(p),'sha256':sha(raw),'bytes':len(raw)}
def load_module(p,name):
 spec=importlib.util.spec_from_file_location(name,p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def write(p,value):
 p=pathlib.Path(p);assert p.resolve().is_relative_to(output)
 p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x',encoding='utf-8',newline='\n') as file:file.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
parser=argparse.ArgumentParser()
parser.add_argument('--out',required=True)
parser.add_argument('--slugs',nargs='+',choices=schools,default=list(schools))
args=parser.parse_args()
output=(base/args.out).resolve();assert output.is_relative_to(base.resolve()) and not output.exists()
output.mkdir();tools=output/'tool-evidence';tools.mkdir()
modules=[]
for name,source in [('positional-source-reader.py',reader_source),('hwp-formula-converter.py',converter_source),('pdf-textlayer.py',pdf_source)]:
 raw=source.read_bytes();(tools/name).write_bytes(raw);modules.append({**reference(source),'capturedCopy':str((tools/name).relative_to(output))})
reader=load_module(reader_source,'captured_source_readonly')
# Keep each existing tool's __file__ context: converter imports adjacent tc_paths
# and textlayer reads adjacent pua_table.json. Captured copies are byte evidence,
# not standalone replacements for those dependency contexts.
converter=load_module(converter_source,'captured_hwp_converter_readonly')
extractor=load_module(pdf_source,'captured_pdf_readonly')
for name in ['tc_paths','hwpeq_unglue','core.hwpeq_to_latex']:
 dependency=pathlib.Path(sys.modules[name].__file__)
 modules.append({**reference(dependency),'role':'actual-context-dependency'})
modules.append({**reference(pdf_source.parent/'pua_table.json'),'role':'actual-pdf-character-map'})
reader.HERE=output;reader.ROOT=root
jobs=json.loads(inventory.read_text('utf-8-sig'))['jobs']
entries=[]
for slug in args.slugs:
 job=next(j for j in jobs if j['school']==schools[slug] and j['grade']==3 and j['year']==2025 and j['semester']==2 and j['round']=='중간')
 assert job['status']=='readyForExtraction' and job['selectedPair']
 folder=output/slug;folder.mkdir()
 hwp_path=pathlib.Path(job['selectedHwp']);pdf_path=pathlib.Path(job['selectedPdf'])
 inputs=[reference(hwp_path),reference(pdf_path)]
 originals=[reference(f['path']) for f in job['files'] if f['role']=='원본' and f['ext'].lower()=='pdf']
 write(folder/'selected-source-inputs.json',{'inventory':reference(inventory),'inventoryExamId':job['examId'],'school':job['school'],'nominalYear':2025,'grade':3,'semester':2,'round':'중간','inventoryStatusHistorical':job['status'],'currentDbDedup':False,'selectedPairNotContentApproval':True,'selected':inputs,'originalReferences':originals})
 try:
  hwp=reader.HwpReader(hwp_path)
  questions=[reader.normalize_hwp(q,converter,{'hand':[]}) for q in reader.organize_shared_sources(hwp.questions())]
  # No existing exam.json/key/solution is loaded. A question-only fresh PDF parse.
  pdf=extractor.extract(pdf_path)
  with fitz.open(pdf_path) as doc:
   answer_start,positions=reader.pdf_question_positions(doc,extractor,len(questions))
   assert len(pdf['questions'])==len(questions),'HWP/PDF count differs; no completeness certification'
   pages=[]
   for n in range(answer_start):
    p=folder/'reviewer-only'/f'completed-page-{n+1:02}.png';p.parent.mkdir(exist_ok=True)
    doc[n].get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(p)
    pages.append({'page':n+1,'path':str(p.relative_to(output)),'sha256':sha(p.read_bytes()),'viewedByReviewer':False,'notAuthorApproved':True})
   headers=[{'page':n+1,'header':extractor.decode(doc[n].get_text(clip=fitz.Rect(0,0,doc[n].rect.width,105))),'footer':extractor.decode(doc[n].get_text(clip=fitz.Rect(0,doc[n].rect.height-88,doc[n].rect.width,doc[n].rect.height)))} for n in range(answer_start)]
   for question,position in zip(questions,positions):
    question['newSourceReferenceId']=f'source-ref-2025-{slug}-3-2-mid-r1-q{question["number"]:02}'
    question['pdfReference']={'source':inputs[1],**position,'freshParserQuestion':next(q for q in pdf['questions'] if q['number']==question['number'])}
    question['figureCorrespondence']=reader.bitmap_correspondence(hwp,doc,position['regions'])
    question['questionPageCrops']=[]
    for n,region in enumerate(position['regions']):
     p=folder/'quarantined-question-crops'/f'q{question["number"]:02}-part{n+1}.png';p.parent.mkdir(exist_ok=True)
     doc[region['page']-1].get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(region['bbox'])).save(p)
     question['questionPageCrops'].append({'path':str(p.relative_to(output)),'sha256':sha(p.read_bytes()),**region})
    question['sourceReview']={'status':'pending_actual_whole_question_visual_comparison','sourceIdentity':'pending_original_printed_header','wholeExamPairCertified':False,'gradeApproval':False,'rightsApproval':False,'authorDistributionAllowed':False}
   original_headers=[]
   for n,source in enumerate(originals):
    with fitz.open(source['path']) as original:
     p=folder/'reviewer-only'/f'original-{n+1:02}-first-page.png'
     original[0].get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(p)
     original_headers.append({'source':source,'pdfPages':len(original),'path':str(p.relative_to(output)),'sha256':sha(p.read_bytes()),'firstPageExtractedText':original[0].get_text(),'reviewerOnlyMayContainHandwritingOrAnswers':True,'viewedByReviewer':False})
  assert all(reference(p)['sha256']==before['sha256'] for p,before in [(hwp_path,inputs[0]),(pdf_path,inputs[1])])
  manifest={'kind':'quarantined-fresh-source-extraction/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'examId':f'2025-{slug}-3-2-mid','inventoryExamId':job['examId'],'sourceSchool':job['school'],'nominalYear':2025,'grade':3,'semester':2,'round':'중간','inputs':inputs,'hwpHeadersFooters':hwp.headers,'pdfHeadersFooters':headers,'originalFirstPageEvidence':original_headers,'hwpSections':hwp.sections,'excludedNotes':hwp.excluded,'unknownControls':hwp.unknown,'questionCountHwp':len(questions),'questionCountPdf':len(pdf['questions']),'questionOnlyPages':pages,'answerPageFirstOneBased':answer_start+1,'questions':questions,'legacyHandCorrectionsUsed':False,'originalAnswersExported':False,'questionComponentsApproved':0,'identityYearApproved':False,'wholeExamPairCertified':False,'curriculumProposal':'2015 only if actual2025 middle3 confirmed; not item approval','wholeGradeApprovals':0,'rightsApprovals':0,'newTwins':0,'dbWrites':0,'authorDistributionAllowed':False,'quarantineReason':'Actual per-item figure/choice/text/score and original school/year/header comparison pending; formula membership and matching counts never approve.'}
  write(folder/'source-manifest.json',manifest)
  entry={'slug':slug,'inventoryExamId':job['examId'],'status':'fresh-parsed-quarantined','hwpParents':len(questions),'pdfParents':len(pdf['questions']),'unknownControls':len(hwp.unknown),'endnotesWithheld':len(hwp.excluded),'manifest':reference(folder/'source-manifest.json'),'identityYearApproved':False,'questionComponentsApproved':0,'newTwins':0}
  print(json.dumps({k:v for k,v in entry.items() if k!='manifest'},ensure_ascii=False),flush=True)
 except Exception as error:
  entry={'slug':slug,'inventoryExamId':job['examId'],'status':'individual-source-hold','errorType':type(error).__name__,'error':str(error),'newTwins':0,'doesNotBlockOtherSources':True}
  write(folder/'extraction-hold.json',entry);print(json.dumps(entry,ensure_ascii=False),flush=True)
 entries.append(entry)
write(output/'extraction-attempt-index.json',{'kind':'next-three-source-actual-attempt/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inventory':reference(inventory),'tools':modules,'sourceMetadataOnly':True,'entries':entries,'actualParsedParents':sum(e.get('hwpParents',0) for e in entries),'questionComponentsApproved':0,'newTwins':0,'dbWrites':0,'all2025SourcesExtracted':False})
