'use client'

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import 'react-image-crop/dist/ReactCrop.css'
import ReactCrop, { type Crop } from 'react-image-crop'

import '../styles.css'
import { DEFAULT_ASPECT_RATIOS } from '../defaults.js'
import { toCropRelativeFocal, toFullImageFocal } from '../focal.js'
import type { AspectRatioConfig, CropConfig, FocalPointState } from '../types.js'

import { AspectRatioPreviewGrid } from './AspectRatioPreviewGrid.js'

/**
 * What the editor edits: an optional crop and a focal point.
 *
 * - `crop` is a rectangle over the whole image, normally in percent. A legacy
 *   pixel crop is accepted and converted to percent once the image has loaded
 *   (reported through `onChange` with reason `'normalize'`). `undefined` means
 *   no crop.
 * - `focal` is a 0–100 position **inside the crop** (inside the whole image
 *   when there is no crop). Moving the crop therefore moves the focal point
 *   with it. Use `toFullImageFocal` to get its position on the whole image.
 */
export interface AspectPreviewValue {
  crop?: CropConfig
  focal: FocalPointState
}

/**
 * Why the value changed: `'user'` for anything the person did (dragging,
 * typing, Reset), `'normalize'` when the editor only converted a legacy pixel
 * crop to percent after the image loaded.
 */
export type AspectPreviewChangeReason = 'user' | 'normalize'

export interface AspectPreviewEditorProps {
  /** Image to edit: any URL the browser can load, including `blob:` URLs from `URL.createObjectURL`. */
  src?: string
  /** Alt text for the editable image. Defaults to `"Edit"`. */
  alt?: string
  /** Ratios shown in the preview grid. Defaults to `DEFAULT_ASPECT_RATIOS`. */
  aspectRatios?: AspectRatioConfig[]
  /** Controlled value. Leave out (and use `defaultValue`) to let the editor keep its own state. */
  value?: AspectPreviewValue
  /** Starting value when uncontrolled. Defaults to no crop and a centred focal point. */
  defaultValue?: AspectPreviewValue
  /** Called with the whole next value on every change. */
  onChange?: (value: AspectPreviewValue, info: { reason: AspectPreviewChangeReason }) => void
  /** Added to the root element (`.focal-editor`), e.g. to set `--apv-*` theme variables. */
  className?: string
  /** Inline styles for the root element; CSS variables work here too. */
  style?: React.CSSProperties
  /** Shown instead of the editor while `src` is empty. */
  emptyMessage?: React.ReactNode
}

const CENTRED: AspectPreviewValue = { focal: { x: 50, y: 50 } }

/** True when `crop` is a non-empty rectangle that isn't simply the whole image. */
export function isRealCrop(crop: CropConfig | undefined): crop is CropConfig {
  return (
    !!crop &&
    crop.width > 0 &&
    crop.height > 0 &&
    (crop.width !== 100 || crop.height !== 100 || crop.x !== 0 || crop.y !== 0)
  )
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, n))

/**
 * The plugin's crop + focal-point editor with its live aspect-ratio previews,
 * as a plain React component: no Payload, no server. Works controlled
 * (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */
export const AspectPreviewEditor: React.FC<AspectPreviewEditorProps> = ({
  src,
  alt = 'Edit',
  aspectRatios = DEFAULT_ASPECT_RATIOS,
  value,
  defaultValue,
  onChange,
  className,
  style,
  emptyMessage = 'Upload an image to edit focal point and preview aspect ratios.',
}) => {
  const [innerValue, setInnerValue] = useState<AspectPreviewValue>(defaultValue ?? CENTRED)
  const current = value ?? innerValue
  const { crop, focal: focalPoint } = current

  // Several events can fire before the parent re-renders with the new value
  // (two inputs in one tick, a fast drag). Each change builds on the latest
  // emitted value, not on the possibly stale prop.
  const latestRef = useRef(current)
  useLayoutEffect(() => {
    latestRef.current = current
  })

  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => {
    onChangeRef.current = onChange
  })

  const isControlled = value !== undefined
  const emit = useCallback(
    (next: AspectPreviewValue, reason: AspectPreviewChangeReason) => {
      latestRef.current = next
      if (!isControlled) setInnerValue(next)
      onChangeRef.current?.(next, { reason })
    },
    [isControlled],
  )
  const update = useCallback(
    (patch: (prev: AspectPreviewValue) => AspectPreviewValue) => emit(patch(latestRef.current), 'user'),
    [emit],
  )

  const idBase = useId()
  const [mode, setMode] = useState<'crop' | 'focal'>('focal')
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const hasRealCrop = isRealCrop(crop)

  // The rectangle the focal point is measured against: the crop when one exists
  // (in %), otherwise the whole image. Focal state is always a 0-100 position
  // inside this rectangle; converting to/from full-image space happens only at
  // the pointer and rendering boundaries.
  const cropRect = React.useMemo(
    () =>
      hasRealCrop && crop && crop.unit === '%'
        ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
        : { x: 0, y: 0, width: 100, height: 100 },
    [hasRealCrop, crop],
  )

  // The pointer lands somewhere on the full image; convert that full-image %
  // into the crop-relative space the focal lives in, then clamp to the crop.
  const updateFocalFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const fullX = clamp100(((clientX - rect.left) / rect.width) * 100)
      const fullY = clamp100(((clientY - rect.top) / rect.height) * 100)

      const rel = toCropRelativeFocal({ x: fullX, y: fullY }, cropRect)
      update((prev) => ({ ...prev, focal: { x: clamp100(rel.x), y: clamp100(rel.y) } }))
    },
    [cropRect, update],
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
  const handleCropChange = useCallback(
    (_crop: Crop, percentCrop: Crop) => update((prev) => ({ ...prev, crop: percentCrop })),
    [update],
  )

  const handleReset = useCallback(
    () => update(() => ({ crop: undefined, focal: { x: 50, y: 50 } })),
    [update],
  )

  const handleCropFieldChange = useCallback(
    (field: 'x' | 'y' | 'width' | 'height', fieldValue: number) => {
      update((prev) => {
        // Bootstrap a crop on first edit
        const base: CropConfig = prev.crop ?? { unit: '%', x: 0, y: 0, width: 100, height: 100 }
        const next: CropConfig = { ...base, [field]: fieldValue }
        // Clamp to image bounds (percent units)
        if (next.unit === '%') {
          next.x = clamp100(next.x)
          next.y = clamp100(next.y)
          next.width = Math.max(0, Math.min(100 - next.x, next.width))
          next.height = Math.max(0, Math.min(100 - next.y, next.height))
        }
        return { ...prev, crop: next }
      })
    },
    [update],
  )

  const handleFocalFieldChange = useCallback(
    (axis: 'x' | 'y', fieldValue: number) =>
      update((prev) => ({ ...prev, focal: { ...prev.focal, [axis]: clamp100(fieldValue) } })),
    [update],
  )

  const rootClassName = className ? `focal-editor ${className}` : 'focal-editor'

  if (!src) {
    return (
      <div className={rootClassName} style={style}>
        <div className="focal-editor__empty">{emptyMessage}</div>
      </div>
    )
  }

  const cropConfig: CropConfig | undefined = hasRealCrop
    ? { unit: crop.unit, x: crop.x, y: crop.y, width: crop.width, height: crop.height }
    : undefined

  const cropUnitLabel = crop?.unit === 'px' ? 'px' : '%'

  // Full-image position of the focal point (crop-relative → whole image). Used
  // to place the crosshair absolutely and to feed the preview grid, which
  // re-derives the crop-relative position itself.
  const focalFullImage = toFullImageFocal(focalPoint, cropRect)

  const id = (name: string) => `${idBase}-${name}`

  return (
    <div className={rootClassName} style={style}>
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
                      <label htmlFor={id('focal-x')}>X</label>
                      <input
                        id={id('focal-x')}
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(focalPoint.x)}
                        onChange={(e) => handleFocalFieldChange('x', Number(e.target.value))}
                      />
                      <span>%</span>
                    </div>
                    <div className="focal-editor__input-group">
                      <label htmlFor={id('focal-y')}>Y</label>
                      <input
                        id={id('focal-y')}
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(focalPoint.y)}
                        onChange={(e) => handleFocalFieldChange('y', Number(e.target.value))}
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
                        <label htmlFor={id('crop-x')}>X</label>
                        <input
                          id={id('crop-x')}
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
                        <label htmlFor={id('crop-y')}>Y</label>
                        <input
                          id={id('crop-y')}
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
                        <label htmlFor={id('crop-w')}>W</label>
                        <input
                          id={id('crop-w')}
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
                        <label htmlFor={id('crop-h')}>H</label>
                        <input
                          id={id('crop-h')}
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
              crop={mode === 'crop' ? (crop as Crop | undefined) : undefined}
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
                {/* A plain <img>: the editor runs in an admin panel or a demo,
                    where an optimising image component would add nothing. */}
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    const displayedW = img.clientWidth
                    const displayedH = img.clientHeight
                    // If a legacy px crop was passed in, convert it to
                    // percentages now that we know the displayed size.
                    const loaded = latestRef.current
                    const c = loaded.crop
                    if (c?.unit === 'px' && displayedW > 0 && displayedH > 0) {
                      emit(
                        {
                          ...loaded,
                          crop: {
                            unit: '%',
                            x: (c.x / displayedW) * 100,
                            y: (c.y / displayedH) * 100,
                            width: (c.width / displayedW) * 100,
                            height: (c.height / displayedH) * 100,
                          },
                        },
                        'normalize',
                      )
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
                        left: `${focalFullImage.x}%`,
                        top: `${focalFullImage.y}%`,
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
            url={src}
            focalX={focalFullImage.x}
            focalY={focalFullImage.y}
            aspectRatios={aspectRatios}
            crop={cropConfig}
          />
        </div>
      </div>
    </div>
  )
}

export default AspectPreviewEditor
