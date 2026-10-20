from pathlib import Path
import json,hashlib
P=Path('.qa-artifacts/exam-resume-20261008/gachang-first2-review-20261020-r1');E=P/'own-review-evidence-r1';r=json.loads((E/'own-primary-and-unit-receipt.json').read_text(encoding='utf-8'));assert r['receiptSHA256']=='989a9a091d77ad991d599a0cfc48cf81a4a6fc86d0efb14cdc37872724d8e45d';assert r['snapshotSHA256']=='a755032bd15af63a2151658a2c17490b0c461fc980fa5fc601c3d2598eb591d2';print('primary/snapshot exact metadata SHA bindings match')
