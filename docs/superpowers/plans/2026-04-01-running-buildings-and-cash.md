# Running Buildings And Cash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cash, allow fully controlled buildings to be purchased into a running state for `2000`, color running buildings `#854947`, and automatically revoke running status when assigned delinquents drop below `10`.

**Architecture:** Keep selection and delinquent assignment flows intact and extend state with global cash plus per-building running status. Add a narrow purchase helper for `Run Building`, update the control tick to revoke running state when delinquent counts drop below `10`, and let the renderer prioritize running color over control-based color.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `index.html`
- Modify: `src/game/buildingDetector.js`
- Modify: `src/game/buildingState.js`
- Create: `src/game/runningBuildingManager.js`
- Modify: `src/game/mapRenderer.js`
- Modify: `src/game/ui.js`
- Modify: `src/main.js`
- Modify: `tests/buildingDetector.test.js`
- Modify: `tests/buildingState.test.js`
- Create: `tests/runningBuildingManager.test.js`
- Modify: `tests/mapRenderer.test.js`

### Task 1: Add Cash And Running State Defaults

**Files:**
- Modify: `src/game/buildingDetector.js`
- Modify: `src/game/buildingState.js`
- Modify: `tests/buildingDetector.test.js`
- Modify: `tests/buildingState.test.js`

- [ ] **Step 1: Extend the detector and state tests with running defaults**

Update `tests/buildingDetector.test.js` to expect:

```js
    expect(buildings[0]).toMatchObject({
      id: 'building-1',
      control: 0,
      owner: 'neutral',
      playerAssignedDelinquents: 0,
      isRunning: false
    });
```

and the same for `building-2`.

Update `tests/buildingState.test.js`:

```js
    expect(state.cash).toBe(4000);
```

and update the local building factory:

```js
    isRunning: false,
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- tests/buildingDetector.test.js tests/buildingState.test.js`
Expected: FAIL because `isRunning` and `cash` are not initialized yet

- [ ] **Step 3: Add the state defaults**

Update `src/game/buildingDetector.js` inside the detected building object:

```js
        playerAssignedDelinquents: 0,
        isRunning: false,
```

Update `src/game/buildingState.js` inside `createInitialState(...)`:

```js
    playerIdleDelinquents: 10,
    cash: 4000,
```

- [ ] **Step 4: Run the focused tests again**

Run: `npm test -- tests/buildingDetector.test.js tests/buildingState.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/buildingDetector.js src/game/buildingState.js tests/buildingDetector.test.js tests/buildingState.test.js
git commit -m "feat: add cash and running building state"
```

### Task 2: Implement The Running Building Purchase Manager

**Files:**
- Create: `src/game/runningBuildingManager.js`
- Create: `tests/runningBuildingManager.test.js`

- [ ] **Step 1: Write the failing running manager tests**

Create `tests/runningBuildingManager.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { purchaseSelectedRunningBuilding } from '../src/game/runningBuildingManager.js';

function createState({
  cash = 4000,
  selectedBuildingId = 'building-1',
  control = 100,
  assigned = 10,
  isRunning = false
} = {}) {
  return {
    cash,
    selectedBuildingId,
    buildings: [
      {
        id: 'building-1',
        control,
        playerAssignedDelinquents: assigned,
        isRunning
      }
    ]
  };
}

describe('runningBuildingManager', () => {
  it('purchases the selected building when eligible', () => {
    const state = createState();

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(true);
    expect(state.cash).toBe(2000);
    expect(state.buildings[0].isRunning).toBe(true);
  });

  it('does nothing when control is below 100', () => {
    const state = createState({ control: 90 });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
    expect(state.cash).toBe(4000);
    expect(state.buildings[0].isRunning).toBe(false);
  });

  it('does nothing when cash is below 2000', () => {
    const state = createState({ cash: 1500 });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
  });

  it('does nothing when the building is already running', () => {
    const state = createState({ isRunning: true });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
    expect(state.cash).toBe(4000);
  });
});
```

- [ ] **Step 2: Run the running manager tests to verify they fail**

Run: `npm test -- tests/runningBuildingManager.test.js`
Expected: FAIL with module not found for `runningBuildingManager.js`

- [ ] **Step 3: Implement the running manager**

Create `src/game/runningBuildingManager.js`:

```js
function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function purchaseSelectedRunningBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding) {
    return false;
  }

  if (selectedBuilding.isRunning) {
    return false;
  }

  if (selectedBuilding.control < 100) {
    return false;
  }

  if (state.cash < 2000) {
    return false;
  }

  state.cash -= 2000;
  selectedBuilding.isRunning = true;
  return true;
}
```

- [ ] **Step 4: Run the running manager tests**

Run: `npm test -- tests/runningBuildingManager.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/runningBuildingManager.js tests/runningBuildingManager.test.js
git commit -m "feat: add running building purchase manager"
```

### Task 3: Revoke Running State In Control Logic

**Files:**
- Modify: `src/game/buildingState.js`
- Modify: `tests/buildingState.test.js`

- [ ] **Step 1: Add the failing running-revocation state test**

Append to `tests/buildingState.test.js`:

```js
  it('revokes running state when assigned delinquents drop below 10', () => {
    const state = createInitialState([
      createBuilding('building-1', 100, 9)
    ]);
    state.buildings[0].isRunning = true;

    tickBuildingControl(state, 2);

    expect(state.buildings[0].isRunning).toBe(false);
  });
```

- [ ] **Step 2: Run the state tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js`
Expected: FAIL because `tickBuildingControl` does not revoke running state

- [ ] **Step 3: Revoke running state during control updates**

Update `src/game/buildingState.js` near the top of the building loop:

```js
    if (building.isRunning && building.playerAssignedDelinquents < 10) {
      building.isRunning = false;
      changed = true;
    }
```

- [ ] **Step 4: Run the state tests again**

Run: `npm test -- tests/buildingState.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/buildingState.js tests/buildingState.test.js
git commit -m "feat: revoke running buildings below delinquent minimum"
```

### Task 4: Add Running Color Priority To The Renderer

**Files:**
- Modify: `src/game/constants.js`
- Modify: `src/game/mapRenderer.js`
- Modify: `tests/mapRenderer.test.js`

- [ ] **Step 1: Extend the renderer tests with running color behavior**

Update `tests/mapRenderer.test.js` imports:

```js
import {
  CONTROL_TARGET_COLOR,
  getBuildingDisplayColor,
  getControlColor,
  getControlBucket,
  paintBuildingControlColor,
  RUNNING_BUILDING_COLOR,
  updateChangedBuildingColors
} from '../src/game/mapRenderer.js';
```

Add these tests:

```js
  it('exports the configured running color', () => {
    expect(RUNNING_BUILDING_COLOR).toEqual({ r: 133, g: 73, b: 71, a: 255 });
  });

  it('uses the running color when a building is running', () => {
    expect(getBuildingDisplayColor({ control: 40, isRunning: true })).toEqual({
      r: 133,
      g: 73,
      b: 71,
      a: 255
    });
  });
```

- [ ] **Step 2: Run the renderer tests to verify they fail**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: FAIL because running color helpers do not exist yet

- [ ] **Step 3: Implement running color priority**

Update `src/game/constants.js`:

```js
export const RUNNING_BUILDING_COLOR = Object.freeze({
  r: 133,
  g: 73,
  b: 71,
  a: 255
});
```

Update `src/game/mapRenderer.js`:

```js
import {
  BUILDING_ROOF_COLOR,
  CONTROL_TARGET_COLOR,
  HOVER_COLOR,
  RUNNING_BUILDING_COLOR
} from './constants.js';
```

Add:

```js
export function getBuildingDisplayColor(building) {
  if (building.isRunning) {
    return RUNNING_BUILDING_COLOR;
  }

  return getControlColor(building.control);
}
```

Then update `paintBuildingControlColor(...)` to use `getBuildingDisplayColor(building)`.

- [ ] **Step 4: Run the renderer tests**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/constants.js src/game/mapRenderer.js tests/mapRenderer.test.js
git commit -m "feat: render running buildings with override color"
```

### Task 5: Add Cash And Run Building UI

**Files:**
- Modify: `index.html`
- Modify: `src/game/ui.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add cash and run button UI nodes**

Update `index.html`:

```html
            <p id="cash">Cash: 0</p>
```

Place it near `Idle Delinquents`.

Add under the delinquent controls:

```html
            <button id="run-building" type="button" hidden>Run Building</button>
```

- [ ] **Step 2: Extend UI bindings and rendering**

Update `src/game/ui.js`:

```js
    cash: document.querySelector('#cash'),
    runBuildingButton: document.querySelector('#run-building'),
```

Inside `renderSelectedBuilding(...)`, always update cash:

```js
  setTextIfChanged(ui.cash, `Cash: ${state.cash}`);
```

When no building is selected:

```js
    if (!ui.runBuildingButton.hidden) {
      ui.runBuildingButton.hidden = true;
    }
```

When a building is selected:

```js
  if (building.isRunning) {
    if (!ui.runBuildingButton.hidden) {
      ui.runBuildingButton.hidden = true;
    }
  } else {
    if (ui.runBuildingButton.hidden) {
      ui.runBuildingButton.hidden = false;
    }
    ui.runBuildingButton.disabled = building.control < 100 || state.cash < 2000;
  }
```

- [ ] **Step 3: Wire the purchase button into the app**

Update `src/main.js` imports:

```js
import { purchaseSelectedRunningBuilding } from './game/runningBuildingManager.js';
```

Add inside `init()`:

```js
    ui.runBuildingButton.addEventListener('click', () => {
      if (purchaseSelectedRunningBuilding(state)) {
        renderer.updateBuildingColors(state.buildings);
        renderSelectedBuilding(ui, state, getSelectedBuilding(state));
      }
    });
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Run the dev server and verify manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- cash starts at `4000`
- `Run Building` is hidden with no selected building
- at `100%` control and `2000+` cash, a selected non-running building shows enabled `Run Building`
- purchasing subtracts `2000`
- running buildings immediately turn `#854947`
- already running buildings hide the button
- if assigned delinquents drop below `10`, the building loses running status and color immediately
- after losing running status, the button becomes available again based on control and cash

- [ ] **Step 7: Commit**

```bash
git add index.html src/game/ui.js src/main.js
git commit -m "feat: add running buildings and cash ui"
```
