// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The Payload wrapper, with Payload's hooks stubbed: it must feed the plain
// editor from the document and push edits back exactly as before the split.
const payload = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  uploadEdits: {} as Record<string, unknown>,
  updateUploadEdits: vi.fn(),
  setModified: vi.fn(),
}))
vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { admin: { custom: {} } } }),
  useDocumentInfo: () => ({ collectionSlug: 'media', data: payload.data }),
  useField: () => ({ value: undefined }),
  useForm: () => ({ setModified: payload.setModified }),
  useUploadEdits: () => ({
    uploadEdits: payload.uploadEdits,
    updateUploadEdits: payload.updateUploadEdits,
  }),
}))

const { FocalPointEditor } = await import('./components/FocalPointEditor.js')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.useFakeTimers()
  payload.updateUploadEdits.mockClear()
  payload.setModified.mockClear()
  payload.uploadEdits = {}
  payload.data = { url: '/media/a.jpg', width: 1000, height: 500, focalX: 30, focalY: 70 }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

// Async act: the wrapper settles the image size in a microtask after mount.
const mount = () => act(async () => root.render(createElement(FocalPointEditor)))
const inputByLabel = (text: string) => {
  const label = [...host.querySelectorAll('label')].find((l) => l.textContent === text)!
  return host.querySelector(`[id="${label.htmlFor}"]`) as HTMLInputElement
}
const typeInto = (input: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const flush = () => act(() => vi.advanceTimersByTime(150))

describe('FocalPointEditor (Payload wrapper)', () => {
  it('shows the saved image and focal point and writes nothing until the user edits', async () => {
    await mount()
    expect(host.querySelector('.focal-editor__image-wrapper img')?.getAttribute('src')).toBe(
      '/media/a.jpg',
    )
    const cross = host.querySelector('.focal-editor__crosshair') as HTMLElement
    expect([cross.style.left, cross.style.top]).toEqual(['30%', '70%'])
    flush()
    expect(payload.updateUploadEdits).not.toHaveBeenCalled()
    expect(payload.setModified).not.toHaveBeenCalled()
  })

  it('pushes a focal edit to upload edits and marks the form modified', async () => {
    await mount()
    typeInto(inputByLabel('X'), '10')
    flush()
    expect(payload.setModified).toHaveBeenCalledWith(true)
    expect(payload.updateUploadEdits).toHaveBeenLastCalledWith({
      crop: undefined,
      focalPoint: { x: 10, y: 70 },
      heightInPixels: undefined,
      widthInPixels: undefined,
    })
  })

  it('sends the crop with pixel sizes that fit the image', async () => {
    payload.uploadEdits = {
      crop: { unit: '%', x: 10.5, y: 20, width: 89.6, height: 50 },
      focalPoint: { x: 50, y: 50 },
    }
    await mount()
    typeInto(inputByLabel('Y'), '25')
    flush()
    expect(payload.updateUploadEdits).toHaveBeenLastCalledWith({
      crop: { unit: '%', x: 10.5, y: 20, width: 89.6, height: 50 },
      focalPoint: { x: 50, y: 25 },
      // floor(10.5% of 1000) = 105; floor(89.6% of 1000) = 896 > 1000 - 105 → 895
      widthInPixels: 895,
      heightInPixels: 250,
    })
  })

  it('does not mark the form modified when a legacy px crop is only converted on load', async () => {
    payload.uploadEdits = { crop: { unit: 'px', x: 100, y: 50, width: 200, height: 100 } }
    await mount()
    const img = host.querySelector('.focal-editor__image-wrapper img') as HTMLImageElement
    Object.defineProperty(img, 'clientWidth', { value: 400 })
    Object.defineProperty(img, 'clientHeight', { value: 200 })
    act(() => img.dispatchEvent(new Event('load')))
    flush()
    expect((inputByLabel('W') as HTMLInputElement).value).toBe('50')
    expect(payload.setModified).not.toHaveBeenCalled()
    expect(payload.updateUploadEdits).not.toHaveBeenCalled()
  })
})
