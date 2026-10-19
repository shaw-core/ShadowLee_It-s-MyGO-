import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages 部署在 /ShadowLee_It-s-MyGO-/ 子路径下；
// 本地测试版（BUILD_TARGET=standalone）用相对路径，任何地方都能直接打开。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.BUILD_TARGET === 'standalone' ? './' : '/ShadowLee_It-s-MyGO-/',
  build: { chunkSizeWarningLimit: 2000 },
});
