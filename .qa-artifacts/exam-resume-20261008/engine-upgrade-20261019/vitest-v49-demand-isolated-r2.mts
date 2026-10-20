import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,resolve:{tsconfigPaths:true},plugins:[react()],test:{
 include:['src/components/exam-builder/ExamBuilder.demand.test.tsx'],environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
