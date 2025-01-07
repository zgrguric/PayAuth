import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import mkcert from 'vite-plugin-mkcert'
import vueI18n from '@intlify/vite-plugin-vue-i18n'

export default defineConfig({
  plugins: [mkcert(), vue(), vueI18n({
      include: path.resolve(__dirname, './src/locales/**')
    })],
  server: {
    https: true,
    port: 5500,
  },
  define: {
    'process.env': {}
  }
})