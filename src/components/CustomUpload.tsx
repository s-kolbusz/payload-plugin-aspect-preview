'use client'

import type { SanitizedUploadConfig } from 'payload'

import {
  Button,
  Drawer,
  Dropzone,
  FileDetails,
  PreviewSizes,
  Thumbnail,
  fieldBaseClass,
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useModal,
  useTranslation,
  useUploadEdits,
} from '@payloadcms/ui'
import { isImage } from 'payload/shared'
import React, { useCallback, useState } from 'react'

import '../styles.scss'

const baseClass = 'file-field'
const sizePreviewSlug = 'preview-sizes'

const validate = (value: File | undefined) => {
  if (!value && value !== undefined) {
    return 'A file is required.'
  }
  if (value && (!value.name || value.name === '')) {
    return 'A file name is required.'
  }
  return true
}

export const CustomUpload: React.FC = () => {
  const { t } = useTranslation()
  const { getEntityConfig } = useConfig()
  const { data, docPermissions } = useDocumentInfo()
  const { setModified } = useForm()
  const { openModal } = useModal()
  const { resetUploadEdits } = useUploadEdits()

  const collectionSlug = data?.collection || 'media'
  const collectionConfig = getEntityConfig({ collectionSlug })
  const uploadConfig = collectionConfig?.upload as SanitizedUploadConfig | undefined

  const { setValue, value } = useField<File>({ path: 'file', validate })

  const [fileSrc, setFileSrc] = useState<string | undefined>(undefined)
  const [removedFile, setRemovedFile] = useState(false)

  const hasImageSizes = ((uploadConfig?.imageSizes?.length as number | undefined) || 0) > 0
  const imageCacheTag = uploadConfig?.cacheTags && data?.updatedAt

  const handleFileChange = useCallback(
    (file: File | null) => {
      if (file) {
        setFileSrc(URL.createObjectURL(file))
      }
      setValue(file)
      setModified(true)
    },
    [setValue, setModified],
  )

  const handleFileRemoval = useCallback(() => {
    setRemovedFile(true)
    setValue(null)
    setFileSrc(undefined)
    resetUploadEdits()
    setModified(true)
  }, [setValue, resetUploadEdits, setModified])

  const handleDropzoneChange = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        handleFileChange(files[0])
      }
    },
    [handleFileChange],
  )

  const hasExistingFile = data?.filename && !removedFile
  const hasNewFile = value && fileSrc

  return (
    <div className={[fieldBaseClass, baseClass].join(' ')}>
      {/* Existing file display — no edit button, editor is a separate UI field */}
      {hasExistingFile && (
        <FileDetails
          collectionSlug={collectionSlug}
          doc={data}
          enableAdjustments={false}
          handleRemove={docPermissions?.update ? handleFileRemoval : undefined}
          hasImageSizes={hasImageSizes}
          uploadConfig={uploadConfig!}
          imageCacheTag={imageCacheTag}
        />
      )}

      {/* Upload area */}
      {(!hasExistingFile || removedFile) && (
        <div className={`${baseClass}__upload`}>
          <Dropzone onChange={handleDropzoneChange}>
            <div className={`${baseClass}__dropzoneContent`}>
              <Button
                buttonStyle="pill"
                onClick={() => document.getElementById('file-input')?.click()}
                size="small"
              >
                {t('upload:selectFile')}
              </Button>
              <input
                id="file-input"
                type="file"
                hidden
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </div>
          </Dropzone>
        </div>
      )}

      {/* Selected file preview */}
      {hasNewFile && (
        <div className={`${baseClass}__file-selected`}>
          <div className={`${baseClass}__thumbnail-wrap`}>
            <Thumbnail
              collectionSlug={collectionSlug}
              fileSrc={isImage(value.type) ? fileSrc : undefined}
            />
          </div>
          <div className={`${baseClass}__file-adjustments`}>
            <input
              type="text"
              value={value.name}
              onChange={(e) => {
                const renamed = new File([value], e.target.value, { type: value.type })
                handleFileChange(renamed)
              }}
            />
            <div className={`${baseClass}__upload-actions`}>
              {hasImageSizes && (
                <Button buttonStyle="pill" size="small" onClick={() => openModal(sizePreviewSlug)}>
                  {t('upload:previewSizes')}
                </Button>
              )}
            </div>
          </div>
          <Button
            buttonStyle="icon-label"
            icon="x"
            onClick={handleFileRemoval}
            round
            tooltip={t('general:cancel')}
          />
        </div>
      )}

      {/* Preview Sizes Drawer */}
      {data && hasImageSizes && (
        <Drawer slug={sizePreviewSlug} title={t('upload:sizesFor', { label: data.filename })}>
          <PreviewSizes doc={data} imageCacheTag={imageCacheTag} uploadConfig={uploadConfig!} />
        </Drawer>
      )}
    </div>
  )
}

export default CustomUpload
