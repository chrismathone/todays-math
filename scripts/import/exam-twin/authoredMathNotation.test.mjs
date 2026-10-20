import assert from 'node:assert/strict';
import test from 'node:test';
import {unescapedMathCommandWarnings as warnings} from './authoredMathNotation.mjs';

test('catches the actual lost radical and ellipsis escapes accepted as TeX letter products',()=>{
  const failed=String.raw`$$\sqrt1, sqrt2, sqrt3, ldots, sqrt k$$`;
  assert.deepEqual(warnings(failed).map(x=>x.token),['sqrt','sqrt','ldots','sqrt']);
  assert.deepEqual(warnings(String.raw`$$\sqrt1,\ \sqrt2,\ \sqrt3,\ \ldots,\ \sqrt k$$`),[]);
});
test('finds inline, display and multiline fraction and radical losses with exact offsets',()=>{
  const value='outside sqrt2 $sqrt{2}$\n$$frac{1}{2}\n+ dfrac {3}{4}+tfrac{5}{6}+cdots$$';
  const found=warnings(value);assert.deepEqual(found.map(x=>x.token),['sqrt','frac','dfrac','tfrac','cdots']);
  for(const x of found)assert.equal(value.slice(x.offset,x.offset+x.token.length),x.token);
});
test('leaves ordinary prose, named variables and correctly escaped commands alone',()=>{
  assert.deepEqual(warnings(String.raw`JS sqrt2 is prose. $asqrt2+xsqrt+\sqrt2+\dfrac{1}{2}+\ldots$`),[]);
});
test('literal text groups, nested braces and escaped braces are preserved without warnings',()=>{
  const value=String.raw`$\text{sqrt2 {ldots} \{frac{1}{2}\}}+\operatorname{sqrt}(2)+\mathrm{sqrt2}+\texttt{sqrt k}+\sqrt2$`;
  assert.deepEqual(warnings(value),[]);
});
test('escaped dollar signs do not turn prose into math or hide later genuine math',()=>{
  assert.deepEqual(warnings(String.raw`cost \$sqrt2 and later $sqrt3$`).map(x=>x.token),['sqrt']);
  assert.deepEqual(warnings(String.raw`$\text{cost \$5 sqrt2}+\sqrt3$`),[]);
});
test('non-BMP characters do not shift literal masks or diagnostic offsets',()=>{
  const text=String.raw`$😀+\text{sqrt2 {ldots}}+sqrt3$`;
  const found=warnings(text);assert.equal(found.length,1);assert.equal(text.slice(found[0].offset,found[0].offset+4),'sqrt');
});

test('the actual renderable lost unit marker is diagnosed, including an adjacent variable',()=>{
  for(const value of ['$15,mathrm{cm}$','$60,mathrm{cm}$','$2mathrm{m}^{2}$','$amathrm{cm}$']){
    const before=value,found=warnings(value);assert.equal(found.length,1);assert.equal(found[0].token,'mathrm');assert.equal(value.slice(found[0].offset,found[0].offset+6),'mathrm');assert.equal(value,before);
  }
});
test('proper cm/m commands, ordinary prose and deliberately quoted marker text are untouched',()=>{
  assert.deepEqual(warnings(String.raw`$15\,\mathrm{cm}+2\,\mathrm{m}^{2}+a\mathrm{cm}$`),[]);
  assert.deepEqual(warnings(String.raw`Prose:mathrm{cm}. $\texttt{mathrm{cm}}+\text{mathrm{m}}+\operatorname{mathrm{cm}}$`),[]);
});
test('unit losses retain UTF16 offsets and source order with existing radical/fraction warnings',()=>{
  const text=String.raw`$😀+mathrm{cm}+sqrt2+\text{mathrm{m}}+frac{1}{2}+mathrm { m }$`;
  const found=warnings(text);assert.deepEqual(found.map(x=>x.token),['mathrm','sqrt','frac','mathrm']);for(const x of found)assert.equal(text.slice(x.offset,x.offset+x.token.length),x.token);
});
