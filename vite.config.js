import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [mkcert(), vue()],
  server: {
    https: true,
    port: 5500,
  },
  define: {
    'process.env': {}
  }
})