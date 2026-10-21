import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,cacheDir:path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.vite-local-cache'),resolve:{tsconfigPaths:true},plugins:[react()],test:{
 include:['src/__tests__/unit/middleM1PolygonQuestionFigure.test.ts','src/__tests__/unit/middleM2FeasibleConditions.test.ts','src/__tests__/unit/examStudyIntegration.test.ts','src/__tests__/unit/examStudyDraftSnapshots.test.ts','src/__tests__/unit/renderParity.test.tsx','src/__tests__/unit/mathTextWrapChrome.test.tsx'],
 environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
