import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FigureGridPanel } from '@/components/unified/figure-editor/FigureGridPanel';

const grid={x:0,y:0,cellW:10,cellH:10,cols:10,rows:10,color:'#aaaaaa',width:.8,dashed:false};
const actions=()=>({onAdd:vi.fn(),onChange:vi.fn(),onCenter:vi.fn(),onRemove:vi.fn()});
describe('grid coverage limits remain visible',()=>{
  it('can add the background separately from figure objects',()=>{
    const a=actions();render(<FigureGridPanel grid={null} content={null} {...a}/>);
    fireEvent.click(screen.getByRole('button',{name:'모눈 깔기'}));expect(a.onAdd).toHaveBeenCalledOnce();
    expect(a.onChange).not.toHaveBeenCalled();
  });
  it('adds two missing cells for a 120-unit figure at ten units per cell',()=>{
    const a=actions();render(<FigureGridPanel grid={grid} content={{x:0,y:0,width:120,height:100}} {...a}/>);
    const extend=screen.getByRole('button',{name:'그림이 다 들어가게 늘리기'});
    expect(extend).toBeEnabled();fireEvent.click(extend);
    expect(a.onChange).toHaveBeenCalledWith({...grid,cols:12});
  });
  it('reports the sixty-cell limit instead of claiming coverage',()=>{
    const a=actions();render(<FigureGridPanel grid={{...grid,cols:60,rows:60}} content={{x:0,y:0,width:610,height:600}} {...a}/>);
    const extend=screen.getByRole('button',{name:'그림이 다 들어가게 늘리기'});
    expect(extend).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent('60칸 한도');
    fireEvent.click(extend);expect(a.onChange).not.toHaveBeenCalled();
  });
});
