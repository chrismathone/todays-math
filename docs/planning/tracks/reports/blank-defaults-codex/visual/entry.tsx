import React from 'react';
import { createRoot } from 'react-dom/client';
import ConceptBlankView from '@/components/concept-blank/ConceptBlankView';
import { bank as e5 } from '@/lib/concept-blank/bank/e5';
import { bank as m1 } from '@/lib/concept-blank/bank/m1';
import { joinBanks } from '@/lib/concept-blank/bank/plus';
import '@/app/globals.css';
createRoot(document.getElementById('root')!).render(<main style={{padding:24,maxWidth:1366,margin:'0 auto'}}><ConceptBlankView bank={joinBanks([e5,m1])} /></main>);
