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
