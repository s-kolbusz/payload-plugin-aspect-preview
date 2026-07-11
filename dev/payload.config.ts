// dev app loads the built plugin from ../dist — run `pnpm build` before `pnpm dev`.
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { aspectPreviewPlugin } from '../dist/index.js'

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
    }),
  ],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI ?? 'mongodb://127.0.0.1/aspect-preview-dev',
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-change-me',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
