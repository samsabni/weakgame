# Delinquent Reachability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict delinquent assignment so players can only add delinquents to buildings within 2 hops of controlled or running territory, using a startup neighbor graph built from building proximity.

**Architecture:** Build a static map neighbor graph once from building bounds, then derive dynamic reachability from current `control` / `isRunning` state. Keep assignment enforcement in the delinquent manager and surface the restriction in the existing selected-building HUD by disabling `+` with a short reason when the selected building is out of reach.

**Tech Stack:** Vite, plain JavaScript modules, HTML HUD, Vitest

---

## File Responsibilities

- `src/game/buildingDetector.js`
  - derive neighbor ids for each building from bound-to-bound gap thresholds during startup detection
- `src/game/buildingState.js`
  - expose a reachability helper based on 2-hop expansion from controlled or running buildings
- `src/game/delinquentManager.js`
  - enforce reachability in `assignDelinquentToSelectedBuilding(...)`
- `src/game/ui.js`
  - disable `+` and show the reachability reason in the selected-building panel
- `index.html`
  - add a small text node for the assignment-block reason
- `tests/buildingDetector.test.js`
  - cover startup neighbor graph generation from building gaps
- `tests/buildingState.test.js`
  - cover 2-hop reachability from controlled or running territory
- `tests/delinquentManager.test.js`
  - cover blocked assignment to unreachable buildings
- `tests/ui.test.js`
  - cover the disabled `+` state and reason text

### Task 1: Add Failing Graph And Reachability Tests

**Files:**
- Modify: `tests/buildingDetector.test.js`
- Modify: `tests/buildingState.test.js`

- [ ] **Step 1: Write the failing detector test for neighbor graph generation**

```js
it('connects buildings as neighbors when their bounds are within the adjacency gap threshold', () => {
  const buildings = [
    {
      id: 'building-1',
      bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 }
    },
    {
      id: 'building-2',
      bounds: { minX: 6, minY: 0, maxX: 8, maxY: 2 }
    },
    {
      id: 'building-3',
      bounds: { minX: 30, minY: 0, maxX: 32, maxY: 2 }
    }
  ];

  addBuildingNeighbors(buildings, 4);

  expect(buildings[0].neighborIds).toEqual(['building-2']);
  expect(buildings[1].neighborIds).toEqual(['building-1']);
  expect(buildings[2].neighborIds).toEqual([]);
});
```

- [ ] **Step 2: Write the failing state tests for 2-hop reachability**

```js
import { getReachableBuildingIds } from '../src/game/buildingState.js';

it('marks buildings reachable within two hops of controlled or running territory', () => {
  const buildings = [
    createBuilding('building-1', 20, 1, { neighborIds: ['building-2'] }),
    createBuilding('building-2', 0, 0, { neighborIds: ['building-1', 'building-3'] }),
    createBuilding('building-3', 0, 0, { neighborIds: ['building-2', 'building-4'] }),
    createBuilding('building-4', 0, 0, { neighborIds: ['building-3'] })
  ];
  const state = createInitialState(buildings);

  expect(getReachableBuildingIds(state)).toEqual(new Set([
    'building-1',
    'building-2',
    'building-3'
  ]));
});
```

- [ ] **Step 3: Run the targeted tests to verify they fail**

Run: `npm test -- tests/buildingDetector.test.js tests/buildingState.test.js`
Expected: FAIL with missing exports like `addBuildingNeighbors` / `getReachableBuildingIds`.

### Task 2: Implement Neighbor Graph And Reachability

**Files:**
- Modify: `src/game/buildingDetector.js`
- Modify: `src/game/buildingState.js`

- [ ] **Step 1: Implement bound-gap neighbor graph generation in the detector**

```js
export function getBoundsGap(leftBounds, rightBounds) {
  const horizontalGap = Math.max(0, Math.max(leftBounds.minX - rightBounds.maxX, rightBounds.minX - leftBounds.maxX));
  const verticalGap = Math.max(0, Math.max(leftBounds.minY - rightBounds.maxY, rightBounds.minY - leftBounds.maxY));
  return Math.max(horizontalGap, verticalGap);
}

export function addBuildingNeighbors(buildings, maxGap) {
  for (const building of buildings) {
    building.neighborIds = [];
  }

  for (let index = 0; index < buildings.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < buildings.length; compareIndex += 1) {
      if (getBoundsGap(buildings[index].bounds, buildings[compareIndex].bounds) > maxGap) {
        continue;
      }

      buildings[index].neighborIds.push(buildings[compareIndex].id);
      buildings[compareIndex].neighborIds.push(buildings[index].id);
    }
  }
}
```

- [ ] **Step 2: Apply neighbor graph generation during startup detection**

```js
const ADJACENCY_GAP_THRESHOLD = 4;

export function detectBuildingsFromImageData(imageData) {
  // existing detection work...
  addBuildingNeighbors(buildings, ADJACENCY_GAP_THRESHOLD);
  return { buildings, regionMap };
}
```

- [ ] **Step 3: Implement dynamic reachability from controlled/running buildings**

```js
export function getReachableBuildingIds(state) {
  const reachableIds = new Set();
  const queue = [];

  for (const building of state.buildings) {
    if (building.control > 0 || building.isRunning) {
      queue.push({ id: building.id, depth: 0 });
      reachableIds.add(building.id);
    }
  }

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= 2) {
      continue;
    }

    const building = state.buildings.find((entry) => entry.id === id);
    for (const neighborId of building.neighborIds ?? []) {
      if (reachableIds.has(neighborId)) {
        continue;
      }

      reachableIds.add(neighborId);
      queue.push({ id: neighborId, depth: depth + 1 });
    }
  }

  return reachableIds;
}

export function canAssignToSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding) {
    return false;
  }

  return getReachableBuildingIds(state).has(selectedBuilding.id);
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/buildingDetector.test.js tests/buildingState.test.js`
Expected: PASS

### Task 3: Enforce Reachability In Assignment And UI

**Files:**
- Modify: `src/game/delinquentManager.js`
- Modify: `src/game/ui.js`
- Modify: `index.html`
- Modify: `tests/delinquentManager.test.js`
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Write the failing delinquent-manager and UI tests**

```js
it('does not assign a delinquent to an unreachable selected building', () => {
  const state = {
    playerIdleDelinquents: 4,
    selectedBuildingId: 'building-2',
    buildings: [
      { id: 'building-1', control: 20, isRunning: false, neighborIds: [], playerAssignedDelinquents: 1 },
      { id: 'building-2', control: 0, isRunning: false, neighborIds: [], playerAssignedDelinquents: 0 }
    ]
  };

  expect(assignDelinquentToSelectedBuilding(state)).toBe(false);
  expect(state.playerIdleDelinquents).toBe(4);
  expect(state.buildings[1].playerAssignedDelinquents).toBe(0);
});
```

```js
it('disables + and shows a reachability reason when the selected building is too far away', () => {
  const ui = createUi();
  ui.assignDelinquentButton = { disabled: false };
  ui.assignmentReason = createTextNode();
  const state = {
    playerIdleDelinquents: 7,
    cash: 1200,
    influence: 9,
    buildings: [],
    reachableBuildingIds: new Set()
  };

  renderSelectedBuilding(ui, state, {
    id: 'building-4',
    owner: 'neutral',
    control: 0,
    playerAssignedDelinquents: 0,
    isRunning: false
  });

  expect(ui.assignDelinquentButton.disabled).toBe(true);
  expect(ui.assignmentReason.textContent).toBe('Too far from your current territory');
});
```

- [ ] **Step 2: Enforce reachability in `assignDelinquentToSelectedBuilding(...)`**

```js
import { canAssignToSelectedBuilding } from './buildingState.js';

export function assignDelinquentToSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding || state.playerIdleDelinquents <= 0 || !canAssignToSelectedBuilding(state)) {
    return false;
  }

  state.playerIdleDelinquents -= 1;
  selectedBuilding.playerAssignedDelinquents += 1;
  return true;
}
```

- [ ] **Step 3: Add the UI reason node and selected-building rendering logic**

```html
<p id="assignment-reason" hidden></p>
```

```js
assignmentReason: document.querySelector('#assignment-reason')
```

```js
const assignable = canAssignToSelectedBuilding(state);
ui.assignDelinquentButton.disabled = !assignable || state.playerIdleDelinquents <= 0;
ui.assignmentReason.hidden = assignable;
if (!assignable) {
  setTextIfChanged(ui.assignmentReason, 'Too far from your current territory');
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/delinquentManager.test.js tests/ui.test.js`
Expected: PASS

### Task 4: Full Verification

**Files:**
- Modify: `src/main.js` only if a small wiring update is needed for UI refreshes after reachability changes

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS with detector, state, delinquent-manager, renderer, running-building, and UI suites all green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: If needed, make the smallest wiring adjustment and re-run verification**

```js
renderSelectedBuilding(ui, state, getSelectedBuilding(state));
```

Use this only if the selected-building panel is not refreshing after control/running-state changes that affect reachability.

## Self-Review Checklist

- Spec coverage:
  - static neighbor graph from bounds: Task 1 + Task 2
  - fixed gap threshold: Task 2
  - 2-hop reachability from controlled or running buildings: Task 1 + Task 2
  - `+` blocked on unreachable buildings: Task 3
  - clickable inspection still allowed: preserved by leaving selection logic unchanged
  - UI reason text: Task 3
- Placeholder scan:
  - no `TODO` / `TBD`
- Type consistency:
  - `addBuildingNeighbors`, `getBoundsGap`, `getReachableBuildingIds`, and `canAssignToSelectedBuilding` are used consistently across implementation and tests
