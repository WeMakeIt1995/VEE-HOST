import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator'

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

    // vitePluginBundleObfuscator({
    //   excludes: [],
    //   enable: true,
    //   log: true,
    //   autoExcludeNodeModules: false,
    //   threadPool: false,
    //   options: {
    //     compact: true,
    //     controlFlowFlattening: true,
    //     controlFlowFlatteningThreshold: 1,
    //     deadCodeInjection: false,
    //     debugProtection: false,
    //     debugProtectionInterval: 0,
    //     disableConsoleOutput: false,
    //     identifierNamesGenerator: "hexadecimal",
    //     log: false,
    //     numbersToExpressions: false,
    //     renameGlobals: false,
    //     selfDefending: true,
    //     simplify: true,
    //     splitStrings: false,
    //     stringArray: false, // 注意此处一定要设置为false
    //     stringArrayCallsTransform: false,
    //     stringArrayCallsTransformThreshold: 0.5,
    //     stringArrayEncoding: [],
    //     stringArrayIndexShift: true,
    //     stringArrayRotate: true,
    //     stringArrayShuffle: true,
    //     stringArrayWrappersCount: 1,
    //     stringArrayWrappersChainedCalls: true,
    //     stringArrayWrappersParametersMaxCount: 2,
    //     stringArrayWrappersType: "variable",
    //     stringArrayThreshold: 0.75,
    //     unicodeEscapeSequence: false,
    //   },
    // }),
  ],

  // build: {
  //   minify: 'terser', // 使用 terser 进行压缩
  //   terserOptions: {
  //     compress: {
  //       drop_console: true, // 移除 console
  //       drop_debugger: true // 移除 debugger
  //     }
  //   }
  // },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
