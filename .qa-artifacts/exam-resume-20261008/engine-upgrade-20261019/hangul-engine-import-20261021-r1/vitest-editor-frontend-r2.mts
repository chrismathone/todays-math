import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({envDir:false,cacheDir:path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/.vite-local-cache'),resolve:{tsconfigPaths:true},test:{
 include:['src/__tests__/unit/figureGridLabels.test.ts','src/__tests__/unit/figureGridBoundaries.test.ts','src/__tests__/components/FigureLabelInput.test.tsx','src/__tests__/components/StudioFigureEditor.panelFolds.test.tsx','src/__tests__/components/StudioFigureEditor.initialTypeset.test.tsx','src/__tests__/components/StudioFigureEditor.formatToggles.test.tsx','src/__tests__/unit/figureLabelUpright.test.ts'],
 environment:'jsdom',globals:false,testTimeout:60000,css:false,setupFiles:['./vitest.setup.ts'],
 env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:''}
}});
