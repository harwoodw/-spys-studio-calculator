import { defineConfig } from 'vite'

// Simple Vite config without @vitejs/plugin-react (JSX is handled by esbuild)
export default defineConfig({
  define: { 'process.env': {} }
})
