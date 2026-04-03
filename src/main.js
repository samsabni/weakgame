import './style.css';
import { detectBuildingsFromImageData, findBuildingAtPixel } from './game/buildingDetector.js';
import {
  assignDelinquentToSelectedBuilding,
  removeDelinquentFromSelectedBuilding
} from './game/delinquentManager.js';
import { purchaseSelectedRunningBuilding } from './game/runningBuildingManager.js';
import {
  adjustCash,
  adjustInfluence,
  adjustPlayerIdleDelinquents,
  checkStarterBuildingLoss,
  claimStarterBuilding,
  cloneBuildings,
  clearSelection,
  createInitialState,
  getStarterBuilding,
  getSelectedBuilding,
  resetGameState,
  selectBuilding,
  setHoveredBuilding,
  tickBuildingControl,
  tickPassiveResources
} from './game/buildingState.js';
import { createMapRenderer } from './game/mapRenderer.js';
import { createUiBindings, renderSelectedBuilding, setDebugPanelOpen, setStatus } from './game/ui.js';

const MAP_SOURCE = '/finalmap.png';
const CONTROL_RATE_PER_SECOND = 12;

const ui = createUiBindings();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    image.alt = 'Game map';
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
  });
}

function getBuildingById(state, id) {
  return state.buildings.find((building) => building.id === id) ?? null;
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

    const initialBuildings = cloneBuildings(buildings);
    const state = createInitialState(cloneBuildings(initialBuildings));
    setStatus(ui, `${buildings.length} buildings detected.`);
    renderer.initializeBuildingColors(state.buildings);
    let previousHoveredBuilding = null;
    let resourceAccumulator = 0;
    let debugPanelOpen = false;
    setDebugPanelOpen(ui, debugPanelOpen);

    function renderCurrentState() {
      renderer.drawSelection(getSelectedBuilding(state), getStarterBuilding(state));
      renderSelectedBuilding(ui, state, getSelectedBuilding(state));
    }

    renderCurrentState();

    let lastFrameTime = performance.now();

    function frame(now) {
      const deltaSeconds = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      if (!state.gameOver) {
        const controlChanged = tickBuildingControl(state, CONTROL_RATE_PER_SECOND * deltaSeconds);
        resourceAccumulator += deltaSeconds;
        let resourcesChanged = false;

        while (resourceAccumulator >= 1) {
          resourceAccumulator -= 1;
          resourcesChanged = tickPassiveResources(state) || resourcesChanged;
        }

        const gameOverChanged = checkStarterBuildingLoss(state);

        if (gameOverChanged) {
          setHoveredBuilding(state, null);
          renderer.drawHover(null, previousHoveredBuilding);
          previousHoveredBuilding = null;
        }

        if (controlChanged) {
          renderer.updateBuildingColors(state.buildings);
        }

        if (controlChanged || resourcesChanged || gameOverChanged) {
          renderCurrentState();
        }
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    renderer.element.addEventListener('pointermove', (event) => {
      if (state.gameOver) {
        return;
      }

      const point = renderer.toImageCoordinates(event.clientX, event.clientY);
      const buildingId = findBuildingAtPixel(regionMap, point.x, point.y);
      if (buildingId === state.hoveredBuildingId) {
        return;
      }

      setHoveredBuilding(state, buildingId);
      const hoveredBuilding = getBuildingById(state, state.hoveredBuildingId);
      renderer.drawHover(hoveredBuilding, previousHoveredBuilding);
      previousHoveredBuilding = hoveredBuilding;
    });

    renderer.element.addEventListener('pointerleave', () => {
      if (state.gameOver) {
        return;
      }

      if (state.hoveredBuildingId === null) {
        return;
      }

      setHoveredBuilding(state, null);
      renderer.drawHover(null, previousHoveredBuilding);
      previousHoveredBuilding = null;
    });

    renderer.element.addEventListener('click', (event) => {
      if (state.gameOver) {
        return;
      }

      const point = renderer.toImageCoordinates(event.clientX, event.clientY);
      const buildingId = findBuildingAtPixel(regionMap, point.x, point.y);

      if (state.needsStarterBuilding) {
        if (buildingId && claimStarterBuilding(state, buildingId)) {
          renderer.updateBuildingColors(state.buildings);
          renderCurrentState();
        }
        return;
      }

      if (buildingId) {
        selectBuilding(state, buildingId);
      } else {
        clearSelection(state);
      }

      renderCurrentState();
    });

    ui.assignDelinquentButton.addEventListener('click', () => {
      if (state.gameOver) {
        return;
      }

      if (assignDelinquentToSelectedBuilding(state)) {
        adjustCash(state, 0);
        renderer.updateBuildingColors(state.buildings);
        renderCurrentState();
      }
    });

    ui.removeDelinquentButton.addEventListener('click', () => {
      if (state.gameOver) {
        return;
      }

      if (removeDelinquentFromSelectedBuilding(state)) {
        adjustCash(state, 0);
        renderer.updateBuildingColors(state.buildings);
        renderCurrentState();
      }
    });

    ui.runBuildingButton.addEventListener('click', () => {
      if (state.gameOver) {
        return;
      }

      if (purchaseSelectedRunningBuilding(state)) {
        renderer.updateBuildingColors(state.buildings);
        renderCurrentState();
      }
    });

    ui.startOverButton.addEventListener('click', () => {
      renderer.drawHover(null, previousHoveredBuilding);
      previousHoveredBuilding = null;
      resetGameState(state, initialBuildings);
      resourceAccumulator = 0;
      renderer.initializeBuildingColors(state.buildings);
      renderCurrentState();
    });

    ui.debugToggle.addEventListener('click', () => {
      debugPanelOpen = !debugPanelOpen;
      setDebugPanelOpen(ui, debugPanelOpen);
    });

    function applyDebugChange(changeFn, amount) {
      if (state.gameOver) {
        return;
      }

      changeFn(state, amount);
      renderCurrentState();
    }

    ui.debugCashIncreaseButton.addEventListener('click', () => applyDebugChange(adjustCash, 100));
    ui.debugCashDecreaseButton.addEventListener('click', () => applyDebugChange(adjustCash, -100));
    ui.debugInfluenceIncreaseButton.addEventListener('click', () =>
      applyDebugChange(adjustInfluence, 10)
    );
    ui.debugInfluenceDecreaseButton.addEventListener('click', () =>
      applyDebugChange(adjustInfluence, -10)
    );
    ui.debugIdleIncreaseButton.addEventListener('click', () =>
      applyDebugChange(adjustPlayerIdleDelinquents, 1)
    );
    ui.debugIdleDecreaseButton.addEventListener('click', () =>
      applyDebugChange(adjustPlayerIdleDelinquents, -1)
    );
  } catch (error) {
    setStatus(ui, 'Failed to load finalmap.png.');
    console.error(error);
  }
}

init();
