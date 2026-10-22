import {expect,it} from "vitest";
import {expandFigureFrame} from "@/components/unified/figure-editor/figureFrame";
const raw='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><line data-object-id="a" x1="10" y1="20" x2="50" y2="40" stroke="#111" stroke-width="2"/></svg>';
const read=(s:string)=>new DOMParser().parseFromString(s,"image/svg+xml");
it.each([['both','-20 -20 240 140'],['horizontal','-20 0 240 100'],['vertical','0 -20 200 140']] as const)('%s frame expansion preserves diagram coordinates and stroke', (axis,expected)=>{
 const before=read(raw),after=read(expandFigureFrame(raw,20,axis));
 expect(after.documentElement.getAttribute('viewBox')).toBe(expected);
 expect(after.querySelector('line')?.outerHTML).toBe(before.querySelector('line')?.outerHTML);
 expect(Number(after.documentElement.getAttribute('width'))).toBe(Number(expected.split(' ')[2]));
 expect(Number(after.documentElement.getAttribute('height'))).toBe(Number(expected.split(' ')[3]));
});
it.each([NaN,Infinity,0,-1,10001])('ignores unsupported margin %s',margin=>{expect(expandFigureFrame(raw,margin)).toBe(raw);});
it('keeps percentage dimensions, malformed height and an invalid runtime axis unchanged',()=>{
 for(const svg of [raw.replace('width="200"','width="100%"'),raw.replace('0 0 200 100','0 0 200 -1')])expect(expandFigureFrame(svg,20)).toBe(svg);
 expect(expandFigureFrame(raw,20,'invalid' as never)).toBe(raw);
});
