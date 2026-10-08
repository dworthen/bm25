import { resolve } from 'node:path'
import { argv } from 'bun'

const builds: Record<string, string> = {
  'bun-linux-arm64': 'bin/linux-arm64/bm25',
  'bun-linux-arm64-musl': 'bin/linux-arm64-musl/bm25',
  'bun-linux-x64-modern': 'bin/linux-x64/bm25',
  'bun-linux-x64-musl-modern': 'bin/linux-x64-musl/bm25',
  'bun-windows-x64-modern': 'bin/win-x64/bm25',
  'bun-windows-arm64': 'bin/win-arm64/bm25',
  'bun-darwin-arm64': 'bin/darwin-arm64/bm25',
  'bun-darwin-x64': 'bin/darwin-x64/bm25',
}

async function buildTarget(target: string, outFile: string): Promise<void> {
  console.log(`Building for target: ${target}...`)
  await Bun.build({
    entrypoints: [
      './src/index.ts',
      './src/concurrency/workers/breakdownDocument/breakdownDocument.ts',
    ],
    define: {
      SOME_GLOBAL: JSON.stringify(true),
    },
    features: ['IS_BINARY'],
    compile: {
      // @ts-expect-error
      target,
      outfile: resolve(outFile),
      autoloadTsConfig: false,
      autoloadPackageJson: false,
      autoloadBunConfig: false,
      autoloadDotEnv: false,
    },
    minify: true,
    splitting: false,
    sourcemap: 'none',
    env: 'disable',
  })
  console.log(`Built ${target} successfully! Output: ${outFile}`)
}

const target = argv[2]
if (target && builds[target]) {
  await buildTarget(target, builds[target])
} else {
  await Promise.all(
    Object.entries(builds).map(
      async ([target, outFile]) => await buildTarget(target, outFile),
    ),
  )
}