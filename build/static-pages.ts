import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

/*
 * GitHub Pages only serves files that exist. The app has several pages
 * (/wardrobe/, /style/, /about/) but Vite builds a single index.html, so a
 * direct link or a refresh on one of them would be a 404.
 *
 * After the build, this plugin copies index.html into a folder per page, so
 * each address is a real file. It also writes 404.html, which GitHub Pages
 * serves for unknown addresses; the app then shows its own not-found page.
 */
export function staticPages(pages: string[]): Plugin {
  let outDir = 'dist'

  return {
    name: 'static-pages',
    apply: 'build',

    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },

    async closeBundle() {
      const index = path.join(outDir, 'index.html')
      for (const page of pages) {
        const dir = path.join(outDir, page)
        await mkdir(dir, { recursive: true })
        await copyFile(index, path.join(dir, 'index.html'))
      }
      await copyFile(index, path.join(outDir, '404.html'))
    },
  }
}
