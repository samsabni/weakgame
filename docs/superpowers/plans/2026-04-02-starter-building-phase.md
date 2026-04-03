# Starter Building Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time startup phase where the player can choose any building as their free initial running building with 10 assigned delinquents and 100% control.

**Architecture:** Keep the starter-building rule as an explicit startup-state flag rather than overloading normal running/purchase logic. The first valid building click claims the starter building, mutates that building into a normal running building state, and then permanently disables the startup exception so all normal reachability and purchase rules resume.

**Tech Stack:** Vite, plain JavaScript modules, HTML HUD, Vitest

---

## File Responsibilities

- `src/game/buildingState.js`
  - add `needsStarterBuilding` to initial state and a helper to claim the starter building
- `src/main.js`
  - route the first building click through starter-building claim logic before normal selection flow resumes
- `src/game/ui.js`
  - show the startup instruction and hide the normal run action during startup phase
- `tests/buildingState.test.js`
  - cover starter-state defaults and claim behavior
- `tests/ui.test.js`
  - cover startup messaging and hidden run button during starter phase

### Task 1: Add Failing Starter-State Tests

**Files:**
- Modify: `tests/buildingState.test.js`

- [ ] **Step 1: Write the failing tests for startup defaults and starter claiming**

```js
import { claimStarterBuilding } from '../src/game/buildingState.js';

it('starts in starter-building mode', () => {
  const state = createInitialState([createBuilding('building-1')]);

  expect(state.needsStarterBuilding).toBe(true);
});

it('claims one starter building without spending idle delinquents', () => {
  const state = createInitialState([
    createBuilding('building-1'),
    createBuilding('building-2')
  ]);

  const changed = claimStarterBuilding(state, 'building-2');

  expect(changed).toBe(true);
  expect(state.needsStarterBuilding).toBe(false);
  expect(state.selectedBuildingId).toBe('building-2');
  expect(state.playerIdleDelinquents).toBe(10);
  expect(state.buildings[1].isRunning).toBe(true);
  expect(state.buildings[1].playerAssignedDelinquents).toBe(10);
  expect(state.buildings[1].control).toBe(100);
});

it('does not allow a second starter claim after the first one', () => {
  const state = createInitialState([
    createBuilding('building-1'),
    createBuilding('building-2')
  ]);

  claimStarterBuilding(state, 'building-1');
  expect(claimStarterBuilding(state, 'building-2')).toBe(false);
  expect(state.buildings[1].isRunning).toBe(false);
});
```

- [ ] **Step 2: Run the targeted state test file to verify it fails**

Run: `npm test -- tests/buildingState.test.js`
Expected: FAIL with missing `claimStarterBuilding` or missing `needsStarterBuilding` state.

### Task 2: Implement Starter-Building State Logic

**Files:**
- Modify: `src/game/buildingState.js`

- [ ] **Step 1: Add startup flag to initial state and implement the starter-claim helper**

```js
export function createInitialState(buildings) {
  return {
    buildings,
    playerIdleDelinquents: 10,
    cash: 0,
    influence: 0,
    needsStarterBuilding: true,
    selectedBuildingId: null,
    hoveredBuildingId: null
  };
}

export function claimStarterBuilding(state, buildingId) {
  if (!state.needsStarterBuilding) {
    return false;
  }

  const building = state.buildings.find((entry) => entry.id === buildingId);
  if (!building) {
    return false;
  }

  building.isRunning = true;
  building.playerAssignedDelinquents = 10;
  building.control = 100;
  state.selectedBuildingId = buildingId;
  state.needsStarterBuilding = false;
  return true;
}
```

- [ ] **Step 2: Run the targeted state test file to verify it passes**

Run: `npm test -- tests/buildingState.test.js`
Expected: PASS

### Task 3: Add Failing UI Tests For Startup Messaging

**Files:**
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Write the failing UI test for startup messaging and run-button hiding**

```js
it('shows the startup instruction and hides Run Building during starter-building mode', () => {
  const ui = createUi();
  ui.status = createTextNode();
  const state = {
    playerIdleDelinquents: 10,
    cash: 0,
    influence: 0,
    needsStarterBuilding: true,
    buildings: []
  };

  renderSelectedBuilding(ui, state, {
    id: 'building-1',
    owner: 'neutral',
    control: 0,
    playerAssignedDelinquents: 0,
    isRunning: false
  });

  expect(ui.status.textContent).toBe('Choose your starting building');
  expect(ui.runBuildingButton.hidden).toBe(true);
});
```

- [ ] **Step 2: Run the targeted UI test file to verify it fails**

Run: `npm test -- tests/ui.test.js`
Expected: FAIL because the startup message is not rendered or the run button is still shown normally.

### Task 4: Wire Starter Claim Flow And Startup HUD

**Files:**
- Modify: `src/main.js`
- Modify: `src/game/ui.js`
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Update the UI renderer to show the startup message during starter mode**

```js
export function renderSelectedBuilding(ui, state, building) {
  if (state.needsStarterBuilding) {
    ui.status.textContent = 'Choose your starting building';
  }

  // keep the existing global/stat rendering

  if (building && state.needsStarterBuilding) {
    ui.runBuildingButton.hidden = true;
  }
}
```

- [ ] **Step 2: Route the first building click through `claimStarterBuilding(...)`**

```js
import { claimStarterBuilding } from './game/buildingState.js';

renderer.element.addEventListener('click', (event) => {
  const point = renderer.toImageCoordinates(event.clientX, event.clientY);
  const buildingId = findBuildingAtPixel(regionMap, point.x, point.y);

  if (state.needsStarterBuilding) {
    if (buildingId && claimStarterBuilding(state, buildingId)) {
      renderer.updateBuildingColors(state.buildings);
      renderer.drawSelection(getSelectedBuilding(state));
      renderSelectedBuilding(ui, state, getSelectedBuilding(state));
    }
    return;
  }

  // existing normal click selection logic below
});
```

- [ ] **Step 3: Run the targeted UI test file to verify it passes**

Run: `npm test -- tests/ui.test.js`
Expected: PASS

### Task 5: Full Verification

**Files:**
- Modify: `src/main.js` further only if needed for a small post-claim status refresh

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS with detector, state, delinquent-manager, renderer, running-building, and UI suites all green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: If needed, make the smallest status-refresh adjustment and re-run verification**

```js
renderSelectedBuilding(ui, state, getSelectedBuilding(state));
```

Use this only if the startup message or starter selection view does not refresh immediately after the first claim.

## Self-Review Checklist

- Spec coverage:
  - `needsStarterBuilding` startup flag: Task 1 + Task 2
  - one free starter choice anywhere: Task 1 + Task 4
  - starter building becomes running with 10 assigned delinquents and 100% control: Task 1 + Task 2
  - idle delinquents unchanged: Task 1
  - only one free claim allowed: Task 1 + Task 2
  - startup message and run-button suppression: Task 3 + Task 4
- Placeholder scan:
  - no `TODO` / `TBD`
- Type consistency:
  - `claimStarterBuilding` and `needsStarterBuilding` are used consistently across state, main loop, and tests
