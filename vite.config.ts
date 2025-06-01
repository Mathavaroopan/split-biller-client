import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2015',
    cssCodeSplit: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['tailwindcss']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    // Add proxy for API calls to avoid CORS issues
    proxy: {
      '/api': {
        target: 'https://split-biller-server.netlify.app',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
