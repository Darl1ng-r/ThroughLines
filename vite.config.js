import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Warn when a chunk exceeds 300KB (before gzip)
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        // Manual vendor chunk splitting to prevent monolithic bundles
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true
  }
})
