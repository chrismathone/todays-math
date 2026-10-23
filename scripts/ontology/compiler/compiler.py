"""Pinned OWL-RL/SHACL compiler. No remote RDF, caller ontology, SQL or model IO.

Registry projections are NOT promoted into approved relation premises. Data quads
use stable IRIs; sorted bytes are not general RDF semantic canonicalization.
"""
import hashlib
import importlib.metadata
import json
import re
import sys
import platform
from pathlib import Path
from rdflib import Dataset, Graph, URIRef, Literal, BNode, Namespace
from rdflib.namespace import RDF, RDFS, OWL, SH, XSD
from rdflib.compare import to_canonical_graph
from owlrl import DeductiveClosure, OWLRL_Semantics
from pyshacl import validate

ROOT = Path(__file__).resolve().parents[3]
TM = Namespace("urn:todaymath:vocab:")
PROFILE = "tm-owlrl-1"
SOURCE_KINDS=json.loads((ROOT/"ontology/model/source-kinds.json").read_text())
HASH_KEYS = ("source", "registry", "asserted", "closure", "review", "ontology", "shapes", "rules", "proof", "engine", "report", "coverage")
RELATIONS = {str(RDF.type)} | {str(TM[x]) for x in ("partOf", "covers", "projectsSourceSection", "directPedagogicalPrerequisite", "supports", "observedIn")} | {str(TM[x]) for x in json.loads((ROOT/"ontology/rules/profile.json").read_text())["sourcePredicates"]}

def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)

def digest(value):
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()

def term(value):
    if isinstance(value, URIRef): return "<" + str(value) + ">"
    if isinstance(value, BNode): return "_:" + str(value)
    if isinstance(value, Literal):
        quoted = json.dumps(str(value), ensure_ascii=False)
        return quoted + ("@"+value.language if value.language else "^^<"+str(value.datatype or URIRef("http://www.w3.org/2001/XMLSchema#string"))+">")
    raise ValueError("Unsupported RDF term")

def graph_bytes(graph, name):
    return "".join(sorted({" ".join(term(t) for t in triple) + " <" + name + "> .\n" for triple in graph}))

def parse_registry(text):
    if not isinstance(text, str) or len(text.encode("utf-8")) > 64*1024*1024: raise ValueError("Registry size")
    dataset = Dataset(default_union=True)
    dataset.parse(data=text, format="nquads")
    for s,p,o,g in dataset.quads():
        if any(isinstance(t,BNode) for t in (s,p,o,g)): raise ValueError("Data requires fixed skolem IRIs")
        if not str(s).startswith("urn:todaymath:") or not str(g).startswith("urn:todaymath:"): raise ValueError("Registry namespace")
        if not (str(p).startswith(str(TM)) or p in (RDF.type,RDF.subject,RDF.predicate,RDF.object,RDFS.label)): raise ValueError("Registry predicate")
    return dataset

def validate_graph(graph, full=True):
    shapes = Graph().parse(ROOT/"ontology/shapes/runtime-core.ttl", format="turtle")
    if full: shapes.parse(ROOT/"ontology/shapes/full.ttl", format="turtle")
    canonical_shapes = to_canonical_graph(shapes)
    shapes = Graph()
    for triple in canonical_shapes: shapes.add(triple)
    conforms, report_graph, _ = validate(graph, shacl_graph=shapes, inference="none", advanced=False, js=False, do_owl_imports=False, meta_shacl=True)
    results=[]
    for r in report_graph.subjects(RDF.type,SH.ValidationResult):
        results.append(dict(focus=str(report_graph.value(r,SH.focusNode) or ""),shape=str(report_graph.value(r,SH.sourceShape) or ""),component=str(report_graph.value(r,SH.sourceConstraintComponent) or ""),path=str(report_graph.value(r,SH.resultPath) or ""),severity=str(report_graph.value(r,SH.resultSeverity) or "")))
    # Library graph canonicalization is used to stabilize this report, not claimed
    # as an interchange-wide standard canonicalization of arbitrary RDF datasets.
    normalized=to_canonical_graph(report_graph)
    report="".join(sorted(" ".join(term(x) for x in t)+" .\n" for t in normalized))
    targets={kind:set(graph.subjects(RDF.type,TM[kind])) for kind in ("Assertion","SourceEntity","SourceAssertion","SourceCoverage","LearningObservation","CandidateAssertion")}
    focus=set(graph.subjects(TM.partOf,None)).union(*targets.values())
    return dict(engine="pyshacl@"+importlib.metadata.version("pyshacl"), conforms=bool(conforms), incomplete=False, report=report, focusNodeCount=len(focus), targetCounts={k:len(v) for k,v in targets.items()}, results=sorted(results,key=canonical))

def check_input(value, registry):
    if set(value) != {"schemaVersion","profile","scope","registryNquads","assertions","sourceManifest"} or value["schemaVersion"] != 1 or value["profile"] != PROFILE: raise ValueError("Compile contract")
    if not re.fullmatch(r"global|(?:branch|owner|student):[A-Za-z0-9_-]{1,100}",value["scope"]): raise ValueError("Scope")
    json.loads(value["sourceManifest"])
    if len(value["assertions"])>200000: raise ValueError("Assertion budget")
    seen=set()
    for a in value["assertions"]:
        required={"id","subject","predicate","object","scope","sourceRevision","sourceDigest","locator","provenance","origin","support","review","publication","distribution","revision"}
        if set(a)-{"approvalId","sourceDigestKind"} != required or a["id"] in seen: raise ValueError("Assertion identity")
        seen.add(a["id"])
        for k in ("id","subject","object","sourceRevision"):
            if not isinstance(a[k],str) or not re.fullmatch(r'urn:todaymath:[^\s<>"{}|\\^`]+',a[k]): raise ValueError("IRI")
        if a["predicate"] not in RELATIONS or a["scope"] not in ("global",value["scope"]): raise ValueError("Relation or scope")
        if a["predicate"]==str(RDF.type) and a["object"] not in ({str(TM[x]) for x in ("ContentEntity","TextbookConcept","CourseSection","RegisteredEntity")} | {k["classIri"] for k in SOURCE_KINDS.values()}):
            raise ValueError("Unsupported application class")
        for entity in ([a["subject"]] if a["predicate"]==str(RDF.type) else [a["subject"],a["object"]]):
            if (URIRef(entity),RDF.type,TM.SourceEntity) not in registry:raise ValueError("Unregistered relation endpoint")
        axes={"provenance":{"official-document","native-product","other","unknown"},"origin":{"source-projection","authored","model-proposal"},"support":{"direct","indirect","missing","unknown"},"review":{"unreviewed","candidate","approved","rejected"},"publication":{"unpublished","published","retired"},"distribution":{"allowed","restricted","unknown"}}
        if any(a[k] not in options for k,options in axes.items()): raise ValueError("Axes")
        if type(a["revision"]) is not int or a["revision"]<1 or not a["locator"] or not re.fullmatch(r"sha256:[a-f0-9]{64}",a["sourceDigest"]): raise ValueError("Source identity")
        if a["review"]=="approved" and not re.fullmatch(r'urn:todaymath:[^\s<>"{}|\\^`]+',a.get("approvalId","")): raise ValueError("Missing approval")
        if a["publication"]=="published" and a["review"]!="approved": raise ValueError("Unapproved publication")
        source_predicate=TM.sourceProjectionHash if a.get("sourceDigestKind")=="authorized-projection" else TM.sourceByteHash
        if not any(str(o)==a["sourceDigest"] for o in registry.objects(URIRef(a["sourceRevision"]),source_predicate)): raise ValueError("Source revision/digest absent")

def assertion_graph(assertions):
    graph=Graph()
    premises={}
    for a in assertions:
        if a["review"]!="approved" or a["publication"]!="published" or a["distribution"]!="allowed" or a["support"] not in ("direct","indirect"): continue
        s,p,o=map(URIRef,(a["subject"],a["predicate"],a["object"]))
        graph.add((s,p,o));premises.setdefault((s,p,o),[]).append(a)
        iri=URIRef(a["id"])
        for pred,obj in [(RDF.type,TM.Assertion),(RDF.subject,s),(RDF.predicate,p),(RDF.object,o),(TM.sourceRevision,URIRef(a["sourceRevision"])),(TM.sourceDigest,Literal(a["sourceDigest"],datatype=XSD.string)),(TM.scope,Literal(a["scope"],datatype=XSD.string)),(TM.review,Literal(a["review"],datatype=XSD.string)),(TM.approval,URIRef(a["approvalId"]))]: graph.add((iri,pred,obj))
    return graph,premises

def build_proofs(model, premises, closure, scope):
    """A witness extractor/checker, independent of OWL-RL's inference implementation.
    Only conclusions actually in engine closure may receive a witness.
    """
    proofs={}
    def add(triple, rule, parents=(), ids=(), witness_scope="global"):
        if triple not in closure or triple in proofs: return False
        if any(p not in proofs for p in parents): return False
        parent_proofs=[proofs[p] for p in parents]
        assertion_ids=sorted(set(ids).union(*(set(p["assertionIds"]) for p in parent_proofs)))
        scopes={p["scope"] for p in parent_proofs if p["scope"]!="global"}
        if witness_scope!="global":scopes.add(witness_scope)
        if len(scopes)>1:return False
        item=dict(conclusion=[str(x) for x in triple],rule=rule,premises=[p["id"] for p in parent_proofs],assertionIds=assertion_ids,scope=next(iter(scopes),"global"))
        item["id"]=digest(canonical(item));proofs[triple]=item;return True
    for triple in sorted(model,key=lambda t:tuple(map(str,t))):add(triple,"asserted")
    for triple,items in sorted(premises.items(),key=lambda t:tuple(map(str,t[0]))):
        # A single complete authorized provenance is sufficient, never union private
        # and global alternative assertions into an overly broad witness.
        a=sorted(items,key=lambda x:(x["scope"]!="global",x["id"]))[0]
        add(triple,"asserted",ids=[a["id"]],witness_scope=a["scope"])
    changed=True
    while changed:
        changed=False
        known=list(proofs)
        by_start={}
        for a in known:
            if a[1]==TM.partOf:by_start.setdefault(a[0],[]).append(a)
        for t in known:
            s,p,o=t
            if p==RDF.type:
                for _,_,superclass in model.triples((o,RDFS.subClassOf,None)):
                    changed=add((s,RDF.type,superclass),"cax-sco",(t,(o,RDFS.subClassOf,superclass))) or changed
            for _,_,parent in model.triples((p,RDFS.subPropertyOf,None)):
                changed=add((s,parent,o),"prp-spo1",(t,(p,RDFS.subPropertyOf,parent))) or changed
            for _,_,cls in model.triples((p,RDFS.domain,None)):
                changed=add((s,RDF.type,cls),"prp-dom",(t,(p,RDFS.domain,cls))) or changed
            for _,_,cls in model.triples((p,RDFS.range,None)):
                changed=add((o,RDF.type,cls),"prp-rng",(t,(p,RDFS.range,cls))) or changed
            if p==TM.partOf:
                for tail in by_start.get(o,[]):
                    changed=add((s,p,tail[2]),"prp-trp",(t,tail)) or changed
    return sorted(proofs.values(),key=lambda p:p["id"])

def compile_release(value):
    source=json.loads(value.get("sourceManifest","{}"))
    if isinstance(source,dict) and source.get("format")=="tm-packaged-source-1":
        from packaged import compile_packaged
        return compile_packaged(value)
    registry=parse_registry(value["registryNquads"])
    check_input(value,registry)
    model_bytes=(ROOT/"ontology/model/tm-owlrl-1.ttl").read_text()
    model=Graph().parse(data=model_bytes,format="turtle")
    asserted,premises=assertion_graph(value["assertions"])
    raw=Graph()
    for s,p,o,_ in registry.quads():raw.add((s,p,o))
    for t in asserted:raw.add(t)
    raw_report=validate_graph(raw)
    if not raw_report["conforms"]:raise ValueError("SHACL raw violation: "+canonical(raw_report))
    closure=Graph()
    # Reified audit literals are SHACL data, never OWL logical premises. Keeping
    # them out also avoids generalized literal-subject identity facts in OWL-RL.
    for triple in premises:closure.add(triple)
    for t in model:closure.add(t)
    DeductiveClosure(OWLRL_Semantics, axiomatic_triples=False, datatype_axioms=False).expand(closure)
    # Inconsistency messages are not silently accepted as successful inference.
    if any(str(p)=="http://www.daml.org/2002/03/agents/agent-ont#error" for _,p,_ in closure):raise ValueError("OWL inconsistency")
    closed_data=Graph()
    for t in raw:closed_data.add(t)
    for t in closure:closed_data.add(t)
    closure_report=validate_graph(closed_data)
    if not closure_report["conforms"]:raise ValueError("SHACL closure violation: "+canonical(closure_report))
    proofs=build_proofs(model,premises,closure,value["scope"])
    inferred=set(closure)-set(model)-set(premises)
    proved={tuple(URIRef(x) for x in p["conclusion"]) for p in proofs if p["rule"]!="asserted"}
    engine=canonical({"compileInputHash":digest(canonical(value)), "pythonVersion":platform.python_version(), "implementationHash":digest(Path(__file__).read_text()), "packages":{name:importlib.metadata.version(name) for name in ("rdflib","owlrl","pyshacl")},"lock":(ROOT/"scripts/ontology/compiler/requirements.lock").read_text()})
    files=dict(source=value["sourceManifest"],registry=value["registryNquads"],asserted=graph_bytes(asserted,"urn:todaymath:graph:asserted"),closure=graph_bytes(closure,"urn:todaymath:graph:closure"),review=canonical(sorted(value["assertions"],key=lambda a:a["id"])),ontology=model_bytes,shapes=canonical({"runtime":(ROOT/"ontology/shapes/runtime-core.ttl").read_text(),"full":(ROOT/"ontology/shapes/full.ttl").read_text()}),rules=(ROOT/"ontology/rules/profile.json").read_text(),proof=canonical(proofs),engine=engine,report=canonical({"raw":raw_report,"closure":closure_report}),coverage=canonical({"registryTriples":len(registry),"assertions":len(value["assertions"]),"publishedAssertions":sum(len(v) for v in premises.values()),"engineInferredTriples":len(inferred),"witnessedInferredTriples":len(inferred & proved),"untracedInferredTriples":len(inferred-proved),"scope":value["scope"]}))
    unsigned=dict(schemaVersion=1,profile=PROFILE,hashes={k:digest(files[k]) for k in HASH_KEYS})
    return dict(identity={**unsigned,"graphVersion":digest(canonical(unsigned))},files=files)

if __name__=="__main__":
    try:
        value=json.loads(sys.stdin.buffer.read(72*1024*1024+1))
        print(canonical(compile_release(value)))
    except Exception as error:
        print(canonical({"error":"COMPILER_FAILED","kind":type(error).__name__}),file=sys.stderr)
        sys.exit(1)
