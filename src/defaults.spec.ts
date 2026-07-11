import { describe, expect, it } from 'vitest'
import { DEFAULT_ASPECT_RATIOS } from './defaults.js'

describe('DEFAULT_ASPECT_RATIOS', () => {
  it('ships six ratios', () => {
    expect(DEFAULT_ASPECT_RATIOS).toHaveLength(6)
  })

  it('every entry has positive width/height and a name', () => {
    for (const r of DEFAULT_ASPECT_RATIOS) {
      expect(r.name.length).toBeGreaterThan(0)
      expect(r.width).toBeGreaterThan(0)
      expect(r.height).toBeGreaterThan(0)
    }
  })

  it('includes a 16:9 widescreen ratio', () => {
    expect(DEFAULT_ASPECT_RATIOS.some((r) => r.width === 16 && r.height === 9)).toBe(true)
  })
})
