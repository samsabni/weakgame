# Starter Marker And Game Over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the chosen starter building, mark it with a white dot, and trigger an in-page game-over/start-over flow when that starter building drops below 100% control.

**Architecture:** Extend game state with `playerStarterBuildingId` and `gameOver`, keep the starter-building identity separate from running state, and render a persistent starter marker from the stored building centroid. Detect the loss condition from the stored starter building during the frame loop, show a blocking overlay, and reset the run by rebuilding fresh state from the original detected-building snapshot.

**Tech Stack:** Vite, plain JavaScript, Vitest, canvas rendering

---

### Task 1: Lock State And Renderer Behavior In Tests

**Files:**
- Modify: `tests/buildingState.test.js`
- Modify: `tests/mapRenderer.test.js`
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Write the failing state tests**

```js
it('stores the starter building id when the first building is claimed', () => {
  const state = createInitialState([
    createBuilding('building-1'),
    createBuilding('building-2')
  ]);

  claimStarterBuilding(state, 'building-2');

  expect(state.playerStarterBuildingId).toBe('building-2');
});

it('enters game over when the starter building drops below 100 control', () => {
  const state = createInitialState([
    createBuilding('building-1', 99.5, 9, { isRunning: false })
  ]);
  state.playerStarterBuildingId = 'building-1';

  expect(checkStarterBuildingLoss(state)).toBe(true);
  expect(state.gameOver).toBe(true);
});

it('resets the run from the initial building snapshot', () => {
  const initialBuildings = [createBuilding('building-1')];
  const state = createInitialState(initialBuildings);

  claimStarterBuilding(state, 'building-1');
  state.cash = 500;
  state.gameOver = true;
  resetGameState(state, initialBuildings);

  expect(state.needsStarterBuilding).toBe(true);
  expect(state.playerStarterBuildingId).toBe(null);
  expect(state.gameOver).toBe(false);
  expect(state.buildings[0].control).toBe(0);
  expect(state.buildings[0].isRunning).toBe(false);
});
```

- [ ] **Step 2: Write the failing renderer test**

```js
it('paints a white starter marker at the building center', () => {
  const context = createMockContext();

  paintStarterMarker(context, {
    position: { x: 12.5, y: 20.5 }
  });

  expect(context.arcCalls).toEqual([
    { x: 12.5, y: 20.5, radius: 16, startAngle: 0, endAngle: Math.PI * 2 }
  ]);
  expect(context.fillCalls).toEqual(['rgba(255, 255, 255, 1)']);
});
```

- [ ] **Step 3: Write the failing UI test**

```js
it('shows the game-over overlay when the run is lost', () => {
  const ui = createUi();
  const state = {
    playerIdleDelinquents: 10,
    cash: 0,
    influence: 0,
    gameOver: true,
    buildings: []
  };

  renderSelectedBuilding(ui, state, null);

  expect(ui.gameOverOverlay.hidden).toBe(false);
});
```

- [ ] **Step 4: Run the targeted tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js tests/mapRenderer.test.js tests/ui.test.js`

Expected: FAIL because starter id persistence, game-over helpers, reset logic, marker painting, and overlay visibility are not implemented yet.

### Task 2: Implement Starter State And Loss Logic

**Files:**
- Modify: `src/game/buildingState.js`
- Test: `tests/buildingState.test.js`

- [ ] **Step 1: Add starter and game-over fields to initial state**

```js
export function createInitialState(buildings) {
  return {
    buildings,
    playerIdleDelinquents: 10,
    cash: 0,
    influence: 0,
    needsStarterBuilding: true,
    playerStarterBuildingId: null,
    gameOver: false,
    selectedBuildingId: null,
    hoveredBuildingId: null
  };
}
```

- [ ] **Step 2: Store the starter building id during the free opening claim**

```js
export function claimStarterBuilding(state, buildingId) {
  if (!state.needsStarterBuilding) {
    return false;
  }

  const building = getBuildingById(state, buildingId);
  if (!building) {
    return false;
  }

  building.isRunning = true;
  building.playerAssignedDelinquents = 10;
  building.control = 100;
  state.playerStarterBuildingId = buildingId;
  state.selectedBuildingId = buildingId;
  state.needsStarterBuilding = false;
  return true;
}
```

- [ ] **Step 3: Add starter lookup, loss detection, building cloning, and in-place reset helpers**

```js
export function getStarterBuilding(state) {
  return getBuildingById(state, state.playerStarterBuildingId) ?? null;
}

export function checkStarterBuildingLoss(state) {
  if (state.gameOver) {
    return false;
  }

  const starterBuilding = getStarterBuilding(state);
  if (!starterBuilding || starterBuilding.control >= 100) {
    return false;
  }

  state.gameOver = true;
  return true;
}

export function cloneBuildings(buildings) {
  return buildings.map((building) => ({
    ...building,
    position: { ...building.position },
    bounds: { ...building.bounds },
    pixels: building.pixels.map(([x, y]) => [x, y]),
    recolorPixels: (building.recolorPixels ?? building.pixels).map(([x, y]) => [x, y]),
    neighborIds: [...(building.neighborIds ?? [])]
  }));
}

export function resetGameState(state, initialBuildings) {
  const nextState = createInitialState(cloneBuildings(initialBuildings));
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, nextState);
}
```

- [ ] **Step 4: Run the targeted state tests to verify they pass**

Run: `npm test -- tests/buildingState.test.js`

Expected: PASS

### Task 3: Implement Marker Rendering And Game-Over UI

**Files:**
- Modify: `src/game/mapRenderer.js`
- Modify: `src/game/ui.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Test: `tests/mapRenderer.test.js`
- Test: `tests/ui.test.js`

- [ ] **Step 1: Add a starter-marker painter and render it on the overlay after selection**

```js
export function paintStarterMarker(context, building) {
  context.save();
  context.fillStyle = 'rgba(255, 255, 255, 1)';
  context.beginPath();
  context.arc(building.position.x, building.position.y, 16, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSelection(selectedBuilding, starterBuilding) {
  overlayContext.clearRect(0, 0, width, height);

  if (selectedBuilding) {
    overlayContext.fillStyle = 'rgba(255, 231, 153, 0.35)';
    for (const [x, y] of selectedBuilding.pixels) {
      overlayContext.fillRect(x, y, 1, 1);
    }
  }

  if (starterBuilding) {
    paintStarterMarker(overlayContext, starterBuilding);
  }
}
```

- [ ] **Step 2: Add the game-over overlay markup**

```html
<div id="game-over-overlay" class="game-over-overlay" hidden>
  <div class="game-over-card">
    <h2>Game Over</h2>
    <button id="start-over" type="button">Start Over</button>
  </div>
</div>
```

- [ ] **Step 3: Expose overlay bindings and toggle visibility from UI rendering**

```js
export function createUiBindings() {
  return {
    // existing bindings...
    gameOverOverlay: document.querySelector('#game-over-overlay'),
    startOverButton: document.querySelector('#start-over')
  };
}

export function renderSelectedBuilding(ui, state, building) {
  if (ui.gameOverOverlay) {
    ui.gameOverOverlay.hidden = !state.gameOver;
  }

  // existing renderSelectedBuilding body...
}
```

- [ ] **Step 4: Style the blocking overlay**

```css
.game-over-overlay {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: grid;
  place-items: center;
  background: rgba(36, 31, 23, 0.58);
}

.game-over-card {
  display: grid;
  gap: 12px;
  min-width: 220px;
  padding: 24px;
  text-align: center;
  color: #f5efe2;
  background: rgba(36, 31, 23, 0.92);
}
```

- [ ] **Step 5: Run the targeted renderer and UI tests to verify they pass**

Run: `npm test -- tests/mapRenderer.test.js tests/ui.test.js`

Expected: PASS

### Task 4: Wire Main Loop Loss Detection And In-Page Reset

**Files:**
- Modify: `src/main.js`
- Test: `tests/buildingState.test.js`
- Test: `tests/ui.test.js`

- [ ] **Step 1: Build and keep a pristine initial-building snapshot**

```js
const initialBuildings = cloneBuildings(buildings);
const state = createInitialState(cloneBuildings(initialBuildings));
```

- [ ] **Step 2: Keep the starter marker in the overlay and trigger game over from the frame loop**

```js
if (!state.gameOver) {
  const controlChanged = tickBuildingControl(state, CONTROL_RATE_PER_SECOND * deltaSeconds);
  const gameOverChanged = checkStarterBuildingLoss(state);

  if (controlChanged) {
    renderer.updateBuildingColors(state.buildings);
  }

  if (controlChanged || resourcesChanged || gameOverChanged) {
    renderer.drawSelection(getSelectedBuilding(state), getStarterBuilding(state));
    renderSelectedBuilding(ui, state, getSelectedBuilding(state));
  }
}
```

- [ ] **Step 3: Block gameplay input during game over and reset on Start Over**

```js
renderer.element.addEventListener('click', (event) => {
  if (state.gameOver) {
    return;
  }

  // existing click flow...
});

ui.startOverButton.addEventListener('click', () => {
  renderer.drawHover(null, previousHoveredBuilding);
  previousHoveredBuilding = null;
  resetGameState(state, initialBuildings);
  renderer.initializeBuildingColors(state.buildings);
  renderer.drawSelection(null, null);
  renderSelectedBuilding(ui, state, null);
});
```

- [ ] **Step 4: Run the full suite and build**

Run: `npm test`
Expected: all tests pass

Run: `npm run build`
Expected: build succeeds with exit code 0

- [ ] **Step 5: Record the result without git cleanup**

Because `/Users/sammie/Desktop/Made/Weak` is not a git repository, skip commit and branch-integration steps and report the verified result directly.
