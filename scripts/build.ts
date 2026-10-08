import { $ } from 'bun'

async function buildDeps(path: string | string[]): Promise<void> {
  if (Array.isArray(path)) {
    await Promise.all(path.map(buildDeps))
    return
  }

  console.log(`Building ${path}...`)
  const { stdout, stderr, exitCode } = await $`bun run -F ${path} build`
    .nothrow()
    .quiet()
  if (exitCode !== 0) {
    console.error(`Failed to build ${path}`)
    console.error(stderr.toString())
    process.exit(exitCode)
  }
  console.log(stdout.toString())
}

const deps: Array<string | string[]> = ['./packages/lib', './packages/cli']

for (const dep of deps) {
  await buildDeps(dep)
}