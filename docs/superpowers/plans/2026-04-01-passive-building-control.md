# Passive Building Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the manual control button and make each building's control increase passively over time based on that building's assigned delinquent count.

**Architecture:** Keep the delinquent assignment model intact and refactor control progression from a selected-building button action into a per-frame, per-building update. The UI becomes display-only for control, while the state layer exposes a helper that advances all buildings according to their own assigned delinquent counts and clamps control at `100`.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `index.html`
- Modify: `src/game/buildingState.js`
- Modify: `src/game/ui.js`
- Modify: `src/main.js`
- Modify: `tests/buildingState.test.js`

### Task 1: Replace Selected-Building Control Tests With Passive Per-Building Control Tests

**Files:**
- Modify: `tests/buildingState.test.js`
- Modify: `src/game/buildingState.js`

- [ ] **Step 1: Replace the current control tests with passive control behavior tests**

Update `tests/buildingState.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  clearSelection,
  createInitialState,
  getSelectedBuilding,
  selectBuilding,
  setHoveredBuilding,
  tickBuildingControl
} from '../src/game/buildingState.js';

function createBuilding(id, control = 0, assigned = 0) {
  return {
    id,
    position: { x: 1, y: 1 },
    control,
    owner: 'neutral',
    playerAssignedDelinquents: assigned,
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    pixels: [[0, 0]]
  };
}

describe('buildingState', () => {
  it('creates the default interaction state', () => {
    const state = createInitialState([createBuilding('building-1')]);

    expect(state.selectedBuildingId).toBe(null);
    expect(state.hoveredBuildingId).toBe(null);
    expect(state.playerIdleDelinquents).toBe(10);
    expect(state.buildings).toHaveLength(1);
  });

  it('selects and clears buildings', () => {
    const state = createInitialState([createBuilding('building-1')]);

    selectBuilding(state, 'building-1');
    expect(getSelectedBuilding(state).id).toBe('building-1');

    clearSelection(state);
    expect(getSelectedBuilding(state)).toBe(null);
  });

  it('tracks hovered building separately from selection', () => {
    const state = createInitialState([createBuilding('building-1')]);

    setHoveredBuilding(state, 'building-1');
    expect(state.hoveredBuildingId).toBe('building-1');
  });

  it('increases control only on buildings with assigned delinquents', () => {
    const state = createInitialState([
      createBuilding('building-1', 10, 2),
      createBuilding('building-2', 20, 0)
    ]);

    tickBuildingControl(state, 3);

    expect(state.buildings[0].control).toBe(16);
    expect(state.buildings[1].control).toBe(20);
  });

  it('lets different buildings grow at different rates', () => {
    const state = createInitialState([
      createBuilding('building-1', 0, 1),
      createBuilding('building-2', 0, 3)
    ]);

    tickBuildingControl(state, 2);

    expect(state.buildings[0].control).toBe(2);
    expect(state.buildings[1].control).toBe(6);
  });

  it('clamps each building control at 100', () => {
    const state = createInitialState([
      createBuilding('building-1', 99, 2),
      createBuilding('building-2', 98, 5)
    ]);

    tickBuildingControl(state, 5);

    expect(state.buildings[0].control).toBe(100);
    expect(state.buildings[1].control).toBe(100);
  });
});
```

- [ ] **Step 2: Run the state tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js`
Expected: FAIL because `tickBuildingControl` does not exist and old state assumptions no longer match

- [ ] **Step 3: Replace selected-building control state with passive control ticking**

Update `src/game/buildingState.js`:

```js
export function createInitialState(buildings) {
  return {
    buildings,
    playerIdleDelinquents: 10,
    selectedBuildingId: null,
    hoveredBuildingId: null
  };
}

export function selectBuilding(state, buildingId) {
  state.selectedBuildingId = buildingId;
}

export function clearSelection(state) {
  state.selectedBuildingId = null;
}

export function setHoveredBuilding(state, buildingId) {
  state.hoveredBuildingId = buildingId;
}

export function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function tickBuildingControl(state, amountPerAssignedDelinquent) {
  for (const building of state.buildings) {
    if (building.playerAssignedDelinquents <= 0) {
      continue;
    }

    const increase = amountPerAssignedDelinquent * building.playerAssignedDelinquents;
    building.control = Math.min(100, building.control + increase);
  }
}
```

- [ ] **Step 4: Run the state tests again**

Run: `npm test -- tests/buildingState.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/buildingState.js tests/buildingState.test.js
git commit -m "feat: make building control delinquent driven"
```

### Task 2: Remove The Manual Control Button From The UI

**Files:**
- Modify: `index.html`
- Modify: `src/game/ui.js`

- [ ] **Step 1: Remove the button from the HTML panel**

Update `index.html` by deleting:

```html
          <button id="increase-control" type="button" disabled>Increase Control</button>
```

- [ ] **Step 2: Remove the control button binding and helper**

Update `src/game/ui.js`:

```js
export function createUiBindings() {
  return {
    status: document.querySelector('#status'),
    idleDelinquents: document.querySelector('#idle-delinquents'),
    buildingId: document.querySelector('#building-id'),
    buildingOwner: document.querySelector('#building-owner'),
    buildingControl: document.querySelector('#building-control'),
    buildingAssignedDelinquents: document.querySelector('#building-assigned-delinquents'),
    delinquentControls: document.querySelector('#delinquent-controls'),
    assignDelinquentButton: document.querySelector('#assign-delinquent'),
    removeDelinquentButton: document.querySelector('#remove-delinquent'),
    mapRoot: document.querySelector('#map-root')
  };
}

export function renderSelectedBuilding(ui, state, building) {
  ui.idleDelinquents.textContent = `Idle Delinquents: ${state.playerIdleDelinquents}`;

  if (!building) {
    ui.buildingId.textContent = 'None';
    ui.buildingOwner.textContent = 'Owner: -';
    ui.buildingControl.textContent = 'Control: -';
    ui.buildingAssignedDelinquents.hidden = true;
    ui.delinquentControls.hidden = true;
    return;
  }

  ui.buildingId.textContent = building.id;
  ui.buildingOwner.textContent = `Owner: ${building.owner}`;
  ui.buildingControl.textContent = `Control: ${building.control.toFixed(1)}%`;
  ui.buildingAssignedDelinquents.textContent = `Assigned Delinquents: ${building.playerAssignedDelinquents}`;
  ui.buildingAssignedDelinquents.hidden = false;
  ui.delinquentControls.hidden = false;
}

export function setStatus(ui, message) {
  ui.status.textContent = message;
}
```

- [ ] **Step 3: Run the production build to catch stale references**

Run: `npm run build`
Expected: build may fail until `main.js` stops referencing the removed control button helper

- [ ] **Step 4: Commit**

```bash
git add index.html src/game/ui.js
git commit -m "feat: remove manual control button"
```

### Task 3: Wire Passive Control Ticking Into The Frame Loop

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Swap the old control API for the new passive tick helper**

Update `src/main.js` imports:

```js
import {
  clearSelection,
  createInitialState,
  getSelectedBuilding,
  selectBuilding,
  setHoveredBuilding,
  tickBuildingControl
} from './game/buildingState.js';
```

Remove:

```js
import { createUiBindings, renderSelectedBuilding, setControlButtonEnabled, setStatus } from './game/ui.js';
```

Replace with:

```js
import { createUiBindings, renderSelectedBuilding, setStatus } from './game/ui.js';
```

- [ ] **Step 2: Update rendering and frame logic**

In `renderInteractionState(...)`, remove:

```js
  setControlButtonEnabled(ui, Boolean(selectedBuilding) && selectedBuilding.control < 100);
```

In the animation frame, replace the old selected-building logic with:

```js
      tickBuildingControl(state, deltaSeconds);
      renderInteractionState(renderer, image, state);
```

- [ ] **Step 3: Remove the old button handler**

Delete this block from `init()`:

```js
    ui.increaseControlButton.addEventListener('click', () => {
      const selectedBuilding = getSelectedBuilding(state);
      if (!selectedBuilding || selectedBuilding.control >= 100) {
        return;
      }

      state.controlIncreasing = true;
    });
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Run the dev server and verify passive growth manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- there is no `Increase Control` button
- buildings with `0` assigned delinquents do not gain control
- assigning delinquents to a building makes that building's control increase over time
- two buildings can gain control at the same time if both have delinquents assigned
- a building with more assigned delinquents gains control faster than one with fewer
- each building's control caps at `100`

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: make building control passive"
```
