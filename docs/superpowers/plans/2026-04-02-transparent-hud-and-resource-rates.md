# Transparent HUD And Resource Rates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the left HUD panel background and append live per-second cash and influence rates to the HUD text.

**Architecture:** Keep the live rate calculations in the state layer so UI rendering stays dumb and deterministic. Update the HUD renderer to append one-decimal `(+X.X/s)` suffixes for cash and influence, and restyle the sidebar as transparent overlay text while leaving buttons visually interactive.

**Tech Stack:** Vite, plain JavaScript modules, HTML/CSS HUD, Vitest

---

## File Responsibilities

- `src/game/buildingState.js`
  - expose helpers for current passive cash and influence rates
- `src/game/ui.js`
  - format the `Cash` and `Influence` strings with one-decimal `/s` suffixes
- `src/style.css`
  - remove the sidebar background treatment and switch text to the dark readable tone
- `tests/buildingState.test.js`
  - cover live passive-rate helpers
- `tests/ui.test.js`
  - cover the updated HUD text format

### Task 1: Add Failing Rate Tests

**Files:**
- Modify: `tests/buildingState.test.js`
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Add the failing state and UI expectations**

```js
import {
  getPassiveCashRate,
  getPassiveInfluenceRate
} from '../src/game/buildingState.js';

it('derives the live passive cash rate from controlled non-running buildings', () => {
  const state = createInitialState([
    createBuilding('building-1', 10, 1),
    createBuilding('building-2', 60, 6),
    createBuilding('building-3', 100, 10, { isRunning: true })
  ]);

  expect(getPassiveCashRate(state)).toBe(3.5);
  expect(getPassiveInfluenceRate(state)).toBe(1);
});
```

```js
it('renders global cash and influence with one-decimal live rates', () => {
  const ui = createUi();
  const state = {
    playerIdleDelinquents: 7,
    cash: 1200,
    influence: 9,
    buildings: [
      { control: 10, isRunning: false },
      { control: 60, isRunning: false },
      { control: 100, isRunning: true }
    ]
  };

  renderSelectedBuilding(ui, state, null);

  expect(ui.cash.textContent).toBe('Cash: 1200 (+3.5/s)');
  expect(ui.influence.textContent).toBe('Influence: 9 (+1.0/s)');
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js tests/ui.test.js`
Expected: FAIL with missing exports or old HUD text without the rate suffixes.

- [ ] **Step 3: Commit the failing-test checkpoint if working in git**

```bash
git add tests/buildingState.test.js tests/ui.test.js
git commit -m "test: cover transparent hud resource rates"
```

### Task 2: Implement Live Rate Helpers And HUD Text

**Files:**
- Modify: `src/game/buildingState.js`
- Modify: `src/game/ui.js`

- [ ] **Step 1: Implement the passive-rate helpers in state**

```js
export function getPassiveCashRate(state) {
  return state.buildings.reduce((sum, building) => {
    if (building.isRunning || building.control <= 0) {
      return sum;
    }

    return sum + (5 * (building.control / 100));
  }, 0);
}

export function getPassiveInfluenceRate(state) {
  return state.buildings.filter((building) => building.isRunning).length;
}
```

- [ ] **Step 2: Use the helpers in the HUD renderer with one-decimal formatting**

```js
import {
  getPassiveCashRate,
  getPassiveInfluenceRate
} from './buildingState.js';

function formatRate(rate) {
  return rate.toFixed(1);
}

export function renderSelectedBuilding(ui, state, building) {
  setTextIfChanged(ui.idleDelinquents, `Idle Delinquents: ${state.playerIdleDelinquents}`);
  setTextIfChanged(ui.cash, `Cash: ${state.cash} (+${formatRate(getPassiveCashRate(state))}/s)`);
  setTextIfChanged(
    ui.influence,
    `Influence: ${state.influence} (+${formatRate(getPassiveInfluenceRate(state))}/s)`
  );

  // keep the existing selected-building rendering below
}
```

- [ ] **Step 3: Run the targeted tests to verify they pass**

Run: `npm test -- tests/buildingState.test.js tests/ui.test.js`
Expected: PASS

- [ ] **Step 4: Commit the state and HUD text change if working in git**

```bash
git add src/game/buildingState.js src/game/ui.js tests/buildingState.test.js tests/ui.test.js
git commit -m "feat: show live passive resource rates"
```

### Task 3: Restyle The HUD As Transparent Overlay Text

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Remove the panel background treatment and switch text to the dark readable tone**

```css
:root {
  color: #241f17;
}

.sidebar {
  background: transparent;
  border: 0;
  backdrop-filter: none;
  color: #241f17;
}
```

- [ ] **Step 2: Keep buttons legible while the panel becomes transparent**

```css
button {
  color: #f5efe2;
  background: #5f6f4d;
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit the HUD styling change if working in git**

```bash
git add src/style.css
git commit -m "style: make hud transparent"
```

## Self-Review Checklist

- Spec coverage:
  - transparent HUD: Task 3
  - dark readable HUD text: Task 3
  - one-decimal `Cash` and `Influence` live rates: Task 1 + Task 2
  - passive logic unchanged: Task 2 uses informational helpers only
- Placeholder scan:
  - no `TODO` / `TBD`
- Type consistency:
  - `getPassiveCashRate` and `getPassiveInfluenceRate` are used consistently across state, UI, and tests
