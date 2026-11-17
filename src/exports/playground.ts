'use client'

// The editor without Payload: everything here runs on any React 19 page.
// Nothing reachable from this file may import `payload`, `payload/shared` or
// `@payloadcms/*` — `playground-graph.spec.ts` fails the build if it does.
export {
  AspectPreviewEditor,
  isRealCrop,
  type AspectPreviewChangeReason,
  type AspectPreviewEditorProps,
  type AspectPreviewValue,
} from '../components/AspectPreviewEditor.js'
export { AspectRatioPreviewGrid } from '../components/AspectRatioPreviewGrid.js'
export { DEFAULT_ASPECT_RATIOS } from '../defaults.js'
export { toCropRelativeFocal, toFullImageFocal } from '../focal.js'
export type {
  AspectRatioConfig,
  AspectRatioOverlay,
  CropConfig,
  FocalPointState,
} from '../types.js'
