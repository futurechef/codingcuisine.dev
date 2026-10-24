/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Strudel's deps point Node at UMD builds; let Vite resolve their ES modules instead.
    server: { deps: { inline: [/@strudel\//, /@kabelsalat\//] } },
  },
})
