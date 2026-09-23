# Full City Ward Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render all ordinary Chang'an wards outside the West Market and palace cores with detailed architecture, courtyards, lanes, vegetation, residents, and street props.

**Architecture:** Extend `FullCityAssets` with deterministic instance-layout helpers derived from `ChanganCityModel`. Keep each visual family in named `THREE.InstancedMesh` layers so thousands of details remain a small number of draw calls, and filter enrichment layers away from the existing West Market high-detail core.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Lock the asset contract with tests

**Files:**
- Modify: `src/scene/FullCityAssets.test.ts`

- [ ] **Step 1: Write the failing detail-layer test**

Add expectations for named instance layers covering inner lanes, courtyard paving, pitched roof slopes, roof ridges, timber frames, doors and windows, wells, stalls, carts, residents, and street props. Assert that the full city uses at least 20 instanced meshes and more than 7,000 instances.

- [ ] **Step 2: Write the failing exclusion test**

Read instance matrices from the enrichment parent and assert that no enrichment instance origin falls inside the West Market core rectangle `x = -42…42`, `z = -34…34`.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- --run src/scene/FullCityAssets.test.ts`

Expected: FAIL because the named ordinary-ward detail layers do not exist yet.

### Task 2: Build deterministic ordinary-ward layouts

**Files:**
- Modify: `src/scene/FullCityAssets.ts`

- [ ] **Step 1: Add reusable instance descriptors**

Define small internal descriptors for boxes, cylinders, roof slopes, people, stalls, carts, wells and props. Derive their positions from ward bounds, row, column and existing buildings without random calls.

- [ ] **Step 2: Filter enrichment wards**

Add a helper that rejects wards intersecting the West Market core. Continue relying on the existing city data to omit the imperial void.

- [ ] **Step 3: Add internal lanes and courtyards**

Generate two packed-earth inner lanes per ordinary ward, stone courtyard paving for each building cluster, thresholds and small drainage stones.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --run src/scene/FullCityAssets.test.ts`

Expected: the new spatial layers pass while architectural and life-detail expectations remain RED.

### Task 3: Upgrade ordinary architecture

**Files:**
- Modify: `src/scene/FullCityAssets.ts`

- [ ] **Step 1: Replace flat roof boxes with pitched roof layers**

Create paired sloped roof instances for hip-roof buildings and retain shallow roofs for flat-roof variants. Add separate ridge and eave instances.

- [ ] **Step 2: Add foundations and timber façades**

Generate stone foundations, façade columns, lintels, doors and window panels using low-cost box and cylinder instances.

- [ ] **Step 3: Run the focused test**

Run: `npm test -- --run src/scene/FullCityAssets.test.ts`

Expected: architectural layer expectations pass.

### Task 4: Add ordinary ward life details

**Files:**
- Modify: `src/scene/FullCityAssets.ts`

- [ ] **Step 1: Add wells and vegetation**

Create low-poly well rings, well roofs, varied tree crowns and shrub clusters distributed across ordinary wards.

- [ ] **Step 2: Add residents and trade activity**

Create instanced residents, stalls, awnings, cargo stacks, pottery and banners with deterministic color variation.

- [ ] **Step 3: Add carts and street furniture**

Create cart bodies, wheels, shafts, hitching posts and stone blocks along inner lanes in a subset of wards.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/scene/FullCityAssets.test.ts`

Expected: PASS with all named layers, count budgets and exclusion assertions satisfied.

### Task 5: Verify the complete application

**Files:**
- Modify only if verification reveals a feature-specific defect.

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`

Expected: all test files pass.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Inspect in the browser**

Open `http://127.0.0.1:5173/`, capture a full-page screenshot and inspect an overview plus a zoomed ordinary ward. Confirm the West Market and palace remain unobstructed and browser logs contain no errors.

- [ ] **Step 4: Commit the feature**

Run:

```bash
git add src/scene/FullCityAssets.ts src/scene/FullCityAssets.test.ts docs/superpowers/specs/2026-08-02-full-city-ward-detail-design.md docs/superpowers/plans/2026-08-02-full-city-ward-detail-implementation.md
git commit -m "Render detailed Chang'an residential wards"
```
