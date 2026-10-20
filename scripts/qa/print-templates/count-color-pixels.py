"""Compare audit-h2-color.mjs screenshots, excluding the navy number/divider."""
import json
from pathlib import Path
from PIL import Image

output = Path("docs/design/mockups/answer-quick-key-h2-production-20261020")
results = []
for number in (10, 19, 25):
    for mode in ("default", "no-lcd"):
        image = Image.open(output / f"color-{mode}-{number}.png").convert("RGB")
        answer = image.crop((40, 0, image.width, image.height))
        pixels = [pixel for pixel in answer.get_flattened_data()
                  if max(pixel) - min(pixel) > 15 and min(pixel) < 245]
        results.append({"number": number, "mode": mode,
                        "coloredAnswerPixels": len(pixels), "examples": pixels[:8]})
(output / "color-pixels.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps(results, indent=2))
