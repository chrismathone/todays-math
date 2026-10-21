import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({envDir:false,cacheDir:path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.vite-local-cache'),resolve:{tsconfigPaths:true},test:{
 include:['.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/pytha-given-upgrade-20261021-r1/native-render.test.ts'],
 environment:'node',globals:false,testTimeout:60000,css:false,setupFiles:[],
 env:{FIGURE_ENGINE_PATH:path.resolve('vendor/figure-engine'),DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
