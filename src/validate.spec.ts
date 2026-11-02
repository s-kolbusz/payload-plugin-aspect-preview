import type { Config } from 'payload'
import { describe, expect, it } from 'vitest'

import { aspectPreviewPlugin } from './plugin.js'
import type { AspectRatioConfig, AspectRatioOverlay } from './types.js'
import { validateAspectRatios } from './validate.js'

const card = (overlays: unknown): AspectRatioConfig[] => [
  { name: 'Card', ratio: '4:5', width: 4, height: 5, overlays: overlays as AspectRatioOverlay[] },
]

describe('validateAspectRatios', () => {
  it('accepts ratios without overlays', () => {
    expect(() => validateAspectRatios([{ name: 'X', ratio: '1:1', width: 1, height: 1 }])).not.toThrow()
  })

  it('accepts valid overlays on every edge, with and without max', () => {
    expect(() =>
      validateAspectRatios(
        card([
          { label: 'Chips', edge: 'top', min: 0.1 },
          { label: 'Title', edge: 'bottom', min: 0.2, max: 0.35 },
          { label: 'Rail', edge: 'left', min: 0, max: 1 },
          { label: 'Badge', edge: 'right', min: 0.15, max: 0.15 },
        ]),
      ),
    ).not.toThrow()
  })

  it('rejects a non-array overlays', () => {
    expect(() => validateAspectRatios(card({ label: 'x' }))).toThrow(/"Card": `overlays` must be an array/)
  })

  it('rejects a missing or empty label', () => {
    expect(() => validateAspectRatios(card([{ label: ' ', edge: 'top', min: 0.1 }]))).toThrow(
      /overlays\[0\]: `label` must be a non-empty string/,
    )
  })

  it('rejects an unknown edge', () => {
    expect(() => validateAspectRatios(card([{ label: 'T', edge: 'middle', min: 0.1 }]))).toThrow(
      /overlays\[0\] \("T"\): `edge` must be one of 'top', 'bottom', 'left', 'right', got "middle"/,
    )
  })

  it.each([-0.1, 1.5, NaN, '0.2', undefined])('rejects min = %s', (min) => {
    expect(() => validateAspectRatios(card([{ label: 'T', edge: 'bottom', min }]))).toThrow(
      /`min` must be a fraction between 0 and 1/,
    )
  })

  it('rejects a max outside 0–1', () => {
    expect(() => validateAspectRatios(card([{ label: 'T', edge: 'bottom', min: 0.2, max: 20 }]))).toThrow(
      /`max` must be a fraction between 0 and 1, got 20/,
    )
  })

  it('rejects max < min', () => {
    expect(() =>
      validateAspectRatios(card([{ label: 'T', edge: 'bottom', min: 0.3, max: 0.2 }])),
    ).toThrow(/`max` \(0.2\) must be greater than or equal to `min` \(0.3\)/)
  })

  it('points at the right overlay when several are set', () => {
    expect(() =>
      validateAspectRatios(
        card([
          { label: 'Chips', edge: 'top', min: 0.1 },
          { label: 'Title', edge: 'bottom', min: 2 },
        ]),
      ),
    ).toThrow(/overlays\[1\] \("Title"\)/)
  })
})

describe('aspectPreviewPlugin with overlays', () => {
  const config = () =>
    ({ collections: [{ slug: 'media', fields: [], upload: true }] }) as unknown as Config

  it('throws when the plugin is applied with an invalid overlay', () => {
    const plugin = aspectPreviewPlugin({
      collections: ['media'],
      aspectRatios: card([{ label: 'T', edge: 'bottom', min: 0.5, max: 0.1 }]),
    })
    expect(() => plugin(config())).toThrow(/aspectPreviewPlugin: aspectRatios "Card"/)
  })

  it('passes valid overlays through to the client config unchanged', () => {
    const aspectRatios = card([{ label: 'Title', edge: 'bottom', min: 0.2, max: 0.35 }])
    const out = aspectPreviewPlugin({ collections: ['media'], aspectRatios })(config())
    expect((out.admin as any).custom.aspectPreview.media.aspectRatios).toEqual(aspectRatios)
  })
})
