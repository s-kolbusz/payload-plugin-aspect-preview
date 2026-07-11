# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/), and this project
adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-07-12

### Added

- The crop + focal editor and its live preview now appear the moment an image
  is selected — before the document is saved. The editor reads the pending
  upload file directly, saving a save-and-reload round-trip on first upload.

### Fixed

- **Focal point is now stored relative to the crop region.** Payload bakes the
  crop into the base image before generating sizes and then reads `focalX/focalY`
  as percentages of the *cropped* image. Previously the plugin saved the focal
  point relative to the full original image, so a focal point set alongside a
  crop rendered correctly in the admin preview but was wrong in the actual
  output. The editor now converts on save (and back on load) so preview and
  result agree.
- A focal point placed on the top or left edge (`0%`) no longer snaps back to
  the centre.

### Changed

- Extracted the focal ↔ crop-relative conversion into a small, pure, unit-tested
  module (`focal.ts`), covered by round-trip and edge-case tests that also pin
  it to the preview grid's independently-derived formula.
- Added JSDoc across the public config surface — `aspectPreviewPlugin` (with a
  `payload.config.ts` example), `AspectPreviewPluginOptions`, `AspectRatioConfig`,
  and `DEFAULT_ASPECT_RATIOS`.

## [0.1.1] - 2026-07-12

### Added

- ESLint flat config (`typescript-eslint` + `react-hooks`) and a `lint` script.
- GitHub Actions: CI (lint/build/test) on push and PR, and a tag-triggered npm
  release workflow.

### Changed

- Dropped source maps from the published output — smaller install, and the maps
  referenced sources that were never shipped anyway.
- Removed unused dependencies (`cross-env`, `@types/react-dom`) and the unused
  `react-dom` peer dependency (the plugin's code never imports it).
- Optimized the README screenshot.

### Fixed

- Wired `sharp` and `focalPoint: true` into the dev config (sharp was imported
  but unused, so the dev smoke app didn't process image sizes).

## [0.1.0] - 2026-07-11

### Added

- Initial release. `aspectPreviewPlugin` adds a single-screen crop + focal-point
  + live multi-aspect-ratio preview editor to Payload upload collections, with
  zero-config default ratios and a fully overridable `aspectRatios` option.
