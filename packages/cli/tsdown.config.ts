import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: ['@bingwu/core'],
    dts: {
      alwaysBundle: ['@bingwu/core'],
    },
  },
  dts: true,
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  minify: false,
  publint: true,
  sourcemap: true,
})
