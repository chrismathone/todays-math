import{defineConfig}from'vitest/config';
export default defineConfig({envDir:false,resolve:{tsconfigPaths:true},test:{
 include:['.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/forward-guard-capture-r3.test.ts'],
 environment:'node',globals:false,testTimeout:90000,maxWorkers:1,
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test'}
}});
