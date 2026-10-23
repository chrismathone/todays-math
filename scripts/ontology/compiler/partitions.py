"""Offline pinned-source validation; all metadata foci, one global OWL signature.

Shard equivalence is limited to declared local Core constraints. partOf cycle and
OWL entailment are evaluated on the UNION of all eligible semantic premises.
No source is reviewed/approved by this measurement command.
"""
import argparse,gzip,json,hashlib,time,resource,os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from rdflib import Dataset,Graph,URIRef,Literal
from rdflib.namespace import RDF,SH,XSD
from pyshacl import validate
from owlrl import DeductiveClosure,OWLRL_Semantics
from compiler import ROOT,TM,SOURCE_KINDS,canonical,digest,graph_bytes,build_proofs,validate_graph

def bytehash(data):return 'sha256:'+hashlib.sha256(data).hexdigest()
def read_artifact(root,d):
    relative=Path(d['path'])
    if relative.is_absolute() or '..' in relative.parts or not str(relative).startswith(('ontology/source-manifests/public-v1/','ontology/model/releases/')):raise ValueError('Untrusted artifact path')
    compressed=(root/relative).read_bytes()
    if len(compressed)!=d['bytes'] or bytehash(compressed)!=d['byteHash']:raise ValueError('Compressed artifact hash mismatch')
    # Read at most the signed declared size; never unbounded gzip.decompress.
    import io
    with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as stream:raw=stream.read(d['rawBytes']+1)
    if len(raw)!=d['rawBytes'] or len(raw)>64*1024*1024 or bytehash(raw)!=d['rawByteHash']:raise ValueError('Raw artifact hash mismatch')
    return raw

def validate_partition(args):
    root,p,projection_hash=args;start=time.perf_counter()
    raw=read_artifact(Path(root),p['nquads']);projection=json.loads(read_artifact(Path(root),p['projection']))
    if projection['key']!=p['key'] or projection['projectionHash']!=projection_hash:raise ValueError('Projection binding')
    graph=Dataset(default_union=True);graph.parse(data=raw,format='nquads')
    foci=[URIRef(x) for x in projection['primaryEntityIris']+projection['primaryAssertionIris']]
    if len(foci)!=p['primaryEntities']+p['primaryAssertions']:raise ValueError('Focus count')
    for entity in projection['entities']:
        graph.add((URIRef(entity['iri']),RDF.type,URIRef(SOURCE_KINDS[entity['kind']]['classIri'])))
    shapes=Graph().parse(ROOT/'ontology/shapes/runtime-core.ttl',format='turtle')
    conforms,report,_=validate(graph,shacl_graph=shapes,inference='none',advanced=False,js=False,do_owl_imports=False,focus_nodes=foci)
    results=[]
    for r in report.subjects(RDF.type,SH.ValidationResult):results.append({'focus':str(report.value(r,SH.focusNode)),'component':str(report.value(r,SH.sourceConstraintComponent)),'path':str(report.value(r,SH.resultPath))})
    return {'key':p['key'],'conforms':bool(conforms),'primaryEntities':p['primaryEntities'],'primaryAssertions':p['primaryAssertions'],'uniquePrimaryFocus':len(set(foci)),'dependencyEntities':p['dependencyEntities'],'quads':len(graph),'seconds':time.perf_counter()-start,'maxRss':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'report':sorted(results,key=canonical)}

def run(root,manifest_path,pin,out,workers=1,limit=None):
    started=time.perf_counter();out.mkdir(parents=True,exist_ok=True)
    manifest_bytes=manifest_path.read_bytes()
    if bytehash(manifest_bytes)!=pin:raise ValueError('Manifest pin')
    m=json.loads(manifest_bytes);parts=m['partitions'][:limit]
    if m['format']!='math-source-partitions-1':raise ValueError('Unsupported manifest')
    # Validate the actual shape graph once independently before applying it.
    shape=Graph().parse(ROOT/'ontology/shapes/runtime-core.ttl',format='turtle')
    validate(Graph(),shacl_graph=shape,meta_shacl=True,inference='none',js=False,do_owl_imports=False)
    receipts=[]
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for receipt in pool.map(validate_partition,[(str(root),p,m['projectionHash']) for p in parts],chunksize=1):
            receipts.append(receipt)
            with (out/'shacl-progress.jsonl').open('a') as f:f.write(canonical(receipt)+'\n')
            print(canonical({'completed':len(receipts),'total':len(parts),'key':receipt['key'],'conforms':receipt['conforms'],'seconds':receipt['seconds']}),flush=True)
            if not receipt['conforms']:raise ValueError('Actual SHACL validation failed')
    summary={'manifestHash':pin,'projectionHash':m['projectionHash'],'complete':limit is None,'partitionCount':len(parts),'primaryEntities':sum(x['primaryEntities'] for x in receipts),'primaryAssertions':sum(x['primaryAssertions'] for x in receipts),'primaryFocus':sum(x['uniquePrimaryFocus'] for x in receipts),'localConstraints':'runtime-core including native-kind shapes; globally nonlocal constraints excluded here','seconds':time.perf_counter()-started,'workerMaxRss':max(x['maxRss'] for x in receipts),'receiptsHash':digest(canonical(receipts))}
    (out/'shacl-summary.json').write_text(canonical(summary)+'\n');return summary

def global_signature(root,manifest_path,pin,out):
    started=time.perf_counter();out.mkdir(parents=True,exist_ok=True)
    if bytehash(manifest_path.read_bytes())!=pin:raise ValueError('Manifest pin')
    manifest=json.loads(manifest_path.read_text());rules=json.loads((ROOT/'ontology/rules/profile.json').read_text())
    model=Graph().parse(ROOT/'ontology/model/tm-owlrl-1.ttl',format='turtle')
    logical=Graph();premises={};entities=set();assertions=set();excluded={};by_kind={};counts={}
    def premise(triple,id):
        logical.add(triple);premises[triple]=[{'id':id,'scope':'global'}]
    for p in manifest['partitions']:
        d=json.loads(read_artifact(root,p['projection']))
        if d['projectionHash']!=manifest['projectionHash']:raise ValueError('Projection hash')
        primary=set(d['primaryEntityIris']);primary_a=set(d['primaryAssertionIris'])
        if entities.intersection(primary) or assertions.intersection(primary_a):raise ValueError('Repeated primary')
        entities.update(primary);assertions.update(primary_a)
        for e in d['entities']:
            if e['iri'] not in primary:continue
            by_kind[e['kind']]=by_kind.get(e['kind'],0)+1
            triple=(URIRef(e['iri']),RDF.type,URIRef(SOURCE_KINDS[e['kind']]['classIri']))
            premise(triple,'urn:todaymath:assertion:source-type:'+hashlib.sha256(e['iri'].encode()).hexdigest())
        for a in d['assertions']:
            if a['iri'] not in primary_a:raise ValueError('Nonprimary assertion')
            policy=rules['sourcePolicy'][a['predicate']]
            eligible=policy['queryLocation']=='approved-source-projection' and a['originKind']=='source-projection' and a['supportKind']=='direct-source-structure' and a['evidenceKind']=='observed' and a['partial'] is False
            if not eligible:
                excluded[a['predicate']]=excluded.get(a['predicate'],0)+1;continue
            counts[a['predicate']]=counts.get(a['predicate'],0)+1
            triple=tuple(map(URIRef,(a['subjectIri'],str(TM[a['predicate']]),a['objectIri'])))
            premise(triple,'urn:todaymath:assertion:source:'+hashlib.sha256(a['iri'].encode()).hexdigest())
    if len(entities)!=manifest['entities'] or len(assertions)!=manifest['assertions']:raise ValueError('Coverage mismatch')
    signature=graph_bytes(logical,'urn:todaymath:graph:source-signature');(out/'signature.nq').write_text(signature)
    print(canonical({'phase':'global-signature','triples':len(logical),'bytes':len(signature.encode()),'seconds':time.perf_counter()-started}),flush=True)
    # Whole supported semantic graph, including cross-partition edges. Metadata
    # literal shards never serve as a substitute for this global closure.
    fullshape=Graph().parse(ROOT/'ontology/shapes/full.ttl',format='turtle')
    raw_ok,raw_report,_=validate(logical,shacl_graph=fullshape,inference='none',advanced=False,js=False,do_owl_imports=False)
    if not raw_ok:raise ValueError('Global raw cycle')
    closure=Graph()
    for t in logical:closure.add(t)
    for t in model:closure.add(t)
    owl_start=time.perf_counter();DeductiveClosure(OWLRL_Semantics,axiomatic_triples=False,datatype_axioms=False).expand(closure)
    owl_seconds=time.perf_counter()-owl_start
    if any(str(p)=='http://www.daml.org/2002/03/agents/agent-ont#error' for _,p,_ in closure):raise ValueError('OWL inconsistency')
    closed_ok,closed_report,_=validate(closure,shacl_graph=fullshape,inference='none',advanced=False,js=False,do_owl_imports=False)
    if not closed_ok:raise ValueError('Global closure cycle')
    proof_start=time.perf_counter();proofs=build_proofs(model,premises,closure,'global');proof_seconds=time.perf_counter()-proof_start
    closure_bytes=graph_bytes(closure,'urn:todaymath:graph:source-closure');proof_bytes=canonical(proofs)
    (out/'closure.nq').write_text(closure_bytes);(out/'proof.json').write_text(proof_bytes)
    inferred=set(closure)-set(logical)-set(model);witnessed={tuple(map(URIRef,p['conclusion'])) for p in proofs if p['rule']!='asserted'}
    # Cross-partition negative: an actual supported edge's reverse closes a
    # global cycle; the SHACL-SPARQL engine must reject it.
    cycle=Graph();edge=next(logical.triples((None,TM.partOf,None)),None)
    if edge:
        cycle.add(edge);cycle.add((edge[2],edge[1],edge[0]));negative_ok,_,_=validate(cycle,shacl_graph=fullshape,inference='none',advanced=False,js=False,do_owl_imports=False)
        if negative_ok:raise ValueError('Global cycle negative accepted')
    else:raise ValueError('No hierarchy to test')
    report={'complete':True,'mode':'offline-unapproved-source-eligibility-measurement','projectionHash':manifest['projectionHash'],'manifestHash':pin,'primaryEntities':len(entities),'primaryAssertions':len(assertions),'entityKinds':by_kind,'eligibleRelations':counts,'heldForReviewRelations':excluded,'signatureTriples':len(logical),'signatureBytes':len(signature.encode()),'signatureHash':digest(signature),'signatureGzipBytes':len(gzip.compress(signature.encode(),mtime=0)),'closureTriples':len(closure),'closureBytes':len(closure_bytes.encode()),'closureGzipBytes':len(gzip.compress(closure_bytes.encode(),mtime=0)),'closureHash':digest(closure_bytes),'proofCount':len(proofs),'proofBytes':len(proof_bytes.encode()),'proofGzipBytes':len(gzip.compress(proof_bytes.encode(),mtime=0)),'proofHash':digest(proof_bytes),'engineInferred':len(inferred),'witnessedInferred':len(inferred&witnessed),'untracedInferred':len(inferred-witnessed),'globalRawCycleConforms':bool(raw_ok),'globalClosureCycleConforms':bool(closed_ok),'globalCycleNegativeRejected':not negative_ok,'owlSeconds':owl_seconds,'proofSeconds':proof_seconds,'seconds':time.perf_counter()-started,'maxRss':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
    (out/'global-summary.json').write_text(canonical(report)+'\n');return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--pin',required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--workers',type=int,choices=[1,2,3],default=1);p.add_argument('--limit',type=int);p.add_argument('--global-signature',action='store_true')
    a=p.parse_args();print(canonical(global_signature(a.root,a.manifest,a.pin,a.out) if a.global_signature else run(a.root,a.manifest,a.pin,a.out,a.workers,a.limit)))
