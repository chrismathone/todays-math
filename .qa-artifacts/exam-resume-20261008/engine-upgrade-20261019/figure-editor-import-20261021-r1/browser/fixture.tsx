import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import StudioFigureEditor from '@/components/unified/figure-editor';
import source from './fixture-source.json';
import './globals-bounded.css';

function Fixture(){
  const [open,setOpen]=useState(true);
  return <main><button onClick={()=>setOpen(true)}>편집기 다시 열기</button>{open&&<StudioFigureEditor
    image={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source.svg)))}`}
    initialSvg={source.svg} index={0} onClose={()=>setOpen(false)}
    onSave={(result)=>{(window as unknown as {qaSaved:unknown}).qaSaved=result;}}
  />}</main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
