import type { AspectRatioConfig } from './types.js'

export const DEFAULT_ASPECT_RATIOS: AspectRatioConfig[] = [
  { name: 'Square', ratio: '1:1', width: 1, height: 1, source: 'crop', usage: 'Avatars, thumbnails', category: 'general' },
  { name: 'Standard', ratio: '4:3', width: 4, height: 3, source: 'css', usage: 'Standard cards', category: 'general' },
  { name: 'Classic', ratio: '3:2', width: 3, height: 2, source: 'css', usage: 'Photography', category: 'general' },
  { name: 'Widescreen', ratio: '16:9', width: 16, height: 9, source: 'css', usage: 'Hero / media blocks', category: 'general' },
  { name: 'Portrait', ratio: '9:16', width: 9, height: 16, source: 'css', usage: 'Mobile / stories', category: 'general' },
  { name: 'Social Share', ratio: '1.91:1', width: 1200, height: 630, source: 'crop', usage: 'Open Graph / social', category: 'social' },
]
