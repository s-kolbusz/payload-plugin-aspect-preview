import type { OVERLAY_EDGES } from './validate.js'

/**
 * A single aspect ratio shown in the editor's live preview grid. Pass an array
 * of these as {@link AspectPreviewPluginOptions.aspectRatios} to tailor the
 * ratios to your frontend; see {@link DEFAULT_ASPECT_RATIOS} for the shipped set.
 */
export interface AspectRatioConfig {
  /** Display label, e.g. "Social Share". */
  name: string
  /** Display token, e.g. "16:9". */
  ratio: string
  /** Ratio numerator (or absolute px width for exact targets). */
  width: number
  /** Ratio denominator (or absolute px height for exact targets). */
  height: number
  /** How the frontend renders this ratio; drives a display badge only. Defaults to 'css'. */
  source?: 'css' | 'crop'
  /** Optional description shown in the preview card footer. */
  usage?: string
  /** Optional free-form grouping label. */
  category?: string
  /**
   * Areas of this ratio's frame that your frontend covers with text or UI
   * (a title band, price chips, …), drawn over the preview so editors keep the
   * subject clear of them. Off unless set.
   */
  overlays?: AspectRatioOverlay[]
}

/**
 * An area your frontend covers along one edge of an image, as fractions (0–1)
 * of the frame's height (`top`/`bottom`) or width (`left`/`right`). The band
 * sits over the frame, not the image, so it stays put while the focal point
 * and crop move the image underneath — exactly as on the site.
 *
 * @example
 * ```ts
 * // A caption that always takes the bottom 20% and up to 35% with a long title
 * { label: 'Title + price', edge: 'bottom', min: 0.2, max: 0.35 }
 * ```
 */
export interface AspectRatioOverlay {
  /** Shown inside the band, e.g. "Title + price". */
  label: string
  /** The frame edge the covered area starts from: `'top' | 'bottom' | 'left' | 'right'`. */
  edge: (typeof OVERLAY_EDGES)[number]
  /** Fraction of the frame always covered, 0–1. */
  min: number
  /**
   * Fraction covered at worst (e.g. a long title wrapping), 0–1 and `≥ min`.
   * The `min → max` stretch is drawn lighter. Defaults to `min`.
   */
  max?: number
}

/** Options for {@link aspectPreviewPlugin}. */
export interface AspectPreviewPluginOptions {
  /** Upload collections (by slug) to enhance with the inline editor. */
  collections: string[]
  /** Aspect ratios shown in the live preview grid. Defaults to DEFAULT_ASPECT_RATIOS. */
  aspectRatios?: AspectRatioConfig[]
  /** Disable the plugin while keeping the schema field for DB consistency. */
  disabled?: boolean
}

/** A crop rectangle. `x`/`y`/`width`/`height` are in `unit` (percent or pixels). */
export interface CropConfig {
  unit: 'px' | '%'
  x: number
  y: number
  width: number
  height: number
}

/** Focal point as percentages (0-100) of its reference image. */
export interface FocalPointState {
  x: number
  y: number
}

/** The editor's pending edits, mirrored into Payload's upload-edits context. */
export interface UploadEditsState {
  crop?: CropConfig
  focalPoint?: FocalPointState
}
