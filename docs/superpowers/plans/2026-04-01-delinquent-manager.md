# Delinquent Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the current map interaction system with a global idle delinquent pool and per-building delinquent assignment controls for the currently selected building.

**Architecture:** Keep the existing building selection flow intact and add a separate delinquent manager module to own idle/assigned counter updates. The app state will hold the global idle count, each building will hold its assigned count, and the selected-building UI will render idle and assigned values while exposing `+` and `-` controls only when a building is selected.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `index.html`
- Modify: `src/game/buildingDetector.js`
- Modify: `src/game/buildingState.js`
- Create: `src/game/delinquentManager.js`
- Modify: `src/game/ui.js`
- Modify: `src/main.js`
- Create: `tests/delinquentManager.test.js`
- Modify: `tests/buildingState.test.js`
- Modify: `tests/buildingDetector.test.js`

### Task 1: Add Building And Global Delinquent State

**Files:**
- Modify: `src/game/buildingDetector.js`
- Modify: `src/game/buildingState.js`
- Modify: `tests/buildingDetector.test.js`
- Modify: `tests/buildingState.test.js`

- [ ] **Step 1: Extend the building detector test with assigned delinquent defaults**

Update `tests/buildingDetector.test.js` in the region detection test:

```js
    expect(buildings[0]).toMatchObject({
      id: 'building-1',
      control: 0,
      owner: 'neutral',
      playerAssignedDelinquents: 0
    });
    expect(buildings[1]).toMatchObject({
      id: 'building-2',
      control: 0,
      owner: 'neutral',
      playerAssignedDelinquents: 0
    });
```

- [ ] **Step 2: Extend the state test with the global idle delinquent default**

Update `tests/buildingState.test.js` in the default interaction state test:

```js
    expect(state.playerIdleDelinquents).toBe(10);
```

Also update the local test building factory:

```js
    playerAssignedDelinquents: 0,
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `npm test -- tests/buildingDetector.test.js tests/buildingState.test.js`
Expected: FAIL because the new delinquent fields do not exist yet

- [ ] **Step 4: Add assigned delinquent defaults to detected buildings**

Update `src/game/buildingDetector.js` in the `buildings.push(...)` object:

```js
      buildings.push({
        id,
        position: {
          x: sumX / pixels.length,
          y: sumY / pixels.length
        },
        control: 0,
        owner: 'neutral',
        playerAssignedDelinquents: 0,
        bounds: { minX, minY, maxX, maxY },
        pixels
      });
```

- [ ] **Step 5: Add the global idle delinquent count to app state**

Update `src/game/buildingState.js`:

```js
export function createInitialState(buildings) {
  return {
    buildings,
    playerIdleDelinquents: 10,
    selectedBuildingId: null,
    hoveredBuildingId: null,
    controlIncreasing: false
  };
}
```

No other behavior changes are needed in this file for this task.

- [ ] **Step 6: Run the focused tests again**

Run: `npm test -- tests/buildingDetector.test.js tests/buildingState.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/buildingDetector.js src/game/buildingState.js tests/buildingDetector.test.js tests/buildingState.test.js
git commit -m "feat: add delinquent counts to building state"
```

### Task 2: Implement The Separate Delinquent Manager With TDD

**Files:**
- Create: `src/game/delinquentManager.js`
- Create: `tests/delinquentManager.test.js`

- [ ] **Step 1: Write the failing delinquent manager tests**

Create `tests/delinquentManager.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  assignDelinquentToSelectedBuilding,
  removeDelinquentFromSelectedBuilding
} from '../src/game/delinquentManager.js';

function createState({
  idle = 10,
  selectedBuildingId = 'building-1',
  assigned = 0
} = {}) {
  return {
    playerIdleDelinquents: idle,
    selectedBuildingId,
    buildings: [
      {
        id: 'building-1',
        playerAssignedDelinquents: assigned
      },
      {
        id: 'building-2',
        playerAssignedDelinquents: 3
      }
    ]
  };
}

describe('delinquentManager', () => {
  it('assigns one idle delinquent to the selected building only', () => {
    const state = createState({ idle: 4, assigned: 1 });

    const changed = assignDelinquentToSelectedBuilding(state);

    expect(changed).toBe(true);
    expect(state.playerIdleDelinquents).toBe(3);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(2);
    expect(state.buildings[1].playerAssignedDelinquents).toBe(3);
  });

  it('does nothing when no building is selected', () => {
    const state = createState({ selectedBuildingId: null, idle: 4, assigned: 1 });

    const changed = assignDelinquentToSelectedBuilding(state);

    expect(changed).toBe(false);
    expect(state.playerIdleDelinquents).toBe(4);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(1);
  });

  it('does nothing when there are no idle delinquents', () => {
    const state = createState({ idle: 0, assigned: 1 });

    const changed = assignDelinquentToSelectedBuilding(state);

    expect(changed).toBe(false);
    expect(state.playerIdleDelinquents).toBe(0);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(1);
  });

  it('returns one delinquent from the selected building to idle', () => {
    const state = createState({ idle: 2, assigned: 4 });

    const changed = removeDelinquentFromSelectedBuilding(state);

    expect(changed).toBe(true);
    expect(state.playerIdleDelinquents).toBe(3);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(3);
  });

  it('does nothing when the selected building has no assigned delinquents', () => {
    const state = createState({ idle: 2, assigned: 0 });

    const changed = removeDelinquentFromSelectedBuilding(state);

    expect(changed).toBe(false);
    expect(state.playerIdleDelinquents).toBe(2);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(0);
  });
});
```

- [ ] **Step 2: Run the delinquent manager tests to verify they fail**

Run: `npm test -- tests/delinquentManager.test.js`
Expected: FAIL with module not found for `src/game/delinquentManager.js`

- [ ] **Step 3: Implement the delinquent manager**

Create `src/game/delinquentManager.js`:

```js
function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function assignDelinquentToSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding || state.playerIdleDelinquents <= 0) {
    return false;
  }

  state.playerIdleDelinquents -= 1;
  selectedBuilding.playerAssignedDelinquents += 1;
  return true;
}

export function removeDelinquentFromSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding || selectedBuilding.playerAssignedDelinquents <= 0) {
    return false;
  }

  selectedBuilding.playerAssignedDelinquents -= 1;
  state.playerIdleDelinquents += 1;
  return true;
}
```

- [ ] **Step 4: Run the delinquent manager tests**

Run: `npm test -- tests/delinquentManager.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/delinquentManager.js tests/delinquentManager.test.js
git commit -m "feat: add delinquent assignment manager"
```

### Task 3: Add Idle And Assigned Delinquent UI

**Files:**
- Modify: `index.html`
- Modify: `src/game/ui.js`

- [ ] **Step 1: Add the delinquent UI placeholders to the panel**

Update `index.html` inside the sidebar panel:

```html
        <section id="building-panel" class="panel">
          <p class="panel-label">Selected Building</p>
          <p id="idle-delinquents">Idle Delinquents: 0</p>
          <p id="building-id">None</p>
          <p id="building-owner">Owner: -</p>
          <p id="building-control">Control: -</p>
          <p id="building-assigned-delinquents" hidden>Assigned Delinquents: -</p>
          <div id="delinquent-controls" hidden>
            <button id="assign-delinquent" type="button">+</button>
            <button id="remove-delinquent" type="button">-</button>
          </div>
        </section>
```

- [ ] **Step 2: Extend UI bindings and rendering helpers**

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
    increaseControlButton: document.querySelector('#increase-control'),
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

export function setControlButtonEnabled(ui, enabled) {
  ui.increaseControlButton.disabled = !enabled;
}
```

- [ ] **Step 3: Run the build to catch UI wiring errors early**

Run: `npm run build`
Expected: build may fail until `main.js` is updated to pass `state` into `renderSelectedBuilding`

- [ ] **Step 4: Commit**

```bash
git add index.html src/game/ui.js
git commit -m "feat: add delinquent counts to building panel"
```

### Task 4: Wire The Delinquent Manager Into The App

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Import the delinquent manager and pass full state into UI rendering**

Update `src/main.js` imports and render call:

```js
import {
  assignDelinquentToSelectedBuilding,
  removeDelinquentFromSelectedBuilding
} from './game/delinquentManager.js';
```

In `renderInteractionState(...)`:

```js
  renderSelectedBuilding(ui, state, selectedBuilding);
```

- [ ] **Step 2: Add delinquent button event handlers**

Update `src/main.js` inside `init()` after the existing `Increase Control` handler:

```js
    ui.assignDelinquentButton.addEventListener('click', () => {
      if (assignDelinquentToSelectedBuilding(state)) {
        renderInteractionState(renderer, image, state);
      }
    });

    ui.removeDelinquentButton.addEventListener('click', () => {
      if (removeDelinquentFromSelectedBuilding(state)) {
        renderInteractionState(renderer, image, state);
      }
    });
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Run the dev server and verify the delinquent UI manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- `Idle Delinquents: 10` always shows
- with no selected building, assigned delinquent text and `+` / `-` controls are hidden
- selecting a building shows `Assigned Delinquents: 0`
- pressing `+` decreases idle by `1` and increases assigned on the selected building by `1`
- pressing `-` decreases assigned on the selected building by `1` and increases idle by `1`
- assigning delinquents only affects the selected building
- neither counter goes below `0`

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: wire delinquent manager into selected building ui"
```
