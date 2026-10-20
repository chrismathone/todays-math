import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {readFileSync} from 'node:fs';
// Reuse product CSS without scanning the entire repository for Tailwind utilities.
const globals = {name:'fixture-globals', enforce:'pre', load(id) {
  if (id.replaceAll('\\','/').endsWith('/src/app/globals.css'))
    return readFileSync(id,'utf8').replace('@import "tailwindcss";', '');
}};
export default defineConfig({plugins:[globals,react()],define:{'process.env':{}},css:{postcss:{plugins:[]}},resolve:{alias:{'@':path.resolve('src')}},optimizeDeps:{entries:['docs/planning/tracks/reports/blank-defaults-codex/visual/index.html'],include:['react','react-dom/client','react/jsx-runtime','next/link','zod','katex','mathjax-full/js/adaptors/liteAdaptor.js','mathjax-full/js/handlers/html.js','mathjax-full/js/input/tex.js','mathjax-full/js/input/tex/AllPackages.js','mathjax-full/js/mathjax.js','mathjax-full/js/output/svg.js']},server:{port:3028,strictPort:true}});
