# Quest NPC Treasure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a playable four-chapter treasure hunt with NPC dialogue, historical knowledge cards, quest progress and collectible clues.

**Architecture:** Keep archaeology discoveries intact and add a parallel quest system. `src/data/quests.ts` defines static content, `src/quests/state.ts` owns persistence/progression, `WestMarketScene` detects nearby quest interactions, and `appUi` renders the active quest, clue bag and NPC dialogue.

**Tech Stack:** TypeScript, Three.js, Vitest, Vite

---

### Task 1: Add quest content and state tests

**Files:**
- Create: `src/data/quests.ts`
- Create: `src/data/quests.test.ts`
- Create: `src/quests/state.ts`
- Create: `src/quests/state.test.ts`

- [ ] **Step 1: Write failing content tests**
Assert there are 4 chapters, 5 NPCs, 4 treasures, every objective points to an entity, and every NPC has a history card with confirmed/interpreted/uncertain text.

- [ ] **Step 2: Write failing state tests**
Assert initial state starts at chapter 1, interacting with an NPC unlocks a knowledge card, collecting the chapter treasure advances chapters, and reset clears all progress.

- [ ] **Step 3: Run tests to verify RED**
Run: `npm test -- --run src/data/quests.test.ts src/quests/state.test.ts`
Expected: FAIL because the modules do not exist yet.

- [ ] **Step 4: Implement content and state**
Create static quest data and pure state helpers with localStorage persistence.

- [ ] **Step 5: Run tests to verify GREEN**
Run: `npm test -- --run src/data/quests.test.ts src/quests/state.test.ts`
Expected: PASS.

### Task 2: Render quest UI

**Files:**
- Modify: `src/ui/appUi.ts`
- Modify: `src/ui/appUi.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing UI tests**
Assert `createAppUi()` renders current quest title, objective, clue bag, NPC dialogue and knowledge card when supplied quest state.

- [ ] **Step 2: Run UI test to verify RED**
Run: `npm test -- --run src/ui/appUi.test.ts`
Expected: FAIL because quest UI methods and markup do not exist.

- [ ] **Step 3: Implement UI methods**
Add `setQuestProgress()` and `showNpcDialogue()` methods, plus panel markup and styling.

- [ ] **Step 4: Run UI test to verify GREEN**
Run: `npm test -- --run src/ui/appUi.test.ts`
Expected: PASS.

### Task 3: Add scene interactables

**Files:**
- Modify: `src/scene/WestMarketScene.ts`
- Modify: `src/scene/WestMarketScene.test.ts`

- [ ] **Step 1: Write failing scene tests**
Assert quest NPC and treasure marker specs are created from quest entities and contain distinct visual groups.

- [ ] **Step 2: Run scene test to verify RED**
Run: `npm test -- --run src/scene/WestMarketScene.test.ts`
Expected: FAIL because quest marker helpers do not exist.

- [ ] **Step 3: Implement marker helpers and proximity callback**
Add NPC/treasure markers to the scene and call `onQuestInteraction(id)` when the traveler enters trigger radius.

- [ ] **Step 4: Run scene test to verify GREEN**
Run: `npm test -- --run src/scene/WestMarketScene.test.ts`
Expected: PASS.

### Task 4: Wire the game loop

**Files:**
- Modify: `src/main.ts`
- Modify: `src/discoveries/state.ts` only if reset composition requires it.

- [ ] **Step 1: Connect quest state to scene callbacks**
Instantiate quest state, pass quest entities into the scene, and update UI after interactions.

- [ ] **Step 2: Reset all progress together**
Make the existing clear button clear discoveries and quest progress.

- [ ] **Step 3: Run focused integration tests**
Run: `npm test -- --run src/data/quests.test.ts src/quests/state.test.ts src/ui/appUi.test.ts src/scene/WestMarketScene.test.ts`
Expected: PASS.

### Task 5: Verify and commit

**Files:**
- Modify only if verification finds a feature-specific defect.

- [ ] **Step 1: Run all tests**
Run: `npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Build production assets**
Run: `npm run build`
Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Browser QA**
Open `http://127.0.0.1:5173/`, confirm quest panel, clue bag, NPC markers and treasure markers render, then check console logs.

- [ ] **Step 4: Commit**
Run:

```bash
git add src docs/superpowers/specs/2026-08-02-quest-npc-treasure-design.md docs/superpowers/plans/2026-08-02-quest-npc-treasure-implementation.md
git commit -m "Add Chang'an treasure quest system"
```
