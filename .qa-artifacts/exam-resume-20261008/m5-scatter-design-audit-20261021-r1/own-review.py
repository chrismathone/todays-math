from pathlib import Path
import hashlib,json
from fractions import Fraction
P=Path(__file__).resolve().parent
R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
paths=['src/lib/middle/studentInputIdentity.ts','src/lib/middle/generate.ts','src/lib/middle/m3Stat2.ts','scripts/figure/elem_advanced.py','.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-input-20261021-r1/work-card.json']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before={p:sha(R/p) for p in paths}
(P/'own-probe.txt').write_text('UTF8 probe: scatter design only\n',encoding='utf8')
checks={
 'contentOnlyCollapsesDifferentFiguresAfterCoordinateListRemoval':'same prompt'=='same prompt',
 'currentCoordinateListOrderCanEvadeTextDedup':'(40,50), (60,70)'!='(60,70), (40,50)',
 'sortedNumericPairsIgnoreOrder':sorted([(40,50),(60,70)])==sorted([(60,70),(40,50)]),
 'multiplicityMustNotBeSetDeduplicated':len(sorted([(40,50),(40,50),(60,70)]))==3,
 'range30to100Step5Has14MinorIntervals':(Fraction(100)-30)/5==14,
 'range20to100Step5Has16MinorIntervals':(Fraction(100)-20)/5==16,
 'major10DoesNotAlignAt30With20Step':(Fraction(30)-20)/10==1,
 'range0to105Major10NotDivisible':Fraction(105,10).denominator!=1,
 'arbitraryCurrentInteger41NotOn5Lattice':Fraction(41-30,5).denominator!=1,
}
assert all(checks.values())
report={
 'scope':'Short preimplementation design audit; M5/M18 nine scatter families 06..12,14,15 only; 13 excluded',
 'sourceHashes':before,'independentPythonDesignChecks':checks,'actualTSAPIOrRendererExecutions':0,
 'currentObserved':[
  'generateMiddleSet generate.ts:227-228 uses only p.content; retries throw rather than silently returning short sets.',
  'm3Stat2 currently includes raw coordinate lists in content. Therefore picture-only collapse is prospective after removing those lists, not established for every current pair. Current order-sensitive coordinate lists can distinguish the same multiset.',
  'm3Stat2 uses arbitrary integer values (e.g. 40..95), axes carry only unit labels (점), and niceAxis results are reused for both axes.',
  'elem_advanced _scatter_plot derives independent plot_w/plot_h mappings, grids only at major ticks, and labels every major tick. No current gridStep key in scatter optional registry; _axis_from_spec permits at most AXIS_MAX_TICKS=20 intervals and uses floating tolerance, not exact-rational divisibility.',
 ],
 'identityRecommendation':[
  'Allowlist full registered type keys including course/minor/family identity, not just suffix 06; require scatterPlot and supported version. Keep exactly current text identity outside the nine including 13.',
  'Use a versioned unambiguous tuple/JSON encoding of exact content, ordered x/y subject-and-unit labels, and numerically sorted [x,y] pairs. Preserve pair multiplicity; do not swap coordinates or deduplicate points. Normalize negative zero only; reject nonfinite, boolean/string coercions, sparse/malformed/non-pair/empty or oversized arrays before producing identity.',
  'Exclude answer/facts/style/point-array order. Do not strip coordinate-list substrings from existing content by regex: exact content remains order-sensitive until phase4 explicitly removes lists. Subject labels currently only units; actual semantic x/y labels must first be authored and bound to printed content.',
  'Content+labels+points is semantic-input dedup, not complete display identity: excluded axis ranges can affect interpretation/readability. Require validated axes with unchanged meaning and exact readback before removing coordinate lists; malformed whitelisted figures should throw, not silently fall back to text.',
  'No TypeEntry/persisted schema change needed for a pure helper at set selection; separate combo.ts also has content-only guard and is outside proposed generateMiddleSet wiring. Do not claim all callers repaired.',
 ],
 'gridRecommendation':[
  'Opt-in only; absent key must execute original branch byte-for-byte. Add optional key to strict renderer schema/catalog and any typed producer contract, with explicit finite positive numeric and boolean rejection.',
  'Define gridStep relative to both axis minima; require exact integer ratios (max-min)/gridStep and majorStep/gridStep on each axis, with separate bounded minor-interval counts. Label major10 only; never silently round a nondivisible range. Decide decimal policy explicitly (bounded integer/rational recommended).',
  'Square cells require plot_w/nx == plot_h/ny in final serialized coordinates, not merely equal data step values. Current independent plot_w/plot_h does not guarantee this. Use contained aspect-preserving plot dimensions plus tick/unit/title padding; do not distort data axes.',
  'GridStep5 alone does not put current arbitrary integers on the lattice: value41 on axis min30 is 2.2 minor cells. Preserve raw lists until later lattice/domain redesign is independently checked.',
  'Measure actual font-label extents against neighbouring tick boxes, unit/title boxes and point disks; numeric step divisibility or fixed estimated string width alone does not prove clearance. Exact point/axis SVG readback and clipping checks remain necessary.',
 ],
 'missingContractsAndRisks':[
  'Need exact nine full type keys, helper failure return/throw contract, duplicate multiplicity policy, point bounds/axis subject labels, max minor count, square-cell serialized-error criterion, and malformed/foreign figure fixtures.',
  'Changing finite domains to a 5 lattice may shrink capacity and alter rank/tie/threshold/mean/correlation predicates. Preserve retry exhaustion and rederive answers independently; no silent threshold or count change.',
  'No coordinate distance/trigonometry/covariance prerequisite may be inferred from plotting. Current type13 distance exclusion retained. Whole-grade, Unit exact family, source, rights and native/public release remain unapproved.',
 ],
 'limitations':'Static source review plus independent Python logical/rational witnesses only; no actual generated-pair counterexample, TS/API, native render or measured label clearance execution. No production edits. Initial guessed index.ts/elem_advanced.ts paths were absent; actual generate.ts and scripts/figure/elem_advanced.py were read instead.'
}
report['currentObserved'][0]='Current generateMiddleSet now consumes middleStudentInputIdentity; original content-only guard is historical, not current. Retry exhaustion still throws.'
report['currentHelperStaticAssessment']={
 'whitelist':'Exact nine full keys 3-2|상자그림과 산점도|06..12,14,15; 13/other keys retain exact content identity.',
 'canonicalization':'JSON tuple of exact content, trimmed ordered x/y labels and numeric sorted pairs; excludes answer/solution/facts/style and does not mutate point array; negative zero normalized.',
 'malformed':'Array.from visits holes in outer points and inner pairs, converting holes to undefined which fails validation. Rejects invalid kind/version, missing/empty/overlong labels, counts outside2..40, nonpairs, nonnumeric/nonfinite/out-of-range coordinates, and duplicate coordinate pairs. Duplicate rejection is an explicit no-overlapping-person contract, not multiset dedup; current nine must continue ensuring unique coordinates.',
 'contentOrderLimitation':'Point-array order alone is ignored only when content is identical. Existing content embeds the coordinate-list order, so reordering both list text and points still changes identity. No automatic coordinate-text removal should be inferred.',
 'axisBoundary':'Helper intentionally does not validate xMin/xMax/yMin/yMax/steps or point-in-axis bounds. Same content/labels/points with altered or malformed axes can share identity. Renderer validation must run separately before output; helper success is not render success or meaningful axis semantics.',
 'labelBoundary':'Current labels are units, not full subject names; subjects remain in exact content. Future subject axes must be explicitly aligned with content. Trimming labels is a bounded whitespace equivalence, not arbitrary text normalization.',
 'execution':'Static actual-current source review only. No independent JS/TS/API execution; parent368API/43set/34test claims not counted.'}
report['identityRecommendation'][1]='Current implementation rejects duplicate pairs rather than preserving multiplicity: reasonable for these nine only if each point represents one uniquely plotted observation. Do not silently apply this to future overlapping-data templates. Retain the current sparse Array.from checks.'
report['currentDelta']='Interrupted proposal review resumed after helper implementation. Earlier proposed requirements are design recommendations, not claims of missing current whitelist or sparse validation. GridStep work remains prospective.'
assert before=={p:sha(R/p) for p in paths}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'checks':len(checks),'sourceUnchanged':True,'reportSHA256':sha(P/'own-report.json')}))
