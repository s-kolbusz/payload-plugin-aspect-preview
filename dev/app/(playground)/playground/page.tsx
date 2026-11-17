'use client'

import { useEffect, useState } from 'react'

// Loaded from the built package, like a site that installed it from npm.
import {
  AspectPreviewEditor,
  type AspectPreviewValue,
  toFullImageFocal,
} from '../../../../dist/exports/playground.js'

const SAMPLE = '/playground-sample.svg'

export default function PlaygroundPage() {
  const [src, setSrc] = useState(SAMPLE)
  const [value, setValue] = useState<AspectPreviewValue>({ focal: { x: 50, y: 50 } })

  // A picked file never leaves the browser: it is shown through a blob: URL,
  // revoked when replaced or when the page goes away.
  useEffect(() => {
    if (!src.startsWith('blob:')) return
    return () => URL.revokeObjectURL(src)
  }, [src])

  const crop = value.crop ?? { unit: '%' as const, x: 0, y: 0, width: 100, height: 100 }
  const onImage = toFullImageFocal(value.focal, crop)

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 20 }}>Aspect preview — without Payload</h1>
      <input
        type="file"
        accept="image/*"
        aria-label="Use your own photo"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setValue({ focal: { x: 50, y: 50 } })
          setSrc(URL.createObjectURL(file))
        }}
      />
      <AspectPreviewEditor src={src} value={value} onChange={setValue} />
      <p data-testid="readout" style={{ fontSize: 13 }}>
        Focal on the whole image: {Math.round(onImage.x)}% × {Math.round(onImage.y)}%
        {value.crop ? ` · crop ${Math.round(value.crop.width)}% × ${Math.round(value.crop.height)}%` : ''}
      </p>
    </main>
  )
}
