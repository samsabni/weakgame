import { describe, expect, it } from 'vitest';
import { purchaseSelectedRunningBuilding } from '../src/game/runningBuildingManager.js';

function createState({
  cash = 4000,
  selectedBuildingId = 'building-1',
  control = 100,
  assigned = 10,
  isRunning = false
} = {}) {
  return {
    cash,
    selectedBuildingId,
    buildings: [
      {
        id: 'building-1',
        control,
        playerAssignedDelinquents: assigned,
        isRunning
      }
    ]
  };
}

describe('runningBuildingManager', () => {
  it('purchases the selected building when eligible', () => {
    const state = createState();

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(true);
    expect(state.cash).toBe(2000);
    expect(state.buildings[0].isRunning).toBe(true);
  });

  it('does nothing when control is below 100', () => {
    const state = createState({ control: 90 });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
    expect(state.cash).toBe(4000);
    expect(state.buildings[0].isRunning).toBe(false);
  });

  it('does nothing when cash is below 2000', () => {
    const state = createState({ cash: 1500 });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
  });

  it('does nothing when the building is already running', () => {
    const state = createState({ isRunning: true });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
    expect(state.cash).toBe(4000);
  });

  it('does nothing when assigned delinquents are below 10', () => {
    const state = createState({ assigned: 9 });

    const changed = purchaseSelectedRunningBuilding(state);

    expect(changed).toBe(false);
    expect(state.cash).toBe(4000);
    expect(state.buildings[0].isRunning).toBe(false);
  });
});
