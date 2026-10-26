# H&F artwork and icon assets

The approved H&F monogram, prominent ampersand, and cyan/magenta edges remain the identity. There are two treatments: the original dimensional artwork and a compact vector treatment for small placements.

| Asset | Use |
| --- | --- |
| `icon-180.png` | Original artwork for Apple touch/Home Screen installations |
| `icon-192.png`, `icon-512.png` | Original artwork for ordinary web-app installation icons (`purpose: any`) |
| `logo-mark.svg` | Transparent, editable vector monogram; paths traced from the approved artwork with slight contour smoothing |
| `icon.svg` | Self-contained compact vector tile for the app header and SVG favicon |
| `favicon-16.png`, `favicon-32.png` | Compact favicon fallbacks at their actual pixel sizes |
| `icon-maskable.svg` | Full-background vector source for maskable installation exports |
| `icon-maskable-512.png` | Opaque 512px maskable export declared separately in the manifest |

The compact mark uses dark teal `#00516f`, cyan `#00e5ef`, magenta `#ec39d1`, and a pale blue tile `#d8e4ed`. It removes the original artwork's gradients, highlights, and broad shadows. Each SVG contains its own paths and internal references; no embedded raster data, font, network request, or external SVG reference is required.

`logo-mark.svg` is a vector adaptation, not the original dimensional artwork's source. Keep the original PNGs intact for their existing installation uses.

The maskable source scales the compact monogram to 74% around the center on a full square background. On the 512px export, every visible foreground pixel lies within approximately 185px of the center, inside the guaranteed 204.8px safe radius. Keep this padding when exporting at other sizes. Do not assign the ordinary PNGs `purpose: maskable`.

PNG variants can be regenerated from their corresponding SVG with an SVG renderer. Favicons use `icon.svg` at 16px and 32px. The maskable export uses `icon-maskable.svg` at 512px, with an opaque background. No build step is needed to run the app.

When changing runtime icons, keep `index.html`, `manifest.webmanifest`, and the service-worker file list in sync and advance the cache revision. Before release, inspect favicon legibility, the actual header, and newly installed Home Screen icons; installed icons may remain cached independently of the app page.
