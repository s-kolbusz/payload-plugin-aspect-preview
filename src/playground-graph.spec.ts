import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The `/playground` entry must run on a page that has no Payload installed.
// Walk every runtime import reachable from it (type-only imports are erased
// by the compiler, so they don't count) and fail on any Payload package.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FORBIDDEN = /^(payload(\/|$)|@payloadcms\/)/

const IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s+(type\s+)?(?:[^'"`;]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

function resolveLocal(fromFile: string, spec: string, exts: string[]): string {
  const base = resolve(dirname(fromFile), spec)
  const stem = base.replace(/\.(js|ts|tsx)$/, '')
  for (const candidate of [base, ...exts.map((e) => stem + e)]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  throw new Error(`Cannot resolve ${spec} from ${fromFile}`)
}

/** Every bare package specifier reachable from `entry` at runtime. */
function collectPackages(entry: string, exts: string[]): Set<string> {
  const packages = new Set<string>()
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length) {
    const file = queue.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    if (file.endsWith('.css')) continue
    const source = readFileSync(file, 'utf8')
    for (const m of source.matchAll(IMPORT_RE)) {
      const typeOnly = Boolean(m[1])
      const spec = m[2] ?? m[3]
      if (typeOnly) continue
      // `export type { … } from` / `import type { … } from` are caught above;
      // `export { type A, type B } from` with only type names is erased too.
      if (/^(?:import|export)\s*\{\s*(?:type\s+\w+\s*,?\s*)+\}/.test(m[0].trim())) continue
      if (spec.startsWith('.')) queue.push(resolveLocal(file, spec, exts))
      else packages.add(spec)
    }
  }
  return packages
}

const forbiddenIn = (packages: Set<string>) => [...packages].filter((p) => FORBIDDEN.test(p))

describe('playground entry import graph', () => {
  it('reaches no Payload package from the source', () => {
    const packages = collectPackages(join(root, 'src/exports/playground.ts'), ['.ts', '.tsx'])
    expect(forbiddenIn(packages)).toEqual([])
    // Sanity: the walk really followed the graph down to the editor's deps.
    expect(packages).toContain('react-image-crop')
    expect(packages).toContain('react')
  })

  it('still sees Payload from the Payload field component (the check can fail)', () => {
    const packages = collectPackages(join(root, 'src/exports/client.ts'), ['.ts', '.tsx'])
    expect(forbiddenIn(packages)).toContain('@payloadcms/ui')
  })

  const built = join(root, 'dist/exports/playground.js')
  it.skipIf(!existsSync(built))('reaches no Payload package from the built dist', () => {
    const packages = collectPackages(built, ['.js'])
    expect(forbiddenIn(packages)).toEqual([])
    expect(packages).toContain('react-image-crop')
  })
})
