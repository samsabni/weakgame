# Renderer Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore smooth rendering performance by replacing full-frame building repainting with cached incremental roof recoloring while preserving exact `#B57271` at `100%` control.

**Architecture:** Keep control progression and selection state unchanged and refactor the renderer into layered incremental drawing. The map image becomes a static background layer, building roof colors live on a persistent color layer with per-building cached buckets, and hover/selection remain temporary overlays so only buildings whose visible color bucket changed are repainted.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `src/game/mapRenderer.js`
- Modify: `src/main.js`
- Modify: `tests/mapRenderer.test.js`

### Task 1: Add Tests For Cached Incremental Color Updates

**Files:**
- Modify: `tests/mapRenderer.test.js`

- [ ] **Step 1: Extend the renderer test file with bucket and repaint behavior**

Append to `tests/mapRenderer.test.js`:

```js
import { getControlBucket, shouldRepaintBuilding } from '../src/game/mapRenderer.js';
```

Add these test cases:

```js
  it('maps 100 control to the exact final bucket', () => {
    expect(getControlBucket(100)).toBe(100);
  });

  it('only repaints when the visible bucket changes', () => {
    const building = { control: 12.2, lastRenderedControlBucket: 12 };
    expect(shouldRepaintBuilding(building)).toBe(false);

    building.control = 13.01;
    expect(shouldRepaintBuilding(building)).toBe(true);
  });
```

- [ ] **Step 2: Run the renderer tests to verify they fail**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: FAIL because the bucket helpers do not exist yet

- [ ] **Step 3: Commit**

```bash
git add tests/mapRenderer.test.js
git commit -m "test: add incremental renderer coverage"
```

### Task 2: Refactor The Renderer To Use Cached Incremental Painting

**Files:**
- Modify: `src/game/mapRenderer.js`

- [ ] **Step 1: Introduce bucket helpers and last-render checks**

Update `src/game/mapRenderer.js` to add:

```js
export function getControlBucket(control) {
  return Math.max(0, Math.min(100, Math.round(control)));
}

export function shouldRepaintBuilding(building) {
  return getControlBucket(building.control) !== building.lastRenderedControlBucket;
}
```

- [ ] **Step 2: Split the renderer into static map, color layer, and selection layer**

Update `src/game/mapRenderer.js` so the renderer creates:
- a static map canvas drawn once from the image
- a persistent color canvas for building roof colors
- the existing selection overlay canvas
- the hidden analysis canvas

The main structure should become:

```js
  const mapCanvas = createCanvas(width, height, 'map-canvas');
  const colorCanvas = createCanvas(width, height, 'map-color-layer');
  const overlayCanvas = createCanvas(width, height, 'map-overlay');
```

And:

```js
  const mapContext = mapCanvas.getContext('2d');
  const colorContext = colorCanvas.getContext('2d');
  const overlayContext = overlayCanvas.getContext('2d');
```

Draw the source image once:

```js
  mapContext.drawImage(image, 0, 0);
  analysisContext.drawImage(image, 0, 0);
```

- [ ] **Step 3: Add initialization and incremental repaint methods**

Update `src/game/mapRenderer.js` to expose two methods:

```js
  function initializeBuildingColors(buildings) {
    colorContext.clearRect(0, 0, width, height);

    for (const building of buildings) {
      paintBuildingControlColor(colorContext, building);
      building.lastRenderedControlBucket = getControlBucket(building.control);
    }
  }

  function updateBuildingColors(buildings) {
    for (const building of buildings) {
      if (!shouldRepaintBuilding(building)) {
        continue;
      }

      colorContext.clearRect(
        building.bounds.minX,
        building.bounds.minY,
        building.bounds.maxX - building.bounds.minX + 1,
        building.bounds.maxY - building.bounds.minY + 1
      );

      paintBuildingControlColor(colorContext, building);
      building.lastRenderedControlBucket = getControlBucket(building.control);
    }
  }
```

Also replace the old base redraw API with a hover-only redraw:

```js
  function drawHover(building, previousHoveredBuilding) {
    if (previousHoveredBuilding) {
      colorContext.clearRect(
        previousHoveredBuilding.bounds.minX,
        previousHoveredBuilding.bounds.minY,
        previousHoveredBuilding.bounds.maxX - previousHoveredBuilding.bounds.minX + 1,
        previousHoveredBuilding.bounds.maxY - previousHoveredBuilding.bounds.minY + 1
      );
      paintBuildingControlColor(colorContext, previousHoveredBuilding);
    }

    if (!building) {
      return;
    }

    colorContext.save();
    colorContext.fillStyle = `rgba(${HOVER_COLOR.r}, ${HOVER_COLOR.g}, ${HOVER_COLOR.b}, 1)`;

    for (const [x, y] of building.pixels) {
      colorContext.fillRect(x, y, 1, 1);
    }

    colorContext.restore();
  }
```

- [ ] **Step 4: Run the renderer tests**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/mapRenderer.js tests/mapRenderer.test.js
git commit -m "feat: cache building color rendering"
```

### Task 3: Update The Main Loop To Use Incremental Renderer APIs

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Initialize the color layer once**

Update `src/main.js` after buildings are detected:

```js
    renderer.initializeBuildingColors(buildings);
```

- [ ] **Step 2: Replace full redraw calls with incremental updates**

Update `renderInteractionState(...)` to:

```js
function renderInteractionState(renderer, state, previousHoveredBuilding) {
  const hoveredBuilding = getBuildingById(state, state.hoveredBuildingId);
  const selectedBuilding = getSelectedBuilding(state);

  renderer.updateBuildingColors(state.buildings);
  renderer.drawHover(hoveredBuilding, previousHoveredBuilding);
  renderer.drawSelection(selectedBuilding);
  renderSelectedBuilding(ui, state, selectedBuilding);
}
```

- [ ] **Step 3: Track the previously hovered building**

In `src/main.js`, add a local variable:

```js
    let previousHoveredBuilding = null;
```

Then update pointer handlers so each render call passes the previous hovered building and refreshes the tracking variable after drawing.

- [ ] **Step 4: Keep the animation frame incremental**

Update the frame loop to:

```js
      tickBuildingControl(state, CONTROL_RATE_PER_SECOND * deltaSeconds);
      renderInteractionState(renderer, state, previousHoveredBuilding);
      previousHoveredBuilding = getBuildingById(state, state.hoveredBuildingId);
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Run the dev server and verify the regression manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- control colors still update visibly
- `100%` still reaches exact `#B57271`
- hover and selection still work
- rendering is materially smoother than the previous full-repaint version

- [ ] **Step 8: Commit**

```bash
git add src/main.js
git commit -m "fix: make building recolor incremental"
```
