"""Fixed-deployment packaged-base compiler; no caller file, URL or RDF imports."""
import json,re,hashlib,importlib.metadata,platform
from rdflib import Dataset,Graph,URIRef
from rdflib.namespace import RDF
from owlrl import DeductiveClosure,OWLRL_Semantics
from pyshacl import validate
from pathlib import Path
from compiler import ROOT,canonical,digest,HASH_KEYS,PROFILE

def load_base(source):
    if set(source)!={'format','baseHash','projectionHash','authorityDecisionId','scope'} or source['format']!='tm-packaged-source-1' or source['scope']!='global' or not re.fullmatch(r'urn:todaymath:[^\s<>"{}|\\^`]+',source['authorityDecisionId']):raise ValueError('Packaged source binding')
    catalog=json.loads((ROOT/'ontology/model/releases/catalog.json').read_text())
    if catalog['format']!='tm-base-catalog-1':raise ValueError('Fixed base catalog')
    entry=next((e for e in catalog['bases'] if e['baseHash']==source['baseHash'] and e['projectionHash']==source['projectionHash']),None)
    if not entry or not re.fullmatch(r'ontology/model/releases/[a-f0-9]{64}/base.json',entry['path']):raise ValueError('Base not deployed')
    raw=(ROOT/entry['path']).read_bytes()
    if len(raw)>2*1024*1024 or 'sha256:'+hashlib.sha256(raw).hexdigest()!=source['baseHash']:raise ValueError('Base hash')
    base=json.loads(raw)
    if base['format']!='tm-packaged-base-1' or base['projectionHash']!=source['projectionHash']:raise ValueError('Base projection')
    source_path='ontology/source-manifests/public-v1/'+source['projectionHash'][7:]+'/manifest.json'
    raw_source=(ROOT/source_path).read_bytes()
    if 'sha256:'+hashlib.sha256(raw_source).hexdigest()!=base['sourceManifestHash'] or json.loads(raw_source)!=base['sourceManifest']:raise ValueError('Source manifest hash')
    model=(ROOT/'ontology/model/tm-owlrl-1.ttl').read_text();rules=(ROOT/'ontology/rules/profile.json').read_text();shapes=canonical({'runtime':(ROOT/'ontology/shapes/runtime-core.ttl').read_text(),'full':(ROOT/'ontology/shapes/full.ttl').read_text()})
    if base['ontologyHash']!=digest(model) or base['profileHash']!=digest(rules) or base['shapesHash']!=digest(shapes):raise ValueError('Packaged policy mismatch')
    local=base['localValidation'];global_report=base['globalValidation'];coverage=base['coverage']
    if not local['complete'] or not global_report['complete'] or not all(global_report[k] is True for k in ('globalRawCycleConforms','globalClosureCycleConforms','globalCycleNegativeRejected')) or local['primaryFocus']!=coverage['entities']+coverage['sourceAssertions']:raise ValueError('Incomplete base validation')
    return base,model,rules,shapes

def entity_key(iri):
    match=re.fullmatch(r'urn:todaymath:math-source:entity:([a-z0-9-]+):global:(.+):version:[a-f0-9]{64}',iri)
    if not match:raise ValueError('Unregistered source entity identity')
    stable=iri.rsplit(':version:',1)[0]
    return match[1]+'/'+hashlib.sha256(stable.encode()).hexdigest()[0]

def source_registry(base,assertions):
    from partitions import read_artifact
    from compiler import TM
    manifest=base['sourceManifest'];wanted=set();keys=set()
    for a in assertions:
        for iri in (a['subject'],a['object']):
            if iri.startswith('urn:todaymath:math-source:entity:'):wanted.add(iri);keys.add(entity_key(iri))
        source=a['sourceRevision'];wanted.add(source)
        if source.startswith('urn:todaymath:math-source:entity:'):keys.add(entity_key(source))
        elif source.startswith('urn:todaymath:math-source:assertion:'):
            bucket=hashlib.sha256(source.encode()).hexdigest()[0]
            descriptor=next((d for d in manifest['assertionIndexes'] if d['path'].endswith('/'+bucket+'.index.gz')),None)
            if not descriptor:raise ValueError('Source assertion index absent')
            pairs=json.loads(read_artifact(ROOT,descriptor));key=next((v for k,v in pairs if k==source),None)
            if not key:raise ValueError('Source assertion absent')
            keys.add(key)
        else:raise ValueError('Unregistered source revision')
    if len(keys)>32:raise ValueError('Delta source partition budget')
    data=Dataset(default_union=True);total=0
    for key in sorted(keys):
        descriptor=next((p['nquads'] for p in manifest['partitions'] if p['key']==key),None)
        if not descriptor:raise ValueError('Source partition absent')
        raw=read_artifact(ROOT,descriptor);total+=len(raw)
        if total>128*1024*1024:raise ValueError('Delta source byte budget')
        shard=Dataset(default_union=True);shard.parse(data=raw,format='nquads')
        # A source assertion shape requires its original endpoints as well.
        for iri in list(wanted):
            for p in (RDF.subject,RDF.object):
                for endpoint in shard.objects(URIRef(iri),p):wanted.add(str(endpoint))
        for a,b,c,g in shard.quads():
            if str(a) in wanted:data.add((a,b,c,g))
    return data

def global_cycle_report(graph):
    from compiler import TM
    shapes=Graph().parse(ROOT/'ontology/shapes/full.ttl',format='turtle')
    ok,_,_=validate(graph,shacl_graph=shapes,inference='none',advanced=False,js=False,do_owl_imports=False,abort_on_first=True)
    if not ok:raise ValueError('Global SHACL cycle violation')
    return {'conforms':True,'incomplete':False,'engine':'pyshacl@0.40.1','partOfSubjectFocus':len(set(graph.subjects(TM.partOf,None)))}

def graph_hash(graph):
    from compiler import term
    h=hashlib.sha256()
    for line in sorted(' '.join(term(x) for x in triple)+' <urn:todaymath:graph:source-closure> .\n' for triple in graph):h.update(line.encode())
    return 'sha256:'+h.hexdigest()

def compile_global_delta(value,base,model_bytes,source):
    from partitions import read_artifact
    from compiler import check_input,assertion_graph,validate_graph,build_proofs
    if len(value['assertions'])>20:raise ValueError('Delta assertion budget')
    registry=source_registry(base,value['assertions']);check_input(value,registry)
    asserted,delta_premises=assertion_graph(value['assertions'])
    if sum(len(v) for v in delta_premises.values())!=len(value['assertions']):raise ValueError('Delta must have actual approved publication decisions')
    raw=Graph()
    for s,p,o,_ in registry.quads():raw.add((s,p,o))
    for t in asserted:raw.add(t)
    raw_report=validate_graph(raw,full=False)
    if not raw_report['conforms']:raise ValueError('Delta raw SHACL violation')
    signature=json.loads(read_artifact(ROOT,base['signature']))
    if signature['format']!='tm-global-signature-1' or signature['projectionHash']!=base['projectionHash']:raise ValueError('Global signature binding')
    logical=Graph();premises={};native_subjects={}
    for s,p,o,id in signature['premises']:
        triple=tuple(map(URIRef,(s,p,o)));logical.add(triple);premises.setdefault(triple,[]).append({'id':id,'scope':'global'});native_subjects[id]=s
    del signature
    if any(a['id'] in native_subjects for a in value['assertions']):raise ValueError('Native assertion identity reuse')
    for t,items in delta_premises.items():logical.add(t);premises.setdefault(t,[]).extend(items)
    raw_cycle=global_cycle_report(logical)
    model=Graph().parse(data=model_bytes,format='turtle');closure=Graph()
    for t in logical:closure.add(t)
    for t in model:closure.add(t)
    DeductiveClosure(OWLRL_Semantics,axiomatic_triples=False,datatype_axioms=False).expand(closure)
    if any(str(p)=='http://www.daml.org/2002/07/owl#error' or str(p)=='http://www.daml.org/2002/03/agents/agent-ont#error' for _,p,_ in closure):raise ValueError('Delta OWL inconsistency')
    closed_cycle=global_cycle_report(closure);closure_hash=graph_hash(closure)
    # Core metadata is unchanged and was validated for EVERY original focus in
    # the sealed base. Revalidate all delta/referenced original focuses and only
    # the relevant actual inferred types/relations here; global cycle is above.
    subjects=set(raw.subjects())
    for t in closure:
        if t[0] in subjects:raw.add(t)
    closed_report=validate_graph(raw,full=False)
    if not closed_report['conforms']:raise ValueError('Delta closure SHACL violation')
    all_proofs=build_proofs(model,premises,closure,'global');by_id={p['id']:p for p in all_proofs};delta_ids={a['id'] for a in value['assertions']}
    selected={p['id'] for p in all_proofs if delta_ids.intersection(p['assertionIds'])};queue=list(selected)
    while queue:
        for parent in by_id[queue.pop()]['premises']:
            if parent not in selected:selected.add(parent);queue.append(parent)
    if len(selected)>20000:raise ValueError('Delta proof expansion budget')
    proofs=[by_id[id] for id in sorted(selected)]
    required=set().union(*(set(p['assertionIds']) for p in proofs));native_required=required-delta_ids
    reviews={a['id']:a for a in value['assertions']};packets={}
    for id in sorted(native_required):
        subject=native_subjects.get(id)
        if not subject:raise ValueError('Missing native premise source')
        key=entity_key(subject)
        if key not in packets:
            descriptor=next((p['artifact'] for p in base['partitions'] if p['key']==key),None)
            if not descriptor:raise ValueError('Missing native proof partition')
            packet=json.loads(read_artifact(ROOT,descriptor));packets[key]={a['id']:a for a in packet['assertions']}
        template=packets[key].get(id)
        if not template or template['review']!='unreviewed' or template['publication']!='unpublished' or template['origin']!='source-projection':raise ValueError('Missing native review template')
        reviews[id]={**template,'review':'approved','publication':'published','approvalId':source['authorityDecisionId']}
    inferred=set(closure)-set(model)-set(premises);witnessed={tuple(map(URIRef,p['conclusion'])) for p in all_proofs if p['rule']!='asserted'}
    report={'raw':raw_report,'closure':closed_report,'globalRaw':raw_cycle,'globalClosure':closed_cycle,'globalClosureHash':closure_hash,'globalSignatureTriples':len(logical),'globalClosureTriples':len(closure),'engineInferred':len(inferred),'witnessedInferred':len(inferred&witnessed),'untracedInferred':len(inferred-witnessed),'deltaAssertions':len(delta_ids),'deltaProofsIncludingNativeDependencies':len(proofs)}
    return {'proofs':proofs,'reviews':sorted(reviews.values(),key=lambda a:a['id']),'report':report}

def compile_packaged(value):
    if set(value)!={'schemaVersion','profile','scope','registryNquads','assertions','sourceManifest'} or value['schemaVersion']!=1 or value['profile']!=PROFILE or value['scope']!='global' or value['registryNquads']!='':raise ValueError('Packaged compile contract')
    source=json.loads(value['sourceManifest']);base,model,rules,shapes=load_base(source)
    delta=compile_global_delta(value,base,model,source) if value['assertions'] else None
    engine=canonical({'compileInputHash':digest(canonical(value)), 'pythonVersion':platform.python_version(),'implementationHash':digest(Path(__file__).read_text()+ (ROOT/'scripts/ontology/compiler/compiler.py').read_text()),'packages':{name:importlib.metadata.version(name) for name in ('rdflib','owlrl','pyshacl')},'lock':(ROOT/'scripts/ontology/compiler/requirements.lock').read_text(),'baseHash':source['baseHash'],'actualGlobalClosureHash':base['globalValidation']['closureHash'],'actualProofHash':base['globalValidation']['proofHash']})
    report={'engine':'pyshacl@0.40.1','conforms':True,'incomplete':False,'focusNodeCount':base['coverage']['primaryFocus'],'basis':'hash-pinned actual offline full-focus reports; raw local Core and whole-global SHACL-SPARQL/OWL closure','localValidation':base['localValidation'],'globalValidation':base['globalValidation']}
    files={'source':value['sourceManifest'],'registry':canonical({'format':'tm-packaged-registry-1','baseHash':source['baseHash']}),'asserted':canonical({'format':'tm-packaged-asserted-1','baseHash':source['baseHash'],'signatureHash':base['globalValidation']['signatureHash']}),'closure':canonical({'format':'tm-packaged-closure-1','baseHash':source['baseHash'],'closureHash':base['globalValidation']['closureHash'],**({'afterDeltaClosureHash':delta['report']['globalClosureHash']} if delta else {})}),'review':canonical({'format':'tm-packaged-review-1','authorityDecisionId':source['authorityDecisionId'],'baseHash':source['baseHash'],'assertions':delta['reviews'] if delta else []}), 'ontology':model,'shapes':shapes,'rules':rules,'proof':canonical(delta['proofs']) if delta else '[]','engine':engine,'report':canonical({'raw':report,'closure':report,**({'delta':delta['report']} if delta else {})}),'coverage':canonical({'scope':'global',**base['coverage'],**({'engineInferred':delta['report']['engineInferred'],'witnessedInferred':delta['report']['witnessedInferred'],'untracedInferred':delta['report']['untracedInferred']} if delta else {})})}
    if len(canonical(files).encode())>8*1024*1024:raise ValueError('RELEASE_MANIFEST_BUDGET')
    unsigned={'schemaVersion':1,'profile':PROFILE,'hashes':{k:digest(files[k]) for k in HASH_KEYS}}
    return {'identity':{**unsigned,'graphVersion':digest(canonical(unsigned))},'files':files}
