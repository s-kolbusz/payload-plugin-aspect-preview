import { describe, expect, it } from 'vitest'

import { toCropRelativeFocal, toFullImageFocal } from './focal'

// The editor works in full-image focal coordinates but Payload stores the focal
// point relative to the crop region. `focal.ts` converts between the two. These
// tests pin the two properties we depend on: agreement with the preview grid's
// (independently derived, pixel-based) formula, and being exact inverses.

// The preview grid's conversion, in pixels, as it exists in AspectRatioPreviewGrid.
function previewFocal(
  focalX: number,
  focalY: number,
  cropPx: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number,
) {
  return {
    x: (((focalX / 100) * imgW - cropPx.x) / cropPx.w) * 100,
    y: (((focalY / 100) * imgH - cropPx.y) / cropPx.h) * 100,
  }
}

describe('focal ↔ crop-relative', () => {
  const focal = { x: 75, y: 40 }
  const crop = { x: 50, y: 0, width: 50, height: 60 } // right-ish region, in %

  it('save path matches the preview grid for arbitrary image sizes', () => {
    for (const [imgW, imgH] of [[1000, 800], [1920, 1080], [640, 640]]) {
      const cropPx = {
        x: (crop.x / 100) * imgW,
        y: (crop.y / 100) * imgH,
        w: (crop.width / 100) * imgW,
        h: (crop.height / 100) * imgH,
      }
      const saved = toCropRelativeFocal(focal, crop)
      const preview = previewFocal(focal.x, focal.y, cropPx, imgW, imgH)
      expect(saved.x).toBeCloseTo(preview.x, 6)
      expect(saved.y).toBeCloseTo(preview.y, 6)
    }
  })

  it('the two conversions are exact inverses (round-trip)', () => {
    const roundTripped = toFullImageFocal(toCropRelativeFocal(focal, crop), crop)
    expect(roundTripped.x).toBeCloseTo(focal.x, 6)
    expect(roundTripped.y).toBeCloseTo(focal.y, 6)
  })

  it('a focal at the crop centre maps to 50/50', () => {
    const centre = { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 }
    const saved = toCropRelativeFocal(centre, crop)
    expect(saved.x).toBeCloseTo(50, 6)
    expect(saved.y).toBeCloseTo(50, 6)
  })

  it('a focal at the crop origin maps to 0/0 (edge is not lost)', () => {
    const saved = toCropRelativeFocal({ x: crop.x, y: crop.y }, crop)
    expect(saved.x).toBeCloseTo(0, 6)
    expect(saved.y).toBeCloseTo(0, 6)
  })
})
