import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  // Tauri 使用固定端口开发服务器
  server: {
    port: 5173,
    strictPort: true,
  },
  // 生产构建输出到 dist/
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // 环境变量前缀（Tauri 使用 TAURI_ 前缀）
  envPrefix: ['VITE_', 'TAURI_'],
});
