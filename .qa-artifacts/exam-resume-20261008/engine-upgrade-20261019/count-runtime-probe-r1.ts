import {asMultipleChoice} from '../../../src/lib/engine/deriveFormats';
import {generateMiddleProblem} from '../../../src/lib/middle/generate';
import {createRng} from '../../../src/lib/elementary/rng';
const s=generateMiddleProblem('1-1|일차방정식의 풀이|09',1,0);console.log(JSON.stringify({input:s.answer,choices:asMultipleChoice({...s,familyKey:'probe',problemType:'계산'},createRng(1))}));
