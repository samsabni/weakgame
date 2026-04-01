# Passive Resources And Debug Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add passive cash and influence generation, a derived cash cap, and a hidden debug menu for global `cash`, `influence`, and `idle delinquents`.

**Architecture:** Keep passive resource rules in the existing state tick so control, running-state loss, and resource generation stay synchronized. Extend the HUD with always-visible `Cash` and `Influence` plus a hidden-by-default debug overlay, and keep direct debug mutations as narrow global-state helpers.

**Tech Stack:** Vite, plain JavaScript modules, layered HTML canvas rendering, Vitest

---

## File Responsibilities

- `src/game/buildingState.js`
  - extend initial global state with `influence`
  - derive the cash cap from running buildings
  - add passive per-second resource accumulation helpers
  - expose tiny debug mutation helpers for `cash`, `influence`, and `playerIdleDelinquents`
- `src/main.js`
  - drive a 1-second passive resource tick alongside the existing frame loop
  - refresh the HUD when control, resources, or debug mutations change
  - wire the debug toggle and debug buttons
- `src/game/ui.js`
  - bind the new `Influence` and debug elements
  - render `cash`, `influence`, and debug visibility state efficiently
- `index.html`
  - add always-visible `Influence`
  - add the small debug toggle and hidden debug panel with `+` / `-` controls
- `src/style.css`
  - style the debug toggle/panel as a compact overlay that does not disturb map centering
- `tests/buildingState.test.js`
  - cover passive cash generation, rounding, cap clamping, influence gain, and debug helpers

### Task 1: Add Passive Resource Tests First

**Files:**
- Modify: `tests/buildingState.test.js`
- Modify: `src/game/buildingState.js`

- [ ] **Step 1: Write the failing tests for passive resources and debug helpers**

```js
import {
  adjustCash,
  adjustInfluence,
  adjustPlayerIdleDelinquents,
  createInitialState,
  getCashCap,
  tickPassiveResources
} from '../src/game/buildingState.js';

it('starts with zero cash and zero influence', () => {
  const state = createInitialState([createBuilding('building-1')]);

  expect(state.cash).toBe(0);
  expect(state.influence).toBe(0);
});

it('derives cash cap from running buildings', () => {
  expect(getCashCap([])).toBe(2000);
  expect(getCashCap([
    { isRunning: true },
    { isRunning: false },
    { isRunning: true }
  ])).toBe(6000);
});

it('adds rounded passive cash from controlled non-running buildings once per second', () => {
  const state = createInitialState([
    createBuilding('building-1', 10, 1),
    createBuilding('building-2', 60, 6),
    createBuilding('building-3', 100, 10)
  ]);
  state.buildings[2].isRunning = true;

  const changed = tickPassiveResources(state);

  expect(changed).toBe(true);
  expect(state.cash).toBe(4);
  expect(state.influence).toBe(1);
});

it('clamps passive cash to the current cash cap', () => {
  const state = createInitialState([
    createBuilding('building-1', 100, 10)
  ]);
  state.cash = 1998;

  tickPassiveResources(state);

  expect(state.cash).toBe(2000);
});

it('does not add passive cash for running or zero-control buildings', () => {
  const state = createInitialState([
    createBuilding('building-1', 0, 0),
    createBuilding('building-2', 100, 10)
  ]);
  state.buildings[1].isRunning = true;

  tickPassiveResources(state);

  expect(state.cash).toBe(0);
  expect(state.influence).toBe(1);
});

it('adjusts debug globals without letting them go below zero', () => {
  const state = createInitialState([createBuilding('building-1')]);

  adjustCash(state, 5);
  adjustInfluence(state, 3);
  adjustPlayerIdleDelinquents(state, -50);

  expect(state.cash).toBe(5);
  expect(state.influence).toBe(3);
  expect(state.playerIdleDelinquents).toBe(0);
});
```

- [ ] **Step 2: Run the targeted test file to verify the new tests fail**

Run: `npm test -- tests/buildingState.test.js`
Expected: FAIL with missing exports like `tickPassiveResources`, `getCashCap`, or wrong initial `cash` / `influence` behavior.

- [ ] **Step 3: Implement the minimal passive resource and debug-helper code**

```js
export function createInitialState(buildings) {
  return {
    buildings,
    playerIdleDelinquents: 10,
    cash: 0,
    influence: 0,
    selectedBuildingId: null,
    hoveredBuildingId: null
  };
}

export function getCashCap(buildings) {
  const runningCount = buildings.filter((building) => building.isRunning).length;
  return 2000 + (runningCount * 2000);
}

export function tickPassiveResources(state) {
  const cashGain = Math.round(
    state.buildings.reduce((sum, building) => {
      if (building.isRunning || building.control <= 0) {
        return sum;
      }

      return sum + (5 * (building.control / 100));
    }, 0)
  );

  const influenceGain = state.buildings.filter((building) => building.isRunning).length;
  const nextCash = Math.min(getCashCap(state.buildings), state.cash + cashGain);
  let changed = false;

  if (nextCash !== state.cash) {
    state.cash = nextCash;
    changed = true;
  }

  if (influenceGain > 0) {
    state.influence += influenceGain;
    changed = true;
  }

  return changed;
}

export function adjustCash(state, amount) {
  state.cash = Math.max(0, state.cash + amount);
}

export function adjustInfluence(state, amount) {
  state.influence = Math.max(0, state.influence + amount);
}

export function adjustPlayerIdleDelinquents(state, amount) {
  state.playerIdleDelinquents = Math.max(0, state.playerIdleDelinquents + amount);
}
```

- [ ] **Step 4: Run the targeted test file to verify it passes**

Run: `npm test -- tests/buildingState.test.js`
Expected: PASS for the new passive-resource and debug-helper tests.

- [ ] **Step 5: Commit the state-layer changes**

```bash
git add tests/buildingState.test.js src/game/buildingState.js
git commit -m "feat: add passive cash and influence state"
```

### Task 2: Add HUD And Debug Controls

**Files:**
- Modify: `index.html`
- Modify: `src/game/ui.js`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing UI tests or add a narrow render-state assertion strategy**

If the repo does not have DOM tests yet, keep this task focused on deterministic `renderSelectedBuilding(...)` behavior by adding assertions in `src/game/ui.js`-adjacent test coverage later. For this task, the implementation should at minimum support these DOM ids and visibility rules:

```html
<p id="influence">Influence: 0</p>
<button id="debug-toggle" type="button">Debug</button>
<section id="debug-panel" hidden>
  <p class="panel-label">Debug</p>
  <div class="debug-row">
    <span>Cash</span>
    <button id="debug-cash-decrease" type="button">-</button>
    <button id="debug-cash-increase" type="button">+</button>
  </div>
  <div class="debug-row">
    <span>Influence</span>
    <button id="debug-influence-decrease" type="button">-</button>
    <button id="debug-influence-increase" type="button">+</button>
  </div>
  <div class="debug-row">
    <span>Idle Delinquents</span>
    <button id="debug-idle-decrease" type="button">-</button>
    <button id="debug-idle-increase" type="button">+</button>
  </div>
</section>
```

- [ ] **Step 2: Implement the new HUD bindings and render logic**

```js
export function createUiBindings() {
  return {
    status: document.querySelector('#status'),
    idleDelinquents: document.querySelector('#idle-delinquents'),
    cash: document.querySelector('#cash'),
    influence: document.querySelector('#influence'),
    buildingId: document.querySelector('#building-id'),
    buildingOwner: document.querySelector('#building-owner'),
    buildingControl: document.querySelector('#building-control'),
    buildingAssignedDelinquents: document.querySelector('#building-assigned-delinquents'),
    delinquentControls: document.querySelector('#delinquent-controls'),
    assignDelinquentButton: document.querySelector('#assign-delinquent'),
    removeDelinquentButton: document.querySelector('#remove-delinquent'),
    runBuildingButton: document.querySelector('#run-building'),
    debugToggle: document.querySelector('#debug-toggle'),
    debugPanel: document.querySelector('#debug-panel'),
    debugCashIncreaseButton: document.querySelector('#debug-cash-increase'),
    debugCashDecreaseButton: document.querySelector('#debug-cash-decrease'),
    debugInfluenceIncreaseButton: document.querySelector('#debug-influence-increase'),
    debugInfluenceDecreaseButton: document.querySelector('#debug-influence-decrease'),
    debugIdleIncreaseButton: document.querySelector('#debug-idle-increase'),
    debugIdleDecreaseButton: document.querySelector('#debug-idle-decrease'),
    mapRoot: document.querySelector('#map-root')
  };
}

export function renderSelectedBuilding(ui, state, building) {
  setTextIfChanged(ui.idleDelinquents, `Idle Delinquents: ${state.playerIdleDelinquents}`);
  setTextIfChanged(ui.cash, `Cash: ${state.cash}`);
  setTextIfChanged(ui.influence, `Influence: ${state.influence}`);

  // keep the existing selected-building rendering logic below
}

export function setDebugPanelOpen(ui, isOpen) {
  ui.debugPanel.hidden = !isOpen;
}
```

- [ ] **Step 3: Style the hidden debug overlay without disturbing the map stage**

```css
.sidebar {
  display: grid;
  gap: 12px;
}

.debug-toggle {
  width: auto;
  padding: 8px 10px;
}

.debug-panel {
  display: grid;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.debug-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.debug-row button {
  width: 40px;
  padding: 8px 0;
}
```

- [ ] **Step 4: Verify the UI still builds and the DOM ids exist**

Run: `npm run build`
Expected: PASS and the built app includes the new debug toggle/panel elements.

- [ ] **Step 5: Commit the HUD and styling changes**

```bash
git add index.html src/game/ui.js src/style.css
git commit -m "feat: add passive resource hud and debug panel"
```

### Task 3: Wire Passive Tick And Debug Actions Into The App Loop

**Files:**
- Modify: `src/main.js`
- Modify: `src/game/ui.js`
- Modify: `src/game/buildingState.js`

- [ ] **Step 1: Write the failing integration expectations into the plan execution notes**

This task depends on the Task 1 exports and Task 2 bindings. The integration should satisfy these runtime rules:

```js
let resourceAccumulator = 0;

function frame(now) {
  const deltaSeconds = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  const controlChanged = tickBuildingControl(state, CONTROL_RATE_PER_SECOND * deltaSeconds);

  resourceAccumulator += deltaSeconds;
  let resourcesChanged = false;
  while (resourceAccumulator >= 1) {
    resourceAccumulator -= 1;
    resourcesChanged = tickPassiveResources(state) || resourcesChanged;
  }

  if (controlChanged) {
    renderer.updateBuildingColors(state.buildings);
  }

  if (controlChanged || resourcesChanged) {
    renderSelectedBuilding(ui, state, getSelectedBuilding(state));
  }

  requestAnimationFrame(frame);
}
```

- [ ] **Step 2: Implement the app-loop resource tick and debug event wiring**

```js
import {
  adjustCash,
  adjustInfluence,
  adjustPlayerIdleDelinquents,
  tickPassiveResources
} from './game/buildingState.js';

let debugPanelOpen = false;
let resourceAccumulator = 0;

ui.debugToggle.addEventListener('click', () => {
  debugPanelOpen = !debugPanelOpen;
  setDebugPanelOpen(ui, debugPanelOpen);
});

function applyDebugChange(changeFn, amount) {
  changeFn(state, amount);
  renderSelectedBuilding(ui, state, getSelectedBuilding(state));
}

ui.debugCashIncreaseButton.addEventListener('click', () => applyDebugChange(adjustCash, 100));
ui.debugCashDecreaseButton.addEventListener('click', () => applyDebugChange(adjustCash, -100));
ui.debugInfluenceIncreaseButton.addEventListener('click', () => applyDebugChange(adjustInfluence, 10));
ui.debugInfluenceDecreaseButton.addEventListener('click', () => applyDebugChange(adjustInfluence, -10));
ui.debugIdleIncreaseButton.addEventListener('click', () => applyDebugChange(adjustPlayerIdleDelinquents, 1));
ui.debugIdleDecreaseButton.addEventListener('click', () => applyDebugChange(adjustPlayerIdleDelinquents, -1));
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS with the expanded `buildingState` suite and no regressions in detector, renderer, delinquent-manager, or running-building behavior.

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit the app-loop integration**

```bash
git add src/main.js src/game/ui.js src/game/buildingState.js
git commit -m "feat: wire passive resources and debug controls"
```

## Self-Review Checklist

- Spec coverage:
  - passive cash generation from controlled non-running buildings: Task 1 + Task 3
  - passive influence from running buildings: Task 1 + Task 3
  - cash cap derived from running buildings: Task 1
  - cash starts at `0` and influence starts at `0`: Task 1
  - always-visible `Cash` / `Influence`: Task 2
  - hidden debug menu with toggle: Task 2 + Task 3
  - debug controls for only `cash`, `influence`, and `idle delinquents`: Task 2 + Task 3
- Placeholder scan:
  - no `TODO` / `TBD`
  - every code-changing step includes concrete code
- Type consistency:
  - `tickPassiveResources`, `getCashCap`, `adjustCash`, `adjustInfluence`, and `adjustPlayerIdleDelinquents` are the names used consistently across tests, state, and `main.js`
