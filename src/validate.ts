import type { AspectRatioConfig } from './types.js'

const EDGES = ['top', 'bottom', 'left', 'right']

const isFraction = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1

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
      if (!EDGES.includes(overlay.edge)) {
        throw new Error(
          `${at}: \`edge\` must be one of ${EDGES.map((e) => `'${e}'`).join(', ')}, got ${JSON.stringify(overlay.edge)}.`,
        )
      }
      if (!isFraction(overlay.min)) {
        throw new Error(
          `${at}: \`min\` must be a fraction between 0 and 1, got ${JSON.stringify(overlay.min)}.`,
        )
      }
      if (overlay.max !== undefined) {
        if (!isFraction(overlay.max)) {
          throw new Error(
            `${at}: \`max\` must be a fraction between 0 and 1, got ${JSON.stringify(overlay.max)}.`,
          )
        }
        if (overlay.max < overlay.min) {
          throw new Error(
            `${at}: \`max\` (${overlay.max}) must be greater than or equal to \`min\` (${overlay.min}).`,
          )
        }
      }
    })
  }
}
