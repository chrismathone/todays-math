import { describe, expect, it } from 'vitest';
import { coverFigureGrid, gridShortfall, readFigureGrid, resizeFigureGrid, setFigureGrid } from '@/components/unified/figure-editor/figureGrid';
import { parseFigureGridData } from '@/components/unified/figure-editor/figureGridMetadata';
import { figureObjects, prepareFigureSvg } from '@/components/unified/figure-editor/figureSvgEditing';

const base = prepareFigureSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><line x1="20" y1="20" x2="200" y2="150" stroke="#000"/><text x="25" y="25">A</text></svg>');
const grid = {x:40,y:30,cellW:20,cellH:20,cols:10,rows:6,color:'#aaaaaa',width:.8,dashed:false};

describe('grid metadata cannot hide ordinary geometry', () => {
  it.each(['0 0 0 10 2 2','0 0 10 10 0 2','0 0 10 10 61 2','0 0 10 11 2 2','0 0 NaN 10 2 2','0 0 10 10 1.5 2','0 0 10 10 -1 2'])('rejects %s', value => {
    expect(parseFigureGridData(value)).toBeNull();
    const source=prepareFigureSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g data-grid="${value}"><path d="M0 0V10"/></g></svg>`);
    expect(readFigureGrid(source)).toBeNull();expect(figureObjects(source)).toHaveLength(1);
  });
  it.each(['transform="translate(1 1)"','nested','late'])('keeps %s shapes editable', kind => {
    const g=`<g data-grid="0 0 10 10 2 2" ${kind.startsWith('transform')?kind:''}><path d="M0 0V10"/></g>`;
    const body=kind==='nested'?`<g>${g}</g>`:kind==='late'?`<line x1="0" y1="0" x2="1" y2="1"/>${g}`:g;
    const source=prepareFigureSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`);
    expect(readFigureGrid(source)).toBeNull();expect(figureObjects(source).length).toBeGreaterThan(0);
  });
  it('resizing changes the background only and keeps original object attributes', () => {
    const original=figureObjects(base);
    let source=setFigureGrid(base,grid);
    for (const n of [3,14,60,1,10]) {
      source=setFigureGrid(source,resizeFigureGrid(readFigureGrid(source)!,'x',n));
      expect(figureObjects(source)).toEqual(original);
      // prepare normalizes CSS whitespace independently of any grid edit.
      expect(figureObjects(prepareFigureSvg(source))).toEqual(figureObjects(prepareFigureSvg(base)));
    }
  });
  it('rejects nonfinite writes before producing broken markup', () => {
    for(const bad of [{...grid,x:NaN},{...grid,cellW:Infinity},{...grid,cols:1.5},{...grid,width:Infinity},
      {...grid,cols:1.001},{...grid,cols:.999},{...grid,cols:60.001}]) {
      expect(()=>setFigureGrid(base,bad)).toThrow();
    }
  });
  it('does not pretend that a 60-cell grid can cover a larger figure', () => {
    const small={...grid,x:0,y:0,cellW:10,cellH:10,cols:60,rows:60};
    const box={x:0,y:0,width:610,height:600};
    expect(gridShortfall(coverFigureGrid(small,box),box).right).toBe(1);
  });
});
