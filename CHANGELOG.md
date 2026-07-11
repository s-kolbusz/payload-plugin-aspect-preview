# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/), and this project
adheres to [Semantic Versioning](https://semver.org/).

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
