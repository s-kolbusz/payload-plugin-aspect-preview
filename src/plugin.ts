import type { CollectionConfig, Config, Plugin } from 'payload'

import { DEFAULT_ASPECT_RATIOS } from './defaults.js'
import type { AspectPreviewPluginOptions } from './types.js'

const FIELD_COMPONENT = 'payload-plugin-aspect-preview/client#FocalPointEditor'
const UPLOAD_COMPONENT = 'payload-plugin-aspect-preview/client#CustomUpload'

export const aspectPreviewPlugin =
  (options: AspectPreviewPluginOptions): Plugin =>
  (config: Config): Config => {
    const aspectRatios = options.aspectRatios ?? DEFAULT_ASPECT_RATIOS
    const enabled = new Set(options.collections)

    return {
      ...config,
      collections: config.collections?.map((collection) => {
        if (!enabled.has(collection.slug)) return collection

        const next: CollectionConfig = {
          ...collection,
          fields: [
            ...(collection.fields || []),
            {
              name: 'aspectPreview',
              type: 'ui',
              admin: {
                components: {
                  Field: FIELD_COMPONENT,
                },
              },
            },
          ],
          custom: {
            ...collection.custom,
            aspectPreview: { aspectRatios },
          },
        }

        // The Upload override is what removes Payload's default crop/adjust
        // drawer so the inline editor is the only surface. Skip it when
        // disabled, but keep the field + custom above for schema consistency.
        if (!options.disabled) {
          next.admin = {
            ...collection.admin,
            components: {
              ...collection.admin?.components,
              edit: {
                ...collection.admin?.components?.edit,
                Upload: UPLOAD_COMPONENT,
              },
            },
          }
        }

        return next
      }),
    }
  }
