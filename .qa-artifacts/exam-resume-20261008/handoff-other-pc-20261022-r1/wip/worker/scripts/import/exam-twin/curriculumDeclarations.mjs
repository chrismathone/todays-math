/** Compare explicit declarations, never infer grade fit from a code or probability. */
export function compareCurriculumDeclarations(candidate) {
  const review = candidate?.curriculumReview;
  const primary = review?.officialBasis?.primaryStandardCodes;
  const declared = review?.standardCodes;
  const base = { comparisonPerformed: false, conflicts: [], curriculumApproved: false, permitsLoad: false };
  // Older records without this pair remain dependent on their external evidence;
  // absence is not a successful metadata comparison or a curriculum approval.
  if (primary === undefined || declared === undefined)
    return { ...base, status: 'not-comparable-missing-declaration' };
  const normalized = (values) => Array.isArray(values) && values.length > 0 &&
    values.every(v => typeof v === 'string' && v.trim())
    ? values.map(v => v.trim().replace(/^\[([^\[\]]*)\]$/u, '$1').trim()) : null;
  const p = normalized(primary), d = normalized(declared);
  if (!p || !d || [...p, ...d].some(v => !v))
    return { ...base, status: 'conflict', comparisonPerformed: true, conflicts: [{
      path: 'curriculumReview', kind: 'malformed-explicit-standard-declaration',
      basis: 'Both declared fields must be nonempty arrays of individual nonempty code strings',
    }] };
  const available = new Set(d);
  const conflicts = p.filter(code => !available.has(code)).map(code => ({
    path: 'curriculumReview.officialBasis.primaryStandardCodes',
    kind: 'primary-code-absent-from-candidate-standards', code,
    declaredCodes: [...d],
    basis: 'The candidate gives two incompatible explicit standard declarations; review the actual primary document and intended placement',
  }));
  return { ...base, comparisonPerformed: true, status: conflicts.length ? 'conflict' : 'consistent-as-declared', conflicts };
}
