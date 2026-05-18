import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // ADICIONE ESTE BLOCO AQUI:
  server: {
    port: 5174,
    strictPort: true, // Opcional: se a 5174 estiver ocupada, ele não tenta a próxima (5175) e dá erro.
  },
})
