# Progressive Lighting Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent geometry adapter, then review spec compliance and code quality. User instructions override approval and commit gates; do not commit or deploy.

**Goal:** Test genuine indirect lighting while retaining the existing realtime game.

**Architecture:** An isolated geometry adapter makes instanced meshes compatible with the path tracer. A renderer controller owns the copied scene, BVH worker, accumulation lifecycle and fallback. The game forwards camera/actor changes and an explicit optional mode button.

**Tech Stack:** Three 0.179, three-gpu-pathtracer 0.0.23, three-mesh-bvh 0.8.3, TypeScript, Vite, Vitest.

## Task 1: Geometry adapter

- [ ] Add `src/scene/PathTraceGeometry.test.ts` with two translated instances, per-instance colors, nonuniform scale normals, interleaved attributes and an allocation-budget rejection.
- [ ] Run `npm test -- --run src/scene/PathTraceGeometry.test.ts` and observe the missing implementation fail.
- [ ] Implement `src/scene/PathTraceGeometry.ts` exporting `expandInstancedGeometry(mesh: THREE.InstancedMesh, maxVertices?: number): THREE.BufferGeometry` and `copyGeometryAttributes(geometry: THREE.BufferGeometry): THREE.BufferGeometry`. Preserve indices, position, normal, uv, uv1, tangent and color when present; all returned attributes are non-interleaved. Instance colors multiply any source vertex color. World transforms are baked only for expanded instances.
- [ ] Run the focused test and review source ownership/disposal and transformed bounds.

## Task 2: Renderer controller

- [ ] Add `src/scene/TaijiPathTracing.ts` with `createTaijiPathTracing(renderer, scene, camera, environment, actor, onStatus)`. Return a controller with `render(): boolean`, `dispose(): void`, `samples: number`. `render()` returns false while raster fallback should be drawn.
- [ ] Copy only visible MeshStandardMaterial/MeshPhysicalMaterial meshes; expand instances through Task 1. Clone materials without mutating raster resources. Preserve a mapping for actor meshes. Copy directional lights and the raw HDR environment. Use a BVH worker with `setSceneAsync`.
- [ ] Compare camera and actor matrices using epsilon 1e-5. Movement resets accumulation and returns false; after 500ms idle, update actor copies/BVH if needed and render samples. Use three bounces, a 3×3 tile schedule, minSamples 5, no denoising or depth-of-field. Catch failures and dispose owned resources without touching the raster scene.

## Task 3: Game integration and validation

- [ ] Retain the raw HDR texture in `src/scene/WestMarketScene.ts`, disposing it with the scene. Add optional initialization/toggle methods and render the existing composer whenever the controller returns false.
- [ ] Add a concise optional “静观光照” control in `src/main.ts`. Keep movement, pathfinding and current camera presets unchanged. Disable this mode when original rendering is selected.
- [ ] Run `npm run build` and focused geometry/pilot/batch tests. Open the real browser, capture same-camera raster and converged results, orbit and click-walk, verify fallback and console output. Record initialization time, sample convergence and performance.
- [ ] Keep the experiment only when visual quality and responsiveness justify it; otherwise disable it by default or remove the integration and retain the verified VI checkpoint. Save all evidence and limitations under the originating task outputs.

## Validation outcome
All three implementation tasks completed and reviewed; targeted 15 tests and build pass. Browser first preparation 22.1s; path tracing reaches128 samples and motion uses raster. Retained only as opt-in experiment, not accepted as photoreal replacement. See TAIJI-PILOT-V7.md.
