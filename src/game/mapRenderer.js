import {
  BUILDING_ROOF_COLOR,
  CONTROL_TARGET_COLOR,
  HOVER_COLOR,
  RUNNING_BUILDING_COLOR
} from './constants.js';

function createCanvas(width, height, className) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.className = className;
  return canvas;
}

const STARTER_MARKER_RADIUS = 16;

function mixChannel(start, end, ratio) {
  return Math.round(start + (end - start) * ratio);
}

export function getControlBucket(control) {
  return Math.max(0, Math.min(100, Math.round(control)));
}

export function getControlColor(control) {
  const ratio = getControlBucket(control) / 100;
  return {
    r: mixChannel(BUILDING_ROOF_COLOR.r, CONTROL_TARGET_COLOR.r, ratio),
    g: mixChannel(BUILDING_ROOF_COLOR.g, CONTROL_TARGET_COLOR.g, ratio),
    b: mixChannel(BUILDING_ROOF_COLOR.b, CONTROL_TARGET_COLOR.b, ratio),
    a: 255
  };
}

export function getBuildingDisplayColor(building) {
  if (building.isRunning) {
    return RUNNING_BUILDING_COLOR;
  }

  return getControlColor(building.control);
}

export function paintBuildingControlColor(context, building) {
  const color = getBuildingDisplayColor(building);
  context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;

  for (const [x, y] of building.recolorPixels) {
    context.fillRect(x, y, 1, 1);
  }
}

export function paintStarterMarker(context, building) {
  context.save();
  context.fillStyle = 'rgba(255, 255, 255, 1)';
  context.beginPath();
  context.arc(building.position.x, building.position.y, STARTER_MARKER_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function shouldRepaintBuilding(building) {
  return (
    getControlBucket(building.control) !== building.lastRenderedControlBucket ||
    Boolean(building.isRunning) !== Boolean(building.lastRenderedIsRunning)
  );
}

function clearBuildingRegion(context, building) {
  const pixels = building.recolorPixels ?? building.pixels;

  for (const [x, y] of pixels) {
    context.clearRect(x, y, 1, 1);
  }
}

export function updateChangedBuildingColors(context, buildings) {
  for (const building of buildings) {
    if (!shouldRepaintBuilding(building)) {
      continue;
    }

    paintBuildingControlColor(context, building);
    building.lastRenderedControlBucket = getControlBucket(building.control);
    building.lastRenderedIsRunning = Boolean(building.isRunning);
  }
}

export function createMapRenderer({ image }) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const container = document.createElement('div');
  container.className = 'map-stage';

  const mapCanvas = createCanvas(width, height, 'map-canvas');
  const colorCanvas = createCanvas(width, height, 'map-color-layer');
  const hoverCanvas = createCanvas(width, height, 'map-hover-layer');
  const overlayCanvas = createCanvas(width, height, 'map-overlay');
  const analysisCanvas = createCanvas(width, height, 'map-analysis');
  analysisCanvas.hidden = true;

  const mapContext = mapCanvas.getContext('2d');
  const colorContext = colorCanvas.getContext('2d');
  const hoverContext = hoverCanvas.getContext('2d');
  const overlayContext = overlayCanvas.getContext('2d');
  const analysisContext = analysisCanvas.getContext('2d', { willReadFrequently: true });

  mapContext.drawImage(image, 0, 0);
  analysisContext.drawImage(image, 0, 0);

  container.append(mapCanvas, colorCanvas, hoverCanvas, overlayCanvas, analysisCanvas);

  function initializeBuildingColors(buildings) {
    colorContext.clearRect(0, 0, width, height);

    for (const building of buildings) {
      paintBuildingControlColor(colorContext, building);
      building.lastRenderedControlBucket = getControlBucket(building.control);
      building.lastRenderedIsRunning = Boolean(building.isRunning);
    }
  }

  function updateBuildingColors(buildings) {
    updateChangedBuildingColors(colorContext, buildings);
  }

  function drawHover(building, previousHoveredBuilding) {
    if (previousHoveredBuilding) {
      clearBuildingRegion(hoverContext, previousHoveredBuilding);
    }

    if (!building) {
      return;
    }

    clearBuildingRegion(hoverContext, building);
    hoverContext.save();
    hoverContext.fillStyle = `rgba(${HOVER_COLOR.r}, ${HOVER_COLOR.g}, ${HOVER_COLOR.b}, 1)`;

    for (const [x, y] of building.recolorPixels) {
      hoverContext.fillRect(x, y, 1, 1);
    }

    hoverContext.restore();
  }

  function drawSelection(building, starterBuilding) {
    overlayContext.clearRect(0, 0, width, height);

    if (building) {
      overlayContext.fillStyle = 'rgba(255, 231, 153, 0.35)';
      for (const [x, y] of building.pixels) {
        overlayContext.fillRect(x, y, 1, 1);
      }
    }

    if (starterBuilding) {
      paintStarterMarker(overlayContext, starterBuilding);
    }
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
    initializeBuildingColors,
    updateBuildingColors,
    drawHover,
    drawSelection,
    getImageData,
    toImageCoordinates
  };
}

export { CONTROL_TARGET_COLOR, RUNNING_BUILDING_COLOR };
