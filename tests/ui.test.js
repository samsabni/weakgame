import { describe, expect, it } from 'vitest';
import { renderSelectedBuilding, setDebugPanelOpen } from '../src/game/ui.js';

function createTextNode(initial = '') {
  return {
    textContent: initial,
    hidden: false
  };
}

function createUi() {
  return {
    status: createTextNode(),
    idleDelinquents: createTextNode(),
    cash: createTextNode(),
    influence: createTextNode(),
    buildingId: createTextNode(),
    buildingOwner: createTextNode(),
    buildingControl: createTextNode(),
    buildingAssignedDelinquents: createTextNode(),
    assignmentReason: createTextNode(),
    delinquentControls: { hidden: false },
    assignDelinquentButton: { disabled: false },
    runBuildingButton: { hidden: false, disabled: false },
    debugPanel: { hidden: true },
    gameOverOverlay: { hidden: true },
    startOverButton: { hidden: false }
  };
}

describe('ui', () => {
  it('renders global cash and influence with one-decimal live rates even when no building is selected', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 7,
      cash: 1200,
      influence: 9,
      buildings: [
        { control: 10, isRunning: false },
        { control: 60, isRunning: false },
        { control: 100, isRunning: true }
      ]
    };

    renderSelectedBuilding(ui, state, null);

    expect(ui.idleDelinquents.textContent).toBe('Idle Delinquents: 7');
    expect(ui.cash.textContent).toBe('Cash: 1200 (+3.5/s)');
    expect(ui.influence.textContent).toBe('Influence: 9 (+1.0/s)');
    expect(ui.runBuildingButton.hidden).toBe(true);
  });

  it('shows the debug panel only when toggled open', () => {
    const ui = createUi();

    setDebugPanelOpen(ui, true);
    expect(ui.debugPanel.hidden).toBe(false);

    setDebugPanelOpen(ui, false);
    expect(ui.debugPanel.hidden).toBe(true);
  });

  it('shows red controlling and running owner labels from building state', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 7,
      cash: 1200,
      influence: 9,
      buildings: [
        { control: 25, isRunning: false }
      ]
    };

    renderSelectedBuilding(ui, state, {
      id: 'building-1',
      owner: 'neutral',
      control: 25,
      playerAssignedDelinquents: 2,
      isRunning: false
    });

    expect(ui.buildingOwner.textContent).toBe('Owner: red (controlling)');

    renderSelectedBuilding(ui, state, {
      id: 'building-1',
      owner: 'neutral',
      control: 100,
      playerAssignedDelinquents: 10,
      isRunning: true
    });

    expect(ui.buildingOwner.textContent).toBe('Owner: red (running)');
  });

  it('disables + and shows a reachability reason when the selected building is too far away', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 7,
      cash: 1200,
      influence: 9,
      buildings: [
        { id: 'building-1', control: 20, isRunning: false, neighborIds: [] },
        { id: 'building-4', control: 0, isRunning: false, neighborIds: [] }
      ]
    };

    renderSelectedBuilding(ui, state, {
      id: 'building-4',
      owner: 'neutral',
      control: 0,
      playerAssignedDelinquents: 0,
      isRunning: false
    });

    expect(ui.assignDelinquentButton.disabled).toBe(true);
    expect(ui.assignmentReason.hidden).toBe(false);
    expect(ui.assignmentReason.textContent).toBe('Too far from your current territory');
  });

  it('disables + for a selected building that is two hops away', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 7,
      cash: 1200,
      influence: 9,
      buildings: [
        { id: 'building-1', control: 20, isRunning: false, neighborIds: ['building-2'] },
        { id: 'building-2', control: 0, isRunning: false, neighborIds: ['building-1', 'building-3'] },
        { id: 'building-3', control: 0, isRunning: false, neighborIds: ['building-2'] }
      ]
    };

    renderSelectedBuilding(ui, state, {
      id: 'building-3',
      owner: 'neutral',
      control: 0,
      playerAssignedDelinquents: 0,
      isRunning: false
    });

    expect(ui.assignDelinquentButton.disabled).toBe(true);
    expect(ui.assignmentReason.hidden).toBe(false);
    expect(ui.assignmentReason.textContent).toBe('Too far from your current territory');
  });

  it('shows the startup instruction and hides Run Building during starter-building mode', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 10,
      cash: 0,
      influence: 0,
      needsStarterBuilding: true,
      buildings: []
    };

    renderSelectedBuilding(ui, state, {
      id: 'building-1',
      owner: 'neutral',
      control: 0,
      playerAssignedDelinquents: 0,
      isRunning: false
    });

    expect(ui.status.textContent).toBe('Choose your starting building');
    expect(ui.runBuildingButton.hidden).toBe(true);
  });

  it('removes the startup instruction after the starter building has been claimed', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 10,
      cash: 0,
      influence: 0,
      needsStarterBuilding: false,
      buildings: [{ id: 'building-1' }, { id: 'building-2' }]
    };

    renderSelectedBuilding(ui, state, {
      id: 'building-1',
      owner: 'neutral',
      control: 100,
      playerAssignedDelinquents: 10,
      isRunning: true
    });

    expect(ui.status.textContent).toBe('2 buildings detected.');
  });

  it('shows the game-over overlay when the run is lost', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 10,
      cash: 0,
      influence: 0,
      gameOver: true,
      buildings: []
    };

    renderSelectedBuilding(ui, state, null);

    expect(ui.gameOverOverlay.hidden).toBe(false);
  });
});
