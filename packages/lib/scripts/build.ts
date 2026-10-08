export {}

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  sourcemap: 'linked',
  env: 'disable',
  target: 'bun',
})