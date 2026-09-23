# Right Sidebar NPC Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move quests into a right-sidebar tab and add cyclic NPC camera navigation.

**Architecture:** `appUi` owns the two-tab sidebar and exposes the new locate callback. `cameraControls` defines the NPC inspection rig and cycle helper. `WestMarketScene` cycles through `questNpcs`, preserves current quest marker visibility, and returns the located NPC to `main` for feedback.

**Tech Stack:** TypeScript, Three.js, Vitest, CSS

---

### Task 1: Lock behavior with tests

- [ ] Update `src/ui/appUi.test.ts` to require right-sidebar quest markup, tab labels and the NPC button callback.
- [ ] Update `src/scene/cameraControls.test.ts` to require the NPC camera rig and wrapping cycle index.
- [ ] Run focused tests and confirm RED.

### Task 2: Implement the sidebar tabs

- [ ] Move quest markup from `.scene-panel` into `.archive-panel`.
- [ ] Add accessible tab buttons and switch visible sidebar views.
- [ ] Update CSS so quest content fills the sidebar instead of covering the canvas.
- [ ] Run the UI test and confirm GREEN.

### Task 3: Implement NPC cycling

- [ ] Add NPC camera rig and cycle helper to `cameraControls.ts`.
- [ ] Add `locateNextNpc()` to `WestMarketScene` and preserve active/current NPC marker visibility.
- [ ] Wire `onLocateNpc` in `main.ts` and show the NPC name/role toast.
- [ ] Run focused tests and confirm GREEN.

### Task 4: Verify and commit

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Inspect sidebar tabs and repeated NPC navigation in the browser.
- [ ] Commit with `git commit -m "Move quests to sidebar and add NPC navigation"`.
