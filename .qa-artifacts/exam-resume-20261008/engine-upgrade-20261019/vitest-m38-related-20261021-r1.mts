import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,resolve:{tsconfigPaths:true},plugins:[react()],test:{
 include:['src/__tests__/unit/middleM2FeasibleConditions.test.ts','src/__tests__/unit/middleM2Mono.test.ts','src/__tests__/unit/middleM2Center.test.ts','src/__tests__/unit/midTypesB.test.ts','src/__tests__/unit/middleBankFixPremises.test.ts','src/__tests__/unit/examStudyCoreLegacy.test.ts','src/__tests__/unit/examStudyContract.test.ts','src/__tests__/unit/examStudyIntegration.test.ts','src/__tests__/unit/examStudyDraftSnapshots.test.ts'],
 environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
