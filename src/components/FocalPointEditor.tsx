'use client'

import { useConfig, useDocumentInfo, useForm, useUploadEdits } from '@payloadcms/ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import 'react-image-crop/dist/ReactCrop.css'
import ReactCrop, { type Crop } from 'react-image-crop'

import { DEFAULT_ASPECT_RATIOS } from '../defaults'
import type { AspectRatioConfig, CropConfig } from '../types'

import { AspectRatioPreviewGrid } from './AspectRatioPreviewGrid'

export const FocalPointEditor: React.FC = () => {
  const { data } = useDocumentInfo()
  const { setModified } = useForm()
  const { uploadEdits, updateUploadEdits } = useUploadEdits()
  const { getEntityConfig } = useConfig()

  // Read the ratios the plugin stashed in the collection's `custom` config.
  // Falls back to the shipped defaults so the editor renders even if a
  // consumer wired the field without options.
  const collectionSlug = typeof data?.collection === 'string' ? data.collection : undefined
  const entityConfig = collectionSlug ? getEntityConfig({ collectionSlug }) : undefined
  const aspectRatios =
    (((entityConfig as unknown as { custom?: { aspectPreview?: { aspectRatios?: AspectRatioConfig[] } } })?.custom
      ?.aspectPreview?.aspectRatios) as AspectRatioConfig[] | undefined) ?? DEFAULT_ASPECT_RATIOS

  const hasUserEditedRef = useRef(false)

  // Bust the browser cache when the document is re-saved so the regenerated
  // cropped image (same URL, new bytes) shows up in the preview grid.
  const rawUrl = data?.url as string | undefined
  const updatedAtTag = data?.updatedAt ? String(data.updatedAt) : undefined
  const imageUrl = React.useMemo(() => {
    if (!rawUrl) return undefined
    if (!updatedAtTag) return rawUrl
    const sep = rawUrl.includes('?') ? '&' : '?'
    return `${rawUrl}${sep}v=${encodeURIComponent(updatedAtTag)}`
  }, [rawUrl, updatedAtTag])

  const [mode, setMode] = useState<'crop' | 'focal'>('focal')
  // Crop is undefined when none has been drawn yet. When the user enters crop
  // mode without an existing crop, ReactCrop should wait for them to draw one
  // — we don't pre-fill 100% any more.
  const [crop, setCrop] = useState<Crop | undefined>(
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
  const [focalPoint, setFocalPoint] = useState({
    x: uploadEdits?.focalPoint?.x || data?.focalX || 50,
    y: uploadEdits?.focalPoint?.y || data?.focalY || 50,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
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
    if (docWidth > 0 && docHeight > 0) {
      queueMicrotask(() => setNaturalSize({ width: docWidth, height: docHeight }))
      return
    }
    if (!imageUrl) return
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = imageUrl
  }, [imageUrl, docWidth, docHeight])

  const [prevUpdatedAtTag, setPrevUpdatedAtTag] = useState(updatedAtTag)

  // Re-sync local state from the saved document each time `updatedAt` changes.
  useEffect(() => {
    if (updatedAtTag && updatedAtTag !== prevUpdatedAtTag) {
      const nextFocal = {
        x: typeof data?.focalX === 'number' ? data.focalX : 50,
        y: typeof data?.focalY === 'number' ? data.focalY : 50,
      }
      queueMicrotask(() => {
        setPrevUpdatedAtTag(updatedAtTag)
        hasUserEditedRef.current = false
        setFocalPoint(nextFocal)
        setCrop(undefined)
      })
      if (uploadEdits?.crop || uploadEdits?.focalPoint) {
        updateUploadEdits({
          crop: undefined,
          focalPoint: nextFocal,
          heightInPixels: undefined,
          widthInPixels: undefined,
        })
      }
    }
  }, [
    updatedAtTag,
    prevUpdatedAtTag,
    data?.focalX,
    data?.focalY,
    uploadEdits?.crop,
    uploadEdits?.focalPoint,
    updateUploadEdits
  ])

  const hasRealCrop =
    !!crop &&
    crop.width > 0 &&
    crop.height > 0 &&
    (crop.width !== 100 || crop.height !== 100 || crop.x !== 0 || crop.y !== 0)

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

  const clampFocalToCrop = useCallback(
    (x: number, y: number) => {
      if (crop && crop.unit === '%' && hasRealCrop) {
        x = Math.max(crop.x, Math.min(crop.x + crop.width, x))
        y = Math.max(crop.y, Math.min(crop.y + crop.height, y))
      }
      return { x, y }
    },
    [crop, hasRealCrop],
  )

  // Focal point drag handlers
  const updateFocalFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      let x = ((clientX - rect.left) / rect.width) * 100
      let y = ((clientY - rect.top) / rect.height) * 100

      x = Math.max(0, Math.min(100, x))
      y = Math.max(0, Math.min(100, y))

      const clamped = clampFocalToCrop(x, y)
      hasUserEditedRef.current = true
      setFocalPoint(clamped)
    },
    [clampFocalToCrop],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      updateFocalFromEvent(e)
    },
    [updateFocalFromEvent],
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true)
      updateFocalFromEvent(e)
    },
    [updateFocalFromEvent],
  )

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      updateFocalFromEvent(e)
    }
    const handleUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, updateFocalFromEvent])

  // react-image-crop gives two values: `crop` (in the current unit, often px
  // relative to the *displayed* image) and `percentCrop` (always 0-100%).
  // Store percentCrop so preview math is display-size-independent.
  const handleCropChange = useCallback((_crop: Crop, _percentCrop: Crop) => {
    hasUserEditedRef.current = true
    setCrop(_percentCrop)
  }, [])

  const handleReset = useCallback(() => {
    hasUserEditedRef.current = true
    setFocalPoint({ x: 50, y: 50 })
    setCrop(undefined)
  }, [])

  const handleCropFieldChange = useCallback(
    (field: 'x' | 'y' | 'width' | 'height', value: number) => {
      hasUserEditedRef.current = true
      setCrop((prev) => {
        // Bootstrap a crop on first edit
        const base: Crop = prev ?? { unit: '%', x: 0, y: 0, width: 100, height: 100 }
        const next: Crop = { ...base, [field]: value }
        // Clamp to image bounds (percent units)
        if (next.unit === '%') {
          next.x = Math.max(0, Math.min(100, next.x))
          next.y = Math.max(0, Math.min(100, next.y))
          next.width = Math.max(0, Math.min(100 - next.x, next.width))
          next.height = Math.max(0, Math.min(100 - next.y, next.height))
        }
        return next
      })
    },
    [],
  )

  if (!imageUrl) {
    return (
      <div className="focal-editor">
        <div className="focal-editor__empty">
          Upload an image to edit focal point and preview aspect ratios.
        </div>
      </div>
    )
  }

  const cropConfig: CropConfig | undefined =
    hasRealCrop && crop
      ? {
          unit: crop.unit as 'px' | '%',
          x: crop.x,
          y: crop.y,
          width: crop.width,
          height: crop.height,
        }
      : undefined

  const cropUnitLabel = crop?.unit === 'px' ? 'px' : '%'

  return (
    <div className="focal-editor">
      <div className="focal-editor__layout">
        {/* Left — sticky editor */}
        <div className="focal-editor__left">
          {/* Toolbar: two rows of inputs on the left, button column on the right */}
          <div className="focal-editor__toolbar">
            <div className="focal-editor__toolbar-inputs">
              {/* Row 1 — focal point */}
              <div className="focal-editor__toolbar-col">
                <span className="focal-editor__row-label">Focal</span>
                <div className="focal-editor__subgroup">
                  <span className="focal-editor__subgroup-label">Position</span>
                  <div className="focal-editor__subgroup-inputs">
                    <div className="focal-editor__input-group">
                      <label htmlFor="focal-x">X</label>
                      <input
                        id="focal-x"
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(focalPoint.x)}
                        onChange={(e) => {
                          hasUserEditedRef.current = true
                          setFocalPoint((prev) => {
                            const x = Math.max(0, Math.min(100, Number(e.target.value)))
                            return clampFocalToCrop(x, prev.y)
                          })
                        }}
                      />
                      <span>%</span>
                    </div>
                    <div className="focal-editor__input-group">
                      <label htmlFor="focal-y">Y</label>
                      <input
                        id="focal-y"
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(focalPoint.y)}
                        onChange={(e) => {
                          hasUserEditedRef.current = true
                          setFocalPoint((prev) => {
                            const y = Math.max(0, Math.min(100, Number(e.target.value)))
                            return clampFocalToCrop(prev.x, y)
                          })
                        }}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2 — crop */}
              <div className="focal-editor__toolbar-col">
                <span className="focal-editor__row-label">Crop</span>
                <div className="focal-editor__toolbar-row">
                  <div className="focal-editor__subgroup">
                    <span className="focal-editor__subgroup-label">Position</span>
                    <div className="focal-editor__subgroup-inputs">
                      <div className="focal-editor__input-group">
                        <label htmlFor="crop-x">X</label>
                        <input
                          id="crop-x"
                          type="number"
                          min={0}
                          max={100}
                          value={crop ? Math.round(crop.x) : 0}
                          onChange={(e) => handleCropFieldChange('x', Number(e.target.value))}
                          disabled={!hasRealCrop}
                        />
                        <span>{cropUnitLabel}</span>
                      </div>
                      <div className="focal-editor__input-group">
                        <label htmlFor="crop-y">Y</label>
                        <input
                          id="crop-y"
                          type="number"
                          min={0}
                          max={100}
                          value={crop ? Math.round(crop.y) : 0}
                          onChange={(e) => handleCropFieldChange('y', Number(e.target.value))}
                          disabled={!hasRealCrop}
                        />
                        <span>{cropUnitLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="focal-editor__subgroup">
                    <span className="focal-editor__subgroup-label">Size</span>
                    <div className="focal-editor__subgroup-inputs">
                      <div className="focal-editor__input-group">
                        <label htmlFor="crop-w">W</label>
                        <input
                          id="crop-w"
                          type="number"
                          min={0}
                          max={100}
                          value={crop ? Math.round(crop.width) : 0}
                          onChange={(e) => handleCropFieldChange('width', Number(e.target.value))}
                          disabled={!hasRealCrop}
                        />
                        <span>{cropUnitLabel}</span>
                      </div>
                      <div className="focal-editor__input-group">
                        <label htmlFor="crop-h">H</label>
                        <input
                          id="crop-h"
                          type="number"
                          min={0}
                          max={100}
                          value={crop ? Math.round(crop.height) : 0}
                          onChange={(e) => handleCropFieldChange('height', Number(e.target.value))}
                          disabled={!hasRealCrop}
                        />
                        <span>{cropUnitLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="focal-editor__toolbar-actions">
              <button className="focal-editor__btn" onClick={handleReset} type="button">
                Reset
              </button>
              <div className="focal-editor__mode-toggle">
                <button
                  className={`focal-editor__mode-btn ${mode === 'focal' ? 'focal-editor__mode-btn--active' : ''}`}
                  onClick={() => setMode('focal')}
                  type="button"
                >
                  Focal Point
                </button>
                <button
                  className={`focal-editor__mode-btn ${mode === 'crop' ? 'focal-editor__mode-btn--active' : ''}`}
                  onClick={() => setMode('crop')}
                  type="button"
                >
                  Crop
                </button>
              </div>
            </div>
          </div>

          {/* Full-width image within left column */}
          <div className="focal-editor__image-wrapper">
            <ReactCrop
              crop={mode === 'crop' ? crop : undefined}
              onChange={handleCropChange}
              disabled={mode === 'focal'}
              className={`focal-editor__react-crop ${mode === 'focal' ? 'is-focal-mode' : 'is-crop-mode'}`}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  lineHeight: 0,
                  width: '100%',
                }}
              >
                {
                  /**
                   *
                   * As it's a CMS, we don't want to use next/image here,
                   * it also wouldn't bring any value as it's not a production
                   * website, but an admin panel. So we can use a simple
                   * img tag here.
                   *
                  **/
                }
                <img
                  src={imageUrl}
                  alt="Edit"
                  draggable={false}
                  style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    const displayedW = img.clientWidth
                    const displayedH = img.clientHeight
                    // If a legacy px crop was loaded from uploadEdits, convert
                    // it to percentages now that we know the displayed size.
                    if (crop?.unit === 'px' && displayedW > 0 && displayedH > 0) {
                      setCrop({
                        unit: '%',
                        x: (crop.x / displayedW) * 100,
                        y: (crop.y / displayedH) * 100,
                        width: (crop.width / displayedW) * 100,
                        height: (crop.height / displayedH) * 100,
                      })
                    }
                  }}
                />
                {/* Crop reference overlay — visible in focal mode so the user
                    knows which region the focal point is relative to. */}
                {mode === 'focal' && crop && crop.unit === '%' && hasRealCrop && (
                  <div
                    className="focal-editor__crop-overlay"
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                    }}
                  />
                )}
                <div
                  ref={containerRef}
                  className={`focal-editor__focal-overlay ${mode === 'focal' ? 'is-active' : ''}`}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  {mode === 'focal' && (
                    <div
                      className="focal-editor__crosshair"
                      style={{
                        left: `${focalPoint.x}%`,
                        top: `${focalPoint.y}%`,
                      }}
                    >
                      <div className="focal-editor__crosshair-h" />
                      <div className="focal-editor__crosshair-v" />
                    </div>
                  )}
                </div>
              </div>
            </ReactCrop>
          </div>
        </div>

        {/* Right — CSS grid of aspect ratio previews */}
        <div className="focal-editor__right">
          <AspectRatioPreviewGrid
            url={imageUrl}
            focalX={focalPoint.x}
            focalY={focalPoint.y}
            aspectRatios={aspectRatios}
            crop={cropConfig}
          />
        </div>
      </div>
    </div>
  )
}

export default FocalPointEditor
