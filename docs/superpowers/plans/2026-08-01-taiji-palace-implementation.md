# Taiji Palace Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Chang'an walk continuously from the West Market through the imperial city into a fully explorable Taiji Palace.

**Architecture:** Add imperial precinct data beside the existing world model, render it through a dedicated imperial asset factory, and reuse the existing road navigation and discovery systems. Keep historical evidence cards separate from visual reconstruction data.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest

---

### Task 1: Imperial world model

**Files:** `src/data/imperialCity.ts`, `src/data/world.ts`, `src/data/world.test.ts`, `src/navigation/pathfinding.test.ts`

- [x] Add failing tests for palace bounds, precinct hierarchy, avenues, and route continuity.
- [x] Define imperial halls, walls, courtyards, props, roads, and landmarks.
- [ ] Run focused world and navigation tests.

### Task 2: Historical discovery archive

**Files:** `src/data/discoveries.ts`, `src/data/discoveries.test.ts`

- [x] Add failing tests for five imperial discoveries.
- [ ] Add evidence-separated cards for gates, offices, halls, and garden.
- [ ] Run discovery tests.

### Task 3: Imperial 3D assets

**Files:** `src/scene/ImperialAssets.ts`, `src/scene/ImperialAssets.test.ts`, `src/scene/WestMarketScene.ts`

- [ ] Add failing tests for palace halls, podiums, courtyards, pool, and balustrades.
- [ ] Build the dedicated imperial asset group with PBR materials.
- [ ] Mount imperial assets and expand fog, shadows, and camera overview.
- [ ] Run scene tests.

### Task 4: UI and verification

**Files:** `src/ui/appUi.ts`, `src/ui/appUi.test.ts`, `src/scene/cameraControls.ts`, `src/scene/cameraControls.test.ts`

- [x] Add failing tests for imperial region labels.
- [ ] Update labels, title, camera bounds, and overview distance.
- [ ] Run all tests and production build.
- [ ] Capture and inspect a full-page browser screenshot.
