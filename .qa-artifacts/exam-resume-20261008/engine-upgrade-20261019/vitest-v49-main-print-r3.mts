import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,resolve:{tsconfigPaths:true},plugins:[react()],test:{
 include:["src/__tests__/components/conceptBlankWritingArea.test.tsx", "src/__tests__/components/descriptivePaper.test.tsx", "src/__tests__/components/descriptiveUnifiedPrint.test.tsx", "src/__tests__/components/PrintCheck.test.tsx", "src/__tests__/components/nativeDescriptiveAuthorPrint.test.tsx", "src/__tests__/components/TemplateT2.test.tsx", "src/__tests__/components/PrintColorImplementation.test.tsx", "src/__tests__/components/WorksheetPrint.preview.test.tsx", "src/__tests__/unit/conceptBlankWritingAreaRegression.test.ts"],environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
