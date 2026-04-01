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

function sortPixels(pixels) {
  return [...pixels].sort((left, right) => {
    if (left[1] !== right[1]) {
      return left[1] - right[1];
    }

    return left[0] - right[0];
  });
}

describe('buildingDetector', () => {
  it('exports the configured roof and hover colors', () => {
    expect(BUILDING_ROOF_COLOR).toEqual({ r: 165, g: 160, b: 149, a: 255 });
    expect(HOVER_COLOR).toEqual({ r: 143, g: 138, b: 128, a: 255 });
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
      owner: 'neutral',
      playerAssignedDelinquents: 0,
      isRunning: false
    });
    expect(buildings[1]).toMatchObject({
      id: 'building-2',
      control: 0,
      owner: 'neutral',
      playerAssignedDelinquents: 0,
      isRunning: false
    });
    expect(buildings[0].position).toEqual({ x: 0, y: 0.5 });
    expect(buildings[1].position).toEqual({ x: 2, y: 0.5 });
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

  it('builds a recolor mask that fills outward to the dark border', () => {
    const roof = pixel(165, 160, 149);
    const edge = pixel(150, 145, 136);
    const black = pixel(0, 0, 0);
    const imageData = createImageData(9, 9, [
      [...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...roof, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black]
    ]);

    const { buildings } = detectBuildingsFromImageData(imageData);

    expect(buildings[0].pixels).toEqual([[4, 4]]);
    expect(sortPixels(buildings[0].recolorPixels)).toEqual(sortPixels(
      Array.from({ length: 7 * 7 }, (_, index) => {
        const x = (index % 7) + 1;
        const y = Math.floor(index / 7) + 1;
        return [x, y];
      })
    ));
  });

  it('keeps each recolor mask local when non-dark areas connect across the map', () => {
    const roof = pixel(165, 160, 149);
    const edge = pixel(150, 145, 136);
    const black = pixel(0, 0, 0);
    const imageData = createImageData(13, 5, [
      [...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...edge, ...roof, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...roof, ...edge, ...black],
      [...black, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...edge, ...black],
      [...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black, ...black]
    ]);

    const { buildings } = detectBuildingsFromImageData(imageData);
    const firstRecolorPixels = sortPixels(buildings[0].recolorPixels);
    const secondRecolorPixels = sortPixels(buildings[1].recolorPixels);

    expect(firstRecolorPixels).toContainEqual([1, 1]);
    expect(firstRecolorPixels).toContainEqual([3, 3]);
    expect(firstRecolorPixels).not.toContainEqual([10, 2]);
    expect(firstRecolorPixels).not.toContainEqual([11, 1]);
    expect(secondRecolorPixels).toContainEqual([9, 1]);
    expect(secondRecolorPixels).toContainEqual([11, 3]);
    expect(secondRecolorPixels).not.toContainEqual([2, 2]);
    expect(secondRecolorPixels).not.toContainEqual([1, 1]);
  });
});
