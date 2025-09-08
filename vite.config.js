import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// We’re not using TypeScript here. This is simple React + Vite.
export default defineConfig({
  plugins: [react()]
})