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
    idleDelinquents: createTextNode(),
    cash: createTextNode(),
    influence: createTextNode(),
    buildingId: createTextNode(),
    buildingOwner: createTextNode(),
    buildingControl: createTextNode(),
    buildingAssignedDelinquents: createTextNode(),
    delinquentControls: { hidden: false },
    runBuildingButton: { hidden: false, disabled: false },
    debugPanel: { hidden: true }
  };
}

describe('ui', () => {
  it('renders global cash and influence even when no building is selected', () => {
    const ui = createUi();
    const state = {
      playerIdleDelinquents: 7,
      cash: 1200,
      influence: 9
    };

    renderSelectedBuilding(ui, state, null);

    expect(ui.idleDelinquents.textContent).toBe('Idle Delinquents: 7');
    expect(ui.cash.textContent).toBe('Cash: 1200');
    expect(ui.influence.textContent).toBe('Influence: 9');
    expect(ui.runBuildingButton.hidden).toBe(true);
  });

  it('shows the debug panel only when toggled open', () => {
    const ui = createUi();

    setDebugPanelOpen(ui, true);
    expect(ui.debugPanel.hidden).toBe(false);

    setDebugPanelOpen(ui, false);
    expect(ui.debugPanel.hidden).toBe(true);
  });
});
