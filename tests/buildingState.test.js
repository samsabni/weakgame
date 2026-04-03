import { describe, expect, it } from 'vitest';
import {
  adjustCash,
  adjustInfluence,
  adjustPlayerIdleDelinquents,
  checkStarterBuildingLoss,
  claimStarterBuilding,
  cloneBuildings,
  clearSelection,
  createInitialState,
  getCashCap,
  getBuildingControlCap,
  getPassiveCashRate,
  getPassiveInfluenceRate,
  getReachableBuildingIds,
  getSelectedBuilding,
  getStarterBuilding,
  resetGameState,
  selectBuilding,
  setHoveredBuilding,
  tickBuildingControl,
  tickPassiveResources
} from '../src/game/buildingState.js';

function createBuilding(id, control = 0, assigned = 0, options = {}) {
  return {
    id,
    position: { x: 1, y: 1 },
    control,
    owner: 'neutral',
    playerAssignedDelinquents: assigned,
    isRunning: options.isRunning ?? false,
    neighborIds: options.neighborIds ?? [],
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    pixels: [[0, 0]]
  };
}

describe('buildingState', () => {
  it('creates the default interaction state', () => {
    const state = createInitialState([createBuilding('building-1')]);

    expect(state.selectedBuildingId).toBe(null);
    expect(state.hoveredBuildingId).toBe(null);
    expect(state.playerIdleDelinquents).toBe(10);
    expect(state.cash).toBe(0);
    expect(state.influence).toBe(0);
    expect(state.needsStarterBuilding).toBe(true);
    expect(state.playerStarterBuildingId).toBe(null);
    expect(state.gameOver).toBe(false);
    expect(state.buildings).toHaveLength(1);
  });

  it('claims one starter building without spending idle delinquents', () => {
    const state = createInitialState([
      createBuilding('building-1'),
      createBuilding('building-2')
    ]);

    const changed = claimStarterBuilding(state, 'building-2');

    expect(changed).toBe(true);
    expect(state.needsStarterBuilding).toBe(false);
    expect(state.selectedBuildingId).toBe('building-2');
    expect(state.playerStarterBuildingId).toBe('building-2');
    expect(state.playerIdleDelinquents).toBe(10);
    expect(state.buildings[1].isRunning).toBe(true);
    expect(state.buildings[1].playerAssignedDelinquents).toBe(10);
    expect(state.buildings[1].control).toBe(100);
  });

  it('looks up the stored starter building from state', () => {
    const state = createInitialState([
      createBuilding('building-1'),
      createBuilding('building-2')
    ]);

    claimStarterBuilding(state, 'building-2');

    expect(getStarterBuilding(state)?.id).toBe('building-2');
  });

  it('does not allow a second starter claim after the first one', () => {
    const state = createInitialState([
      createBuilding('building-1'),
      createBuilding('building-2')
    ]);

    claimStarterBuilding(state, 'building-1');

    expect(claimStarterBuilding(state, 'building-2')).toBe(false);
    expect(state.buildings[1].isRunning).toBe(false);
  });

  it('enters game over when the starter building drops below 100 control', () => {
    const state = createInitialState([
      createBuilding('building-1', 99.5, 9)
    ]);
    state.playerStarterBuildingId = 'building-1';

    expect(checkStarterBuildingLoss(state)).toBe(true);
    expect(state.gameOver).toBe(true);
  });

  it('does not retrigger game over once the run is already lost', () => {
    const state = createInitialState([
      createBuilding('building-1', 95, 9)
    ]);
    state.playerStarterBuildingId = 'building-1';
    state.gameOver = true;

    expect(checkStarterBuildingLoss(state)).toBe(false);
  });

  it('resets the run from the initial building snapshot', () => {
    const initialBuildings = cloneBuildings([
      createBuilding('building-1'),
      createBuilding('building-2')
    ]);
    const state = createInitialState(cloneBuildings(initialBuildings));

    claimStarterBuilding(state, 'building-1');
    state.cash = 500;
    state.influence = 12;
    state.gameOver = true;
    state.hoveredBuildingId = 'building-2';
    state.buildings[0].control = 87;
    state.buildings[0].playerAssignedDelinquents = 4;
    state.buildings[0].isRunning = false;

    resetGameState(state, initialBuildings);

    expect(state.needsStarterBuilding).toBe(true);
    expect(state.playerStarterBuildingId).toBe(null);
    expect(state.gameOver).toBe(false);
    expect(state.selectedBuildingId).toBe(null);
    expect(state.hoveredBuildingId).toBe(null);
    expect(state.cash).toBe(0);
    expect(state.influence).toBe(0);
    expect(state.playerIdleDelinquents).toBe(10);
    expect(state.buildings[0].control).toBe(0);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(0);
    expect(state.buildings[0].isRunning).toBe(false);
  });

  it('derives cash cap from running buildings', () => {
    expect(getCashCap([])).toBe(2000);
    expect(getCashCap([
      { isRunning: true },
      { isRunning: false },
      { isRunning: true }
    ])).toBe(6000);
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

  it('derives control cap from assigned delinquents in 10 percent steps', () => {
    expect(getBuildingControlCap({ playerAssignedDelinquents: 0 })).toBe(0);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 1 })).toBe(10);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 3 })).toBe(30);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 8 })).toBe(80);
    expect(getBuildingControlCap({ playerAssignedDelinquents: 15 })).toBe(100);
  });

  it('increases control only on buildings with assigned delinquents', () => {
    const state = createInitialState([
      createBuilding('building-1', 10, 2),
      createBuilding('building-2', 20, 0)
    ]);

    tickBuildingControl(state, 3);

    expect(state.buildings[0].control).toBe(16);
    expect(state.buildings[1].control).toBe(12.5);
  });

  it('lets different buildings grow at different rates', () => {
    const state = createInitialState([
      createBuilding('building-1', 0, 1),
      createBuilding('building-2', 0, 3)
    ]);

    tickBuildingControl(state, 2);

    expect(state.buildings[0].control).toBe(2);
    expect(state.buildings[1].control).toBe(6);
  });

  it('stops growth at the current derived cap', () => {
    const state = createInitialState([
      createBuilding('building-1', 9, 1),
      createBuilding('building-2', 18, 2)
    ]);

    tickBuildingControl(state, 3);

    expect(state.buildings[0].control).toBe(10);
    expect(state.buildings[1].control).toBe(20);
  });

  it('decays above-cap control at 2.5x the per-building growth basis', () => {
    const state = createInitialState([
      createBuilding('building-1', 40, 1),
      createBuilding('building-2', 60, 2)
    ]);

    tickBuildingControl(state, 4);

    expect(state.buildings[0].control).toBe(30);
    expect(state.buildings[1].control).toBe(40);
  });

  it('decays zero-assigned buildings toward zero using the minimum decay basis', () => {
    const state = createInitialState([
      createBuilding('building-1', 10, 0)
    ]);

    tickBuildingControl(state, 2);

    expect(state.buildings[0].control).toBe(5);
  });

  it('never overshoots below the cap while decaying', () => {
    const state = createInitialState([
      createBuilding('building-1', 12, 1)
    ]);

    tickBuildingControl(state, 2);

    expect(state.buildings[0].control).toBe(10);
  });

  it('caps growth at 100 only when assigned delinquents allow it', () => {
    const state = createInitialState([
      createBuilding('building-1', 99, 10),
      createBuilding('building-2', 98, 12)
    ]);

    tickBuildingControl(state, 5);

    expect(state.buildings[0].control).toBe(100);
    expect(state.buildings[1].control).toBe(100);
  });

  it('revokes running state when assigned delinquents drop below 10', () => {
    const state = createInitialState([
      createBuilding('building-1', 100, 9, { isRunning: true })
    ]);
    state.cash = 3500;

    tickBuildingControl(state, 2);

    expect(state.buildings[0].isRunning).toBe(false);
    expect(state.cash).toBe(2000);
  });

  it('adds rounded passive cash from controlled non-running buildings once per second', () => {
    const state = createInitialState([
      createBuilding('building-1', 10, 1),
      createBuilding('building-2', 60, 6),
      createBuilding('building-3', 100, 10, { isRunning: true })
    ]);

    const changed = tickPassiveResources(state);

    expect(changed).toBe(true);
    expect(state.cash).toBe(4);
    expect(state.influence).toBe(1);
  });

  it('clamps passive cash to the current cash cap', () => {
    const state = createInitialState([
      createBuilding('building-1', 100, 10)
    ]);
    state.cash = 1998;

    tickPassiveResources(state);

    expect(state.cash).toBe(2000);
  });

  it('does not add passive cash for running or zero-control buildings', () => {
    const state = createInitialState([
      createBuilding('building-1', 0, 0),
      createBuilding('building-2', 100, 10, { isRunning: true })
    ]);

    tickPassiveResources(state);

    expect(state.cash).toBe(0);
    expect(state.influence).toBe(1);
  });

  it('derives live passive cash and influence rates from current state', () => {
    const state = createInitialState([
      createBuilding('building-1', 10, 1),
      createBuilding('building-2', 60, 6),
      createBuilding('building-3', 100, 10, { isRunning: true })
    ]);

    expect(getPassiveCashRate(state)).toBe(3.5);
    expect(getPassiveInfluenceRate(state)).toBe(1);
  });

  it('marks only direct neighbors reachable from controlled or running territory', () => {
    const state = createInitialState([
      createBuilding('building-1', 20, 1, { neighborIds: ['building-2'] }),
      createBuilding('building-2', 0, 0, { neighborIds: ['building-1', 'building-3'] }),
      createBuilding('building-3', 0, 0, { neighborIds: ['building-2', 'building-4'] }),
      createBuilding('building-4', 0, 0, { neighborIds: ['building-3'] })
    ]);

    expect(getReachableBuildingIds(state)).toEqual(new Set([
      'building-1',
      'building-2'
    ]));
  });

  it('debug resource helpers clamp to valid ranges', () => {
    const state = createInitialState([
      createBuilding('building-1')
    ]);

    adjustCash(state, 5000);
    adjustInfluence(state, 3);
    adjustPlayerIdleDelinquents(state, -50);

    expect(state.cash).toBe(2000);
    expect(state.influence).toBe(3);
    expect(state.playerIdleDelinquents).toBe(0);
  });
});
