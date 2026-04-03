import { describe, expect, it } from 'vitest';
import {
  assignDelinquentToSelectedBuilding,
  removeDelinquentFromSelectedBuilding
} from '../src/game/delinquentManager.js';

function createState({
  idle = 10,
  selectedBuildingId = 'building-1',
  assigned = 0,
  isRunning = false,
  control = 20,
  neighborIds = []
} = {}) {
  return {
    playerIdleDelinquents: idle,
    selectedBuildingId,
    buildings: [
      {
        id: 'building-1',
        control,
        playerAssignedDelinquents: assigned,
        isRunning,
        neighborIds
      },
      {
        id: 'building-2',
        control: 0,
        playerAssignedDelinquents: 3,
        isRunning: false,
        neighborIds: []
      }
    ]
  };
}

describe('delinquentManager', () => {
  it('assigns one idle delinquent to the selected building only', () => {
    const state = createState({ idle: 4, assigned: 1 });

    const changed = assignDelinquentToSelectedBuilding(state);

    expect(changed).toBe(true);
    expect(state.playerIdleDelinquents).toBe(3);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(2);
    expect(state.buildings[1].playerAssignedDelinquents).toBe(3);
  });

  it('does nothing when no building is selected', () => {
    const state = createState({ selectedBuildingId: null, idle: 4, assigned: 1 });

    const changed = assignDelinquentToSelectedBuilding(state);

    expect(changed).toBe(false);
    expect(state.playerIdleDelinquents).toBe(4);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(1);
  });

  it('does nothing when there are no idle delinquents', () => {
    const state = createState({ idle: 0, assigned: 1 });

    const changed = assignDelinquentToSelectedBuilding(state);

    expect(changed).toBe(false);
    expect(state.playerIdleDelinquents).toBe(0);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(1);
  });

  it('does not assign a delinquent to an unreachable selected building', () => {
    const state = {
      playerIdleDelinquents: 4,
      selectedBuildingId: 'building-2',
      buildings: [
        {
          id: 'building-1',
          control: 20,
          isRunning: false,
          neighborIds: [],
          playerAssignedDelinquents: 1
        },
        {
          id: 'building-2',
          control: 0,
          isRunning: false,
          neighborIds: [],
          playerAssignedDelinquents: 0
        }
      ]
    };

    expect(assignDelinquentToSelectedBuilding(state)).toBe(false);
    expect(state.playerIdleDelinquents).toBe(4);
    expect(state.buildings[1].playerAssignedDelinquents).toBe(0);
  });

  it('does not assign a delinquent to a second-hop selected building', () => {
    const state = {
      playerIdleDelinquents: 4,
      selectedBuildingId: 'building-3',
      buildings: [
        {
          id: 'building-1',
          control: 20,
          isRunning: false,
          neighborIds: ['building-2'],
          playerAssignedDelinquents: 1
        },
        {
          id: 'building-2',
          control: 0,
          isRunning: false,
          neighborIds: ['building-1', 'building-3'],
          playerAssignedDelinquents: 0
        },
        {
          id: 'building-3',
          control: 0,
          isRunning: false,
          neighborIds: ['building-2'],
          playerAssignedDelinquents: 0
        }
      ]
    };

    expect(assignDelinquentToSelectedBuilding(state)).toBe(false);
    expect(state.playerIdleDelinquents).toBe(4);
    expect(state.buildings[2].playerAssignedDelinquents).toBe(0);
  });

  it('returns one delinquent from the selected building to idle', () => {
    const state = createState({ idle: 2, assigned: 4 });

    const changed = removeDelinquentFromSelectedBuilding(state);

    expect(changed).toBe(true);
    expect(state.playerIdleDelinquents).toBe(3);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(3);
  });

  it('does nothing when the selected building has no assigned delinquents', () => {
    const state = createState({ idle: 2, assigned: 0 });

    const changed = removeDelinquentFromSelectedBuilding(state);

    expect(changed).toBe(false);
    expect(state.playerIdleDelinquents).toBe(2);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(0);
  });

  it('revokes running state immediately when assigned delinquents drop below 10', () => {
    const state = createState({ idle: 2, assigned: 10, isRunning: true });

    const changed = removeDelinquentFromSelectedBuilding(state);

    expect(changed).toBe(true);
    expect(state.buildings[0].playerAssignedDelinquents).toBe(9);
    expect(state.buildings[0].isRunning).toBe(false);
  });
});
