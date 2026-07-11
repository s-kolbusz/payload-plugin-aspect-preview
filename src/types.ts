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

export interface AspectPreviewPluginOptions {
  /** Upload collections (by slug) to enhance with the inline editor. */
  collections: string[]
  /** Aspect ratios shown in the live preview grid. Defaults to DEFAULT_ASPECT_RATIOS. */
  aspectRatios?: AspectRatioConfig[]
  /** Disable the plugin while keeping the schema field for DB consistency. */
  disabled?: boolean
}

export interface CropConfig {
  unit: 'px' | '%'
  x: number
  y: number
  width: number
  height: number
}

export interface FocalPointState {
  x: number
  y: number
}

export interface UploadEditsState {
  crop?: CropConfig
  focalPoint?: FocalPointState
}
