# Map Place Label Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable semi-transparent place-name overlay for the full Chang'an map, including districts, roads, palace landmarks, NPCs, treasures, and discoveries.

**Architecture:** `mapLabels` builds typed label data from existing world, quest, and discovery data. `labelProjection` keeps camera projection and label visibility testable without DOM or Three.js scene setup. `WestMarketScene` owns the HTML overlay, projects labels every frame, and exposes `setPlaceLabelsVisible()`. `appUi` adds the topbar toggle and `main` wires it to the scene.

**Tech Stack:** TypeScript, Three.js, DOM/CSS, Vitest

---

### Task 1: Add unified map label data

**Files:**
- Create: `src/data/mapLabels.ts`
- Create: `src/data/mapLabels.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/data/mapLabels.test.ts`:

```ts
import { discoveries } from './discoveries';
import { createMapLabelSpecs } from './mapLabels';
import { questNpcs, questTreasures } from './quests';
import { westMarketWorld } from './world';

describe('map label specs', () => {
  const labels = createMapLabelSpecs(westMarketWorld);

  it('includes districts, avenues, imperial precincts, quests, and discoveries', () => {
    expect(labels.some((label) => label.kind === 'district' && label.label === '西市')).toBe(true);
    expect(labels.some((label) => label.kind === 'avenue' && label.label === '朱雀大街')).toBe(true);
    expect(labels.some((label) => label.kind === 'palace' && label.label === '太极宫')).toBe(true);
    expect(labels.filter((label) => label.kind === 'npc')).toHaveLength(questNpcs.length);
    expect(labels.filter((label) => label.kind === 'treasure')).toHaveLength(questTreasures.length);
    expect(labels.filter((label) => label.kind === 'discovery')).toHaveLength(discoveries.length);
  });

  it('uses stable ids and density priorities for detailed labels', () => {
    expect(labels.find((label) => label.id === 'npc-npc-sogdian-merchant')).toMatchObject({
      label: '阿罗罕',
      kind: 'npc',
      minDistance: 0,
      maxDistance: 260,
      priority: 88
    });
    expect(labels.find((label) => label.id === 'treasure-passage-document')).toMatchObject({
      label: '盖印通关牒',
      kind: 'treasure',
      maxDistance: 230
    });
  });

  it('keeps label ids unique', () => {
    expect(new Set(labels.map((label) => label.id)).size).toBe(labels.length);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- --run src/data/mapLabels.test.ts`

Expected: FAIL because `src/data/mapLabels.ts` does not exist.

- [ ] **Step 3: Implement `mapLabels.ts`**

Create `src/data/mapLabels.ts`:

```ts
import { discoveries } from './discoveries';
import { questNpcs, questTreasures } from './quests';
import type { Point2, WorldModel } from './world';

export type MapLabelKind = 'district' | 'avenue' | 'palace' | 'gate' | 'npc' | 'treasure' | 'discovery';

export interface MapLabelSpec extends Point2 {
  id: string;
  label: string;
  kind: MapLabelKind;
  y: number;
  priority: number;
  minDistance: number;
  maxDistance: number;
}

const discoveryKindById = new Map<string, MapLabelKind>([
  ['west-gate', 'gate'],
  ['zhuque-gate', 'gate'],
  ['chengtian-gate', 'gate'],
  ['taiji-hall', 'palace'],
  ['inner-palace-garden', 'palace']
]);

export function createMapLabelSpecs(world: WorldModel): MapLabelSpec[] {
  const labels: MapLabelSpec[] = [
    {
      id: 'district-west-market',
      label: '西市',
      kind: 'district',
      x: 0,
      y: 5.8,
      z: 0,
      priority: 100,
      minDistance: 0,
      maxDistance: 900
    },
    ...world.districts.map((district): MapLabelSpec => ({
      id: `district-${district.id}`,
      label: district.label,
      kind: 'district',
      x: (district.bounds.minX + district.bounds.maxX) / 2,
      y: 4.8,
      z: (district.bounds.minZ + district.bounds.maxZ) / 2,
      priority: 58,
      minDistance: 0,
      maxDistance: 720
    })),
    ...world.avenues.map((avenue): MapLabelSpec => ({
      id: `avenue-${avenue.id}`,
      label: avenue.label,
      kind: 'avenue',
      x: avenue.x,
      y: 2.6,
      z: avenue.z,
      priority: 86,
      minDistance: 0,
      maxDistance: 860
    })),
    ...world.imperialPrecincts.map((precinct): MapLabelSpec => ({
      id: `palace-${precinct.id}`,
      label: precinct.label,
      kind: 'palace',
      x: (precinct.bounds.minX + precinct.bounds.maxX) / 2,
      y: 7.6,
      z: (precinct.bounds.minZ + precinct.bounds.maxZ) / 2,
      priority: precinct.id === 'taiji-palace' ? 98 : 82,
      minDistance: 0,
      maxDistance: 900
    })),
    ...questNpcs.map((npc): MapLabelSpec => ({
      id: `npc-${npc.id}`,
      label: npc.name,
      kind: 'npc',
      x: npc.x,
      y: 4.2,
      z: npc.z,
      priority: 88,
      minDistance: 0,
      maxDistance: 260
    })),
    ...questTreasures.map((treasure): MapLabelSpec => ({
      id: treasure.id,
      label: treasure.name,
      kind: 'treasure',
      x: treasure.x,
      y: 3.8,
      z: treasure.z,
      priority: 78,
      minDistance: 0,
      maxDistance: 230
    })),
    ...discoveries.map((discovery): MapLabelSpec => ({
      id: `discovery-${discovery.id}`,
      label: discovery.title,
      kind: discoveryKindById.get(discovery.id) ?? 'discovery',
      x: discovery.position.x,
      y: 4.5,
      z: discovery.position.z,
      priority: discoveryKindById.has(discovery.id) ? 92 : 64,
      minDistance: 0,
      maxDistance: discoveryKindById.has(discovery.id) ? 620 : 300
    }))
  ];

  return dedupeLabels(labels);
}

function dedupeLabels(labels: MapLabelSpec[]): MapLabelSpec[] {
  const byId = new Map<string, MapLabelSpec>();
  for (const label of labels) {
    byId.set(label.id, label);
  }
  return [...byId.values()];
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm test -- --run src/data/mapLabels.test.ts`

Expected: PASS.

### Task 2: Add projection and density helpers

**Files:**
- Create: `src/scene/labelProjection.ts`
- Create: `src/scene/labelProjection.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/scene/labelProjection.test.ts`:

```ts
import { getLabelVisibility, rectanglesOverlap } from './labelProjection';

describe('label projection helpers', () => {
  it('shows detailed labels only in their distance band', () => {
    expect(getLabelVisibility({ distance: 180, minDistance: 0, maxDistance: 260, isInFront: true })).toBe('visible');
    expect(getLabelVisibility({ distance: 500, minDistance: 0, maxDistance: 260, isInFront: true })).toBe('hidden');
  });

  it('hides labels behind the camera', () => {
    expect(getLabelVisibility({ distance: 120, minDistance: 0, maxDistance: 260, isInFront: false })).toBe('hidden');
  });

  it('detects overlapping label rectangles', () => {
    expect(rectanglesOverlap({ x: 10, y: 10, width: 80, height: 28 }, { x: 70, y: 20, width: 90, height: 28 })).toBe(true);
    expect(rectanglesOverlap({ x: 10, y: 10, width: 80, height: 28 }, { x: 140, y: 20, width: 90, height: 28 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- --run src/scene/labelProjection.test.ts`

Expected: FAIL because `src/scene/labelProjection.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create `src/scene/labelProjection.ts`:

```ts
export type LabelVisibility = 'visible' | 'hidden';

export interface LabelVisibilityInput {
  distance: number;
  minDistance: number;
  maxDistance: number;
  isInFront: boolean;
}

export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getLabelVisibility(input: LabelVisibilityInput): LabelVisibility {
  if (!input.isInFront) {
    return 'hidden';
  }
  if (input.distance < input.minDistance || input.distance > input.maxDistance) {
    return 'hidden';
  }
  return 'visible';
}

export function rectanglesOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm test -- --run src/scene/labelProjection.test.ts`

Expected: PASS.

### Task 3: Add UI toggle contract

**Files:**
- Modify: `src/ui/appUi.ts`
- Modify: `src/ui/appUi.test.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing UI test**

In `src/ui/appUi.test.ts`, update `createAppUi` calls to include `onTogglePlaceLabels: vi.fn()`. Add this test:

```ts
it('toggles the place-name button label and pressed state', () => {
  const onTogglePlaceLabels = vi.fn();
  const root = document.createElement('div');

  createAppUi({
    root,
    onResetView: vi.fn(),
    onLocateTraveler: vi.fn(),
    onLocateNpc: vi.fn(),
    onTogglePlaceLabels,
    onClearProgress: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn()
  });

  const button = root.querySelector<HTMLButtonElement>('#toggle-place-labels');
  expect(button?.textContent).toContain('显示地名');
  expect(button?.getAttribute('aria-pressed')).toBe('false');

  button?.click();
  expect(onTogglePlaceLabels).toHaveBeenCalledWith(true);
  expect(button?.textContent).toContain('隐藏地名');
  expect(button?.getAttribute('aria-pressed')).toBe('true');

  button?.click();
  expect(onTogglePlaceLabels).toHaveBeenCalledWith(false);
  expect(button?.textContent).toContain('显示地名');
  expect(button?.getAttribute('aria-pressed')).toBe('false');
});
```

- [ ] **Step 2: Run UI test to verify RED**

Run: `npm test -- --run src/ui/appUi.test.ts`

Expected: FAIL because the option and button do not exist.

- [ ] **Step 3: Implement the UI toggle**

Modify `src/ui/appUi.ts`:

- Add `onTogglePlaceLabels: (visible: boolean) => void;` to `AppUiOptions`.
- Add a topbar button after “找到 NPC”:

```html
<button class="find-traveler-button place-label-toggle" id="toggle-place-labels" type="button" aria-label="显示或隐藏地名" aria-pressed="false"><span>名</span>显示地名</button>
```

- Query the element:

```ts
const placeLabelsButton = requireElement<HTMLButtonElement>(options.root, '#toggle-place-labels');
```

- Add state and listener:

```ts
let placeLabelsVisible = false;

function setPlaceLabelsButtonState(visible: boolean): void {
  placeLabelsVisible = visible;
  placeLabelsButton.setAttribute('aria-pressed', String(visible));
  placeLabelsButton.innerHTML = `<span>名</span>${visible ? '隐藏地名' : '显示地名'}`;
}

placeLabelsButton.addEventListener('click', () => {
  setPlaceLabelsButtonState(!placeLabelsVisible);
  options.onTogglePlaceLabels(placeLabelsVisible);
});
```

Modify `src/main.ts` `createAppUi` options:

```ts
onTogglePlaceLabels: (visible: boolean) => scene?.setPlaceLabelsVisible(visible),
```

- [ ] **Step 4: Run UI test to verify GREEN**

Run: `npm test -- --run src/ui/appUi.test.ts`

Expected: PASS.

### Task 4: Render place labels in the scene

**Files:**
- Modify: `src/scene/WestMarketScene.ts`
- Modify: `src/styles.css`
- Modify: `src/scene/WestMarketScene.test.ts`

- [ ] **Step 1: Add a test for label spec creation reachability**

In `src/scene/WestMarketScene.test.ts`, import `createMapLabelSpecs` and add:

```ts
it('builds enough place labels for the full overlay', () => {
  const labels = createMapLabelSpecs(westMarketWorld);
  expect(labels.length).toBeGreaterThan(30);
  expect(labels.map((label) => label.kind)).toContain('npc');
  expect(labels.map((label) => label.kind)).toContain('treasure');
  expect(labels.map((label) => label.kind)).toContain('discovery');
});
```

- [ ] **Step 2: Run scene tests**

Run: `npm test -- --run src/scene/WestMarketScene.test.ts`

Expected: PASS after Task 1 exists; this guards data coverage before DOM integration.

- [ ] **Step 3: Implement DOM overlay in `WestMarketScene`**

Modify `src/scene/WestMarketScene.ts`:

- Import `createMapLabelSpecs, type MapLabelSpec` and projection helpers.
- Add fields:

```ts
private readonly placeLabels = createMapLabelSpecs(westMarketWorld);
private readonly placeLabelLayer = document.createElement('div');
private readonly placeLabelElements = new Map<string, HTMLElement>();
private placeLabelsVisible = false;
```

- In constructor after appending renderer DOM, call `this.addPlaceLabelLayer();`.
- Add public method:

```ts
setPlaceLabelsVisible(visible: boolean): void {
  this.placeLabelsVisible = visible;
  this.placeLabelLayer.classList.toggle('is-visible', visible);
  if (!visible) {
    for (const element of this.placeLabelElements.values()) {
      element.classList.remove('is-visible');
    }
    return;
  }
  this.updatePlaceLabels();
}
```

- Add private methods:

```ts
private addPlaceLabelLayer(): void {
  this.placeLabelLayer.className = 'place-label-layer';
  this.placeLabelLayer.setAttribute('aria-hidden', 'true');
  for (const label of this.placeLabels) {
    const element = document.createElement('span');
    element.className = `place-label place-label--${label.kind}`;
    element.dataset.labelId = label.id;
    element.dataset.kind = label.kind;
    element.innerHTML = `<i>${this.getPlaceLabelIcon(label.kind)}</i><span>${label.label}</span>`;
    this.placeLabelLayer.append(element);
    this.placeLabelElements.set(label.id, element);
  }
  this.container.append(this.placeLabelLayer);
}

private getPlaceLabelIcon(kind: MapLabelSpec['kind']): string {
  const icons: Record<MapLabelSpec['kind'], string> = {
    district: '坊',
    avenue: '道',
    palace: '宫',
    gate: '门',
    npc: '人',
    treasure: '宝',
    discovery: '考'
  };
  return icons[kind];
}

private updatePlaceLabels(): void {
  if (!this.placeLabelsVisible) {
    return;
  }

  const width = this.container.clientWidth;
  const height = this.container.clientHeight;
  const occupied: { x: number; y: number; width: number; height: number }[] = [];
  const cameraPosition = this.camera.position;

  const sortedLabels = [...this.placeLabels].sort((a, b) => b.priority - a.priority);
  for (const label of sortedLabels) {
    const element = this.placeLabelElements.get(label.id);
    if (!element) {
      continue;
    }

    const worldPosition = new THREE.Vector3(label.x, label.y, label.z);
    const distance = cameraPosition.distanceTo(worldPosition);
    const projected = worldPosition.clone().project(this.camera);
    const isInFront = projected.z >= -1 && projected.z <= 1;
    const visible = getLabelVisibility({ distance, minDistance: label.minDistance, maxDistance: label.maxDistance, isInFront }) === 'visible';
    const screenX = (projected.x * 0.5 + 0.5) * width;
    const screenY = (-projected.y * 0.5 + 0.5) * height;
    const rect = { x: screenX - 54, y: screenY - 14, width: 108, height: 28 };
    const overlaps = occupied.some((item) => rectanglesOverlap(rect, item));

    if (!visible || screenX < -60 || screenX > width + 60 || screenY < -40 || screenY > height + 40 || overlaps) {
      element.classList.remove('is-visible');
      continue;
    }

    occupied.push(rect);
    const scale = Math.max(0.78, Math.min(1.08, 1.18 - distance / 820));
    element.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%) scale(${scale})`;
    element.classList.add('is-visible');
  }
}
```

- In `animate()`, call `this.updatePlaceLabels();` after `this.updateCameraFollow(delta);` and before render.
- In `dispose()`, call `this.placeLabelLayer.remove();`.

- [ ] **Step 4: Add CSS**

Modify `src/styles.css` near scene overlay styles:

```css
.place-label-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transition: opacity 180ms ease;
}

.place-label-layer.is-visible {
  opacity: 1;
}

.place-label {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid rgba(232, 198, 144, 0.24);
  border-radius: 999px;
  color: #efd2a0;
  background: rgba(24, 17, 14, 0.62);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  font-family: "Noto Serif SC", serif;
  font-size: 11px;
  letter-spacing: 0.08em;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 120ms ease;
}

.place-label.is-visible {
  opacity: 1;
}

.place-label i {
  display: grid;
  width: 16px;
  height: 16px;
  place-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  font-style: normal;
  font-size: 9px;
}

.place-label--palace,
.place-label--gate {
  border-color: rgba(226, 181, 91, 0.42);
  color: #f5d58f;
  background: rgba(64, 42, 18, 0.66);
}

.place-label--avenue {
  color: #ead9bf;
  background: rgba(64, 54, 42, 0.56);
}

.place-label--npc {
  border-color: rgba(124, 219, 207, 0.48);
  color: #b9f3ea;
  background: rgba(12, 62, 58, 0.62);
}

.place-label--treasure {
  border-color: rgba(239, 177, 75, 0.48);
  color: #ffd58d;
  background: rgba(83, 48, 9, 0.66);
}

.place-label--discovery {
  border-color: rgba(217, 99, 75, 0.46);
  color: #ffb6a5;
  background: rgba(78, 29, 22, 0.62);
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/data/mapLabels.test.ts src/scene/labelProjection.test.ts src/ui/appUi.test.ts src/scene/WestMarketScene.test.ts`

Expected: PASS.

### Task 5: Verify and commit

**Files:**
- All modified source and tests.

- [ ] **Step 1: Full verification**

Run:

```bash
git diff --check
npm test -- --run
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Browser QA**

Open `http://127.0.0.1:5173/`, click “显示地名”, verify:

- The button text changes to “隐藏地名”.
- District, palace, road, NPC, treasure, and discovery labels appear with different colors.
- Labels do not block click/drag controls.
- Zooming changes detail density.
- Console errors list is empty.

- [ ] **Step 3: Commit**

Run:

```bash
git add src docs/superpowers/plans/2026-08-02-map-place-label-overlay-implementation.md
git commit -m "Add toggleable map place labels"
```
