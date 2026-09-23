# Top-Down Map Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the app from free 3D exploration camera into a fixed top-down, zoomable Chang'an map with always-on map labels.

**Architecture:** Update camera rig helpers to enforce top-down map rigs and zoom bounds. Remove the place-label toggle from `appUi` and keep the scene label layer visible by default. Change `WestMarketScene` pointer movement to pan-only and style labels as map text instead of floating pills.

**Tech Stack:** TypeScript, Three.js, DOM/CSS, Vitest

---

### Task 1: Lock top-down camera behavior

- [ ] Update `src/scene/cameraControls.test.ts` to expect map-only default, traveler, and NPC rigs.
- [ ] Update `src/scene/cameraControls.ts` to use `pitch: Math.PI / 2`, fixed `yaw: 0`, and map zoom clamps.
- [ ] Run `npm test -- --run src/scene/cameraControls.test.ts`.

### Task 2: Remove label toggle UI

- [ ] Update `src/ui/appUi.test.ts` to remove `onTogglePlaceLabels` options and assert `#toggle-place-labels` is absent.
- [ ] Remove the topbar label toggle button and option from `src/ui/appUi.ts`.
- [ ] Remove `onTogglePlaceLabels` wiring from `src/main.ts`.
- [ ] Run `npm test -- --run src/ui/appUi.test.ts`.

### Task 3: Make scene map-only

- [ ] Set camera `up` vector for north-up top-down view.
- [ ] Keep `placeLabelsVisible` true by default and layer visible from construction.
- [ ] Make `updateCamera()` place the camera directly above `cameraTarget`.
- [ ] Change pointer drag to always pan, never rotate.
- [ ] Simplify wheel zoom to distance-only zoom.
- [ ] Update labels every frame as before.

### Task 4: Restyle labels and hints

- [ ] Change controls hint from rotate/ground language to map pan/zoom language.
- [ ] Restyle `.place-label` as light map text instead of floating pills.
- [ ] Keep type colors for palace, NPC, treasure, and discovery labels.

### Task 5: Verify and commit

- [ ] Run `git diff --check`.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Browser QA: default is bird-eye, labels visible, no toggle button, drag pans, zoom stays map-like, console has no errors.
- [ ] Commit with `git commit -m "Switch to top-down map mode"`.
