# Edge Recolor Mask Radius 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the roof recolor effect visibly stronger on the full-size map by expanding the recolor mask to a 2-pixel radius with diagonals while preserving dark borders and exact hit detection.

**Architecture:** Keep the exact roof pixel mask unchanged for selection and hit testing, and only widen the separate `recolorPixels` rendering mask. Update detection to collect eligible non-border pixels within a 2-pixel neighborhood around roof pixels, then keep the renderer unchanged because it already paints from `recolorPixels`.

**Tech Stack:** Vite, plain JavaScript, Canvas API, Vitest

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `src/game/buildingDetector.js`
- Modify: `tests/buildingDetector.test.js`

### Task 1: Update The Detector Test For 2px Diagonal Expansion

**Files:**
- Modify: `tests/buildingDetector.test.js`

- [ ] **Step 1: Update the recolor-mask test to expect a larger mask**

Replace the existing recolor-mask test fixture in `tests/buildingDetector.test.js` with:

```js
  it('builds a recolor mask that extends 2 pixels with diagonals while excluding dark borders', () => {
    const roof = pixel(165, 160, 149);
    const edge = pixel(150, 145, 136);
    const black = pixel(0, 0, 0);
    const imageData = createImageData(5, 5, [
      [...black, ...edge, ...edge, ...edge, ...black],
      [...edge, ...edge, ...edge, ...edge, ...edge],
      [...edge, ...edge, ...roof, ...edge, ...edge],
      [...edge, ...edge, ...edge, ...edge, ...edge],
      [...black, ...edge, ...edge, ...edge, ...black]
    ]);

    const { buildings } = detectBuildingsFromImageData(imageData);

    expect(buildings[0].pixels).toEqual([[2, 2]]);
    expect(sortPixels(buildings[0].recolorPixels)).toEqual(sortPixels([
      [1, 0], [2, 0], [3, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
      [0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
      [1, 4], [2, 4], [3, 4]
    ]));
  });
```

- [ ] **Step 2: Run the detector test to verify it fails**

Run: `npm test -- tests/buildingDetector.test.js`
Expected: FAIL because the current recolor mask only expands by 1 pixel in four directions

- [ ] **Step 3: Commit**

```bash
git add tests/buildingDetector.test.js
git commit -m "test: expect 2px recolor mask expansion"
```

### Task 2: Expand Recolor Mask Construction To 2px With Diagonals

**Files:**
- Modify: `src/game/buildingDetector.js`

- [ ] **Step 1: Replace the 1px neighbor walk with a 2px diagonal neighborhood**

Update the recolor-mask construction inside `detectBuildingsFromImageData(...)` to use this neighborhood loop:

```js
      for (const [pixelX, pixelY] of pixels) {
        recolorPixelSet.add(`${pixelX},${pixelY}`);

        for (let deltaY = -2; deltaY <= 2; deltaY += 1) {
          for (let deltaX = -2; deltaX <= 2; deltaX += 1) {
            const neighborX = pixelX + deltaX;
            const neighborY = pixelY + deltaY;

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
      }
```

- [ ] **Step 2: Run the detector test again**

Run: `npm test -- tests/buildingDetector.test.js`
Expected: PASS

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Run the dev server and verify manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- recolor footprint is visibly larger on the full-size map
- dark borders remain visible
- neighboring buildings are not incorrectly recolored
- click detection still behaves the same

- [ ] **Step 6: Commit**

```bash
git add src/game/buildingDetector.js tests/buildingDetector.test.js
git commit -m "feat: expand recolor mask to 2px"
```
