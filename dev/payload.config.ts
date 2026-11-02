// dev app loads the built plugin from ../dist — run `pnpm build` before `pnpm dev`.
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import type { AspectRatioConfig } from '../dist/index.js'
import { aspectPreviewPlugin, DEFAULT_ASPECT_RATIOS } from '../dist/index.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [],
    },
    {
      slug: 'media',
      fields: [{ name: 'alt', type: 'text' }],
      upload: {
        staticDir: path.resolve(dirname, 'media'),
        focalPoint: true,
        imageSizes: [
          {
            name: 'thumbnail',
            width: 400,
          },
          {
            name: 'card',
            width: 768,
          },
          {
            name: 'tablet',
            width: 1024,
          },
        ],
      },
    },
  ],
  plugins: [
    aspectPreviewPlugin({
      collections: ['media'],
      // The defaults, with `overlays` on a few ratios to exercise the covered-area bands.
      aspectRatios: DEFAULT_ASPECT_RATIOS.map((ratio): AspectRatioConfig => {
        if (ratio.ratio === '4:3') {
          return {
            ...ratio,
            overlays: [
              { label: 'Chips', edge: 'top', min: 0.12 },
              { label: 'Title + price', edge: 'bottom', min: 0.22, max: 0.4 },
            ],
          }
        }
        if (ratio.ratio === '16:9') {
          return { ...ratio, overlays: [{ label: 'Headline', edge: 'left', min: 0.35, max: 0.5 }] }
        }
        if (ratio.ratio === '9:16') {
          return { ...ratio, overlays: [{ label: 'Caption', edge: 'bottom', min: 0.15, max: 0.3 }] }
        }
        return ratio
      }),
    }),
  ],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI ?? 'mongodb://127.0.0.1/aspect-preview-dev',
  }),
  editor: lexicalEditor(),
  sharp,
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-change-me',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
