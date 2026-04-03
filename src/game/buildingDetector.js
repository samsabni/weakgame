import { BUILDING_ROOF_COLOR, HOVER_COLOR } from './constants.js';

const RECOLOR_BOUNDS_PADDING = 3;
const ADJACENCY_GAP_THRESHOLD = 4;

function isRoofPixel(data, offset) {
  return (
    data[offset] === BUILDING_ROOF_COLOR.r &&
    data[offset + 1] === BUILDING_ROOF_COLOR.g &&
    data[offset + 2] === BUILDING_ROOF_COLOR.b &&
    data[offset + 3] === BUILDING_ROOF_COLOR.a
  );
}

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

function buildRecolorPixels(imageData, pixels, bounds) {
  const { width, height, data } = imageData;
  const minX = Math.max(0, bounds.minX - RECOLOR_BOUNDS_PADDING);
  const minY = Math.max(0, bounds.minY - RECOLOR_BOUNDS_PADDING);
  const maxX = Math.min(width - 1, bounds.maxX + RECOLOR_BOUNDS_PADDING);
  const maxY = Math.min(height - 1, bounds.maxY + RECOLOR_BOUNDS_PADDING);
  const localWidth = maxX - minX + 1;
  const recolorPixels = [];
  const visited = new Uint8Array(localWidth * (maxY - minY + 1));
  const queue = [...pixels];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const [pixelX, pixelY] = queue[queueIndex];
    queueIndex += 1;

    if (pixelX < minX || pixelX > maxX || pixelY < minY || pixelY > maxY) {
      continue;
    }

    const localIndex = (pixelY - minY) * localWidth + (pixelX - minX);
    if (visited[localIndex] === 1) {
      continue;
    }

    visited[localIndex] = 1;

    const offset = (pixelY * width + pixelX) * 4;
    if (!isEligibleRecolorEdgePixel(data, offset)) {
      continue;
    }

    recolorPixels.push([pixelX, pixelY]);

    const neighbors = [
      [pixelX - 1, pixelY - 1],
      [pixelX, pixelY - 1],
      [pixelX + 1, pixelY - 1],
      [pixelX - 1, pixelY],
      [pixelX + 1, pixelY],
      [pixelX - 1, pixelY + 1],
      [pixelX, pixelY + 1],
      [pixelX + 1, pixelY + 1]
    ];

    for (const [neighborX, neighborY] of neighbors) {
      if (neighborX < minX || neighborX > maxX || neighborY < minY || neighborY > maxY) {
        continue;
      }

      queue.push([neighborX, neighborY]);
    }
  }

  return recolorPixels;
}

export function getBoundsGap(leftBounds, rightBounds) {
  const horizontalGap = Math.max(
    0,
    Math.max(leftBounds.minX - rightBounds.maxX, rightBounds.minX - leftBounds.maxX)
  );
  const verticalGap = Math.max(
    0,
    Math.max(leftBounds.minY - rightBounds.maxY, rightBounds.minY - leftBounds.maxY)
  );

  return Math.max(horizontalGap, verticalGap);
}

export function addBuildingNeighbors(buildings, maxGap = ADJACENCY_GAP_THRESHOLD) {
  for (const building of buildings) {
    building.neighborIds = [];
  }

  for (let index = 0; index < buildings.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < buildings.length; compareIndex += 1) {
      if (getBoundsGap(buildings[index].bounds, buildings[compareIndex].bounds) > maxGap) {
        continue;
      }

      buildings[index].neighborIds.push(buildings[compareIndex].id);
      buildings[compareIndex].neighborIds.push(buildings[index].id);
    }
  }
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
      if (visited[y][x]) {
        continue;
      }

      const offset = (y * width + x) * 4;
      if (!isRoofPixel(data, offset)) {
        visited[y][x] = true;
        continue;
      }

      buildingNumber += 1;
      const id = `building-${buildingNumber}`;
      const queue = [[x, y]];
      const pixels = [];
      let queueIndex = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      visited[y][x] = true;

      while (queueIndex < queue.length) {
        const [currentX, currentY] = queue[queueIndex];
        queueIndex += 1;

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
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
            continue;
          }

          if (visited[nextY][nextX]) {
            continue;
          }

          visited[nextY][nextX] = true;
          const nextOffset = (nextY * width + nextX) * 4;
          if (isRoofPixel(data, nextOffset)) {
            queue.push([nextX, nextY]);
          }
        }
      }

      const bounds = { minX, minY, maxX, maxY };
      const recolorPixels = buildRecolorPixels(imageData, pixels, bounds);

      buildings.push({
        id,
        position: {
          x: sumX / pixels.length,
          y: sumY / pixels.length
        },
        control: 0,
        owner: 'neutral',
        playerAssignedDelinquents: 0,
        isRunning: false,
        bounds,
        pixels,
        recolorPixels
      });
    }
  }

  addBuildingNeighbors(buildings);

  return { buildings, regionMap };
}

export function findBuildingAtPixel(regionMap, x, y) {
  if (y < 0 || y >= regionMap.length) {
    return null;
  }

  if (x < 0 || x >= regionMap[0].length) {
    return null;
  }

  return regionMap[y][x];
}

export { BUILDING_ROOF_COLOR, HOVER_COLOR };
