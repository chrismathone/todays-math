# Local listening OCR evidence

These tools read original files and write local evidence only. They never open a
database, call a paid OCR service, or confirm teacher reviews or physical printing.

`prepare-listening-ocr-evidence.py` verifies original prepared JSON and question
PDF SHA-256, PNG dimensions, question IDs, all five ordered choice IDs, and answer
IDs before extracting evidence images. `read-listening-windows-ocr.ps1` runs the
installed Windows Runtime Korean recognizer through Windows PowerShell 5.1. It
checks PNG hashes before and after recognition and preserves raw text and word
coordinates. Every automatic result remains `unreviewed`.

```powershell
py -3.12 scripts/qa/prepare-listening-ocr-evidence.py --source-directory C:/Creative/testautocreator/output/listening-assessments/prepared-native-registration --output-directory C:/Creative/testautocreator/output/listening-assessments/native-ocr-verification
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/import/read-listening-windows-ocr.ps1 -ManifestPath C:/Creative/testautocreator/output/listening-assessments/native-ocr-verification/outlined-manifest.json -OutputDirectory C:/Creative/testautocreator/output/listening-assessments/native-ocr-verification/ocr
py -3.12 scripts/qa/compare-listening-native-images.py --evidence-directory C:/Creative/testautocreator/output/listening-assessments/native-ocr-verification
py -3.12 scripts/qa/test_listening_ocr_evidence.py
```

OCR characters are observations, not truth. In the actual 120-image probe, Korean
stem characters, English letters, and circled choices were misread. No question
was automatically approved from OCR. Optional `--manual-review-file` accepts a
separate explicit original-image transcription, checks image and answer identities
again, and writes a delta plus complete per-source copies into
`manual-reviewed-staging`. It never overwrites the parser's original stage.
Visual crops include exact original pixels; text choices retain their original
ordered IDs. The supplied visual-review file must be checked against the original
images. A nonempty review statement by itself does not establish text accuracy.

The source observations, transcriptions, and contact PNGs remain ignored local
artifacts under `output/listening-assessments/native-ocr-verification`. Raw OCR has
no confidence score: the API returns recognized lines/words and bounds, so this
tool does not invent one. Images exceeding the API's live `MaxImageDimension`
are refused rather than silently resized.

Primary Microsoft references checked on 2026-10-04:

- [OcrEngine: results split into lines and words](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine)
- [TryCreateFromLanguage: null when the language is unavailable](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine.trycreatefromlanguage)
- [RecognizeAsync accepts SoftwareBitmap](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine.recognizeasync)
- [OcrWord exposes text and pixel bounds](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrword)
- [Microsoft OCR sample decodes images and checks MaxImageDimension](https://github.com/microsoft/Windows-universal-samples/blob/main/Samples/OCR/cs/OcrFileImage.xaml.cs)
