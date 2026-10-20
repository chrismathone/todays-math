"""Compare exact A4 PNGs; no alignment, scaling, masking or background removal."""
from pathlib import Path
from itertools import combinations
import json
from PIL import Image, ImageChops, ImageDraw

OUT = Path(__file__).parent / 'evidence'
names = ['pyeongga', 'jeongtong', 'modern', 'workbook', 'jaseup', 'yuhyung']
comparisons = []
ink_checks = []
for side in ['first', 'last']:
    images = {name: Image.open(OUT / f'{name}-{side}.png').convert('RGB') for name in names}
    for name, image in images.items():
        pixels = list(image.get_flattened_data())
        dark = sum(max(p) < 180 for p in pixels)
        nonwhite = sum(min(p) < 245 for p in pixels)
        ink_checks.append(dict(template=name, side=side, width=image.width, height=image.height,
                               darkPixels=dark, nonWhitePixels=nonwhite))
        assert dark > 1000, f'Blank/inkless capture: {name}-{side}'
    for a, b in combinations(names, 2):
        assert images[a].size == images[b].size
        diff = ImageChops.difference(images[a], images[b])
        pixels = list(diff.get_flattened_data())
        changed = sum(max(p) > 16 for p in pixels)
        union = sum(min(pa) < 245 or min(pb) < 245 for pa, pb in zip(images[a].get_flattened_data(), images[b].get_flattened_data()))
        comparisons.append(dict(side=side, a=a, b=b, width=diff.width, height=diff.height,
                                threshold=16, changedPixels=changed,
                                changedPercent=round(100*changed/len(pixels), 4),
                                nonWhiteUnionPixels=union,
                                changedOverNonWhiteUnionPercent=round(100*changed/union, 4),
                                meanAbsoluteChannelDifference=round(sum(sum(p) for p in pixels)/(3*len(pixels)), 4)))
        if a == 'pyeongga' and b == 'jeongtong':
            diff.save(OUT / f'{a}-{b}-{side}-difference.png')
    # A reading aid; metrics always use full resolution sources, never these thumbnails.
    gallery = Image.new('RGB', (6*320, 490), '#e6e6e6')
    draw = ImageDraw.Draw(gallery)
    for i, name in enumerate(names):
        image = images[name].copy()
        image.thumbnail((312, 450))
        gallery.paste(image, (i*320+4, 30))
        draw.text((i*320+8, 8), name, fill='black')
    gallery.save(OUT / f'contact-{side}.png')
(OUT / 'pixel-comparisons.json').write_text(json.dumps(comparisons, indent=2), encoding='utf-8')
(OUT / 'capture-ink-checks.json').write_text(json.dumps(ink_checks, indent=2), encoding='utf-8')
print(json.dumps(comparisons, indent=2))
