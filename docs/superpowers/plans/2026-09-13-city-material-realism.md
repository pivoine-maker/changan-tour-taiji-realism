# XXXIII Implementation Plan
Goal: Replace model-like uniform surfaces with built-in generated materials and metrically consistent detail.
Architecture: optional city texture fields keep palace textures unchanged; CitySurfaceGeometry bakes ordinary instances with local UVs and vertex colors; gates remain instanced. Texture ownership stays in loader except separately owned height proxies.
Tech: Three.js, TypeScript, Vitest, Vite, Playwright.
- [x] Generate and copy roof/plaster/timber/earth/window assets into public/textures/city-ai-v33; preserve originals.
- [x] Add CitySurfaceGeometry.test.ts proving identical bounds, no borrowed disposal, and retained north gate source IDs. Run npx vitest run src/scene/CitySurfaceGeometry.test.ts (red).
- [x] Implement bakeCitySurfaceInstances(source, kind) with per-instance scaled local coordinates, metric UVs, retained gate instances, vertex colors; call from CityRealism after constructing city. Roof pitch uses its local dominant face; timber grain follows long axis.
- [x] Add optional cityRoof/cityPlaster/cityTimber/cityEarth to PilotTextures and load them. Apply owned city material height proxies and real surface colors, preserve palace maps and classic mode.
- [x] Build and run full tests; use Playwright same-camera XXXII/XXXIII near/overview images, inspect roof seams/scale/appearance, mode/walk and path sampling. Fix observed problems.
- [x] Write provenance and actual quality report, preserve XXXIII with hashes, keep preview running and present result.
