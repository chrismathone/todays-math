import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const localKatex='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.local-katex-0.18.2/package/dist';
export default defineConfig({envDir:false,cacheDir:path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.vite-locked-katex-cache'),resolve:{tsconfigPaths:true,
 alias:[{find:/^katex$/,replacement:path.resolve(localKatex,'katex.mjs')}],
},plugins:[{
 name:'private-test-katex-styles',enforce:'pre',
 transform(code,id){
  if(!id.split('?')[0]!.replaceAll('\\','/').endsWith('/scripts/qa/paperProbe.tsx'))return;
  const from='const dir = path.join(ROOT, "node_modules/katex/dist");';
  if(!code.includes(from))throw Error('CSS test-harness shape changed; review overlay');
  return {code:code.replace(from,`const dir = path.join(ROOT, ${JSON.stringify(localKatex)});`),map:null};
 },
},react()],test:{
 include:['src/__tests__/unit/middleM1PolygonQuestionFigure.test.ts','src/__tests__/unit/middleM2FeasibleConditions.test.ts','src/__tests__/unit/examStudyIntegration.test.ts','src/__tests__/unit/examStudyDraftSnapshots.test.ts','src/__tests__/unit/renderParity.test.tsx','src/__tests__/unit/mathTextWrapChrome.test.tsx'],
 environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth','katex','rehype-katex']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
