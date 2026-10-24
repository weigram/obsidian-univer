import { rename, writeFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import pkg from './package.json'

const outDir = process.env.DIST_DIR ?? 'dist'
const isWatch = process.argv.includes('--watch')

/**
 * Vite emits `style.css` for the library build. Obsidian expects the plugin
 * stylesheet to be called `styles.css`, next to `main.js`.
 */
function obsidianPlugin() {
  return {
    name: 'obsidian-manifest',
    apply: 'build' as const,
    async writeBundle() {
      await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify({
        id: pkg.name,
        name: 'Univer',
        version: pkg.version,
        minAppVersion: '1.6.0',
        description: pkg.description,
        author: pkg.author,
        authorUrl: 'https://github.com/dream-num',
        fundingUrl: 'https://opencollective.com/univer',
        isDesktopOnly: true,
      }, null, 2)}\n`)

      try {
        await rename(resolve(outDir, 'style.css'), resolve(outDir, 'styles.css'))
      }
      catch {
        // CSS only exists when styles are imported.
      }
    },
  }
}

export default defineConfig({
  plugins: [obsidianPlugin()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: isWatch ? 'inline' : false,
    target: 'es2018',
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.ts'),
      name: 'UniverObsidian',
      fileName: () => 'main.js',
      formats: ['cjs'],
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [
        'obsidian',
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      output: {
        inlineDynamicImports: true,
        globals: { obsidian: 'obsidian' },
      },
    },
  },
})
