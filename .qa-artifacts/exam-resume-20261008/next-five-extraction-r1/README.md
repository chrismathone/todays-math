# Question-only source extraction r1

Give authoring workers ONLY each school's packet/ directory. Those folders contain 106 parent questions, 116 leaf assessment items, question-only crops and held curriculum candidates. Original answer/solution notes and key pages are withheld.

Audit evidence/ scans may contain student answer annotations: do not distribute them to authoring. Full-exam equivalence, grade approvals, rights approvals and verified twins are all 0. DB join belongs to parent separately.

Order: extract_source.py → render_scans.py / explicit additional scan rendering → compact_evidence.py → finalize_source.py. Rerendering original scan PNGs requires recompact/review, never editing originals.

- [경구중 packet](gyeonggu/packet/index.html) — 23 parents
- [경산중 packet](gyeongsan/packet/index.html) — 25 parents
- [경상중 packet](gyeongsang/packet/index.html) — 22 parents
- [경신중 packet](gyeongsin/packet/index.html) — 17 parents
- [경암중 packet](gyeongam/packet/index.html) — 19 parents
