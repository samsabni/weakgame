# Control Cap And Decay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each building's control move toward a delinquent-based cap, where every assigned delinquent adds `20%` cap and above-cap control decays gradually at `2.5x` the building-specific growth basis.

**Architecture:** Keep the delinquent manager responsible only for assignment counts and move the cap and decay rule into the control state logic. The state layer will derive each building's control cap from its current assigned delinquent count and update each building toward that cap every frame without overshooting.

**Tech Stack:** Vite, plain JavaScript, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `src/game/buildingState.js`
- Modify: `tests/buildingState.test.js`

### Task 1: Replace Control Tests With Cap-And-Decay Tests

**Files:**
- Modify: `tests/buildingState.test.js`
- Modify: `src/game/buildingState.js`

- [ ] **Step 1: Expand the building state tests with cap and decay behavior**

Update `tests/buildingState.test.js` imports:

```js
import {
  clearSelection,
  createInitialState,
  getBuildingControlCap,
  getSelectedBuilding,
  selectBuilding,
  setHoveredBuilding,
  tickBuildingControl
} from '../src/game/buildingState.js';
```

Add these test cases:

```js
  it('derives control cap from assigned delinquents in 20 percent steps', () => {
    expect(getBuildingControlCap({ playerAssignedDelinquents: 0 })).toBe(0);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 1 })).toBe(20);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 3 })).toBe(60);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 8 })).toBe(100);
  });

  it('stops growth at the current derived cap', () => {
    const state = createInitialState([
      createBuilding('building-1', 19, 1),
      createBuilding('building-2', 38, 2)
    ]);

    tickBuildingControl(state, 3);

    expect(state.buildings[0].control).toBe(20);
    expect(state.buildings[1].control).toBe(40);
  });

  it('decays above-cap control at 2.5x the per-building growth basis', () => {
    const state = createInitialState([
      createBuilding('building-1', 50, 1),
      createBuilding('building-2', 80, 2)
    ]);

    tickBuildingControl(state, 4);

    expect(state.buildings[0].control).toBe(40);
    expect(state.buildings[1].control).toBe(60);
  });

  it('decays zero-assigned buildings toward zero using the minimum decay basis', () => {
    const state = createInitialState([
      createBuilding('building-1', 10, 0)
    ]);

    tickBuildingControl(state, 2);

    expect(state.buildings[0].control).toBe(5);
  });

  it('never overshoots below the cap while decaying', () => {
    const state = createInitialState([
      createBuilding('building-1', 22, 1)
    ]);

    tickBuildingControl(state, 2);

    expect(state.buildings[0].control).toBe(20);
  });
```

- [ ] **Step 2: Run the state tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js`
Expected: FAIL because the cap helper does not exist and the current tick logic only grows toward `100`

- [ ] **Step 3: Implement the cap helper and cap-aware control ticking**

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

export function getBuildingControlCap(building) {
  return Math.min(100, building.playerAssignedDelinquents * 20);
}

export function tickBuildingControl(state, amountPerAssignedDelinquent) {
  let changed = false;

  for (const building of state.buildings) {
    const cap = getBuildingControlCap(building);

    if (building.control < cap) {
      const increase = amountPerAssignedDelinquent * building.playerAssignedDelinquents;
      const nextControl = Math.min(cap, building.control + increase);

      if (nextControl !== building.control) {
        building.control = nextControl;
        changed = true;
      }

      continue;
    }

    if (building.control > cap) {
      const decayBasis = Math.max(1, building.playerAssignedDelinquents);
      const decrease = amountPerAssignedDelinquent * decayBasis * 2.5;
      const nextControl = Math.max(cap, building.control - decrease);

      if (nextControl !== building.control) {
        building.control = nextControl;
        changed = true;
      }
    }
  }

  return changed;
}
```

- [ ] **Step 4: Run the state tests again**

Run: `npm test -- tests/buildingState.test.js`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/buildingState.js tests/buildingState.test.js
git commit -m "feat: cap control by assigned delinquents"
```
