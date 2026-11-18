// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AspectPreviewEditor,
  type AspectPreviewEditorProps,
  type AspectPreviewValue,
  DEFAULT_ASPECT_RATIOS,
  isRealCrop,
} from './exports/playground.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = (props: AspectPreviewEditorProps) =>
  act(() => root.render(createElement(AspectPreviewEditor, props)))

const $ = <T extends Element = HTMLElement>(sel: string) => host.querySelector(sel) as T | null
const inputByLabel = (text: string, nth = 0) => {
  const label = [...host.querySelectorAll('label')].filter((l) => l.textContent === text)[nth]
  return host.querySelector(`[id="${label.htmlFor}"]`) as HTMLInputElement
}
/** Type into a controlled input the way React notices it. */
const typeInto = (input: HTMLInputElement, value: string) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const crosshair = () => $('.focal-editor__crosshair') as HTMLElement

describe('AspectPreviewEditor', () => {
  it('shows the empty message without an image', () => {
    render({ emptyMessage: 'Pick a photo' })
    expect($('.focal-editor__empty')?.textContent).toBe('Pick a photo')
    expect($('img')).toBeNull()
  })

  it('renders the image, a centred focal point and one preview per default ratio', () => {
    render({ src: 'blob:http://localhost/abc' })
    expect($('.focal-editor__image-wrapper img')?.getAttribute('src')).toBe('blob:http://localhost/abc')
    expect(crosshair().style.left).toBe('50%')
    expect(crosshair().style.top).toBe('50%')
    expect(host.querySelectorAll('.focal-preview__card')).toHaveLength(DEFAULT_ASPECT_RATIOS.length)
  })

  it('takes custom ratios, a className and inline theme variables on the root', () => {
    render({
      src: '/a.jpg',
      aspectRatios: [{ name: 'Hero', ratio: '21:9', width: 21, height: 9 }],
      className: 'demo',
      style: { ['--apv-bg' as string]: 'black' },
    })
    const rootEl = $('.focal-editor') as HTMLElement
    expect(rootEl.className).toBe('focal-editor demo')
    expect(rootEl.style.getPropertyValue('--apv-bg')).toBe('black')
    expect(host.querySelectorAll('.focal-preview__card')).toHaveLength(1)
    expect(host.textContent).toContain('Hero')
  })

  it('draws a crop-relative focal point at its place on the whole image', () => {
    render({
      src: '/a.jpg',
      value: { crop: { unit: '%', x: 20, y: 10, width: 50, height: 40 }, focal: { x: 50, y: 50 } },
    })
    // 20 + 50% of 50 = 45, 10 + 50% of 40 = 30
    expect(crosshair().style.left).toBe('45%')
    expect(crosshair().style.top).toBe('30%')
    expect($('.focal-editor__crop-overlay')).not.toBeNull()
  })

  it('reports focal edits as user changes and keeps the crop', () => {
    const onChange = vi.fn()
    const crop = { unit: '%' as const, x: 10, y: 10, width: 50, height: 50 }
    render({ src: '/a.jpg', value: { crop, focal: { x: 50, y: 50 } }, onChange })
    typeInto(inputByLabel('X'), '120')
    expect(onChange).toHaveBeenLastCalledWith({ crop, focal: { x: 100, y: 50 } }, { reason: 'user' })
  })

  it('stays put when controlled and the parent ignores the change', () => {
    render({ src: '/a.jpg', value: { focal: { x: 30, y: 40 } }, onChange: () => {} })
    typeInto(inputByLabel('X'), '80')
    expect(crosshair().style.left).toBe('30%')
  })

  it('keeps its own state when uncontrolled', () => {
    const onChange = vi.fn()
    render({ src: '/a.jpg', defaultValue: { focal: { x: 10, y: 20 } }, onChange })
    typeInto(inputByLabel('Y'), '75')
    expect(crosshair().style.top).toBe('75%')
    expect(onChange).toHaveBeenLastCalledWith({ focal: { x: 10, y: 75 } }, { reason: 'user' })
  })

  it('composes two changes made before the parent re-renders', () => {
    const seen: AspectPreviewValue[] = []
    render({ src: '/a.jpg', value: { focal: { x: 50, y: 50 } }, onChange: (v) => seen.push(v) })
    const x = inputByLabel('X')
    const y = inputByLabel('Y')
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(x, '10')
      x.dispatchEvent(new Event('input', { bubbles: true }))
      setter.call(y, '90')
      y.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(seen.at(-1)).toEqual({ focal: { x: 10, y: 90 } })
  })

  it('clamps crop fields to the image and enables them only with a real crop', () => {
    const onChange = vi.fn()
    render({ src: '/a.jpg', value: { focal: { x: 50, y: 50 } }, onChange })
    expect(inputByLabel('W').disabled).toBe(true)
    render({
      src: '/a.jpg',
      value: { crop: { unit: '%', x: 60, y: 0, width: 30, height: 30 }, focal: { x: 50, y: 50 } },
      onChange,
    })
    expect(inputByLabel('W').disabled).toBe(false)
    typeInto(inputByLabel('W'), '90')
    expect(onChange.mock.lastCall?.[0].crop).toEqual({ unit: '%', x: 60, y: 0, width: 40, height: 30 })
  })

  it('Reset clears the crop and centres the focal point', () => {
    const onChange = vi.fn()
    render({
      src: '/a.jpg',
      value: { crop: { unit: '%', x: 5, y: 5, width: 50, height: 50 }, focal: { x: 0, y: 100 } },
      onChange,
    })
    click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Reset')!)
    expect(onChange).toHaveBeenLastCalledWith({ crop: undefined, focal: { x: 50, y: 50 } }, { reason: 'user' })
  })

  it('switches between focal and crop mode', () => {
    render({ src: '/a.jpg' })
    expect($('.is-focal-mode')).not.toBeNull()
    click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Crop')!)
    expect($('.is-crop-mode')).not.toBeNull()
    expect($('.focal-editor__crosshair')).toBeNull()
  })

  it('converts a legacy pixel crop to percent on load, as a normalize change', () => {
    const onChange = vi.fn()
    render({
      src: '/a.jpg',
      value: { crop: { unit: 'px', x: 100, y: 50, width: 200, height: 100 }, focal: { x: 50, y: 50 } },
      onChange,
    })
    const img = $('.focal-editor__image-wrapper img') as HTMLImageElement
    Object.defineProperty(img, 'clientWidth', { value: 400 })
    Object.defineProperty(img, 'clientHeight', { value: 200 })
    act(() => img.dispatchEvent(new Event('load')))
    expect(onChange).toHaveBeenLastCalledWith(
      { crop: { unit: '%', x: 25, y: 25, width: 50, height: 50 }, focal: { x: 50, y: 50 } },
      { reason: 'normalize' },
    )
  })

  it('moves the focal point to where the image is pressed, inside the crop', () => {
    const onChange = vi.fn()
    render({
      src: '/a.jpg',
      value: { crop: { unit: '%', x: 50, y: 0, width: 50, height: 100 }, focal: { x: 50, y: 50 } },
      onChange,
    })
    const overlay = $('.focal-editor__focal-overlay') as HTMLElement
    overlay.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 }) as DOMRect
    // Pressed at 75% across → the middle of a crop spanning 50–100%; 20% down.
    act(() =>
      overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 150, clientY: 20 })),
    )
    expect(onChange.mock.lastCall?.[0].focal).toEqual({ x: 50, y: 20 })
    // Outside the crop clamps to its edge.
    act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 20 })))
    expect(onChange.mock.lastCall?.[0].focal.x).toBe(0)
    act(() => window.dispatchEvent(new MouseEvent('mouseup')))
  })

  it('renders on the server', () => {
    const html = renderToStaticMarkup(createElement(AspectPreviewEditor, { src: '/a.jpg' }))
    expect(html).toContain('focal-editor__crosshair')
  })
})

describe('isRealCrop', () => {
  it('ignores missing, empty and whole-image crops', () => {
    expect(isRealCrop(undefined)).toBe(false)
    expect(isRealCrop({ unit: '%', x: 0, y: 0, width: 0, height: 10 })).toBe(false)
    expect(isRealCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 })).toBe(false)
    expect(isRealCrop({ unit: '%', x: 0, y: 0, width: 99, height: 100 })).toBe(true)
  })
})
