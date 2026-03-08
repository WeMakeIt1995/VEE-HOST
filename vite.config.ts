import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

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

    // copy file by hand to public

    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: path.resolve(__dirname, 'node_modules/libavoid-js/dist/libavoid.wasm'),
    //       dest: 'assets'
    //     }
    //   ]
    // })
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
