import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({envDir:false,cacheDir:path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.vite-locked-katex-cache'),resolve:{tsconfigPaths:true,
 alias:[{find:/^katex$/,replacement:path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.local-katex-0.18.2/package/dist/katex.mjs')}],
},plugins:[react()],test:{
 include:['src/__tests__/unit/renderParity.test.tsx'],
 environment:'jsdom',globals:false,testTimeout:40000,css:false,
 setupFiles:[path.resolve('vitest.setup.ts')],server:{deps:{inline:['next-auth','katex','rehype-katex']}},
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
