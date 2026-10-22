import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import StudioFigureEditor from '@/components/unified/figure-editor';
import type {StudioFigureSaveResult} from '@/components/unified/figure-editor';
import source from './fixture-source.json';
import './globals-bounded.css';
function Fixture(){
 const [open,setOpen]=useState(true),[saved,setSaved]=useState<StudioFigureSaveResult|null>(null);
 return <main><button onClick={()=>setOpen(true)}>편집기 다시 열기</button>{open&&<StudioFigureEditor
  image={saved?.dataUrl??`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source.svg)))}`}
  initialSvg={saved?.svg??source.svg} originalImage={saved?.originalImage} index={0} onClose={()=>setOpen(false)}
  onSave={async result=>{
   const qa=window as unknown as {qaSaved:unknown;qaDeferSave?:boolean;qaReleaseSave?:()=>void};qa.qaSaved=result;
   if(qa.qaDeferSave)await new Promise<void>(resolve=>{qa.qaReleaseSave=resolve;});
   setSaved(result);
  }}
 />}</main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
