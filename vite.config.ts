import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// export default defineConfig(({command, mode}) => {

//   const isDevelopment = command === 'serve'

//   return {
//     base: isDevelopment ? '/' : './',
//     plugins: [
//       vue(),
//       vueJsx(),
//       vueDevTools(),
//     ],
//     resolve: {
//       alias: {
//         '@': fileURLToPath(new URL('./src', import.meta.url))
//       },
//     },
//     build: {
//       sourcemap: isDevelopment,
//     }
//   }
// })

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
