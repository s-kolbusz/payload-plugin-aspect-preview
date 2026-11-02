import type { AspectRatioConfig } from './types.js'

/** The frame edges an overlay can start from; `AspectRatioOverlay['edge']` is derived from it. */
export const OVERLAY_EDGES = ['top', 'bottom', 'left', 'right'] as const

const isFraction = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1

function assertFraction(at: string, name: 'min' | 'max', value: unknown): void {
  if (!isFraction(value)) {
    throw new Error(
      `${at}: \`${name}\` must be a fraction between 0 and 1, got ${JSON.stringify(value)}.`,
    )
  }
}

/**
 * Throws on an `overlays` entry the preview can't draw, naming the ratio and
 * the overlay so the mistake is easy to find in `payload.config.ts`. Runs once,
 * when the plugin is applied, so a bad config fails at startup instead of
 * rendering a band in the wrong place.
 */
export function validateAspectRatios(aspectRatios: AspectRatioConfig[]): void {
  for (const ratio of aspectRatios) {
    if (ratio.overlays === undefined) continue
    const where = `aspectPreviewPlugin: aspectRatios "${ratio.name}"`
    if (!Array.isArray(ratio.overlays)) {
      throw new Error(`${where}: \`overlays\` must be an array.`)
    }

    ratio.overlays.forEach((overlay, i) => {
      const hasLabel = typeof overlay?.label === 'string' && overlay.label.trim() !== ''
      const at = `${where}, overlays[${i}]${hasLabel ? ` ("${overlay.label}")` : ''}`
      if (!hasLabel) {
        throw new Error(`${at}: \`label\` must be a non-empty string.`)
      }
      if (!(OVERLAY_EDGES as readonly unknown[]).includes(overlay.edge)) {
        throw new Error(
          `${at}: \`edge\` must be one of ${OVERLAY_EDGES.map((e) => `'${e}'`).join(', ')}, got ${JSON.stringify(overlay.edge)}.`,
        )
      }
      assertFraction(at, 'min', overlay.min)
      if (overlay.max !== undefined) {
        assertFraction(at, 'max', overlay.max)
        if (overlay.max < overlay.min) {
          throw new Error(
            `${at}: \`max\` (${overlay.max}) must be greater than or equal to \`min\` (${overlay.min}).`,
          )
        }
      }
      // With nothing covered there is no band to draw, only a stray label.
      if ((overlay.max ?? overlay.min) === 0) {
        throw new Error(
          `${at}: the overlay covers nothing — set \`min\` or \`max\` above 0, or remove it.`,
        )
      }
    })
  }
}
