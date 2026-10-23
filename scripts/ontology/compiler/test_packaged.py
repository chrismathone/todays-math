import unittest,json
from pathlib import Path
from compiler import ROOT,compile_release,canonical,TM
from partitions import read_artifact
from rdflib import Dataset,URIRef

def packaged_fixture():
    entry=json.loads((ROOT/'ontology/model/releases/catalog.json').read_text())['bases'][0]
    return {'schemaVersion':1,'profile':'tm-owlrl-1','scope':'global','registryNquads':'','assertions':[],'sourceManifest':canonical({'format':'tm-packaged-source-1','baseHash':entry['baseHash'],'projectionHash':entry['projectionHash'],'authorityDecisionId':'urn:todaymath:source-authority:synthetic-local-fixture-only','scope':'global'})}
def delta_fixture(cycle=False):
    value=packaged_fixture();source=json.loads(value['sourceManifest']);entry=json.loads((ROOT/'ontology/model/releases/catalog.json').read_text())['bases'][0];base=json.loads((ROOT/entry['path']).read_text())
    index=json.loads(read_artifact(ROOT,base['catalog']))['entries'];signature=json.loads(read_artifact(ROOT,base['signature']))['premises']
    lab=next(e for e in index if e['namespace']=='lab-unit')
    definition=next(e for e in index if e['namespace']=='bank-definition')
    section=next(t[2] for t in signature if t[0]==definition['entity'] and t[1]==str(TM.partOf))
    descriptor=next(p['nquads'] for p in base['sourceManifest']['partitions'] if p['key']==definition['partition'])
    graph=Dataset(default_union=True);graph.parse(data=read_artifact(ROOT,descriptor),format='nquads')
    hash=str(graph.value(URIRef(definition['entity']),TM.sourceProjectionHash))
    a={'id':'urn:todaymath:assertion:synthetic-cross-partition-delta','subject':section if cycle else lab['entity'],'predicate':str(TM.partOf),'object':definition['entity'],'scope':'global','sourceRevision':definition['entity'],'sourceDigest':hash,'sourceDigestKind':'authorized-projection','locator':'/synthetic-local-delta-fixture-only','provenance':'native-product','origin':'authored','support':'direct','review':'approved','publication':'published','distribution':'allowed','revision':1,'approvalId':'urn:todaymath:approval:synthetic-local-delta-only'}
    value['assertions']=[a];return value,section

class ActualPackagedCompiler(unittest.TestCase):
    def test_fixed_native_input_twice_produces_identical_canonical_bytes(self):
        value=packaged_fixture();a=canonical(compile_release(value));b=canonical(compile_release(value));self.assertEqual(a,b);self.assertLess(len(a.encode()),100000)
    def test_actual_owl_delta_crosses_native_partition_boundary(self):
        value,section=delta_fixture();out=compile_release(value);proofs=json.loads(out['files']['proof'])
        witness=next(p for p in proofs if p['conclusion']==[value['assertions'][0]['subject'],str(TM.partOf),section])
        self.assertEqual(witness['rule'],'prp-trp');self.assertIn(value['assertions'][0]['id'],witness['assertionIds'])
        self.assertGreater(len(witness['assertionIds']),1)
    def test_actual_global_shacl_rejects_cross_partition_cycle(self):
        value,_=delta_fixture(cycle=True)
        with self.assertRaisesRegex(ValueError,'SHACL'):compile_release(value)
if __name__=='__main__':unittest.main()
