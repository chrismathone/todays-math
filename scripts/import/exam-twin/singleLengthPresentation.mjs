/** A single explicit length with a bounded exact constant. Presentation only:
 * existing Fraction/radical arithmetic owns equality, never an AI or image.
 * This does not prove the value is a positive length or that a problem is valid.
 */
import assert from 'node:assert/strict';
import {compareConstantParts} from './constantAnswers.mjs';

export function singleLengthPart(source) {
  assert(typeof source === 'string' && source.length <= 640, 'Bounded single length required');
  let text = source.trim();
  if (text.startsWith('$') && text.endsWith('$')) text = text.slice(1, -1).trim();
  else if (text.startsWith('\\(') && text.endsWith('\\)')) text = text.slice(2, -2).trim();
  const suffix = /(?:\\(?:mathrm|text)\{(cm|m)\}|(cm|m))$/u.exec(text);
  assert(suffix, 'One explicit cm or m unit required');
  const value = text.slice(0, suffix.index).trim();
  assert(value.length > 0 && value.length <= 512, 'One bounded constant required');
  assert(!/^\(\s*\d+\s*\)\s*\S/u.test(value), 'Numbered answer cannot become an unnamed product');
  assert(!/\d(?:\s|\\[,!; ])+\d/u.test(value), 'Separated numerals');
  // Do not let a malformed grouping command disappear in the constant parser.
  // Literal parentheses and the exact Fraction/radical grammar suffice here.
  assert(!/\\(?:left|right)/u.test(value), 'Use explicit scalar parentheses');
  const part = {role:'scalar-length',value,unit:suffix[1] ?? suffix[2]};
  assert.equal(compareConstantParts([part],[part]).status,'equivalent','Unsupported exact length expression');
  return part;
}
