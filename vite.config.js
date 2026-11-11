import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import jsonDataPlugin from './tools/vite-json-data-plugin.js'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // GitHub Pages 项目站部署在 /<repo>/ 子路径下，通过环境变量注入；本地开发保持 /
  base: process.env.GITHUB_PAGES_BASE || '/',
  plugins: [vue(), jsonDataPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    open: false,
    // data/ 由本地 JSON 插件通过 SSE 推送变更，避免 Vite 再触发整页 HMR 双刷新
    watch: { ignored: ['**/data/**'] },
  },
  build: {
    // 显式降级可选链/空值合并等语法，覆盖 README 声明的老浏览器基线
    target: 'es2015',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'axios'],
          element: ['element-plus', '@element-plus/icons-vue'],
          echarts: ['echarts'],
        },
      },
    },
  },
})
