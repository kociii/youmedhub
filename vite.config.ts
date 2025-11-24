import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      // 代理临时文件服务 API，解决 CORS 跨域问题
      '/api/tmpfile': {
        target: 'https://tmpfile.link',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmpfile/, '/api'),
        secure: true,
      },
    },
  },
})
