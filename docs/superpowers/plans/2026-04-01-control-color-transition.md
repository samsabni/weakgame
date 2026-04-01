# Control Color Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each building roof transition visually from `#A5A095` at `0%` control to `#B57271` at `100%` control.

**Architecture:** Keep control state and delinquent-driven progression unchanged and localize the new behavior to rendering. Add a target control color constant, renderer helpers to interpolate and paint roof regions from each building's current control value, and focused tests for color interpolation behavior.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `src/game/constants.js`
- Modify: `src/game/mapRenderer.js`
- Create: `tests/mapRenderer.test.js`

### Task 1: Add Renderer-Focused Tests For Control Color Interpolation

**Files:**
- Create: `tests/mapRenderer.test.js`

- [ ] **Step 1: Write the failing renderer tests**

Create `tests/mapRenderer.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  CONTROL_TARGET_COLOR,
  getControlColor,
  paintBuildingControlColor
} from '../src/game/mapRenderer.js';

function createMockContext() {
  return {
    fillStyle: '',
    fillRectCalls: [],
    fillRect(x, y, width, height) {
      this.fillRectCalls.push({ x, y, width, height, fillStyle: this.fillStyle });
    }
  };
}

describe('mapRenderer control colors', () => {
  it('exports the configured control target color', () => {
    expect(CONTROL_TARGET_COLOR).toEqual({ r: 181, g: 114, b: 113, a: 255 });
  });

  it('returns the base roof color at 0 control', () => {
    expect(getControlColor(0)).toEqual({ r: 165, g: 160, b: 149, a: 255 });
  });

  it('returns the target color at 100 control', () => {
    expect(getControlColor(100)).toEqual({ r: 181, g: 114, b: 113, a: 255 });
  });

  it('returns an interpolated color for intermediate control values', () => {
    expect(getControlColor(50)).toEqual({ r: 173, g: 137, b: 131, a: 255 });
  });

  it('paints the building pixels using the current control color', () => {
    const context = createMockContext();
    const building = {
      control: 50,
      pixels: [[1, 2], [3, 4]]
    };

    paintBuildingControlColor(context, building);

    expect(context.fillRectCalls).toEqual([
      { x: 1, y: 2, width: 1, height: 1, fillStyle: 'rgba(173, 137, 131, 1)' },
      { x: 3, y: 4, width: 1, height: 1, fillStyle: 'rgba(173, 137, 131, 1)' }
    ]);
  });
});
```

- [ ] **Step 2: Run the renderer tests to verify they fail**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: FAIL because `getControlColor`, `paintBuildingControlColor`, and `CONTROL_TARGET_COLOR` do not exist yet

- [ ] **Step 3: Commit**

```bash
git add tests/mapRenderer.test.js
git commit -m "test: add control color transition coverage"
```

### Task 2: Implement Control Color Rendering

**Files:**
- Modify: `src/game/constants.js`
- Modify: `src/game/mapRenderer.js`

- [ ] **Step 1: Add the target control color constant**

Update `src/game/constants.js`:

```js
export const BUILDING_ROOF_COLOR = Object.freeze({
  r: 165,
  g: 160,
  b: 149,
  a: 255
});

export const CONTROL_TARGET_COLOR = Object.freeze({
  r: 181,
  g: 114,
  b: 113,
  a: 255
});

export const HOVER_COLOR = Object.freeze({
  r: 143,
  g: 138,
  b: 128,
  a: 255
});
```

- [ ] **Step 2: Add control color helpers and paint all buildings before hover**

Update `src/game/mapRenderer.js`:

```js
import { BUILDING_ROOF_COLOR, CONTROL_TARGET_COLOR, HOVER_COLOR } from './constants.js';

function createCanvas(width, height, className) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.className = className;
  return canvas;
}

function mixChannel(start, end, ratio) {
  return Math.round(start + (end - start) * ratio);
}

export function getControlColor(control) {
  const ratio = Math.max(0, Math.min(100, control)) / 100;
  return {
    r: mixChannel(BUILDING_ROOF_COLOR.r, CONTROL_TARGET_COLOR.r, ratio),
    g: mixChannel(BUILDING_ROOF_COLOR.g, CONTROL_TARGET_COLOR.g, ratio),
    b: mixChannel(BUILDING_ROOF_COLOR.b, CONTROL_TARGET_COLOR.b, ratio),
    a: 255
  };
}

export function paintBuildingControlColor(context, building) {
  const color = getControlColor(building.control);
  context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;

  for (const [x, y] of building.pixels) {
    context.fillRect(x, y, 1, 1);
  }
}

export function createMapRenderer({ image }) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const container = document.createElement('div');
  container.className = 'map-stage';

  const baseCanvas = createCanvas(width, height, 'map-canvas');
  const overlayCanvas = createCanvas(width, height, 'map-overlay');
  const analysisCanvas = createCanvas(width, height, 'map-analysis');
  analysisCanvas.hidden = true;

  const baseContext = baseCanvas.getContext('2d');
  const overlayContext = overlayCanvas.getContext('2d');
  const analysisContext = analysisCanvas.getContext('2d', { willReadFrequently: true });

  analysisContext.drawImage(image, 0, 0);
  baseContext.drawImage(image, 0, 0);

  container.append(baseCanvas, overlayCanvas, analysisCanvas);

  function redrawBase(imageSource, buildings) {
    baseContext.clearRect(0, 0, width, height);
    baseContext.drawImage(imageSource, 0, 0);

    for (const building of buildings) {
      paintBuildingControlColor(baseContext, building);
    }
  }

  function drawHover(building) {
    if (!building) {
      return;
    }

    baseContext.save();
    baseContext.fillStyle = `rgba(${HOVER_COLOR.r}, ${HOVER_COLOR.g}, ${HOVER_COLOR.b}, 1)`;

    for (const [x, y] of building.pixels) {
      baseContext.fillRect(x, y, 1, 1);
    }

    baseContext.restore();
  }

  function drawSelection(building) {
    overlayContext.clearRect(0, 0, width, height);
    if (!building) {
      return;
    }

    overlayContext.fillStyle = 'rgba(255, 231, 153, 0.35)';
    overlayContext.strokeStyle = 'rgba(255, 242, 189, 0.9)';
    for (const [x, y] of building.pixels) {
      overlayContext.fillRect(x, y, 1, 1);
    }

    overlayContext.strokeRect(
      building.bounds.minX,
      building.bounds.minY,
      building.bounds.maxX - building.bounds.minX + 1,
      building.bounds.maxY - building.bounds.minY + 1
    );
  }

  function getImageData() {
    return analysisContext.getImageData(0, 0, width, height);
  }

  function toImageCoordinates(clientX, clientY) {
    const rect = overlayCanvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY)
    };
  }

  return {
    element: container,
    redrawBase,
    drawHover,
    drawSelection,
    getImageData,
    toImageCoordinates
  };
}

export { CONTROL_TARGET_COLOR };
```

- [ ] **Step 3: Update the main render call to pass all buildings**

Update `src/main.js` in `renderInteractionState(...)`:

```js
  renderer.redrawBase(image, state.buildings);
```

- [ ] **Step 4: Run the new renderer tests**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Run the dev server and verify the transition manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- buildings at `0` control match the original roof color
- buildings become progressively closer to `#B57271` as control rises
- buildings at different control values show different roof colors at the same time
- hover still overrides only the hovered building
- selection highlight still remains visible

- [ ] **Step 8: Commit**

```bash
git add src/game/constants.js src/game/mapRenderer.js src/main.js tests/mapRenderer.test.js
git commit -m "feat: color buildings by control percentage"
```
