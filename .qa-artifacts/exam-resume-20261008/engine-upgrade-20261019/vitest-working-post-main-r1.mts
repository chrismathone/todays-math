import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,resolve:{tsconfigPaths:true},plugins:[react()],test:{
 include:[
  'src/components/exam-builder/ExamBuilder.test.tsx','src/components/exam-builder/ExamBuilder.demand.test.tsx','src/components/exam-builder/ExamBuilder.h2.test.tsx',
  'src/__tests__/unit/examStudyContract.test.ts','src/__tests__/unit/examStudyInverseMinimum.test.ts','src/__tests__/unit/examStudyInverseTangentRectangle.test.ts','src/__tests__/unit/lockProblemRows.test.ts',
  'src/__tests__/components/ConceptBlankUnitPicker.test.tsx','src/__tests__/components/ConceptBlankView.test.tsx',
  'src/__tests__/components/UnifiedWorkspace.access.test.tsx','src/__tests__/components/UnifiedWorkspace.actions.test.tsx','src/__tests__/components/UnifiedWorkspace.cart.test.tsx','src/__tests__/components/WorksheetEditor.orderPanel.test.tsx'
 ],environment:'jsdom',globals:false,testTimeout:20000,css:false,setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:'http://localhost'}
}});
