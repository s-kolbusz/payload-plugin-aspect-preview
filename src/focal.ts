import type { CropConfig, FocalPointState } from './types.js'

/** The crop rectangle in percentage units — all this math needs. */
type PercentCrop = Pick<CropConfig, 'x' | 'y' | 'width' | 'height'>

/**
 * Payload stores the focal point relative to the CROP region: on save it bakes
 * the crop into the base image, then interprets `focalX/focalY` as percentages
 * of that cropped image. The editor, by contrast, works in full-image
 * coordinates because the crosshair is drawn over the whole picture.
 *
 * These two pure inverses convert between the spaces. The math is percentage
 * only — the image's pixel dimensions cancel out, so just the crop rectangle
 * (in %) is required. Callers must guarantee a non-zero crop width/height.
 */
export function toCropRelativeFocal(focal: FocalPointState, crop: PercentCrop): FocalPointState {
  return {
    x: ((focal.x - crop.x) / crop.width) * 100,
    y: ((focal.y - crop.y) / crop.height) * 100,
  }
}

/** Inverse of {@link toCropRelativeFocal}: crop-relative % back to full-image %. */
export function toFullImageFocal(focal: FocalPointState, crop: PercentCrop): FocalPointState {
  return {
    x: crop.x + (focal.x / 100) * crop.width,
    y: crop.y + (focal.y / 100) * crop.height,
  }
}
