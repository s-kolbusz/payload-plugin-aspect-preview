import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AspectRatioPreviewGrid } from './components/AspectRatioPreviewGrid.js'
import { DEFAULT_ASPECT_RATIOS } from './defaults.js'
import type { AspectRatioConfig } from './types.js'

const render = (aspectRatios: AspectRatioConfig[]) =>
  renderToStaticMarkup(
    createElement(AspectRatioPreviewGrid, { url: '/photo.jpg', focalX: 50, focalY: 50, aspectRatios }),
  )

describe('preview overlays', () => {
  it('draws nothing extra when no ratio has overlays', () => {
    const html = render(DEFAULT_ASPECT_RATIOS)
    expect(html).not.toContain('focal-preview__zone')
  })

  it('draws one zone per overlay inside the tile frame, under the crosshair', () => {
    const html = render([
      {
        name: 'Card',
        ratio: '4:5',
        width: 4,
        height: 5,
        overlays: [
          { label: 'Chips', edge: 'top', min: 0.1 },
          { label: 'Title + price', edge: 'bottom', min: 0.2, max: 0.4 },
        ],
      },
    ])
    expect(html.match(/data-testid="aspect-preview-overlay"/g)).toHaveLength(2)
    expect(html).toContain('aria-hidden="true"')
    // Pinned to the frame (inside it), drawn before the crosshair.
    const frame = html.indexOf('focal-preview__card-frame')
    expect(html.indexOf('focal-preview__zones')).toBeGreaterThan(frame)
    expect(html.indexOf('focal-preview__zones')).toBeLessThan(html.indexOf('focal-preview__card-crosshair'))
    expect(html).toContain('Title + price')
  })

  it('sizes the zone to max and the solid part to min/max', () => {
    const html = render([
      {
        name: 'Card',
        ratio: '4:5',
        width: 4,
        height: 5,
        overlays: [{ label: 'Title', edge: 'bottom', min: 0.2, max: 0.4 }],
      },
    ])
    expect(html).toContain('focal-preview__zone--bottom')
    expect(html).toContain('--apv-zone-size:40%')
    expect(html).toContain('--apv-zone-solid:50%')
    expect(html).toContain('focal-preview__zone-range')
  })

  it('draws no hatched range when max is omitted', () => {
    const html = render([
      {
        name: 'Card',
        ratio: '1:1',
        width: 1,
        height: 1,
        overlays: [{ label: 'Badge', edge: 'right', min: 0.25 }],
      },
    ])
    expect(html).toContain('--apv-zone-size:25%')
    expect(html).toContain('--apv-zone-solid:100%')
    expect(html).not.toContain('focal-preview__zone-range')
  })

  it('draws no zone (and no stray label) for an overlay that covers nothing', () => {
    const html = render([
      {
        name: 'Card',
        ratio: '1:1',
        width: 1,
        height: 1,
        overlays: [{ label: 'Empty', edge: 'top', min: 0 }],
      },
    ])
    expect(html).not.toContain('aspect-preview-overlay')
    expect(html).not.toContain('Empty')
  })
})
