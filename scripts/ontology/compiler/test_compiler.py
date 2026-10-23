import json
import unittest
from pathlib import Path
from compiler import compile_release, validate_graph
from rdflib import Graph, URIRef

TM = "urn:todaymath:vocab:"
HASH = "sha256:" + "a" * 64

def assertion(i, s, p, o, **kw):
    a = dict(id="urn:todaymath:assertion:" + i, subject="urn:todaymath:entity:" + s,
             predicate=TM+p, object="urn:todaymath:entity:"+o, scope="global",
             sourceRevision="urn:todaymath:source:r1", sourceDigest=HASH, locator="/records/0",
             provenance="native-product", origin="authored", support="direct", review="approved",
             publication="published", distribution="allowed", revision=1,
             approvalId="urn:todaymath:approval:"+i)
    a.update(kw)
    return a

def fixture(assertions=None):
    rows=[f'<urn:todaymath:source:r1> <{TM}sourceByteHash> "{HASH}" <urn:todaymath:graph:registry> .']
    for id in ('a','b','c'):
        s=f'<urn:todaymath:entity:{id}>';g='<urn:todaymath:graph:registry>'
        rows.append(f'{s} <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <{TM}SourceEntity> {g} .')
        for p,v in [('nativeId',id),('nativeNamespace','synthetic'),('sourceVersion',HASH),('sourceByteHash',HASH),('sourceKind','Definition'),('sourceScope','global')]:rows.append(f'{s} <{TM}{p}> "{v}" {g} .')
        rows.append(f'{s} <http://www.w3.org/2000/01/rdf-schema#label> "{id.upper()}" {g} .')
    return dict(schemaVersion=1, profile="tm-owlrl-1", scope="global",
                registryNquads='\n'.join(rows)+'\n',
                assertions=assertions or [assertion("ab","a","partOf","b"),assertion("bc","b","partOf","c")],
                sourceManifest=json.dumps({"hash": HASH},sort_keys=True,separators=(",",":")))

class ActualCompiler(unittest.TestCase):
    def test_actual_subclass_and_domain_reasoning_never_grants_authority(self):
        out=compile_release(fixture([assertion("type","a","partOf","b",predicate="http://www.w3.org/1999/02/22-rdf-syntax-ns#type",object=TM+"TextbookConcept")]))
        self.assertIn('<urn:todaymath:entity:a> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <'+TM+'ContentEntity>',out['files']['closure'])
        self.assertTrue(any(p['rule']=='cax-sco' for p in json.loads(out['files']['proof'])))
        with self.assertRaises(ValueError):compile_release(fixture([assertion("type","a","partOf","b",predicate="http://www.w3.org/1999/02/22-rdf-syntax-ns#type",object=TM+"SuperAdmin")]))
    def test_actual_rl_transitivity_has_rechecked_witness(self):
        out=compile_release(fixture())
        self.assertIn('<urn:todaymath:entity:a> <'+TM+'partOf> <urn:todaymath:entity:c>',out['files']['closure'])
        proofs=json.loads(out['files']['proof'])
        proof=next(p for p in proofs if p['conclusion']==['urn:todaymath:entity:a',TM+'partOf','urn:todaymath:entity:c'])
        self.assertEqual(proof['rule'],'prp-trp');self.assertEqual(len(proof['assertionIds']),2)

    def test_pedagogical_relations_never_become_transitive(self):
        out=compile_release(fixture([assertion("ab","a","directPedagogicalPrerequisite","b"),assertion("bc","b","directPedagogicalPrerequisite","c")]))
        self.assertNotIn('<urn:todaymath:entity:a> <'+TM+'directPedagogicalPrerequisite> <urn:todaymath:entity:c>',out['files']['closure'])
        self.assertNotIn('mastered',out['files']['closure'])

    def test_candidate_cannot_contaminate_closure(self):
        out=compile_release(fixture([assertion("ab","a","partOf","b"),assertion("bc","b","partOf","c",review="candidate",publication="unpublished")]))
        self.assertNotIn('<urn:todaymath:entity:a> <'+TM+'partOf> <urn:todaymath:entity:c>',out['files']['closure'])

    def test_missing_approval_and_source_are_rejected(self):
        a=assertion("ab","a","partOf","b");a.pop('approvalId')
        with self.assertRaises(ValueError):compile_release(fixture([a]))
        with self.assertRaises(ValueError):compile_release(fixture([assertion("ab","a","partOf","b",sourceRevision="urn:todaymath:missing")]))

    def test_actual_shacl_detects_cycle_and_required_metadata(self):
        with self.assertRaisesRegex(ValueError,'SHACL'):compile_release(fixture([assertion("ab","a","partOf","b"),assertion("ba","b","partOf","a")]))
        g=Graph();g.add((URIRef('urn:todaymath:a'),URIRef('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),URIRef(TM+'Assertion')))
        report=validate_graph(g,full=False)
        self.assertFalse(report['conforms']);self.assertGreater(len(report['results']),0)

    def test_fixed_input_compiles_byte_exact_twice(self):
        self.assertEqual(compile_release(fixture()),compile_release(fixture()))

    def test_remote_predicate_ontology_import_and_blank_nodes_are_rejected(self):
        for predicate in ['http://www.w3.org/2002/07/owl#imports', TM+'mastered']:
            with self.assertRaises(ValueError):compile_release(fixture([assertion('bad','a','partOf','b',predicate=predicate)]))
        f=fixture();f['registryNquads']='_:a <'+TM+'partOf> <urn:todaymath:b> <urn:todaymath:g> .'
        with self.assertRaises(ValueError):compile_release(f)

if __name__ == '__main__':unittest.main()
