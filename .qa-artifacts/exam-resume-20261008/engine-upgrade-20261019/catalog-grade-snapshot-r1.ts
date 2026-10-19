import fs from 'node:fs';
import assert from 'node:assert/strict';
import { examStudyFamilies, getExamStudyCatalog } from '../../../src/lib/examStudy/registry';
import { EXAM_STUDY_PROFILES } from '../../../src/lib/examStudy/profiles';
import { familyCoverage } from '../../../src/lib/examStudy/evidence';
const all = examStudyFamilies(), catalog = getExamStudyCatalog();
const snapshot = {
  utc: new Date().toISOString(),
  registered: all.length,
  registeredAuthored: all.filter(f => f.source === 'authored').length,
  selectableAuthored: catalog.families.filter(f => f.source === 'authored').length,
  profiles: EXAM_STUDY_PROFILES.map(p => ({
    id: p.id, course: p.course, selectedDemands: p.requirements.length,
    availableDemands: p.requirements.filter(r => all.some(f => f.course === p.course && familyCoverage(f, r.id) === 'full')).length,
  })),
  nullHoldIsUniversalCurriculumCertificate: false,
  wholeExamOrCorpusCertified: false, dbWrites: 0,
};
assert.equal(snapshot.registeredAuthored, 30);
assert.equal(snapshot.selectableAuthored, 29);
assert(snapshot.profiles.every(p => p.availableDemands === p.selectedDemands - (p.id === 'daeryun-m1' ? 1 : 0)));
fs.writeFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/catalog-grade-snapshot-r1.json', JSON.stringify(snapshot, null, 2) + '\n', {flag:'wx'});
console.log(JSON.stringify(snapshot));
