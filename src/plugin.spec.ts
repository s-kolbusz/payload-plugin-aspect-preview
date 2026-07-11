import type { Config } from 'payload'
import { describe, expect, it } from 'vitest'

import { DEFAULT_ASPECT_RATIOS } from './defaults.js'
import { aspectPreviewPlugin } from './plugin.js'

const baseConfig = (): Config =>
  ({
    collections: [
      { slug: 'media', fields: [{ name: 'alt', type: 'text' }], upload: true },
      { slug: 'pages', fields: [{ name: 'title', type: 'text' }] },
    ],
  }) as unknown as Config

const findCollection = (config: Config, slug: string) =>
  config.collections?.find((c) => c.slug === slug)

describe('aspectPreviewPlugin', () => {
  it('adds the aspectPreview ui field to enabled collections', () => {
    const out = aspectPreviewPlugin({ collections: ['media'] })(baseConfig())
    const media = findCollection(out, 'media')
    const field = media?.fields.find((f) => 'name' in f && f.name === 'aspectPreview')
    expect(field).toBeDefined()
    expect((field as { type: string }).type).toBe('ui')
    expect((field as any).admin.components.Field).toBe(
      'payload-plugin-aspect-preview/client#FocalPointEditor',
    )
  })

  it('sets the Upload edit override on enabled collections', () => {
    const out = aspectPreviewPlugin({ collections: ['media'] })(baseConfig())
    const media = findCollection(out, 'media')
    expect((media as any).admin.components.edit.Upload).toBe(
      'payload-plugin-aspect-preview/client#CustomUpload',
    )
  })

  it('defaults aspectRatios into collection.custom when omitted', () => {
    const out = aspectPreviewPlugin({ collections: ['media'] })(baseConfig())
    const media = findCollection(out, 'media')
    expect((media as any).custom.aspectPreview.aspectRatios).toEqual(DEFAULT_ASPECT_RATIOS)
  })

  it('uses supplied aspectRatios over defaults', () => {
    const custom = [{ name: 'X', ratio: '2:1', width: 2, height: 1 }]
    const out = aspectPreviewPlugin({ collections: ['media'], aspectRatios: custom })(baseConfig())
    const media = findCollection(out, 'media')
    expect((media as any).custom.aspectPreview.aspectRatios).toEqual(custom)
  })

  it('leaves non-enabled collections untouched', () => {
    const out = aspectPreviewPlugin({ collections: ['media'] })(baseConfig())
    const pages = findCollection(out, 'pages')
    expect(pages?.fields.some((f) => 'name' in f && f.name === 'aspectPreview')).toBe(false)
    expect((pages as any).admin).toBeUndefined()
  })

  it('when disabled, keeps the field/custom but omits the Upload override', () => {
    const out = aspectPreviewPlugin({ collections: ['media'], disabled: true })(baseConfig())
    const media = findCollection(out, 'media')
    expect(media?.fields.some((f) => 'name' in f && f.name === 'aspectPreview')).toBe(true)
    expect((media as any).custom.aspectPreview).toBeDefined()
    expect((media as any).admin?.components?.edit?.Upload).toBeUndefined()
  })
})
