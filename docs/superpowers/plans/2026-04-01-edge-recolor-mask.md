# Edge Recolor Mask Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the faint fringe around recolored roofs by using a separate recolor mask that includes anti-aliased roof-edge pixels while preserving the dark building outline.

**Architecture:** Keep the exact roof mask for hit detection and centroid logic, and add a second per-building recolor mask for visual painting. Build that mask during detection by including eligible neighboring edge pixels, then update renderer paint paths to use the recolor mask for control, running, and hover colors.

**Tech Stack:** Vite, plain JavaScript, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `src/game/buildingDetector.js`
- Modify: `src/game/mapRenderer.js`
- Modify: `tests/buildingDetector.test.js`
- Modify: `tests/mapRenderer.test.js`

### Task 1: Add Tests For Recolor Mask Metadata

**Files:**
- Modify: `tests/buildingDetector.test.js`

- [ ] **Step 1: Add a detector test for recolor mask expansion**

Append to `tests/buildingDetector.test.js`:

```js
  it('builds a recolor mask that can extend beyond the exact roof mask', () => {
    const roof = pixel(165, 160, 149);
    const edge = pixel(150, 145, 136);
    const black = pixel(0, 0, 0);
    const imageData = createImageData(3, 3, [
      [...black, ...edge, ...black],
      [...edge, ...roof, ...edge],
      [...black, ...edge, ...black]
    ]);

    const { buildings } = detectBuildingsFromImageData(imageData);

    expect(buildings[0].pixels).toEqual([[1, 1]]);
    expect(buildings[0].recolorPixels).toEqual([
      [1, 1],
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2]
    ]);
  });
```

- [ ] **Step 2: Run the detector tests to verify they fail**

Run: `npm test -- tests/buildingDetector.test.js`
Expected: FAIL because `recolorPixels` does not exist yet

- [ ] **Step 3: Commit**

```bash
git add tests/buildingDetector.test.js
git commit -m "test: add recolor mask coverage"
```

### Task 2: Build The Recolor Mask During Detection

**Files:**
- Modify: `src/game/buildingDetector.js`

- [ ] **Step 1: Add edge-pixel classification helpers**

Update `src/game/buildingDetector.js` with helper functions near `isRoofPixel(...)`:

```js
function isDarkBorderPixel(data, offset) {
  return data[offset] <= 60 && data[offset + 1] <= 60 && data[offset + 2] <= 60;
}

function isEligibleRecolorEdgePixel(data, offset) {
  if (isRoofPixel(data, offset)) {
    return true;
  }

  if (isDarkBorderPixel(data, offset)) {
    return false;
  }

  return data[offset + 3] > 0;
}
```

- [ ] **Step 2: Build `recolorPixels` from roof pixels plus eligible neighbors**

Update `src/game/buildingDetector.js` inside `detectBuildingsFromImageData(...)` after the flood-fill completes:

```js
      const recolorPixelSet = new Set();

      for (const [pixelX, pixelY] of pixels) {
        recolorPixelSet.add(`${pixelX},${pixelY}`);

        const neighbors = [
          [pixelX + 1, pixelY],
          [pixelX - 1, pixelY],
          [pixelX, pixelY + 1],
          [pixelX, pixelY - 1]
        ];

        for (const [neighborX, neighborY] of neighbors) {
          if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) {
            continue;
          }

          const neighborOffset = (neighborY * width + neighborX) * 4;
          if (!isEligibleRecolorEdgePixel(data, neighborOffset)) {
            continue;
          }

          recolorPixelSet.add(`${neighborX},${neighborY}`);
        }
      }

      const recolorPixels = Array.from(recolorPixelSet, (key) =>
        key.split(',').map((value) => Number.parseInt(value, 10))
      );
```

Then include:

```js
        recolorPixels,
```

in the building object.

- [ ] **Step 3: Run the detector tests**

Run: `npm test -- tests/buildingDetector.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/buildingDetector.js tests/buildingDetector.test.js
git commit -m "feat: add recolor masks for roof edges"
```

### Task 3: Use The Recolor Mask In Renderer Paint Paths

**Files:**
- Modify: `src/game/mapRenderer.js`
- Modify: `tests/mapRenderer.test.js`

- [ ] **Step 1: Update renderer tests to expect recolor mask usage**

Modify the existing paint test in `tests/mapRenderer.test.js`:

```js
    const building = {
      control: 50,
      isRunning: false,
      recolorPixels: [[1, 2], [3, 4]]
    };
```

The expected `fillRectCalls` stay the same.

- [ ] **Step 2: Run the renderer tests to verify they fail**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: FAIL because the renderer still reads `pixels`

- [ ] **Step 3: Switch renderer color/hover painting to `recolorPixels`**

Update `src/game/mapRenderer.js`:

In `paintBuildingControlColor(...)`:

```js
  for (const [x, y] of building.recolorPixels) {
    context.fillRect(x, y, 1, 1);
  }
```

In `drawHover(...)`:

```js
    for (const [x, y] of building.recolorPixels) {
      hoverContext.fillRect(x, y, 1, 1);
    }
```

Leave selection rendering on `building.pixels` so it still highlights the exact building shape.

- [ ] **Step 4: Run the renderer tests**

Run: `npm test -- tests/mapRenderer.test.js`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Run the dev server and verify manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- recolored roofs no longer show a faint fringe at the edge
- dark building borders remain visible
- hover uses the cleaned-up edge mask
- click detection remains unchanged

- [ ] **Step 8: Commit**

```bash
git add src/game/mapRenderer.js tests/mapRenderer.test.js
git commit -m "feat: recolor anti-aliased roof edges"
```
