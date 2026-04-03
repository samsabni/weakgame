# One-Hop Delinquent Frontier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change delinquent assignment reachability so expansion only works through direct neighboring buildings with no two-hop skipping.

**Architecture:** Keep the existing static neighbor graph, but replace the current two-hop BFS reachability with a strict one-hop frontier derived from currently controlled or running buildings. Update regression tests first, then make the smallest state-layer change so assignment and UI inherit the tighter rule automatically.

**Tech Stack:** Vite, plain JavaScript, Vitest

---

### Task 1: Lock The New One-Hop Rule In Tests

**Files:**
- Modify: `tests/buildingState.test.js`
- Modify: `tests/delinquentManager.test.js`
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Write the failing state test**

```js
it('marks only direct neighbors reachable from controlled or running territory', () => {
  const state = createInitialState([
    createBuilding('building-1', 20, 1, { neighborIds: ['building-2'] }),
    createBuilding('building-2', 0, 0, { neighborIds: ['building-1', 'building-3'] }),
    createBuilding('building-3', 0, 0, { neighborIds: ['building-2', 'building-4'] }),
    createBuilding('building-4', 0, 0, { neighborIds: ['building-3'] })
  ]);

  expect(getReachableBuildingIds(state)).toEqual(new Set([
    'building-1',
    'building-2'
  ]));
});
```

- [ ] **Step 2: Write the failing assignment regression test**

```js
it('does not assign a delinquent to a second-hop selected building', () => {
  const state = {
    playerIdleDelinquents: 4,
    selectedBuildingId: 'building-3',
    buildings: [
      {
        id: 'building-1',
        control: 20,
        isRunning: false,
        neighborIds: ['building-2'],
        playerAssignedDelinquents: 1
      },
      {
        id: 'building-2',
        control: 0,
        isRunning: false,
        neighborIds: ['building-1', 'building-3'],
        playerAssignedDelinquents: 0
      },
      {
        id: 'building-3',
        control: 0,
        isRunning: false,
        neighborIds: ['building-2'],
        playerAssignedDelinquents: 0
      }
    ]
  };

  expect(assignDelinquentToSelectedBuilding(state)).toBe(false);
});
```

- [ ] **Step 3: Write the failing UI regression test**

```js
it('disables + for a selected building that is two hops away', () => {
  const ui = createUi();
  const state = {
    playerIdleDelinquents: 7,
    cash: 1200,
    influence: 9,
    buildings: [
      { id: 'building-1', control: 20, isRunning: false, neighborIds: ['building-2'] },
      { id: 'building-2', control: 0, isRunning: false, neighborIds: ['building-1', 'building-3'] },
      { id: 'building-3', control: 0, isRunning: false, neighborIds: ['building-2'] }
    ]
  };

  renderSelectedBuilding(ui, state, {
    id: 'building-3',
    owner: 'neutral',
    control: 0,
    playerAssignedDelinquents: 0,
    isRunning: false
  });

  expect(ui.assignDelinquentButton.disabled).toBe(true);
  expect(ui.assignmentReason.hidden).toBe(false);
  expect(ui.assignmentReason.textContent).toBe('Too far from your current territory');
});
```

- [ ] **Step 4: Run the targeted tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js tests/delinquentManager.test.js tests/ui.test.js`

Expected: at least the new one-hop expectations fail because current reachability still allows second-hop buildings.

### Task 2: Implement The One-Hop Frontier

**Files:**
- Modify: `src/game/buildingState.js`
- Test: `tests/buildingState.test.js`
- Test: `tests/delinquentManager.test.js`
- Test: `tests/ui.test.js`

- [ ] **Step 1: Replace the two-hop BFS with direct-neighbor reachability**

```js
export function getReachableBuildingIds(state) {
  const reachableIds = new Set();

  for (const building of state.buildings) {
    if (!(building.control > 0 || building.isRunning)) {
      continue;
    }

    reachableIds.add(building.id);

    for (const neighborId of building.neighborIds ?? []) {
      reachableIds.add(neighborId);
    }
  }

  return reachableIds;
}
```

- [ ] **Step 2: Keep assignment and UI behavior unchanged on top of the new rule**

```js
export function canAssignToSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding) {
    return false;
  }

  return getReachableBuildingIds(state).has(selectedBuilding.id);
}
```

No other rule changes are needed because `assignDelinquentToSelectedBuilding(...)` and `renderSelectedBuilding(...)` already consume `canAssignToSelectedBuilding(state)`.

- [ ] **Step 3: Run the targeted tests to verify they pass**

Run: `npm test -- tests/buildingState.test.js tests/delinquentManager.test.js tests/ui.test.js`

Expected: PASS

### Task 3: Full Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-04-01-building-interaction-design.md`
- Modify: `docs/superpowers/plans/2026-04-02-one-hop-delinquent-frontier.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: build succeeds with exit code 0

- [ ] **Step 3: Record the outcome**

Because `/Users/sammie/Desktop/Made/Weak` is not a git repository, skip commit steps and report the verified results directly.
