import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {readFileSync} from 'node:fs';
// Reuse product CSS without scanning the entire repository for Tailwind utilities.
const globals = {name:'fixture-globals', enforce:'pre', load(id) {
  if (id.replaceAll('\\','/').endsWith('/src/app/globals.css'))
    return readFileSync(id,'utf8').replace('@import "tailwindcss";', '');
}};
export default defineConfig({plugins:[globals,react()],define:{'process.env':{}},css:{postcss:{plugins:[]}},resolve:{alias:{'@':path.resolve('src')}},optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','react/jsx-runtime','next/link','zod','katex']},server:{port:3028,strictPort:true}});
