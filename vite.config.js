import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      // TresJS renders <Tres*> primitives (TresMesh, TresPerspectiveCamera, lights,
      // geometries, materials, …) through its own custom renderer — they are NOT
      // Vue components in the main app. Without this, Vue's compiler emits
      // resolveComponent() for every one and floods the console with
      // "Failed to resolve component: TresXxx". Treat them as custom elements so
      // the compiler leaves them for the Tres renderer. <TresCanvas> is the one
      // real Vue component (the host), so it must stay resolvable.
      // (@tresjs/core v5 ships an empty templateCompilerOptions, so we set this by hand.)
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('Tres') && tag !== 'TresCanvas',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
