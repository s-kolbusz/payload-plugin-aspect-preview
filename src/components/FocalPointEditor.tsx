'use client'

import { useConfig, useDocumentInfo, useField, useForm, useUploadEdits } from '@payloadcms/ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { DEFAULT_ASPECT_RATIOS } from '../defaults.js'
import type { AspectRatioConfig, CropConfig, FocalPointState } from '../types.js'

import {
  AspectPreviewEditor,
  isRealCrop,
  type AspectPreviewChangeReason,
  type AspectPreviewValue,
} from './AspectPreviewEditor.js'

/**
 * The Payload field component: wires the document, the form and Payload's
 * upload-edits context to the plain {@link AspectPreviewEditor}. Everything
 * Payload-specific (where the image and ratios come from, the pixel crop and
 * save flow) lives here; the editing UI lives in the plain component.
 */

export const FocalPointEditor: React.FC = () => {
  const { collectionSlug, data } = useDocumentInfo()
  const { setModified } = useForm()
  const { uploadEdits, updateUploadEdits } = useUploadEdits()
  const { config } = useConfig()

  // Read the ratios the plugin stashed in `admin.custom` (the collection's own
  // `custom` never reaches the client). Falls back to the shipped defaults so
  // the editor renders even if a consumer wired the field without options.
  const stashed = (
    config.admin?.custom as
      | { aspectPreview?: Record<string, { aspectRatios?: AspectRatioConfig[] }> }
      | undefined
  )?.aspectPreview
  const aspectRatios =
    (collectionSlug ? stashed?.[collectionSlug]?.aspectRatios : undefined) ?? DEFAULT_ASPECT_RATIOS

  const hasUserEditedRef = useRef(false)

  // The freshly-picked File lives in the shared `file` form field (set by the
  // upload component) before the document is saved. Reading it here lets us
  // show the editor + preview immediately on selection, saving a save-round-trip.
  const { value: pendingFile } = useField<File | undefined>({ path: 'file' })
  const pendingUrl = React.useMemo(
    () =>
      pendingFile instanceof File && pendingFile.type.startsWith('image/')
        ? URL.createObjectURL(pendingFile)
        : undefined,
    [pendingFile],
  )
  // Revoke the object URL when it changes or the editor unmounts.
  useEffect(() => {
    if (!pendingUrl) return
    return () => URL.revokeObjectURL(pendingUrl)
  }, [pendingUrl])

  // Bust the browser cache when the document is re-saved so the regenerated
  // cropped image (same URL, new bytes) shows up in the preview grid.
  const rawUrl = data?.url as string | undefined
  const updatedAtTag = data?.updatedAt ? String(data.updatedAt) : undefined
  const imageUrl = React.useMemo(() => {
    // A pending selection wins over the saved doc — it's what the user is
    // about to save. Blob URLs take no query string, so skip cache-busting.
    if (pendingUrl) return pendingUrl
    if (!rawUrl) return undefined
    if (!updatedAtTag) return rawUrl
    const sep = rawUrl.includes('?') ? '&' : '?'
    return `${rawUrl}${sep}v=${encodeURIComponent(updatedAtTag)}`
  }, [pendingUrl, rawUrl, updatedAtTag])

  // Crop is undefined when none has been drawn yet. When the user enters crop
  // mode without an existing crop, ReactCrop should wait for them to draw one
  // — we don't pre-fill 100% any more.
  const [crop, setCrop] = useState<CropConfig | undefined>(
    uploadEdits?.crop
      ? {
          unit: uploadEdits.crop.unit as 'px' | '%',
          x: uploadEdits.crop.x,
          y: uploadEdits.crop.y,
          width: uploadEdits.crop.width,
          height: uploadEdits.crop.height,
        }
      : undefined,
  )
  // Focal point is stored relative to the active crop region: a 0-100 position
  // inside the crop, or inside the whole image when there is no crop. This is
  // the same space Payload persists (it bakes the crop into the base image and
  // reads focalX/focalY as percentages of the cropped result), so uploadEdits
  // and data.focalX/Y are already in this space — no conversion on load.
  // `typeof` (not `||`) so a valid edge focal of 0 doesn't fall through to 50.
  const [focalPoint, setFocalPoint] = useState<FocalPointState>(() => {
    if (uploadEdits?.focalPoint) return uploadEdits.focalPoint
    return {
      x: typeof data?.focalX === 'number' ? data.focalX : 50,
      y: typeof data?.focalY === 'number' ? data.focalY : 50,
    }
  })
  // Natural pixel dimensions of the underlying image. Needed because Payload's
  // cropImage requires `widthInPixels` / `heightInPixels` in addition to the
  // percent crop — without them sharp.extract receives NaN and the save fails.
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof data?.width === 'number' ? data.width : 0,
    height: typeof data?.height === 'number' ? data.height : 0,
  }))

  // Prefer the Payload document's authoritative width/height — that's what
  // sharp reads on the server. Fall back to the browser-decoded natural size.
  const docWidth = typeof data?.width === 'number' ? data.width : 0
  const docHeight = typeof data?.height === 'number' ? data.height : 0

  useEffect(() => {
    // For a pending selection the doc dimensions are stale/absent — always
    // decode the picked image so crop pixel math uses the real size.
    if (!pendingUrl && docWidth > 0 && docHeight > 0) {
      queueMicrotask(() => setNaturalSize({ width: docWidth, height: docHeight }))
      return
    }
    if (!imageUrl) return
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = imageUrl
  }, [imageUrl, pendingUrl, docWidth, docHeight])

  // Re-sync local state from the saved document once per save. The guard is a
  // ref (not state) so it flips synchronously — the effect cannot re-enter when
  // the updateUploadEdits call below changes the upload-edits context. Driving
  // the guard through state (and listing uploadEdits in the deps) is what
  // previously re-entered on every context change and exceeded React's update
  // depth on save.
  const lastSyncedTagRef = useRef(updatedAtTag)
  useEffect(() => {
    if (!updatedAtTag || updatedAtTag === lastSyncedTagRef.current) return
    lastSyncedTagRef.current = updatedAtTag
    hasUserEditedRef.current = false
    const nextFocal = {
      x: typeof data?.focalX === 'number' ? data.focalX : 50,
      y: typeof data?.focalY === 'number' ? data.focalY : 50,
    }
    setFocalPoint(nextFocal)
    // The crop is now baked into the saved image, so there is no pending crop
    // and the focal is relative to the whole (already-cropped) image again.
    setCrop(undefined)
    updateUploadEdits({
      crop: undefined,
      focalPoint: nextFocal,
      heightInPixels: undefined,
      widthInPixels: undefined,
    })
  }, [updatedAtTag, data?.focalX, data?.focalY, updateUploadEdits])

  const hasRealCrop = isRealCrop(crop)

  // Auto-save to uploadEdits whenever state changes
  useEffect(() => {
    if (!hasUserEditedRef.current) return

    const timeout = setTimeout(() => {
      setModified(true)

      if (hasRealCrop && crop && naturalSize.width > 0 && naturalSize.height > 0) {
        // Payload's cropImage computes `left = floor(x% * imgW / 100)` and
        // `top = floor(y% * imgH / 100)`, then calls sharp.extract with our
        // widthInPixels / heightInPixels. Sharp rejects the call if
        // left + width > imgW (likewise for height) — even by 1px.
        // We must compute width/height with floor and clamp so they always
        // fit inside the image from that floored offset.
        const leftPx = Math.floor((crop.x / 100) * naturalSize.width)
        const topPx = Math.floor((crop.y / 100) * naturalSize.height)
        const widthInPixels = Math.max(
          1,
          Math.min(Math.floor((crop.width / 100) * naturalSize.width), naturalSize.width - leftPx),
        )
        const heightInPixels = Math.max(
          1,
          Math.min(
            Math.floor((crop.height / 100) * naturalSize.height),
            naturalSize.height - topPx,
          ),
        )
        updateUploadEdits({
          crop: {
            unit: '%',
            x: crop.x,
            y: crop.y,
            width: crop.width,
            height: crop.height,
          },
          // focalPoint is already relative to the crop region — exactly the
          // space Payload reads it in for the cropped image.
          focalPoint,
          heightInPixels,
          widthInPixels,
        })
      } else {
        updateUploadEdits({
          crop: undefined,
          focalPoint,
          heightInPixels: undefined,
          widthInPixels: undefined,
        })
      }
    }, 100)
    return () => clearTimeout(timeout)
  }, [crop, hasRealCrop, focalPoint, naturalSize, setModified, updateUploadEdits])

  const value = React.useMemo<AspectPreviewValue>(() => ({ crop, focal: focalPoint }), [crop, focalPoint])

  // Every change the person makes marks the document modified (via the
  // auto-save effect above). The editor's own legacy px → % conversion on
  // image load is not an edit, so it updates state without that flag.
  const handleChange = useCallback(
    (next: AspectPreviewValue, { reason }: { reason: AspectPreviewChangeReason }) => {
      if (reason === 'user') hasUserEditedRef.current = true
      setCrop(next.crop)
      setFocalPoint(next.focal)
    },
    [],
  )

  return (
    <AspectPreviewEditor
      src={imageUrl}
      aspectRatios={aspectRatios}
      value={value}
      onChange={handleChange}
    />
  )
}

export default FocalPointEditor
