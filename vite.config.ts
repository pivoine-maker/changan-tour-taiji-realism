import { defineConfig } from 'vite';

export default defineConfig({
  base: '/changan-tour-taiji-realism/',
  optimizeDeps: {exclude:['three-gpu-pathtracer','three-mesh-bvh']},
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks(id) {
      if(id.includes('/node_modules/three/')) return 'three-runtime';
    } } }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
