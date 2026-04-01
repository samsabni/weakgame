# Viewport Fit Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the map stay centered in the viewport, scale to viewport height, and prevent the browser window from scrolling while preserving existing hover, click, and control interactions.

**Architecture:** Keep the current rendering and hit-testing logic unchanged and solve the requirement at the layout layer. Update the HTML/CSS structure so the app root locks to the viewport, the map stage scales from viewport height while preserving aspect ratio, and the info UI becomes an overlay rather than a column that consumes layout width.

**Tech Stack:** Vite, plain JavaScript, HTML, CSS, Canvas API

**Repo Note:** The current workspace is not a git repository. Commit steps in this plan assume `git init` has been run first or that execution happens inside a repo-backed folder.

---

## File Structure

- Modify: `index.html`
- Modify: `src/style.css`
- Verify: `src/game/mapRenderer.js`
- Verify: `src/main.js`

### Task 1: Convert The Layout To A Viewport-Locked Overlay Shell

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`

- [ ] **Step 1: Write the failing manual layout expectation**

Document the required visible failure before changing code:

```txt
Current layout fails the viewport-fit requirement because:
- the sidebar takes fixed width from the page layout
- the map stage does not fill viewport height
- page-level layout rules can create extra margins around the map
```

- [ ] **Step 2: Move the UI inside the map shell so it can overlay the map**

Update `index.html`:

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
      <main class="map-shell">
        <div id="map-root" class="map-root"></div>
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
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 3: Replace the page layout CSS with a viewport-locked stage**

Update `src/style.css`:

```css
:root {
  color-scheme: dark;
  font-family: "Trebuchet MS", sans-serif;
  background: #ccc5b9;
  color: #f5efe2;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  min-height: 100vh;
}

.app {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.map-shell {
  position: relative;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.18), transparent 42%),
    #ccc5b9;
}

.map-root {
  position: relative;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
}

.map-stage {
  position: relative;
  height: 100vh;
  width: auto;
}

.map-canvas,
.map-overlay {
  display: block;
  height: 100vh;
  width: auto;
  max-width: none;
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

.sidebar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  width: min(280px, calc(100vw - 32px));
  padding: 18px;
  background: rgba(36, 31, 23, 0.88);
  border: 1px solid rgba(60, 52, 39, 0.9);
  backdrop-filter: blur(6px);
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

- [ ] **Step 4: Verify the renderer still uses displayed-canvas bounds for hit testing**

Check `src/game/mapRenderer.js` and confirm `toImageCoordinates()` still derives pointer mapping from `overlayCanvas.getBoundingClientRect()`:

```js
function toImageCoordinates(clientX, clientY) {
  const rect = overlayCanvas.getBoundingClientRect();
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;
  return {
    x: Math.floor((clientX - rect.left) * scaleX),
    y: Math.floor((clientY - rect.top) * scaleY)
  };
}
```

No code change is needed if this remains true.

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: build completes successfully

- [ ] **Step 6: Run the dev server and verify the layout manually**

Run: `npm run dev -- --host 127.0.0.1`
Expected:
- the browser window does not scroll
- the map is centered on screen
- the map height fills the viewport
- hover and click still line up with buildings
- the sidebar floats on top of the map instead of shrinking the map area

- [ ] **Step 7: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: fit map to viewport height"
```
