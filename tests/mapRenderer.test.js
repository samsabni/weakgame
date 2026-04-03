import { describe, expect, it } from 'vitest';
import {
  CONTROL_TARGET_COLOR,
  getBuildingDisplayColor,
  getControlColor,
  getControlBucket,
  paintStarterMarker,
  paintBuildingControlColor,
  RUNNING_BUILDING_COLOR,
  updateChangedBuildingColors
} from '../src/game/mapRenderer.js';
import { shouldRepaintBuilding } from '../src/game/mapRenderer.js';

function createMockContext() {
  return {
    fillStyle: '',
    clearRectCalls: [],
    fillRectCalls: [],
    arcCalls: [],
    fillCalls: [],
    saveCalls: 0,
    restoreCalls: 0,
    beginPathCalls: 0,
    save() {
      this.saveCalls += 1;
    },
    restore() {
      this.restoreCalls += 1;
    },
    beginPath() {
      this.beginPathCalls += 1;
    },
    arc(x, y, radius, startAngle, endAngle) {
      this.arcCalls.push({ x, y, radius, startAngle, endAngle });
    },
    fill() {
      this.fillCalls.push(this.fillStyle);
    },
    clearRect(x, y, width, height) {
      this.clearRectCalls.push({ x, y, width, height });
    },
    fillRect(x, y, width, height) {
      this.fillRectCalls.push({ x, y, width, height, fillStyle: this.fillStyle });
    }
  };
}

describe('mapRenderer control colors', () => {
  it('exports the configured control target color', () => {
    expect(CONTROL_TARGET_COLOR).toEqual({ r: 181, g: 114, b: 113, a: 255 });
  });

  it('exports the configured running color', () => {
    expect(RUNNING_BUILDING_COLOR).toEqual({ r: 133, g: 73, b: 71, a: 255 });
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

  it('uses the running color when a building is running', () => {
    expect(getBuildingDisplayColor({ control: 40, isRunning: true })).toEqual({
      r: 133,
      g: 73,
      b: 71,
      a: 255
    });
  });

  it('paints the building pixels using the current control color', () => {
    const context = createMockContext();
    const building = {
      control: 50,
      isRunning: false,
      recolorPixels: [[1, 2], [3, 4]]
    };

    paintBuildingControlColor(context, building);

    expect(context.fillRectCalls).toEqual([
      { x: 1, y: 2, width: 1, height: 1, fillStyle: 'rgba(173, 137, 131, 1)' },
      { x: 3, y: 4, width: 1, height: 1, fillStyle: 'rgba(173, 137, 131, 1)' }
    ]);
  });

  it('paints a white starter marker at the building center', () => {
    const context = createMockContext();

    paintStarterMarker(context, {
      position: { x: 12.5, y: 20.5 }
    });

    expect(context.arcCalls).toEqual([
      { x: 12.5, y: 20.5, radius: 16, startAngle: 0, endAngle: Math.PI * 2 }
    ]);
    expect(context.fillCalls).toEqual(['rgba(255, 255, 255, 1)']);
  });

  it('maps 100 control to the exact final bucket', () => {
    expect(getControlBucket(100)).toBe(100);
  });

  it('only repaints when the visible bucket changes', () => {
    const building = {
      control: 12.2,
      isRunning: false,
      lastRenderedControlBucket: 12,
      lastRenderedIsRunning: false
    };
    expect(shouldRepaintBuilding(building)).toBe(false);

    building.control = 13.01;
    expect(shouldRepaintBuilding(building)).toBe(true);

    building.control = 13;
    building.lastRenderedControlBucket = 13;
    building.isRunning = true;
    expect(shouldRepaintBuilding(building)).toBe(true);
  });

  it('repaints changed buildings without clearing neighboring building color', () => {
    const context = createMockContext();
    const changedBuilding = {
      control: 50,
      isRunning: false,
      lastRenderedControlBucket: 49,
      lastRenderedIsRunning: false,
      bounds: { minX: 0, minY: 0, maxX: 4, maxY: 4 },
      pixels: [[1, 1], [1, 2]],
      recolorPixels: [[1, 1], [1, 2]]
    };
    const untouchedNeighbor = {
      control: 80,
      isRunning: false,
      lastRenderedControlBucket: 80,
      lastRenderedIsRunning: false,
      bounds: { minX: 2, minY: 1, maxX: 3, maxY: 2 },
      pixels: [[2, 1]],
      recolorPixels: [[2, 1]]
    };

    updateChangedBuildingColors(context, [changedBuilding, untouchedNeighbor]);

    expect(context.clearRectCalls).toEqual([]);
    expect(context.fillRectCalls).toEqual([
      { x: 1, y: 1, width: 1, height: 1, fillStyle: 'rgba(173, 137, 131, 1)' },
      { x: 1, y: 2, width: 1, height: 1, fillStyle: 'rgba(173, 137, 131, 1)' }
    ]);
    expect(changedBuilding.lastRenderedControlBucket).toBe(50);
    expect(changedBuilding.lastRenderedIsRunning).toBe(false);
    expect(untouchedNeighbor.lastRenderedControlBucket).toBe(80);
    expect(untouchedNeighbor.lastRenderedIsRunning).toBe(false);
  });
});
