"""Read-only original/HWP evidence copy; no new-question math or asset authoring."""
import json, pathlib, hashlib, zlib, olefile

base = pathlib.Path('.qa-artifacts/exam-resume-20261008')
manifest_path = base / 'next-five-extraction-r1/gyeonggu/source-manifest.json'
manifest = json.loads(manifest_path.read_text('utf-8-sig'))
question = next(q for q in manifest['questions'] if q['number'] == 13)
output = base / 'gyeonggu-q13-source-correction-r2'
output.mkdir(exist_ok=False)
hash_bytes = lambda b: hashlib.sha256(b).hexdigest()
hwp_source = manifest['sourceFiles'][0]
hwp_path = pathlib.Path(hwp_source['path'])
assert hash_bytes(hwp_path.read_bytes()) == hwp_source['sha256']
figure = next(x for x in question['positionedSourceItems'] if x['kind'] == 'figure')
with olefile.OleFileIO(str(hwp_path)) as ole:
    stream = ole.openstream(figure['binStream']).read()
image = stream if stream.startswith(b'\x89PNG\r\n\x1a\n') else zlib.decompress(stream, -15)
assert image.startswith(b'\x89PNG\r\n\x1a\n')
with (output / 'hwp-BIN0001.png').open('xb') as file:
    file.write(image)
original = question['contentReview']['originalScanReference']
original_path = pathlib.Path(original['path'])
assert hash_bytes(original_path.read_bytes()) == original['sha256']
render = base / 'next-five-extraction-r1' / pathlib.Path(original['render'])
render_bytes = render.read_bytes()
assert hash_bytes(render_bytes) == original['renderSha256']
with (output / 'original-page-03.webp').open('xb') as file:
    file.write(render_bytes)
receipt = {
    'kind': 'source-only-q13-readonly-evidence/v1',
    'sourceManifest': {'path': manifest_path.as_posix(), 'sha256': hash_bytes(manifest_path.read_bytes())},
    'hwp': {**hwp_source, 'binStream': figure['binStream'], 'streamRawSha256': hash_bytes(stream), 'decompressedPngSha256': hash_bytes(image), 'recordBinding': figure},
    'original': original,
    'completedCrop': question['questionPageCrops'][0],
    'oldInferredObservation': question['figureGivenObservation'],
    'immutableInputsPreserved': True,
    'sourceOnlyNotNewFigureOrMathApproval': True,
}
(output / 'copy-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'hwpFigureSha256': hash_bytes(image), 'originalPageSha256': hash_bytes(render_bytes), 'sourceOnly': True}))
