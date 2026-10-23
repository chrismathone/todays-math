"""Offline package writer for immutable, dependency-closed proof slices.

No review decisions are manufactured. Native templates stay unreviewed until
an actual publisher binds the exact base manifest to an approved release.
"""
import argparse,gzip,json,hashlib,time,resource
from pathlib import Path
from compiler import ROOT,TM,canonical,digest
from partitions import read_artifact,bytehash

def write_gzip(root,path,value):
    raw=canonical(value).encode();compressed=gzip.compress(raw,mtime=0);file=root/path;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(compressed)
    return {'path':path,'byteHash':bytehash(compressed),'rawByteHash':bytehash(raw),'bytes':len(compressed),'rawBytes':len(raw)}
def template(id,subject,predicate,obj,source,projection_hash,locator,provenance='native-product'):
    return {'id':id,'subject':subject,'predicate':predicate,'object':obj,'scope':'global','sourceRevision':source,'sourceDigest':projection_hash,'sourceDigestKind':'authorized-projection','locator':locator,'provenance':provenance,'origin':'source-projection','support':'direct','review':'unreviewed','publication':'unpublished','distribution':'allowed','revision':1}
def package(root,manifest_path,pin,semantic,out,validation_summary):
    start=time.perf_counter();raw=manifest_path.read_bytes()
    if bytehash(raw)!=pin:raise ValueError('Manifest pin')
    manifest=json.loads(raw);summary=json.loads((semantic/'global-summary.json').read_text());validation=json.loads(validation_summary.read_text())
    if summary['projectionHash']!=manifest['projectionHash'] or summary['manifestHash']!=pin or validation['manifestHash']!=pin or validation['complete'] is not True or validation['primaryFocus']!=manifest['entities']+manifest['assertions']:raise ValueError('Full validation receipt mismatch')
    prefix='ontology/model/releases/'+manifest['projectionHash'][7:]
    # Operational timing/RSS are external evidence, not content identity. Bind
    # stable actual reports/focus populations so fixed inputs reproduce bytes.
    receipts=[json.loads(line) for line in (validation_summary.parent/'shacl-progress.jsonl').read_text().splitlines()]
    stable_reports=[{k:r[k] for k in ('key','conforms','primaryEntities','primaryAssertions','uniquePrimaryFocus','report')} for r in receipts]
    local_receipt={'complete':validation['complete'],'primaryFocus':validation['primaryFocus'],'primaryEntities':validation['primaryEntities'],'primaryAssertions':validation['primaryAssertions'],'partitionCount':validation['partitionCount'],'receiptsHash':digest(canonical(stable_reports))}
    global_receipt={k:v for k,v in summary.items() if k not in ('seconds','owlSeconds','proofSeconds','maxRss')}
    kinds=json.loads((ROOT/'ontology/model/source-kinds.json').read_text());policy=json.loads((ROOT/'ontology/rules/profile.json').read_text())['sourcePolicy']
    routes={};templates={};catalog=[]
    for p in manifest['partitions']:
        data=json.loads(read_artifact(root,p['projection']));primary=set(data['primaryEntityIris'])
        for e in data['entities']:
            if e['iri'] not in primary:continue
            routes[e['iri']]=p['key']
            catalog.append({'entity':e['iri'],'stableIri':e['stableIri'],'namespace':e['namespace'],'nativeId':e['nativeId'],'kind':e['kind'],'scope':e['scope'],'label':next((l['value'] for l in e.get('labels',[])),'등록 개체'),'partition':p['key']})
            id='urn:todaymath:assertion:source-type:'+hashlib.sha256(e['iri'].encode()).hexdigest()
            templates[id]=template(id,e['iri'],str(__import__('rdflib').RDF.type),kinds[e['kind']]['classIri'],e['iri'],e['sourceProjectionHash'],e['origin']['projectedPointer'],'official-document' if e['sourceProvenance']=='official-document' else 'native-product')
        for a in data['assertions']:
            if policy[a['predicate']]['queryLocation']!='approved-source-projection' or a['originKind']!='source-projection' or a['supportKind']!='direct-source-structure' or a['evidenceKind']!='observed' or a['partial']:continue
            id='urn:todaymath:assertion:source:'+hashlib.sha256(a['iri'].encode()).hexdigest()
            templates[id]=template(id,a['subjectIri'],str(TM[a['predicate']]),a['objectIri'],a['iri'],a['sourceProjectionHash'],a['origin']['projectedPointer'])
    proofs=json.loads((semantic/'proof.json').read_text());by_id={p['id']:p for p in proofs};groups={};tbox=[]
    for p in proofs:
        route=routes.get(p['conclusion'][0])
        if route:groups.setdefault(route,[]).append(p['id'])
        elif not p['assertionIds']:tbox.append(p['id'])
        else:raise ValueError('Proof subject has no source route')
    descriptors=[]
    for key,ids in sorted(groups.items()):
        wanted=set(ids);queue=list(ids)
        while queue:
            item=by_id[queue.pop()]
            for parent in item['premises']:
                if parent not in wanted:wanted.add(parent);queue.append(parent)
        selected=[by_id[id] for id in sorted(wanted)]
        required=set().union(*(set(p['assertionIds']) for p in selected));assertions=[templates[id] for id in sorted(required)]
        triples=sorted({tuple(p['conclusion']) for p in selected})
        needed_entities=sorted({term for p in selected for term in (p['conclusion'][0],p['conclusion'][2]) if term in routes})
        source_partitions=sorted({routes[e] for e in needed_entities})
        # Explicit original assertion/source-revision locations are needed even
        # where an entailed conclusion's subject lives in a different shard.
        descriptor=write_gzip(out,prefix+'/'+key+'.proof.gz',{'format':'tm-proof-slice-1','projectionHash':manifest['projectionHash'],'key':key,'primaryProofIds':sorted(ids),'proofs':selected,'assertions':assertions,'closureTriples':triples,'sourcePartitionKeys':source_partitions})
        descriptors.append({'key':key,'proofs':len(selected),'primaryProofs':len(ids),'assertions':len(assertions),'sourcePartitionKeys':source_partitions,'artifact':descriptor})
    signature=write_gzip(out,prefix+'/signature.json.gz',{'format':'tm-global-signature-1','projectionHash':manifest['projectionHash'],'premises':sorted([[a['subject'],a['predicate'],a['object'],a['id']] for a in templates.values()])})
    cat=write_gzip(out,prefix+'/catalog.json.gz',{'format':'tm-source-search-index-1','projectionHash':manifest['projectionHash'],'entries':sorted(catalog,key=lambda e:e['entity'])})
    result={'format':'tm-packaged-base-1','projectionHash':manifest['projectionHash'],'sourceManifestHash':pin,'sourceManifestPath':str(manifest_path.relative_to(root)),'sourceManifest':manifest,'profileHash':digest((ROOT/'ontology/rules/profile.json').read_text()),'ontologyHash':digest((ROOT/'ontology/model/tm-owlrl-1.ttl').read_text()),'shapesHash':digest(canonical({'runtime':(ROOT/'ontology/shapes/runtime-core.ttl').read_text(),'full':(ROOT/'ontology/shapes/full.ttl').read_text()})),'coverage':{'entities':manifest['entities'],'sourceAssertions':manifest['assertions'],'primaryFocus':validation['primaryFocus'],'proofs':len(proofs),'engineInferred':summary['engineInferred'],'witnessedInferred':summary['witnessedInferred'],'untracedInferred':summary['untracedInferred']},'localValidation':local_receipt,'globalValidation':global_receipt,'catalog':cat,'signature':signature,'partitions':descriptors,'tboxProofIds':tbox,'approval':'unreviewed-packaged-base-not-an-active-release'}
    packed=canonical(result);path=out/prefix/'base.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(packed)
    receipt={'basePath':prefix+'/base.json','baseHash':digest(packed),'baseBytes':len(packed.encode()),'proofShards':len(descriptors),'proofGzipBytes':sum(d['artifact']['bytes'] for d in descriptors),'maxProofRawBytes':max(d['artifact']['rawBytes'] for d in descriptors),'maxProofGzipBytes':max(d['artifact']['bytes'] for d in descriptors),'catalogRawBytes':cat['rawBytes'],'catalogGzipBytes':cat['bytes'],'seconds':time.perf_counter()-start,'maxRss':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
    (out/'package-receipt.json').write_text(canonical(receipt)+'\n');print(canonical(receipt),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--pin',required=True);p.add_argument('--semantic',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--validation-summary',type=Path,required=True);a=p.parse_args();package(a.root,a.manifest,a.pin,a.semantic,a.out,a.validation_summary)
