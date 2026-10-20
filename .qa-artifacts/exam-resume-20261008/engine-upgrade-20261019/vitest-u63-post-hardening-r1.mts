import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,resolve:{tsconfigPaths:true},plugins:[react()],test:{
 include:["src/__tests__/unit/examStudyM3MethodGradeGates.test.ts", "src/__tests__/unit/examStudyInverseCoefficient.test.ts", "src/__tests__/unit/examStudyInverseEquationDegree.test.ts", "src/__tests__/unit/examStudyInverseMinimum.test.ts", "src/__tests__/unit/examStudyInverseRootTable.test.ts", "src/__tests__/unit/examStudyInverseTangentRectangle.test.ts", "src/__tests__/unit/examStudyCurriculumEligibility.test.ts", "src/__tests__/unit/examStudyCore.test.ts", "src/__tests__/unit/examStudyMiddle.test.ts", "src/__tests__/unit/examStudyContract.test.ts"],environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
