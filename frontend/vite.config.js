import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Manual chunking for optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Example: Split vendor libraries into their own chunk
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios'], 
        },
      },
    },
    // Increase the chunk size warning limit if necessary
    chunkSizeWarningLimit: 1000, // Set to a higher value if the warning is not a concern
  },
})
