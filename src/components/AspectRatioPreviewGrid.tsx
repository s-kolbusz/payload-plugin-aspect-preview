'use client'

import React, { useEffect, useRef, useState } from 'react'

import type { AspectRatioConfig, CropConfig } from '../types'

interface AspectRatioPreviewGridProps {
  url: string
  focalX: number
  focalY: number
  aspectRatios: AspectRatioConfig[]
  crop?: CropConfig
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function isValidNumber(n: number) {
  return typeof n === 'number' && !isNaN(n) && isFinite(n) && n > 0
}

function isValidCrop(crop: CropConfig | undefined, imgW: number, imgH: number) {
  if (!crop) return false

  let cropW: number
  let cropH: number

  if (crop.unit === '%') {
    cropW = crop.width
    cropH = crop.height
    if (!isValidNumber(cropW) || !isValidNumber(cropH)) return false
    if (cropW > 100 || cropH > 100) return false
    if (crop.x < 0 || crop.y < 0) return false
    if (crop.x + cropW > 100 + 1e-6) return false
    if (crop.y + cropH > 100 + 1e-6) return false
  } else {
    if (crop.width > imgW || crop.height > imgH || crop.x > imgW || crop.y > imgH) {
      return false
    }
    if (!isValidNumber(crop.width) || !isValidNumber(crop.height)) return false
    if (crop.x < 0 || crop.y < 0) return false
    cropW = crop.width
    cropH = crop.height
  }

  return cropW > 1e-6 && cropH > 1e-6
}

function resolveCropPixels(crop: CropConfig, imgW: number, imgH: number) {
  if (crop.unit === '%') {
    return {
      x: (crop.x / 100) * imgW,
      y: (crop.y / 100) * imgH,
      w: (crop.width / 100) * imgW,
      h: (crop.height / 100) * imgH,
    }
  }
  return { x: crop.x, y: crop.y, w: crop.width, h: crop.height }
}

// Editor stores focalX/focalY as percentages of the FULL image.
// Convert to percentages within the crop region.
function toCropRelativeFocal(
  focalX: number,
  focalY: number,
  crop: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number,
) {
  const relX = ((focalX / 100) * imgW - crop.x) / crop.w
  const relY = ((focalY / 100) * imgH - crop.y) / crop.h
  return {
    x: clamp(relX * 100, 0, 100),
    y: clamp(relY * 100, 0, 100),
  }
}

// Compute a background-image style on the FRAME that simulates Payload's
// server-side behavior: take the crop region from the original image, then
// render it with object-fit:cover + object-position:focal% into the frame.
//
// Background-image is used instead of <img> because Payload's admin CSS
// applies aggressive global rules to <img> (max-width:100%, height:auto)
// that fight inline pixel sizing and cause squashing.
function computeCroppedBackgroundStyle(
  frameW: number,
  frameH: number,
  imgW: number,
  imgH: number,
  crop: { x: number; y: number; w: number; h: number },
  focalX: number,
  focalY: number,
): { backgroundSize: string; backgroundPosition: string } {
  // Scale the crop region to cover the frame (same math as object-fit:cover)
  const scale = Math.max(frameW / crop.w, frameH / crop.h)

  // Focal point inside the crop region, expressed as %
  const relFocal = toCropRelativeFocal(focalX, focalY, crop, imgW, imgH)

  // Where the crop region's top-left lands in the frame, per object-position math
  const cropDisplayW = crop.w * scale
  const cropDisplayH = crop.h * scale
  const cropLeft = (frameW - cropDisplayW) * (relFocal.x / 100)
  const cropTop = (frameH - cropDisplayH) * (relFocal.y / 100)

  // Position the FULL image so the crop region lands at cropLeft / cropTop
  const bgLeft = cropLeft - crop.x * scale
  const bgTop = cropTop - crop.y * scale

  const bgW = imgW * scale
  const bgH = imgH * scale

  return {
    backgroundSize: `${bgW}px ${bgH}px`,
    backgroundPosition: `${bgLeft}px ${bgTop}px`,
  }
}

const PreviewCard: React.FC<{
  ratio: AspectRatioConfig
  url: string
  focalX: number
  focalY: number
  crop?: CropConfig
  imgW: number
  imgH: number
}> = ({ ratio, url, focalX, focalY, crop, imgW, imgH }) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setFrameSize({ width, height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const frameStyle: React.CSSProperties = React.useMemo(() => {
    const base: React.CSSProperties = {
      aspectRatio: `${ratio.width} / ${ratio.height}`,
      backgroundImage: `url("${url}")`,
      backgroundRepeat: 'no-repeat',
    }

    const haveDims =
      frameSize.width > 0 && frameSize.height > 0 && isValidNumber(imgW) && isValidNumber(imgH)

    // Fallback: no crop OR dimensions not yet known.
    // Use CSS-native cover + position — identical to the frontend's
    // `object-fit:cover; object-position: focalX% focalY%`.
    if (!haveDims || !isValidCrop(crop, imgW, imgH)) {
      return {
        ...base,
        backgroundSize: 'cover',
        backgroundPosition: `${focalX}% ${focalY}%`,
      }
    }

    const cropPx = resolveCropPixels(crop!, imgW, imgH)
    const { backgroundSize, backgroundPosition } = computeCroppedBackgroundStyle(
      frameSize.width,
      frameSize.height,
      imgW,
      imgH,
      cropPx,
      focalX,
      focalY,
    )
    return { ...base, backgroundSize, backgroundPosition }
  }, [frameSize, imgW, imgH, focalX, focalY, crop, ratio.width, ratio.height, url])

  return (
    <div className="focal-preview__card">
      <div className="focal-preview__card-header">
        <span className="focal-preview__card-name">{ratio.name}</span>
        <span className="focal-preview__card-ratio">{ratio.ratio}</span>
      </div>
      <div
        ref={frameRef}
        className="focal-preview__card-frame"
        style={frameStyle}
        role="img"
        aria-label={`Preview for ${ratio.name}`}
      >
        <div className="focal-preview__card-overlay" />
        <div className="focal-preview__card-crosshair" />
      </div>
      <div className="focal-preview__card-footer">
        <span className="focal-preview__card-usage">{ratio.usage}</span>
        <span className={`focal-preview__card-source focal-preview__card-source--${ratio.source}`}>
          {ratio.source === 'css' ? 'CSS' : 'Crop'}
        </span>
      </div>
    </div>
  )
}

export const AspectRatioPreviewGrid: React.FC<AspectRatioPreviewGridProps> = ({
  url,
  focalX,
  focalY,
  aspectRatios,
  crop,
}) => {
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      setImgDimensions({ width: 0, height: 0 })
    }
    img.src = url
  }, [url])

  return (
    <div className="focal-preview">
      <div className="focal-preview__grid">
        {aspectRatios.map((ratio) => (
          <PreviewCard
            key={ratio.name}
            ratio={ratio}
            url={url}
            focalX={focalX}
            focalY={focalY}
            crop={crop}
            imgW={imgDimensions.width}
            imgH={imgDimensions.height}
          />
        ))}
      </div>
    </div>
  )
}

export default AspectRatioPreviewGrid
