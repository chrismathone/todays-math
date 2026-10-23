# Math source release artifacts

These are immutable, allowlisted metadata transports. They do not activate or approve an ontology release. `source-runtime-fixture.v1.json` pins a reproducible test fixture; production pins must come from the formal publication authority.

`public-v1/<projection hash>/manifest.json` records namespace/16-bucket routing, primary entity/assertion populations, repeated dependency entities, and compressed/uncompressed byte hashes. Each `.projection.gz` carries source-owned metadata and reified candidate assertions; its `.nq.gz` is the exact RDF rendering under the same global source graph. Endpoint entity metadata closes each shard. Primary foci occur once; repeated endpoints are never new questions or new source population. Assertion index shards resolve assertion version IRIs. Native entity routing is `sourcePartitionKey(namespace, stableIri)`.

The runtime entry is `loadBundledMathOntologySourcePartitions`. It verifies server-pinned manifest bytes, confines filesystem paths, bounds compressed reads/decompression, and validates every requested artifact. It never assembles the full census. `sources/server.ts` contains fresh-policy, transaction-bound private source readers and the bounded native-definition evidence accessor. Native definitions are fetched separately for teachers (at most six / 24 KiB), with exact term/text hash correspondence; their bodies are not in these artifacts.

The full administrative census and original input-file hash ledger stay in external evidence. `expected-adapter-coverage.v1.json` is explicitly an **offline administrative** population/eligibility summary; never return its hidden/quarantined denominators to a teacher/student query or model. Visible UI coverage must be derived from the allowed projection.

Reproduce in a fresh process with the project's installed TypeScript runner:

```sh
npx tsx scripts/ontology/census/cli.ts --repo . --output-dir /tmp/math-source-release --partitions --receipt /tmp/math-source-census.json
npx tsx scripts/ontology/census/verifyPackaged.ts --repo . --projection-hash sha256:52597f5f6437aff2418d3189399e1aac261149bea17994a352d62fbfebaee554 --manifest-byte-hash sha256:051e9816980e7d656ff76cac4b66c93cbee1f43bab2815f758e08d5ee80f7ed3 --receipt /tmp/math-source-package-check.json
```

Use the real pins in `source-runtime-fixture.v1.json` for the fixture check. `--expected-projection-hash` checks current source extraction against an independently pinned public release. `--expected-payload-hash` checks the administrative byte/input snapshot. `--check --partitions` compares a complete offline export root (administrative bundle plus public shards) without writing it; use `verifyPackaged.ts` for the runtime-only checked-in package. `--nquads` is an offline monolithic measurement/export option, disallowed with `--check`. The collector rejects repeated invocation, preloaded native module caches, read-port/file byte disagreement, changed files, omitted families, duplicate native identities, missing structural witnesses and stale hashes.

`official-2022-codes.json` contains only codes, original paragraph/offset/hash coordinates, and extractor/source receipts from the separately held official HWP. It does not contain curriculum prose or inferred concept mappings. `scripts/ontology/import/officialCodes.py` reproduces it given the independently verified upstream file hash. Unknown editions remain unknown; source references and unknown/private/imported material stay quarantined. Education candidates remain unpublished until independent relation review; shape conformance does not approve them.
