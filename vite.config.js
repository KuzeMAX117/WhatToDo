import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',               // Electron loadFile 需要相对路径
  build: { outDir: 'dist' }
});
