# Building Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal browser-game map viewer that auto-detects roof-colored buildings from `bettermap.png`, supports hover and click interaction, and lets the selected building's control increase over time.

**Architecture:** Use a small Vite app with plain JavaScript modules and layered canvases. One module detects connected roof regions and creates building objects, one module owns game state and control updates, and one module renders the map plus hover/selection overlays while the DOM panel displays selected-building data.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `src/game/constants.js`
- Create: `src/game/buildingDetector.js`
- Create: `src/game/buildingState.js`
- Create: `src/game/mapRenderer.js`
- Create: `src/game/ui.js`
- Create: `tests/buildingDetector.test.js`
- Create: `tests/buildingState.test.js`
- Use existing asset: `bettermap.png`

## Task 1: Scaffold The Web App

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/style.css`

- [ ] **Step 1: Write the failing scaffold smoke test expectation**

Document the manual smoke target before implementation:

```txt
Open the Vite app in a browser.
Expected initial result:
- page loads without console errors
- map area is visible
- building info panel is visible
- "Increase Control" button exists and starts disabled
```

- [ ] **Step 2: Add the Vite package manifest**

Create `package.json`:

```json
{
  "name": "weak-building-map",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 3: Add the Vite config**

Create `vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: false
  },
  test: {
    environment: 'node'
  }
});
```

- [ ] **Step 4: Add the base HTML shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weak Map</title>
    <script type="module" src="/src/main.js"></script>
  </head>
  <body>
    <div class="app">
      <aside class="sidebar">
        <h1>Buildings</h1>
        <div id="status" class="status">Loading map...</div>
        <section id="building-panel" class="panel">
          <p class="panel-label">Selected Building</p>
          <p id="building-id">None</p>
          <p id="building-owner">Owner: -</p>
          <p id="building-control">Control: -</p>
        </section>
        <button id="increase-control" type="button" disabled>Increase Control</button>
      </aside>
      <main class="map-shell">
        <div id="map-root" class="map-root"></div>
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 5: Add the initial stylesheet**

Create `src/style.css`:

```css
:root {
  color-scheme: dark;
  font-family: "Trebuchet MS", sans-serif;
  background: #1c1914;
  color: #f5efe2;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

.app {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.sidebar {
  padding: 20px;
  background: #241f17;
  border-right: 1px solid #3c3427;
}

.map-shell {
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    radial-gradient(circle at top, rgba(101, 88, 60, 0.22), transparent 40%),
    #15120d;
}

.map-root {
  position: relative;
  max-width: 100%;
  max-height: calc(100vh - 40px);
}

.status,
.panel,
button {
  margin-top: 16px;
}

button {
  width: 100%;
  padding: 12px 14px;
  border: 0;
  color: #f5efe2;
  background: #5f6f4d;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
```

- [ ] **Step 6: Add the initial app bootstrap**

Create `src/main.js`:

```js
import './style.css';

const status = document.querySelector('#status');
const mapRoot = document.querySelector('#map-root');

status.textContent = 'App scaffold ready. Map system not initialized yet.';
mapRoot.innerHTML = '<p>Map canvas will render here.</p>';
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: install completes and creates `node_modules` plus `package-lock.json`

- [ ] **Step 8: Run the scaffold smoke check**

Run: `npm run dev`
Expected:
- Vite dev server starts without errors
- opening the local URL shows the sidebar, panel, and disabled button

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/main.js src/style.css
git commit -m "feat: scaffold building interaction app"
```

## Task 2: Define Shared Constants And Building Detection Tests

**Files:**
- Create: `src/game/constants.js`
- Create: `src/game/buildingDetector.js`
- Test: `tests/buildingDetector.test.js`

- [ ] **Step 1: Write the failing building detection tests**

Create `tests/buildingDetector.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  BUILDING_ROOF_COLOR,
  HOVER_COLOR,
  createEmptyRegionMap,
  detectBuildingsFromImageData,
  findBuildingAtPixel
} from '../src/game/buildingDetector.js';

function pixel(r, g, b, a = 255) {
  return [r, g, b, a];
}

function createImageData(width, height, rows) {
  return {
    width,
    height,
    data: new Uint8ClampedArray(rows.flat())
  };
}

describe('buildingDetector', () => {
  it('exports the configured roof and hover colors', () => {
    expect(BUILDING_ROOF_COLOR).toEqual({ r: 165, g: 160, b: 149, a: 255 });
    expect(HOVER_COLOR).toEqual({ r: 73, g: 71, b: 63, a: 255 });
  });

  it('detects separate roof regions using 4-direction adjacency', () => {
    const roof = pixel(165, 160, 149);
    const black = pixel(0, 0, 0);
    const imageData = createImageData(4, 3, [
      [...roof, ...black, ...roof, ...black],
      [...roof, ...black, ...roof, ...black],
      [...black, ...black, ...black, ...black]
    ]);

    const { buildings, regionMap } = detectBuildingsFromImageData(imageData);

    expect(buildings).toHaveLength(2);
    expect(buildings[0]).toMatchObject({
      id: 'building-1',
      control: 0,
      owner: 'neutral'
    });
    expect(buildings[1]).toMatchObject({
      id: 'building-2',
      control: 0,
      owner: 'neutral'
    });
    expect(buildings[0].position).toEqual({ x: 0.5, y: 0.5 });
    expect(buildings[1].position).toEqual({ x: 2.5, y: 0.5 });
    expect(findBuildingAtPixel(regionMap, 0, 0)).toBe('building-1');
    expect(findBuildingAtPixel(regionMap, 2, 1)).toBe('building-2');
    expect(findBuildingAtPixel(regionMap, 1, 0)).toBe(null);
  });

  it('does not merge diagonal roof pixels into one building', () => {
    const roof = pixel(165, 160, 149);
    const black = pixel(0, 0, 0);
    const imageData = createImageData(2, 2, [
      [...roof, ...black],
      [...black, ...roof]
    ]);

    const { buildings } = detectBuildingsFromImageData(imageData);

    expect(buildings).toHaveLength(2);
  });

  it('creates an empty region map when no buildings are found', () => {
    const regionMap = createEmptyRegionMap(3, 2);
    expect(regionMap).toEqual([
      [null, null, null],
      [null, null, null]
    ]);
  });
});
```

- [ ] **Step 2: Run the detector tests to verify they fail**

Run: `npm test -- tests/buildingDetector.test.js`
Expected: FAIL with module not found errors for `buildingDetector.js`

- [ ] **Step 3: Add shared color constants**

Create `src/game/constants.js`:

```js
export const BUILDING_ROOF_COLOR = Object.freeze({
  r: 165,
  g: 160,
  b: 149,
  a: 255
});

export const HOVER_COLOR = Object.freeze({
  r: 73,
  g: 71,
  b: 63,
  a: 255
});
```

- [ ] **Step 4: Implement building detection**

Create `src/game/buildingDetector.js`:

```js
import { BUILDING_ROOF_COLOR, HOVER_COLOR } from './constants.js';

function isRoofPixel(data, offset) {
  return (
    data[offset] === BUILDING_ROOF_COLOR.r &&
    data[offset + 1] === BUILDING_ROOF_COLOR.g &&
    data[offset + 2] === BUILDING_ROOF_COLOR.b &&
    data[offset + 3] === BUILDING_ROOF_COLOR.a
  );
}

export function createEmptyRegionMap(width, height) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => null));
}

export function detectBuildingsFromImageData(imageData) {
  const { width, height, data } = imageData;
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const regionMap = createEmptyRegionMap(width, height);
  const buildings = [];
  let buildingNumber = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (visited[y][x]) continue;

      const offset = (y * width + x) * 4;
      if (!isRoofPixel(data, offset)) {
        visited[y][x] = true;
        continue;
      }

      buildingNumber += 1;
      const id = `building-${buildingNumber}`;
      const queue = [[x, y]];
      const pixels = [];
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      visited[y][x] = true;

      while (queue.length > 0) {
        const [currentX, currentY] = queue.shift();
        pixels.push([currentX, currentY]);
        regionMap[currentY][currentX] = id;
        sumX += currentX;
        sumY += currentY;
        minX = Math.min(minX, currentX);
        minY = Math.min(minY, currentY);
        maxX = Math.max(maxX, currentX);
        maxY = Math.max(maxY, currentY);

        const neighbors = [
          [currentX + 1, currentY],
          [currentX - 1, currentY],
          [currentX, currentY + 1],
          [currentX, currentY - 1]
        ];

        for (const [nextX, nextY] of neighbors) {
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          if (visited[nextY][nextX]) continue;

          visited[nextY][nextX] = true;
          const nextOffset = (nextY * width + nextX) * 4;

          if (isRoofPixel(data, nextOffset)) {
            queue.push([nextX, nextY]);
          }
        }
      }

      buildings.push({
        id,
        position: {
          x: sumX / pixels.length,
          y: sumY / pixels.length
        },
        control: 0,
        owner: 'neutral',
        bounds: { minX, minY, maxX, maxY },
        pixels
      });
    }
  }

  return { buildings, regionMap };
}

export function findBuildingAtPixel(regionMap, x, y) {
  if (y < 0 || y >= regionMap.length) return null;
  if (x < 0 || x >= regionMap[0].length) return null;
  return regionMap[y][x];
}

export { BUILDING_ROOF_COLOR, HOVER_COLOR };
```

- [ ] **Step 5: Run the detector tests**

Run: `npm test -- tests/buildingDetector.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/constants.js src/game/buildingDetector.js tests/buildingDetector.test.js
git commit -m "feat: detect buildings from roof color"
```

## Task 3: Add Building State And Control Progression Tests

**Files:**
- Create: `src/game/buildingState.js`
- Test: `tests/buildingState.test.js`

- [ ] **Step 1: Write the failing state tests**

Create `tests/buildingState.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  clearSelection,
  createInitialState,
  getSelectedBuilding,
  incrementSelectedBuildingControl,
  selectBuilding,
  setHoveredBuilding
} from '../src/game/buildingState.js';

function createBuilding(id, control = 0) {
  return {
    id,
    position: { x: 1, y: 1 },
    control,
    owner: 'neutral',
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    pixels: [[0, 0]]
  };
}

describe('buildingState', () => {
  it('creates the default interaction state', () => {
    const state = createInitialState([createBuilding('building-1')]);

    expect(state.selectedBuildingId).toBe(null);
    expect(state.hoveredBuildingId).toBe(null);
    expect(state.controlIncreasing).toBe(false);
    expect(state.buildings).toHaveLength(1);
  });

  it('selects and clears buildings', () => {
    const state = createInitialState([createBuilding('building-1')]);

    selectBuilding(state, 'building-1');
    expect(getSelectedBuilding(state).id).toBe('building-1');

    clearSelection(state);
    expect(getSelectedBuilding(state)).toBe(null);
  });

  it('tracks hovered building separately from selection', () => {
    const state = createInitialState([createBuilding('building-1')]);

    setHoveredBuilding(state, 'building-1');
    expect(state.hoveredBuildingId).toBe('building-1');
  });

  it('increments the selected building control and clamps at 100', () => {
    const state = createInitialState([createBuilding('building-1', 98)]);

    selectBuilding(state, 'building-1');

    incrementSelectedBuildingControl(state, 1.5);
    expect(getSelectedBuilding(state).control).toBe(99.5);

    incrementSelectedBuildingControl(state, 5);
    expect(getSelectedBuilding(state).control).toBe(100);
  });

  it('does nothing when no building is selected', () => {
    const state = createInitialState([createBuilding('building-1', 10)]);

    incrementSelectedBuildingControl(state, 5);
    expect(state.buildings[0].control).toBe(10);
  });
});
```

- [ ] **Step 2: Run the state tests to verify they fail**

Run: `npm test -- tests/buildingState.test.js`
Expected: FAIL with module not found errors for `buildingState.js`

- [ ] **Step 3: Implement the building state module**

Create `src/game/buildingState.js`:

```js
export function createInitialState(buildings) {
  return {
    buildings,
    selectedBuildingId: null,
    hoveredBuildingId: null,
    controlIncreasing: false
  };
}

export function selectBuilding(state, buildingId) {
  state.selectedBuildingId = buildingId;
}

export function clearSelection(state) {
  state.selectedBuildingId = null;
  state.controlIncreasing = false;
}

export function setHoveredBuilding(state, buildingId) {
  state.hoveredBuildingId = buildingId;
}

export function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function incrementSelectedBuildingControl(state, amount) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding) return;

  selectedBuilding.control = Math.min(100, selectedBuilding.control + amount);
}
```

- [ ] **Step 4: Run the state tests**

Run: `npm test -- tests/buildingState.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/buildingState.js tests/buildingState.test.js
git commit -m "feat: add building interaction state"
```

## Task 4: Render The Map And Wire Hover/Click Interaction

**Files:**
- Modify: `src/main.js`
- Create: `src/game/mapRenderer.js`
- Create: `src/game/ui.js`
- Modify: `src/style.css`

- [ ] **Step 1: Add the renderer module**

Create `src/game/mapRenderer.js`:

```js
import { BUILDING_ROOF_COLOR, HOVER_COLOR } from './buildingDetector.js';

function createCanvas(width, height, className) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.className = className;
  return canvas;
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

  function redrawBase(imageSource) {
    baseContext.clearRect(0, 0, width, height);
    baseContext.drawImage(imageSource, 0, 0);
  }

  function drawHover(building) {
    if (!building) return;
    baseContext.save();
    baseContext.fillStyle = `rgba(${HOVER_COLOR.r}, ${HOVER_COLOR.g}, ${HOVER_COLOR.b}, 1)`;
    for (const [x, y] of building.pixels) {
      baseContext.fillRect(x, y, 1, 1);
    }
    baseContext.restore();
  }

  function drawSelection(building) {
    overlayContext.clearRect(0, 0, width, height);
    if (!building) return;

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
```

- [ ] **Step 2: Add the UI helper module**

Create `src/game/ui.js`:

```js
export function createUiBindings() {
  return {
    status: document.querySelector('#status'),
    buildingId: document.querySelector('#building-id'),
    buildingOwner: document.querySelector('#building-owner'),
    buildingControl: document.querySelector('#building-control'),
    increaseControlButton: document.querySelector('#increase-control'),
    mapRoot: document.querySelector('#map-root')
  };
}

export function renderSelectedBuilding(ui, building) {
  if (!building) {
    ui.buildingId.textContent = 'None';
    ui.buildingOwner.textContent = 'Owner: -';
    ui.buildingControl.textContent = 'Control: -';
    return;
  }

  ui.buildingId.textContent = building.id;
  ui.buildingOwner.textContent = `Owner: ${building.owner}`;
  ui.buildingControl.textContent = `Control: ${Math.round(building.control)}%`;
}

export function setStatus(ui, message) {
  ui.status.textContent = message;
}

export function setControlButtonEnabled(ui, enabled) {
  ui.increaseControlButton.disabled = !enabled;
}
```

- [ ] **Step 3: Replace the bootstrap with full interaction wiring**

Update `src/main.js`:

```js
import './style.css';
import { detectBuildingsFromImageData, findBuildingAtPixel } from './game/buildingDetector.js';
import {
  clearSelection,
  createInitialState,
  getSelectedBuilding,
  incrementSelectedBuildingControl,
  selectBuilding,
  setHoveredBuilding
} from './game/buildingState.js';
import { createMapRenderer } from './game/mapRenderer.js';
import { createUiBindings, renderSelectedBuilding, setControlButtonEnabled, setStatus } from './game/ui.js';

const MAP_SOURCE = '/bettermap.png';
const CONTROL_RATE_PER_SECOND = 12;

const ui = createUiBindings();

async function loadImage(src) {
  const image = new Image();
  image.src = src;
  image.alt = 'Game map';
  await image.decode();
  return image;
}

function getBuildingById(state, id) {
  return state.buildings.find((building) => building.id === id) ?? null;
}

function renderInteractionState(renderer, image, state) {
  renderer.redrawBase(image);

  const hoveredBuilding = getBuildingById(state, state.hoveredBuildingId);
  const selectedBuilding = getSelectedBuilding(state);

  if (hoveredBuilding) {
    renderer.drawHover(hoveredBuilding);
  }

  renderer.drawSelection(selectedBuilding);
  renderSelectedBuilding(ui, selectedBuilding);
  setControlButtonEnabled(ui, Boolean(selectedBuilding));
}

async function init() {
  try {
    const image = await loadImage(MAP_SOURCE);
    const renderer = createMapRenderer({ image });
    ui.mapRoot.replaceChildren(renderer.element);

    const { buildings, regionMap } = detectBuildingsFromImageData(renderer.getImageData());
    if (buildings.length === 0) {
      setStatus(ui, 'No buildings found with roof color #A5A095.');
      return;
    }

    const state = createInitialState(buildings);
    setStatus(ui, `${buildings.length} buildings detected.`);
    renderInteractionState(renderer, image, state);

    let lastFrameTime = performance.now();

    function frame(now) {
      const deltaSeconds = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      if (state.controlIncreasing && state.selectedBuildingId) {
        incrementSelectedBuildingControl(state, CONTROL_RATE_PER_SECOND * deltaSeconds);
        renderInteractionState(renderer, image, state);
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    renderer.element.addEventListener('pointermove', (event) => {
      const point = renderer.toImageCoordinates(event.clientX, event.clientY);
      const buildingId = findBuildingAtPixel(regionMap, point.x, point.y);
      if (buildingId === state.hoveredBuildingId) return;
      setHoveredBuilding(state, buildingId);
      renderInteractionState(renderer, image, state);
    });

    renderer.element.addEventListener('pointerleave', () => {
      if (state.hoveredBuildingId === null) return;
      setHoveredBuilding(state, null);
      renderInteractionState(renderer, image, state);
    });

    renderer.element.addEventListener('click', (event) => {
      const point = renderer.toImageCoordinates(event.clientX, event.clientY);
      const buildingId = findBuildingAtPixel(regionMap, point.x, point.y);

      if (buildingId) {
        selectBuilding(state, buildingId);
      } else {
        clearSelection(state);
      }

      renderInteractionState(renderer, image, state);
    });

    ui.increaseControlButton.addEventListener('click', () => {
      if (!state.selectedBuildingId) return;
      state.controlIncreasing = true;
    });
  } catch (error) {
    setStatus(ui, 'Failed to load bettermap.png.');
    console.error(error);
  }
}

init();
```

- [ ] **Step 4: Extend styling for layered canvases**

Update `src/style.css` by appending:

```css
.map-stage {
  position: relative;
  width: min(100%, 1100px);
}

.map-canvas,
.map-overlay {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.map-overlay {
  position: absolute;
  inset: 0;
}

.map-overlay,
.map-stage {
  cursor: crosshair;
}
```

- [ ] **Step 5: Run the app and verify interaction manually**

Run: `npm run dev`
Expected:
- map image renders
- moving across a roof recolors only that building to `#49473F`
- clicking a roof selects it and fills the panel
- clicking empty space clears selection

- [ ] **Step 6: Commit**

```bash
git add src/main.js src/game/mapRenderer.js src/game/ui.js src/style.css
git commit -m "feat: wire map hover and selection interaction"
```

## Task 5: Finish Control Button Behavior And Selection Display

**Files:**
- Modify: `src/game/buildingState.js`
- Modify: `src/game/ui.js`
- Modify: `src/main.js`

- [ ] **Step 1: Add a focused UI/state expectation checklist**

Document the final manual checks:

```txt
Expected final interaction:
- selected building panel always reflects the current selected building
- "Increase Control" stays disabled with no selection
- after selecting a building and pressing the button, control rises gradually
- control never exceeds 100
- hover feedback still works while control is increasing
```

- [ ] **Step 2: Update state helpers to stop control at 100**

Update `src/game/buildingState.js`:

```js
export function createInitialState(buildings) {
  return {
    buildings,
    selectedBuildingId: null,
    hoveredBuildingId: null,
    controlIncreasing: false
  };
}

export function selectBuilding(state, buildingId) {
  state.selectedBuildingId = buildingId;
}

export function clearSelection(state) {
  state.selectedBuildingId = null;
  state.controlIncreasing = false;
}

export function setHoveredBuilding(state, buildingId) {
  state.hoveredBuildingId = buildingId;
}

export function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function incrementSelectedBuildingControl(state, amount) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding) return false;

  selectedBuilding.control = Math.min(100, selectedBuilding.control + amount);
  if (selectedBuilding.control >= 100) {
    state.controlIncreasing = false;
  }

  return true;
}
```

- [ ] **Step 3: Render control with one decimal place and disable the button while capped**

Update `src/game/ui.js`:

```js
export function createUiBindings() {
  return {
    status: document.querySelector('#status'),
    buildingId: document.querySelector('#building-id'),
    buildingOwner: document.querySelector('#building-owner'),
    buildingControl: document.querySelector('#building-control'),
    increaseControlButton: document.querySelector('#increase-control'),
    mapRoot: document.querySelector('#map-root')
  };
}

export function renderSelectedBuilding(ui, building) {
  if (!building) {
    ui.buildingId.textContent = 'None';
    ui.buildingOwner.textContent = 'Owner: -';
    ui.buildingControl.textContent = 'Control: -';
    return;
  }

  ui.buildingId.textContent = building.id;
  ui.buildingOwner.textContent = `Owner: ${building.owner}`;
  ui.buildingControl.textContent = `Control: ${building.control.toFixed(1)}%`;
}

export function setStatus(ui, message) {
  ui.status.textContent = message;
}

export function setControlButtonEnabled(ui, enabled) {
  ui.increaseControlButton.disabled = !enabled;
}
```

- [ ] **Step 4: Update the app loop to disable the button when the selected building is full**

Update `src/main.js` in these two places.

In `renderInteractionState`:

```js
function renderInteractionState(renderer, image, state) {
  renderer.redrawBase(image);

  const hoveredBuilding = getBuildingById(state, state.hoveredBuildingId);
  const selectedBuilding = getSelectedBuilding(state);

  if (hoveredBuilding) {
    renderer.drawHover(hoveredBuilding);
  }

  renderer.drawSelection(selectedBuilding);
  renderSelectedBuilding(ui, selectedBuilding);
  setControlButtonEnabled(ui, Boolean(selectedBuilding) && selectedBuilding.control < 100);
}
```

In the button handler:

```js
ui.increaseControlButton.addEventListener('click', () => {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding || selectedBuilding.control >= 100) return;
  state.controlIncreasing = true;
});
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Run the final manual verification**

Run: `npm run dev`
Expected:
- hover recolor uses `#49473F`
- only the hovered building changes color
- selected building highlight remains visible
- control rises gradually after pressing the button
- control display updates live
- control caps at `100.0%`
- button disables again at full control

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/game/buildingState.js src/game/ui.js
git commit -m "feat: add control progression for selected buildings"
```
