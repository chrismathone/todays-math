"""Download only pinned public CTC inference files, bounded to <3GB; no auth."""
import argparse
import hashlib
import json
import time
import urllib.request
from pathlib import Path

MODEL_ID = 'Kkonjeong/wav2vec2-base-korean'
REVISION = 'fa03d1a7138f1900131393cc7cb74f77926f177a'
FILES = ('README.md', 'config.json', 'preprocessor_config.json',
         'tokenizer_config.json', 'special_tokens_map.json', 'added_tokens.json',
         'vocab.json', 'model.safetensors')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    start, total, records = time.monotonic(), 0, []
    for name in FILES:
        dest = args.output / name
        digest, count = hashlib.sha256(), 0
        req = urllib.request.Request(
            f'https://huggingface.co/{MODEL_ID}/resolve/{REVISION}/{name}')
        try:
            with urllib.request.urlopen(req, timeout=45) as response, dest.open('xb') as out:
                while block := response.read(4 * 1024 * 1024):
                    total += len(block)
                    count += len(block)
                    if total > 2_000_000_000 or time.monotonic() - start > 600:
                        raise RuntimeError('bounded_download_exceeded')
                    digest.update(block)
                    out.write(block)
        except Exception as error:
            # Redirect URLs may carry credentials: never print exception URLs.
            raise RuntimeError(f'download_failed:{name}:{type(error).__name__}') from None
        records.append({'path': str(dest.resolve()), 'bytes': count, 'sha256': digest.hexdigest()})
        print(json.dumps({'downloaded': name, 'bytes': count, 'sha256': digest.hexdigest()}), flush=True)
    manifest = {'modelId': MODEL_ID, 'revision': REVISION, 'totalBytes': total,
                'publicUnauthenticatedDownload': True, 'files': records}
    (args.output / 'model-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
